import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from "@/lib/auth/tokens";
import { UserModel } from "@/models/User";

const accessCookieName = process.env.COOKIE_NAME ?? "app_session";
const refreshCookieName = `${accessCookieName}_refresh`;
const secureCookies = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  const refreshCookie = request.cookies.get(refreshCookieName)?.value;

  if (!refreshCookie) {
    return NextResponse.json({ message: "Refresh token missing" }, { status: 401 });
  }

  let payload: TokenPayload;

  try {
    payload = (await verifyRefreshToken<TokenPayload>(refreshCookie)) as TokenPayload;
  } catch {
    return NextResponse.json({ message: "Invalid refresh token" }, { status: 401 });
  }

  await connectToDatabase();

  const user = await UserModel.findById(payload.sub).exec();

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 401 });
  }

  const tokenVersion = user.refreshTokenVersion ?? 0;

  if (payload.tokenVersion !== tokenVersion) {
    return NextResponse.json({ message: "Token version mismatch" }, { status: 401 });
  }

  const tokenPayload: TokenPayload = {
    sub: user.id,
    email: user.email ?? "",
    roles: Array.isArray(user.roles) ? user.roles.map(String) : [],
    tokenVersion: Number(tokenVersion),
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

  response.cookies.set(accessCookieName, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  response.cookies.set(refreshCookieName, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
