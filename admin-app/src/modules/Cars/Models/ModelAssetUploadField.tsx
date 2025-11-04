'use client'

import { useRef, type ChangeEvent } from 'react'

type ModelAssetUploadFieldProps = {
  label: string
  previewLabel: string
  previewClassName: string
  previewUrl: string | null
  description: string
  value: string
  onChange: (value: string) => void
  onRemove: () => void
  onFileSelected: (file: File) => void
  isUploading: boolean
  error: string | null
  buttonLabel: string
}

const ModelAssetUploadField = ({
  label,
  previewLabel,
  previewClassName,
  previewUrl,
  description,
  value,
  onChange,
  onRemove,
  onFileSelected,
  isUploading,
  error,
  buttonLabel,
}: ModelAssetUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      void onFileSelected(file)
    }
    event.target.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className={previewClassName}>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={previewLabel} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-medium text-brand-400">No {previewLabel}</span>
          )}
        </div>
        <div className="space-y-2 text-sm text-brand-600">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-brand-400 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading…' : buttonLabel}
            </button>
            <button
              type="button"
              className="rounded-md border border-brand-200 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onRemove}
              disabled={(!value && !previewUrl) || isUploading}
            >
              Remove
            </button>
          </div>
          <p className="text-xs text-brand-500" dangerouslySetInnerHTML={{ __html: description }} />
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFile}
      />

      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
        {label}
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
        />
      </label>
    </div>
  )
}

export default ModelAssetUploadField
