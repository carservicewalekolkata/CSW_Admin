import type { FormEvent } from 'react'

import type { ServiceCategory, ServiceCategoryType } from './serviceCategories'

export type FiltersState = {
  searchTerm: string
  dateSort: 'asc' | 'desc'
  pageSize: number
  safePage: number
  totalPages: number
  total: number
  startIndex: number
  endIndex: number
  onSearchChange: (value: string) => void
  onSortChange: (value: 'asc' | 'desc') => void
  onPageSizeChange: (value: number) => void
  onPrevPage: () => void
  onNextPage: () => void
}

export type CreateModalState = {
  isOpen: boolean
  name: string
  description: string
  type: ServiceCategoryType
  error: string | null
  isSubmitting: boolean
  open: () => void
  close: () => void
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onTypeChange: (value: ServiceCategoryType) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export type EditModalState = {
  isOpen: boolean
  target: ServiceCategory | null
  name: string
  description: string
  type: ServiceCategoryType
  error: string | null
  isSubmitting: boolean
  open: (category: ServiceCategory) => void
  close: () => void
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onTypeChange: (value: ServiceCategoryType) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export type DeleteModalState = {
  target: ServiceCategory | null
  request: (category: ServiceCategory) => void
  cancel: () => void
  confirm: () => Promise<void>
}

export type UseServiceCategoriesPageResult = {
  items: ServiceCategory[]
  isTableLoading: boolean
  bannerError: string | null
  filters: FiltersState
  createModal: CreateModalState
  editModal: EditModalState
  deleteModal: DeleteModalState
}
