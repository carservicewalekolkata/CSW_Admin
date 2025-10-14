import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const cookieName = process.env.COOKIE_NAME || 'app_session'
const secret = new TextEncoder().encode(process.env.JWT_SECRET)

const AUTH_WHITELIST = [
  '/login',
  '/forgot-password',
  '/api/v1/auth/login',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/status',
  '/api/v1/auth/refresh',
]

const PROTECTED_PREFIXES = ['/dashboard']

const isWhitelisted = (pathname: string) =>
  AUTH_WHITELIST.some((path) => pathname.startsWith(path))

const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isWhitelisted(pathname) || !isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  const token = req.cookies.get(cookieName)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete(cookieName)
    return res
  }
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
