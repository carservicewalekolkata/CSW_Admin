'use client'

import { FiPlus } from 'react-icons/fi'

import useModelsPage from '@/hooks/useModelsPage'
import ModelsFilters from './ModelsFilters'
import ModelsTable from './ModelsTable'
import ModelFormModal from './ModelFormModal'
import ModelDeleteModal from './ModelDeleteModal'
import ModelServicesPreviewModal from './ModelServicesPreviewModal'
import ModelFuelModal from './ModelFuelModal'

const ModelsPageClient = () => {
  const { items, isTableLoading, bannerError, filters, formModal, deleteModal, servicesPreview, fuelModal } =
    useModelsPage()

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-brand-700">Car Models</h1>
          <p className="text-sm text-brand-600/80">
            Manage car models, update their assets, and link them with relevant services for downstream experiences.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          onClick={formModal.openCreate}
        >
          <FiPlus className="h-4 w-4" /> Add Model
        </button>
      </header>

      {bannerError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {bannerError}
        </div>
      )}

      <ModelsFilters filters={filters} />

      <ModelsTable
        items={items}
        isLoading={isTableLoading}
        deletingSlug={deleteModal.isDeleting && deleteModal.target ? deleteModal.target.slug : null}
        onEdit={formModal.openEdit}
        onDelete={deleteModal.request}
        onPreviewServices={servicesPreview.open}
        onManageFuels={fuelModal.open}
      />

      <ModelFormModal modal={formModal} />
      <ModelDeleteModal modal={deleteModal} />
      <ModelServicesPreviewModal preview={servicesPreview} />
      <ModelFuelModal modal={fuelModal} />
    </section>
  )
}

export default ModelsPageClient
