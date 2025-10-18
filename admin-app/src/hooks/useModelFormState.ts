import { useState } from 'react'

import type { Model } from '@/types/models'
import type { ModelFormService, ModelFormValues } from '@/types/modelsPage'
import {
  extractModelIconId,
  extractModelImagePath,
  mapModelServicesToForm,
  slugifyModel,
} from '@/utils/models'

const createEmptyFormValues = (brandSlug = ''): ModelFormValues => ({
  name: '',
  slug: '',
  brandSlug,
  status: true,
  imagePath: '',
  iconId: '',
  services: [],
})

export const useModelFormState = (defaultBrandSlug: string) => {
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [values, setValues] = useState<ModelFormValues>(() => createEmptyFormValues(defaultBrandSlug))
  const [errors, setErrors] = useState<Partial<Record<keyof ModelFormValues, string>>>({})
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [slugDirty, setSlugDirty] = useState(false)

  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null)
  const [iconUploadError, setIconUploadError] = useState<string | null>(null)
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const openCreate = (brandSlug: string) => {
    setValues(createEmptyFormValues(brandSlug))
    setErrors({})
    setSlugDirty(false)
    setEditingModel(null)
    setIconPreviewUrl(null)
    setIconUploadError(null)
    setIsUploadingIcon(false)
    setImagePreviewUrl(null)
    setImageUploadError(null)
    setIsUploadingImage(false)
    setMode('create')
  }

  const openEdit = (model: Model, brandSlug: string) => {
    setEditingModel(model)
    setValues({
      name: model.name,
      slug: model.slug,
      brandSlug,
      status: model.status,
      imagePath: extractModelImagePath(model.image, model.image_path),
      iconId: extractModelIconId(model.thumbnail),
      services: mapModelServicesToForm(model),
    })
    setErrors({})
    setSlugDirty(true)
    setIconPreviewUrl(model.thumbnail)
    setIconUploadError(null)
    setIsUploadingIcon(false)
    setImagePreviewUrl(model.image)
    setImageUploadError(null)
    setIsUploadingImage(false)
    setMode('edit')
  }

  const close = () => {
    setMode(null)
    setEditingModel(null)
    setErrors({})
    setSlugDirty(false)
    setIconPreviewUrl(null)
    setIconUploadError(null)
    setIsUploadingIcon(false)
    setImagePreviewUrl(null)
    setImageUploadError(null)
    setIsUploadingImage(false)
  }

  const updateField = <K extends keyof ModelFormValues>(key: K, value: ModelFormValues[K]) => {
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
        next.slug = slugifyModel(value)
      }
      return next
    })
  }

  const setSlug = (value: string) => {
    setSlugDirty(true)
    setValues((prev) => ({ ...prev, slug: slugifyModel(value) }))
  }

  const setServices = (services: ModelFormService[]) => {
    setValues((prev) => ({ ...prev, services }))
  }

  return {
    mode,
    values,
    errors,
    editingModel,
    slugDirty,
    iconPreviewUrl,
    iconUploadError,
    isUploadingIcon,
    imagePreviewUrl,
    imageUploadError,
    isUploadingImage,
    setErrors,
    setIconPreviewUrl,
    setIconUploadError,
    setIsUploadingIcon,
    setImagePreviewUrl,
    setImageUploadError,
    setIsUploadingImage,
    openCreate,
    openEdit,
    close,
    updateField,
    setName,
    setSlug,
    setServices,
  }
}

export type UseModelFormStateReturn = ReturnType<typeof useModelFormState>

export default useModelFormState
