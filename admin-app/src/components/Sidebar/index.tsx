'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { FaRegBell } from 'react-icons/fa'
import { TbLayoutSidebarLeftCollapse } from 'react-icons/tb'
import { RiDeleteBin5Line } from 'react-icons/ri'

import type { AccountAction, SidebarProps } from '../../types/sidebar'
import { NAVIGATION } from '../../constants/sidebar/navigation'
import { ACCOUNT_ACTIONS, HIGHLIGHTED_ACTION_ID } from '../../constants/sidebar/account'
import { classNames, getInitials, toTitleCase } from '../../utils/sidebar'
import { useAccountMenu } from '../../hooks/useAccountMenu'
import PrimaryNavigation from './PrimaryNavigation'
import SecondaryNavigation from './SecondaryNavigation'
import AccountMenu from './AccountMenu'
import MobileTabBar from './MobileTabBar'

const accountMenuId = 'sidebar-account-menu'
const accountMenuHeadingId = `${accountMenuId}-accounts`
const accountMenuTeamsHeadingId = `${accountMenuId}-teams`

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

  const [activeSection, setActiveSection] = useState(derivedActive)

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

  const {
    accountMenuRef,
    accountTriggerRef,
    accountMenuMounted,
    accountMenuOpen,
    closeAccountMenu,
    toggleAccountMenu,
  } = useAccountMenu({ watchValue: pathname })

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Failed to log out', error)
    } finally {
      router.push('/login')
      router.refresh()
    }
  }, [router])

  const accountActions = useMemo<AccountAction[]>(
    () =>
      ACCOUNT_ACTIONS.map((action) =>
        action.id === 'logout'
          ? {
              ...action,
              onSelect: handleLogout,
            }
          : { ...action },
      ),
    [handleLogout],
  )

  const handleAccountActionSelect = useCallback(
    async (action: AccountAction) => {
      closeAccountMenu()
      if (action.onSelect) {
        await action.onSelect()
        return
      }
      if (action.href) {
        router.push(action.href)
      }
    },
    [closeAccountMenu, router],
  )

  const [secondaryOpen, setSecondaryOpen] = useState(false)
  const [isMediumScreen, setIsMediumScreen] = useState(false)
  const [isLargeScreen, setIsLargeScreen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediumQuery = window.matchMedia('(min-width: 640px)')
    const largeQuery = window.matchMedia('(min-width: 1024px)')

    const setFromQueries = () => {
      const mediumMatches = mediumQuery.matches
      const largeMatches = largeQuery.matches

      setIsMediumScreen(mediumMatches)
      setIsLargeScreen(largeMatches)

      if (largeMatches) {
        setSecondaryOpen(true)
      } else if (!mediumMatches) {
        setSecondaryOpen(false)
      }
    }

    setFromQueries()

    const handleMediumChange = (event: MediaQueryListEvent) => {
      setIsMediumScreen(event.matches)
      if (!event.matches) {
        setSecondaryOpen(false)
      }
    }

    const handleLargeChange = (event: MediaQueryListEvent) => {
      setIsLargeScreen(event.matches)
      if (event.matches) {
        setSecondaryOpen(true)
      } else if (!mediumQuery.matches) {
        setSecondaryOpen(false)
      }
    }

    const addListener = (query: MediaQueryList, handler: (event: MediaQueryListEvent) => void) => {
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', handler)
      } else {
        query.addListener(handler)
      }
    }

    const removeListener = (
      query: MediaQueryList,
      handler: (event: MediaQueryListEvent) => void,
    ) => {
      if (typeof query.removeEventListener === 'function') {
        query.removeEventListener('change', handler)
      } else {
        query.removeListener(handler)
      }
    }

    addListener(mediumQuery, handleMediumChange)
    addListener(largeQuery, handleLargeChange)

    return () => {
      removeListener(mediumQuery, handleMediumChange)
      removeListener(largeQuery, handleLargeChange)
    }
  }, [])

  const toggleSecondaryNavigation = useCallback(
    () => setSecondaryOpen((previous) => !previous),
    [],
  )

  const closeSecondaryNavigation = useCallback(() => setSecondaryOpen(false), [])

  const handlePrimarySelect = useCallback(
    (id: string) => {
      setActiveSection(id)
      setSecondaryOpen(true)
    },
    [],
  )

  const secondaryNavigationId = 'sidebar-secondary-navigation'

  return (
    <main className="flex bg-white text-foreground">
      <aside className="hidden h-screen sticky top-0 w-16 flex-col items-center gap-6 bg-gradient-to-b from-brand-700/25 via-brand-600/25 to-brand-800/25 py-6 text-brand-50 shadow-lg sm:flex">
        <button
          className={classNames(
            'flex h-8 w-8 items-center justify-center rounded-3xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
            secondaryOpen
              ? 'bg-white/10 text-brand-50 hover:bg-white/20'
              : 'bg-white text-brand-600 shadow-lg hover:bg-white/90',
          )}
          type="button"
          onClick={toggleSecondaryNavigation}
          aria-controls={secondaryNavigationId}
          aria-expanded={secondaryOpen}
          title={secondaryOpen ? 'Collapse secondary navigation' : 'Expand secondary navigation'}
        >
          <TbLayoutSidebarLeftCollapse
            className={classNames(
              'h-5 w-5 transition-transform duration-300 ease-in-out',
              secondaryOpen ? 'rotate-0' : 'rotate-180',
            )}
          />
        </button>

        <div className="sidebarCarouselScrollbar flex-1 overflow-y-auto overflow-x-hidden pt-4 pl-4 pr-4">
          <PrimaryNavigation
            items={NAVIGATION}
            activeId={activePrimary.id}
            onSelect={handlePrimarySelect}
          />
        </div>

        <div className="mt-auto flex flex-col items-center gap-4">
          {!secondaryOpen ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded-3xl bg-white text-black/70 transition hover:-translate-y-0.5 hover:bg-white/90 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              title="Trash"
            >
              <RiDeleteBin5Line className="h-5 w-5" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-3xl bg-white/80 text-brand-600/60 transition hover:-translate-y-0.5 hover:bg-white/80 hover:text-brand-600/90 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
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
              accountMenuOpen ? 'ring-brand-300 shadow-xl' : 'hover:-translate-y-0.5 hover:shadow-xl',
            )}
            title="Account menu"
          >
            <span className="select-none text-sm font-semibold">{avatarInitial}</span>
            <span
              className={classNames(
                'pointer-events-none absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border border-white transition-transform duration-200',
                accountMenuOpen ? 'scale-100 bg-brand-500' : 'scale-0 bg-brand-400',
              )}
              aria-hidden="true"
            />
          </button>
        </div>
      </aside>

      {isMediumScreen && !isLargeScreen ? (
        <>
          <div
            className={classNames(
              'fixed inset-y-0 right-0 left-20 z-20 transition-opacity duration-300 sm:block lg:hidden',
              secondaryOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
            )}
            onClick={closeSecondaryNavigation}
            aria-hidden="true"
          />

          <aside
            id={secondaryNavigationId}
            aria-hidden={!secondaryOpen}
            className={classNames(
              'fixed inset-y-6 left-20 z-30 hidden w-[min(22rem,calc(100vw-7rem))] flex-col overflow-hidden overflow-y-auto rounded-3xl border border-brand-100/60 bg-gradient-to-b from-brand-700/40 via-brand-600/40 to-brand-800/40 shadow-2xl transition-all duration-300 ease-out sm:flex lg:hidden',
              secondaryOpen
                ? 'translate-x-0 opacity-100 pointer-events-auto'
                : '-translate-x-[110%] opacity-0 pointer-events-none',
            )}
          >
            <div className="flex h-24 flex-col items-start justify-center border-b border-brand-100/60 px-4">
              <Image
                src="/assets/logo/logo-horizontal.svg"
                alt="CSW Logo"
                width={110}
                height={60}
                className="brightness-75"
              />
              {user?.email ? <p className="truncate text-xs text-gray-200">{user.email}</p> : null}
              {user?.roles?.length ? (
                <p className="text-[9px] font-semibold uppercase tracking-wide text-brand-600">
                  {String(user.roles).replaceAll('-', ' ')}
                </p>
              ) : null}
            </div>

            <div className="flex-1 space-y-5 px-4 py-6">
              <SecondaryNavigation
                primary={activePrimary}
                pathname={pathname}
                onNavigate={closeSecondaryNavigation}
              />
            </div>

            <div className="mt-auto border-t border-brand-100/60 px-4 py-3 text-xs text-muted-500">
              <div className="group flex h-12 cursor-pointer items-center gap-2 rounded-lg bg-white/20 px-3 transition-all hover:bg-white/30">
                <RiDeleteBin5Line
                  size={20}
                  className="text-white/70 transition-colors group-hover:text-rose-700"
                />
                <p className="text-base text-white/70 transition-colors group-hover:text-rose-700">
                  Trash
                </p>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      <AccountMenu
        mounted={accountMenuMounted}
        open={accountMenuOpen}
        menuId={accountMenuId}
        headingId={accountMenuHeadingId}
        teamsHeadingId={accountMenuTeamsHeadingId}
        menuRef={accountMenuRef}
        onClose={closeAccountMenu}
        onActionSelect={handleAccountActionSelect}
        actions={accountActions}
        highlightedActionId={HIGHLIGHTED_ACTION_ID}
        displayName={displayName}
        avatarInitial={avatarInitial}
        userEmail={user?.email ?? null}
        teamInitials={teamInitials}
        teamName={teamName}
        teamSubtitle={teamSubtitle}
      />

      {isLargeScreen ? (
        <aside
          id={secondaryNavigationId}
          aria-hidden={!secondaryOpen}
          className={classNames(
            'hidden h-screen sticky top-0 flex-col border-r border-brand-100/60 bg-gradient-to-b from-brand-700/40 via-brand-600/40 to-brand-800/40 shadow-lg transition-all duration-300 ease-in-out overflow-hidden lg:flex',
            secondaryOpen
              ? 'lg:w-60 xl:w-68 lg:opacity-100'
              : 'lg:w-0 lg:translate-x-4 lg:opacity-0 lg:pointer-events-none',
          )}
        >
          <div className="flex h-24 flex-col items-start justify-center border-b border-brand-100/60 px-4">
            <Image
              src="/assets/logo/logo-horizontal.svg"
              alt="CSW Logo"
              width={110}
              height={60}
              className="brightness-75"
            />
            {user?.email ? <p className="truncate text-xs text-gray-200">{user.email}</p> : null}
            {user?.roles?.length ? (
              <p className="text-[9px] font-semibold uppercase tracking-wide text-brand-600">
                {String(user.roles).replaceAll('-', ' ')}
              </p>
            ) : null}
          </div>

          <div className="flex-1 space-y-5 px-4 py-6">
            <SecondaryNavigation primary={activePrimary} pathname={pathname} />
          </div>

          <div className="mt-auto border-t border-brand-100/60 px-4 py-3 text-xs text-muted-500">
            <div className="group flex h-12 cursor-pointer items-center gap-2 rounded-lg bg-white/20 px-3 transition-all hover:bg-white/30">
              <RiDeleteBin5Line
                size={20}
                className="text-white/70 transition-colors group-hover:text-rose-700"
              />
              <p className="text-base text-white/70 transition-colors group-hover:text-rose-700">
                Trash
              </p>
            </div>
          </div>
        </aside>
      ) : null}

      <main className="z-10 flex-1 overflow-y-auto bg-gradient-to-b from-brand-700/40 via-brand-600/40 to-brand-800/40 px-2 pt-6 pb-28 sm:pb-0 sm:px-3 lg:px-4">
        <div className="min-h-[100vh] rounded-t-3xl bg-white px-6 pt-6 sm:px-8">{children}</div>
      </main>

      <MobileTabBar pathname={pathname} onNavigate={closeSecondaryNavigation} />
    </main>
  )
}

export default Sidebar
