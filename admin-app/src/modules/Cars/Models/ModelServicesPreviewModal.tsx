'use client'

import type { ModelServicesPreviewState } from '@/types/modelsPage'

type ModelServicesPreviewModalProps = {
  preview: ModelServicesPreviewState
}

const formatFuelLabel = (value: string | null) => {
  if (!value) return 'All fuels'
  const trimmed = value.trim()
  if (!trimmed) return 'All fuels'
  return trimmed.slice(0, 1).toUpperCase() + trimmed.slice(1)
}

const ModelServicesPreviewModal = ({ preview }: ModelServicesPreviewModalProps) => {
  if (!preview.model) return null

  const { model } = preview

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-brand-700">{model.name}</h2>
          <p className="text-sm text-brand-600/80">
            {model.services.length > 0
              ? 'Connected services with pricing details.'
              : 'No services linked to this model.'}
          </p>
        </header>

        {model.services.length > 0 ? (
          <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto text-sm text-brand-700">
            {model.services.map((service) => (
              <li
                key={service.services_id}
                className="rounded-lg border border-brand-100/70 bg-brand-50/40 px-4 py-3"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_140px_200px] sm:items-center">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-brand-700">{service.name ?? 'Unnamed service'}</p>
                    <p className="text-xs text-brand-500">Time taken: {service.time_taken ?? '—'}</p>
                  </div>
                  <div className="text-left sm:text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Fuel</p>
                    <p className="text-sm font-medium text-brand-700">{formatFuelLabel(service.fuel_type)}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                      Original / Discounted
                    </p>
                    <p className="font-medium text-brand-700">
                      INR {service.original_price.toLocaleString('en-IN')} / INR{' '}
                      {service.discount_price.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
            onClick={preview.close}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModelServicesPreviewModal
