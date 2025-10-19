'use client'

import type { FC } from 'react'

import type { SeedVendorDefinition, SeedVendorId } from '@/types/seed'

interface VendorGridProps {
  vendors: SeedVendorDefinition[]
  activeVendorId: SeedVendorId
  onSelect: (vendorId: SeedVendorId) => void
}

const VendorGrid: FC<VendorGridProps> = ({ vendors, activeVendorId, onSelect }) => {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {vendors.map((vendor) => {
        const isActive = vendor.id === activeVendorId
        const isDisabled = vendor.status !== 'ready'
        const gradient = vendor.accentColor
        const cardClasses = [
          'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-brand-100/70 bg-white/95 p-6 shadow-card transition duration-200',
          isActive
            ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-white'
            : 'hover:-translate-y-1 hover:shadow-xl',
          isDisabled ? 'opacity-60 grayscale' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <button
            key={vendor.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(vendor.id)}
            className={cardClasses}
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient} opacity-80`} />
            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-50/80 px-3 py-1">
                  <span className="text-base font-semibold text-brand-800">{vendor.name}</span>
                  {vendor.helperText && (
                    <span className="rounded-pill bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                      {vendor.helperText}
                    </span>
                  )}
                </div>
                {vendor.description && (
                  <p className="mt-3 max-w-sm text-sm text-muted-500">{vendor.description}</p>
                )}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50/80">
                <span
                  aria-hidden
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-sm font-semibold text-white shadow-lg`}
                >
                  {vendor.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-left">
              {vendor.highlights.map((highlight) => (
                <div key={highlight.id} className="rounded-2xl border border-brand-100/60 bg-brand-50/40 px-4 py-3">
                  <dt className="text-sm font-semibold text-brand-700">{highlight.label}</dt>
                  {highlight.helper && (
                    <dd className="text-xs text-muted-500">{highlight.helper}</dd>
                  )}
                </div>
              ))}
            </dl>

            {vendor.status !== 'ready' && (
              <div className="mt-6 rounded-2xl border border-dashed border-brand-200/60 bg-brand-50/70 p-4 text-left">
                <p className="text-sm font-semibold text-brand-700">Coming soon</p>
                {vendor.comingSoonEta && (
                  <p className="text-xs text-muted-500">{vendor.comingSoonEta}</p>
                )}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default VendorGrid
