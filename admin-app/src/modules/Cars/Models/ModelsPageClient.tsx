'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'

import Table, { type TableColumn } from '@/components/Table'
import type { BrandSortStatus, BrandSortUpdated, Model, ModelQuery } from '@/types/models'
import { useFetchModelsQuery, useDeleteModelMutation, usePrefetchModels } from '@/store/slices/models/modelsSlice'
import { useFetchBrandsQuery } from '@/store/slices/brands/brandsSlice'

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

const ModelsPageClient = () => {
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)
  const [searchName, setSearchName] = useState('')
  const [slugFilter, setSlugFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [statusSort, setStatusSort] = useState<BrandSortStatus>('none')
  const [dateSort, setDateSort] = useState<BrandSortUpdated>('desc')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [servicesPreview, setServicesPreview] = useState<Model | null>(null)

  const query = useMemo<ModelQuery>(
    () => ({
      search: searchName || undefined,
      slug: slugFilter || undefined,
      brand: brandFilter || undefined,
      sortStatus: statusSort,
      sortUpdated: dateSort,
      page,
      limit: pageSize,
    }),
    [searchName, slugFilter, brandFilter, statusSort, dateSort, page, pageSize],
  )

  const { data: modelsResponse, error, isLoading } = useFetchModelsQuery(query)
  const { data: brandsResponse } = useFetchBrandsQuery({ limit: 100, sortStatus: 'none', sortUpdated: 'desc' })
  const [deleteModel] = useDeleteModelMutation()
  const prefetchModels = usePrefetchModels()

  const items = modelsResponse?.data ?? []
  const total = modelsResponse?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  const handleDelete = useCallback(
    async (slug: string, name: string) => {
      const confirmed = window.confirm(`Delete ${name}? This action cannot be undone.`)
      if (!confirmed) return

      setDeletingSlug(slug)
      try {
        await deleteModel(slug).unwrap()
      } catch (deleteError) {
        console.error(deleteError)
        window.alert('Failed to delete model. Please try again.')
      } finally {
        setDeletingSlug(null)
      }
    },
    [deleteModel],
  )

  const columns: TableColumn<Model>[] = useMemo(
    () => [
      { key: 'name', label: 'Model' },
      {
        key: 'brand_name',
        label: 'Brand',
        className: 'text-sm text-brand-600/80',
      },
      {
        key: 'image',
        label: 'Image',
        render: (row) =>
          row.image ? (
            <Image
              src={row.image}
              alt={`${row.name} image`}
              width={72}
              height={48}
              className="h-12 w-18 rounded-lg object-cover"
              unoptimized
            />
          ) : row.thumbnail ? (
            <Image
              src={row.thumbnail}
              alt={`${row.name} thumbnail`}
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg object-cover"
              unoptimized
            />
          ) : (
            '—'
          ),
        className: 'text-xs text-brand-600/70',
      },
      {
        key: 'slug',
        label: 'Slug',
        render: (row) => row.slug,
        className: 'text-xs text-brand-600/70',
      },
      {
        key: 'services',
        label: 'Services',
        render: (row) => (
          <button
            type="button"
            className="rounded-full border border-brand-300 px-3 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
            onClick={() => setServicesPreview(row)}
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
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${row.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
          >
            {row.status ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        key: 'updated_date',
        label: 'Updated',
        render: (row) => formatDate(row.updated_date),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => {
          const isDeleting = deletingSlug === row.slug
          return (
            <div className="flex gap-2">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-brand-300 bg-white text-brand-600 transition hover:bg-brand-50"
                aria-label={`Edit ${row.name}`}
              >
                <FiEdit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-500 bg-rose-500 text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => void handleDelete(row.slug, row.name)}
                disabled={isDeleting}
                aria-label={`Delete ${row.name}`}
              >
                {isDeleting ? (
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
    ],
    [deletingSlug, handleDelete],
  )

  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(startIndex + items.length - 1, total)
  const brandOptions =
    brandsResponse?.data?.map((b) => b.name).sort((a, b) => a.localeCompare(b)) ?? []

  useEffect(() => {
    if (!prefetchModels) return
    const baseQuery = { ...query }

    if (safePage < totalPages) {
      prefetchModels({ ...baseQuery, page: safePage + 1 }, { ifOlderThan: 30 })
    }
    if (safePage > 1) {
      prefetchModels({ ...baseQuery, page: safePage - 1 }, { ifOlderThan: 30 })
    }
  }, [prefetchModels, query, safePage, totalPages])

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-brand-700">Car Models</h1>
        <p className="text-sm text-brand-600/80">
          Browse car models sourced from the GoMechanic integration. Thumbnails stream from GridFS while hero images use the cached public assets.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {(() => {
            if ('data' in error && error.data && typeof error.data === 'object') {
              const dataObj = error.data as { message?: string }
              return dataObj.message ?? 'Request failed'
            }
            if ('error' in error && typeof error.error === 'string') {
              return error.error
            }
            return 'An unexpected error occurred.'
          })()}
        </div>
      )}

      {/* Filters (search, brand, sort, etc.) */}
      <div className="grid gap-4 rounded-xl border border-white/20 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Name
            <input
              type="search"
              value={searchName}
              onChange={(e) => {
                setPage(1)
                setSearchName(e.target.value)
              }}
              placeholder="Search by model name"
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm font-normal text-brand-800 placeholder:text-brand-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Slug
            <input
              type="search"
              value={slugFilter}
              onChange={(e) => {
                setPage(1)
                setSlugFilter(e.target.value)
              }}
              placeholder="Filter by slug"
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm font-normal text-brand-800 placeholder:text-brand-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Brand
            <select
              value={brandFilter}
              onChange={(e) => {
                setPage(1)
                setBrandFilter(e.target.value)
              }}
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm font-normal text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="">All brands</option>
              {brandOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Status Order
            <select
              value={statusSort}
              onChange={(e) => {
                setPage(1)
                setStatusSort(e.target.value as BrandSortStatus)
              }}
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm font-normal text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="none">No sorting</option>
              <option value="active-first">Active first</option>
              <option value="inactive-first">Inactive first</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Updated
            <select
              value={dateSort}
              onChange={(e) => {
                setPage(1)
                setDateSort(e.target.value as BrandSortUpdated)
              }}
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm font-normal text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
        </div>

        {/* Pagination controls */}
        <div className="flex flex-col gap-3 border-t border-white/40 pt-3 text-sm text-brand-700 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-wide text-brand-500">
            Showing {startIndex}-{endIndex} of {total} model{total === 1 ? '' : 's'}
          </p>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
              Rows per page
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1)
                  setPageSize(Number(e.target.value))
                }}
                className="rounded-md border border-brand-100/80 bg-white px-2 py-1 text-sm text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {[10, 25, 50].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-brand-200 px-3 py-1 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-brand-300"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                Previous
              </button>

              <span className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                className="rounded-md border border-brand-200 px-3 py-1 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-brand-300"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
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
        getRowKey={(row) => row.slug}
        emptyMessage="No models available. Run the seed script or adjust your filters."
      />

      {servicesPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <header className="space-y-1">
              <h2 className="text-xl font-semibold text-brand-700">{servicesPreview.name}</h2>
              <p className="text-sm text-brand-600/80">
                {servicesPreview.services.length > 0
                  ? 'Connected services with pricing details.'
                  : 'No services linked to this model.'}
              </p>
            </header>

            {servicesPreview.services.length > 0 ? (
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm text-brand-700">
                {servicesPreview.services.map((service) => (
                  <li
                    key={service.services_id}
                    className="flex items-center justify-between rounded-lg border border-brand-100/70 bg-brand-50/40 px-3 py-2"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                        Service ID
                      </p>
                      <p className="font-medium text-brand-700">{service.services_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                        Original / Discounted
                      </p>
                      <p className="font-medium text-brand-700">
                        INR {service.original_price.toLocaleString('en-IN')} / INR{' '}
                        {service.discount_price.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                onClick={() => setServicesPreview(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default ModelsPageClient
