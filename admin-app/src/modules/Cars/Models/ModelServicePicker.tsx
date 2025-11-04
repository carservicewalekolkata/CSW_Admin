'use client'

import { FiPlus } from 'react-icons/fi'

import type { ModelFormModalState } from '@/types/modelsPage'

type ModelServicePickerProps = {
  modal: ModelFormModalState
  isFetching: boolean
}

const ModelServicePicker = ({ modal, isFetching }: ModelServicePickerProps) => (
  <div className="space-y-3 rounded-lg border border-brand-100/80 bg-white p-3">
    {!modal.fuelOptions.length && (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        Add at least one fuel type to link services.
      </p>
    )}
    <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
      <label className="md:col-span-2 flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
        Category
        <select
          value={modal.servicePicker.categoryId}
          onChange={(event) => void modal.onServiceCategoryChange(event.target.value)}
          className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-700 focus:border-brand-400 focus:outline-none focus:ring-0"
        >
          <option value="">Select category</option>
          {modal.categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="md:col-span-2 flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
        Service
        <select
          value={modal.servicePicker.serviceId}
          onChange={(event) => modal.onServiceChange(event.target.value)}
          className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-700 focus:border-brand-400 focus:outline-none focus:ring-0"
        >
          <option value="">Select service</option>
          {modal.serviceOptions.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
        Fuel
        <select
          value={modal.servicePicker.fuelType}
          onChange={(event) => modal.onServiceFieldChange('fuelType', event.target.value)}
          className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-700 focus:border-brand-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:bg-brand-50"
          disabled={modal.fuelOptions.length === 0}
        >
          <option value="">Select fuel type</option>
          {modal.fuelOptions.map((fuel) => (
            <option key={fuel} value={fuel}>
              {fuel}
            </option>
          ))}
        </select>
      </label>

      {(['discount', 'originalPrice', 'discountPrice'] as const).map((field) => (
        <label
          key={field}
          className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600"
        >
          {field === 'discount'
            ? 'Discount %'
            : field === 'originalPrice'
              ? 'Original'
              : 'Discounted'}
          <input
            type="number"
            value={modal.servicePicker[field]}
            onChange={(event) => modal.onServiceFieldChange(field, event.target.value)}
            className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-700 placeholder:text-brand-400 focus:border-brand-400 focus:outline-none focus:ring-0"
          />
        </label>
      ))}
    </div>

    <div className="flex items-center justify-between">
      <p className="text-xs text-brand-500">
        Select a category, service, and fuel type, then tailor the pricing for that combo.
      </p>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-brand-500 bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={modal.onAddService}
        disabled={isFetching || modal.fuelOptions.length === 0}
      >
        <FiPlus className="h-4 w-4" /> Add
      </button>
    </div>
    {modal.servicePickerError ? <p className="text-xs text-rose-600">{modal.servicePickerError}</p> : null}
  </div>
)

export default ModelServicePicker
