'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Table, { type TableColumn } from '@/components/Table'

import { useFetchServicesQuery } from '@/store/slices/services/servicesSlice'
import { useFetchServiceCategoriesQuery } from '@/store/slices/serviceCategories/serviceCategoriesSlice'
import type { Service, ServiceQuery } from '@/types/services'
import type { ServiceCategory } from '@/types/serviceCategories'

const formatDate = (value: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date)
}

const formatDescription = (value: string | null, maxLength = 96) => {
  if (!value) return '—'
  const trimmed = value.trim()
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3)}...` : trimmed
}

const summarizeFeatures = (features: string[]) => {
  if (!Array.isArray(features) || features.length === 0) return '—'
  const preview = features.slice(0, 3)
  const remaining = features.length - preview.length
  return remaining > 0 ? `${preview.join(', ')} (+${remaining} more)` : preview.join(', ')
}

const resolvePreviewImage = (service: Service) => {
  if (service.thumbnail) return service.thumbnail
  if (Array.isArray(service.service_images) && service.service_images.length > 0) {
    return service.service_images[0]
  }
  return null
}

type StatusFilterOption = 'all' | 'active' | 'inactive'

const ServiceDetailsPageClient = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all')
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const query = useMemo<ServiceQuery>(
    () => ({
      search: searchTerm || undefined,
      category: categoryFilter || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      sortUpdated: dateSort,
      page,
      limit: pageSize,
    }),
    [searchTerm, categoryFilter, statusFilter, dateSort, page, pageSize],
  )

  const {
    data: servicesResponse,
    isLoading,
    error,
  } = useFetchServicesQuery(query)

  const { data: categoriesResponse } = useFetchServiceCategoriesQuery({
    limit: 100,
    sortUpdated: 'desc',
  })

  const items = servicesResponse?.data ?? []
  const total = servicesResponse?.total ?? 0
  const categories: ServiceCategory[] = categoriesResponse?.data ?? []

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(startIndex + items.length - 1, total)

  const columns: TableColumn<Service>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Service',
        render: (row) => {
          const previewImage = resolvePreviewImage(row)
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
      { key: 'description', label: 'Description', render: (r) => formatDescription(r.description), className: 'text-sm text-brand-600/80' },
      { key: 'features', label: 'Highlights', render: (r) => summarizeFeatures(r.features), className: 'text-xs text-brand-600/80' },
      { key: 'time_taken', label: 'Time Taken', render: (r) => r.time_taken ?? '—', className: 'w-32' },
      { key: 'warranty', label: 'Warranty', render: (r) => r.warranty ?? '—', className: 'w-32' },
      {
        key: 'status',
        label: 'Status',
        render: (r) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
              r.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {r.status ? 'Active' : 'Inactive'}
          </span>
        ),
        className: 'w-28',
      },
      { key: 'updated_date', label: 'Updated', render: (r) => formatDate(r.updated_date), className: 'w-28' },
    ],
    [],
  )

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-brand-700">Service Details</h1>
        <p className="text-sm text-brand-600/80">
          Browse the individual service packages from GoMechanic. Filter by category and status to find the right entries quickly.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {(() => {
            if ('data' in error && typeof error.data === 'object') {
              const msg = (error.data as { message?: string })?.message
              return msg ?? 'Failed to load services.'
            }
            if ('error' in error && typeof error.error === 'string') return error.error
            return 'An unknown error occurred.'
          })()}
        </div>
      )}

      <div className="grid gap-4 rounded-xl border border-white/20 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Search
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => {
                setPage(1)
                setSearchTerm(e.target.value)
              }}
              placeholder="Filter by name or description"
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 placeholder:text-brand-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Category
            <select
              value={categoryFilter}
              onChange={(e) => {
                setPage(1)
                setCategoryFilter(e.target.value)
              }}
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Status
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1)
                setStatusFilter(e.target.value as StatusFilterOption)
              }}
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Updated
            <select
              value={dateSort}
              onChange={(e) => {
                setPage(1)
                setDateSort(e.target.value as 'asc' | 'desc')
              }}
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-white/40 pt-3 text-sm text-brand-700 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-wide text-brand-500">
            Showing {startIndex}-{endIndex} of {total} services
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
              Rows
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1)
                  setPageSize(Number(e.target.value))
                }}
                className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {[10, 20, 50].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setPage(Math.max(1, safePage - 1))}
                disabled={safePage <= 1 || isLoading}
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-brand-500">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage >= totalPages || isLoading}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <Table
        data={items}
        columns={columns}
        isLoading={isLoading}
        getRowKey={(row) => row.id}
        emptyMessage="No services found."
      />
    </section>
  )
}

export default ServiceDetailsPageClient
