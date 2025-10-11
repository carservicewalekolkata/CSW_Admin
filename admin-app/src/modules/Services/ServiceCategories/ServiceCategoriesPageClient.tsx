'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'

import Table, { type TableColumn } from '@/components/Table'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchServiceCategories,
  initialServiceCategoriesState,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
} from '@/store/slices/serviceCategories/serviceCategoriesSlice'
import type { ServiceCategory, ServiceCategoryQuery } from '@/types/serviceCategories'
import { toast } from '@/lib/sonner'

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

const ServiceCategoriesPageClient = () => {
  const dispatch = useAppDispatch()
  const state = useAppSelector((root) => root.serviceCategories ?? initialServiceCategoriesState)
  const { items, status, error, total, lastQuery, page: serverPage, limit: serverLimit } = state

  const [searchTerm, setSearchTerm] = useState(lastQuery.search ?? '')
  const [dateSort, setDateSort] = useState(lastQuery.sortUpdated ?? 'desc')
  const [pageSize, setPageSize] = useState(lastQuery.limit ?? serverLimit ?? 10)
  const [page, setPage] = useState(lastQuery.page ?? serverPage ?? 1)
  const [deleteTarget, setDeleteTarget] = useState<ServiceCategory | null>(null)
  const [formState, setFormState] = useState<{ mode: 'create' | 'edit'; id?: number; name: string } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const query = useMemo<ServiceCategoryQuery>(
    () => ({
      search: searchTerm || undefined,
      sortUpdated: dateSort,
      page,
      limit: pageSize,
    }),
    [dateSort, page, pageSize, searchTerm],
  )

  useEffect(() => {
    void dispatch(fetchServiceCategories(query))
  }, [dispatch, query])

  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteServiceCategory(id)).unwrap()
      void dispatch(fetchServiceCategories({ ...query, page: 1 }))
      setPage(1)
      toast.success('Service category deleted successfully')
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete service category'
      toast.error(message)
    }
  }

  const columns: TableColumn<ServiceCategory>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Category Name',
      },
      {
        key: 'created_date',
        label: 'Created',
        render: (row) => formatDate(row.created_date),
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
          return (
            <div className="flex gap-2">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-brand-300 bg-white text-brand-600 transition hover:bg-brand-50"
                onClick={() => {
                  setFormError(null)
                  setFormState({ mode: 'edit', id: row.id, name: row.name })
                }}
                aria-label={`Edit ${row.name}`}
              >
                <FiEdit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-500 bg-rose-500 text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => setDeleteTarget(row)}
                aria-label={`Delete ${row.name}`}
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </div>
          )
        },
        className: 'w-24',
      },
    ],
    [],
  )

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage)
    }
  }, [safePage, page])

  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(startIndex + items.length - 1, total)

  const isLoading = status === 'loading'

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-brand-700">Service Categories</h1>
        <p className="text-sm text-brand-600/80">
          Manage the service categories synced from the GoMechanic integration. These categories power the downstream service discovery experience.
        </p>
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          onClick={() => {
            setFormError(null)
            setFormState({ mode: 'create', name: '' })
          }}
        >
          <FiPlus className="h-4 w-4" /> Add Category
        </button>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-white/20 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
            Search
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setPage(1)
                setSearchTerm(event.target.value)
              }}
              placeholder="Filter by category name"
              className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm font-normal text-brand-800 placeholder:text-brand-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
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
            Showing {startIndex}-{endIndex} of {total} categories
          </p>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
              Rows per page
              <select
                value={pageSize}
                onChange={(event) => {
                  setPage(1)
                  setPageSize(Number(event.target.value))
                }}
                className="rounded-md border border-brand-100/80 bg-white px-2 py-1 text-sm font-normal text-brand-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
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
                className="rounded-md border border-brand-200 px-3 py-1 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-brand-300 disabled:hover:bg-transparent"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
              >
                Previous
              </button>

              <span className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                className="rounded-md border border-brand-200 px-3 py-1 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-brand-300 disabled:hover:bg-transparent"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
        getRowKey={(row) => row.id}
        emptyMessage="No service categories found. Run the seed script or adjust your filters."
      />

      {formState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-brand-700">
              {formState.mode === 'create' ? 'Add Service Category' : 'Edit Service Category'}
            </h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                const formData = new FormData(event.currentTarget)
                const name = (formData.get('name') as string | null)?.trim() ?? ''
                if (!name) {
                  setFormError('Name is required')
                  return
                }

                try {
                  if (formState.mode === 'create') {
                    await dispatch(createServiceCategory(name)).unwrap()
                    setPage(1)
                    void dispatch(fetchServiceCategories({ ...query, page: 1 }))
                    toast.success('Service category created')
                  } else if (formState.id != null) {
                    await dispatch(updateServiceCategory({ id: formState.id, name })).unwrap()
                    toast.success('Service category updated')
                  }
                  setFormState(null)
                  setFormError(null)
                } catch (submitError) {
                  const message = submitError instanceof Error ? submitError.message : 'Unable to save category'
                  setFormError(message)
                  toast.error(message)
                }
              }}
            >
              <label className="flex flex-col gap-1 text-sm font-semibold text-brand-600">
                Name
                <input
                  name="name"
                  defaultValue={formState.name}
                  placeholder="Enter category name"
                  className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm font-normal text-brand-800 placeholder:text-brand-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  autoFocus
                />
              </label>

              {formError ? (
                <p className="text-sm text-rose-600">{formError}</p>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                  onClick={() => {
                    setFormState(null)
                    setFormError(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                  {formState.mode === 'create' ? 'Create' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-brand-700">Delete Service Category</h2>
            <p className="mt-2 text-sm text-brand-600/80">
              Are you sure you want to delete <span className="font-semibold text-brand-700">{deleteTarget.name}</span>? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md border border-rose-500 bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
                onClick={() => {
                  void handleDelete(deleteTarget.id)
                  setDeleteTarget(null)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ServiceCategoriesPageClient
