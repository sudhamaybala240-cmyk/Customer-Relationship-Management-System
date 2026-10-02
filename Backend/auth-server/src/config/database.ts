import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

export const getDatabaseConfig = (env: NodeJS.ProcessEnv = process.env) => {
  const firstDefined = (...names: string[]) => {
    for (const name of names) {
      const value = env[name]?.trim();
      if (value) return { name, value };
    }
    return undefined;
  };

  const databaseUrl = firstDefined("AUTH_DATABASE_URL", "DATABASE_URL", "MYSQL_URL");
  if (databaseUrl) {
    let url: URL;
    try {
      url = new URL(databaseUrl.value);
    } catch {
      throw new Error(`${databaseUrl.name} must be a valid MySQL connection URL`);
    }

    if (url.protocol !== "mysql:") {
      throw new Error(`${databaseUrl.name} must use the mysql:// protocol`);
    }

    const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const user = decodeURIComponent(url.username);
    if (!url.hostname || !database || !user) {
      throw new Error(`${databaseUrl.name} must include a host, database, and username`);
    }

    const port = Number(url.port || 3306);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`${databaseUrl.name} must specify a valid port`);
    }

    return {
      host: url.hostname,
      port,
      database,
      user,
      password: decodeURIComponent(url.password),
    };
  }

  const host = firstDefined("MYSQLHOST", "DB_HOST");
  const portSetting = firstDefined("MYSQLPORT", "DB_PORT");
  const database = firstDefined("MYSQLDATABASE", "DB_NAME");
  const user = firstDefined("MYSQLUSER", "DB_USER");
  const password = firstDefined("MYSQLPASSWORD", "DB_PASSWORD");
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
      "Set AUTH_DATABASE_URL to a separate authentication database.",
    );
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${portSetting?.name || "DB_PORT"} must be an integer between 1 and 65535`);
  }

  return { host: host.value, port, database: database.value, user: user.value, password: password.value };
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
