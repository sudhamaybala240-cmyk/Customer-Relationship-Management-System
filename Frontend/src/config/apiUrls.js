import {
  DEFAULT_AUTH_API_URL,
  DEFAULT_CRM_API_URL,
} from "./deploymentDefaults";

const configuredAuthApiUrl =
  import.meta.env.VITE_AUTH_API_URL?.trim() || DEFAULT_AUTH_API_URL;
const configuredCrmApiUrl =
  import.meta.env.VITE_CRM_API_URL?.trim() || DEFAULT_CRM_API_URL;

const normalizeBaseUrl = (value) => value?.replace(/\/+$/, "");

export const AUTH_API_URL = normalizeBaseUrl(configuredAuthApiUrl) || "/api/auth";
export const CRM_API_URL =
  normalizeBaseUrl(configuredCrmApiUrl) || "/api";

const authAndCrmShareOrigin = (() => {
  if (!configuredAuthApiUrl || !configuredCrmApiUrl) {
    return false;
  }

  try {
    return new URL(configuredAuthApiUrl).origin === new URL(configuredCrmApiUrl).origin;
  } catch {
    return false;
  }
})();

export const isAuthApiConfigured =
  !authAndCrmShareOrigin;

export const getAuthApiConfigurationError = () =>
  "Authentication is not configured correctly. Set VITE_AUTH_API_URL in Vercel to the separate deployed auth service URL ending in /api/auth (not the CRM service), then redeploy.";

export const getAuthApiUnavailableError = () =>
  "Unable to reach the authentication service. Check that VITE_AUTH_API_URL points to the deployed auth service, that the service is running, and that its CORS settings allow this frontend.";
