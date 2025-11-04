import { useCallback, useEffect, useMemo, useState } from 'react'

import { useCreateModelMutation, useUpdateModelMutation } from '@/store/slices/models/modelsSlice'
import type { Model } from '@/types/models'
import type { ServiceCategory } from '@/types/serviceCategories'
import type { ModelFormModalState, ModelServicePickerState } from '@/types/modelsPage'
import useModelFormState from '@/hooks/useModelFormState'
import useModelServicePicker from '@/hooks/useModelServicePicker'
import useModelFormServices from '@/hooks/useModelFormServices'
import useModelFormUploads from '@/hooks/useModelFormUploads'
import useModelFormSubmission from '@/hooks/useModelFormSubmission'
import { sanitizeFuelTypes } from '@/utils/models'

type UseModelFormParams = {
  brandOptions: { slug: string; name: string }[]
  categoryOptions: ServiceCategory[]
  refetchBrands: () => Promise<unknown>
  page: number
  setPage: (value: number) => void
}

const findBrandSlug = (model: Model, brandOptions: { slug: string; name: string }[]) => {
  const match = brandOptions.find(
    (brand) => brand.name.toLowerCase() === model.brand_name.toLowerCase(),
  )
  return match?.slug ?? ''
}

export const useModelForm = ({
  brandOptions,
  categoryOptions,
  refetchBrands,
  page,
  setPage,
}: UseModelFormParams): ModelFormModalState => {
  const defaultBrandSlug = brandOptions[0]?.slug ?? ''
  const formState = useModelFormState(defaultBrandSlug)
  const servicePicker = useModelServicePicker()
  const [servicePickerError, setServicePickerError] = useState<string | null>(null)
  const fuelOptions = useMemo(() => formState.values.fuelTypes, [formState.values.fuelTypes])

  const [createModel, { isLoading: isCreating }] = useCreateModelMutation()
  const [updateModel, { isLoading: isUpdating }] = useUpdateModelMutation()

  const resetPicker = useCallback(() => {
    servicePicker.reset()
    setServicePickerError(null)
  }, [servicePicker])

  const openCreate = useCallback(() => {
    void refetchBrands()
    formState.openCreate(defaultBrandSlug)
    resetPicker()
  }, [defaultBrandSlug, formState, refetchBrands, resetPicker])

  const openEdit = useCallback(
    (model: Model) => {
      formState.openEdit(model, findBrandSlug(model, brandOptions))
      resetPicker()
    },
    [brandOptions, formState, resetPicker],
  )

  const close = useCallback(() => {
    formState.close()
    resetPicker()
  }, [formState, resetPicker])

  const { handleSubmit, isSubmitting } = useModelFormSubmission({
    formState,
    createModel,
    isCreating,
    updateModel,
    isUpdating,
    page,
    setPage,
    closeForm: close,
  })

  const {
    selectCategory,
    selectService,
    updatePickerField,
    addService,
    removeService,
    updateServiceValue,
  } = useModelFormServices({
    services: formState.values.services,
    setServices: formState.setServices,
    picker: servicePicker.picker,
    setPicker: servicePicker.setPicker,
    setPickerError: setServicePickerError,
    serviceOptions: servicePicker.serviceOptions,
    loadServices: servicePicker.loadServices,
  })

  const uploads = useModelFormUploads(
    {
      setIconId: (value) => formState.updateField('iconId', value),
      setIconPreviewUrl: formState.setIconPreviewUrl,
      setIconUploadError: formState.setIconUploadError,
      setIsUploadingIcon: formState.setIsUploadingIcon,
    },
    {
      setImagePath: (value) => formState.updateField('imagePath', value),
      setImagePreviewUrl: formState.setImagePreviewUrl,
      setImageUploadError: formState.setImageUploadError,
      setIsUploadingImage: formState.setIsUploadingImage,
    },
  )

  const onIconIdChange = (value: string) => {
    const trimmed = value.trim()
    formState.updateField('iconId', trimmed)
    formState.setIconPreviewUrl(trimmed.length === 24 ? `/api/v1/cars/models/icon/${trimmed}` : null)
  }

  const onImagePathChange = (value: string) => {
    const trimmed = value.trim()
    formState.updateField('imagePath', trimmed)
    if (!trimmed) {
      formState.setImagePreviewUrl(null)
    } else if (trimmed.startsWith('azure:')) {
      const blobName = trimmed.slice('azure:'.length)
      if (blobName) {
        const encoded = blobName.split('/').map(encodeURIComponent).join('/')
        formState.setImagePreviewUrl(`/api/v1/cars/models/image/blob/${encoded}`)
      } else {
        formState.setImagePreviewUrl(null)
      }
    } else if (/^https?:\/\//i.test(trimmed)) {
      formState.setImagePreviewUrl(trimmed)
    } else {
      formState.setImagePreviewUrl(`/${trimmed.replace(/^\/+/, '')}`)
    }
  }

  const onServiceCategoryChange = async (categoryId: string) => {
    setServicePickerError(null)
    await selectCategory(categoryId)
  }

  const onServiceChange = (serviceId: string) => {
    setServicePickerError(null)
    selectService(serviceId)
  }

  const onAddFuelType = useCallback(
    (value: string) => {
      const next = sanitizeFuelTypes([...formState.values.fuelTypes, value])
      formState.setFuelTypes(next)
    },
    [formState],
  )

  const onRemoveFuelType = useCallback(
    (value: string) => {
      formState.setFuelTypes(formState.values.fuelTypes.filter((fuel) => fuel !== value))
    },
    [formState],
  )

  useEffect(() => {
    if (
      servicePicker.picker.fuelType &&
      !fuelOptions.some((fuel) => fuel === servicePicker.picker.fuelType)
    ) {
      servicePicker.setPicker((prev) => ({ ...prev, fuelType: '' }))
    }
  }, [fuelOptions, servicePicker])

  return {
    mode: formState.mode,
    values: formState.values,
    errors: formState.errors,
    isSubmitting,
    isUploadingIcon: formState.isUploadingIcon,
    isUploadingImage: formState.isUploadingImage,
    iconPreviewUrl: formState.iconPreviewUrl,
    iconUploadError: formState.iconUploadError,
    imagePreviewUrl: formState.imagePreviewUrl,
    imageUploadError: formState.imageUploadError,
    brandOptions,
    categoryOptions,
    serviceOptions: servicePicker.serviceOptions,
    fuelOptions,
    servicePicker: servicePicker.picker,
    servicePickerError,
    isFetchingServices: servicePicker.isFetchingServices,
    openCreate,
    openEdit,
    close,
    onNameChange: formState.setName,
    onSlugChange: formState.setSlug,
    onBrandChange: (value: string) => formState.updateField('brandSlug', value),
    onStatusChange: (checked: boolean) => formState.updateField('status', checked),
    onIconIdChange,
    onImagePathChange,
    onAddFuelType,
    onRemoveFuelType,
    onSubmit: handleSubmit,
    onIconFileSelected: uploads.handleIconFileSelected,
    onImageFileSelected: uploads.handleImageFileSelected,
    onRemoveIcon: () => {
      formState.updateField('iconId', '')
      formState.setIconPreviewUrl(null)
      formState.setIconUploadError(null)
    },
    onRemoveImage: () => {
      formState.updateField('imagePath', '')
      formState.setImagePreviewUrl(null)
      formState.setImageUploadError(null)
    },
    onServiceCategoryChange,
    onServiceChange,
    onServiceFieldChange: (
      field: keyof Omit<ModelServicePickerState, 'categoryId' | 'serviceId'>,
      value: string,
    ) => updatePickerField(field, value),
    onAddService: addService,
    onRemoveService: removeService,
    onServiceValueChange: updateServiceValue,
  }
}

export default useModelForm
