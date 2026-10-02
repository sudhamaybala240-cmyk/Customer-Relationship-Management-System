import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAccessToken, getRefreshToken } from "../authToken";
import { AUTH_API_URL } from "../../config/apiUrls";

const authBaseQuery = fetchBaseQuery({
  baseUrl: AUTH_API_URL,
  credentials: "include",
  prepareHeaders: (headers) => {
    const token = getAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: authBaseQuery,
  tagTypes: ["User", "PlatformTenants", "PlatformSecurityEvents", "TenantUsers", "TenantInvites"],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
    }),

    signup: builder.mutation({
      query: (data) => ({
        url: "/signup",
        method: "POST",
        body: data,
      }),
    }),

    acceptInvite: builder.mutation({
      query: (data) => ({
        url: "/invite/accept",
        method: "POST",
        body: data,
      }),
    }),

    getPlatformTenants: builder.query({
      query: () => ({ url: "/platform/tenants" }),
      providesTags: ["PlatformTenants"],
    }),

    getPlatformSlugAvailability: builder.query({
      query: (slug) => ({
        url: "/platform/tenants/slug-availability",
        params: { slug },
      }),
    }),

    getPlatformSlugSuggestion: builder.query({
      query: (companyName) => ({
        url: "/platform/suggest-slug",
        params: { companyName },
      }),
    }),

    createPlatformTenant: builder.mutation({
      query: (data) => ({
        url: "/platform/tenants",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["PlatformTenants", "PlatformSecurityEvents"],
    }),

    updatePlatformTenantStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/platform/tenants/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["PlatformTenants", "PlatformSecurityEvents"],
    }),

    getPlatformSigningKey: builder.query({
      query: () => ({ url: "/platform/signing-key" }),
    }),

    rotatePlatformSigningKey: builder.mutation({
      query: () => ({
        url: "/platform/signing-key/rotate",
        method: "POST",
      }),
      invalidatesTags: ["PlatformSecurityEvents"],
    }),

    getPlatformSecurityEvents: builder.query({
      query: () => ({ url: "/platform/security-events", params: { limit: 50 } }),
      providesTags: ["PlatformSecurityEvents"],
    }),

    getTenantUsers: builder.query({
      query: () => ({ url: "/users" }),
      providesTags: ["TenantUsers"],
    }),

    getTenantInvites: builder.query({
      query: () => ({ url: "/invites" }),
      providesTags: ["TenantInvites"],
    }),

    createTenantInvite: builder.mutation({
      query: (data) => ({ url: "/invite", method: "POST", body: data }),
      invalidatesTags: ["TenantUsers", "TenantInvites"],
    }),

    updateTenantUserRole: builder.mutation({
      query: ({ id, role }) => ({ url: `/users/${id}/role`, method: "PATCH", body: { role } }),
      invalidatesTags: ["TenantUsers"],
    }),

    updateTenantUserStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/users/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: ["TenantUsers"],
    }),

    getTenantUserSessions: builder.query({
      query: (id) => ({ url: `/users/${id}/sessions` }),
    }),

    revokeTenantUserSessions: builder.mutation({
      query: (id) => ({ url: `/users/${id}/sessions/revoke`, method: "POST" }),
      invalidatesTags: ["TenantUsers"],
    }),

    getMe: builder.query({
      query: () => ({
        url: "/me",
        method: "GET",
      }),
      providesTags: ["User"],
    }),

    refreshToken: builder.mutation({
      query: (data) => ({
        url: "/refresh",
        method: "POST",
        body: data,
      }),
    }),

    logout: builder.mutation({
      query: () => ({
        url: "/logout",
        method: "POST",
        body: { refreshToken: getRefreshToken() },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useAcceptInviteMutation,
  useGetPlatformTenantsQuery,
  useGetPlatformSlugAvailabilityQuery,
  useGetPlatformSlugSuggestionQuery,
  useCreatePlatformTenantMutation,
  useUpdatePlatformTenantStatusMutation,
  useGetPlatformSigningKeyQuery,
  useRotatePlatformSigningKeyMutation,
  useGetPlatformSecurityEventsQuery,
  useGetTenantUsersQuery,
  useGetTenantInvitesQuery,
  useCreateTenantInviteMutation,
  useUpdateTenantUserRoleMutation,
  useUpdateTenantUserStatusMutation,
  useGetTenantUserSessionsQuery,
  useRevokeTenantUserSessionsMutation,
  useGetMeQuery,
  useRefreshTokenMutation,
  useLogoutMutation,
} = authApi;