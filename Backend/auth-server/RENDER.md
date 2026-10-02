# Deploying the authentication API on Render

Configure the Render web service with:

- **Root Directory:** `Backend/auth-server`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`

Set `AUTH_DATABASE_URL` in the Render service's **Environment** settings to a
reachable MySQL connection URL. The auth service needs a database separate
from the CRM database because their `users` tables have different schemas.
Do not use `localhost` or a Railway `*.railway.internal` hostname from Render.
If the auth database is on Railway, enable its TCP Proxy and use the public
connection URL. Keep this URL private and out of source control.

Set `FRONTEND_URLS` to the comma-separated list of allowed Vercel origins:

```text
https://customer-relationship-management-sy-nine.vercel.app,https://customer-relationship-management-system-b7qvwpq7c.vercel.app,https://customer-relationship-managemen-git-5f3c3d-sudhamaybala240-cmyk.vercel.app,https://customer-relationship-management-system-exb9ik7hu.vercel.app
```

The service listens on Render's assigned `PORT`. `/api/health` returns HTTP
503 until the auth database connection and schema initialization succeed; it
must return HTTP 200 before signup or login can work.

In Vercel, set `VITE_AUTH_API_URL` to
`https://customer-relationship-management-system-1-333w.onrender.com/api/auth`
for Production, Preview, and Development, then redeploy the frontend.
