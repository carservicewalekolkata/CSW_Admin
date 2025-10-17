'use client'

import { useMemo, useState, useCallback, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react'
import Image from 'next/image'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'

import Table, { type TableColumn } from '@/components/Table'
import { toast } from '@/lib/sonner'
import {
  useCreateServiceMutation,
  useDeleteServiceMutation,
  useFetchServicesQuery,
  usePrefetchServices,
  useUpdateServiceMutation,
} from '@/store/slices/services/servicesSlice'
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
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3)}…` : trimmed
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

const extractRelativeImagePath = (service: Service) => {
  const source = service.thumbnail ?? service.service_images?.[0] ?? ''
  if (!source) return ''
  return source.replace(/^\/+/, '')
}

const parseFeaturesText = (value: string) =>
  value
    .split(/\r?\n/)
    .flatMap((line) => line.split(','))
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

type StatusFilterOption = 'all' | 'active' | 'inactive'

type ServiceFormValues = {
  name: string
  categoryId: string
  status: boolean
  description: string
  featuresText: string
  timeTaken: string
  warranty: string
  imagePath: string
}

const createEmptyFormValues = (categoryId = ''): ServiceFormValues => ({
  name: '',
  categoryId,
  status: true,
  description: '',
  featuresText: '',
  timeTaken: '',
  warranty: '',
  imagePath: '',
})

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024

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
  const prefetchServices = usePrefetchServices()

  const { data: categoriesResponse } = useFetchServiceCategoriesQuery({
    limit: 200,
    sortUpdated: 'desc',
  })

  const [createService, { isLoading: isCreating }] = useCreateServiceMutation()
  const [updateService, { isLoading: isUpdating }] = useUpdateServiceMutation()
  const [deleteService] = useDeleteServiceMutation()

  const items = servicesResponse?.data ?? []
  const total = servicesResponse?.total ?? 0
  const categories = useMemo<ServiceCategory[]>(() => categoriesResponse?.data ?? [], [categoriesResponse])

  const categoryOptions = useMemo(
    () =>
      categories
        .map((category) => ({ id: category.id.toString(), name: category.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  )

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(startIndex + items.length - 1, total)

  useEffect(() => {
    if (!prefetchServices) return
    const baseQuery = { ...query }

    if (safePage < totalPages) {
      prefetchServices({ ...baseQuery, page: safePage + 1 }, { ifOlderThan: 30 })
    }
    if (safePage > 1) {
      prefetchServices({ ...baseQuery, page: safePage - 1 }, { ifOlderThan: 30 })
    }
  }, [prefetchServices, query, safePage, totalPages])

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [formValues, setFormValues] = useState<ServiceFormValues>(() => createEmptyFormValues())
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ServiceFormValues, string>>>({})
  const [editingService, setEditingService] = useState<Service | null>(null)

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const imageFileInputRef = useRef<HTMLInputElement | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  const resetImageState = useCallback(() => {
    setImagePreviewUrl(null)
    setImageUploadError(null)
    setIsUploadingImage(false)
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = ''
    }
  }, [])

  const openCreateModal = useCallback(() => {
    const defaultCategoryId = categoryOptions[0]?.id ?? ''
    setFormValues(createEmptyFormValues(defaultCategoryId))
    setFormErrors({})
    setEditingService(null)
    resetImageState()
    setModalMode('create')
  }, [categoryOptions, resetImageState])

  const openEditModal = useCallback(
    (service: Service) => {
      setEditingService(service)
      setFormValues({
        name: service.name,
        categoryId: service.category_id.toString(),
        status: service.status,
        description: service.description ?? '',
        featuresText: service.features.join('\n'),
        timeTaken: service.time_taken ?? '',
        warranty: service.warranty ?? '',
        imagePath: extractRelativeImagePath(service),
      })
      setFormErrors({})
      setImagePreviewUrl(resolvePreviewImage(service))
      setImageUploadError(null)
      setIsUploadingImage(false)
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = ''
      }
      setModalMode('edit')
    },
    [],
  )

  const closeModal = useCallback(() => {
    setModalMode(null)
    setEditingService(null)
    setFormErrors({})
    resetImageState()
  }, [resetImageState])

  const handleFieldChange = useCallback(<K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
    setFormErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const handleImageFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setImageUploadError(null)

      if (!file.type.startsWith('image/')) {
        const message = 'Image must be an image file'
        setImageUploadError(message)
        toast.error(message)
        event.target.value = ''
        return
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        const message = 'Image must be 4 MB or smaller'
        setImageUploadError(message)
        toast.error(message)
        event.target.value = ''
        return
      }

      setIsUploadingImage(true)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/v1/services/details/image', {
          method: 'POST',
          body: formData,
        })

        const payload = (await response.json().catch(() => null)) as
          | { success: boolean; path: string; url: string; message?: string }
          | { message?: string }
          | null

        if (!response.ok || !payload || typeof payload !== 'object' || !('success' in payload) || !payload.success) {
          const message =
            payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
              ? payload.message
              : 'Failed to upload image'
          throw new Error(message)
        }

        handleFieldChange('imagePath', payload.path)
        setImagePreviewUrl(payload.url ?? `/${payload.path}`)
        toast.success('Image uploaded')
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : 'Failed to upload image'
        setImageUploadError(message)
        toast.error(message)
      } finally {
        setIsUploadingImage(false)
        event.target.value = ''
      }
    },
    [handleFieldChange],
  )

  const handleRemoveImage = useCallback(() => {
    handleFieldChange('imagePath', '')
    setImagePreviewUrl(null)
    setImageUploadError(null)
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = ''
    }
  }, [handleFieldChange])

  const validateForm = () => {
    const errors: Partial<Record<keyof ServiceFormValues, string>> = {}
    const trimmedName = formValues.name.trim()
    if (!trimmedName) errors.name = 'Name is required'

    if (!formValues.categoryId) errors.categoryId = 'Category is required'

    if (formValues.imagePath && formValues.imagePath.includes('..')) {
      errors.imagePath = 'Invalid image path'
    }

    setFormErrors(errors)

    return {
      isValid: Object.keys(errors).length === 0,
      trimmedName,
    }
  }

  const submitCreate = async () => {
    const { isValid, trimmedName } = validateForm()
    if (!isValid) return

    const categoryId = Number(formValues.categoryId)
    if (!Number.isFinite(categoryId)) {
      setFormErrors((prev) => ({ ...prev, categoryId: 'Category is required' }))
      return
    }

    try {
      const response = await createService({
        name: trimmedName,
        categoryId,
        status: formValues.status,
        description: formValues.description.trim() || null,
        features: parseFeaturesText(formValues.featuresText),
        timeTaken: formValues.timeTaken.trim() || null,
        warranty: formValues.warranty.trim() || null,
        imagePath: formValues.imagePath.trim() || undefined,
      }).unwrap()

      toast.success(`Created service: ${response.data?.name ?? trimmedName}`)
      closeModal()
      if (page !== 1) {
        setPage(1)
      }
    } catch (err) {
      toast.error(
        err && typeof err === 'object' && 'data' in err && typeof (err as { data?: { message?: string } }).data?.message === 'string'
          ? ((err as { data: { message: string } }).data.message)
          : 'Failed to create service',
      )
    }
  }

  const submitEdit = async () => {
    if (!editingService) return

    const { isValid, trimmedName } = validateForm()
    if (!isValid) return

    const payload: {
      id: string
      name?: string
      categoryId?: number
      status?: boolean
      description?: string | null
      features?: string[]
      timeTaken?: string | null
      warranty?: string | null
      imagePath?: string | null
      previousImagePath?: string
    } = { id: editingService.id }

    let hasChanges = false

    if (trimmedName !== editingService.name) {
      payload.name = trimmedName
      hasChanges = true
    }

    if (formValues.categoryId) {
      const categoryId = Number(formValues.categoryId)
      if (Number.isFinite(categoryId) && categoryId !== editingService.category_id) {
        payload.categoryId = categoryId
        hasChanges = true
      }
    }

    if (formValues.status !== editingService.status) {
      payload.status = formValues.status
      hasChanges = true
    }

    const normalizedDescription = formValues.description.trim() || null
    if (normalizedDescription !== (editingService.description ?? null)) {
      payload.description = normalizedDescription
      hasChanges = true
    }

    const newFeatures = parseFeaturesText(formValues.featuresText)
    if (JSON.stringify(newFeatures) !== JSON.stringify(editingService.features)) {
      payload.features = newFeatures
      hasChanges = true
    }

    const normalizedTime = formValues.timeTaken.trim() || null
    if (normalizedTime !== (editingService.time_taken ?? null)) {
      payload.timeTaken = normalizedTime
      hasChanges = true
    }

    const normalizedWarranty = formValues.warranty.trim() || null
    if (normalizedWarranty !== (editingService.warranty ?? null)) {
      payload.warranty = normalizedWarranty
      hasChanges = true
    }

    const relativeImagePath = formValues.imagePath.trim() || null
    const existingRelativeImage = extractRelativeImagePath(editingService) || null
    if (relativeImagePath !== existingRelativeImage) {
      payload.imagePath = relativeImagePath
      payload.previousImagePath = existingRelativeImage ?? undefined
      hasChanges = true
    }

    if (!hasChanges) {
      toast.info('No changes to save')
      return
    }

    try {
      const response = await updateService(payload).unwrap()
      toast.success(`Updated service: ${response.data?.name ?? trimmedName}`)
      closeModal()
    } catch (err) {
      toast.error(
        err && typeof err === 'object' && 'data' in err && typeof (err as { data?: { message?: string } }).data?.message === 'string'
          ? ((err as { data: { message: string } }).data.message)
          : 'Failed to update service',
      )
    }
  }

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isUploadingImage) {
      toast.info('Please wait for the image upload to finish.')
      return
    }
    if (modalMode === 'create') {
      void submitCreate()
    } else if (modalMode === 'edit') {
      void submitEdit()
    }
  }

  const handleConfirmDelete = useCallback(
    async (service: Service) => {
      setIsDeletingId(service.id)
      try {
        await deleteService(service.id).unwrap()
        toast.success(`Deleted service: ${service.name}`)
        setDeleteTarget(null)
      } catch (err) {
        toast.error(
          err && typeof err === 'object' && 'data' in err && typeof (err as { data?: { message?: string } }).data?.message === 'string'
            ? ((err as { data: { message: string } }).data.message)
            : 'Failed to delete service',
        )
      } finally {
        setIsDeletingId(null)
      }
    },
    [deleteService],
  )

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
      { key: 'time_taken', label: 'Time Taken', render: (row) => row.time_taken ?? '—', className: 'w-32' },
      { key: 'warranty', label: 'Warranty', render: (row) => row.warranty ?? '—', className: 'w-32' },
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
        render: (row) => formatDate(row.updated_date),
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

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-brand-700">Service Details</h1>
          <p className="text-sm text-brand-600/80">
            Manage individual service packages. Update their content or publish/unpublish them as needed.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          onClick={openCreateModal}
        >
          <FiPlus className="h-4 w-4" /> Add Service
        </button>
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
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
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

        <div className="flex flex-col gap-3 border-t border-white/40 pt-3 text-sm text-brand-700 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-wide text-brand-500">
            Showing {startIndex}-{endIndex} of {total} service{total === 1 ? '' : 's'}
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
        getRowKey={(row) => row.id}
        emptyMessage="No services found. Try adjusting your filters."
      />

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-brand-700">
              {modalMode === 'create' ? 'Add Service' : 'Edit Service'}
            </h2>
            <p className="mt-2 text-sm text-brand-600/80">
              {modalMode === 'create'
                ? 'Define a new service, link it to a category, and add supporting details.'
                : 'Update the service details, assets, or status. Changes apply immediately.'}
            </p>

            <form className="mt-4 max-h-[75vh] space-y-5 overflow-y-auto pr-2" onSubmit={handleFormSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Name
                    <input
                      type="text"
                      value={formValues.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      placeholder="Service name"
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  {formErrors.name ? <p className="mt-1 text-xs text-rose-600">{formErrors.name}</p> : null}
                </div>

                <div>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Category
                    <select
                      value={formValues.categoryId}
                      onChange={(e) => handleFieldChange('categoryId', e.target.value)}
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select category</option>
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {formErrors.categoryId ? <p className="mt-1 text-xs text-rose-600">{formErrors.categoryId}</p> : null}
                </div>

                <div className="md:col-span-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Description
                    <textarea
                      value={formValues.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      placeholder="Short description"
                      rows={3}
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Highlights
                    <textarea
                      value={formValues.featuresText}
                      onChange={(e) => handleFieldChange('featuresText', e.target.value)}
                      placeholder="Enter one highlight per line"
                      rows={3}
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Time Taken
                    <input
                      type="text"
                      value={formValues.timeTaken}
                      onChange={(e) => handleFieldChange('timeTaken', e.target.value)}
                      placeholder="e.g. 2 hours"
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Warranty
                    <input
                      type="text"
                      value={formValues.warranty}
                      onChange={(e) => handleFieldChange('warranty', e.target.value)}
                      placeholder="Optional"
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-brand-100/80 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-brand-700">Status</p>
                    <p className="text-xs text-brand-500">Inactive services stay hidden downstream.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-brand-600">
                    <input
                      type="checkbox"
                      checked={formValues.status}
                      onChange={(e) => handleFieldChange('status', e.target.checked)}
                      className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-brand-100/80 bg-brand-50/40 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border border-brand-100/80 bg-brand-50">
                    {imagePreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagePreviewUrl} alt="Service preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-medium text-brand-400">No image</span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-brand-600">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-brand-400 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => imageFileInputRef.current?.click()}
                        disabled={isUploadingImage}
                      >
                        {isUploadingImage ? 'Uploading…' : 'Upload Image'}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-brand-200 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleRemoveImage}
                        disabled={(!formValues.imagePath && !imagePreviewUrl) || isUploadingImage}
                      >
                        Remove
                      </button>
                    </div>
                    <p className="text-xs text-brand-500">Stored in <code>public/assets/services</code>. 4&nbsp;MB limit.</p>
                    {imageUploadError ? <p className="text-xs text-rose-600">{imageUploadError}</p> : null}
                  </div>
                </div>

                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleImageFileInputChange}
                />

                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Image Path
                  <input
                    type="text"
                    value={formValues.imagePath}
                    onChange={(e) => handleFieldChange('imagePath', e.target.value)}
                    placeholder="assets/services/..."
                    className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                  />
                </label>
                {formErrors.imagePath ? <p className="text-xs text-rose-600">{formErrors.imagePath}</p> : null}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeModal}
                  disabled={isSubmitting || isUploadingImage}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting || isUploadingImage}
                >
                  {isSubmitting
                    ? 'Saving…'
                    : isUploadingImage
                    ? 'Uploading image…'
                    : modalMode === 'create'
                    ? 'Create Service'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-brand-700">Delete Service</h2>
            <p className="mt-2 text-sm text-brand-600/80">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-brand-700">{deleteTarget.name}</span>? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(isDeletingId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex items-center justify-center rounded-md border border-rose-500 bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => void handleConfirmDelete(deleteTarget)}
                disabled={Boolean(isDeletingId)}
              >
                {isDeletingId === deleteTarget.id ? (
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

export default ServiceDetailsPageClient
