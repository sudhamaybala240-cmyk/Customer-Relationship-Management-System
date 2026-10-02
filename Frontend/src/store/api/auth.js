import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { AUTH_API_URL } from "../../config/apiUrls";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: AUTH_API_URL,
    credentials: "include",
  }),
  tagTypes: ["User"],
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

    getMe: builder.query({
      query: () => ({
        url: "/me",
        method: "GET",
      }),
      providesTags: ["User"],
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useGetMeQuery,
} = authApi;