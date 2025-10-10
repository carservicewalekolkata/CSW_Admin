import { APIEndpoint } from '@/APIEndpoints'
import type { Brand } from '@/types/brands'

type BrandApiResponse = {
  data: Brand[]
}

const buildUrl = () => {
  const base = APIEndpoint.BackendUrl || '/api'
  return `${base}/cars/brands`
}

export async function fetchBrands(): Promise<Brand[]> {
  const response = await fetch(buildUrl(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Unable to fetch brands (status ${response.status})`)
  }

  const payload = (await response.json()) as BrandApiResponse
  return payload.data
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
