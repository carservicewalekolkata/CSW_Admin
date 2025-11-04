import type { FormEvent } from 'react'

import type { Brand } from '@/types/brands'
import type { BrandSortStatus, BrandSortUpdated } from '@/types/brands'

export type BrandFormValues = {
  name: string
  slug: string
  status: boolean
  icon: string
}

export type BrandFiltersState = {
  searchName: string
  slug: string
  statusSort: BrandSortStatus
  dateSort: BrandSortUpdated
  pageSize: number
  safePage: number
  totalPages: number
  total: number
  startIndex: number
  endIndex: number
  onSearchChange: (value: string) => void
  onSlugChange: (value: string) => void
  onStatusChange: (value: BrandSortStatus) => void
  onSortChange: (value: BrandSortUpdated) => void
  onPageSizeChange: (value: number) => void
  onPrevPage: () => void
  onNextPage: () => void
}

export type BrandFormModalState = {
  mode: 'create' | 'edit' | null
  values: BrandFormValues
  errors: Partial<Record<keyof BrandFormValues, string>>
  isSubmitting: boolean
  isUploadingIcon: boolean
  iconPreviewUrl: string | null
  iconUploadError: string | null
  openCreate: () => void
  openEdit: (brand: Brand) => void
  close: () => void
  onNameChange: (value: string) => void
  onSlugChange: (value: string) => void
  onStatusChange: (checked: boolean) => void
  onIconChange: (value: string) => void
  onIconFileSelected: (file: File) => Promise<void>
  onRemoveIcon: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export type BrandDeleteModalState = {
  target: Brand | null
  isDeleting: boolean
  request: (brand: Brand) => void
  cancel: () => void
  confirm: () => Promise<void>
}

export type UseBrandsPageResult = {
  items: Brand[]
  isTableLoading: boolean
  bannerError: string | null
  filters: BrandFiltersState
  formModal: BrandFormModalState
  deleteModal: BrandDeleteModalState
}
