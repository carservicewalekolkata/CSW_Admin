import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { APIEndpoint } from '@/APIEndpoints'
import type { AuthUser } from '@/types/auth'

export type LoginPayload = {
  email: string
  password: string
  remember?: boolean
}

export type LoginSuccessResponse = {
  user: AuthUser
  accessToken: string
}

export type LogoutResponse = {
  success: boolean
}

export type PasswordResetPayload = {
  email: string
}

export type PasswordResetResponse = {
  message: string
  resetToken?: string
}

export type DatabaseStatusResponse = {
  connected: boolean
  message?: string
}

const baseUrl = APIEndpoint.BackendUrl
const { login, logout, refresh, status, forgotPassword } = APIEndpoint.auth

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json')
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    /**
     * POST /auth/login
     */
    login: builder.mutation<LoginSuccessResponse, LoginPayload>({
      query: (body) => ({
        url: login,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),

    /**
     * POST /auth/logout
     */
    logout: builder.mutation<LogoutResponse, void>({
      query: () => ({
        url: logout,
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    /**
     * POST /auth/refresh
     */
    refreshSession: builder.mutation<LoginSuccessResponse, void>({
      query: () => ({
        url: refresh,
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    /**
     * GET /auth/status
     */
    checkDatabaseConnection: builder.query<DatabaseStatusResponse, void>({
      query: () => ({
        url: status,
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),

    /**
     * POST /auth/forgot-password
     */
    requestPasswordReset: builder.mutation<PasswordResetResponse, PasswordResetPayload>({
      query: (body) => ({
        url: forgotPassword,
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useLoginMutation,
  useLogoutMutation,
  useRefreshSessionMutation,
  useCheckDatabaseConnectionQuery,
  useRequestPasswordResetMutation,
} = authApi
