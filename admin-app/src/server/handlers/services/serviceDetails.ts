import { promises as fs } from 'fs'
import path from 'path'
import { Types } from 'mongoose'

import { versionedJson } from '@/server/apiVersion'
import { applyCors, corsPreflight } from '@/server/cors'
import { connectToDatabase } from '@/lib/db'
import { getServiceCategoryModel, getServiceModel } from '@/models'
import {
  AZURE_STORAGE_SCHEME,
  buildServiceImageProxyUrl,
  deleteServiceImageIfExists,
  extractServiceImageBlobName,
} from '@/lib/azureStorage'

type RawService = {
  _id?: unknown
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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const sanitizeImagePath = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const blobName = extractServiceImageBlobName(trimmed)
  if (blobName) {
    return `${AZURE_STORAGE_SCHEME}${blobName}`
  }

  if (trimmed.includes('..')) {
    throw new Error('Invalid image path')
  }

  return trimmed.replace(/^\/+/, '')
}

const SERVICE_IMAGE_PREFIX = 'assets/services/'

const isManagedServiceImagePath = (relative: string | null | undefined) =>
  typeof relative === 'string' && relative.startsWith(SERVICE_IMAGE_PREFIX)

const toAbsoluteServiceImagePath = (relative: string) =>
  path.join(process.cwd(), 'public', relative.replace(/^\/+/, ''))

const coerceCategoryId = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed)
    }
  }

  return null
}

const sanitizeFeaturesInput = (value: unknown): string[] => {
  const items = sanitizeStringArray(value)
  const unique = new Set<string>()
  items.forEach((item) => {
    if (item.length > 0) {
      unique.add(item)
    }
  })
  return Array.from(unique)
}

type ResolvedServiceImage = {
  view: string | null
  raw: string | null
}

const resolveServiceImage = (value?: string | null): ResolvedServiceImage => {
  if (!value) {
    return { view: null, raw: null }
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return { view: null, raw: null }
  }

  const blobName = extractServiceImageBlobName(trimmed)
  if (blobName) {
    return {
      view: buildServiceImageProxyUrl(blobName),
      raw: `${AZURE_STORAGE_SCHEME}${blobName}`,
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { view: trimmed, raw: trimmed }
  }

  const normalized = trimmed.replace(/^\/+/, '')
  if (!normalized) {
    return { view: null, raw: null }
  }

  return {
    view: `/${normalized}`,
    raw: normalized,
  }
}

const mapServiceDocument = (service: RawService & { _id?: unknown }) => {
  const rawImages = sanitizeStringArray(service.service_images)
  const imageInfos = rawImages.map((image) => resolveServiceImage(image))

  const serviceImages = imageInfos
    .map((image) => image.view)
    .filter((image): image is string => Boolean(image))
  const primaryImageRaw = imageInfos.find((image) => image.raw)?.raw ?? null

  const thumbnailInfo = resolveServiceImage(sanitizeNullableString(service.thumbnail))
  const thumbnailView = thumbnailInfo.view ?? serviceImages[0] ?? null
  const thumbnailRaw = thumbnailInfo.raw ?? primaryImageRaw

  return {
    id: normalizeObjectId(service._id),
    name: typeof service.name === 'string' ? service.name : '',
    category_id:
      typeof service.category_id === 'number' && Number.isFinite(service.category_id)
        ? service.category_id
        : 0,
    category_name: typeof service.category_name === 'string' ? service.category_name : '',
    service_images: serviceImages,
    thumbnail: thumbnailView,
    image_path: thumbnailRaw,
    description: sanitizeNullableString(service.description),
    features: sanitizeStringArray(service.features),
    time_taken: sanitizeNullableString(service.time_taken),
    warranty: sanitizeNullableString(service.warranty),
    status: Boolean(service.status ?? true),
    created_date: normalizeDate(service.created_date),
    updated_date: normalizeDate(service.updated_date),
  }
}

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

    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const Service = getServiceModel(connection)

    const {
      search: searchTerm,
      category,
      status: statusFilter,
      sortUpdated = 'desc',
      page = 1,
      limit = 10,
    } = query

    const filters: Record<string, unknown> = {}

    if (searchTerm?.trim()) {
      filters.name = { $regex: searchTerm.trim(), $options: 'i' }
    }

    if (typeof category === 'number' && Number.isFinite(category)) {
      filters.category_id = category
    }

    if (statusFilter === 'active') {
      filters.status = true
    } else if (statusFilter === 'inactive') {
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

    const data = results.map((service) => mapServiceDocument(service))

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

export const POST = async (request: Request) => {
  try {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const payload = await request.json().catch(() => null)

    const name = typeof payload?.name === 'string' ? payload.name.trim() : ''
    if (!name) {
      return applyCors(
        request,
        versionedJson({ success: false, message: 'Service name is required' }, { status: 400 }),
      )
    }

    const categoryId = coerceCategoryId(payload?.categoryId)
    if (categoryId === null) {
      return applyCors(
        request,
        versionedJson({ success: false, message: 'Valid category id is required' }, { status: 400 }),
      )
    }

    const ServiceCategory = getServiceCategoryModel(connection)
    const categoryDoc = await ServiceCategory.findOne({ id: categoryId })
      .select(['id', 'name'])
      .lean<{ id?: unknown; name?: unknown }>()

    if (!categoryDoc) {
      return applyCors(
        request,
        versionedJson({ success: false, message: 'Service category not found' }, { status: 404 }),
      )
    }

    const categoryName =
      typeof categoryDoc.name === 'string' && categoryDoc.name.trim().length > 0
        ? categoryDoc.name.trim()
        : `Category ${categoryId}`

    const description = sanitizeNullableString(payload?.description ?? null)
    const features = sanitizeFeaturesInput(payload?.features)
    const timeTaken = sanitizeNullableString(payload?.timeTaken ?? null)
    const warranty = sanitizeNullableString(payload?.warranty ?? null)
    const status = typeof payload?.status === 'boolean' ? payload.status : true

    let imagePath: string | null = null
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'imagePath')) {
      try {
        imagePath = sanitizeImagePath(payload.imagePath)
      } catch (error) {
        return applyCors(
          request,
          versionedJson(
            {
              success: false,
              message: error instanceof Error ? error.message : 'Invalid image path',
            },
            { status: 400 },
          ),
        )
      }
    }

    const Service = getServiceModel(connection)

    const duplicate = await Service.findOne({
      category_id: categoryId,
      name: new RegExp(`^${escapeRegExp(name)}$`, 'i'),
    }).lean()

    if (duplicate) {
      return applyCors(
        request,
        versionedJson({ success: false, message: 'Another service with the same name exists' }, { status: 409 }),
      )
    }

    const now = new Date()
    const createdDoc = await Service.create({
      name,
      category_id: categoryId,
      category_name: categoryName,
      service_images: imagePath ? [imagePath] : [],
      thumbnail: imagePath ?? null,
      description,
      features,
      time_taken: timeTaken,
      warranty,
      status,
      created_date: now,
      updated_date: now,
    })

    const created = createdDoc.toObject() as RawService & { _id?: unknown }

    return applyCors(
      request,
      versionedJson(
        {
          success: true,
          data: mapServiceDocument(created),
        },
        { status: 201 },
      ),
    )
  } catch (error) {
    console.error('❌ Error creating service detail:', error)
    const message = error instanceof Error ? error.message : 'Unable to create service'
    return applyCors(request, versionedJson({ success: false, message }, { status: 500 }))
  }
}

export const PATCH = async (request: Request) => {
  try {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const payload = await request.json().catch(() => null)
    const id = typeof payload?.id === 'string' ? payload.id.trim() : ''

    if (!id || !Types.ObjectId.isValid(id)) {
      return applyCors(
        request,
        versionedJson({ success: false, message: 'Service id is required' }, { status: 400 }),
      )
    }

    const Service = getServiceModel(connection)
    const existingDoc = await Service.findById(id)
      .select([
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
      .lean<RawService & { thumbnail?: string | null; service_images?: string[] } | null>()

    if (!existingDoc) {
      return applyCors(
        request,
        versionedJson({ success: false, message: 'Service not found' }, { status: 404 }),
      )
    }

    const updates: Record<string, unknown> = {}
    let hasChanges = false

    if (typeof payload?.name === 'string') {
      const trimmedName = payload.name.trim()
      if (!trimmedName) {
        return applyCors(
          request,
          versionedJson({ success: false, message: 'Service name cannot be empty' }, { status: 400 }),
        )
      }

      if (trimmedName !== existingDoc.name) {
        const duplicate = await Service.findOne({
          _id: { $ne: id },
          category_id: existingDoc.category_id,
          name: new RegExp(`^${escapeRegExp(trimmedName)}$`, 'i'),
        }).lean()

        if (duplicate) {
          return applyCors(
            request,
            versionedJson({ success: false, message: 'Another service with the same name exists' }, { status: 409 }),
          )
        }

        updates.name = trimmedName
        hasChanges = true
      }
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'categoryId')) {
      const newCategoryId = coerceCategoryId(payload.categoryId)
      if (newCategoryId === null) {
        return applyCors(
          request,
          versionedJson({ success: false, message: 'Valid category id is required' }, { status: 400 }),
        )
      }

      if (newCategoryId !== existingDoc.category_id) {
        const ServiceCategory = getServiceCategoryModel(connection)
        const categoryDoc = await ServiceCategory.findOne({ id: newCategoryId })
          .select(['id', 'name'])
          .lean<{ id?: unknown; name?: unknown }>()

        if (!categoryDoc) {
          return applyCors(
            request,
            versionedJson({ success: false, message: 'Service category not found' }, { status: 404 }),
          )
        }

        const categoryName =
          typeof categoryDoc.name === 'string' && categoryDoc.name.trim().length > 0
            ? categoryDoc.name.trim()
            : `Category ${newCategoryId}`

        updates.category_id = newCategoryId
        updates.category_name = categoryName
        hasChanges = true
      }
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'description')) {
      const description = sanitizeNullableString(payload.description ?? null)
      if (description !== sanitizeNullableString(existingDoc.description)) {
        updates.description = description
        hasChanges = true
      }
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'features')) {
      const features = sanitizeFeaturesInput(payload.features)
      if (JSON.stringify(features) !== JSON.stringify(sanitizeStringArray(existingDoc.features))) {
        updates.features = features
        hasChanges = true
      }
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'timeTaken')) {
      const timeTaken = sanitizeNullableString(payload.timeTaken ?? null)
      if (timeTaken !== sanitizeNullableString(existingDoc.time_taken)) {
        updates.time_taken = timeTaken
        hasChanges = true
      }
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'warranty')) {
      const warranty = sanitizeNullableString(payload.warranty ?? null)
      if (warranty !== sanitizeNullableString(existingDoc.warranty)) {
        updates.warranty = warranty
        hasChanges = true
      }
    }

    if (typeof payload?.status === 'boolean' && payload.status !== existingDoc.status) {
      updates.status = payload.status
      hasChanges = true
    }

    let newImagePath: string | null | undefined
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'imagePath')) {
      try {
        newImagePath = sanitizeImagePath(payload.imagePath)
      } catch (error) {
        return applyCors(
          request,
          versionedJson(
            {
              success: false,
              message: error instanceof Error ? error.message : 'Invalid image path',
            },
            { status: 400 },
          ),
        )
      }

      const currentImage = sanitizeNullableString(existingDoc.thumbnail) ?? null
      if ((newImagePath ?? null) !== (currentImage ?? null)) {
        updates.thumbnail = newImagePath ?? null
        updates.service_images = newImagePath ? [newImagePath] : []
        hasChanges = true
      }
    }

    if (!hasChanges) {
      return applyCors(
        request,
        versionedJson({ success: false, message: 'No updates were provided' }, { status: 400 }),
      )
    }

    updates.updated_date = new Date()

    const updatedDoc = await Service.findByIdAndUpdate(id, { $set: updates }, { new: true })

    if (!updatedDoc) {
      return applyCors(
        request,
        versionedJson({ success: false, message: 'Service not found' }, { status: 404 }),
      )
    }

    const updated = updatedDoc.toObject() as RawService & { _id?: unknown }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'previousImagePath')) {
      const previousInput = sanitizeNullableString(payload.previousImagePath)
      let sanitizedPrevious: string | null = null
      if (previousInput) {
        try {
          sanitizedPrevious = sanitizeImagePath(previousInput)
        } catch {
          sanitizedPrevious = null
        }
      }

      const currentRaw = sanitizeNullableString(updated.thumbnail)

      const previousBlob = sanitizedPrevious ? extractServiceImageBlobName(sanitizedPrevious) : null
      const currentBlob = currentRaw ? extractServiceImageBlobName(currentRaw) : null

      if (previousBlob && previousBlob !== currentBlob) {
        try {
          await deleteServiceImageIfExists(previousBlob)
        } catch (err) {
          console.warn('⚠️ Failed to delete previous service image blob:', err)
        }
      } else if (sanitizedPrevious && !previousBlob) {
        const formattedPrevious = sanitizedPrevious.replace(/^\/+/, '')
        const normalizedCurrent = currentRaw ? currentRaw.replace(/^\/+/, '') : null

        if (
          formattedPrevious &&
          formattedPrevious !== normalizedCurrent &&
          isManagedServiceImagePath(formattedPrevious)
        ) {
          try {
            await fs.unlink(toAbsoluteServiceImagePath(formattedPrevious))
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
              console.warn('⚠️ Failed to delete previous service image:', err)
            }
          }
        }
      }
    }

    return applyCors(
      request,
      versionedJson({ success: true, data: mapServiceDocument(updated) }),
    )
  } catch (error) {
    console.error('❌ Error updating service detail:', error)
    const message = error instanceof Error ? error.message : 'Unable to update service'
    return applyCors(request, versionedJson({ success: false, message }, { status: 500 }))
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
    const id = typeof payload?.id === 'string' ? payload.id.trim() : ''

    if (!id || !Types.ObjectId.isValid(id)) {
      return applyCors(
        request,
        versionedJson({ success: false, message: 'Service id is required' }, { status: 400 }),
      )
    }

    const Service = getServiceModel(connection)
    const deleted = await Service.findByIdAndDelete(id)

    if (!deleted) {
      return applyCors(
        request,
        versionedJson({ success: false, message: 'Service not found' }, { status: 404 }),
      )
    }

    const deletedRaw = deleted.toObject() as RawService
    const thumbnailRaw = sanitizeNullableString(deletedRaw.thumbnail)
    const additionalImages = sanitizeStringArray(deletedRaw.service_images)

    const imagesToRemove = [thumbnailRaw, ...additionalImages]

    await Promise.all(
      imagesToRemove.map(async (image) => {
        if (typeof image !== 'string' || !image.trim()) {
          return
        }

        const trimmed = image.trim()
        const blobName = extractServiceImageBlobName(trimmed)
        if (blobName) {
          try {
            await deleteServiceImageIfExists(blobName)
          } catch (err) {
            console.warn('⚠️ Failed to delete service image blob:', err)
          }
          return
        }

        const formatted = trimmed.replace(/^\/+/, '')
        if (formatted && isManagedServiceImagePath(formatted)) {
          try {
            await fs.unlink(toAbsoluteServiceImagePath(formatted))
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
              console.warn('⚠️ Failed to delete service image:', err)
            }
          }
        }
      }),
    )

    return applyCors(
      request,
      versionedJson({ success: true, message: 'Service deleted successfully' }),
    )
  } catch (error) {
    console.error('❌ Error deleting service detail:', error)
    const message = error instanceof Error ? error.message : 'Unable to delete service'
    return applyCors(request, versionedJson({ success: false, message }, { status: 500 }))
  }
}

export const OPTIONS = (request: Request) => corsPreflight(request)
