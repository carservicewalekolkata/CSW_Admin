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
  timestamp: string
  data: Service[]
}

export type CreateServiceRequest = {
  name: string
  categoryId: number
  description?: string | null
  features?: string[]
  timeTaken?: string | null
  warranty?: string | null
  status?: boolean
  imagePath?: string | null
}

export type UpdateServiceRequest = {
  id: string
  name?: string
  categoryId?: number
  description?: string | null
  features?: string[]
  timeTaken?: string | null
  warranty?: string | null
  status?: boolean
  imagePath?: string | null
  previousImagePath?: string
}

export type ServiceMutationResponse = {
  success: boolean
  message?: string
  data?: Service
}
