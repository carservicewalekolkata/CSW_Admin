'use client'

import { FiPlus } from 'react-icons/fi'

import useServiceDetailsPage from '@/hooks/useServiceDetailsPage'
import ServiceDetailsFilters from './ServiceDetailsFilters'
import ServiceDetailsTable from './ServiceDetailsTable'
import ServiceDetailsFormModal from './ServiceDetailsFormModal'
import ServiceDetailsDeleteModal from './ServiceDetailsDeleteModal'

const ServiceDetailsPageClient = () => {
  const { items, isTableLoading, bannerError, filters, formModal, deleteModal } =
    useServiceDetailsPage()

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-brand-700">Service Details</h1>
          <p className="text-sm text-brand-600/80">
            Manage individual service packages. Update their content or publish/unpublish them as
            needed.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          onClick={formModal.openCreate}
        >
          <FiPlus className="h-4 w-4" /> Add Service
        </button>
      </header>

      {bannerError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {bannerError}
        </div>
      )}

      <ServiceDetailsFilters filters={filters} />

      <ServiceDetailsTable
        items={items}
        isLoading={isTableLoading}
        onEdit={formModal.openEdit}
        onDelete={deleteModal.request}
      />

      <ServiceDetailsFormModal modal={formModal} />
      <ServiceDetailsDeleteModal modal={deleteModal} />
    </section>
  )
}

export default ServiceDetailsPageClient
