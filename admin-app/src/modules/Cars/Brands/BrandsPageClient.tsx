'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Table, { type TableColumn } from '@/components/Table'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { deleteBrand, fetchBrands } from '@/store/slices/brands/brandsSlice'
import type { Brand } from '@/types/brands'
import Image from 'next/image'

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

const BrandsPageClient = () => {
  const dispatch = useAppDispatch()
  const { items, status, error } = useAppSelector((state) => state.brands)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchBrands())
    }
  }, [dispatch, status])

  const handleDelete = useCallback(
    async (slug: string, name: string) => {
      const confirmed = window.confirm(`Delete ${name}? This action cannot be undone.`)
      if (!confirmed) {
        return
      }

      setDeletingSlug(slug)
      try {
        await dispatch(deleteBrand(slug)).unwrap()
      } catch (deleteError) {
        console.error(deleteError)
        window.alert('Failed to delete brand. Please try again.')
      } finally {
        setDeletingSlug(null)
      }
    },
    [dispatch],
  )

  const columns: TableColumn<Brand>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Brand Name',
      },
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
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${row.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
          >
            {row.status ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        key: 'icon',
        label: 'Icon',
        render: (row) => {
          return (
            <>
              {row.icon ? (
                <Image
                  src={row.icon}
                  alt={row.name.charAt(0).toUpperCase() + row.name.slice(1).toLowerCase() + ' Icon'}
                  width={50}
                  height={50}
                  className='h-10 w-10 object-contain'
                />
              ) : '-'}
            </>
          )
        },
        className: 'text-xs text-brand-600/70',
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
        render: (row) => {
          const isDeleting = deletingSlug === row.slug

          return (
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-brand-400/80 px-3 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                onClick={() => {
                  // Edit functionality will be implemented later
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded-md border border-rose-500 bg-rose-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => {
                  void handleDelete(row.slug, row.name)
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )
        },
        className: 'w-40',
      },
    ],
    [deletingSlug, handleDelete],
  )

  const isLoading = status === 'loading' && deletingSlug === null

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-brand-700">Car Brands</h1>
        <p className="text-sm text-brand-600/80">
          Review brand records sourced from the GoMechanic integration script. Each record follows the schema validated in the ingestion script.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Table
        data={items}
        columns={columns}
        isLoading={isLoading}
        getRowKey={(row) => row.slug}
        emptyMessage="No brands available. Run the seed script or try refreshing."
      />
    </section>
  )
}

export default BrandsPageClient
