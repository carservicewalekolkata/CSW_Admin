import type { ApiEndpoints } from "@/types";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000/api";
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
