# Deploying the CRM API to Railway

Create a Railway service for this backend and set its **Root Directory** to
`/Backend/crm-server`. Do not use the repository root or a parent folder. The
`railway.json` in this directory configures the TypeScript build, start command,
and `/health` health check. The backend pins Node 22 and npm 10.9.2.

Add a Railway variable named `DATABASE_URL` that references the MySQL service's
connection URL, for example:

```text
${{MySQL.MYSQL_URL}}
```

Replace `MySQL` with the exact name of your Railway MySQL service. Do not paste
the database URL into source control. The referenced URL must use the `mysql://`
protocol and point to the database created by Railway. The API verifies this
database at startup and exits with an error if the connection fails.
