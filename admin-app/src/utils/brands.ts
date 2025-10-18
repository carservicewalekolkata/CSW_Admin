import type { Brand } from '@/types/brands'
import type { BrandFormValues } from '@/types/brandsPage'

export const formatBrandDate = (value: string | null) => {
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

export const slugifyBrand = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

export const extractBrandIconId = (icon: string | null) => {
  if (!icon) return ''
  const path = (icon.split('?')[0] ?? icon).trim()
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? ''
}

export const resolveBrandErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return (error as { message: string }).message
    }

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

export const buildBrandFormErrors = (values: BrandFormValues) => {
  const errors: Partial<Record<keyof BrandFormValues, string>> = {}
  const trimmedName = values.name.trim()
  const sanitizedSlug = slugifyBrand(values.slug || trimmedName)

  if (!trimmedName) {
    errors.name = 'Name is required'
  }

  if (!sanitizedSlug) {
    errors.slug = 'Slug is required'
  }

  const iconTrimmed = values.icon.trim()
  if (iconTrimmed && iconTrimmed.length !== 24) {
    errors.icon = 'Icon must be a 24-character ObjectId'
  }

  return {
    errors,
    trimmedName,
    sanitizedSlug,
    iconTrimmed,
  }
}

export const buildBrandUpdatePayload = (values: BrandFormValues, brand: Brand) => {
  const { trimmedName, sanitizedSlug, iconTrimmed } = buildBrandFormErrors(values)

  const payload: {
    slug: string
    name?: string
    newSlug?: string
    status?: boolean
    icon?: string | null
    previousIconId?: string
  } = { slug: brand.slug }

  let hasChanges = false

  if (trimmedName !== brand.name) {
    payload.name = trimmedName
    hasChanges = true
  }

  if (sanitizedSlug !== brand.slug) {
    payload.newSlug = sanitizedSlug
    hasChanges = true
  }

  if (values.status !== brand.status) {
    payload.status = values.status
    hasChanges = true
  }

  const existingIconId = extractBrandIconId(brand.icon)
  if (iconTrimmed && iconTrimmed.length === 24 && iconTrimmed !== existingIconId) {
    payload.icon = iconTrimmed
    payload.previousIconId = existingIconId || undefined
    hasChanges = true
  } else if (!iconTrimmed && existingIconId) {
    payload.icon = null
    payload.previousIconId = existingIconId
    hasChanges = true
  }

  return { payload, hasChanges, trimmedName, sanitizedSlug }
}
