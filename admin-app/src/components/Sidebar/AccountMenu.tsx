import { HiOutlineChevronRight } from 'react-icons/hi2'

import type { AccountAction } from '../../types/sidebar'
import { classNames } from '../../utils/sidebar'

type AccountMenuProps = {
  mounted: boolean
  open: boolean
  menuId: string
  headingId: string
  teamsHeadingId: string
  menuRef: React.RefObject<HTMLDivElement | null>
  onClose: () => void
  onActionSelect: (action: AccountAction) => Promise<void> | void
  actions: AccountAction[]
  highlightedActionId: string
  displayName: string
  avatarInitial: string
  userEmail?: string | null
  teamInitials: string
  teamName: string
  teamSubtitle: string
}

const AccountMenu = ({
  mounted,
  open,
  menuId,
  headingId,
  teamsHeadingId,
  menuRef,
  onClose,
  onActionSelect,
  actions,
  highlightedActionId,
  displayName,
  avatarInitial,
  userEmail,
  teamInitials,
  teamName,
  teamSubtitle,
}: AccountMenuProps) => {
  if (!mounted) {
    return null
  }

  return (
    <>
      <div
        className={classNames(
          'fixed inset-0 z-40 bg-neutral-900/10 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={menuRef}
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className={classNames(
          'fixed bottom-8 left-14 z-50 w-[19.5rem] max-w-[calc(100vw-4.5rem)] rounded-3xl bg-white text-sm text-foreground shadow-2xl ring-1 ring-brand-900/10 transition-all duration-200 focus-visible:outline-none sm:left-16 lg:left-20',
          open ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        )}
      >
        <div className="px-5 pb-3 pt-5">
          <p
            id={headingId}
            className="text-xs font-semibold uppercase tracking-wide text-muted-500"
          >
            Accounts
          </p>

          <button
            type="button"
            className="mt-3 flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-150 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
            onClick={onClose}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-base font-semibold text-brand-600">
              {avatarInitial}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-semibold text-brand-800">{displayName}</span>
              {userEmail ? (
                <span className="mt-0.5 block truncate text-xs text-muted-500">{userEmail}</span>
              ) : null}
            </span>
            <HiOutlineChevronRight className="h-4 w-4 text-muted-400" aria-hidden="true" />
          </button>
        </div>

        <div className="border-t border-brand-100/80 px-5 py-4">
          <p
            id={teamsHeadingId}
            className="text-xs font-semibold uppercase tracking-wide text-muted-500"
          >
            Teams
          </p>

          <button
            type="button"
            className="mt-3 flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-150 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
            onClick={onClose}
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
            {actions.map((action) => {
              const Icon = action.icon
              const isHighlighted = action.id === highlightedActionId
              const toneModifier = action.tone === 'critical'

              return (
                <li key={action.id}>
                  <button
                    type="button"
                    onClick={() => {
                      void onActionSelect(action)
                    }}
                    className={classNames(
                      'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
                      toneModifier
                        ? 'text-brand-600 hover:bg-brand-100 hover:text-brand-700 focus-visible:ring-brand-500/40'
                        : 'text-muted-700 hover:bg-brand-50 hover:text-brand-700',
                      isHighlighted && !toneModifier
                        ? 'bg-brand-50 text-brand-700 shadow-inner ring-1 ring-brand-100'
                        : null,
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
                        isHighlighted && !toneModifier ? 'opacity-100 text-brand-500' : 'opacity-70 text-muted-400',
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
  )
}

export default AccountMenu
