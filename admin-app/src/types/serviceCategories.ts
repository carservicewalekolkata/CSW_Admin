import type { BrandSortUpdated } from './brands'

export interface ServiceCategory {
  id: number
  name: string
  created_date: string | null
  updated_date: string | null
}

export type ServiceCategoryQuery = {
  search?: string
  sortUpdated?: BrandSortUpdated
  page?: number
  limit?: number
}

export type ServiceCategoryResponse = {
  success: boolean
  count: number
  total: number
  page: number
  limit: number
  cacheKey?: string
  timestamp: string
  data: ServiceCategory[]
}

export type CreateServiceCategoryRequest = {
  name: string
}

export type UpdateServiceCategoryRequest = {
  id: number
  name: string
}

export type ServiceCategoryMutationResponse = {
  success: boolean
  message?: string
  data?: ServiceCategory
}
