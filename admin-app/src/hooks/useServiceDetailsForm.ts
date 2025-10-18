import { toast } from '@/lib/sonner'

import {
  useCreateServiceMutation,
  useUpdateServiceMutation,
} from '@/store/slices/services/servicesSlice'
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

type UseServiceDetailsFormParams = {
  categoryOptions: ServiceCategoryOption[]
  page: number
  setPage: (value: number) => void
  refreshServices: (nextPage: number) => Promise<void>
}

export const useServiceDetailsForm = ({
  categoryOptions,
  page,
  setPage,
  refreshServices,
}: UseServiceDetailsFormParams): ServiceFormModalState => {
  const formState = useServiceDetailsFormState({ categoryOptions })
  const [createService, { isLoading: isCreating }] = useCreateServiceMutation()
  const [updateService, { isLoading: isUpdating }] = useUpdateServiceMutation()

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
      const response = await createService({
        name: trimmedName,
        categoryId: categoryIdNumber,
        status: formState.values.status,
        description: formState.values.description.trim() || null,
        features: parseServiceFeaturesText(formState.values.featuresText),
        timeTaken: formState.values.timeTaken.trim() || null,
        warranty: formState.values.warranty.trim() || null,
        imagePath: formState.values.imagePath.trim() || undefined,
      }).unwrap()

      toast.success(`Created service: ${response.data?.name ?? trimmedName}`)
      formState.close()
      if (page !== 1) {
        setPage(1)
      }
      await refreshServices(1)
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
      toast.success(`Updated service: ${response.data?.name ?? trimmedName}`)
      formState.close()
      await refreshServices(page)
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
