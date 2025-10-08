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
const authBasePath = "/auth";
// const usersBasePath = "/users";

export const APIEndpoint: ApiEndpoints = {
  BackendUrl: backendUrl,
  auth: {
    login: `${authBasePath}/login`,
    logout: `${authBasePath}/logout`,
    refresh: `${authBasePath}/refresh`,
    status: `${authBasePath}/status`,
    forgotPassword: `${authBasePath}/forgot-password`,
  },
  // users: {
  //   base: usersBasePath,
  //   detail: (id) => `${usersBasePath}/${id}`,
  // },
};
