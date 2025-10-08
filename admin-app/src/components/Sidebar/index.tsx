'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { IconType } from 'react-icons'
import Image from 'next/image'

import {
  HiMiniSquares2X2,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
  HiOutlineChevronRight,
  HiOutlineMoon,
} from 'react-icons/hi2'
import { TbLayoutSidebarLeftCollapse, TbDatabaseEdit } from "react-icons/tb";
import { FaRegBell, FaCar } from "react-icons/fa";
import { RiDeleteBin5Line } from "react-icons/ri";
import { MdOutlineLocalLaundryService } from "react-icons/md";

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
  danger?: boolean
}

type AccountAction = {
  id: string
  label: string
  description?: string
  icon: IconType
  href?: string
  onSelect?: () => void | Promise<void>
  tone?: 'default' | 'critical'
}

const NAVIGATION: PrimaryNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: HiMiniSquares2X2,
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
    id: 'cars',
    label: 'Cars',
    icon: FaCar,
    patterns: ['/cars'],
    secondary: [
      {
        id: 'brands',
        label: 'Car Brands',
        description: 'Display all the brands.',
        href: '/cars/brands',
      },
      {
        id: 'models',
        label: 'Car Models',
        description: 'Display all the models.',
        href: '/cars/models',
      },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    icon: MdOutlineLocalLaundryService,
    patterns: ['/services'],
    secondary: [
      {
        id: 'service-category',
        label: 'Service Category',
        description: 'Displays all the service categories.',
        href: '/services/category',
      },
      {
        id: 'service-details',
        label: 'Service Details',
        description: 'Displays details of each services.',
        href: '/services/details',
      },
    ],
  },
  {
    id: 'seed',
    label: 'Seed Data',
    icon: TbDatabaseEdit,
    patterns: ['/seed'],
    secondary: [
      {
        id: 'users',
        label: 'Users & roles',
        description: 'Invite teammates and manage permissions.',
        href: '/seed/users',
      },
      {
        id: 'data-fetch',
        label: 'Data Fetch',
        description: 'Fetch Data from different car vendors.',
        href: '/seed/data-fetch',
      },
    ],
    danger: true
  },
]

const classNames = (...tokens: Array<string | false | null | undefined>) => (
  tokens.filter(Boolean).join(' ')
)

const toTitleCase = (value: string) => (
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
)

const getInitials = (value: string, fallback: string) => {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
  return initials || fallback
}

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

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Administrator'
  const avatarInitial = displayName.charAt(0).toUpperCase()

  const primaryRole = user?.roles?.[0]
  const teamName = primaryRole ? toTitleCase(primaryRole) : 'Core Admin Team'
  const teamInitials = getInitials(teamName, 'CT')
  const teamSubtitle = user?.roles?.length
    ? `${user.roles.length} role${user.roles.length > 1 ? 's' : ''} assigned`
    : 'Role-based workspace access'

  const accountTriggerRef = useRef<HTMLButtonElement | null>(null)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const accountMenuTimeoutRef = useRef<number | null>(null)
  const accountMenuOpenRef = useRef(false)
  const [accountMenuMounted, setAccountMenuMounted] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuId = 'sidebar-account-menu'
  const accountMenuHeadingId = `${accountMenuId}-accounts`
  const accountMenuTeamsHeadingId = `${accountMenuId}-teams`

  const closeAccountMenu = useCallback(() => {
    setAccountMenuOpen(false)
    if (accountMenuTimeoutRef.current) {
      window.clearTimeout(accountMenuTimeoutRef.current)
    }
    accountMenuTimeoutRef.current = window.setTimeout(() => {
      setAccountMenuMounted(false)
      accountMenuTimeoutRef.current = null
    }, 200)
  }, [])

  const openAccountMenu = useCallback(() => {
    if (accountMenuTimeoutRef.current) {
      window.clearTimeout(accountMenuTimeoutRef.current)
      accountMenuTimeoutRef.current = null
    }
    setAccountMenuMounted(true)
    requestAnimationFrame(() => setAccountMenuOpen(true))
  }, [])

  const toggleAccountMenu = useCallback(() => {
    if (accountMenuOpen) {
      closeAccountMenu()
    } else {
      openAccountMenu()
    }
  }, [accountMenuOpen, closeAccountMenu, openAccountMenu])

  useEffect(() => {
    if (!accountMenuMounted) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        accountMenuRef.current?.contains(target) ||
        accountTriggerRef.current?.contains(target)
      ) {
        return
      }
      closeAccountMenu()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAccountMenu()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [accountMenuMounted, closeAccountMenu])

  useEffect(() => {
    if (accountMenuOpen && accountMenuRef.current) {
      accountMenuRef.current.focus({ preventScroll: true })
    }
  }, [accountMenuOpen])

  useEffect(() => {
    accountMenuOpenRef.current = accountMenuOpen
  }, [accountMenuOpen])

  useEffect(() => {
    if (!accountMenuOpenRef.current) {
      return
    }
    closeAccountMenu()
  }, [pathname, closeAccountMenu])

  useEffect(() => {
    return () => {
      if (accountMenuTimeoutRef.current) {
        window.clearTimeout(accountMenuTimeoutRef.current)
      }
    }
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Failed to log out', error)
    } finally {
      router.push('/login')
      router.refresh()
    }
  }, [router])

  const accountActions = useMemo<AccountAction[]>(() => [
    {
      id: 'settings',
      label: 'Settings',
      description: 'Workspace preferences',
      icon: HiOutlineCog6Tooth,
      href: '/settings',
    },
    {
      id: 'theme',
      label: 'Theme',
      description: 'Personalize the dashboard',
      icon: HiOutlineMoon,
      href: '/settings/theme',
    },
    {
      id: 'logout',
      label: 'Log out',
      icon: HiOutlineArrowRightOnRectangle,
      onSelect: handleLogout,
      tone: 'critical',
    },
  ], [handleLogout])

  const highlightedActionId = 'theme'

  const handleAccountActionSelect = useCallback((action: AccountAction) => async () => {
    closeAccountMenu()
    if (action.onSelect) {
      await action.onSelect()
      return
    }
    if (action.href) {
      router.push(action.href)
    }
  }, [closeAccountMenu, router])

  return (
    <main className="flex bg-white text-foreground">
      <aside className="flex w-12 h-screen sticky top-0 flex-col items-center gap-6 bg-gradient-to-b from-brand-700/25 via-brand-600/25 to-brand-800/25 py-6 text-brand-50 shadow-lg lg:w-16">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-3xl text-brand-600/60 cursor-pointer"
        >
          <TbLayoutSidebarLeftCollapse className="h-5 w-5" />
        </button>

        <div className='flex-1 overflow-y-auto overflow-x-hidden sidebarCarouselScrollbar pt-4 pl-4 pr-4'>
          <nav className="flex flex-col min-h-[75vh] items-center gap-3">
            {NAVIGATION.map((item) => {
              const Icon = item.icon
              const isActive = item.id === activePrimary.id

              return (
                <button
                  key={item.id}
                  type="button"
                  className={classNames(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 hover:-translate-y-0.5',
                    isActive
                      ? item.danger
                        ? 'bg-red-600 text-white shadow-lg hover:bg-red-700'
                        : 'bg-white text-brand-600 shadow-lg hover:bg-white/95'
                      : item.danger
                        ? 'bg-red-100 text-red-600 hover:bg-red-200 hover:shadow-md'
                        : 'bg-white/70 text-brand-600/60 hover:bg-white hover:text-brand-600 hover:shadow-md',
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
                  <Icon className="h-5 w-5" />
                </button>
              )
            })}
          </nav>
        </div>

        <div className="mt-auto flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-3xl bg-white/80 text-brand-600/60 hover:bg-white/80 hover:text-brand-600/90 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            title="Sign out"
          >
            <FaRegBell className="h-5 w-5" />
          </button>

          <button
            ref={accountTriggerRef}
            type="button"
            onClick={toggleAccountMenu}
            aria-expanded={accountMenuOpen}
            aria-controls={accountMenuId}
            aria-haspopup="dialog"
            className={classNames(
              'relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-600 shadow-lg ring-2 ring-white/70 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70',
              accountMenuOpen ? 'ring-brand-300 shadow-xl' : 'hover:-translate-y-0.5 hover:shadow-xl'
            )}
            title="Account menu"
          >
            <span className="select-none text-sm font-semibold">{avatarInitial}</span>
            <span
              className={classNames(
                'pointer-events-none absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border border-white transition-transform duration-200',
                accountMenuOpen ? 'scale-100 bg-brand-500' : 'scale-0 bg-brand-400'
              )}
              aria-hidden="true"
            />
          </button>
        </div>
      </aside>

      {accountMenuMounted && (
        <>
          <div
            className={classNames(
              'fixed inset-0 z-40 bg-neutral-900/10 backdrop-blur-sm transition-opacity duration-200',
              accountMenuOpen ? 'opacity-100' : 'opacity-0'
            )}
            onClick={closeAccountMenu}
            aria-hidden="true"
          />
          <div
            ref={accountMenuRef}
            id={accountMenuId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={accountMenuHeadingId}
            tabIndex={-1}
            className={classNames(
              'fixed bottom-8 left-14 z-50 w-[19.5rem] max-w-[calc(100vw-4.5rem)] rounded-3xl bg-white text-sm text-foreground shadow-2xl ring-1 ring-brand-900/10 transition-all duration-200 focus-visible:outline-none sm:left-16 lg:left-20',
              accountMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            )}
          >
            <div className="px-5 pb-3 pt-5">
              <p
                id={accountMenuHeadingId}
                className="text-xs font-semibold uppercase tracking-wide text-muted-500"
              >
                Accounts
              </p>

              <button
                type="button"
                className="mt-3 flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-150 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
                onClick={closeAccountMenu}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-base font-semibold text-brand-600">
                  {avatarInitial}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-semibold text-brand-800">{displayName}</span>
                  {user?.email ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-500">{user.email}</span>
                  ) : null}
                </span>
                <HiOutlineChevronRight className="h-4 w-4 text-muted-400" aria-hidden="true" />
              </button>
            </div>

            <div className="border-t border-brand-100/80 px-5 py-4">
              <p
                id={accountMenuTeamsHeadingId}
                className="text-xs font-semibold uppercase tracking-wide text-muted-500"
              >
                Teams
              </p>
              <button
                type="button"
                className="mt-3 flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-150 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
                onClick={closeAccountMenu}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-200 text-sm font-semibold text-brand-700">
                  {teamInitials}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-semibold text-brand-800">{teamName}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-500">{teamSubtitle}</span>
                </span>
                <HiOutlineChevronRight className="h-4 w-4 text-muted-400" aria-hidden="true" />
              </button>
            </div>

            <div className="border-t border-brand-100/80 py-2">
              <ul className="space-y-1 px-2 py-1">
                {accountActions.map((action) => {
                  const Icon = action.icon
                  const isHighlighted = action.id === highlightedActionId
                  const toneModifier = action.tone === 'critical'
                  return (
                    <li key={action.id}>
                      <button
                        type="button"
                        onClick={handleAccountActionSelect(action)}
                        className={classNames(
                          'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
                          toneModifier
                            ? 'text-brand-600 hover:bg-brand-100 hover:text-brand-700 focus-visible:ring-brand-500/40'
                            : 'text-muted-700 hover:bg-brand-50 hover:text-brand-700',
                          isHighlighted && !toneModifier
                            ? 'bg-brand-50 text-brand-700 shadow-inner ring-1 ring-brand-100'
                            : null
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{action.label}</span>
                          {action.description ? (
                            <span className="mt-0.5 block text-xs text-muted-500">
                              {action.description}
                            </span>
                          ) : null}
                        </span>
                        <HiOutlineChevronRight
                          className={classNames(
                            'h-4 w-4 flex-shrink-0 transition-opacity',
                            isHighlighted && !toneModifier ? 'opacity-100 text-brand-500' : 'opacity-70 text-muted-400'
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </>
      )}

      <aside className="hidden w-60 h-screen sticky top-0 flex-col border-r border-brand-100/60 bg-gradient-to-b from-brand-700/40 via-brand-600/40 to-brand-800/40 shadow-lg lg:flex xl:w-68">
        <div className="flex flex-col h-24 items-start justify-center border-b border-brand-100/60 px-4">
          <Image
            src={'/assets/logo/logo-horizontal.svg'}
            alt='CSW Logo'
            width={110}
            height={60}
            className='brightness-75'
          />
          {user?.email && (
            <p className="truncate text-xs text-gray-600">{user.email}</p>
          )}
          {user?.roles?.length ? (
            <p className="text-[9px] uppercase tracking-wide font-semibold text-brand-500">
              {String(user.roles).replaceAll('-', ' ')}
            </p>
          ) : null}
        </div>

        <div className="space-y-5 px-4 py-6">
          <nav className="space-y-2">
          </nav>
        </div>

        <div className="mt-auto border-t border-brand-100/60 px-4 py-3 text-xs text-muted-500">
          <div className="group hover:bg-white/30 bg-white/50 rounded-lg h-12 cursor-pointer px-3 flex items-center gap-2 transition-all">
            <RiDeleteBin5Line
              size={20}
              className="text-gray-500 transition-colors group-hover:text-rose-800"
            />
            <p className="text-gray-500 text-lg transition-colors group-hover:text-rose-800">
              Trash
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-brand-700/40 via-brand-600/40 to-brand-800/40 px-2 pt-6 lg:px-4">
        <div className='bg-white min-h-[100vh] rounded-t-3xl px-8 pt-6'>
          {children}
        </div>
      </main>
    </main>
  )
}

export default Sidebar
