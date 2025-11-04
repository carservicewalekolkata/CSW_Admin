import { useMemo } from 'react'
import Image from 'next/image'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'

import Table, { type TableColumn } from '@/components/Table'
import type { Model } from '@/types/models'
import { formatModelDate } from '@/utils/models'

type ModelsTableProps = {
  items: Model[]
  isLoading: boolean
  deletingSlug: string | null
  onEdit: (model: Model) => void
  onDelete: (model: Model) => void
  onPreviewServices: (model: Model) => void
  onManageFuels: (model: Model) => void
}

const ModelsTable = ({
  items,
  isLoading,
  deletingSlug,
  onEdit,
  onDelete,
  onPreviewServices,
  onManageFuels,
}: ModelsTableProps) => {
  const columns = useMemo<TableColumn<Model>[]>(() => {
    const base: TableColumn<Model>[] = [
      { key: 'name', label: 'Model' },
      { key: 'brand_name', label: 'Brand', className: 'text-sm text-brand-600/80' },
      {
        key: 'image',
        label: 'Image',
        render: (row) => {
          if (row.image) {
            return (
              <Image
                src={row.image}
                alt={`${row.name} image`}
                width={72}
                height={48}
                className="h-12 w-18 rounded-lg object-cover"
                unoptimized
              />
            )
          }
          if (row.thumbnail) {
            return (
              <Image
                src={row.thumbnail}
                alt={`${row.name} icon`}
                width={48}
                height={48}
                className="h-12 w-12 rounded-lg object-cover"
                unoptimized
              />
            )
          }
          return '—'
        },
        className: 'text-xs text-brand-600/70',
      },
      {
        key: 'fuel_type',
        label: 'Fuels',
        render: (row) => (
          <button
            type="button"
            className="text-xs font-semibold text-brand-600 underline underline-offset-2 transition hover:text-brand-700"
            onClick={() => onManageFuels(row)}
          >
            {row.fuel_type.length > 0 ? `${row.fuel_type.length} configured` : 'Add fuels'}
          </button>
        ),
        className: 'w-32 text-brand-600',
      },
      { key: 'slug', label: 'Slug', className: 'text-xs text-brand-600/70' },
      {
        key: 'services',
        label: 'Services',
        render: (row) => (
          <button
            type="button"
            className="rounded-full border border-brand-300 px-3 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
            onClick={() => onPreviewServices(row)}
          >
            View ({row.services.length})
          </button>
        ),
        className: 'w-32',
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${row.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
          >
            {row.status ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        key: 'updated_date',
        label: 'Updated',
        render: (row) => formatModelDate(row.updated_date),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => {
          const isDeletingRow = deletingSlug === row.slug
          return (
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
                className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-500 bg-rose-500 text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => onDelete(row)}
                disabled={isDeletingRow}
                aria-label={`Delete ${row.name}`}
              >
                {isDeletingRow ? (
                  <span className="h-4 w-4 animate-ping rounded-full bg-white/70" />
                ) : (
                  <FiTrash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          )
        },
        className: 'w-40',
      },
    ]
    return base
  }, [deletingSlug, onDelete, onEdit, onPreviewServices, onManageFuels])

  return (
    <Table
      data={items}
      columns={columns}
      isLoading={isLoading}
      getRowKey={(row) => row.id}
      emptyMessage="No car models found. Adjust your filters."
    />
  )
}

export default ModelsTable
