import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import sequelize, { ensureDatabaseExists } from "./config/database";
import authRoutes from "./routs/auth-routh";
import { getAuthKeys } from "./auth/keys";
import { ensureTenantProfileSchema } from "./service/tenantProfileSchema";


dotenv.config();

const app = express();

const port = Number(process.env.PORT ?? 5000);
const allowedOrigins = [
  "http://localhost:9430",
  "http://127.0.0.1:9430",
  "https://customer-relationship-management-sy-nine.vercel.app",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

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
  res.json({
    status: "ok",
    service: "auth-server",
    timestamp: new Date().toISOString(),
  });
});

// Start server
const startServer = async () => {
  try {
    const databaseReady = await ensureDatabaseExists();

    if (databaseReady) {
      await sequelize.authenticate();

      console.log("MySQL database connected successfully");

      await sequelize.sync();
      await ensureTenantProfileSchema();

      console.log("Database tables synchronized");
    } else {
      console.warn(
        "MySQL database is unavailable; server will continue in demo mode."
      );
    }

    app.listen(port, () => {
      console.log(`Auth server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Unable to connect to MySQL:", error);
    process.exit(1);
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
