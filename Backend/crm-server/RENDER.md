# Deploying the CRM API on Render

The CRM API requires MySQL; it cannot connect to a database running on the
Render service's own `localhost`.

Configure the Render web service with:

- **Root Directory:** `Backend/crm-server`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`

Set `MYSQL_PUBLIC_URL` in the Render service's **Environment** settings to a
reachable MySQL connection URL, in the form
`mysql://user:password@host:port/database`. This variable takes precedence
over `DATABASE_URL` and `MYSQL_URL`, so it can safely override an existing
Railway-private URL. Keep the real URL in Render's secret environment settings;
never commit it to source control.

For a Railway-hosted MySQL database:

1. In Railway, open the MySQL service's **Settings → Networking** and enable
   its TCP Proxy (public networking).
2. Copy the `MYSQL_PUBLIC_URL` Railway creates for that MySQL service.
3. In Render, add `MYSQL_PUBLIC_URL` with the copied value and redeploy. Or
   replace `DATABASE_URL` with the public URL. Remove/replace any `MYSQLHOST`
   value that points to a `*.railway.internal` host.
4. Confirm the Render health check at `/health` returns HTTP 200.

Do not use Railway's private `*.railway.internal` hostname or Railway's
internal-only `MYSQL_URL` in Render; those addresses only resolve inside
Railway's private network and produce `ENOTFOUND`. If Railway does not provide
a public TCP proxy on your plan, deploy the CRM API on Railway in the same
private network as MySQL. A Render PostgreSQL URL is not compatible with this
MySQL service.

The API allows the two supplied Vercel origins by default. You can also set
`FRONTEND_URL` or comma-separated `FRONTEND_URLS` to additional exact origins.
For the separate deployed auth service, set `AUTH_SERVER_URL` to
`https://customer-relationship-management-system-1-333w.onrender.com` and
`JWKS_URL` to
`https://customer-relationship-management-system-1-333w.onrender.com/.well-known/jwks.json`
in the Render CRM service's environment settings. Redeploy after changing
environment variables.

The service opens its HTTP port before initializing MySQL. Its `/health`
endpoint returns HTTP 503 until the database connection, schema initialization,
and startup checks succeed, so Render can report database readiness accurately.
