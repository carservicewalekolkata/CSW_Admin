import type { ApiEndpoints } from "@/types";

const backendUrl = "/api";

const apiVersion = "/v1";

const authBasePath = `${apiVersion}/auth`;
const adminBasePath = `${apiVersion}/admin`;
const rolesBasePath = `${adminBasePath}/roles`;

export const APIEndpoint: ApiEndpoints = {
  BackendUrl: backendUrl,

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
  cars: {
    brands: `${apiVersion}/cars/brands`,
    models: `${apiVersion}/cars/models`,
  },
  services: {
    servicesCategory: `${apiVersion}/services/service-category`,
    servicesDetails: `${apiVersion}/services/details`,
  },
  activity: {
    customers: `${apiVersion}/activity/customers`,
  },
};
