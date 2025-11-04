import Image from 'next/image'
import type { ReactNode } from 'react'

export type AuthShellProps = {
  title: string
  description: string
  footer?: ReactNode
  children: ReactNode
}

const AuthShell = ({ title, description, footer, children }: AuthShellProps) => {
  return (
    <section className="grid w-full max-w-6xl overflow-hidden rounded-card bg-surface text-foreground shadow-card ring-1 ring-brand-100/60 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="flex flex-col justify-between gap-10 bg-surface px-6 py-10 sm:px-12">
        <div className="space-y-6">
          <Image
            priority
            src="/assets/logo/logo-horizontal.svg"
            alt="CSW Admin"
            width={164}
            height={48}
          />

          <header className="space-y-3">
            <h1 className="text-title font-semibold leading-tight text-brand-500">{title}</h1>
            <p className="max-w-sm text-body text-muted-500">{description}</p>
          </header>
        </div>

        {children}

        {footer && <div className="text-sm text-muted-500">{footer}</div>}
      </div>

      <aside 
        className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 text-brand-50 lg:flex lg:flex-col"
      >
        <Image
          src={`/assets/loginpage-aside-banner.webp`}
          alt='Login page banner'
          width={1024}
          height={1024}
          priority
          quality={75}
          className='object-cover w-full h-full object-center'
        />
      </aside>
    </section>
  )
}

export default AuthShell