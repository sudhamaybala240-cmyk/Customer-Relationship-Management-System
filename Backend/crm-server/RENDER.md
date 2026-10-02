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
If the database is hosted on Railway, **do not use a hostname ending in
`.railway.internal`** in Render. That address only resolves within Railway's
private network and causes `getaddrinfo ENOTFOUND`. Enable Railway's MySQL TCP
Proxy and set `DATABASE_URL` to the public MySQL URL/host and proxy port Railway
provides, or deploy the CRM API on Railway in the same private network as MySQL.
A Render PostgreSQL URL is not compatible with this MySQL service.

The API allows the two supplied Vercel origins by default. You can also set
`FRONTEND_URL` or comma-separated `FRONTEND_URLS` to additional exact origins.
The service opens its HTTP port before initializing MySQL. Its `/health`
endpoint returns HTTP 503 until the database connection, schema initialization,
and startup checks succeed, so Render can report database readiness accurately.
