import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify } from 'jose'

import AuthShell from '@/modules/auth/AuthShell'
import LoginForm from '@/modules/LoginPageClient'

export default async function LoginPage() {
  const cookieStore = await cookies()
  const cookieName = process.env.COOKIE_NAME || 'app_session'
  const token = cookieStore.get(cookieName)?.value

  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))
      redirect('/dashboard')
    } catch {}
  }

  return (
    <AuthShell
      title="Welcome back!"
      description="Enter your details below to access your dashboard, manage data, and continue where you left off."
      footer={(
        <>
          Car Service Wale &copy; 2025
        </>
      )}
    >
      <LoginForm />
    </AuthShell>
  )
}
