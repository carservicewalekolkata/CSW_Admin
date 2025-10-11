import { APIEndpoint } from '@/APIEndpoints'
import type { ModelQuery, ModelResponse } from '@/types/models'

const buildUrl = (query?: ModelQuery) => {
  const base = APIEndpoint.BackendUrl || '/api'
  const isAbsolute = /^https?:/i.test(base)
  const url = isAbsolute
    ? new URL('/cars/models', base)
    : new URL(`${base.replace(/\/$/, '')}/cars/models`, 'http://localhost')

  if (query) {
    if (query.search) url.searchParams.set('search', query.search)
    if (query.slug) url.searchParams.set('slug', query.slug)
    if (query.brand) url.searchParams.set('brand', query.brand)
    if (query.bodyType) url.searchParams.set('bodyType', query.bodyType)
    if (query.fuel) url.searchParams.set('fuel', query.fuel)
    if (query.sortStatus) url.searchParams.set('sortStatus', query.sortStatus)
    if (query.sortUpdated) url.searchParams.set('sortUpdated', query.sortUpdated)
    if (query.page) url.searchParams.set('page', String(query.page))
    if (query.limit) url.searchParams.set('limit', String(query.limit))
  }

  return isAbsolute ? url.toString() : `${url.pathname}${url.search}`
}

export async function fetchModels(query: ModelQuery = {}): Promise<ModelResponse> {
  const response = await fetch(buildUrl(query), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Unable to fetch models (status ${response.status})`)
  }

  const payload = (await response.json()) as ModelResponse
  return payload
}

export async function deleteModel(slug: string): Promise<void> {
  const response = await fetch(buildUrl(), {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slug }),
  })

  if (!response.ok) {
    throw new Error(`Unable to delete model (status ${response.status})`)
  }
}

export const modelsApi = {
  fetchModels,
  deleteModel,
}
