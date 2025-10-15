import { NextResponse } from 'next/server'

const FALLBACK_ALLOWED_ORIGINS = [
  'https://carservicewale.com',
  'https://www.carservicewale.com',
]

const configuredOrigins = process.env.PUBLIC_CORS_ORIGINS
  ? process.env.PUBLIC_CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : []

const ALLOWED_ORIGINS = configuredOrigins.length > 0 ? configuredOrigins : FALLBACK_ALLOWED_ORIGINS

const isOriginAllowed = (origin: string | null): string | null => {
  if (!origin) {
    return null
  }

  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes('*')) {
    return origin
  }

  return ALLOWED_ORIGINS.includes(origin) ? origin : null
}

const ensureVaryHeader = (response: NextResponse, value: string) => {
  const existing = response.headers.get('Vary')
  if (existing) {
    if (!existing.split(',').map((item) => item.trim()).includes(value)) {
      response.headers.set('Vary', `${existing}, ${value}`)
    }
  } else {
    response.headers.set('Vary', value)
  }
}

export const applyCors = (request: Request, response: NextResponse) => {
  const origin = request.headers.get('origin')
  const allowedOrigin = isOriginAllowed(origin)

  if (allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    ensureVaryHeader(response, 'Origin')
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS')
  const requestedHeaders =
    request.headers.get('access-control-request-headers') ?? 'Content-Type, Authorization'
  response.headers.set('Access-Control-Allow-Headers', requestedHeaders)

  if (origin && !allowedOrigin) {
    console.warn('[CORS] Blocked origin:', origin, 'Allowed:', ALLOWED_ORIGINS.join(', '))
  }

  return response
}

export const corsPreflight = (request: Request) => {
  const response = new NextResponse(null, {
    status: 204,
  })
  return applyCors(request, response)
}
