# Deploying the CRM API to Railway

Create a Railway service for this backend and set its **Root Directory** to
`/Backend/crm-server`. Do not use the repository root or a parent folder. The
`railway.json` in this directory configures the TypeScript build, start command,
and `/health` health check. The backend pins Node 22 and npm 10.9.2.

In the CRM API service's **Variables** tab, add a variable named `DATABASE_URL`
that references the MySQL service's connection URL, for example:

```text
${{MySQL.MYSQL_URL}}
```

Replace `MySQL` with the exact name of your Railway MySQL service. The
reference must be added to the **CRM API service**, not only to the MySQL
service. Do not paste the database URL into source control. The referenced URL
must use the `mysql://` protocol and point to the database created by Railway.

The API also accepts Railway's `MYSQL_URL` or native `MYSQLHOST`, `MYSQLPORT`,
`MYSQLDATABASE`, `MYSQLUSER`, and `MYSQLPASSWORD` variables. If using the native
variables, make sure they are mapped from the MySQL service into the CRM API
service. The API listens on its assigned port while initializing the database;
`/health` remains HTTP 503 until the database is reachable.

Set `FRONTEND_URL` to the deployed frontend origin (for example,
`https://customer-relationship-management-sy-nine.vercel.app`) so browser API
requests from that site pass CORS validation.
