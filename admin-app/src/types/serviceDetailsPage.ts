import type { FormEvent } from 'react'

import type { Service } from './services'

export type StatusFilterOption = 'all' | 'active' | 'inactive'

export type ServiceCategoryOption = {
  id: string
  name: string
}

export type ServiceFiltersState = {
  searchTerm: string
  categoryId: string
  status: StatusFilterOption
  dateSort: 'asc' | 'desc'
  pageSize: number
  safePage: number
  totalPages: number
  total: number
  startIndex: number
  endIndex: number
  categoryOptions: ServiceCategoryOption[]
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onStatusChange: (value: StatusFilterOption) => void
  onSortChange: (value: 'asc' | 'desc') => void
  onPageSizeChange: (value: number) => void
  onPrevPage: () => void
  onNextPage: () => void
}

export type ServiceFormValues = {
  name: string
  categoryId: string
  status: boolean
  description: string
  featuresText: string
  timeTaken: string
  warranty: string
  imagePath: string
}

export type ServiceFormModalState = {
  mode: 'create' | 'edit' | null
  values: ServiceFormValues
  errors: Partial<Record<keyof ServiceFormValues, string>>
  isSubmitting: boolean
  isUploadingImage: boolean
  imagePreviewUrl: string | null
  imageUploadError: string | null
  categoryOptions: ServiceCategoryOption[]
  openCreate: () => void
  openEdit: (service: Service) => void
  close: () => void
  onFieldChange: <K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onUploadImage: (file: File) => Promise<void>
  onRemoveImage: () => void
}

export type ServiceDeleteModalState = {
  target: Service | null
  isDeleting: boolean
  request: (service: Service) => void
  cancel: () => void
  confirm: () => Promise<void>
}

export type UseServiceDetailsPageResult = {
  items: Service[]
  isTableLoading: boolean
  bannerError: string | null
  filters: ServiceFiltersState
  formModal: ServiceFormModalState
  deleteModal: ServiceDeleteModalState
}
