import { Sequelize } from "sequelize";
import dotenv = require("dotenv");

dotenv.config();

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const getDbConfigFromUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return null;
  }

  const url = new URL(databaseUrl);

  if (url.protocol !== "mysql:") {
    throw new Error("DATABASE_URL must use the mysql protocol");
  }

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    database: decodeURIComponent(url.pathname.replace(/^\/+/, "")),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
};

const legacyDbConfig = () => {
  const port = Number(process.env.MYSQL_PORT ?? 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("MYSQL_PORT must be an integer between 1 and 65535");
  }

  return {
    host: process.env.MYSQL_HOST ?? "localhost",
    port,
    database: requiredEnv("MYSQL_DATABASE"),
    user: requiredEnv("MYSQL_USER"),
    password: requiredEnv("MYSQL_PASSWORD"),
  };
};

const dbConfig = getDbConfigFromUrl() ?? legacyDbConfig();

const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: "mysql",
  logging: false,
});

export default sequelize;