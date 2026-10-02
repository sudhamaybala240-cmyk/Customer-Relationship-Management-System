# Deploying the CRM API on Render

The CRM API requires MySQL; it cannot connect to a database running on the
Render service's own `localhost`.

Configure the Render web service with:

- **Root Directory:** `Backend/crm-server`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`

Set `DATABASE_URL` to the connection URL for a reachable MySQL database, in the
form `mysql://USER:PASSWORD@HOST:PORT/DATABASE`. Do not commit the real URL.
If the database is hosted on Railway, use its public TCP proxy URL when
connecting from Render; Railway's private service hostname is not reachable
from Render. A Render PostgreSQL URL is not compatible with this MySQL service.

Set `FRONTEND_URL` to the deployed Vercel site origin. The service opens its
HTTP port before initializing MySQL. Its `/health` endpoint returns HTTP 503
until the database connection, schema initialization, and startup checks
succeed, so Render can report database readiness accurately.
