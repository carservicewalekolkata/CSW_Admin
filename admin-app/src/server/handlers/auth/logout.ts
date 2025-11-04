import { versionedJson } from '@/server/apiVersion'

const accessCookieName = process.env.COOKIE_NAME ?? 'app_session'
const refreshCookieName = `${accessCookieName}_refresh`
const secureCookies = process.env.NODE_ENV === 'production'

export async function POST() {
  const response = versionedJson(
    { success: true },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )

  const expiredCookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: secureCookies,
    maxAge: 0,
    path: '/',
  }

  response.cookies.set(accessCookieName, '', expiredCookieOptions)
  response.cookies.set(refreshCookieName, '', expiredCookieOptions)

  return response
}

