import Link from 'next/link'

import { MOBILE_TABS } from '../../constants/sidebar/navigation'
import { classNames } from '../../utils/sidebar'

type MobileTabBarProps = {
  pathname: string
  onNavigate?: () => void
}

const MobileTabBar = ({ pathname, onNavigate }: MobileTabBarProps) => (
  <nav className="fixed bottom-4 left-4 right-4 z-30 sm:hidden">
    <div className="relative mx-auto flex max-w-md items-center justify-between rounded-3xl bg-white/95 px-6 py-3 shadow-lg ring-1 ring-brand-900/5">
      {MOBILE_TABS.map((tab, index) => {
        const Icon = tab.icon
        const isActive =
          tab.href && (pathname === tab.href || pathname.startsWith(`${tab.href}/`))
        const isPrimary = Boolean(tab.primary)

        const tabNode = (
          <Link
            href={tab.href ?? '#'}
            onClick={() => {
              onNavigate?.()
            }}
            aria-label={tab.label}
            className={classNames(
              'flex flex-col items-center gap-1 text-xs font-medium transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70',
              isPrimary
                ? 'group -translate-y-5 transform rounded-full bg-brand-500 px-4 py-4 text-white shadow-xl focus-visible:ring-white/80'
                : 'text-brand-600/70 hover:text-brand-600',
            )}
          >
            <Icon
              className={classNames(
                'h-6 w-6 transition-colors duration-200',
                isPrimary
                  ? 'text-white'
                  : isActive
                    ? 'text-brand-600'
                    : 'text-brand-500/70',
              )}
            />
            {!isPrimary ? (
              <span
                className={classNames(
                  'text-[10px] uppercase tracking-wide',
                  isActive ? 'text-brand-600' : 'text-brand-400/80',
                )}
              >
                {tab.label}
              </span>
            ) : null}
          </Link>
        )

        if (!isPrimary) {
          return (
            <div key={tab.id} className="flex flex-1 justify-center">
              {tabNode}
            </div>
          )
        }

        return (
          <div
            key={tab.id}
            className={classNames(
              'absolute left-1/2 top-0 flex -translate-x-1/2',
              index === 2 ? '' : null,
            )}
          >
            {tabNode}
          </div>
        )
      })}
    </div>
  </nav>
)

export default MobileTabBar
