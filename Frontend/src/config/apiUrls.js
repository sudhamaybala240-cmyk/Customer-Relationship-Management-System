const configuredAuthApiUrl = import.meta.env.VITE_AUTH_API_URL?.trim();

const normalizeBaseUrl = (value) => value?.replace(/\/+$/, "");

export const AUTH_API_URL = normalizeBaseUrl(configuredAuthApiUrl) || "/api/auth";
export const CRM_API_URL =
  normalizeBaseUrl(import.meta.env.VITE_CRM_API_URL?.trim()) || "/api";

export const isAuthApiConfigured = Boolean(configuredAuthApiUrl);

export const getAuthApiConfigurationError = () =>
  "Authentication API URL is not configured for this deployment. Set VITE_AUTH_API_URL in Vercel to the deployed auth service URL ending in /api/auth, then redeploy.";

export const getAuthApiUnavailableError = () =>
  "Unable to reach the authentication service. Check that VITE_AUTH_API_URL points to the deployed auth service, that the service is running, and that its CORS settings allow this frontend.";
