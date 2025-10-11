import type { ApiEndpoints } from "@/types";

const normalizeBaseUrl = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
};

const backendUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_BACKEND_URL) ?? "/api";
const apiVersion = "/v1";
const authBasePath = `${apiVersion}/auth`;
// const usersBasePath = "/users";
const adminBasePath = `${apiVersion}/admin`;
const rolesBasePath = `${adminBasePath}/roles`;

export const APIEndpoint: ApiEndpoints = {
  BackendUrl: backendUrl,
  VersionPrefix: apiVersion,
  auth: {
    login: `${authBasePath}/login`,
    logout: `${authBasePath}/logout`,
    refresh: `${authBasePath}/refresh`,
    status: `${authBasePath}/status`,
    forgotPassword: `${authBasePath}/forgot-password`,
  },
  admin: {
    superUser: `${adminBasePath}/super-user`,
    roles: {
      base: rolesBasePath,
      detail: (id) => `${rolesBasePath}/${id}`,
    },
  },
  // users: {
  //   base: usersBasePath,
  //   detail: (id) => `${usersBasePath}/${id}`,
  // },
};
