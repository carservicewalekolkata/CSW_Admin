import { APIEndpoint } from '@/APIEndpoints'
import type { ServiceQuery, ServiceResponse } from '@/types/services'

const buildUrl = (query?: ServiceQuery) => {
  const base = APIEndpoint.BackendUrl || '/api'
  const versionPrefix = APIEndpoint.VersionPrefix || '/v1'
  const isAbsolute = /^https?:/i.test(base)
  const sanitizedBase = base.replace(/\/+$/, '')
  const normalizedVersion = (versionPrefix.startsWith('/') ? versionPrefix : `/${versionPrefix}`).replace(
    /\/+$/,
    '',
  )
  const resourcePath = `${normalizedVersion}/services/details`
  const target = `${sanitizedBase}${resourcePath}`
  const relativeTarget = target.startsWith('/') ? target : `/${target}`
  const url = isAbsolute ? new URL(target) : new URL(relativeTarget, 'http://localhost')

  if (query) {
    if (query.search) url.searchParams.set('search', query.search)
    if (query.category) url.searchParams.set('category', query.category)
    if (query.status) url.searchParams.set('status', query.status)
    if (query.sortUpdated) url.searchParams.set('sortUpdated', query.sortUpdated)
    if (query.page) url.searchParams.set('page', String(query.page))
    if (query.limit) url.searchParams.set('limit', String(query.limit))
  }

  return isAbsolute ? url.toString() : `${url.pathname}${url.search}`
}

export async function fetchServices(query: ServiceQuery = {}): Promise<ServiceResponse> {
  const response = await fetch(buildUrl(query), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Unable to fetch services (status ${response.status})`)
  }

  const payload = (await response.json()) as ServiceResponse
  return payload
}

export const servicesApi = {
  fetchServices,
}
