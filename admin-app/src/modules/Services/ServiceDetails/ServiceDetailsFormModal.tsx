'use client'

import { useMemo, useRef, type ChangeEvent } from 'react'

import type { ServiceFormModalState } from '@/types/serviceDetailsPage'
import ServiceImageUploader from './ServiceImageUploader'

type ServiceDetailsFormModalProps = {
  modal: ServiceFormModalState
}

const textFields: Array<{
  key: keyof ServiceFormModalState['values']
  label: string
  placeholder: string
}> = [
  { key: 'name', label: 'Name', placeholder: 'Service name' },
  { key: 'timeTaken', label: 'Time Taken', placeholder: 'e.g. 2 hours' },
  { key: 'warranty', label: 'Warranty', placeholder: 'Optional' },
]

const textareaFields: Array<{
  key: keyof ServiceFormModalState['values']
  label: string
  placeholder: string
}> = [
  { key: 'description', label: 'Description', placeholder: 'Short description' },
  { key: 'featuresText', label: 'Highlights', placeholder: 'Enter one highlight per line' },
]

const ServiceDetailsFormModal = ({ modal }: ServiceDetailsFormModalProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const textInputs = useMemo(
    () =>
      textFields.map((field) => (
        <div key={field.key}>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            {field.label}
            <input
              type="text"
              value={modal.values[field.key]}
              onChange={(event) => modal.onFieldChange(field.key, event.target.value)}
              placeholder={field.placeholder}
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
            />
          </label>
          {modal.errors[field.key] ? (
            <p className="mt-1 text-xs text-rose-600">{modal.errors[field.key]}</p>
          ) : null}
        </div>
      )),
    [modal],
  )

  if (!modal.mode) return null

  const title = modal.mode === 'create' ? 'Add Service' : 'Edit Service'
  const subtitle =
    modal.mode === 'create'
      ? 'Define a new service, link it to a category, and add supporting details.'
      : 'Update the service details, assets, or status. Changes apply immediately.'

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      void modal.onUploadImage(file)
    }
    event.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-brand-700">{title}</h2>
        <p className="mt-2 text-sm text-brand-600/80">{subtitle}</p>

        <form className="mt-4 max-h-[75vh] space-y-5 overflow-y-auto pr-2" onSubmit={modal.onSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {textInputs}

            <div>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                Category
                <select
                  value={modal.values.categoryId}
                  onChange={(event) => modal.onFieldChange('categoryId', event.target.value)}
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
              {modal.errors.categoryId ? (
                <p className="mt-1 text-xs text-rose-600">{modal.errors.categoryId}</p>
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
              <input
                type="checkbox"
                checked={modal.values.status}
                onChange={(event) => modal.onFieldChange('status', event.target.checked)}
                className="h-4 w-4 rounded border-brand-300 text-brand-500 focus:ring-brand-400"
              />
              Active
            </label>

            {textareaFields.map((field) => (
              <div key={field.key} className="md:col-span-2">
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {field.label}
                  <textarea
                    value={modal.values[field.key]}
                    onChange={(event) => modal.onFieldChange(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>
            ))}

            <div className="md:col-span-2 space-y-3">
              <ServiceImageUploader
                ref={fileInputRef}
                previewUrl={modal.imagePreviewUrl}
                imagePath={modal.values.imagePath}
                imageError={modal.imageUploadError}
                isUploading={modal.isUploadingImage}
                onPickImage={() => fileInputRef.current?.click()}
                onRemoveImage={modal.onRemoveImage}
                onFileSelected={handleFileSelected}
              />

              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                Image Path
                <input
                  type="text"
                  value={modal.values.imagePath}
                  onChange={(event) => modal.onFieldChange('imagePath', event.target.value)}
                  placeholder="assets/services/..."
                  className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                />
              </label>
              {modal.errors.imagePath ? (
                <p className="text-xs text-rose-600">{modal.errors.imagePath}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={modal.close}
              disabled={modal.isSubmitting || modal.isUploadingImage}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={modal.isSubmitting || modal.isUploadingImage}
            >
              {modal.isSubmitting
                ? 'Saving…'
                : modal.isUploadingImage
                ? 'Uploading image…'
                : modal.mode === 'create'
                ? 'Create Service'
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ServiceDetailsFormModal
