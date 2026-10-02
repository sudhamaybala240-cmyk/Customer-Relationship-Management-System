# Deploying the authentication API to Railway

Create a Railway service for this backend and set its **Root Directory** to
`/Backend/auth-server`. The `railway.json` in this directory builds and starts
the auth API and configures `/api/health` as its health check.

The auth service requires its own MySQL database. Do not point it at the CRM
database: both applications have a `users` table with incompatible schemas.
Create a separate Railway MySQL service (or a separate database/schema with
its own credentials) for auth.

In the auth API service's **Variables** tab, add:

- `AUTH_DATABASE_URL=${{<AuthMySQLService>.MYSQL_URL}}`, replacing the
  placeholder with the exact name of the dedicated auth MySQL service.
- `FRONTEND_URLS` set to the comma-separated Vercel origins:
  `https://customer-relationship-management-sy-nine.vercel.app,https://customer-relationship-management-system-b7qvwpq7c.vercel.app,https://customer-relationship-managemen-git-5f3c3d-sudhamaybala240-cmyk.vercel.app,https://customer-relationship-management-system-exb9ik7hu.vercel.app`

The reference must be configured on the auth API service, and the MySQL URL
must resolve to a reachable database. The service listens on Railway's assigned
`PORT`; `/api/health` returns HTTP 503 until the auth database is connected and
the schema is initialized.

In Vercel, set `VITE_AUTH_API_URL` to the deployed auth service's public URL
ending in `/api/auth`, then redeploy the frontend. Keep the CRM URL separate in
`VITE_CRM_API_URL` and `VITE_SOCKET_URL`. On the CRM service, set
`AUTH_SERVER_URL` to the auth service's public origin and `JWKS_URL` to
`<auth-service-origin>/.well-known/jwks.json`.
