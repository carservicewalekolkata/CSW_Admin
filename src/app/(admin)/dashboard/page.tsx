import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

export default async function DashboardPage() {
  const cookieName = process.env.COOKIE_NAME || 'app_session'
  const token = (await cookies()).get(cookieName)?.value
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = null
  if (token) {
    try {
      // Decode the JWT so we can personalize the dashboard greeting.
      const { payload } = await jwtVerify(token, secret)
      user = payload
    } catch {}
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p>Welcome {user?.name || 'User'}!</p>
    </div>
  )
}
