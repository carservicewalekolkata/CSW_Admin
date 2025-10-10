import { revalidateTag, unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'

import { connectToDatabase } from '@/lib/db'
import { getModelModel } from '@/models'
import type { ModelService } from '@/types/models'

type RawModelService = {
  services_id: unknown
  discount: number
  original_price: number
  discount_price: number
}

type RawModel = {
  id: number
  name: string
  slug: string
  brand_id: number
  brand_name: string
  body_type?: string | null
  fuel_type?: string[]
  thumbnail?: unknown
  image?: string | null
  services?: RawModelService[]
  status?: boolean
  created_date?: Date | string
  updated_date?: Date | string
}

type QueryParams = {
  search?: string
  slug?: string
  brand?: string
  bodyType?: string
  fuel?: string
  sortStatus?: 'none' | 'active-first' | 'inactive-first'
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

  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

const normalizeIconId = (icon: unknown): string | null => {
  if (!icon) {
    return null
  }

  if (typeof icon === 'string') {
    return icon
  }

  if (typeof icon === 'object' && icon !== null) {
    const candidate = icon as { toHexString?: () => string; toString?: () => string }
    if (typeof candidate.toHexString === 'function') {
      return candidate.toHexString()
    }
    if (typeof candidate.toString === 'function') {
      return candidate.toString()
    }
  }

  return null
}

const normalizeImagePath = (value?: string | null): string | null => {
  if (!value) {
    return null
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  return `/${value.replace(/^\/+/, '')}`
}

const buildCacheKey = ({
  search,
  slug,
  brand,
  bodyType,
  fuel,
  sortStatus,
  sortUpdated,
  page,
  limit,
}: QueryParams) =>
  JSON.stringify({ search, slug, brand, bodyType, fuel, sortStatus, sortUpdated, page, limit })

const getModelsCached = unstable_cache(
  async (params: QueryParams) => {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const Model = getModelModel(connection)

    const {
      search,
      slug,
      brand,
      bodyType,
      fuel,
      sortStatus = 'none',
      sortUpdated = 'desc',
      page = 1,
      limit = 10,
    } = params

    const filters: Record<string, unknown> = {}

    if (search?.trim()) {
      filters.name = { $regex: search.trim(), $options: 'i' }
    }

    if (slug?.trim()) {
      filters.slug = { $regex: slug.trim(), $options: 'i' }
    }

    if (brand?.trim()) {
      filters.brand_name = { $regex: brand.trim(), $options: 'i' }
    }

    if (bodyType?.trim()) {
      filters.body_type = { $regex: bodyType.trim(), $options: 'i' }
    }

    if (fuel?.trim()) {
      filters.fuel_type = { $regex: fuel.trim(), $options: 'i' }
    }

    const sort: Record<string, 1 | -1> = {}

    if (sortStatus === 'active-first') {
      sort.status = -1
    } else if (sortStatus === 'inactive-first') {
      sort.status = 1
    }

    sort.updated_date = sortUpdated === 'asc' ? 1 : -1
    sort.created_date = sortUpdated === 'asc' ? 1 : -1

    const skip = (page - 1) * limit

    const [results, total] = await Promise.all([
      Model.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select([
          'id',
          'name',
          'slug',
          'brand_id',
          'brand_name',
          'body_type',
          'fuel_type',
          'thumbnail',
          'image',
          'services',
          'status',
          'created_date',
          'updated_date',
        ])
        .lean<RawModel[]>(),
      Model.countDocuments(filters),
    ])

    return { results, total }
  },
  ['models-query-cache'],
  { revalidate: 60, tags: ['models'] },
)

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const searchParams = url.searchParams

    const query: QueryParams = {
      search: searchParams.get('search') || undefined,
      slug: searchParams.get('slug') || undefined,
      brand: searchParams.get('brand') || undefined,
      bodyType: searchParams.get('bodyType') || undefined,
      fuel: searchParams.get('fuel') || undefined,
      sortStatus: (searchParams.get('sortStatus') as QueryParams['sortStatus']) ?? 'none',
      sortUpdated: (searchParams.get('sortUpdated') as QueryParams['sortUpdated']) ?? 'desc',
      page: parseNumber(searchParams.get('page'), 1),
      limit: parseNumber(searchParams.get('limit'), 10, 1, 100),
    }

    const cacheKey = buildCacheKey(query)
    const { results, total } = await getModelsCached(query)

    const data = results.map((model) => {
      const thumbnailId = normalizeIconId(model.thumbnail)
      const services: RawModelService[] = Array.isArray(model.services) ? model.services : []

      return {
        id: model.id,
        name: model.name,
        slug: model.slug,
        brand_id: model.brand_id,
        brand_name: model.brand_name,
        body_type: model.body_type ?? null,
        fuel_type: Array.isArray(model.fuel_type) ? model.fuel_type : [],
        thumbnail: thumbnailId ? `/api/cars/models/icon/${thumbnailId}` : null,
        image: normalizeImagePath(model.image),
        services: services
          .map((service) => {
            const serviceId =
              typeof service.services_id === 'string'
                ? service.services_id
                : service.services_id && typeof (service.services_id as { toString: () => string }).toString === 'function'
                  ? (service.services_id as { toString: () => string }).toString()
                  : null

            if (!serviceId) {
              return null
            }

            return {
              services_id: serviceId,
              discount: Number.isFinite(service.discount) ? Number(service.discount) : 0,
              original_price: Number.isFinite(service.original_price) ? Number(service.original_price) : 0,
              discount_price: Number.isFinite(service.discount_price) ? Number(service.discount_price) : 0,
            } satisfies ModelService
          })
          .filter((service): service is ModelService => service !== null),
        status: Boolean(model.status),
        created_date: normalizeDate(model.created_date),
        updated_date: normalizeDate(model.updated_date),
      }
    })

    return NextResponse.json(
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
    )
  } catch (error: unknown) {
    console.error('❌ Error in /api/cars/models:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'

    return NextResponse.json(
      {
        success: false,
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const payload = await request.json().catch(() => null)
    const slug =
      typeof payload?.slug === 'string' ? payload.slug.trim().toLowerCase() : undefined

    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Model slug is required' },
        { status: 400 },
      )
    }

    const Model = getModelModel(connection)
    const deleted = await Model.findOneAndDelete({ slug })

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Model not found' },
        { status: 404 },
      )
    }

    revalidateTag('models')

    return NextResponse.json(
      {
        success: true,
        message: 'Model deleted successfully',
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error: unknown) {
    console.error('❌ Error deleting model:', error)
    const message = error instanceof Error ? error.message : 'Unable to delete model'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
