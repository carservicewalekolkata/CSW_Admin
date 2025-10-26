import type { FormEvent } from 'react'

import type { BrandSortStatus, BrandSortUpdated, Model } from './models'
import type { Service } from './services'
import type { ServiceCategory } from './serviceCategories'

export type ModelFormService = {
  serviceId: string
  serviceName: string
  fuelType: string
  discount: string
  originalPrice: string
  discountPrice: string
}

export type ModelFormValues = {
  name: string
  slug: string
  brandSlug: string
  status: boolean
  imagePath: string
  iconId: string
  fuelTypes: string[]
  services: ModelFormService[]
}

export type ModelServicePickerState = {
  categoryId: string
  serviceId: string
  fuelType: string
  discount: string
  originalPrice: string
  discountPrice: string
}

export type ModelFiltersState = {
  searchName: string
  slug: string
  brand: string
  statusSort: BrandSortStatus
  dateSort: BrandSortUpdated
  pageSize: number
  safePage: number
  totalPages: number
  total: number
  startIndex: number
  endIndex: number
  brandFilterOptions: string[]
  onNameChange: (value: string) => void
  onSlugChange: (value: string) => void
  onBrandChange: (value: string) => void
  onStatusChange: (value: BrandSortStatus) => void
  onSortChange: (value: BrandSortUpdated) => void
  onPageSizeChange: (value: number) => void
  onPrevPage: () => void
  onNextPage: () => void
}

export type ModelFormModalState = {
  mode: 'create' | 'edit' | null
  values: ModelFormValues
  errors: Partial<Record<keyof ModelFormValues, string>>
  isSubmitting: boolean
  isUploadingIcon: boolean
  isUploadingImage: boolean
  iconPreviewUrl: string | null
  iconUploadError: string | null
  imagePreviewUrl: string | null
  imageUploadError: string | null
  brandOptions: { slug: string; name: string }[]
  categoryOptions: ServiceCategory[]
  serviceOptions: Service[]
  fuelOptions: string[]
  servicePicker: ModelServicePickerState
  servicePickerError: string | null
  isFetchingServices: boolean
  openCreate: () => void
  openEdit: (model: Model) => void
  close: () => void
  onNameChange: (value: string) => void
  onSlugChange: (value: string) => void
  onBrandChange: (value: string) => void
  onStatusChange: (value: boolean) => void
  onIconIdChange: (value: string) => void
  onImagePathChange: (value: string) => void
  onAddFuelType: (value: string) => void
  onRemoveFuelType: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onIconFileSelected: (file: File) => Promise<void>
  onImageFileSelected: (file: File) => Promise<void>
  onRemoveIcon: () => void
  onRemoveImage: () => void
  onServiceCategoryChange: (categoryId: string) => Promise<void>
  onServiceChange: (serviceId: string) => void
  onServiceFieldChange: (
    field: keyof Omit<ModelServicePickerState, 'categoryId' | 'serviceId'>,
    value: string,
  ) => void
  onAddService: () => void
  onRemoveService: (index: number) => void
  onServiceValueChange: (
    index: number,
    field: keyof Omit<ModelFormService, 'serviceId' | 'serviceName'>,
    value: string,
  ) => void
}

export type ModelDeleteModalState = {
  target: Model | null
  isDeleting: boolean
  request: (model: Model) => void
  cancel: () => void
  confirm: () => Promise<void>
}

export type ModelServicesPreviewState = {
  model: Model | null
  open: (model: Model) => void
  close: () => void
}

export type ModelFuelModalState = {
  model: Model | null
  open: (model: Model) => void
  close: () => void
  onSave: (fuelTypes: string[]) => Promise<void>
  isSaving: boolean
}

export type UseModelsPageResult = {
  items: Model[]
  isTableLoading: boolean
  bannerError: string | null
  filters: ModelFiltersState
  formModal: ModelFormModalState
  deleteModal: ModelDeleteModalState
  servicesPreview: ModelServicesPreviewState
  fuelModal: ModelFuelModalState
}
