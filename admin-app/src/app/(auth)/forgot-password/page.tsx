import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { jwtVerify } from 'jose'

import AuthShell from '@/modules/auth/AuthShell'
import ForgotPasswordForm from '@/modules/ForgotPasswordForm'

export default async function ForgotPasswordPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(process.env.COOKIE_NAME!)?.value

  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))
      redirect('/dashboard')
    } catch {}
  }

  return (
    <AuthShell
      title="Reset your password"
      description="We'll guide you through the steps to access your account again."
      footer={(
        <>
          Remembered it?{' '}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-500">
            Return to login
          </Link>
        </>
      )}
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
