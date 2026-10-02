import dotenv from "dotenv";
import { Sequelize } from "sequelize";

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

const parseDatabaseUrl = (value: string, variableName: string): DatabaseConfig => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid MySQL connection URL`);
  }

  if (url.protocol !== "mysql:") {
    throw new Error(`${variableName} must use the mysql:// protocol`);
  }

  let database: string;
  let user: string;
  let password: string;
  try {
    database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch {
    throw new Error(`${variableName} contains invalid URL-encoded credentials or database name`);
  }

  if (!url.hostname || !database || !user) {
    throw new Error(`${variableName} must include a host, database, and username`);
  }

  const port = Number(url.port || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${variableName} must specify a valid port`);
  }

  return { host: url.hostname, port, database, user, password };
};

const assertHostAvailableFromPlatform = (host: string, env: NodeJS.ProcessEnv) => {
  const isRender = env.RENDER === "true" || Boolean(env.RENDER_SERVICE_ID);
  if (isRender && host.toLowerCase().endsWith(".railway.internal")) {
    throw new Error(
      "The auth MySQL host uses Railway's private .railway.internal network and cannot be resolved from Render. " +
      "Enable Railway MySQL Public Networking and set AUTH_MYSQL_PUBLIC_URL to the public URL, or host the auth API and database on the same platform network.",
    );
  }
};

export const getDatabaseConfig = (env: NodeJS.ProcessEnv = process.env) => {
  const databaseUrl = firstDefined(
    env,
    "AUTH_MYSQL_PUBLIC_URL",
    "AUTH_DATABASE_URL",
    "MYSQL_URL",
  );
  if (databaseUrl) {
    const config = parseDatabaseUrl(databaseUrl.value, databaseUrl.name);
    assertHostAvailableFromPlatform(config.host, env);
    return config;
  }

  const host = firstDefined(env, "MYSQLHOST", "DB_HOST");
  const portSetting = firstDefined(env, "MYSQLPORT", "DB_PORT");
  const database = firstDefined(env, "MYSQLDATABASE", "DB_NAME");
  const user = firstDefined(env, "MYSQLUSER", "DB_USER");
  const password = firstDefined(env, "MYSQLPASSWORD", "DB_PASSWORD");
  const port = Number(portSetting?.value || 3306);

  if (!host || !database || !user || !password) {
    const missing = [
      !host && "MYSQLHOST or DB_HOST",
      !database && "MYSQLDATABASE or DB_NAME",
      !user && "MYSQLUSER or DB_USER",
      !password && "MYSQLPASSWORD or DB_PASSWORD",
    ].filter(Boolean);
    throw new Error(
      `Missing auth MySQL environment variable(s): ${missing.join(", ")}. ` +
      "Set AUTH_MYSQL_PUBLIC_URL or AUTH_DATABASE_URL to a reachable URL for the dedicated auth database; generic CRM DATABASE_URL settings are not used.",
    );
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${portSetting?.name || "DB_PORT"} must be an integer between 1 and 65535`);
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
      database: "auth_unconfigured",
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

export const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: "mysql",
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export default sequelize;
