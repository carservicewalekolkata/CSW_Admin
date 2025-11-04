export type AuthStatus = "idle" | "loading" | "authenticated" | "error";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  roles: string[];
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  rememberMe: boolean;
  status: AuthStatus;
  error: string | null;
  passwordReset: {
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string | null;
  };
}
