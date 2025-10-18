'use client'

import { FiPlus } from 'react-icons/fi'

import type { ModelFormModalState } from '@/types/modelsPage'

type ModelServicePickerProps = {
  modal: ModelFormModalState
  isFetching: boolean
}

const ModelServicePicker = ({ modal, isFetching }: ModelServicePickerProps) => (
  <div className="space-y-3 rounded-lg border border-brand-100/80 bg-white p-3">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
      <label className="md:col-span-2 flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
        Category
        <select
          value={modal.servicePicker.categoryId}
          onChange={(event) => void modal.onServiceCategoryChange(event.target.value)}
          className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
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
          className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select service</option>
          {modal.serviceOptions.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
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
            className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
          />
        </label>
      ))}
    </div>

    <div className="flex items-center justify-between">
      <p className="text-xs text-brand-500">
        Link services to the model and adjust their pricing for this context.
      </p>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-brand-500 bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={modal.onAddService}
        disabled={isFetching}
      >
        <FiPlus className="h-4 w-4" /> Add
      </button>
    </div>
    {modal.servicePickerError ? <p className="text-xs text-rose-600">{modal.servicePickerError}</p> : null}
  </div>
)

export default ModelServicePicker
