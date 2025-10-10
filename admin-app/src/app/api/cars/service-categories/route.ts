import { revalidateTag, unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'

import { connectToDatabase } from '@/lib/db'
import { getServiceCategoryModel } from '@/models'
import type { ServiceCategory } from '@/types/serviceCategories'

type RawServiceCategory = {
  id: number
  name: string
  created_date?: Date | string
  updated_date?: Date | string
}

type QueryParams = {
  search?: string
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

const buildCacheKey = ({ search, sortUpdated, page, limit }: QueryParams) =>
  JSON.stringify({ search, sortUpdated, page, limit })

const getServiceCategoriesCached = unstable_cache(
  async (params: QueryParams) => {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const ServiceCategory = getServiceCategoryModel(connection)

    const { search, sortUpdated = 'desc', page = 1, limit = 10 } = params

    const filters: Record<string, unknown> = {}

    if (search?.trim()) {
      filters.name = { $regex: search.trim(), $options: 'i' }
    }

    const sort: Record<string, 1 | -1> = {
      updated_date: sortUpdated === 'asc' ? 1 : -1,
      created_date: sortUpdated === 'asc' ? 1 : -1,
    }

    const skip = (page - 1) * limit

    const [results, total] = await Promise.all([
      ServiceCategory.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select(['id', 'name', 'created_date', 'updated_date'])
        .lean<RawServiceCategory[]>(),
      ServiceCategory.countDocuments(filters),
    ])

    return { results, total }
  },
  ['service-categories-query-cache'],
  { revalidate: 60, tags: ['service-categories'] },
)

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const searchParams = url.searchParams

    const query: QueryParams = {
      search: searchParams.get('search') || undefined,
      sortUpdated: (searchParams.get('sortUpdated') as QueryParams['sortUpdated']) ?? 'desc',
      page: parseNumber(searchParams.get('page'), 1),
      limit: parseNumber(searchParams.get('limit'), 10, 1, 100),
    }

    const cacheKey = buildCacheKey(query)
    const { results, total } = await getServiceCategoriesCached(query)

    const data: ServiceCategory[] = results.map((item) => ({
      id: item.id,
      name: item.name,
      created_date: normalizeDate(item.created_date),
      updated_date: normalizeDate(item.updated_date),
    }))

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
    console.error('❌ Error in /api/cars/service-categories:', error)
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

export async function POST(request: Request) {
  try {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const payload = await request.json().catch(() => null)
    const name =
      typeof payload?.name === 'string' ? payload.name.trim() : undefined

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 },
      )
    }

    const ServiceCategory = getServiceCategoryModel(connection)

    const existing = await ServiceCategory.findOne({ name: new RegExp(`^${name}$`, 'i') })
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Service category already exists' },
        { status: 409 },
      )
    }

    const last = await ServiceCategory.findOne().sort({ id: -1 }).select(['id']).lean()
    const nextId = (last?.id ?? 0) + 1
    const now = new Date()

    const created = await ServiceCategory.create({
      id: nextId,
      name,
      created_date: now,
      updated_date: now,
    })

    revalidateTag('service-categories')

    return NextResponse.json(
      {
        success: true,
        data: {
          id: created.id,
          name: created.name,
          created_date: created.created_date?.toISOString() ?? now.toISOString(),
          updated_date: created.updated_date?.toISOString() ?? now.toISOString(),
        },
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    console.error('❌ Error creating service category:', error)
    const message = error instanceof Error ? error.message : 'Unable to create service category'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const payload = await request.json().catch(() => null)
    const id = typeof payload?.id === 'number' ? payload.id : undefined
    const name =
      typeof payload?.name === 'string' ? payload.name.trim() : undefined

    if (typeof id !== 'number' || !name) {
      return NextResponse.json(
        { success: false, message: 'Category id and name are required' },
        { status: 400 },
      )
    }

    const ServiceCategory = getServiceCategoryModel(connection)

    const duplicate = await ServiceCategory.findOne({
      id: { $ne: id },
      name: new RegExp(`^${name}$`, 'i'),
    })

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: 'Another category with the same name exists' },
        { status: 409 },
      )
    }

    const updated = await ServiceCategory.findOneAndUpdate(
      { id },
      {
        name,
        updated_date: new Date(),
      },
      { new: true },
    )

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Service category not found' },
        { status: 404 },
      )
    }

    revalidateTag('service-categories')

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        created_date: updated.created_date?.toISOString() ?? null,
        updated_date: updated.updated_date?.toISOString() ?? null,
      },
    })
  } catch (error: unknown) {
    console.error('❌ Error updating service category:', error)
    const message = error instanceof Error ? error.message : 'Unable to update service category'
    return NextResponse.json({ success: false, message }, { status: 500 })
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
    const id = typeof payload?.id === 'number' ? payload.id : undefined

    if (typeof id !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Service category id is required' },
        { status: 400 },
      )
    }

    const ServiceCategory = getServiceCategoryModel(connection)
    const deleted = await ServiceCategory.findOneAndDelete({ id })

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Service category not found' },
        { status: 404 },
      )
    }

    revalidateTag('service-categories')

    return NextResponse.json(
      {
        success: true,
        message: 'Service category deleted successfully',
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error: unknown) {
    console.error('❌ Error deleting service category:', error)
    const message = error instanceof Error ? error.message : 'Unable to delete service category'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
