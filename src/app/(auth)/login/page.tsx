import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

import LoginPageClient from '@/modules/LoginPageClient'

export default async function LoginPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(process.env.COOKIE_NAME!)?.value
  if (token) {
    try {
      // If there is a valid session we bypass the login form entirely.
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))
      redirect('/dashboard')
    } catch {}
  }

  return <LoginPageClient />
}
