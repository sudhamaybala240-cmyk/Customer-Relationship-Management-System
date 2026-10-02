import {
  createApi,
  fetchBaseQuery
} from "@reduxjs/toolkit/query/react";
import {
  clearAccessToken,
  clearRefreshToken,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "../authToken";
import { AUTH_API_URL, CRM_API_URL } from "../../config/apiUrls";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: CRM_API_URL,
  credentials: "include",
  prepareHeaders: (headers) => {
    const token = getAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    headers.set("Content-Type", "application/json");

    return headers;
  }
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = fetch(
      `${AUTH_API_URL}/refresh`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refreshToken: getRefreshToken() })
      }
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Refresh failed");
        }

        return response.json();
      })
      .then((result) => {
        const token =
          result?.accessToken ||
          result?.data?.accessToken ||
          result?.data?.token;

        if (!token) {
          throw new Error("No access token returned");
        }

        setAccessToken(token);
        setRefreshToken(result?.refreshToken || result?.data?.refreshToken);

        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

const baseQueryWithReauth = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(
    args,
    api,
    extraOptions
  );

  if (result?.error?.status === 401) {
    try {
      await refreshAccessToken();

      result = await rawBaseQuery(
        args,
        api,
        extraOptions
      );
    } catch {
      clearAccessToken();
      clearRefreshToken();

      api.dispatch({
        type: "auth/logout"
      });
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "User",
    "Property",
    "PropertyActivity",
    "PropertyFilters",
    "Note",
    "SiteVisit",
    "Dashboard",
    "MasterData",
    "Chat"
  ],
  endpoints: () => ({})
});