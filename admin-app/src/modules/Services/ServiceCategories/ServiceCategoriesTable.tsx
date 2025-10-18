import { useMemo } from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'

import Table, { type TableColumn } from '@/components/Table'
import type { ServiceCategory } from '@/types/serviceCategories'
import { formatServiceCategoryDate } from '@/utils/serviceCategories'

type ServiceCategoriesTableProps = {
  items: ServiceCategory[]
  isLoading: boolean
  onEdit: (category: ServiceCategory) => void
  onDelete: (category: ServiceCategory) => void
}

const ServiceCategoriesTable = ({ items, isLoading, onEdit, onDelete }: ServiceCategoriesTableProps) => {
  const columns = useMemo<TableColumn<ServiceCategory>[]>(() => {
    const base: TableColumn<ServiceCategory>[] = [
      { key: 'name', label: 'Category Name' },
      { key: 'created_date', label: 'Created', render: (row) => formatServiceCategoryDate(row.created_date) },
      { key: 'updated_date', label: 'Updated', render: (row) => formatServiceCategoryDate(row.updated_date) },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => (
          <div className="flex gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-brand-300 bg-white text-brand-600 transition hover:bg-brand-50"
              onClick={() => onEdit(row)}
              aria-label={`Edit ${row.name}`}
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-500 bg-rose-500 text-white transition hover:bg-rose-600"
              onClick={() => onDelete(row)}
              aria-label={`Delete ${row.name}`}
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ),
        className: 'w-24',
      },
    ]
    return base
  }, [onEdit, onDelete])

  return (
    <Table
      data={items}
      columns={columns}
      isLoading={isLoading}
      getRowKey={(row) => row.id}
      emptyMessage="No service categories found. Run the seed script or adjust your filters."
    />
  )
}

export default ServiceCategoriesTable
