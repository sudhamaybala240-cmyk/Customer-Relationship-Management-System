import crypto from "crypto";
import { Router, Request, Response } from "express";
import { Op, Transaction } from "sequelize";

import { SecurityEvent, Tenant, TenantProfile, User } from "../models/Index";

import {
  hashPassword,
  comparePassword,
} from "../utils/password";

import {
  signupSchema,
  loginSchema,
} from "../validators/authValidator";

import { createAccessToken } from "../auth/Token";
import { rotateAuthKeys } from "../auth/keys";
import sequelize from "../config/database";

import {
  requireAuth,
  AuthenticatedRequest,
} from "../middleWear/authmidillwear";

import { requireRole } from "../middleWear/roleMiddleware";
import platformConsoleRoutes from "./platformConsoleRoutes";
import { createUniqueTenantSlug } from "../service/platformConsoleService";

import {
  createRefreshToken,
  getRefreshTokenData,
  deleteRefreshToken,
  revokeTokenFamily,
  listUserSessions,
  revokeUserSessions,
} from "../auth/refreshTokenServise";
import Invite from "../invite/Invite";

import {
  isLoginLocked,
  recordFailedLogin,
  clearFailedLogins,
  getRemainingAttempts,
  getRetryAfterSeconds,
} from "../service/LoginLogoutService";

import {
  createInvite,
  acceptInvite,
  validateInviteToken,
} from "../invite/inviteService";

const router = Router();

const withTenantAdminLock = async <T>(
  tenantId: number,
  operation: (transaction: Transaction) => Promise<T>
) => sequelize.transaction(async (transaction) => {
  await Tenant.findByPk(tenantId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  return operation(transaction);
});

router.use("/platform", platformConsoleRoutes);

/**
 * POST /api/auth/signup
 */
router.post("/signup", async (req, res) => {
  try {
    const result = signupSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const { companyName, name, email, password } = result.data;

    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await sequelize.transaction(async (transaction) => {
      const slug = await createUniqueTenantSlug(companyName, transaction);
      const tenant = await Tenant.create({ name: companyName }, { transaction });
      await TenantProfile.create({
        tenantId: tenant.id,
        crmTenantId: crypto.randomUUID(),
        slug,
        status: "ACTIVE",
        isPlatform: false,
      }, { transaction });
      return User.create({
        tenantId: tenant.id,
        name,
        email,
        passwordHash,
        role: "ADMIN",
      }, { transaction });
    });

    return res.status(201).json({
      message: "Signup successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      message: "Unable to create account",
    });
  }
});

/**
 * POST /api/auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const { email, password } = result.data;

    // Check whether this email is currently locked
    const locked = await isLoginLocked(email);

    if (locked) {
      const retryAfter = await getRetryAfterSeconds(email);

      return res
        .set("Retry-After", String(Math.max(retryAfter, 0)))
        .status(429)
        .json({
          message: "Too many attempts. Please try again later.",
          remainingAttempts: 0,
          retryAfter: Math.max(retryAfter, 0),
        });
    }

    const user = await User.findOne({
      where: { email },
    });

    // User does not exist
    if (!user) {
      const attempts = await recordFailedLogin(email);
      const remainingAttempts = Math.max(0, 5 - attempts);

      if (attempts >= 5) {
        const retryAfter = await getRetryAfterSeconds(email);

        return res
          .set("Retry-After", String(Math.max(retryAfter, 0)))
          .status(429)
          .json({
            message: "Too many attempts. Please try again later.",
            remainingAttempts: 0,
            retryAfter: Math.max(retryAfter, 0),
          });
      }

      return res.status(401).json({
        message: "Wrong email or password.",
        remainingAttempts,
      });
    }

    if (!Number.isInteger(user.tenantId)) {
      return res.status(409).json({
        message: "This account is not assigned to a workspace. Contact an administrator.",
      });
    }

    const tenantProfile = await TenantProfile.findByPk(user.tenantId);
    if (tenantProfile?.status === "SUSPENDED") {
      return res.status(403).json({ message: "This workspace is suspended." });
    }
    if (user.status === "DEACTIVATED") {
      return res.status(403).json({ message: "This account is deactivated." });
    }

    const passwordValid = await comparePassword(
      password,
      user.passwordHash
    );

    // Wrong password
    if (!passwordValid) {
      const attempts = await recordFailedLogin(email);
      const remainingAttempts = Math.max(0, 5 - attempts);

      if (attempts >= 5) {
        const retryAfter = await getRetryAfterSeconds(email);

        return res
          .set("Retry-After", String(Math.max(retryAfter, 0)))
          .status(429)
          .json({
            message: "Too many attempts. Please try again later.",
            remainingAttempts: 0,
            retryAfter: Math.max(retryAfter, 0),
          });
      }

      return res.status(401).json({
        message: "Wrong email or password.",
        remainingAttempts,
      });
    }

    // Successful login - clear failed attempts
    await clearFailedLogins(email);
    await user.update({ lastLoginAt: new Date() });

    // Create short-lived access token
    const accessToken = await createAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });

    // Create refresh token
    const refreshToken = await createRefreshToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken: refreshToken.token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Unable to login",
    });
  }
});

/**
 * GET /api/auth/me
 */
router.get(
  "/me",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await User.findByPk(req.user!.userId, {
        attributes: [
          "id",
          "tenantId",
          "name",
          "email",
          "role",
          "createdAt",
        ],
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.json({
        user,
      });
    } catch (error) {
      console.error("Get current user error:", error);

      return res.status(500).json({
        message: "Unable to get current user",
      });
    }
  }
);

/**
 * GET /api/auth/admin-test
 */
router.get(
  "/admin-test",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  (_req: AuthenticatedRequest, res: Response) => {
    return res.json({
      message: "Admin authorization successful",
    });
  }
);

/**
 * GET /api/auth/health
 */
router.get("/health", (_req: Request, res: Response) => {
  return res.status(200).json({
    status: "ok",
    service: "auth-server",
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/auth/keys/rotate
 */
router.post(
  "/keys/rotate",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const keySet = await rotateAuthKeys();

      return res.status(200).json({
        message: "RSA signing key rotated",
        keyId: keySet.publicJwk.kid,
      });
    } catch (error) {
      console.error("Key rotation error:", error);

      return res.status(500).json({
        message: "Unable to rotate signing key",
      });
    }
  }
);

/**
 * POST /api/auth/logout
 */
router.post(
  "/logout",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const refreshToken = req.body?.refreshToken;

      if (typeof refreshToken === "string") {
        await deleteRefreshToken(refreshToken);
      }

      return res.status(200).json({
        message: "Logout successful",
      });
    } catch (error) {
      console.error("Logout error:", error);

      return res.status(500).json({
        message: "Unable to logout",
      });
    }
  }
);

/**
 * POST /api/auth/logout-all
 */
router.post(
  "/logout-all",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const refreshToken = req.body?.refreshToken;

      if (typeof refreshToken !== "string") {
        return res.status(400).json({
          message: "Refresh token is required",
        });
      }

      const storedToken = await getRefreshTokenData(refreshToken);

      if (!storedToken) {
        return res.status(401).json({
          message: "Invalid or expired refresh token",
        });
      }

      await revokeTokenFamily(storedToken.data.tokenFamily);

      return res.status(200).json({
        message: "All sessions for this token family were revoked",
      });
    } catch (error) {
      console.error("Logout all error:", error);

      return res.status(500).json({
        message: "Unable to revoke all sessions",
      });
    }
  }
);

router.get(
  "/users",
  requireAuth,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res: Response) => {
    const users = await User.findAll({
      where: { tenantId: req.user!.tenantId },
      attributes: ["id", "name", "email", "role", "status", "lastLoginAt", "createdAt"],
      order: [["createdAt", "ASC"]],
    });
    const activeCount = users.filter((user) => user.status === "ACTIVE").length;
    const pendingInvites = await Invite.count({
      where: {
        tenantId: req.user!.tenantId,
        status: "PENDING",
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    return res.json({
      users,
      totals: {
        users: users.length,
        active: activeCount,
        pendingInvites,
        deactivated: users.length - activeCount,
      },
    });
  }
);

router.get(
  "/invites",
  requireAuth,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res: Response) => {
    const invites = await Invite.findAll({
      where: { tenantId: req.user!.tenantId, status: "PENDING" },
      attributes: ["id", "email", "role", "token", "expiresAt", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    const now = Date.now();
    const activeInvites = [];
    for (const invite of invites) {
      if (invite.expiresAt.getTime() <= now) {
        await invite.update({ status: "EXPIRED" });
      } else {
        activeInvites.push(invite);
      }
    }

    return res.json({
      invites: activeInvites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        token: invite.token,
        expiresAt: invite.expiresAt,
      })),
    });
  }
);

router.patch(
  "/users/:id/role",
  requireAuth,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = Number(req.params.id);
    const role = req.body?.role;
    if (!Number.isInteger(userId) || userId < 1 || !["ADMIN", "MANAGER", "AGENT"].includes(role)) {
      return res.status(400).json({ message: "Invalid user or role." });
    }

    const tenantId = req.user!.tenantId;
    const result = await withTenantAdminLock(tenantId, async (transaction) => {
      const target = await User.findOne({
        where: { id: userId, tenantId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!target || target.role === "SUPER_ADMIN") return { status: 404 as const };

      if (target.role === "ADMIN" && target.status === "ACTIVE" && role !== "ADMIN") {
        const activeAdmins = await User.count({
          where: { tenantId, role: "ADMIN", status: "ACTIVE" },
          transaction,
        });
        if (activeAdmins <= 1) return { status: 422 as const };
      }

      const changed = target.role !== role;
      if (changed) {
        await target.update({ role }, { transaction });
        await SecurityEvent.create({
          actorId: req.user!.userId,
          action: "USER_ROLE_CHANGED",
          resourceType: "USER",
          resourceId: String(target.id),
        }, { transaction });
      }
      return { status: 200 as const, changed, id: target.id, role: target.role, userStatus: target.status };
    });

    if (result.status !== 200) {
      return res.status(result.status).json({
        message: result.status === 422 ? "The last active Admin cannot be demoted." : "User not found.",
      });
    }
    if (result.changed) await revokeUserSessions(tenantId, result.id);
    return res.json({ user: { id: result.id, role: result.role, status: result.userStatus } });
  }
);

router.patch(
  "/users/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = Number(req.params.id);
    const status = req.body?.status;
    if (!Number.isInteger(userId) || userId < 1 || !["ACTIVE", "DEACTIVATED"].includes(status)) {
      return res.status(400).json({ message: "Invalid user or status." });
    }

    const tenantId = req.user!.tenantId;
    const result = await withTenantAdminLock(tenantId, async (transaction) => {
      const target = await User.findOne({
        where: { id: userId, tenantId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!target || target.role === "SUPER_ADMIN") return { status: 404 as const };

      if (target.role === "ADMIN" && target.status === "ACTIVE" && status === "DEACTIVATED") {
        const activeAdmins = await User.count({
          where: { tenantId, role: "ADMIN", status: "ACTIVE" },
          transaction,
        });
        if (activeAdmins <= 1) return { status: 422 as const };
      }

      const changed = target.status !== status;
      if (changed) {
        await target.update({ status }, { transaction });
        await SecurityEvent.create({
          actorId: req.user!.userId,
          action: status === "DEACTIVATED" ? "USER_DEACTIVATED" : "USER_REACTIVATED",
          resourceType: "USER",
          resourceId: String(target.id),
        }, { transaction });
      }
      return { status: 200 as const, changed, id: target.id, role: target.role, userStatus: target.status };
    });

    if (result.status !== 200) {
      return res.status(result.status).json({
        message: result.status === 422 ? "The last active Admin cannot be deactivated." : "User not found.",
      });
    }
    if (result.changed && status === "DEACTIVATED") await revokeUserSessions(tenantId, result.id);
    return res.json({ user: { id: result.id, role: result.role, status: result.userStatus } });
  }
);

router.get(
  "/users/:id/sessions",
  requireAuth,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = Number(req.params.id);
    const target = await User.findOne({
      where: { id: userId, tenantId: req.user!.tenantId },
      attributes: ["id"],
    });
    if (!target) return res.status(404).json({ message: "User not found." });

    return res.json({ sessions: await listUserSessions(req.user!.tenantId, target.id) });
  }
);

router.post(
  "/users/:id/sessions/revoke",
  requireAuth,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = Number(req.params.id);
    const target = await User.findOne({
      where: { id: userId, tenantId: req.user!.tenantId },
      attributes: ["id"],
    });
    if (!target) return res.status(404).json({ message: "User not found." });

    const revoked = await revokeUserSessions(req.user!.tenantId, target.id);
    return res.json({ revoked });
  }
);

/**
 * POST /api/auth/invite
 */
router.post(
  "/invite",
  requireAuth,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, role } = req.body ?? {};

      if (!email || typeof email !== "string") {
        return res.status(400).json({
          message: "Invite email is required",
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ message: "Invite email is invalid." });
      }
      const inviteRole = role ?? "AGENT";
      if (!["ADMIN", "MANAGER", "AGENT"].includes(inviteRole)) {
        return res.status(400).json({ message: "Invite role is invalid." });
      }

      const invite = await createInvite({
        email,
        role: inviteRole as "ADMIN" | "MANAGER" | "AGENT",
        tenantId: req.user!.tenantId,
        inviterId: req.user!.userId,
      });

      return res.status(201).json({
        message: "Invite created successfully",
        invite,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      console.error("Invite creation error:", error);

      return res.status(500).json({
        message: "Unable to create invite",
      });
    }
  }
);

/**
 * POST /api/auth/invite/accept
 */
router.post("/invite/accept", async (req: Request, res: Response) => {
  try {
    const { token, name, password } = req.body ?? {};

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        message: "Invite token is required",
      });
    }

    const invite = await validateInviteToken(token);

    if (!invite) {
      return res.status(401).json({
        message: "Invalid or expired invite token",
      });
    }

    if (
      (name !== undefined && (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 150)) ||
      (password !== undefined && (typeof password !== "string" || password.length < 8 || password.length > 100))
    ) {
      return res.status(400).json({ message: "Name or password is invalid." });
    }

    const result = await acceptInvite(token, { name, password });

    if (!result) {
      return res.status(400).json({
        message: "Unable to accept invite",
      });
    }

    return res.status(200).json({
      message: "Invite accepted successfully",
      invite: result,
    });
  } catch (error) {
    console.error("Invite acceptance error:", error);

    return res.status(500).json({
      message: "Unable to accept invite",
    });
  }
});

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({
        message: "Refresh token is required",
      });
    }

    const storedToken = await getRefreshTokenData(refreshToken);

    if (!storedToken) {
      return res.status(401).json({
        message: "Invalid or expired refresh token",
      });
    }

    if (storedToken.reused) {
      await revokeTokenFamily(storedToken.data.tokenFamily);

      return res.status(401).json({
        message: "Refresh token reuse detected. Session revoked.",
      });
    }

    const { data } = storedToken;

    const user = await User.findOne({
      where: { id: data.userId, tenantId: data.tenantId },
    });
    const tenantProfile = await TenantProfile.findByPk(data.tenantId);
    if (!user || user.status === "DEACTIVATED" || tenantProfile?.status === "SUSPENDED") {
      await revokeTokenFamily(data.tokenFamily);
      return res.status(401).json({ message: "This account can no longer refresh sessions." });
    }

    await deleteRefreshToken(refreshToken);

    const accessToken = await createAccessToken({
      userId: data.userId,
      tenantId: data.tenantId,
      role: data.role,
    });

    const newRefreshToken = await createRefreshToken({
      userId: data.userId,
      tenantId: data.tenantId,
      role: user.role,
      tokenFamily: data.tokenFamily,
      createdAt: data.createdAt,
      lastUsedAt: Date.now(),
    });

    return res.status(200).json({
      message: "Token refreshed successfully",
      accessToken,
      refreshToken: newRefreshToken.token,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(500).json({
      message: "Unable to refresh token",
    });
  }
});


export default router;
