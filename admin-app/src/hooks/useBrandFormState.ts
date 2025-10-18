import { useState } from 'react'

import type { Brand } from '@/types/brands'
import type { BrandFormValues } from '@/types/brandsPage'
import { extractBrandIconId, slugifyBrand } from '@/utils/brands'

const createEmptyFormValues = (): BrandFormValues => ({
  name: '',
  slug: '',
  status: true,
  icon: '',
})

export const useBrandFormState = () => {
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [values, setValues] = useState<BrandFormValues>(() => createEmptyFormValues())
  const [errors, setErrors] = useState<Partial<Record<keyof BrandFormValues, string>>>({})
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [slugDirty, setSlugDirty] = useState(false)

  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null)
  const [iconUploadError, setIconUploadError] = useState<string | null>(null)
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)

  const openCreate = () => {
    setValues(createEmptyFormValues())
    setErrors({})
    setSlugDirty(false)
    setEditingBrand(null)
    setIconPreviewUrl(null)
    setIconUploadError(null)
    setIsUploadingIcon(false)
    setMode('create')
  }

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand)
    setValues({
      name: brand.name,
      slug: brand.slug,
      status: brand.status,
      icon: extractBrandIconId(brand.icon),
    })
    setErrors({})
    setSlugDirty(true)
    setIconPreviewUrl(brand.icon ?? null)
    setIconUploadError(null)
    setIsUploadingIcon(false)
    setMode('edit')
  }

  const close = () => {
    setMode(null)
    setEditingBrand(null)
    setErrors({})
    setSlugDirty(false)
    setIconPreviewUrl(null)
    setIconUploadError(null)
    setIsUploadingIcon(false)
  }

  const updateField = <K extends keyof BrandFormValues>(key: K, value: BrandFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const setName = (value: string) => {
    setValues((prev) => {
      const next = { ...prev, name: value }
      if (!slugDirty && mode === 'create') {
        next.slug = slugifyBrand(value)
      }
      return next
    })
  }

  const setSlug = (value: string) => {
    setSlugDirty(true)
    setValues((prev) => ({ ...prev, slug: slugifyBrand(value) }))
  }

  return {
    mode,
    values,
    errors,
    editingBrand,
    slugDirty,
    iconPreviewUrl,
    iconUploadError,
    isUploadingIcon,
    setErrors,
    setIconPreviewUrl,
    setIconUploadError,
    setIsUploadingIcon,
    openCreate,
    openEdit,
    close,
    updateField,
    setName,
    setSlug,
  }
}

export type UseBrandFormStateReturn = ReturnType<typeof useBrandFormState>

export default useBrandFormState
