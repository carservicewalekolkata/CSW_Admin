export type ServiceStatusFilter = 'active' | 'inactive'
export type ServiceSortOrder = 'asc' | 'desc'

export interface Service {
  id: string
  name: string
  category_id: number
  category_name: string
  service_images: string[]
  thumbnail: string | null
  description: string | null
  features: string[]
  time_taken: string | null
  warranty: string | null
  status: boolean
  created_date: string | null
  updated_date: string | null
}

export type ServiceQuery = {
  search?: string
  category?: string
  status?: ServiceStatusFilter
  sortUpdated?: ServiceSortOrder
  page?: number
  limit?: number
}

export type ServiceResponse = {
  success: boolean
  count: number
  total: number
  page: number
  limit: number
  cacheKey?: string
  timestamp: string
  data: Service[]
}
