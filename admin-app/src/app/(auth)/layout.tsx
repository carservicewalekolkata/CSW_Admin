import type { ReactNode } from 'react'

export default function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <main className="bg-background text-foreground">
      <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-8 lg:px-12">
        {children}
      </div>
    </main>
  )
}