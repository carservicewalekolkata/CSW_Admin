/* eslint-disable @typescript-eslint/no-explicit-any */
import { GridFSBucket } from 'mongodb'
import { Types } from 'mongoose'

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

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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

const fetchBrandsFromDatabase = async (params: QueryParams) => {
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
}

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

    const { results, total } = await fetchBrandsFromDatabase(query)

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
          timestamp: new Date().toISOString(),
          data: normalizedData,
        },
        {
          headers: {
            'Cache-Control': 'no-store',
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

export async function POST(request: Request) {
  try {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const payload = await request.json().catch(() => null)

    const rawName = typeof payload?.name === 'string' ? payload.name.trim() : ''
    const rawSlug = typeof payload?.slug === 'string' ? payload.slug.trim() : ''
    const desiredStatus = typeof payload?.status === 'boolean' ? payload.status : true
    const rawIcon =
      payload && Object.prototype.hasOwnProperty.call(payload, 'icon')
        ? payload.icon
        : undefined

    if (!rawName) {
      return versionedJson(
        { success: false, message: 'Brand name is required' },
        { status: 400 },
      )
    }

    const resolvedSlug = slugify(rawSlug || rawName)
    if (!resolvedSlug) {
      return versionedJson(
        { success: false, message: 'Brand slug is required' },
        { status: 400 },
      )
    }

    let icon: Types.ObjectId | null | undefined
    if (rawIcon === null) {
      icon = null
    } else if (typeof rawIcon === 'string') {
      const trimmed = rawIcon.trim()
      if (trimmed.length > 0) {
        if (!Types.ObjectId.isValid(trimmed)) {
          return versionedJson(
            { success: false, message: 'Icon must be a valid ObjectId' },
            { status: 400 },
          )
        }
        icon = new Types.ObjectId(trimmed)
      } else {
        icon = null
      }
    } else if (rawIcon === undefined) {
      icon = undefined
    } else {
      return versionedJson(
        { success: false, message: 'Icon must be provided as a string or null' },
        { status: 400 },
      )
    }

    const Brand = getBrandModel(connection)

    const slugConflict = await Brand.findOne({ slug: resolvedSlug }).lean()
    if (slugConflict) {
      return versionedJson(
        { success: false, message: 'Another brand with the same slug exists' },
        { status: 409 },
      )
    }

    const nameRegex = new RegExp(`^${escapeRegExp(rawName)}$`, 'i')
    const nameConflict = await Brand.findOne({ name: nameRegex }).lean()
    if (nameConflict) {
      return versionedJson(
        { success: false, message: 'Another brand with the same name exists' },
        { status: 409 },
      )
    }

    const lastBrand = await Brand.findOne().sort({ id: -1 }).select(['id']).lean<{ id?: unknown }>()
    const lastIdCandidate =
      typeof lastBrand?.id === 'number'
        ? lastBrand.id
        : typeof lastBrand?.id === 'string'
          ? Number(lastBrand.id)
          : 0
    const nextId = Number.isFinite(lastIdCandidate) ? Number(lastIdCandidate) + 1 : 1
    const now = new Date()

    const createdDoc = await Brand.create({
      id: nextId,
      name: rawName,
      slug: resolvedSlug,
      status: desiredStatus,
      icon: icon === undefined ? null : icon,
      created_date: now,
      updated_date: now,
    })

    const created = createdDoc.toObject() as RawBrand & { icon?: unknown }
    const iconId = normalizeIconId(created.icon)

    return versionedJson(
      {
        success: true,
        data: {
          name: created.name,
          slug: created.slug,
          status: Boolean(created.status),
          icon: iconId ? `/api/v1/cars/brands/icon/${iconId}` : null,
          created_date: normalizeDate(created.created_date) ?? now.toISOString(),
          updated_date: normalizeDate(created.updated_date) ?? now.toISOString(),
        },
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('❌ Error creating brand:', error)
    return versionedJson(
      {
        success: false,
        message: error?.message ?? 'Unable to create brand',
      },
      { status: 500 },
    )
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

    const targetSlug =
      typeof payload?.slug === 'string' ? payload.slug.trim() : undefined

    if (!targetSlug) {
      return versionedJson(
        { success: false, message: 'Brand slug is required' },
        { status: 400 },
      )
    }

    const updates: Record<string, unknown> = {}
    let iconChanged = false
    let newIconId: string | null | undefined

    const rawName =
      typeof payload?.name === 'string' ? payload.name.trim() : undefined
    if (rawName !== undefined) {
      if (!rawName) {
        return versionedJson(
          { success: false, message: 'Brand name cannot be empty' },
          { status: 400 },
        )
      }
      updates.name = rawName
    }

    let newSlug: string | undefined
    if (typeof payload?.newSlug === 'string') {
      const computed = slugify(payload.newSlug)
      if (!computed) {
        return versionedJson(
          { success: false, message: 'Brand slug cannot be empty' },
          { status: 400 },
        )
      }
      newSlug = computed
      updates.slug = computed
    }

    if (typeof payload?.status === 'boolean') {
      updates.status = payload.status
    }

    let previousIconId: Types.ObjectId | undefined
    const rawPreviousIconId =
      typeof payload?.previousIconId === 'string' ? payload.previousIconId.trim() : undefined

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'icon')) {
      iconChanged = true
      if (payload.icon === null) {
        updates.icon = null
        newIconId = null
      } else if (typeof payload.icon === 'string') {
        const trimmed = payload.icon.trim()
        if (trimmed.length === 0) {
          updates.icon = null
          newIconId = null
        } else if (Types.ObjectId.isValid(trimmed)) {
          updates.icon = new Types.ObjectId(trimmed)
          newIconId = trimmed
        } else {
          return versionedJson(
            { success: false, message: 'Icon must be a valid ObjectId' },
            { status: 400 },
          )
        }
      } else if (payload.icon !== undefined) {
        return versionedJson(
          { success: false, message: 'Icon must be provided as a string or null' },
          { status: 400 },
        )
      }
    }

    if (rawPreviousIconId) {
      if (!Types.ObjectId.isValid(rawPreviousIconId)) {
        return versionedJson(
          { success: false, message: 'Previous icon id must be a valid ObjectId' },
          { status: 400 },
        )
      }
      previousIconId = new Types.ObjectId(rawPreviousIconId)
    }

    if (Object.keys(updates).length === 0) {
      return versionedJson(
        { success: false, message: 'No updates were provided' },
        { status: 400 },
      )
    }

    const Brand = getBrandModel(connection)

    const existing = await Brand.findOne({ slug: targetSlug })
      .select(['id', 'name', 'slug', 'icon', 'status', 'created_date', 'updated_date'])
      .lean<RawBrand | null>()

    if (!existing) {
      return versionedJson(
        { success: false, message: 'Brand not found' },
        { status: 404 },
      )
    }

    if (rawName) {
      const nameRegex = new RegExp(`^${escapeRegExp(rawName)}$`, 'i')
      const nameConflict = await Brand.findOne({
        id: { $ne: existing.id },
        name: nameRegex,
      }).lean()

      if (nameConflict) {
        return versionedJson(
          { success: false, message: 'Another brand with the same name exists' },
          { status: 409 },
        )
      }
    }

    if (newSlug) {
      const slugConflict = await Brand.findOne({
        id: { $ne: existing.id },
        slug: newSlug,
      }).lean()

      if (slugConflict) {
        return versionedJson(
          { success: false, message: 'Another brand with the same slug exists' },
          { status: 409 },
        )
      }
    }

    const now = new Date()
    updates.updated_date = now

    const updatedDoc = await Brand.findOneAndUpdate(
      { slug: targetSlug },
      { $set: updates },
      { new: true },
    )

    if (!updatedDoc) {
      return versionedJson(
        { success: false, message: 'Brand not found' },
        { status: 404 },
      )
    }

    const updated = updatedDoc.toObject() as RawBrand & { icon?: unknown }
    const iconId = normalizeIconId(updated.icon)

    const normalizedNewIconId = typeof newIconId === 'string' ? newIconId : null

    if (iconChanged && previousIconId && previousIconId.toString() !== normalizedNewIconId) {
      try {
        const db = connection.db
        if (db) {
          const bucket = new GridFSBucket(db, { bucketName: 'fs' })
          await bucket.delete(previousIconId)
        }
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete previous brand icon:', deleteError)
      }
    }

    return versionedJson({
      success: true,
      data: {
        name: updated.name,
        slug: updated.slug,
        status: Boolean(updated.status),
        icon: iconId ? `/api/v1/cars/brands/icon/${iconId}` : null,
        created_date: normalizeDate(updated.created_date),
        updated_date: normalizeDate(updated.updated_date) ?? now.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('❌ Error updating brand:', error)
    return versionedJson(
      {
        success: false,
        message: error?.message ?? 'Unable to update brand',
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
    const slug = typeof payload?.slug === 'string' ? payload.slug.trim() : undefined

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
