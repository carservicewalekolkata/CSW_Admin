'use client'

import { FiTrash2 } from 'react-icons/fi'

import type { ModelFormService } from '@/types/modelsPage'

type ModelServicesListProps = {
  services: ModelFormService[]
  fuelOptions: string[]
  onRemove: (index: number) => void
  onValueChange: (
    index: number,
    field: keyof Omit<ModelFormService, 'serviceId' | 'serviceName'>,
    value: string,
  ) => void
}

const ModelServicesList = ({ services, fuelOptions, onRemove, onValueChange }: ModelServicesListProps) => (
  <div className="rounded-lg border border-brand-100/80 bg-white">
    {services.length === 0 ? (
      <p className="px-4 py-3 text-sm text-brand-500">No services linked yet.</p>
    ) : (
      <div className="max-h-72 overflow-y-auto divide-y divide-brand-100/60">
        {services.map((service, index) => {
          const fuelOptionsWithValue = Array.from(
            new Set([...fuelOptions, service.fuelType].filter((value): value is string => Boolean(value))),
          )

          return (
            <div
              key={`${service.serviceId}-${service.fuelType}-${index}`}
              className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-7 md:items-center"
            >
              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-brand-700">{service.serviceName}</p>
                <p className="break-all text-xs text-brand-500">{service.serviceId}</p>
              </div>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                Fuel
                <select
                  value={service.fuelType}
                  onChange={(event) => onValueChange(index, 'fuelType', event.target.value)}
                  className="rounded-md border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-700 focus:border-brand-400 focus:outline-none focus:ring-0"
                >
                  <option value="">Select fuel</option>
                  {fuelOptionsWithValue.map((fuel) => (
                    <option key={`${fuel}-${index}`} value={fuel}>
                      {fuel}
                    </option>
                  ))}
                </select>
              </label>
              {(['discount', 'originalPrice', 'discountPrice'] as const).map((field) => (
                <input
                  key={field}
                  type="number"
                  value={service[field]}
                  onChange={(event) => onValueChange(index, field, event.target.value)}
                  className="rounded-md border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-700 placeholder:text-brand-400 focus:border-brand-400 focus:outline-none focus:ring-0"
                  placeholder={
                    field === 'discount' ? 'Discount %' : field === 'originalPrice' ? 'Original' : 'Discounted'
                  }
                />
              ))}
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-500 bg-rose-500 text-white transition hover:bg-rose-600"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${service.serviceName}`}
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    )}
  </div>
)

export default ModelServicesList
