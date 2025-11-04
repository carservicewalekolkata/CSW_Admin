import Link from 'next/link'

import type { PrimaryNavItem } from '../../types/sidebar'
import { classNames } from '../../utils/sidebar'

type SecondaryNavigationProps = {
  primary: PrimaryNavItem
  pathname: string
  onNavigate?: () => void
}

const SecondaryNavigation = ({ primary, pathname, onNavigate }: SecondaryNavigationProps) => (
  <nav aria-label={`${primary.label} sections`} className="space-y-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-brand-500/75">
      {primary.label}
    </p>

    <ul className="space-y-2">
      {primary.secondary.map((item) => {
        const normalizedPath = pathname.replace(/\/+$/, '') || '/'
        const normalizedHref = item.href.replace(/\/+$/, '') || '/'
        const isActive = normalizedPath === normalizedHref

        return (
          <li key={item.id}>
            <Link
              href={item.href}
              onClick={() => {
                onNavigate?.()
              }}
              className={classNames(
                'group block rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-150 hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200/60',
                isActive ? 'border-brand-200/60 bg-white/15 shadow-sm' : 'text-white/80',
              )}
            >
              <span className="flex items-center justify-between">
                <span className="text-sm font-semibold text-brand-700/90 group-hover:text-brand-700">
                  {item.label}
                </span>
                <span
                  className={classNames(
                    'h-2 w-2 rounded-full transition-opacity',
                    isActive ? 'opacity-100 bg-white' : 'opacity-0 bg-white/80',
                  )}
                />
              </span>
              <span className="mt-1 block text-xs text-brand-700/50 group-hover:text-brand-700/70">
                {item.description}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  </nav>
)

export default SecondaryNavigation
