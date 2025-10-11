import type { PrimaryNavItem } from '../../types/sidebar'
import { classNames } from '../../utils/sidebar'

type PrimaryNavigationProps = {
  items: PrimaryNavItem[]
  activeId: string
  onSelect: (id: string) => void
}

const PrimaryNavigation = ({ items, activeId, onSelect }: PrimaryNavigationProps) => (
  <nav className="flex flex-col min-h-[75vh] items-center gap-3">
    {items.map((item) => {
      const Icon = item.icon
      const isActive = item.id === activeId

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
          onClick={() => onSelect(item.id)}
          aria-current={isActive ? 'page' : undefined}
          title={item.label}
        >
          <Icon className="h-5 w-5" />
        </button>
      )
    })}
  </nav>
)

export default PrimaryNavigation
