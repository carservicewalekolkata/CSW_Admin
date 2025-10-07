import { APIEndpoint } from "@/APIEndpoints";
import type { AuthUser } from "@/types/auth";

const backendUrl = removeTrailingSlash(APIEndpoint.BackendUrl);

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

export type LoginPayload = {
  email: string;
  password: string;
  remember?: boolean;
};

export type LoginSuccessResponse = {
  user: AuthUser;
  accessToken: string;
};

export type LogoutResponse = {
  success: boolean;
};

type DatabaseStatusResponse = {
  connected: boolean;
  message?: string;
};

export type PasswordResetPayload = {
  email: string;
};

export type PasswordResetResponse = {
  message: string;
  resetToken?: string;
};

export async function login(payload: LoginPayload): Promise<LoginSuccessResponse> {
  return request<LoginSuccessResponse>(APIEndpoint.auth.login, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<LogoutResponse> {
  return request<LogoutResponse>(APIEndpoint.auth.logout, {
    method: "POST",
  });
}

export async function refreshSession(): Promise<LoginSuccessResponse> {
  return request<LoginSuccessResponse>(APIEndpoint.auth.refresh, {
    method: "POST",
  });
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { connected } = await request<DatabaseStatusResponse>(APIEndpoint.auth.status);
    return connected;
  } catch (error) {
    if (error instanceof AuthApiError) {
      return false;
    }

    throw error;
  }
}

export async function requestPasswordReset(
  payload: PasswordResetPayload,
): Promise<PasswordResetResponse> {
  return request<PasswordResetResponse>(APIEndpoint.auth.forgotPassword, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = buildUrl(path);
  const headers = new Headers(init.headers ?? {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(url, {
      credentials: "include",
      ...init,
      headers,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message || "Unable to reach authentication service"
        : "Unable to reach authentication service";

    throw new AuthApiError(message, 0);
  }

  const data = await parseJson(response);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? `Request failed with status ${response.status}`;
    throw new AuthApiError(message, response.status);
  }

  return data as T;
}

async function parseJson(response: Response) {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return null;
}

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  if ("message" in data && typeof data.message === "string") {
    return data.message;
  }

  return null;
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${backendUrl}${path}`;
}

function removeTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export const authApi = {
  login,
  logout,
  refreshSession,
  checkDatabaseConnection,
  requestPasswordReset,
};
