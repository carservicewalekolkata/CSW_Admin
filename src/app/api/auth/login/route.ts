import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { signAccessToken, signRefreshToken, type TokenPayload } from "@/lib/auth/tokens";
import { UserModel } from "@/models/User";

const accessCookieName = process.env.COOKIE_NAME ?? "app_session";
const refreshCookieName = `${accessCookieName}_refresh`;
const secureCookies = process.env.NODE_ENV === "production";

interface LoginRequestBody {
  email: string;
  password: string;
  remember?: boolean;
}

export async function POST(request: NextRequest) {
  let body: Partial<LoginRequestBody>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim();
  const password = body.password;
  const remember = Boolean(body.remember);

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
  }

  await connectToDatabase();

  const user = await UserModel.findOne({ email }).exec();

  if (!user) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const tokenPayload: TokenPayload = {
    sub: user.id,
    email: user.email ?? "",
    roles: Array.isArray(user.roles) ? user.roles.map(String) : [],
    tokenVersion: Number(user.refreshTokenVersion ?? 0),
  };

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(tokenPayload),
    signRefreshToken(tokenPayload),
  ]);

  const response = NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles ?? [],
      },
      accessToken,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  const accessMaxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 4; // 30 days vs 4 hours
  const refreshMaxAge = 60 * 60 * 24 * 30; // 30 days

  response.cookies.set(accessCookieName, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: accessMaxAge,
  });

  response.cookies.set(refreshCookieName, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: refreshMaxAge,
  });

  return response;
}
