import type { Model } from '@/types/models'
import type { ModelFormService, ModelFormValues } from '@/types/modelsPage'

export const formatModelDate = (value: string | null) => {
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

export const slugifyModel = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

export const extractModelIconId = (icon: string | null) => {
  if (!icon) return ''
  const path = (icon.split('?')[0] ?? icon).trim()
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? ''
}

export const extractModelImagePath = (image: string | null) => {
  if (!image) return ''
  return image.replace(/^\/+/, '')
}

export const resolveModelErrorMessage = (error: unknown, fallback: string) => {
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

export const toNumberOrZero = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const mapModelServicesToForm = (model: Model): ModelFormService[] =>
  model.services?.map((service) => ({
    serviceId: service.services_id,
    serviceName: service.name ?? 'Unnamed service',
    discount: service.discount.toString(),
    originalPrice: service.original_price.toString(),
    discountPrice: service.discount_price.toString(),
  })) ?? []

export const buildModelServicesPayload = (services: ModelFormService[]) =>
  services.map((service) => ({
    serviceId: service.serviceId,
    discount: toNumberOrZero(service.discount),
    originalPrice: toNumberOrZero(service.originalPrice),
    discountPrice: toNumberOrZero(service.discountPrice),
  }))

export const servicesChanged = (next: ModelFormService[], current: Model['services']) => {
  const nextPayload = buildModelServicesPayload(next)
  const currentPayload = current.map((service) => ({
    serviceId: service.services_id,
    discount: service.discount,
    originalPrice: service.original_price,
    discountPrice: service.discount_price,
  }))

  return JSON.stringify(nextPayload) !== JSON.stringify(currentPayload)
}

export const buildModelUpdatePayload = (values: ModelFormValues, model: Model) => {
  const trimmedName = values.name.trim()
  const sanitizedSlug = slugifyModel(values.slug || trimmedName)
  const cleanedIconId = values.iconId.trim()
  const servicesPayload = buildModelServicesPayload(values.services)

  const payload: {
    slug: string
    name?: string
    newSlug?: string
    brandSlug?: string
    status?: boolean
    imagePath?: string | null
    iconId?: string | null
    services?: ReturnType<typeof buildModelServicesPayload>
  } = { slug: model.slug }

  let hasChanges = false

  if (trimmedName !== model.name) {
    payload.name = trimmedName
    hasChanges = true
  }

  if (sanitizedSlug !== model.slug) {
    payload.newSlug = sanitizedSlug
    hasChanges = true
  }

  if (values.brandSlug) {
    payload.brandSlug = values.brandSlug
    hasChanges = true
  }

  if (values.status !== model.status) {
    payload.status = values.status
    hasChanges = true
  }

  const existingIconId = extractModelIconId(model.thumbnail)
  if (cleanedIconId && cleanedIconId.length === 24 && cleanedIconId !== existingIconId) {
    payload.iconId = cleanedIconId
    hasChanges = true
  } else if (!cleanedIconId && existingIconId) {
    payload.iconId = null
    hasChanges = true
  }

  const existingImagePath = extractModelImagePath(model.image)
  if (values.imagePath !== existingImagePath) {
    payload.imagePath = values.imagePath ? values.imagePath : null
    hasChanges = true
  }

  if (servicesChanged(values.services, model.services)) {
    payload.services = servicesPayload
    hasChanges = true
  }

  return { payload, hasChanges, trimmedName, sanitizedSlug }
}

export const buildModelFormErrors = (values: ModelFormValues) => {
  const errors: Partial<Record<keyof ModelFormValues, string>> = {}
  const trimmedName = values.name.trim()
  const sanitizedSlug = slugifyModel(values.slug || trimmedName)

  if (!trimmedName) {
    errors.name = 'Name is required'
  }

  if (!sanitizedSlug) {
    errors.slug = 'Slug is required'
  }

  if (!values.brandSlug) {
    errors.brandSlug = 'Brand is required'
  }

  if (values.iconId && values.iconId.trim().length !== 24) {
    errors.iconId = 'Icon must be a 24-character ObjectId'
  }

  const sanitizedIcon = values.iconId.trim()
  return {
    errors,
    trimmedName,
    sanitizedSlug,
    sanitizedIcon,
  }
}
