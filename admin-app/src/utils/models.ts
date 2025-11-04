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

const MODEL_IMAGE_PROXY_PREFIX = '/api/v1/cars/models/image/blob/'

export const extractModelImagePath = (image: string | null, raw?: string | null) => {
  const trimmedRaw = raw?.trim()
  if (trimmedRaw) {
    return trimmedRaw
  }

  if (!image) return ''

  const trimmed = image.trim()
  if (!trimmed) {
    return ''
  }

  if (trimmed.startsWith('azure:')) {
    return trimmed
  }

  if (trimmed.startsWith(MODEL_IMAGE_PROXY_PREFIX)) {
    const remainder = trimmed.slice(MODEL_IMAGE_PROXY_PREFIX.length)
    const decoded = remainder
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/')
    return `azure:${decoded}`
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return trimmed.replace(/^\/+/, '')
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
    fuelType: service.fuel_type ?? '',
    discount: service.discount.toString(),
    originalPrice: service.original_price.toString(),
    discountPrice: service.discount_price.toString(),
  })) ?? []

export const sanitizeFuelTypes = (fuelTypes: string[]) => {
  const unique = new Set<string>()
  fuelTypes.forEach((fuel) => {
    if (typeof fuel !== 'string') {
      return
    }
    const normalized = fuel.trim()
    if (!normalized) {
      return
    }
    const titleCased = normalized
      .toLowerCase()
      .split(/\s+/)
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
      .join(' ')
      .trim()
    if (titleCased) {
      unique.add(titleCased)
    }
  })
  return Array.from(unique)
}

export const buildModelServicesPayload = (services: ModelFormService[]) =>
  services.map((service) => ({
    serviceId: service.serviceId,
    fuelType: service.fuelType.trim() || undefined,
    discount: toNumberOrZero(service.discount),
    originalPrice: toNumberOrZero(service.originalPrice),
    discountPrice: toNumberOrZero(service.discountPrice),
  }))

export const servicesChanged = (next: ModelFormService[], current: Model['services']) => {
  const nextPayload = buildModelServicesPayload(next)
  const currentPayload = current.map((service) => ({
    serviceId: service.services_id,
    fuelType: service.fuel_type ?? undefined,
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
  const sanitizedFuelTypes = sanitizeFuelTypes(values.fuelTypes)

  const payload: {
    slug: string
    name?: string
    newSlug?: string
    brandSlug?: string
    status?: boolean
    imagePath?: string | null
    iconId?: string | null
    fuelType?: string[]
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

  const existingImagePath = extractModelImagePath(model.image, model.image_path)
  if (values.imagePath !== existingImagePath) {
    payload.imagePath = values.imagePath ? values.imagePath : null
    hasChanges = true
  }

  const existingFuelTypes = Array.isArray(model.fuel_type) ? model.fuel_type : []
  if (JSON.stringify(sanitizedFuelTypes) !== JSON.stringify(existingFuelTypes)) {
    payload.fuelType = sanitizedFuelTypes
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
  const sanitizedFuelTypes = sanitizeFuelTypes(values.fuelTypes)

  return {
    errors,
    trimmedName,
    sanitizedSlug,
    sanitizedIcon,
    sanitizedFuelTypes,
  }
}
