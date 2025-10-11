export interface AuthEndpointConfig {
  login: string;
  logout: string;
  refresh: string;
  status: string;
  forgotPassword: string;
}

export interface AdminEndpointConfig {
  superUser: string;
  roles: {
    base: string;
    detail: (id: string) => string;
  };
}

export interface ApiEndpoints {
  BackendUrl: string;
  VersionPrefix: string;
  auth: AuthEndpointConfig;
  admin: AdminEndpointConfig;
}
