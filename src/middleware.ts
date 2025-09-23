import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const cookieName = process.env.COOKIE_NAME || 'app_session'
const secret = new TextEncoder().encode(process.env.JWT_SECRET)

// routes allowed without a token
const publicPaths = ['/login', '/logout', '/api/auth/login', '/api/auth/logout']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const token = req.cookies.get(cookieName)?.value

  // Block access immediately when the visitor has no auth cookie.
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    // A bad token should be removed so the user can start a clean session.
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete(cookieName)
    return res
  }
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'], // all routes except static
}
