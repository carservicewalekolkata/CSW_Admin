import { useCallback } from 'react'

import type { Brand } from '@/types/brands'
import type { BrandFormModalState } from '@/types/brandsPage'
import useBrandFormState from '@/hooks/useBrandFormState'
import useBrandIconUpload from '@/hooks/useBrandIconUpload'
import useBrandFormSubmission from '@/hooks/useBrandFormSubmission'
import {
  useCreateBrandMutation,
  useUpdateBrandMutation,
} from '@/store/slices/brands/brandsSlice'

type UseBrandFormParams = {
  page: number
  setPage: (value: number) => void
  // refreshBrands: (nextPage: number) => Promise<void>
}

export const useBrandForm = ({ 
  page, 
  setPage, 
  // refreshBrands 
}: UseBrandFormParams): BrandFormModalState => {
  const formState = useBrandFormState()
  const [createBrand, { isLoading: isCreating }] = useCreateBrandMutation()
  const [updateBrand, { isLoading: isUpdating }] = useUpdateBrandMutation()

  const { handleSubmit, isSubmitting } = useBrandFormSubmission({
    formState,
    createBrand,
    isCreating,
    updateBrand,
    isUpdating,
    page,
    setPage,
    // refreshBrands,
    closeForm: formState.close,
  })

  const uploadIcon = useBrandIconUpload({
    setIconId: (value) => formState.updateField('icon', value),
    setIconPreviewUrl: formState.setIconPreviewUrl,
    setIconUploadError: formState.setIconUploadError,
    setIsUploadingIcon: formState.setIsUploadingIcon,
  })

  const openEdit = useCallback(
    (brand: Brand) => {
      formState.openEdit(brand)
    },
    [formState],
  )

  const removeIcon = () => {
    formState.updateField('icon', '')
    formState.setIconPreviewUrl(null)
    formState.setIconUploadError(null)
  }

  return {
    mode: formState.mode,
    values: formState.values,
    errors: formState.errors,
    isSubmitting,
    isUploadingIcon: formState.isUploadingIcon,
    iconPreviewUrl: formState.iconPreviewUrl,
    iconUploadError: formState.iconUploadError,
    openCreate: formState.openCreate,
    openEdit,
    close: formState.close,
    onNameChange: formState.setName,
    onSlugChange: formState.setSlug,
    onStatusChange: (checked: boolean) => formState.updateField('status', checked),
    onIconChange: (value: string) => {
      const trimmed = value.trim()
      formState.updateField('icon', trimmed)
      formState.setIconPreviewUrl(trimmed.length === 24 ? `/api/v1/cars/brands/icon/${trimmed}` : null)
    },
    onIconFileSelected: uploadIcon,
    onRemoveIcon: removeIcon,
    onSubmit: handleSubmit,
  }
}

export default useBrandForm
