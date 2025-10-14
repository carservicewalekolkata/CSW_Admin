'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'

import Table, { type TableColumn } from '@/components/Table'
import type { Brand, BrandQuery, BrandSortStatus, BrandSortUpdated } from '@/types/brands'
import { useDeleteBrandMutation, useFetchBrandsQuery, usePrefetchBrands } from '@/store/slices/brands/brandsSlice'

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

const BrandsPageClient = () => {
  const [searchName, setSearchName] = useState('')
  const [slugFilter, setSlugFilter] = useState('')
  const [statusSort, setStatusSort] = useState<BrandSortStatus>('none')
  const [dateSort, setDateSort] = useState<BrandSortUpdated>('desc')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const query = useMemo<BrandQuery>(
    () => ({
      search: searchName || undefined,
      slug: slugFilter || undefined,
      sortStatus: statusSort,
      sortUpdated: dateSort,
      page,
      limit: pageSize,
    }),
    [searchName, slugFilter, statusSort, dateSort, page, pageSize],
  )

  const { data, error, isFetching, isLoading, refetch } = useFetchBrandsQuery(query)
  const [deleteBrand, { isLoading: isDeleting }] = useDeleteBrandMutation()
  const prefetchBrands = usePrefetchBrands()

  const items = data?.data ?? []
  const total = data?.total ?? 0

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(startIndex + items.length - 1, total)

  const handleDelete = useCallback(
    async (slug: string, name: string) => {
      if (!window.confirm(`Delete ${name}? This action cannot be undone.`)) return
      try {
        await deleteBrand(slug).unwrap()
        await refetch() 
      } catch {
        window.alert('Failed to delete brand. Please try again.')
      }
    },
    [deleteBrand, refetch],
  )

  useEffect(() => {
    if (!prefetchBrands) return
    const baseQuery = { ...query }

    if (safePage < totalPages) {
      prefetchBrands({ ...baseQuery, page: safePage + 1 }, { ifOlderThan: 30 })
    }
    if (safePage > 1) {
      prefetchBrands({ ...baseQuery, page: safePage - 1 }, { ifOlderThan: 30 })
    }
  }, [prefetchBrands, query, safePage, totalPages])

  const columns: TableColumn<Brand>[] = useMemo(
    () => [
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
              row.status
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {row.status ? 'Active' : 'Inactive'}
          </span>
        ),
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
            '-'
          ),
      },
      {
        key: 'created_date',
        label: 'Created',
        render: (row) => formatDate(row.created_date),
      },
      {
        key: 'updated_date',
        label: 'Last Updated',
        render: (row) => formatDate(row.updated_date),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => (
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
        ),
        className: 'w-40',
      },
    ],
    [handleDelete, isDeleting],
  )

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-brand-700">Car Brands</h1>
        <p className="text-sm text-brand-600/80">
          Review brand records sourced from the GoMechanic integration script. Each record follows the schema validated in the ingestion script.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {'data' in error ? (error.data as string) : 'Failed to fetch brands'}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-white/20 bg-white/60 p-4 shadow-sm backdrop-blur">
        {/* Filters */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Name
            <input
              type="search"
              value={searchName}
              onChange={(e) => {
                setPage(1)
                setSearchName(e.target.value)
              }}
              placeholder="Search by brand name"
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
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
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Status Order
            <select
              value={statusSort}
              onChange={(e) => {
                setPage(1)
                setStatusSort(e.target.value as BrandSortStatus)
              }}
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
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
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
        </div>

        {/* agination */}
        <div className="flex flex-col gap-3 border-t border-white/40 pt-3 text-sm text-brand-700 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-wide text-brand-500">
            Showing {startIndex}-{endIndex} of {total} brand{total === 1 ? '' : 's'}
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
                className="rounded-md border border-brand-100/80 bg-white px-2 py-1 text-sm"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-brand-200 px-3 py-1 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-brand-300"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>

              <span className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                className="rounded-md border border-brand-200 px-3 py-1 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-brand-300"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
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
        isLoading={isLoading || isFetching}
        getRowKey={(row) => row.slug}
        emptyMessage="No brands available. Run the seed script or try refreshing."
      />
    </section>
  )
}

export default BrandsPageClient
