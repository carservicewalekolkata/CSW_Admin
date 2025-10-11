import { APIEndpoint } from '@/APIEndpoints'
import type { ServiceCategoryQuery, ServiceCategoryResponse } from '@/types/serviceCategories'

const buildUrl = (query?: ServiceCategoryQuery) => {
  const base = APIEndpoint.BackendUrl || '/api'
  const versionPrefix = APIEndpoint.VersionPrefix || '/v1'
  const isAbsolute = /^https?:/i.test(base)
  const sanitizedBase = base.replace(/\/+$/, '')
  const normalizedVersion = (versionPrefix.startsWith('/') ? versionPrefix : `/${versionPrefix}`).replace(
    /\/+$/,
    '',
  )
  const resourcePath = `${normalizedVersion}/services/service-category`
  const target = `${sanitizedBase}${resourcePath}`
  const relativeTarget = target.startsWith('/') ? target : `/${target}`
  const url = isAbsolute ? new URL(target) : new URL(relativeTarget, 'http://localhost')

  if (query) {
    if (query.search) url.searchParams.set('search', query.search)
    if (query.sortUpdated) url.searchParams.set('sortUpdated', query.sortUpdated)
    if (query.page) url.searchParams.set('page', String(query.page))
    if (query.limit) url.searchParams.set('limit', String(query.limit))
  }

  return isAbsolute ? url.toString() : `${url.pathname}${url.search}`
}

export async function fetchServiceCategories(query: ServiceCategoryQuery = {}): Promise<ServiceCategoryResponse> {
  const response = await fetch(buildUrl(query), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Unable to fetch service categories (status ${response.status})`)
  }

  const payload = (await response.json()) as ServiceCategoryResponse
  return payload
}

export async function deleteServiceCategory(id: number): Promise<void> {
  const response = await fetch(buildUrl(), {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  })

  if (!response.ok) {
    throw new Error(`Unable to delete service category (status ${response.status})`)
  }
}

export async function createServiceCategory(name: string) {
  const response = await fetch(buildUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    throw new Error(`Unable to create service category (status ${response.status})`)
  }

  const payload = (await response.json()) as { data?: ServiceCategoryResponse['data'][number] }
  return payload.data
}

export async function updateServiceCategory(id: number, name: string) {
  const response = await fetch(buildUrl(), {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, name }),
  })

  if (!response.ok) {
    throw new Error(`Unable to update service category (status ${response.status})`)
  }

  const payload = (await response.json()) as { data?: ServiceCategoryResponse['data'][number] }
  return payload.data
}

export const serviceCategoriesApi = {
  fetchServiceCategories,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
}
