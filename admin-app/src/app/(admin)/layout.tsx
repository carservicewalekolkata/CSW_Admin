import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

import Sidebar from '@/components/Sidebar'

type DecodedUser = {
  email?: string | null
  name?: string | null
  roles?: string[] | null
}

export default async function HomeLayout({
  children,
}: {
  children: ReactNode
}) {
  const cookieName = process.env.COOKIE_NAME || 'app_session'
  const cookieStore = await cookies()
  const token = cookieStore.get(cookieName)?.value

  let user: DecodedUser | null = null
  const jwtSecret = process.env.JWT_SECRET

  if (token && jwtSecret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret))

      user = {
        email: typeof payload.email === 'string' ? payload.email : null,
        name: typeof payload.name === 'string' ? payload.name : null,
        roles: Array.isArray(payload.roles) ? payload.roles.map((role) => String(role)) : null,
      }
    } catch {
      user = null
    }
  }

  return (
    <Sidebar user={user}>
      {children}
    </Sidebar>
  )
}
