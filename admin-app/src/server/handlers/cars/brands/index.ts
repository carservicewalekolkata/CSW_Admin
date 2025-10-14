/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidateTag, unstable_cache } from 'next/cache'

import { versionedJson } from '@/server/apiVersion'
import { connectToDatabase } from '@/lib/db'
import { getBrandModel } from '@/models'
import { applyCors, corsPreflight } from '@/server/cors'

type RawBrand = {
  id: number
  name: string
  slug: string
  status?: boolean
  icon?: unknown
  created_date?: Date | string
  updated_date?: Date | string
}

type QueryParams = {
  search?: string
  slug?: string
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

const buildCacheKey = ({ search, slug, sortStatus, sortUpdated, page, limit }: QueryParams) =>
  JSON.stringify({ search, slug, sortStatus, sortUpdated, page, limit })

const getBrandsCached = unstable_cache(
  async (params: QueryParams) => {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const Brand = getBrandModel(connection)

    const { search, slug, sortStatus = 'none', sortUpdated = 'desc', page = 1, limit = 10 } = params

    const normalizedSearch = search?.trim().toLowerCase()
    const normalizedSlug = slug?.trim().toLowerCase()

    const filters: Record<string, unknown> = {}

    if (normalizedSearch) {
      filters.name = { $regex: normalizedSearch, $options: 'i' }
    }

    if (normalizedSlug) {
      filters.slug = { $regex: normalizedSlug, $options: 'i' }
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
      Brand.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select(['id', 'name', 'slug', 'status', 'icon', 'created_date', 'updated_date'])
        .lean<RawBrand[]>(),
      Brand.countDocuments(filters),
    ])

    return {
      results,
      total,
    }
  },
  ['brands-query-cache'],
  { revalidate: 60, tags: ['brands'] },
)

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const searchParams = url.searchParams

    const query: QueryParams = {
      search: searchParams.get('search') || undefined,
      slug: searchParams.get('slug') || undefined,
      sortStatus: (searchParams.get('sortStatus') as QueryParams['sortStatus']) ?? 'none',
      sortUpdated: (searchParams.get('sortUpdated') as QueryParams['sortUpdated']) ?? 'desc',
      page: parseNumber(searchParams.get('page'), 1),
      limit: parseNumber(searchParams.get('limit'), 10, 1, 100),
    }

    const cacheKey = buildCacheKey(query)
    const { results, total } = await getBrandsCached(query)

    const normalizedData = results.map((brand) => {
      const iconId = normalizeIconId(brand.icon)

      return {
        name: brand.name,
        slug: brand.slug,
        status: Boolean(brand.status),
        icon: iconId ? `/api/v1/cars/brands/icon/${iconId}` : null,
        created_date: normalizeDate(brand.created_date),
        updated_date: normalizeDate(brand.updated_date),
      }
    })

    return applyCors(
      request,
      versionedJson(
        {
          success: true,
          count: normalizedData.length,
          total,
          page: query.page,
          limit: query.limit,
          cacheKey,
          timestamp: new Date().toISOString(),
          data: normalizedData,
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=60',
          },
        },
      ),
    )
  } catch (error: any) {
    console.error('❌ Error in /api/v1/cars/brands:', error)

    return applyCors(
      request,
      versionedJson(
        {
          success: false,
          message: error.message || 'Internal Server Error',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      ),
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
    const slug = typeof payload?.slug === 'string' ? payload.slug.trim().toLowerCase() : undefined

    if (!slug) {
      return versionedJson(
        { success: false, message: 'Brand slug is required' },
        { status: 400 },
      )
    }

    const Brand = getBrandModel(connection)
    const deleted = await Brand.findOneAndDelete({ slug })

    if (!deleted) {
      return versionedJson(
        { success: false, message: 'Brand not found' },
        { status: 404 },
      )
    }

    revalidateTag('brands')

    return versionedJson(
      {
        success: true,
        message: 'Brand deleted successfully',
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error: any) {
    console.error('❌ Error deleting brand:', error)
    return versionedJson(
      {
        success: false,
        message: error.message || 'Unable to delete brand',
      },
      { status: 500 },
    )
  }
}

export const OPTIONS = (request: Request) => corsPreflight(request)
