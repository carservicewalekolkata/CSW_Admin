'use client'

import { FiTrash2 } from 'react-icons/fi'

import type { ModelFormService } from '@/types/modelsPage'

type ModelServicesListProps = {
  services: ModelFormService[]
  onRemove: (id: string) => void
  onValueChange: (id: string, field: keyof Omit<ModelFormService, 'serviceId' | 'serviceName'>, value: string) => void
}

const ModelServicesList = ({ services, onRemove, onValueChange }: ModelServicesListProps) => (
  <div className="rounded-lg border border-brand-100/80 bg-white">
    {services.length === 0 ? (
      <p className="px-4 py-3 text-sm text-brand-500">No services linked yet.</p>
    ) : (
      <div className="max-h-72 overflow-y-auto divide-y divide-brand-100/60">
        {services.map((service) => (
          <div key={service.serviceId} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-6 md:items-center">
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-brand-700">{service.serviceName}</p>
              <p className="break-all text-xs text-brand-500">{service.serviceId}</p>
            </div>
            {(['discount', 'originalPrice', 'discountPrice'] as const).map((field) => (
              <input
                key={field}
                type="number"
                value={service[field]}
                onChange={(event) => onValueChange(service.serviceId, field, event.target.value)}
                className="rounded-md border border-brand-100/80 px-3 py-2 text-sm"
                placeholder={field === 'discount' ? 'Discount %' : field === 'originalPrice' ? 'Original' : 'Discounted'}
              />
            ))}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-500 bg-rose-500 text-white transition hover:bg-rose-600"
              onClick={() => onRemove(service.serviceId)}
              aria-label={`Remove ${service.serviceName}`}
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)

export default ModelServicesList
