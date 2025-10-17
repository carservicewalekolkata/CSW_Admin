'use client'

import { useMemo, useState, useCallback, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react'
import Image from 'next/image'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'

import Table, { type TableColumn } from '@/components/Table'
import type {
  Brand,
  BrandIconUploadResponse,
  BrandQuery,
  BrandSortStatus,
  BrandSortUpdated,
} from '@/types/brands'
import {
  useCreateBrandMutation,
  useDeleteBrandMutation,
  useFetchBrandsQuery,
  usePrefetchBrands,
  useUpdateBrandMutation,
} from '@/store/slices/brands/brandsSlice'
import { toast } from '@/lib/sonner'

type BrandFormValues = {
  name: string
  slug: string
  status: boolean
  icon: string
}

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

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const extractIconId = (icon: string | null) => {
  if (!icon) return ''
  const path = (icon.split('?')[0] ?? icon).trim()
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? ''
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    if ('data' in error) {
      const data = (error as { data?: unknown }).data
      if (data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string') {
        return (data as { message: string }).message
      }
    }

    if ('error' in error && typeof (error as { error?: unknown }).error === 'string') {
      return (error as { error: string }).error
    }
  }

  return fallback
}

const createEmptyFormValues = (): BrandFormValues => ({
  name: '',
  slug: '',
  status: true,
  icon: '',
})

const MAX_ICON_SIZE_BYTES = 1.5 * 1024 * 1024

const BrandsPageClient = () => {
  const [searchName, setSearchName] = useState('')
  const [slugFilter, setSlugFilter] = useState('')
  const [statusSort, setStatusSort] = useState<BrandSortStatus>('none')
  const [dateSort, setDateSort] = useState<BrandSortUpdated>('desc')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [formValues, setFormValues] = useState<BrandFormValues>(() => createEmptyFormValues())
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof BrandFormValues, string>>>({})
  const [slugDirty, setSlugDirty] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null)
  const [iconUploadError, setIconUploadError] = useState<string | null>(null)
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
  const [deleteBrand, { isLoading: isDeletingMutation }] = useDeleteBrandMutation()
  const [createBrand, { isLoading: isCreating }] = useCreateBrandMutation()
  const [updateBrand, { isLoading: isUpdating }] = useUpdateBrandMutation()
  const prefetchBrands = usePrefetchBrands()

  const items = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(startIndex + items.length - 1, total)

  const openCreateModal = useCallback(() => {
    setFormValues(createEmptyFormValues())
    setFormErrors({})
    setSlugDirty(false)
    setEditingBrand(null)
    setIconPreviewUrl(null)
    setIconUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setModalMode('create')
  }, [])

  const openEditModal = useCallback((brand: Brand) => {
    setFormValues({
      name: brand.name,
      slug: brand.slug,
      status: brand.status,
      icon: extractIconId(brand.icon),
    })
    setFormErrors({})
    setSlugDirty(true)
    setEditingBrand(brand)
    setIconPreviewUrl(brand.icon ?? null)
    setIconUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setModalMode('edit')
  }, [])

  const closeModal = useCallback(() => {
    setModalMode(null)
    setEditingBrand(null)
    setFormErrors({})
    setSlugDirty(false)
    setIconPreviewUrl(null)
    setIconUploadError(null)
    setIsUploadingIcon(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleNameChange = useCallback(
    (value: string) => {
      setFormValues((prev) => {
        const next = { ...prev, name: value }
        if (modalMode === 'create' && !slugDirty) {
          next.slug = slugify(value)
        }
        return next
      })
    },
    [modalMode, slugDirty],
  )

  const handleSlugChange = useCallback((value: string) => {
    setSlugDirty(true)
    setFormValues((prev) => ({ ...prev, slug: slugify(value) }))
  }, [])

  const handleStatusChange = useCallback((checked: boolean) => {
    setFormValues((prev) => ({ ...prev, status: checked }))
  }, [])

  const handleIconChange = useCallback((value: string) => {
    const trimmed = value.trim()
    setFormValues((prev) => ({ ...prev, icon: trimmed }))
    setIconUploadError(null)
    setFormErrors((prev) => {
      if (!prev.icon) return prev
      const next = { ...prev }
      delete next.icon
      return next
    })

    if (trimmed.length === 24) {
      setIconPreviewUrl(`/api/v1/cars/brands/icon/${trimmed}`)
    } else {
      setIconPreviewUrl(null)
    }
  }, [])

  const handleIconFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setIconUploadError(null)

      if (!file.type.startsWith('image/')) {
        const message = 'Icon must be an image file'
        setIconUploadError(message)
        toast.error(message)
        event.target.value = ''
        return
      }

      if (file.size > MAX_ICON_SIZE_BYTES) {
        const message = 'Icon must be 1.5 MB or smaller'
        setIconUploadError(message)
        toast.error(message)
        event.target.value = ''
        return
      }

      setIsUploadingIcon(true)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/v1/cars/brands/icon', {
          method: 'POST',
          body: formData,
        })

        const payload = (await response.json().catch(() => null)) as BrandIconUploadResponse | { message?: string } | null

        if (!response.ok || !payload || typeof payload !== 'object' || !('success' in payload) || !payload.success || typeof payload.iconId !== 'string') {
          const message =
            payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
              ? payload.message
              : 'Failed to upload icon'
          throw new Error(message)
        }

        setFormValues((prev) => ({ ...prev, icon: payload.iconId }))
        setFormErrors((prev) => {
          const next = { ...prev }
          delete next.icon
          return next
        })
        setIconPreviewUrl(payload.url ?? `/api/v1/cars/brands/icon/${payload.iconId}`)
        setIconUploadError(null)
        toast.success('Icon uploaded')
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : 'Failed to upload icon'
        setIconUploadError(message)
        toast.error(message)
      } finally {
        setIsUploadingIcon(false)
        event.target.value = ''
      }
    },
    [],
  )

  const handleRemoveIcon = useCallback(() => {
    setFormValues((prev) => ({ ...prev, icon: '' }))
    setIconPreviewUrl(null)
    setIconUploadError(null)
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next.icon
      return next
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const validateForm = () => {
    const errors: Partial<Record<keyof BrandFormValues, string>> = {}
    const trimmedName = formValues.name.trim()
    const sanitizedSlug = slugify(formValues.slug || trimmedName)
    const iconTrimmed = formValues.icon.trim()

    if (!trimmedName) {
      errors.name = 'Name is required'
    }

    if (!sanitizedSlug) {
      errors.slug = 'Slug is required'
    }

    if (iconTrimmed && iconTrimmed.length !== 24) {
      errors.icon = 'Icon must be a 24-character ObjectId'
    }

    setFormErrors(errors)

    return {
      isValid: Object.keys(errors).length === 0,
      trimmedName,
      sanitizedSlug,
      iconTrimmed,
    }
  }

  const submitCreate = async () => {
    const { isValid, trimmedName, sanitizedSlug, iconTrimmed } = validateForm()
    if (!isValid) return

    if (sanitizedSlug !== formValues.slug) {
      setFormValues((prev) => ({ ...prev, slug: sanitizedSlug }))
    }

    try {
      const response = await createBrand({
        name: trimmedName,
        slug: sanitizedSlug,
        status: formValues.status,
        icon: iconTrimmed ? iconTrimmed : undefined,
      }).unwrap()

      toast.success(`Created brand: ${response.data?.name ?? trimmedName}`)
      closeModal()
      setFormValues(createEmptyFormValues())
      if (page !== 1) {
        setPage(1)
      } else {
        await refetch()
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create brand'))
    }
  }

  const submitEdit = async () => {
    if (!editingBrand) return

    const { isValid, trimmedName, sanitizedSlug, iconTrimmed } = validateForm()
    if (!isValid) return

    if (sanitizedSlug !== formValues.slug) {
      setFormValues((prev) => ({ ...prev, slug: sanitizedSlug }))
    }

    const payload: {
      slug: string
      name?: string
      newSlug?: string
      status?: boolean
      icon?: string | null
      previousIconId?: string
    } = { slug: editingBrand.slug }

    let hasChanges = false

    if (trimmedName !== editingBrand.name) {
      payload.name = trimmedName
      hasChanges = true
    }

    if (sanitizedSlug !== editingBrand.slug) {
      payload.newSlug = sanitizedSlug
      hasChanges = true
    }

    if (formValues.status !== editingBrand.status) {
      payload.status = formValues.status
      hasChanges = true
    }

    const existingIconId = extractIconId(editingBrand.icon)
    if (iconTrimmed !== existingIconId) {
      payload.icon = iconTrimmed ? iconTrimmed : null
      if (existingIconId) {
        payload.previousIconId = existingIconId
      }
      hasChanges = true
    }

    if (!hasChanges) {
      toast.info('No changes to save')
      return
    }

    try {
      const response = await updateBrand(payload).unwrap()
      toast.success(`Updated brand: ${response.data?.name ?? trimmedName}`)
      closeModal()
      await refetch()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update brand'))
    }
  }

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isUploadingIcon) {
      toast.info('Please wait for the icon upload to finish.')
      return
    }
    if (modalMode === 'create') {
      void submitCreate()
    } else if (modalMode === 'edit') {
      void submitEdit()
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    setDeletingSlug(deleteTarget.slug)

    try {
      await deleteBrand(deleteTarget.slug).unwrap()
      toast.success(`Deleted brand: ${deleteTarget.name}`)
      const shouldMovePrev = items.length === 1 && safePage > 1
      setDeleteTarget(null)
      if (shouldMovePrev) {
        setPage((prev) => Math.max(1, prev - 1))
      } else {
        await refetch()
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete brand'))
    } finally {
      setDeletingSlug(null)
    }
  }

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
              row.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
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
            '—'
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
              onClick={() => openEditModal(row)}
              aria-label={`Edit ${row.name}`}
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-500 bg-rose-500 text-white transition hover:bg-rose-600"
              onClick={() => setDeleteTarget(row)}
              aria-label={`Delete ${row.name}`}
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ),
        className: 'w-32',
      },
    ],
    [openEditModal],
  )

  const isSubmitting = modalMode === 'create' ? isCreating : modalMode === 'edit' ? isUpdating : false
  const isDeleting = isDeletingMutation && deletingSlug !== null

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-brand-700">Car Brands</h1>
          <p className="text-sm text-brand-600/80">
            Review and manage car brands sourced from the GoMechanic integration.
            Create, update, or retire brands without leaving this dashboard.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          onClick={openCreateModal}
        >
          <FiPlus className="h-4 w-4" /> Add Brand
        </button>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {getErrorMessage(error, 'Failed to fetch brands')}
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

        {/* Pagination */}
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
        isLoading={isLoading || isFetching}
        getRowKey={(row) => row.slug}
        emptyMessage="No brands available. Run the seed script or try refreshing."
      />

      {/* Create / Edit modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-brand-700">
              {modalMode === 'create' ? 'Add Brand' : 'Edit Brand'}
            </h2>
            <p className="mt-2 text-sm text-brand-600/80">
              {modalMode === 'create'
                ? 'Provide a brand name and optional icon identifier. The slug is generated automatically.'
                : 'Update brand details or toggle its availability. Changes take effect immediately.'}
            </p>

            <form className="mt-4 space-y-4" onSubmit={handleFormSubmit}>
              <div>
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Name
                  <input
                    type="text"
                    value={formValues.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Brand name"
                    className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                  />
                </label>
                {formErrors.name ? (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.name}</p>
                ) : null}
              </div>

              <div>
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Slug
                  <input
                    type="text"
                    value={formValues.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="brand-slug"
                    className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <p className="mt-1 text-xs text-brand-500">
                  Only lowercase letters, numbers, and hyphens are allowed. We auto-sanitise it for you.
                </p>
                {formErrors.slug ? (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.slug}</p>
                ) : null}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-brand-100/80 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-brand-700">Status</p>
                  <p className="text-xs text-brand-500">Inactive brands remain hidden in downstream apps.</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-brand-600">
                  <input
                    type="checkbox"
                    checked={formValues.status}
                    onChange={(e) => handleStatusChange(e.target.checked)}
                    className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
                  />
                  Active
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-brand-100/80 bg-brand-50">
                    {iconPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={iconPreviewUrl} alt="Brand icon preview" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-xs font-medium text-brand-400">No icon</span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-brand-600">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-brand-400 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingIcon}
                      >
                        {isUploadingIcon ? 'Uploading…' : 'Upload Icon'}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-brand-200 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleRemoveIcon}
                        disabled={(!formValues.icon && !iconPreviewUrl) || isUploadingIcon}
                      >
                        Remove
                      </button>
                    </div>
                    <p className="text-xs text-brand-500">PNG, JPG, WebP, or SVG up to 1.5&nbsp;MB.</p>
                    {iconUploadError ? (
                      <p className="text-xs text-rose-600">{iconUploadError}</p>
                    ) : null}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleIconFileInputChange}
                />

                <div>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Icon ObjectId
                    <input
                      type="text"
                      value={formValues.icon}
                      onChange={(e) => handleIconChange(e.target.value)}
                      placeholder="Auto-filled after upload or paste an existing id"
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <p className="mt-1 text-xs text-brand-500">
                    Leave blank to omit an icon. Provide a 24-character GridFS id to reuse an existing asset.
                  </p>
                  {formErrors.icon ? (
                    <p className="mt-1 text-xs text-rose-600">{formErrors.icon}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeModal}
                  disabled={isSubmitting || isUploadingIcon}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting || isUploadingIcon}
                >
                  {isSubmitting
                    ? 'Saving…'
                    : isUploadingIcon
                    ? 'Uploading icon…'
                    : modalMode === 'create'
                    ? 'Create Brand'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-brand-700">Delete Brand</h2>
            <p className="mt-2 text-sm text-brand-600/80">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-brand-700">{deleteTarget.name}</span>? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex items-center justify-center rounded-md border border-rose-500 bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default BrandsPageClient
