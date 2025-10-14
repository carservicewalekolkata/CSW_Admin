import { unstable_cache } from 'next/cache'

import { versionedJson } from '@/server/apiVersion'
import { applyCors, corsPreflight } from '@/server/cors'
import { connectToDatabase } from '@/lib/db'
import { getServiceModel } from '@/models'

type RawService = {
  _id: unknown
  name: unknown
  category_id: unknown
  category_name: unknown
  service_images?: unknown
  thumbnail?: unknown
  description?: unknown
  features?: unknown
  time_taken?: unknown
  warranty?: unknown
  status?: unknown
  created_date?: Date | string
  updated_date?: Date | string
}

type QueryParams = {
  search?: string
  category?: number
  status?: 'active' | 'inactive'
  sortUpdated?: 'asc' | 'desc'
  page?: number
  limit?: number
}

const normalizeDate = (value?: Date | string): string | null => {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const parseNumber = (value: string | null, fallback: number, min = 1, max = 100) => {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  const constrained = Math.floor(parsed)
  if (Number.isNaN(constrained)) {
    return fallback
  }

  return Math.min(max, Math.max(min, constrained))
}

const parseCategoryId = (value: string | null): number | undefined => {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const normalizeObjectId = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object' && value !== null) {
    const candidate = value as { toHexString?: () => string; toString?: () => string }
    if (typeof candidate.toHexString === 'function') {
      return candidate.toHexString()
    }
    if (typeof candidate.toString === 'function') {
      return candidate.toString()
    }
  }

  return ''
}

const sanitizeNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

const buildCacheKey = ({ search, category, status, sortUpdated, page, limit }: QueryParams) =>
  JSON.stringify({ search, category, status, sortUpdated, page, limit })

const getServicesCached = unstable_cache(
  async (params: QueryParams) => {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const Service = getServiceModel(connection)

    const {
      search: searchTerm,
      category,
      status,
      sortUpdated = 'desc',
      page = 1,
      limit = 10,
    } = params

    const filters: Record<string, unknown> = {}

    if (searchTerm?.trim()) {
      filters.name = { $regex: searchTerm.trim(), $options: 'i' }
    }

    if (typeof category === 'number' && Number.isFinite(category)) {
      filters.category_id = category
    }

    if (status === 'active') {
      filters.status = true
    } else if (status === 'inactive') {
      filters.status = false
    }

    const sort: Record<string, 1 | -1> = {
      updated_date: sortUpdated === 'asc' ? 1 : -1,
      created_date: sortUpdated === 'asc' ? 1 : -1,
    }

    const skip = (page - 1) * limit

    const [results, total] = await Promise.all([
      Service.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select([
          '_id',
          'name',
          'category_id',
          'category_name',
          'service_images',
          'thumbnail',
          'description',
          'features',
          'time_taken',
          'warranty',
          'status',
          'created_date',
          'updated_date',
        ])
        .lean<RawService[]>(),
      Service.countDocuments(filters),
    ])

    return { results, total }
  },
  ['services-query-cache'],
  { revalidate: 60, tags: ['services'] },
)

export const GET = async (request: Request) => {
  try {
    const url = new URL(request.url)
    const searchParams = url.searchParams

    const statusParam = searchParams.get('status')
    const status = statusParam === 'active' || statusParam === 'inactive' ? statusParam : undefined

    const query: QueryParams = {
      search: searchParams.get('search') || undefined,
      category: parseCategoryId(searchParams.get('category')),
      status,
      sortUpdated: (searchParams.get('sortUpdated') as QueryParams['sortUpdated']) ?? 'desc',
      page: parseNumber(searchParams.get('page'), 1),
      limit: parseNumber(searchParams.get('limit'), 10, 1, 100),
    }

    const cacheKey = buildCacheKey(query)
    const { results, total } = await getServicesCached(query)

    const data = results.map((service) => ({
      id: normalizeObjectId(service._id),
      name: typeof service.name === 'string' ? service.name : '',
      category_id:
        typeof service.category_id === 'number' && Number.isFinite(service.category_id)
          ? service.category_id
          : 0,
      category_name: typeof service.category_name === 'string' ? service.category_name : '',
      service_images: sanitizeStringArray(service.service_images),
      thumbnail: sanitizeNullableString(service.thumbnail) ?? null,
      description: sanitizeNullableString(service.description),
      features: sanitizeStringArray(service.features),
      time_taken: sanitizeNullableString(service.time_taken),
      warranty: sanitizeNullableString(service.warranty),
      status: Boolean(service.status ?? true),
      created_date: normalizeDate(service.created_date),
      updated_date: normalizeDate(service.updated_date),
    }))

    return applyCors(
      request,
      versionedJson(
        {
          success: true,
          count: data.length,
          total,
          page: query.page,
          limit: query.limit,
          cacheKey,
          timestamp: new Date().toISOString(),
          data,
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=60',
          },
        },
      ),
    )
  } catch (error) {
    console.error('❌ Error in /api/v1/services/details:', error)

    const message = error instanceof Error ? error.message : 'Internal Server Error'

    return applyCors(
      request,
      versionedJson(
        {
          success: false,
          message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      ),
    )
  }
}

export const OPTIONS = (request: Request) => corsPreflight(request)
