import type { ApiEndpoints } from "@/types";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
const authBasePath = "/auth";
// const usersBasePath = "/users";

export const APIEndpoint: ApiEndpoints = {
  BackendUrl: backendUrl,
  auth: {
    login: `${authBasePath}/login`,
    logout: `${authBasePath}/logout`,
    refresh: `${authBasePath}/refresh`,
  },
  // users: {
  //   base: usersBasePath,
  //   detail: (id) => `${usersBasePath}/${id}`,
  // },
};
