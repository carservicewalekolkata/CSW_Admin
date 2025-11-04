import type { Service } from '@/types/services'
import type { ServiceFormValues } from '@/types/serviceDetailsPage'

export const formatServiceDate = (value: string | null) => {
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

export const formatServiceDescription = (value: string | null, maxLength = 96) => {
  if (!value) return '—'
  const trimmed = value.trim()
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3)}…` : trimmed
}

export const summarizeServiceFeatures = (features: string[], previewCount = 3) => {
  if (!Array.isArray(features) || features.length === 0) return '—'
  const preview = features.slice(0, previewCount)
  const remaining = features.length - preview.length
  return remaining > 0 ? `${preview.join(', ')} (+${remaining} more)` : preview.join(', ')
}

export const resolveServicePreviewImage = (service: Service) => {
  if (service.thumbnail) return service.thumbnail
  if (Array.isArray(service.service_images) && service.service_images.length > 0) {
    return service.service_images[0]
  }
  return null
}

export const extractRelativeServiceImagePath = (service: Service) => {
  if (service.image_path) {
    return service.image_path
  }

  const source = service.thumbnail ?? service.service_images?.[0] ?? ''
  if (!source) return ''

  if (source.startsWith('azure:')) {
    return source
  }

  if (/^https?:\/\//i.test(source)) {
    return source
  }

  return source.replace(/^\/+/, '')
}

export const parseServiceFeaturesText = (value: string) =>
  value
    .split(/\r?\n/)
    .flatMap((line) => line.split(','))
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

export const buildServiceFormErrors = (values: ServiceFormValues) => {
  const errors: Partial<Record<keyof ServiceFormValues, string>> = {}
  const trimmedName = values.name.trim()
  if (!trimmedName) errors.name = 'Name is required'
  if (!values.categoryId) errors.categoryId = 'Category is required'
  if (values.imagePath && values.imagePath.includes('..')) {
    errors.imagePath = 'Invalid image path'
  }

  return { errors, trimmedName }
}

export const buildServiceUpdatePayload = (
  values: ServiceFormValues,
  original: Service,
) => {
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
  } = { id: original.id }

  let hasChanges = false
  const trimmedName = values.name.trim()

  if (trimmedName !== original.name) {
    payload.name = trimmedName
    hasChanges = true
  }

  if (values.categoryId) {
    const categoryIdNumber = Number(values.categoryId)
    if (Number.isFinite(categoryIdNumber) && categoryIdNumber !== original.category_id) {
      payload.categoryId = categoryIdNumber
      hasChanges = true
    }
  }

  if (values.status !== original.status) {
    payload.status = values.status
    hasChanges = true
  }

  const normalizedDescription = values.description.trim() || null
  if (normalizedDescription !== (original.description ?? null)) {
    payload.description = normalizedDescription
    hasChanges = true
  }

  const features = parseServiceFeaturesText(values.featuresText)
  if (JSON.stringify(features) !== JSON.stringify(original.features)) {
    payload.features = features
    hasChanges = true
  }

  const normalizedTime = values.timeTaken.trim() || null
  if (normalizedTime !== (original.time_taken ?? null)) {
    payload.timeTaken = normalizedTime
    hasChanges = true
  }

  const normalizedWarranty = values.warranty.trim() || null
  if (normalizedWarranty !== (original.warranty ?? null)) {
    payload.warranty = normalizedWarranty
    hasChanges = true
  }

  const relativeImagePath = values.imagePath.trim() || null
  const existingRelativeImage = extractRelativeServiceImagePath(original) || null
  if (relativeImagePath !== existingRelativeImage) {
    payload.imagePath = relativeImagePath
    payload.previousImagePath = existingRelativeImage ?? undefined
    hasChanges = true
  }

  return { payload, hasChanges, trimmedName, features }
}

export const resolveServiceErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    if ('data' in error) {
      const data = (error as { data?: unknown }).data
      if (
        data &&
        typeof data === 'object' &&
        'message' in data &&
        typeof (data as { message?: unknown }).message === 'string'
      ) {
        return (data as { message: string }).message
      }
    }

    if ('error' in error && typeof (error as { error?: unknown }).error === 'string') {
      return (error as { error: string }).error
    }
  }

  return fallback
}
