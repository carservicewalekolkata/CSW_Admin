import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

export default async function Home() {
  const cookieName = process.env.COOKIE_NAME || 'app_session'
  const token = (await cookies()).get(cookieName)?.value
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)

  // Route guard: visitors without a session go straight to the login screen.
  if (!token) redirect('/login')

  try {
    // A valid token indicates an active session, so skip the login flow.
    await jwtVerify(token, secret)
    redirect('/dashboard')
  } catch {
    // Invalid or expired tokens must re-authenticate.
    redirect('/login')
  }
}
