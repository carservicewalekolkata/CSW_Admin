'use client'

import { FiPlus } from 'react-icons/fi'

import useBrandsPage from '@/hooks/useBrandsPage'
import BrandsFilters from './BrandsFilters'
import BrandsTable from './BrandsTable'
import BrandFormModal from './BrandFormModal'
import BrandDeleteModal from './BrandDeleteModal'

const BrandsPageClient = () => {
  const { items, isTableLoading, bannerError, filters, formModal, deleteModal } = useBrandsPage()
  console.log(items)

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-brand-700">Car Brands</h1>
          <p className="text-sm text-brand-600/80">
            Review and manage car brands. Create, update, or retire brands without leaving this dashboard.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          onClick={formModal.openCreate}
        >
          <FiPlus className="h-4 w-4" /> Add Brand
        </button>
      </header>

      {bannerError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {bannerError}
        </div>
      )}

      <BrandsFilters filters={filters} />

      <BrandsTable items={items} isLoading={isTableLoading} onEdit={formModal.openEdit} onDelete={deleteModal.request} />

      <BrandFormModal modal={formModal} />
      <BrandDeleteModal modal={deleteModal} />
    </section>
  )
}

export default BrandsPageClient
