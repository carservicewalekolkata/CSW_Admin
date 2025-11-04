'use client'

import { useRef, type ChangeEvent } from 'react'

import type { BrandFormModalState } from '@/types/brandsPage'

type BrandFormModalProps = {
  modal: BrandFormModalState
}

const BrandFormModal = ({ modal }: BrandFormModalProps) => {
  if (!modal.mode) return null

  const title = modal.mode === 'create' ? 'Add Brand' : 'Edit Brand'
  const subtitle =
    modal.mode === 'create'
      ? 'Provide a brand name and optional icon identifier. The slug is generated automatically.'
      : 'Update brand details or toggle its availability. Changes take effect immediately.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-brand-700">{title}</h2>
        <p className="mt-2 text-sm text-brand-600/80">{subtitle}</p>

        <form className="mt-4 space-y-4" onSubmit={modal.onSubmit}>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Name
            <input
              type="text"
              value={modal.values.name}
              onChange={(event) => modal.onNameChange(event.target.value)}
              placeholder="Brand name"
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
            />
          </label>
          {modal.errors.name ? <p className="text-xs text-rose-600">{modal.errors.name}</p> : null}

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Slug
            <input
              type="text"
              value={modal.values.slug}
              onChange={(event) => modal.onSlugChange(event.target.value)}
              placeholder="brand-slug"
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
            />
          </label>
          <p className="text-xs text-brand-500">Lowercase letters, numbers, and hyphens. We auto-sanitise it for you.</p>
          {modal.errors.slug ? <p className="text-xs text-rose-600">{modal.errors.slug}</p> : null}

          <label className="inline-flex items-center gap-2 text-sm font-medium text-brand-600">
            <input
              type="checkbox"
              checked={modal.values.status}
              onChange={(event) => modal.onStatusChange(event.target.checked)}
              className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
            />
            Active
          </label>

          <BrandIconUploader modal={modal} />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={modal.close}
              disabled={modal.isSubmitting || modal.isUploadingIcon}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={modal.isSubmitting || modal.isUploadingIcon}
            >
              {modal.isSubmitting
                ? 'Saving…'
                : modal.isUploadingIcon
                ? 'Uploading…'
                : modal.mode === 'create'
                ? 'Create Brand'
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type BrandIconUploaderProps = {
  modal: BrandFormModalState
}

const BrandIconUploader = ({ modal }: BrandIconUploaderProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      void modal.onIconFileSelected(file)
    }
    event.target.value = ''
  }

  return (
    <div className="space-y-3 rounded-lg border border-brand-100/80 p-3">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-brand-100/80 bg-brand-50">
          {modal.iconPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={modal.iconPreviewUrl} alt="Brand icon preview" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs font-medium text-brand-400">No icon</span>
          )}
        </div>
        <div className="space-y-2 text-sm text-brand-600">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-brand-400 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => inputRef.current?.click()}
              disabled={modal.isUploadingIcon}
            >
              {modal.isUploadingIcon ? 'Uploading…' : 'Upload Icon'}
            </button>
            <button
              type="button"
              className="rounded-md border border-brand-200 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={modal.onRemoveIcon}
              disabled={(!modal.values.icon && !modal.iconPreviewUrl) || modal.isUploadingIcon}
            >
              Remove
            </button>
          </div>
          <p className="text-xs text-brand-500">PNG, JPG, WebP, or SVG up to 1.5&nbsp;MB.</p>
          {modal.iconUploadError ? <p className="text-xs text-rose-600">{modal.iconUploadError}</p> : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />

      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
        Icon ObjectId
        <input
          type="text"
          value={modal.values.icon}
          onChange={(event) => modal.onIconChange(event.target.value)}
          placeholder="Auto-filled after upload or paste an existing id"
          className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
        />
      </label>
      <p className="text-xs text-brand-500">
        Leave blank to omit an icon. Provide a 24-character GridFS id to reuse an existing asset.
      </p>
      {modal.errors.icon ? <p className="text-xs text-rose-600">{modal.errors.icon}</p> : null}
    </div>
  )
}

export default BrandFormModal
