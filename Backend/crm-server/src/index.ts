import http from "http";
import app from "./app";
import { env } from "./config/env";
import sequelize from "./config/database";
import ensurePropertySchema from "./config/propertySchema";
import redis from "./config/redis";
import setupSocket from "./sockets/socket";
import startJobs from "./jobs/scheduledJobs";

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("MySQL database connected successfully");
    await sequelize.sync();
    await ensurePropertySchema();
    console.log("Database tables synchronized");

    await redis.ping();

    const httpServer = http.createServer(app);

    const io = setupSocket(httpServer);

    startJobs(io);

    httpServer.listen(env.port, () => {
      console.log(`CRM API running on port ${env.port}`);
    });
  } catch (error) {
    console.error("CRM API startup failed:", error);
    process.exit(1);
  }
};

startServer();