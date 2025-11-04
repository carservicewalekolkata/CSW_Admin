import { useState } from 'react'

import type { Service } from '@/types/services'
import type {
  ServiceCategoryOption,
  ServiceFormValues,
} from '@/types/serviceDetailsPage'
import { extractRelativeServiceImagePath, resolveServicePreviewImage } from '@/utils/serviceDetails'

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

type UseServiceDetailsFormStateParams = {
  categoryOptions: ServiceCategoryOption[]
}

export const useServiceDetailsFormState = ({ categoryOptions }: UseServiceDetailsFormStateParams) => {
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [values, setValues] = useState<ServiceFormValues>(() => createEmptyFormValues())
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormValues, string>>>({})
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const resetErrorsAndImage = () => {
    setErrors({})
    setImagePreviewUrl(null)
    setImageUploadError(null)
    setIsUploadingImage(false)
  }

  const openCreate = () => {
    const defaultCategory = categoryOptions[0]?.id ?? ''
    setValues(createEmptyFormValues(defaultCategory))
    setEditingService(null)
    resetErrorsAndImage()
    setMode('create')
  }

  const openEdit = (service: Service) => {
    setEditingService(service)
    setValues({
      name: service.name,
      categoryId: service.category_id.toString(),
      status: service.status,
      description: service.description ?? '',
      featuresText: service.features.join('\n'),
      timeTaken: service.time_taken ?? '',
      warranty: service.warranty ?? '',
      imagePath: extractRelativeServiceImagePath(service),
    })
    resetErrorsAndImage()
    setImagePreviewUrl(resolveServicePreviewImage(service))
    setMode('edit')
  }

  const close = () => {
    setMode(null)
    setEditingService(null)
    resetErrorsAndImage()
  }

  const updateField = <K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  return {
    mode,
    values,
    errors,
    editingService,
    imagePreviewUrl,
    imageUploadError,
    isUploadingImage,
    setErrors,
    setImagePreviewUrl,
    setImageUploadError,
    setIsUploadingImage,
    openCreate,
    openEdit,
    close,
    updateField,
  }
}

export default useServiceDetailsFormState
