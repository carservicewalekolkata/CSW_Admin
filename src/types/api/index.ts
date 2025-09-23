export interface AuthEndpointConfig {
  login: string;
  logout: string;
  refresh: string;
}

export interface UserEndpointConfig {
  base: string;
  detail: (id: string | number) => string;
}

export interface ApiEndpoints {
  BackendUrl: string;
  auth: AuthEndpointConfig;
  // users: UserEndpointConfig;
}
