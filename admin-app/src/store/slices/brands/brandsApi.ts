import { APIEndpoint } from '@/APIEndpoints'
import type { BrandQuery, BrandResponse } from '@/types/brands'

const buildUrl = (query?: BrandQuery) => {
  const base = APIEndpoint.BackendUrl || '/api'
  const isAbsolute = /^https?:/i.test(base)
  const url = isAbsolute
    ? new URL('/cars/brands', base)
    : new URL(`${base.replace(/\/?$/, '')}/cars/brands`, 'http://localhost')

  if (query) {
    if (query.search) url.searchParams.set('search', query.search)
    if (query.slug) url.searchParams.set('slug', query.slug)
    if (query.sortStatus) url.searchParams.set('sortStatus', query.sortStatus)
    if (query.sortUpdated) url.searchParams.set('sortUpdated', query.sortUpdated)
    if (query.page) url.searchParams.set('page', String(query.page))
    if (query.limit) url.searchParams.set('limit', String(query.limit))
  }

  return isAbsolute ? url.toString() : `${url.pathname}${url.search}`
}

export async function fetchBrands(query: BrandQuery = {}): Promise<BrandResponse> {
  const response = await fetch(buildUrl(query), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Unable to fetch brands (status ${response.status})`)
  }

  const payload = (await response.json()) as BrandResponse
  return payload
}

export async function deleteBrand(slug: string): Promise<void> {
  const response = await fetch(buildUrl(), {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slug }),
  })

  if (!response.ok) {
    const message = `Unable to delete brand (status ${response.status})`
    throw new Error(message)
  }
}

export const brandsApi = {
  fetchBrands,
  deleteBrand,
}
