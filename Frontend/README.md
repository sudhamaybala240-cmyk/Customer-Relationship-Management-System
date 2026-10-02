# Frontend deployment

## Vercel

The repository-root `vercel.json` builds the `Frontend` package and serves its
`dist` output, including a rewrite fallback so refreshing client-side routes
such as `/properties` does not return a Vercel 404. A `vercel.json` is also
provided inside `Frontend` for deployments whose Vercel **Root Directory** is
set to `Frontend`.

For the repository-root configuration, leave Vercel's **Root Directory** at
the repository root and allow the checked-in `vercel.json` to control the
install command, build command, output directory, and route rewrites. If you
choose `Frontend` as the Vercel Root Directory instead, use `npm ci` as the
install command, `npm run build` as the build command, and `dist` as the
output directory.

Set these variables for **Production**, **Preview**, and **Development** in
Vercel, then redeploy:

| Variable | Value |
| --- | --- |
| `VITE_AUTH_API_URL` | Auth backend origin plus `/api/auth` |
| `VITE_CRM_API_URL` | CRM backend origin plus `/api` |
| `VITE_SOCKET_URL` | CRM backend origin, without a path |

The auth and CRM backends are separate services in this repository. Use the
public URL of each corresponding deployed service; do not point both variables
to one service unless that service is explicitly configured to host both APIs.
These `VITE_` values are embedded at build time, so changing them requires a
new deployment.

`VITE_AUTH_API_URL` must be set for the production Vercel deployment. Vercel
builds now fail with an actionable message if this variable is missing. The
auth API is a separate backend service from the CRM API; the production
frontend does not use `localhost:5000`. If the auth URL is missing from another
deployment, the login page shows a configuration message instead of attempting
a local URL.

Configure `FRONTEND_URL` on both backend services to the frontend origin, for
example `https://customer-relationship-management-sy-nine.vercel.app`. The
backend CORS configuration allows that origin and the local development
origins.

## Local development

Copy `.env.example` to `.env` and replace its placeholder service URLs with
your actual local or deployed API URLs. The Vite development server proxies
relative `/api` and `/socket.io` requests to the local backend ports.
