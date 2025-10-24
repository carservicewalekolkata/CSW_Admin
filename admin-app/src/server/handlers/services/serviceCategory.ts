import { versionedJson } from '@/server/apiVersion'
import { applyCors, corsPreflight } from '@/server/cors'
import { connectToDatabase } from '@/lib/db'
import { getServiceCategoryModel, getServiceModel } from '@/models'
import type { ServiceCategory } from '@/types/serviceCategories'

type RawServiceCategory = {
  id: number
  name: string
  type?: string | null
  description?: string | null
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

export const GET = async (request: Request) => {
  try {
    const url = new URL(request.url)
    const searchParams = url.searchParams

    const query: QueryParams = {
      search: searchParams.get('search') || undefined,
      sortUpdated: (searchParams.get('sortUpdated') as QueryParams['sortUpdated']) ?? 'desc',
      page: parseNumber(searchParams.get('page'), 1),
      limit: parseNumber(searchParams.get('limit'), 10, 1, 100),
    }

    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const ServiceCategory = getServiceCategoryModel(connection)

    const { search, sortUpdated = 'desc', page = 1, limit = 10 } = query

    const filters: Record<string, unknown> = {}

    if (search?.trim()) {
      filters.name = { $regex: search.trim(), $options: 'i' }
    }

    const sort: Record<string, 1 | -1> = {
      updated_date: sortUpdated === 'asc' ? 1 : -1,
      created_date: sortUpdated === 'asc' ? 1 : -1,
    }

    const skip = (page - 1) * limit

    await ServiceCategory.updateMany(
      { type: { $exists: true, $regex: /^custom$/i } },
      { $set: { type: 'custom' } },
    )

    await ServiceCategory.updateMany(
      {
        $or: [
          { type: { $exists: false } },
          { type: null },
          { type: '' },
          { type: { $regex: /^(?!custom$|basic$)/i } },
        ],
      },
      { $set: { type: 'basic' } },
    )

    const [results, total] = await Promise.all([
      ServiceCategory.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select(['id', 'name', 'description', 'type', 'created_date', 'updated_date'])
        .lean<RawServiceCategory[]>(),
      ServiceCategory.countDocuments(filters),
    ])

    const data: ServiceCategory[] = results.map((item) => ({
      id: item.id,
      name: item.name,
      description:
        typeof item.description === 'string' && item.description.trim().length > 0
          ? item.description.trim()
          : null,
      type: typeof item.type === 'string' && item.type.trim().toLowerCase() === 'custom' ? 'custom' : 'basic',
      created_date: normalizeDate(item.created_date),
      updated_date: normalizeDate(item.updated_date),
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
          timestamp: new Date().toISOString(),
          data,
        },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      ),
    )
  } catch (error: unknown) {
    console.error('❌ Error in /api/v1/services/service-category:', error)
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

export const POST = async (request: Request) => {
  try {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const payload = await request.json().catch(() => null)
    const name =
      typeof payload?.name === 'string' ? payload.name.trim() : undefined
    const description =
      typeof payload?.description === 'string' && payload.description.trim().length > 0
        ? payload.description.trim()
        : null
    const rawType = typeof payload?.type === 'string' ? payload.type.trim().toLowerCase() : undefined
    const rawDescription = typeof payload?.description === 'string' ? payload.description.trim() : undefined

    console.debug('[ServiceCategory][PATCH] Incoming payload', {
      id,
      name,
      rawType,
      rawDescription,
    })
    const type: ServiceCategory['type'] = rawType === 'custom' ? 'custom' : 'basic'

    if (!name) {
      return versionedJson(
        { success: false, message: 'Category name is required' },
        { status: 400 },
      )
    }

    const ServiceCategory = getServiceCategoryModel(connection)

    const existing = await ServiceCategory.findOne({ name: new RegExp(`^${name}$`, 'i') })
    if (existing) {
      return versionedJson(
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
      description,
      type,
      created_date: now,
      updated_date: now,
    })

    return versionedJson(
      {
        success: true,
        data: {
          id: created.id,
          name: created.name,
          description:
            typeof created.description === 'string' && created.description.trim().length > 0
              ? created.description.trim()
              : null,
          type: typeof created.type === 'string' && created.type.trim().toLowerCase() === 'custom' ? 'custom' : 'basic',
          created_date: created.created_date?.toISOString() ?? now.toISOString(),
          updated_date: created.updated_date?.toISOString() ?? now.toISOString(),
        },
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    console.error('❌ Error creating service category:', error)
    const message = error instanceof Error ? error.message : 'Unable to create service category'
    return versionedJson({ success: false, message }, { status: 500 })
  }
}

export const OPTIONS = (request: Request) => corsPreflight(request)

export const PATCH = async (request: Request) => {
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
    const rawType = typeof payload?.type === 'string' ? payload.type.trim().toLowerCase() : undefined
    const rawDescription = typeof payload?.description === 'string' ? payload.description.trim() : undefined

    if (typeof id !== 'number' || !name) {
      return versionedJson(
        { success: false, message: 'Category id and name are required' },
        { status: 400 },
      )
    }

    const ServiceCategory = getServiceCategoryModel(connection)

    const existingCategory = await ServiceCategory.findOne({ id })

    if (!existingCategory) {
      return versionedJson(
        { success: false, message: 'Service category not found' },
        { status: 404 },
      )
    }

    const normalizedExistingType =
      typeof existingCategory.type === 'string' && existingCategory.type.trim().toLowerCase() === 'custom'
        ? 'custom'
        : 'basic'

    console.debug('[ServiceCategory][PATCH] Incoming payload', {
      id,
      name,
      rawType,
      rawDescription,
    })

    const type: ServiceCategory['type'] = rawType === 'custom'
      ? 'custom'
      : rawType === 'basic'
        ? 'basic'
        : normalizedExistingType
    const description =
      typeof rawDescription === 'string' && rawDescription.length > 0
        ? rawDescription
        : rawDescription === ''
          ? null
          : existingCategory.description ?? null

    const duplicate = await ServiceCategory.findOne({
      id: { $ne: id },
      name: new RegExp(`^${name}$`, 'i'),
    })

    if (duplicate) {
      return versionedJson(
        { success: false, message: 'Another category with the same name exists' },
        { status: 409 },
      )
    }

    existingCategory.name = name
    existingCategory.description = description
    existingCategory.type = type
    existingCategory.updated_date = new Date()

    await existingCategory.save()

    return versionedJson({
      success: true,
      data: {
        id: existingCategory.id,
        name: existingCategory.name,
        description:
          typeof existingCategory.description === 'string' && existingCategory.description.trim().length > 0
            ? existingCategory.description.trim()
            : null,
        type,
        created_date: existingCategory.created_date?.toISOString() ?? null,
        updated_date: existingCategory.updated_date?.toISOString() ?? null,
      },
    })
  } catch (error: unknown) {
    console.error('❌ Error updating service category:', error)
    const message = error instanceof Error ? error.message : 'Unable to update service category'
    return versionedJson({ success: false, message }, { status: 500 })
  }
}

export const DELETE = async (request: Request) => {
  try {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const payload = await request.json().catch(() => null)
    const id = typeof payload?.id === 'number' ? payload.id : undefined

    if (typeof id !== 'number') {
      return versionedJson(
        { success: false, message: 'Service category id is required' },
        { status: 400 },
      )
    }

    const ServiceCategory = getServiceCategoryModel(connection)
    const Service = getServiceModel(connection)

    const session = await connection.startSession()
    let categoryDeleted = false

    try {
      await session.withTransaction(async () => {
        const deletedCategory = await ServiceCategory.findOneAndDelete({ id }).session(session)

        if (!deletedCategory) {
          return
        }

        categoryDeleted = true

        await Service.deleteMany({ category_id: id }).session(session)
      })
    } finally {
      void session.endSession()
    }

    if (!categoryDeleted) {
      return versionedJson(
        { success: false, message: 'Service category not found' },
        { status: 404 },
      )
    }

    return versionedJson(
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
    return versionedJson({ success: false, message }, { status: 500 })
  }
}
