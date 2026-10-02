import { getDatabaseConfig } from "../src/config/database";

describe("MySQL environment configuration", () => {
  it("uses Railway's MYSQL_URL when DATABASE_URL is not set", () => {
    expect(
      getDatabaseConfig({
        MYSQL_URL: "mysql://railway-user:secret%40pass@mysql.railway.internal:3306/crm",
      }),
    ).toEqual({
      host: "mysql.railway.internal",
      port: 3306,
      database: "crm",
      user: "railway-user",
      password: "secret@pass",
    });
  });

  it("supports Railway's native MySQL variable names", () => {
    expect(
      getDatabaseConfig({
        MYSQLHOST: "mysql.railway.internal",
        MYSQLPORT: "3307",
        MYSQLDATABASE: "crm",
        MYSQLUSER: "railway-user",
        MYSQLPASSWORD: "railway-password",
      }),
    ).toEqual({
      host: "mysql.railway.internal",
      port: 3307,
      database: "crm",
      user: "railway-user",
      password: "railway-password",
    });
  });

  it("rejects Railway private database hostnames when running on Render", () => {
    expect(() =>
      getDatabaseConfig({
        RENDER: "true",
        DATABASE_URL: "mysql://user:password@mysql.railway.internal:3306/crm",
      }),
    ).toThrow("cannot be resolved from Render");

    expect(() =>
      getDatabaseConfig({
        RENDER_SERVICE_ID: "render-service-id",
        MYSQLHOST: "mysql.railway.internal",
        MYSQLDATABASE: "crm",
        MYSQLUSER: "user",
        MYSQLPASSWORD: "password",
      }),
    ).toThrow("Enable Railway's MySQL TCP Proxy");
  });

  it("allows Railway's private hostname when the app is not running on Render", () => {
    expect(
      getDatabaseConfig({
        MYSQLHOST: "mysql.railway.internal",
        MYSQLDATABASE: "crm",
        MYSQLUSER: "user",
        MYSQLPASSWORD: "password",
      }).host,
    ).toBe("mysql.railway.internal");
  });

  it("keeps supporting the underscored local environment variable names", () => {
    expect(
      getDatabaseConfig({
        MYSQL_HOST: "localhost",
        MYSQL_PORT: "3307",
        MYSQL_DATABASE: "crm",
        MYSQL_USER: "local-user",
        MYSQL_PASSWORD: "local-password",
      }),
    ).toEqual({
      host: "localhost",
      port: 3307,
      database: "crm",
      user: "local-user",
      password: "local-password",
    });
  });

  it("reports how to fix missing database variables", () => {
    expect(() => getDatabaseConfig({})).toThrow(
      "Set DATABASE_URL/MYSQL_URL or map the Railway MySQL service variables to this service.",
    );
  });
});
