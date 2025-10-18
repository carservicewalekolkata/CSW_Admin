import { useMemo } from 'react'
import Image from 'next/image'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'

import Table, { type TableColumn } from '@/components/Table'
import type { Service } from '@/types/services'
import {
  formatServiceDate,
  formatServiceDescription,
  resolveServicePreviewImage,
  summarizeServiceFeatures,
} from '@/utils/serviceDetails'

type ServiceDetailsTableProps = {
  items: Service[]
  isLoading: boolean
  onEdit: (service: Service) => void
  onDelete: (service: Service) => void
}

const ServiceDetailsTable = ({ items, isLoading, onEdit, onDelete }: ServiceDetailsTableProps) => {
  const columns = useMemo<TableColumn<Service>[]>(() => {
    const base: TableColumn<Service>[] = [
      {
        key: 'name',
        label: 'Service',
        render: (row) => {
          const previewImage = resolveServicePreviewImage(row)
          return (
            <div className="flex items-center gap-3">
              {previewImage ? (
                <Image
                  src={previewImage}
                  alt={`${row.name} preview`}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-xl object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-xs font-semibold uppercase text-brand-400">
                  No Image
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold text-brand-700">{row.name}</p>
                <p className="text-xs text-brand-500">{row.category_name}</p>
              </div>
            </div>
          )
        },
        className: 'min-w-[220px]',
      },
      {
        key: 'description',
        label: 'Description',
        render: (row) => formatServiceDescription(row.description),
        className: 'text-sm text-brand-600/80',
      },
      {
        key: 'features',
        label: 'Highlights',
        render: (row) => summarizeServiceFeatures(row.features),
        className: 'text-xs text-brand-600/80',
      },
      {
        key: 'time_taken',
        label: 'Time Taken',
        render: (row) => row.time_taken ?? '—',
        className: 'w-32',
      },
      {
        key: 'warranty',
        label: 'Warranty',
        render: (row) => row.warranty ?? '—',
        className: 'w-32',
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
        key: 'updated_date',
        label: 'Updated',
        render: (row) => formatServiceDate(row.updated_date),
        className: 'w-28',
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-2">
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
  }, [onEdit, onDelete])

  return (
    <Table
      data={items}
      columns={columns}
      isLoading={isLoading}
      getRowKey={(row) => row.id}
      emptyMessage="No services found. Try adjusting your filters."
    />
  )
}

export default ServiceDetailsTable
