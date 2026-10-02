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
| `VITE_AUTH_API_URL` | Auth backend origin plus `/api/auth` (must be a separately deployed auth service) |
| `VITE_CRM_API_URL` | `https://customer-relationship-management-system-fy7k.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://customer-relationship-management-system-fy7k.onrender.com` |

The auth and CRM backends are separate services in this repository. Use the
public URL of each corresponding deployed service; do not point both variables
to one service unless that service is explicitly configured to host both APIs.
These `VITE_` values are embedded at build time, so changing them requires a
new deployment.

All three variables must be set for Vercel Production, Preview, and Development
deployments. Vercel builds validate that each is a public HTTPS URL and that
the API URLs end in `/api/auth` and `/api`, respectively. The auth API is a
separate backend service from the CRM API; the production frontend does not use
`localhost:5000`. If the auth URL is missing from another deployment, the login
page shows a configuration message instead of attempting a local URL.

The backend CORS configuration allows the following frontend origins:

- `https://customer-relationship-management-system-b7qvwpq7c.vercel.app`
- `https://customer-relationship-managemen-git-5f3c3d-sudhamaybala240-cmyk.vercel.app`
- `https://customer-relationship-management-sy-nine.vercel.app`

Set `FRONTEND_URL` or comma-separated `FRONTEND_URLS` on each backend service
when deploying from any additional frontend origin.

## Local development

Copy `.env.example` to `.env` and replace its placeholder service URLs with
your actual local or deployed API URLs. The Vite development server proxies
relative `/api` and `/socket.io` requests to the local backend ports.
