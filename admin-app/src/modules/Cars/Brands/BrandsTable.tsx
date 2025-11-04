import { useMemo } from 'react'
import Image from 'next/image'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'

import Table, { type TableColumn } from '@/components/Table'
import type { Brand } from '@/types/brands'
import { formatBrandDate } from '@/utils/brands'

type BrandsTableProps = {
  items: Brand[]
  isLoading: boolean
  onEdit: (brand: Brand) => void
  onDelete: (brand: Brand) => void
}

const BrandsTable = ({ items, isLoading, onEdit, onDelete }: BrandsTableProps) => {
  const columns = useMemo<TableColumn<Brand>[]>(() => {
    const base: TableColumn<Brand>[] = [
      { key: 'name', label: 'Brand Name' },
      {
        key: 'slug',
        label: 'Slug',
        className: 'text-xs text-brand-600/70',
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
              row.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {row.status ? 'Active' : 'Inactive'}
          </span>
        ),
        className: 'w-24',
      },
      {
        key: 'icon',
        label: 'Icon',
        render: (row) =>
          row.icon ? (
            <Image
              src={row.icon}
              alt={`${row.name} icon`}
              width={50}
              height={50}
              className="h-10 w-10 object-contain"
              unoptimized
            />
          ) : (
            '—'
          ),
      },
      { key: 'created_date', label: 'Created', render: (row) => formatBrandDate(row.created_date) },
      { key: 'updated_date', label: 'Last Updated', render: (row) => formatBrandDate(row.updated_date) },
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
        className: 'w-32',
      },
    ]
    return base
  }, [onDelete, onEdit])

  return (
    <Table
      data={items}
      columns={columns}
      isLoading={isLoading}
      getRowKey={(row) => row.slug}
      emptyMessage="No brands found. Adjust your filters or try again later."
    />
  )
}

export default BrandsTable
