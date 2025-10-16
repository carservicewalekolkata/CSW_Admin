interface AuthEndpointConfig {
  login: string;
  logout: string;
  refresh: string;
  status: string;
  forgotPassword: string;
}

interface AdminEndpointConfig {
  superUser: string;
  roles: {
    base: string;
    detail: (id: string) => string;
  };
}

interface Cars {
  brands: string
  models: string
}

interface Services {
  servicesCategory: string
  servicesDetails: string
}

interface ActivityEndpoints {
  customers: string
}

export interface ApiEndpoints {
  BackendUrl: string;
  auth: AuthEndpointConfig;
  admin: AdminEndpointConfig;
  cars: Cars;
  services: Services;
  activity: ActivityEndpoints;
}
