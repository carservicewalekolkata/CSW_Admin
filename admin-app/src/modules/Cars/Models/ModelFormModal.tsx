'use client'

import type { ModelFormModalState } from '@/types/modelsPage'
import ModelAssetUploadField from './ModelAssetUploadField'
import ModelFuelTypesField from './ModelFuelTypesField'
import ModelServicePicker from './ModelServicePicker'
import ModelServicesList from './ModelServicesList'

type ModelFormModalProps = {
  modal: ModelFormModalState
}

const ModelFormModal = ({ modal }: ModelFormModalProps) => {
  if (!modal.mode) return null

  const title = modal.mode === 'create' ? 'Add Model' : 'Edit Model'
  const subtitle =
    modal.mode === 'create'
      ? 'Create a new car model, assign a brand, and connect relevant services.'
      : 'Update the model details or linked services. Changes take effect immediately.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-brand-700">{title}</h2>
        <p className="mt-2 text-sm text-brand-600/80">{subtitle}</p>

        <form className="mt-4 max-h-[75vh] space-y-5 overflow-y-auto pr-2" onSubmit={modal.onSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
              Name
              <input
                type="text"
                value={modal.values.name}
                onChange={(event) => modal.onNameChange(event.target.value)}
                placeholder="Model name"
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
                placeholder="model-slug"
                className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
              />
            </label>
            {modal.errors.slug ? <p className="text-xs text-rose-600">{modal.errors.slug}</p> : null}

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
              Brand
              <select
                value={modal.values.brandSlug}
                onChange={(event) => modal.onBrandChange(event.target.value)}
                className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select a brand</option>
                {modal.brandOptions.map((brand) => (
                  <option key={brand.slug} value={brand.slug}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
            {modal.errors.brandSlug ? <p className="text-xs text-rose-600">{modal.errors.brandSlug}</p> : null}

            <label className="flex items-center justify-between rounded-lg border border-brand-100/80 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-brand-700">Status</p>
                <p className="text-xs text-brand-500">Inactive models remain hidden in downstream experiences.</p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-600">
                <input
                  type="checkbox"
                  checked={modal.values.status}
                  onChange={(event) => modal.onStatusChange(event.target.checked)}
                  className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
                />
                Active
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ModelAssetUploadField
              label="Icon ObjectId"
              previewLabel="icon"
              previewClassName="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-brand-100/80 bg-brand-50"
              previewUrl={modal.iconPreviewUrl}
              description="PNG, JPG, WebP, or SVG up to 1.5&nbsp;MB."
              value={modal.values.iconId}
              onChange={modal.onIconIdChange}
              onRemove={modal.onRemoveIcon}
              onFileSelected={modal.onIconFileSelected}
              isUploading={modal.isUploadingIcon}
              error={modal.iconUploadError}
              buttonLabel="Upload Icon"
            />

            <ModelAssetUploadField
              label="Image Path"
              previewLabel="image"
              previewClassName="flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg border border-brand-100/80 bg-brand-50"
              previewUrl={modal.imagePreviewUrl}
              description="Uploaded to Azure Blob Storage. 4&nbsp;MB limit."
              value={modal.values.imagePath}
              onChange={modal.onImagePathChange}
              onRemove={modal.onRemoveImage}
              onFileSelected={modal.onImageFileSelected}
              isUploading={modal.isUploadingImage}
              error={modal.imageUploadError}
              buttonLabel="Upload Image"
            />
          </div>

          <ModelFuelTypesField
            fuels={modal.values.fuelTypes}
            onAdd={modal.onAddFuelType}
            onRemove={modal.onRemoveFuelType}
          />

          <ModelServicePicker modal={modal} isFetching={modal.isFetchingServices} />
          <ModelServicesList
            services={modal.values.services}
            fuelOptions={modal.fuelOptions}
            onRemove={modal.onRemoveService}
            onValueChange={modal.onServiceValueChange}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={modal.close}
              disabled={modal.isSubmitting || modal.isUploadingIcon || modal.isUploadingImage}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={modal.isSubmitting || modal.isUploadingIcon || modal.isUploadingImage}
            >
              {modal.isSubmitting
                ? 'Saving…'
                : modal.isUploadingIcon || modal.isUploadingImage
                ? 'Uploading…'
                : modal.mode === 'create'
                ? 'Create Model'
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModelFormModal
