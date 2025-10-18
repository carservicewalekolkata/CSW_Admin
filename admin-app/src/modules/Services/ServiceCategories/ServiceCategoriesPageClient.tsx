'use client'

import { FiPlus } from 'react-icons/fi'
import { toast } from '@/lib/sonner'

import useServiceCategoriesPage from '@/hooks/useServiceCategoriesPage'
import ServiceCategoriesFilters from './ServiceCategoriesFilters'
import ServiceCategoriesTable from './ServiceCategoriesTable'
import CreateServiceCategoryModal from './CreateServiceCategoryModal'
import DeleteServiceCategoryModal from './DeleteServiceCategoryModal'

const ServiceCategoriesPageClient = () => {
  const { items, isTableLoading, bannerError, filters, createModal, deleteModal } =
    useServiceCategoriesPage()

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-brand-700">Service Categories</h1>
        <p className="text-sm text-brand-600/80">
          Manage the service categories synced from GoMechanic. These categories power the downstream
          service discovery experience.
        </p>
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          onClick={createModal.open}
        >
          <FiPlus className="h-4 w-4" /> Add Category
        </button>
      </header>

      {bannerError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {bannerError}
        </div>
      )}

      <ServiceCategoriesFilters filters={filters} />

      <ServiceCategoriesTable
        items={items}
        isLoading={isTableLoading}
        onEdit={(category) => toast.info(`Edit modal for ${category.name} coming soon.`)}
        onDelete={deleteModal.request}
      />

      <CreateServiceCategoryModal modal={createModal} />
      <DeleteServiceCategoryModal modal={deleteModal} />
    </section>
  )
}

export default ServiceCategoriesPageClient
