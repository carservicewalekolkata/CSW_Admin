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
