import type { BrandSortStatus, BrandSortUpdated } from './brands'

export type { BrandSortStatus, BrandSortUpdated } from './brands'

export interface ModelService {
  services_id: string
  name: string | null
  time_taken: string | null
  discount: number
  original_price: number
  discount_price: number
}

export interface Model {
  id: number
  name: string
  slug: string
  brand_id: number
  brand_name: string
  body_type: string | null
  fuel_type: string[]
  thumbnail: string | null
  image: string | null
  services: ModelService[]
  status: boolean
  created_date: string | null
  updated_date: string | null
}

export type ModelQuery = {
  search?: string
  slug?: string
  brand?: string
  bodyType?: string
  fuel?: string
  sortStatus?: BrandSortStatus
  sortUpdated?: BrandSortUpdated
  page?: number
  limit?: number
}

export type ModelResponse = {
  success: boolean
  count: number
  total: number
  page: number
  limit: number
  cacheKey?: string
  timestamp: string
  data: Model[]
}

export type ModelServiceInput = {
  serviceId: string
  discount?: number
  originalPrice?: number
  discountPrice?: number
}

export type CreateModelRequest = {
  name: string
  brandSlug: string
  slug?: string
  bodyType?: string | null
  fuelType?: string[]
  status?: boolean
  imagePath?: string | null
  iconId?: string | null
  services?: ModelServiceInput[]
}

export type UpdateModelRequest = {
  slug: string
  name?: string
  newSlug?: string
  brandSlug?: string
  bodyType?: string | null
  fuelType?: string[]
  status?: boolean
  imagePath?: string | null
  iconId?: string | null
  previousIconId?: string
  previousImagePath?: string
  services?: ModelServiceInput[]
}

export type ModelMutationResponse = {
  success: boolean
  message?: string
  data?: Model
}
