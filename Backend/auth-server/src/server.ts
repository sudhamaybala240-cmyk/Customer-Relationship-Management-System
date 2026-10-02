import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import sequelize, { assertDatabaseConfigured } from "./config/database";
import authRoutes from "./routs/auth-routh";
import { getAuthKeys } from "./auth/keys";
import { ensureTenantProfileSchema } from "./service/tenantProfileSchema";


dotenv.config();

const app = express();
let databaseReady = false;

const port = Number(process.env.PORT ?? 5000);
const defaultAllowedOrigins = [
  "http://localhost:9430",
  "http://127.0.0.1:9430",
  "https://customer-relationship-management-sy-nine.vercel.app",
  "https://customer-relationship-management-system-b7qvwpq7c.vercel.app",
  "https://customer-relationship-managemen-git-5f3c3d-sudhamaybala240-cmyk.vercel.app",
  "https://customer-relationship-management-system-exb9ik7hu.vercel.app",
];
const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS?.split(",") ?? []),
].filter(
  (origin): origin is string => typeof origin === "string" && origin.trim().length > 0,
).map((origin) => origin.trim().replace(/\/+$/, ""));
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...configuredOrigins])];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Auth routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "database_unavailable",
    service: "auth-server",
    timestamp: new Date().toISOString(),
  });
});

// Start server
const startServer = async () => {
  const server = app.listen(port, () => {
    console.log(`Auth server listening on port ${port}`);
  });
  server.on("error", (error) => {
    console.error(`Auth server failed to listen on port ${port}:`, error);
    process.exitCode = 1;
  });

  try {
    assertDatabaseConfigured();
    await sequelize.authenticate();
    console.log("MySQL database connected successfully");

    await sequelize.sync();
    await ensureTenantProfileSchema();
    console.log("Database tables synchronized");
    databaseReady = true;
  } catch (error) {
    databaseReady = false;
    console.error(
      "Auth database initialization failed. Set AUTH_MYSQL_PUBLIC_URL or AUTH_DATABASE_URL to a reachable MySQL URL for the dedicated auth database (not the CRM database). On Render with Railway MySQL, use Railway's public URL rather than a *.railway.internal hostname. /api/health will return 503 until the database is ready.",
      error,
    );
  }
};




app.get("/.well-known/jwks.json", async (_req: Request, res: Response) => {
  try {
    const { publicJwk } = await getAuthKeys();

    return res.json({
      keys: [publicJwk],
    });
  } catch (error) {
    console.error("JWKS error:", error);

    return res.status(500).json({
      message: "Unable to load JWKS",
    });
  }
});
startServer();
