import http from "http";
import app, { setDatabaseReady } from "./app";
import { env } from "./config/env";
import sequelize from "./config/database";
import ensurePropertySchema from "./config/propertySchema";
import redis from "./config/redis";
import setupSocket from "./sockets/socket";
import startJobs from "./jobs/scheduledJobs";

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

  try {
    await sequelize.authenticate();
    console.log("MySQL database connected successfully");
    await sequelize.sync();
    await ensurePropertySchema();
    console.log("Database tables synchronized");

    await redis.ping();

    const io = setupSocket(httpServer);
    startJobs(io);
    setDatabaseReady(true);
    console.log("CRM API is ready");
  } catch (error) {
    setDatabaseReady(false);
    console.error(
      "CRM database initialization failed. In Render, set DATABASE_URL to a reachable MySQL URL (mysql://...), not localhost. The service is listening, but /health will return 503 until the database is available.",
      error,
    );
  }
};

startServer();