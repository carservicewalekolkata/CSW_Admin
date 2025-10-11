import { APIEndpoint } from '@/APIEndpoints'

export const buildApiUrl = (path: string) => {
  const base = APIEndpoint.BackendUrl || '/api'
  const sanitizedBase = base.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${sanitizedBase}${normalizedPath}`
}
