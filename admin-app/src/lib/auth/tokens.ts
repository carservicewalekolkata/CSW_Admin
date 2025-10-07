import { SignJWT, jwtVerify, type JWTPayload } from "jose";

type TokenSecrets = {
  access: string;
  refresh: string;
  reset: string;
};

const encoder = new TextEncoder();

const accessTokenTtlSeconds = 60 * 15; // 15 minutes
const refreshTokenTtlSeconds = 60 * 60 * 24 * 30; // 30 days
const resetTokenTtlSeconds = 60 * 60; // 1 hour

type TokenPayload = {
  sub: string;
  email: string;
  roles: string[];
  tokenVersion: number;
};

const secrets: TokenSecrets = {
  access: getRequiredEnv("JWT_SECRET"),
  refresh: getRequiredEnv("JWT_REFRESH_SECRET"),
  reset: getRequiredEnv("JWT_RESET_SECRET"),
};

export type { TokenPayload };

export async function signAccessToken(payload: TokenPayload, ttlSeconds = accessTokenTtlSeconds): Promise<string> {
  return signToken(payload, ttlSeconds, secrets.access);
}

export async function signRefreshToken(payload: TokenPayload, ttlSeconds = refreshTokenTtlSeconds): Promise<string> {
  return signToken(payload, ttlSeconds, secrets.refresh);
}

export async function signResetToken(payload: Pick<TokenPayload, "sub" | "email" | "tokenVersion">, ttlSeconds = resetTokenTtlSeconds): Promise<string> {
  return signToken({ ...payload, roles: [] }, ttlSeconds, secrets.reset);
}

export async function verifyAccessToken<T extends JWTPayload = JWTPayload>(token: string): Promise<T> {
  return verifyToken<T>(token, secrets.access);
}

export async function verifyRefreshToken<T extends JWTPayload = JWTPayload>(token: string): Promise<T> {
  return verifyToken<T>(token, secrets.refresh);
}

export async function verifyResetToken<T extends JWTPayload = JWTPayload>(token: string): Promise<T> {
  return verifyToken<T>(token, secrets.reset);
}

function getRequiredEnv(key: keyof NodeJS.ProcessEnv): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing ${key} environment variable`);
  }

  return value;
}

async function signToken(payload: TokenPayload, ttlSeconds: number, secret: string): Promise<string> {
  const { sub, ...rest } = payload;
  const payloadWithoutSubject: Omit<TokenPayload, "sub"> = rest;

  const jwt = new SignJWT(payloadWithoutSubject)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`);

  return jwt.sign(encoder.encode(secret));
}

async function verifyToken<T extends JWTPayload>(token: string, secret: string): Promise<T> {
  const { payload } = await jwtVerify(token, encoder.encode(secret));
  return payload as T;
}
