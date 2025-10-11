'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

import Table, { type TableColumn } from '@/components/Table'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchServiceCategories,
  initialServiceCategoriesState,
} from '@/store/slices/serviceCategories/serviceCategoriesSlice'
import {
  fetchServices,
  initialServiceDetailsState,
} from '@/store/slices/services/servicesSlice'
import type { Service, ServiceQuery } from '@/types/services'
import type { ServiceCategory } from '@/types/serviceCategories'

const formatDate = (value: string | null) => {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const formatDescription = (value: string | null, maxLength = 96) => {
  if (!value) {
    return '—'
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return '—'
  }

  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3)}...` : trimmed
}

const summarizeFeatures = (features: string[]) => {
  if (!Array.isArray(features) || features.length === 0) {
    return '—'
  }

  const preview = features.slice(0, 3)
  const remaining = features.length - preview.length
  return remaining > 0 ? `${preview.join(', ')} (+${remaining} more)` : preview.join(', ')
}

const resolvePreviewImage = (service: Service) => {
  if (service.thumbnail) {
    return service.thumbnail
  }

  if (Array.isArray(service.service_images) && service.service_images.length > 0) {
    return service.service_images[0]
  }

  return null
}

type StatusFilterOption = 'all' | 'active' | 'inactive'

const ServiceDetailsPageClient = () => {
  const dispatch = useAppDispatch()
  const servicesState = useAppSelector((state) => state.services ?? initialServiceDetailsState)
  const categoriesState = useAppSelector((state) => state.serviceCategories ?? initialServiceCategoriesState)

  const { items, status, error, total, lastQuery, page: serverPage, limit: serverLimit } = servicesState
  const categories: ServiceCategory[] = categoriesState.items ?? []
  const categoriesStatus = categoriesState.status ?? 'idle'

  const [searchTerm, setSearchTerm] = useState(lastQuery.search ?? '')
  const [categoryFilter, setCategoryFilter] = useState(lastQuery.category ?? '')
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>(lastQuery.status ?? 'all')
  const [dateSort, setDateSort] = useState(lastQuery.sortUpdated ?? 'desc')
  const [pageSize, setPageSize] = useState(lastQuery.limit ?? serverLimit ?? 10)
  const [page, setPage] = useState(lastQuery.page ?? serverPage ?? 1)

  const query = useMemo<ServiceQuery>(
    () => ({
      search: searchTerm || undefined,
      category: categoryFilter || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      sortUpdated: dateSort,
      page,
      limit: pageSize,
    }),
    [categoryFilter, dateSort, page, pageSize, searchTerm, statusFilter],
  )

  useEffect(() => {
    void dispatch(fetchServices(query))
  }, [dispatch, query])

  useEffect(() => {
    if (categoriesStatus === 'idle' && categories.length === 0) {
      void dispatch(
        fetchServiceCategories({
          limit: 100,
          sortUpdated: 'desc',
        }),
      )
    }
  }, [categories.length, categoriesStatus, dispatch])

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
      {
        key: 'description',
        label: 'Description',
        render: (row) => formatDescription(row.description),
        className: 'text-sm text-brand-600/80',
      },
      {
        key: 'features',
        label: 'Highlights',
        render: (row) => summarizeFeatures(row.features),
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
        className: 'w-28',
      },
      {
        key: 'updated_date',
        label: 'Updated',
        render: (row) => formatDate(row.updated_date),
        className: 'w-28',
      },
    ],
    [],
  )

  const isLoading = status === 'loading'
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage)
    }
  }, [page, safePage])

  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(startIndex + items.length - 1, total)

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-brand-700">Service Details</h1>
        <p className="text-sm text-brand-600/80">
          Browse the individual service packages sourced from the GoMechanic integration. Filter by category and status to find the right entry quickly.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-white/20 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Search
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setPage(1)
                setSearchTerm(event.target.value)
              }}
              placeholder="Filter by service name or description"
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm font-normal text-brand-800 placeholder:text-brand-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Category
            <select
              value={categoryFilter}
              onChange={(event) => {
                setPage(1)
                setCategoryFilter(event.target.value)
              }}
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm font-normal text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Status
            <select
              value={statusFilter}
              onChange={(event) => {
                const nextStatus = event.target.value as StatusFilterOption
                setPage(1)
                setStatusFilter(nextStatus)
              }}
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm font-normal text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
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
              onChange={(event) => {
                setPage(1)
                setDateSort(event.target.value as 'asc' | 'desc')
              }}
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm font-normal text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/40 pt-3 text-sm text-brand-700 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-wide text-brand-500">
            Showing {startIndex}-{endIndex} of {total} services
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
              Rows
              <select
                value={pageSize}
                onChange={(event) => {
                  const nextLimit = Number(event.target.value)
                  setPage(1)
                  setPageSize(nextLimit)
                }}
                className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm font-normal text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
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
        getRowKey={(row) => row.id}
        emptyMessage="No services found."
        isLoading={isLoading}
      />
    </section>
  )
}

export default ServiceDetailsPageClient
