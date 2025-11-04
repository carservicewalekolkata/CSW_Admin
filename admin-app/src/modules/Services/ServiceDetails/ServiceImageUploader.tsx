import Image from 'next/image'
import { forwardRef, type ChangeEvent } from 'react'

type ServiceImageUploaderProps = {
  previewUrl: string | null
  imagePath: string
  imageError: string | null
  isUploading: boolean
  onPickImage: () => void
  onRemoveImage: () => void
  onFileSelected: (event: ChangeEvent<HTMLInputElement>) => void
}

const ServiceImageUploader = forwardRef<HTMLInputElement, ServiceImageUploaderProps>(
  ({ previewUrl, imagePath, imageError, isUploading, onPickImage, onRemoveImage, onFileSelected }, ref) => (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 overflow-hidden rounded-xl bg-brand-50">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Service preview"
              width={96}
              height={96}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-brand-400">
              No Image
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-brand-400 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onPickImage}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading…' : 'Upload Image'}
            </button>
            <button
              type="button"
              className="rounded-md border border-brand-200 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onRemoveImage}
              disabled={(!imagePath && !previewUrl) || isUploading}
            >
              Remove
            </button>
          </div>
          <p className="text-xs text-brand-500">Uploaded to Azure Blob Storage. 4&nbsp;MB limit.</p>
          {imageError ? <p className="text-xs text-rose-600">{imageError}</p> : null}
        </div>
      </div>

      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={onFileSelected}
      />
    </div>
  ),
)

ServiceImageUploader.displayName = 'ServiceImageUploader'

export default ServiceImageUploader
