import { Sequelize } from "sequelize";
import dotenv = require("dotenv");

dotenv.config();

type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

const firstDefined = (env: NodeJS.ProcessEnv, ...names: string[]) => {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return { name, value };
  }
  return undefined;
};

const parseDatabaseUrl = (databaseUrl: string, variableName: string): DatabaseConfig => {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error(`${variableName} must be a valid MySQL connection URL`);
  }

  if (url.protocol !== "mysql:") {
    throw new Error(`${variableName} must use the mysql:// protocol`);
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const user = decodeURIComponent(url.username);
  if (!url.hostname || !database || !user) {
    throw new Error(`${variableName} must include a host, database, and username`);
  }

  const port = Number(url.port || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${variableName} must specify a valid port`);
  }

  return {
    host: url.hostname,
    port,
    database,
    user,
    password: decodeURIComponent(url.password),
  };
};

const assertHostAvailableFromPlatform = (host: string, env: NodeJS.ProcessEnv) => {
  const isRender = env.RENDER === "true" || Boolean(env.RENDER_SERVICE_ID);
  if (isRender && host.toLowerCase().endsWith(".railway.internal")) {
    throw new Error(
      "The MySQL host uses Railway's private .railway.internal network and cannot be resolved from Render. " +
      "Enable Railway's MySQL TCP Proxy and use its public connection URL, or deploy the CRM API on Railway in the same private network.",
    );
  }
};

export const getDatabaseConfig = (env: NodeJS.ProcessEnv = process.env): DatabaseConfig => {
  const databaseUrl = firstDefined(
    env,
    "MYSQL_PUBLIC_URL",
    "DATABASE_URL",
    "MYSQL_URL",
  );
  if (databaseUrl) {
    const config = parseDatabaseUrl(databaseUrl.value, databaseUrl.name);
    assertHostAvailableFromPlatform(config.host, env);
    return config;
  }

  const portEnv = firstDefined(env, "MYSQLPORT", "MYSQL_PORT");
  const port = Number(portEnv?.value ?? 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${portEnv?.name ?? "MYSQLPORT"} must be an integer between 1 and 65535`);
  }

  const host = firstDefined(env, "MYSQLHOST", "MYSQL_HOST");
  const database = firstDefined(env, "MYSQLDATABASE", "MYSQL_DATABASE");
  const user = firstDefined(env, "MYSQLUSER", "MYSQL_USER");
  const password = firstDefined(env, "MYSQLPASSWORD", "MYSQL_PASSWORD");

  if (!host || !database || !user || !password) {
    const missing = [
      !host && "MYSQLHOST or MYSQL_HOST",
      !database && "MYSQLDATABASE or MYSQL_DATABASE",
      !user && "MYSQLUSER or MYSQL_USER",
      !password && "MYSQLPASSWORD or MYSQL_PASSWORD",
    ].filter(Boolean);
    throw new Error(
      `Missing MySQL environment variable(s): ${missing.join(", ")}. ` +
      "Set MYSQL_PUBLIC_URL, DATABASE_URL, or MYSQL_URL to a reachable MySQL URL, or map the MySQL service variables to this service.",
    );
  }

  assertHostAvailableFromPlatform(host.value, env);

  return {
    host: host.value,
    port,
    database: database.value,
    user: user.value,
    password: password.value,
  };
};

let databaseConfigurationError: Error | undefined;
const dbConfig = (() => {
  try {
    return getDatabaseConfig();
  } catch (error) {
    databaseConfigurationError =
      error instanceof Error ? error : new Error(String(error));
    return {
      host: "127.0.0.1",
      port: 3306,
      database: "crm_unconfigured",
      user: "unconfigured",
      password: "unconfigured",
    };
  }
})();

export const assertDatabaseConfigured = () => {
  if (databaseConfigurationError) {
    throw databaseConfigurationError;
  }
};

const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: "mysql",
  logging: false,
});

export default sequelize;