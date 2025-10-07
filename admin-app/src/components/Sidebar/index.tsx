'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { IconType } from 'react-icons'
import {
  HiMiniSquares2X2,
  HiOutlineArchiveBoxArrowDown,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBriefcase,
  HiOutlineCog6Tooth,
  HiOutlineHome,
  HiOutlineSquaresPlus,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

type SidebarProps = {
  user: {
    email?: string | null
    name?: string | null
    roles?: string[] | null
  } | null
  children: ReactNode
}

type SecondaryNavItem = {
  id: string
  label: string
  description: string
  href: string
}

type PrimaryNavItem = {
  id: string
  label: string
  icon: IconType
  href?: string
  patterns?: string[]
  secondary: SecondaryNavItem[]
}

const NAVIGATION: PrimaryNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: HiOutlineHome,
    href: '/dashboard',
    patterns: ['/dashboard'],
    secondary: [
      {
        id: 'overview',
        label: 'Overview',
        description: 'At-a-glance metrics and platform health.',
        href: '/dashboard',
      },
      {
        id: 'activity',
        label: 'Activity log',
        description: 'Keep an eye on import history and recent updates.',
        href: '/dashboard/activity',
      },
    ],
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    icon: HiMiniSquares2X2,
    patterns: ['/catalogue'],
    secondary: [
      {
        id: 'brands',
        label: 'Brand library',
        description: 'Create and manage the OEM catalogue.',
        href: '/catalogue/brands',
      },
      {
        id: 'models',
        label: 'Model matrix',
        description: 'Map vehicle models to their parent brands.',
        href: '/catalogue/models',
      },
      {
        id: 'services',
        label: 'Service packages',
        description: 'Curate pricing, upsells, and bundled offerings.',
        href: '/catalogue/services',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: HiOutlineBriefcase,
    patterns: ['/operations'],
    secondary: [
      {
        id: 'bookings',
        label: 'Bookings',
        description: 'Monitor active jobs and assignment statuses.',
        href: '/operations/bookings',
      },
      {
        id: 'workshops',
        label: 'Workshops',
        description: 'Manage partner workshops and capacity.',
        href: '/operations/workshops',
      },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: HiOutlineUserGroup,
    patterns: ['/customers'],
    secondary: [
      {
        id: 'accounts',
        label: 'Accounts',
        description: 'View customer records and contact details.',
        href: '/customers/accounts',
      },
      {
        id: 'feedback',
        label: 'Feedback',
        description: 'Track CSAT trends and follow ups.',
        href: '/customers/feedback',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: HiOutlineCog6Tooth,
    patterns: ['/settings'],
    secondary: [
      {
        id: 'users',
        label: 'Users & roles',
        description: 'Invite teammates and manage permissions.',
        href: '/settings/users',
      },
      {
        id: 'integrations',
        label: 'Integrations',
        description: 'Configure external services and automations.',
        href: '/settings/integrations',
      },
      {
        id: 'audit',
        label: 'Audit trail',
        description: 'Review configuration changes over time.',
        href: '/settings/audit-log',
      },
    ],
  },
]

const classNames = (...tokens: Array<string | false | null | undefined>) => (
  tokens.filter(Boolean).join(' ')
)

const Sidebar = ({ user, children }: SidebarProps) => {
  const router = useRouter()
  const pathname = usePathname()

  const derivedActive = useMemo(() => {
    const match = NAVIGATION.find((entry) => {
      const matchesPattern = entry.patterns?.some((pattern) => pathname.startsWith(pattern))
      const matchesChild = entry.secondary.some((child) => pathname.startsWith(child.href))
      return matchesPattern || matchesChild
    })

    return match?.id ?? NAVIGATION[0].id
  }, [pathname])

  const [activeSection, setActiveSection] = useState<string>(derivedActive)

  useEffect(() => setActiveSection(derivedActive), [derivedActive])

  const activePrimary = useMemo(
    () => NAVIGATION.find((entry) => entry.id === activeSection) ?? NAVIGATION[0],
    [activeSection],
  )

  const activeSecondary = useMemo(() => {
    const matched = activePrimary.secondary.find((child) => pathname.startsWith(child.href))
    return matched?.id ?? activePrimary.secondary[0]?.id ?? null
  }, [activePrimary.secondary, pathname])

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Administrator'
  const avatarInitial = displayName.charAt(0).toUpperCase()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Failed to log out', error)
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-20 flex-col items-center gap-6 bg-gradient-to-b from-brand-700 via-brand-600 to-brand-800 py-6 text-brand-50 shadow-lg lg:w-24">
        <Link
          href="/dashboard"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/30 transition hover:bg-white/20"
          aria-label="CSW Admin home"
        >
          <Image src="/assets/brand/logo-mark.svg" alt="CSW Admin" width={28} height={28} />
        </Link>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-600 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <HiOutlineSquaresPlus className="h-6 w-6" />
        </button>

        <nav className="flex flex-1 flex-col items-center gap-3 pt-4">
          {NAVIGATION.map((item) => {
            const Icon = item.icon
            const isActive = item.id === activePrimary.id

            return (
              <button
                key={item.id}
                type="button"
                className={classNames(
                  'relative flex h-12 w-12 items-center justify-center rounded-3xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
                  isActive
                    ? 'bg-white text-brand-600 shadow-xl'
                    : 'bg-white/10 text-brand-50/80 hover:bg-white/20 hover:text-white',
                )}
                onClick={() => {
                  setActiveSection(item.id)
                  if (item.href) {
                    router.push(item.href)
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
              >
                <Icon className="h-6 w-6" />
              </button>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/10 text-brand-50 transition hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            title="Sign out"
          >
            <HiOutlineArrowRightOnRectangle className="h-6 w-6" />
          </button>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-lg ring-2 ring-white/50">
            <span className="select-none text-lg font-semibold">{avatarInitial}</span>
          </div>
        </div>
      </aside>

      <aside className="hidden w-72 flex-col border-r border-brand-100/60 bg-surface shadow-lg lg:flex xl:w-80">
        <div className="flex h-24 items-center gap-3 border-b border-brand-100/60 px-6">
          <div className="rounded-2xl bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
            Admin
          </div>
          <span className="text-lg font-semibold text-brand-700">{activePrimary.label}</span>
        </div>

        <div className="space-y-5 px-6 py-6">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <HiOutlineArchiveBoxArrowDown className="h-5 w-5" />
            Quick create
          </button>

          <nav className="space-y-2">
            {activePrimary.secondary.map((item) => {
              const isActive = item.id === activeSecondary
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  className={classNames(
                    'block rounded-2xl border border-transparent px-4 py-3 transition',
                    isActive
                      ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-sm'
                      : 'bg-surface text-muted-500 hover:border-brand-200 hover:bg-brand-50/70 hover:text-brand-600',
                  )}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-500/80">{item.description}</p>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-brand-100/60 px-6 py-5 text-xs text-muted-500">
          <p className="font-semibold text-muted-700">{displayName}</p>
          {user?.email && (
            <p className="mt-1 truncate text-muted-500">{user.email}</p>
          )}
          {user?.roles?.length ? (
            <p className="mt-3 text-[11px] uppercase tracking-wide text-brand-500">
              {user.roles.join(' • ')}
            </p>
          ) : null}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-surface px-6 py-8 lg:px-10">
        {children}
      </main>
    </div>
  )
}

export default Sidebar
