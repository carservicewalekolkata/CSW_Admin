export interface Brand {
  name: string
  slug: string
  icon: string | null
  status: boolean
  created_date: string | null
  updated_date: string | null
}

export type BrandSortStatus = 'none' | 'active-first' | 'inactive-first'
export type BrandSortUpdated = 'asc' | 'desc'

export type BrandQuery = {
  search?: string
  slug?: string
  sortStatus?: BrandSortStatus
  sortUpdated?: BrandSortUpdated
  page?: number
  limit?: number
}

export type BrandResponse = {
  success: boolean
  count: number
  total: number
  page: number
  limit: number
  cacheKey?: string
  timestamp: string
  data: Brand[]
}

export type CreateBrandRequest = {
  name: string
  slug?: string
  status?: boolean
  icon?: string | null
}

export type UpdateBrandRequest = {
  slug: string
  name?: string
  newSlug?: string
  status?: boolean
  icon?: string | null
  previousIconId?: string
}

export type BrandMutationResponse = {
  success: boolean
  message?: string
  data?: Brand
}

export type BrandIconUploadResponse = {
  success: boolean
  iconId: string
  url: string
  message?: string
}
