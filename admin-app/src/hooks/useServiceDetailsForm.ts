import { toast } from '@/lib/sonner'

import { useAppDispatch } from '@/store/hooks'
import {
  addService,
  updateService as updateServiceAction,
  useCreateServiceMutation,
  useUpdateServiceMutation,
} from '@/store/slices/services/servicesSlice'
import type { Service } from '@/types/services'
import type {
  ServiceCategoryOption,
  ServiceFormModalState,
} from '@/types/serviceDetailsPage'
import {
  buildServiceFormErrors,
  buildServiceUpdatePayload,
  parseServiceFeaturesText,
  resolveServiceErrorMessage,
} from '@/utils/serviceDetails'
import useServiceDetailsFormState from '@/hooks/useServiceDetailsFormState'

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024

const AZURE_SCHEME = 'azure:'

const toServiceImageView = (raw: string | null | undefined) => {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.startsWith(AZURE_SCHEME)) {
    const blobPath = trimmed.slice(AZURE_SCHEME.length)
    const encoded = blobPath.split('/').map(encodeURIComponent).join('/')
    return `/api/v1/services/details/image/blob/${encoded}`
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `/${trimmed.replace(/^\/+/g, '')}`
}

type UseServiceDetailsFormParams = {
  categoryOptions: ServiceCategoryOption[]
  page: number
  setPage: (value: number) => void
  refetchServices: () => Promise<unknown>
}

export const useServiceDetailsForm = ({
  categoryOptions,
  page,
  setPage,
  refetchServices,
}: UseServiceDetailsFormParams): ServiceFormModalState => {
  const formState = useServiceDetailsFormState({ categoryOptions })
  const [createService, { isLoading: isCreating }] = useCreateServiceMutation()
  const [updateService, { isLoading: isUpdating }] = useUpdateServiceMutation()
  const dispatch = useAppDispatch()

  const ensureValidCategory = (categoryIdValue: string) => {
    const numeric = Number(categoryIdValue)
    if (!Number.isFinite(numeric)) {
      formState.setErrors((prev) => ({ ...prev, categoryId: 'Category is required' }))
      return null
    }
    return numeric
  }

  const submitCreate = async () => {
    const { errors, trimmedName } = buildServiceFormErrors(formState.values)
    if (Object.keys(errors).length > 0) {
      formState.setErrors(errors)
      return
    }

    const categoryIdNumber = ensureValidCategory(formState.values.categoryId)
    if (categoryIdNumber === null) return

    try {
      const imagePathValue = formState.values.imagePath.trim()
      const response = await createService({
        name: trimmedName,
        categoryId: categoryIdNumber,
        status: formState.values.status,
        description: formState.values.description.trim() || null,
        features: parseServiceFeaturesText(formState.values.featuresText),
        timeTaken: formState.values.timeTaken.trim() || null,
        warranty: formState.values.warranty.trim() || null,
        imagePath: imagePathValue || undefined,
      }).unwrap()

      const fallbackService: Service = {
        id: response.data?.id ?? Math.random().toString(36).slice(2),
        name: trimmedName,
        category_id: categoryIdNumber,
        category_name:
          response.data?.category_name ??
          categoryOptions.find((option) => Number(option.id) === categoryIdNumber)?.name ??
            `Category ${categoryIdNumber}`,
        service_images:
          response.data?.service_images ??
          (() => {
            const view = toServiceImageView(imagePathValue || null)
            return view ? [view] : []
          })(),
        thumbnail:
          response.data?.thumbnail ?? toServiceImageView(imagePathValue || null),
        image_path: response.data?.image_path ?? (imagePathValue || null),
        description: (response.data?.description ?? formState.values.description.trim()) || null,
        features:
          response.data?.features ?? parseServiceFeaturesText(formState.values.featuresText),
        time_taken: (response.data?.time_taken ?? formState.values.timeTaken.trim()) || null,
        warranty: (response.data?.warranty ?? formState.values.warranty.trim()) || null,
        status: response.data?.status ?? formState.values.status,
        created_date: response.data?.created_date ?? new Date().toISOString(),
        updated_date: response.data?.updated_date ?? new Date().toISOString(),
      }

      const createdService = response.data ?? fallbackService
      dispatch(addService(createdService))

      toast.success(`Created service: ${createdService.name}`)
      formState.close()
      if (page !== 1) {
        setPage(1)
      }
      if (!response.data) {
        await refetchServices()
      }
    } catch (err) {
      toast.error(resolveServiceErrorMessage(err, 'Failed to create service'))
    }
  }

  const submitEdit = async () => {
    if (!formState.editingService) return
    const { errors } = buildServiceFormErrors(formState.values)
    if (Object.keys(errors).length > 0) {
      formState.setErrors(errors)
      return
    }

    const { payload, hasChanges, trimmedName } = buildServiceUpdatePayload(
      formState.values,
      formState.editingService,
    )
    if (!hasChanges) {
      toast.info('No changes to save')
      return
    }

    try {
      const response = await updateService(payload).unwrap()
      const nextRawImagePath =
        payload.imagePath !== undefined
          ? payload.imagePath ?? null
          : formState.editingService.image_path
      const nextImageView =
        payload.imagePath !== undefined
          ? toServiceImageView(nextRawImagePath)
          : null

      const updatedService: Service = response.data ?? {
        ...formState.editingService,
        name: trimmedName,
        category_id: payload.categoryId ?? formState.editingService.category_id,
        category_name:
          payload.categoryId !== undefined
            ? categoryOptions.find((option) => Number(option.id) === payload.categoryId)?.name ??
              formState.editingService.category_name
            : formState.editingService.category_name,
        status: payload.status ?? formState.editingService.status,
        description: payload.description ?? formState.editingService.description,
        features: payload.features ?? formState.editingService.features,
        time_taken: payload.timeTaken ?? formState.editingService.time_taken,
        warranty: payload.warranty ?? formState.editingService.warranty,
        service_images:
          payload.imagePath !== undefined
            ? nextImageView
              ? [nextImageView]
              : []
            : formState.editingService.service_images,
        thumbnail:
          payload.imagePath !== undefined
            ? nextImageView
            : formState.editingService.thumbnail,
        image_path: nextRawImagePath ?? null,
        updated_date: new Date().toISOString(),
      }

      dispatch(updateServiceAction(updatedService))

      toast.success(`Updated service: ${updatedService.name}`)
      formState.close()
      await refetchServices()
    } catch (err) {
      toast.error(resolveServiceErrorMessage(err, 'Failed to update service'))
    }
  }

  const handleSubmit: ServiceFormModalState['onSubmit'] = (event) => {
    event.preventDefault()
    if (formState.isUploadingImage) {
      toast.info('Please wait for the image upload to finish.')
      return
    }
    if (formState.mode === 'create') {
      void submitCreate()
    } else if (formState.mode === 'edit') {
      void submitEdit()
    }
  }

  const handleUploadImage: ServiceFormModalState['onUploadImage'] = async (file) => {
    formState.setImageUploadError(null)

    if (!file.type.startsWith('image/')) {
      const message = 'Image must be an image file'
      formState.setImageUploadError(message)
      toast.error(message)
      return
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const message = 'Image must be 4 MB or smaller'
      formState.setImageUploadError(message)
      toast.error(message)
      return
    }

    formState.setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/v1/services/details/image', {
        method: 'POST',
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as
        | { success: boolean; path: string; url?: string; message?: string }
        | { message?: string }
        | null

      if (!response.ok || !payload || typeof payload !== 'object' || !('success' in payload) || !payload.success) {
        const message =
          payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
            ? payload.message
            : 'Failed to upload image'
        throw new Error(message)
      }

      formState.updateField('imagePath', payload.path)
      formState.setImagePreviewUrl(payload.url ?? `/${payload.path}`)
      toast.success('Image uploaded')
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Failed to upload image'
      formState.setImageUploadError(message)
      toast.error(message)
    } finally {
      formState.setIsUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    formState.updateField('imagePath', '')
    formState.setImagePreviewUrl(null)
    formState.setImageUploadError(null)
  }

  return {
    mode: formState.mode,
    values: formState.values,
    errors: formState.errors,
    isSubmitting: formState.mode === 'create' ? isCreating : formState.mode === 'edit' ? isUpdating : false,
    isUploadingImage: formState.isUploadingImage,
    imagePreviewUrl: formState.imagePreviewUrl,
    imageUploadError: formState.imageUploadError,
    categoryOptions,
    openCreate: formState.openCreate,
    openEdit: formState.openEdit,
    close: formState.close,
    onFieldChange: formState.updateField,
    onSubmit: handleSubmit,
    onUploadImage: handleUploadImage,
    onRemoveImage: handleRemoveImage,
  }
}

export default useServiceDetailsForm
