import http from "http";
import app, { setDatabaseReady } from "./app";
import { env } from "./config/env";
import sequelize, { assertDatabaseConfigured } from "./config/database";
import ensurePropertySchema from "./config/propertySchema";
import redis from "./config/redis";
import setupSocket from "./sockets/socket";
import startJobs from "./jobs/scheduledJobs";

let backgroundServicesStarted = false;

const initializeServices = async (httpServer: http.Server) => {
  try {
    assertDatabaseConfigured();
    await sequelize.authenticate();
    console.log("MySQL database connected successfully");
    await sequelize.sync();
    await ensurePropertySchema();
    console.log("Database tables synchronized");

    await redis.ping();

    if (!backgroundServicesStarted) {
      const io = setupSocket(httpServer);
      startJobs(io);
      backgroundServicesStarted = true;
    }
    setDatabaseReady(true);
    console.log("CRM API is ready");
    return true;
  } catch (error) {
    setDatabaseReady(false);
    console.error(
      "CRM database initialization failed. On Render with Railway MySQL, set MYSQL_PUBLIC_URL to Railway's public MySQL connection URL, or replace DATABASE_URL with that URL. Do not use the private MYSQL_URL or a *.railway.internal hostname. Alternatively, deploy the CRM API on Railway in the same private network as MySQL. The service is listening, but /health will return 503 until initialization succeeds.",
      error,
    );
    return false;
  }
};

const retryInitialization = (httpServer: http.Server, attempt: number) => {
  const delayMs = Math.min(5_000 * 2 ** (attempt - 1), 60_000);
  const retryTimer = setTimeout(async () => {
    if (!(await initializeServices(httpServer))) {
      retryInitialization(httpServer, attempt + 1);
    }
  }, delayMs);
  retryTimer.unref();
};

const startServer = async () => {
  const httpServer = http.createServer(app);

  try {
    await new Promise<void>((resolve, reject) => {
      httpServer.once("error", reject);
      httpServer.listen(env.port, () => {
        httpServer.removeListener("error", reject);
        console.log(`CRM API listening on port ${env.port}`);
        resolve();
      });
    });
  } catch (error) {
    console.error(`CRM API failed to listen on port ${env.port}:`, error);
    process.exitCode = 1;
    return;
  }

  if (!(await initializeServices(httpServer))) {
    retryInitialization(httpServer, 1);
  }
};

startServer();