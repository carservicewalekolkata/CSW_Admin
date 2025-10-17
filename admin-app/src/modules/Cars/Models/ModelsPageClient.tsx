'use client'

import { useMemo, useState, useCallback, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react'
import Image from 'next/image'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'

import Table, { type TableColumn } from '@/components/Table'
import { toast } from '@/lib/sonner'
import type { BrandSortStatus, BrandSortUpdated, Model, ModelQuery } from '@/types/models'
import type { ServiceCategory } from '@/types/serviceCategories'
import type { Service } from '@/types/services'
import {
  useCreateModelMutation,
  useDeleteModelMutation,
  useFetchModelsQuery,
  usePrefetchModels,
  useUpdateModelMutation,
} from '@/store/slices/models/modelsSlice'
import { useFetchBrandsQuery } from '@/store/slices/brands/brandsSlice'
import { useFetchServiceCategoriesQuery } from '@/store/slices/serviceCategories/serviceCategoriesSlice'
import { useLazyFetchServicesQuery } from '@/store/slices/services/servicesApi'

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

const extractImagePath = (image: string | null) => {
  if (!image) return ''
  return image.replace(/^\/+/, '')
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

const toNumberOrZero = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

type ModelFormService = {
  serviceId: string
  serviceName: string
  discount: string
  originalPrice: string
  discountPrice: string
}

type ModelFormValues = {
  name: string
  slug: string
  brandSlug: string
  status: boolean
  imagePath: string
  iconId: string
  services: ModelFormService[]
}

type ServicePickerState = {
  categoryId: string
  serviceId: string
  discount: string
  originalPrice: string
  discountPrice: string
}

const createEmptyFormValues = (brandSlug = ''): ModelFormValues => ({
  name: '',
  slug: '',
  brandSlug,
  status: true,
  imagePath: '',
  iconId: '',
  services: [],
})

const MAX_ICON_SIZE_BYTES = 1.5 * 1024 * 1024
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024

const ModelsPageClient = () => {
  const [searchName, setSearchName] = useState('')
  const [slugFilter, setSlugFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [statusSort, setStatusSort] = useState<BrandSortStatus>('none')
  const [dateSort, setDateSort] = useState<BrandSortUpdated>('desc')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const [servicesPreview, setServicesPreview] = useState<Model | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Model | null>(null)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [formValues, setFormValues] = useState<ModelFormValues>(() => createEmptyFormValues())
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ModelFormValues, string>>>({})
  const [slugDirty, setSlugDirty] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)

  const iconFileInputRef = useRef<HTMLInputElement | null>(null)
  const imageFileInputRef = useRef<HTMLInputElement | null>(null)
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null)
  const [iconUploadError, setIconUploadError] = useState<string | null>(null)
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const [servicePicker, setServicePicker] = useState<ServicePickerState>({
    categoryId: '',
    serviceId: '',
    discount: '',
    originalPrice: '',
    discountPrice: '',
  })
  const [servicePickerError, setServicePickerError] = useState<string | null>(null)
  const [serviceOptions, setServiceOptions] = useState<Service[]>([])

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

  const { data: modelsResponse, error, isLoading, refetch } = useFetchModelsQuery(query)
  const [deleteModel] = useDeleteModelMutation()
  const [createModel, { isLoading: isCreating }] = useCreateModelMutation()
  const [updateModel, { isLoading: isUpdating }] = useUpdateModelMutation()
  const prefetchModels = usePrefetchModels()

  const { data: brandsResponse } = useFetchBrandsQuery({ limit: 200, sortStatus: 'none', sortUpdated: 'desc' })
  const { data: categoriesResponse } = useFetchServiceCategoriesQuery({ limit: 200, sortUpdated: 'desc' })
  const [triggerServices, { data: servicesResponse, isFetching: isFetchingServices }] = useLazyFetchServicesQuery()

  const items = modelsResponse?.data ?? []
  const total = modelsResponse?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(startIndex + items.length - 1, total)

  const brandRecords = useMemo(() => brandsResponse?.data ?? [], [brandsResponse])
  const brandSelectOptions = useMemo(
    () =>
      brandRecords
        .map((brand) => ({ slug: brand.slug, name: brand.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [brandRecords],
  )
  const brandFilterOptions = useMemo(() => brandSelectOptions.map((item) => item.name), [brandSelectOptions])

  const categoryOptions = useMemo<ServiceCategory[]>(
    () => categoriesResponse?.data ?? [],
    [categoriesResponse],
  )

  useEffect(() => {
    if (servicesResponse?.data) {
      setServiceOptions(servicesResponse.data)
    }
  }, [servicesResponse])

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

  const resetUploadState = useCallback(() => {
    setIconPreviewUrl(null)
    setIconUploadError(null)
    setIsUploadingIcon(false)
    if (iconFileInputRef.current) {
      iconFileInputRef.current.value = ''
    }

    setImagePreviewUrl(null)
    setImageUploadError(null)
    setIsUploadingImage(false)
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = ''
    }
  }, [])

  const openCreateModal = useCallback(() => {
    const defaultBrand = brandSelectOptions[0]?.slug ?? ''
    setFormValues(createEmptyFormValues(defaultBrand))
    setFormErrors({})
    setSlugDirty(false)
    setEditingModel(null)
    resetUploadState()
    setServicePicker({
      categoryId: '',
      serviceId: '',
      discount: '',
      originalPrice: '',
      discountPrice: '',
    })
    setServicePickerError(null)
    setServiceOptions([])
    setModalMode('create')
  }, [brandSelectOptions, resetUploadState])

  const openEditModal = useCallback(
    (model: Model) => {
      const matchingBrand = brandSelectOptions.find(
        (brand) => brand.name.toLowerCase() === model.brand_name.toLowerCase(),
      )

      setFormValues({
        name: model.name,
        slug: model.slug,
        brandSlug: matchingBrand?.slug ?? '',
        status: model.status,
        imagePath: extractImagePath(model.image),
        iconId: extractIconId(model.thumbnail),
        services:
          model.services?.map((service) => ({
            serviceId: service.services_id,
            serviceName: service.name ?? 'Unnamed service',
            discount: service.discount.toString(),
            originalPrice: service.original_price.toString(),
            discountPrice: service.discount_price.toString(),
          })) ?? [],
      })
      setFormErrors({})
      setSlugDirty(true)
      setEditingModel(model)
      setIconPreviewUrl(model.thumbnail)
      setImagePreviewUrl(model.image)
      setIconUploadError(null)
      setImageUploadError(null)
      setIsUploadingIcon(false)
      setIsUploadingImage(false)
      if (iconFileInputRef.current) {
        iconFileInputRef.current.value = ''
      }
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = ''
      }
      setServicePicker({
        categoryId: '',
        serviceId: '',
        discount: '',
        originalPrice: '',
        discountPrice: '',
      })
      setServicePickerError(null)
      setServiceOptions([])
      setModalMode('edit')
    },
    [brandSelectOptions],
  )

  const closeModal = useCallback(() => {
    setModalMode(null)
    setEditingModel(null)
    setFormErrors({})
    setSlugDirty(false)
    resetUploadState()
    setServicePicker({
      categoryId: '',
      serviceId: '',
      discount: '',
      originalPrice: '',
      discountPrice: '',
    })
    setServicePickerError(null)
    setServiceOptions([])
  }, [resetUploadState])

  const handleNameChange = useCallback(
    (value: string) => {
      setFormValues((prev) => {
        const next = { ...prev, name: value }
        if (!slugDirty && modalMode === 'create') {
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

  const handleBrandChange = useCallback((value: string) => {
    setFormValues((prev) => ({ ...prev, brandSlug: value }))
    setFormErrors((prev) => {
      if (!prev.brandSlug) return prev
      const next = { ...prev }
      delete next.brandSlug
      return next
    })
  }, [])

  const handleStatusChange = useCallback((checked: boolean) => {
    setFormValues((prev) => ({ ...prev, status: checked }))
  }, [])

  const handleIconChange = useCallback((value: string) => {
    const trimmed = value.trim()
    setFormValues((prev) => ({ ...prev, iconId: trimmed }))
    setIconUploadError(null)
    setFormErrors((prev) => {
      if (!prev.iconId) return prev
      const next = { ...prev }
      delete next.iconId
      return next
    })

    if (trimmed.length === 24) {
      setIconPreviewUrl(`/api/v1/cars/models/icon/${trimmed}`)
    } else {
      setIconPreviewUrl(null)
    }
  }, [])

  const handleImagePathChange = useCallback((value: string) => {
    const trimmed = value.trim()
    setFormValues((prev) => ({ ...prev, imagePath: trimmed }))
    setImageUploadError(null)
    setImagePreviewUrl(trimmed ? `/${trimmed.replace(/^\/+/, '')}` : null)
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

        const response = await fetch('/api/v1/cars/models/icon', {
          method: 'POST',
          body: formData,
        })

        const payload = (await response.json().catch(() => null)) as
          | { success: boolean; iconId: string; url: string; message?: string }
          | { message?: string }
          | null

        if (!response.ok || !payload || typeof payload !== 'object' || !('success' in payload) || !payload.success) {
          const message =
            payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
              ? payload.message
              : 'Failed to upload icon'
          throw new Error(message)
        }

        setFormValues((prev) => ({ ...prev, iconId: payload.iconId }))
        setIconPreviewUrl(payload.url ?? `/api/v1/cars/models/icon/${payload.iconId}`)
        setFormErrors((prev) => {
          const next = { ...prev }
          delete next.iconId
          return next
        })
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
    setFormValues((prev) => ({ ...prev, iconId: '' }))
    setIconPreviewUrl(null)
    setIconUploadError(null)
    if (iconFileInputRef.current) {
      iconFileInputRef.current.value = ''
    }
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

        const response = await fetch('/api/v1/cars/models/image', {
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

        setFormValues((prev) => ({ ...prev, imagePath: payload.path }))
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
    [],
  )

  const handleRemoveImage = useCallback(() => {
    setFormValues((prev) => ({ ...prev, imagePath: '' }))
    setImagePreviewUrl(null)
    setImageUploadError(null)
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = ''
    }
  }, [])

  const handleServicePickerCategoryChange = useCallback(
    async (value: string) => {
      setServicePicker((prev) => ({
        ...prev,
        categoryId: value,
        serviceId: '',
      }))
      setServicePickerError(null)
      setServiceOptions([])
      if (value) {
        const numericCategoryId = Number(value)
        if (Number.isFinite(numericCategoryId)) {
          try {
            await triggerServices({ category: value, limit: 200, sortUpdated: 'desc' })
          } catch (serviceError) {
            console.error(serviceError)
            toast.error('Failed to load services for the selected category')
          }
        }
      }
    },
    [triggerServices],
  )

  const handleServicePickerServiceChange = useCallback((value: string) => {
    setServicePicker((prev) => ({ ...prev, serviceId: value }))
    setServicePickerError(null)
  }, [])

  const handleServicePickerFieldChange = useCallback((field: keyof Omit<ServicePickerState, 'categoryId' | 'serviceId'>, value: string) => {
    setServicePicker((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleAddService = useCallback(() => {
    if (!servicePicker.categoryId) {
      setServicePickerError('Select a service category')
      return
    }
    if (!servicePicker.serviceId) {
      setServicePickerError('Select a service')
      return
    }

    if (formValues.services.some((service) => service.serviceId === servicePicker.serviceId)) {
      setServicePickerError('Service already added')
      return
    }

    const selectedService = serviceOptions.find((service) => service.id === servicePicker.serviceId)
    const serviceName = selectedService?.name ?? 'Unnamed service'

    setFormValues((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        {
          serviceId: servicePicker.serviceId,
          serviceName,
          discount: servicePicker.discount || '0',
          originalPrice: servicePicker.originalPrice || '0',
          discountPrice: servicePicker.discountPrice || '0',
        },
      ],
    }))

    setServicePicker({
      categoryId: servicePicker.categoryId,
      serviceId: '',
      discount: '',
      originalPrice: '',
      discountPrice: '',
    })
    setServicePickerError(null)
  }, [formValues.services, serviceOptions, servicePicker])

  const handleRemoveService = useCallback((serviceId: string) => {
    setFormValues((prev) => ({
      ...prev,
      services: prev.services.filter((service) => service.serviceId !== serviceId),
    }))
  }, [])

  const handleServiceValueChange = useCallback(
    (serviceId: string, field: keyof Omit<ModelFormService, 'serviceId' | 'serviceName'>, value: string) => {
      setFormValues((prev) => ({
        ...prev,
        services: prev.services.map((service) =>
          service.serviceId === serviceId ? { ...service, [field]: value } : service,
        ),
      }))
    },
    [],
  )

  const validateForm = () => {
    const errors: Partial<Record<keyof ModelFormValues, string>> = {}
    const trimmedName = formValues.name.trim()
    const sanitizedSlug = slugify(formValues.slug || trimmedName)

    if (!trimmedName) {
      errors.name = 'Name is required'
    }

    if (!sanitizedSlug) {
      errors.slug = 'Slug is required'
    }

    if (!formValues.brandSlug) {
      errors.brandSlug = 'Brand is required'
    }

    if (formValues.iconId && formValues.iconId.trim().length !== 24) {
      errors.iconId = 'Icon must be a 24-character ObjectId'
    }

    setFormErrors(errors)

    return {
      isValid: Object.keys(errors).length === 0,
      trimmedName,
      sanitizedSlug,
    }
  }

  const buildServicesPayload = () =>
    formValues.services.map((service) => ({
      serviceId: service.serviceId,
      discount: toNumberOrZero(service.discount),
      originalPrice: toNumberOrZero(service.originalPrice),
      discountPrice: toNumberOrZero(service.discountPrice),
    }))

  const submitCreate = async () => {
    const { isValid, trimmedName, sanitizedSlug } = validateForm()
    if (!isValid) return

    if (sanitizedSlug !== formValues.slug) {
      setFormValues((prev) => ({ ...prev, slug: sanitizedSlug }))
    }

    try {
      const response = await createModel({
        name: trimmedName,
        slug: sanitizedSlug,
        brandSlug: formValues.brandSlug,
        status: formValues.status,
        imagePath: formValues.imagePath || undefined,
        iconId: formValues.iconId || undefined,
        services: formValues.services.length > 0 ? buildServicesPayload() : undefined,
      }).unwrap()

      toast.success(`Created model: ${response.data?.name ?? trimmedName}`)
      closeModal()
      const resetBrand = brandSelectOptions[0]?.slug ?? ''
      setFormValues(createEmptyFormValues(resetBrand))
      if (page !== 1) {
        setPage(1)
      } else {
        await refetch()
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create model'))
    }
  }

  const submitEdit = async () => {
    if (!editingModel) return

    const { isValid, trimmedName, sanitizedSlug } = validateForm()
    if (!isValid) return

    if (sanitizedSlug !== formValues.slug) {
      setFormValues((prev) => ({ ...prev, slug: sanitizedSlug }))
    }

    const payload: {
      slug: string
      name?: string
      newSlug?: string
      brandSlug?: string
      status?: boolean
      imagePath?: string | null
      iconId?: string | null
      services?: ReturnType<typeof buildServicesPayload>
    } = { slug: editingModel.slug }

    let hasChanges = false

    if (trimmedName !== editingModel.name) {
      payload.name = trimmedName
      hasChanges = true
    }

    if (sanitizedSlug !== editingModel.slug) {
      payload.newSlug = sanitizedSlug
      hasChanges = true
    }

    if (formValues.brandSlug) {
      payload.brandSlug = formValues.brandSlug
      hasChanges = true
    }

    if (formValues.status !== editingModel.status) {
      payload.status = formValues.status
      hasChanges = true
    }

    const existingIconId = extractIconId(editingModel.thumbnail)
    const trimmedIconId = formValues.iconId.trim()
    if (trimmedIconId && trimmedIconId.length === 24 && trimmedIconId !== existingIconId) {
      payload.iconId = trimmedIconId
      hasChanges = true
    } else if (!trimmedIconId && existingIconId) {
      payload.iconId = null
      hasChanges = true
    }

    const existingImagePath = extractImagePath(editingModel.image)
    if (formValues.imagePath !== existingImagePath) {
      payload.imagePath = formValues.imagePath ? formValues.imagePath : null
      hasChanges = true
    }

    const servicesPayload = buildServicesPayload()
    const existingServicesPayload = editingModel.services.map((service) => ({
      serviceId: service.services_id,
      discount: service.discount,
      originalPrice: service.original_price,
      discountPrice: service.discount_price,
    }))

    if (JSON.stringify(servicesPayload) !== JSON.stringify(existingServicesPayload)) {
      payload.services = servicesPayload
      hasChanges = true
    }

    if (!hasChanges) {
      toast.info('No changes to save')
      return
    }

    try {
      const response = await updateModel(payload).unwrap()
      toast.success(`Updated model: ${response.data?.name ?? trimmedName}`)
      closeModal()
      await refetch()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update model'))
    }
  }

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isUploadingIcon || isUploadingImage) {
      toast.info('Please wait for the uploads to finish.')
      return
    }
    if (modalMode === 'create') {
      void submitCreate()
    } else if (modalMode === 'edit') {
      void submitEdit()
    }
  }

  const confirmDelete = useCallback(
    async (target: Model) => {
      setDeletingSlug(target.slug)
      try {
        await deleteModel(target.slug).unwrap()
        toast.success(`Deleted model: ${target.name}`)
        const shouldMovePrev = items.length === 1 && safePage > 1
        setDeleteTarget(null)
        if (shouldMovePrev) {
          setPage((prev) => Math.max(1, prev - 1))
        } else {
          await refetch()
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to delete model'))
      } finally {
        setDeletingSlug(null)
      }
    },
    [deleteModel, items.length, refetch, safePage],
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
              alt={`${row.name} icon`}
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
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${row.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
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
          const isDeletingRow = deletingSlug === row.slug
          return (
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
                className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-500 bg-rose-500 text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => setDeleteTarget(row)}
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
    ],
    [deletingSlug, openEditModal],
  )

  const isSubmitting = modalMode === 'create' ? isCreating : modalMode === 'edit' ? isUpdating : false
  const isUploading = isUploadingIcon || isUploadingImage

  return (
    <section className="space-y-6 pb-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-brand-700">Car Models</h1>
          <p className="text-sm text-brand-600/80">
            Manage car models, update their assets, and link them with relevant services for downstream experiences.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          onClick={openCreateModal}
        >
          <FiPlus className="h-4 w-4" /> Add Model
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {getErrorMessage(error, 'Failed to fetch models')}
        </div>
      )}

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
              {brandFilterOptions.map((name) => (
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

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-brand-700">
              {modalMode === 'create' ? 'Add Model' : 'Edit Model'}
            </h2>
            <p className="mt-2 text-sm text-brand-600/80">
              {modalMode === 'create'
                ? 'Create a new car model entry and link it with the relevant brand and services.'
                : 'Update model details, assets, or linked services. Changes apply immediately.'}
            </p>

            <form className="mt-4 max-h-[75vh] space-y-5 overflow-y-auto pr-2" onSubmit={handleFormSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Name
                    <input
                      type="text"
                      value={formValues.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Model name"
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
                      placeholder="model-slug"
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <p className="mt-1 text-xs text-brand-500">
                    Lowercase letters, numbers, and hyphens only. We sanitize it automatically.
                  </p>
                  {formErrors.slug ? (
                    <p className="mt-1 text-xs text-rose-600">{formErrors.slug}</p>
                  ) : null}
                </div>

                <div>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Brand
                    <select
                      value={formValues.brandSlug}
                      onChange={(e) => handleBrandChange(e.target.value)}
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select a brand</option>
                      {brandSelectOptions.map((brand) => (
                        <option key={brand.slug} value={brand.slug}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {formErrors.brandSlug ? (
                    <p className="mt-1 text-xs text-rose-600">{formErrors.brandSlug}</p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-brand-100/80 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-brand-700">Status</p>
                    <p className="text-xs text-brand-500">
                      Inactive models stay hidden in downstream experiences.
                    </p>
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
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-brand-100/80 bg-brand-50">
                      {iconPreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={iconPreviewUrl} alt="Model icon preview" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs font-medium text-brand-400">No icon</span>
                      )}
                    </div>
                    <div className="space-y-2 text-sm text-brand-600">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-brand-400 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => iconFileInputRef.current?.click()}
                          disabled={isUploadingIcon}
                        >
                          {isUploadingIcon ? 'Uploading…' : 'Upload Icon'}
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-brand-200 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={handleRemoveIcon}
                          disabled={( !formValues.iconId && !iconPreviewUrl) || isUploadingIcon}
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
                    ref={iconFileInputRef}
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
                        value={formValues.iconId}
                        onChange={(e) => handleIconChange(e.target.value)}
                        placeholder="Auto-filled after upload or paste an existing id"
                        className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <p className="mt-1 text-xs text-brand-500">
                      Leave blank to omit an icon. Provide a 24-character GridFS id to reuse an existing asset.
                    </p>
                    {formErrors.iconId ? (
                      <p className="mt-1 text-xs text-rose-600">{formErrors.iconId}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg border border-brand-100/80 bg-brand-50">
                      {imagePreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imagePreviewUrl} alt="Model image preview" className="h-full w-full object-cover" />
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
                          disabled={( !formValues.imagePath && !imagePreviewUrl) || isUploadingImage}
                        >
                          Remove
                        </button>
                      </div>
                      <p className="text-xs text-brand-500">Stored in <code>public/assets/images/models</code>. 4&nbsp;MB limit.</p>
                      {imageUploadError ? (
                        <p className="text-xs text-rose-600">{imageUploadError}</p>
                      ) : null}
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
                      onChange={(e) => handleImagePathChange(e.target.value)}
                      placeholder="assets/images/models/..."
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <p className="mt-1 text-xs text-brand-500">
                    Provide a relative path inside <code>public/</code> or upload a new image.
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-brand-100/80 bg-brand-50/40 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Service Category
                    <select
                      value={servicePicker.categoryId}
                      onChange={(e) => handleServicePickerCategoryChange(e.target.value)}
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

                  <label className="flex flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Service
                    <select
                      value={servicePicker.serviceId}
                      onChange={(e) => handleServicePickerServiceChange(e.target.value)}
                      disabled={!servicePicker.categoryId || isFetchingServices}
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm disabled:text-brand-400"
                    >
                      <option value="">
                        {isFetchingServices ? 'Loading…' : servicePicker.categoryId ? 'Select service' : 'Pick a category first'}
                      </option>
                      {serviceOptions.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex w-28 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Discount
                    <input
                      type="number"
                      inputMode="decimal"
                      value={servicePicker.discount}
                      onChange={(e) => handleServicePickerFieldChange('discount', e.target.value)}
                      placeholder="0"
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="flex w-28 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Original
                    <input
                      type="number"
                      inputMode="decimal"
                      value={servicePicker.originalPrice}
                      onChange={(e) => handleServicePickerFieldChange('originalPrice', e.target.value)}
                      placeholder="0"
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="flex w-28 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Discounted
                    <input
                      type="number"
                      inputMode="decimal"
                      value={servicePicker.discountPrice}
                      onChange={(e) => handleServicePickerFieldChange('discountPrice', e.target.value)}
                      placeholder="0"
                      className="rounded-lg border border-brand-100/80 bg-white px-3 py-2 text-sm"
                    />
                  </label>

                  <button
                    type="button"
                    className="mt-5 inline-flex items-center gap-2 rounded-md border border-brand-500 bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleAddService}
                    disabled={isFetchingServices}
                  >
                    <FiPlus className="h-4 w-4" /> Add
                  </button>
                </div>
                {servicePickerError ? (
                  <p className="text-xs text-rose-600">{servicePickerError}</p>
                ) : null}

                <div className="rounded-lg border border-brand-100/80 bg-white">
                  {formValues.services.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-brand-500">No services linked yet.</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      <div className="divide-y divide-brand-100/60">
                        {formValues.services.map((service) => (
                          <div key={service.serviceId} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-6 md:items-center">
                            <div className="md:col-span-2">
                              <p className="text-sm font-semibold text-brand-700">{service.serviceName}</p>
                              <p className="break-all text-xs text-brand-500">{service.serviceId}</p>
                            </div>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={service.discount}
                              onChange={(e) => handleServiceValueChange(service.serviceId, 'discount', e.target.value)}
                              className="rounded-md border border-brand-100/80 px-3 py-2 text-sm"
                              placeholder="Discount"
                            />
                            <input
                              type="number"
                              inputMode="decimal"
                              value={service.originalPrice}
                              onChange={(e) => handleServiceValueChange(service.serviceId, 'originalPrice', e.target.value)}
                              className="rounded-md border border-brand-100/80 px-3 py-2 text-sm"
                              placeholder="Original"
                            />
                            <input
                              type="number"
                              inputMode="decimal"
                              value={service.discountPrice}
                              onChange={(e) => handleServiceValueChange(service.serviceId, 'discountPrice', e.target.value)}
                              className="rounded-md border border-brand-100/80 px-3 py-2 text-sm"
                              placeholder="Discounted"
                            />
                            <button
                              type="button"
                              className="flex h-9 w-9 items-center justify-center rounded-md border border-rose-500 bg-rose-500 text-white transition hover:bg-rose-600"
                              onClick={() => handleRemoveService(service.serviceId)}
                              aria-label={`Remove ${service.serviceName}`}
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeModal}
                  disabled={isSubmitting || isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting || isUploading}
                >
                  {isSubmitting
                    ? 'Saving…'
                    : isUploading
                    ? 'Uploading…'
                    : modalMode === 'create'
                    ? 'Create Model'
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
            <h2 className="text-xl font-semibold text-brand-700">Delete Model</h2>
            <p className="mt-2 text-sm text-brand-600/80">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-brand-700">{deleteTarget.name}</span>? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-md border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(deletingSlug)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex items-center justify-center rounded-md border border-rose-500 bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => void confirmDelete(deleteTarget)}
                disabled={Boolean(deletingSlug)}
              >
                {deletingSlug ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-brand-700">
                        {service.name ?? 'Unnamed service'}
                      </p>
                      <p className="text-xs text-brand-500">
                        Time taken: {service.time_taken ?? '—'}
                      </p>
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
