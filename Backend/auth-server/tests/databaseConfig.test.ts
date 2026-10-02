import assert from "node:assert/strict";
import test from "node:test";
import { getDatabaseConfig } from "../src/config/database";

test("prefers the public auth database URL over private and generic URLs", () => {
  assert.deepEqual(
    getDatabaseConfig({
      AUTH_MYSQL_PUBLIC_URL:
        "mysql://auth-user:public-password@trolley.proxy.rlwy.net:45678/auth",
      AUTH_DATABASE_URL:
        "mysql://auth-user:private-password@mysql.railway.internal:3306/auth",
      RENDER: "true",
    }),
    {
      host: "trolley.proxy.rlwy.net",
      port: 45678,
      database: "auth",
      user: "auth-user",
      password: "public-password",
    },
  );
});

test("accepts Railway private database URLs outside Render", () => {
  assert.equal(
    getDatabaseConfig({
      AUTH_DATABASE_URL:
        "mysql://auth-user:auth-password@mysql.railway.internal:3306/auth",
    }).host,
    "mysql.railway.internal",
  );
});

test("rejects Railway private database URLs on Render", () => {
  assert.throws(
    () =>
      getDatabaseConfig({
        AUTH_DATABASE_URL:
          "mysql://auth-user:auth-password@mysql.railway.internal:3306/auth",
        RENDER: "true",
      }),
    /cannot be resolved from Render/,
  );
});

test("supports the native MySQL variables", () => {
  assert.deepEqual(
    getDatabaseConfig({
      MYSQLHOST: "db.example.net",
      MYSQLPORT: "3307",
      MYSQLDATABASE: "auth",
      MYSQLUSER: "auth-user",
      MYSQLPASSWORD: "auth-password",
    }),
    {
      host: "db.example.net",
      port: 3307,
      database: "auth",
      user: "auth-user",
      password: "auth-password",
    },
  );
});

test("reports missing auth database configuration clearly", () => {
  assert.throws(
    () => getDatabaseConfig({}),
    /Set AUTH_MYSQL_PUBLIC_URL or AUTH_DATABASE_URL/,
  );
});

test("does not use generic CRM database URLs as the auth database", () => {
  assert.throws(
    () =>
      getDatabaseConfig({
        DATABASE_URL: "mysql://crm-user:crm-password@crm.example.net:3306/crm",
      }),
    /generic CRM DATABASE_URL settings are not used/,
  );
});
