import { promises as fs } from 'fs'
import path from 'path'
import { GridFSBucket } from 'mongodb'
import { revalidateTag, unstable_cache } from 'next/cache'
import { Types } from 'mongoose'

import { versionedJson } from '@/server/apiVersion'
import { connectToDatabase } from '@/lib/db'
import { getBrandModel, getModelModel, getServiceModel } from '@/models'
import type { ModelService } from '@/types/models'
import { applyCors, corsPreflight } from '@/server/cors'

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

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const sanitizeImagePath = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, '')

  if (withoutLeadingSlash.includes('..')) {
    throw new Error('Invalid image path')
  }

  return withoutLeadingSlash
}

const toAbsoluteImagePath = (relative: string) =>
  path.join(process.cwd(), 'public', relative.replace(/^\/+/, ''))

const isManagedModelImagePath = (relative: string | null | undefined) =>
  typeof relative === 'string' && relative.startsWith('assets/images/models/')

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

const toServiceIdString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }

  if (value && typeof value === 'object') {
    const candidate = value as { toString?: () => string }
    if (typeof candidate.toString === 'function') {
      const stringValue = candidate.toString()
      return typeof stringValue === 'string' && stringValue.trim().length > 0 ? stringValue : null
    }
  }

  return null
}

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

    const serviceIdSet = new Set<string>()
    results.forEach((model) => {
      const services: RawModelService[] = Array.isArray(model.services) ? model.services : []
      services.forEach((service) => {
        const serviceId = toServiceIdString(service.services_id)
        if (serviceId) {
          serviceIdSet.add(serviceId)
        }
      })
    })

    let serviceMetadata: Record<string, { name: string | null; time_taken: string | null }> = {}

    if (serviceIdSet.size > 0) {
      const validObjectIds = Array.from(serviceIdSet).filter((id) => Types.ObjectId.isValid(id))

      if (validObjectIds.length > 0) {
        const mongooseInstance = await connectToDatabase()
        const Service = getServiceModel(mongooseInstance.connection)

        const services = await Service.find({ _id: { $in: validObjectIds.map((id) => new Types.ObjectId(id)) } })
          .select(['_id', 'name', 'time_taken'])
          .lean<Array<{ _id: Types.ObjectId; name?: unknown; time_taken?: unknown }>>()

        serviceMetadata = services.reduce<Record<string, { name: string | null; time_taken: string | null }>>(
          (acc, service) => {
            const id = service._id?.toString()
            if (!id) {
              return acc
            }

            const name =
              typeof service.name === 'string' && service.name.trim().length > 0
                ? service.name.trim()
                : null
            const timeTaken =
              typeof service.time_taken === 'string' && service.time_taken.trim().length > 0
                ? service.time_taken.trim()
                : null

            acc[id] = { name, time_taken: timeTaken }
            return acc
          },
          {},
        )
      }
    }

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
        thumbnail: thumbnailId ? `/api/v1/cars/models/icon/${thumbnailId}` : null,
        image: normalizeImagePath(model.image),
        services: services
          .map((service) => {
            const serviceId = toServiceIdString(service.services_id)

            if (!serviceId) {
              return null
            }

            const metadata = serviceMetadata[serviceId] ?? { name: null, time_taken: null }

            return {
              services_id: serviceId,
              name: metadata.name,
              time_taken: metadata.time_taken,
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
  } catch (error: unknown) {
    console.error('❌ Error in /api/v1/cars/models:', error)
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

export async function POST(request: Request) {
  try {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const payload = await request.json().catch(() => null)

    const rawName = typeof payload?.name === 'string' ? payload.name.trim() : ''
    if (!rawName) {
      return versionedJson(
        { success: false, message: 'Model name is required' },
        { status: 400 },
      )
    }

    const rawSlug = typeof payload?.slug === 'string' ? payload.slug.trim() : ''
    const computedSlug = slugify(rawSlug || rawName)
    if (!computedSlug) {
      return versionedJson(
        { success: false, message: 'Model slug is required' },
        { status: 400 },
      )
    }

    const brandSlug =
      typeof payload?.brandSlug === 'string' ? payload.brandSlug.trim().toLowerCase() : ''
    if (!brandSlug) {
      return versionedJson(
        { success: false, message: 'Brand slug is required' },
        { status: 400 },
      )
    }

    const Brand = getBrandModel(connection)
    const brandDoc = await Brand.findOne({ slug: brandSlug })
      .select(['id', 'name'])
      .lean<{ id?: unknown; name?: unknown }>()

    if (!brandDoc) {
      return versionedJson(
        { success: false, message: 'Brand not found' },
        { status: 404 },
      )
    }

    const brandId =
      typeof brandDoc.id === 'number'
        ? brandDoc.id
        : typeof brandDoc.id === 'string'
          ? Number(brandDoc.id)
          : NaN

    if (!Number.isFinite(brandId)) {
      return versionedJson(
        { success: false, message: 'Brand record is missing a valid numeric id' },
        { status: 500 },
      )
    }

    const brandName =
      typeof brandDoc.name === 'string' && brandDoc.name.trim().length > 0
        ? brandDoc.name.trim()
        : rawName

    const Model = getModelModel(connection)

    const slugConflict = await Model.findOne({ slug: computedSlug }).lean()
    if (slugConflict) {
      return versionedJson(
        { success: false, message: 'Another model with the same slug exists' },
        { status: 409 },
      )
    }

    const nameRegex = new RegExp(`^${escapeRegExp(rawName)}$`, 'i')
    const nameConflict = await Model.findOne({ name: nameRegex }).lean()
    if (nameConflict) {
      return versionedJson(
        { success: false, message: 'Another model with the same name exists' },
        { status: 409 },
      )
    }

    const thumbnailIdRaw =
      payload && Object.prototype.hasOwnProperty.call(payload, 'iconId') ? payload.iconId : undefined
    let thumbnail: Types.ObjectId | null | undefined
    if (thumbnailIdRaw === null) {
      thumbnail = null
    } else if (typeof thumbnailIdRaw === 'string' && thumbnailIdRaw.trim().length > 0) {
      if (!Types.ObjectId.isValid(thumbnailIdRaw)) {
        return versionedJson(
          { success: false, message: 'Model icon must be a valid ObjectId' },
          { status: 400 },
        )
      }
      thumbnail = new Types.ObjectId(thumbnailIdRaw)
    } else if (thumbnailIdRaw === undefined) {
      thumbnail = undefined
    } else {
      return versionedJson(
        { success: false, message: 'Model icon must be a string or null' },
        { status: 400 },
      )
    }

    let imagePath: string | null = null
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'imagePath')) {
      try {
        imagePath = sanitizeImagePath(payload.imagePath)
      } catch (error) {
        return versionedJson(
          {
            success: false,
            message: error instanceof Error ? error.message : 'Invalid image path',
          },
          { status: 400 },
        )
      }
    }

    const bodyType =
      typeof payload?.bodyType === 'string' && payload.bodyType.trim().length > 0
        ? payload.bodyType.trim()
        : null

    const fuelType = Array.isArray(payload?.fuelType)
      ? payload.fuelType
          .filter((fuel): fuel is string => typeof fuel === 'string' && fuel.trim().length > 0)
          .map((fuel) => fuel.trim())
      : []

    const status = typeof payload?.status === 'boolean' ? payload.status : true

    const servicesInput = Array.isArray(payload?.services) ? payload.services : []
    let services: RawModelService[] = []
    try {
      services = servicesInput.map((service) => {
        if (!service || typeof service !== 'object') {
          throw new Error('Invalid service payload')
        }

        const serviceId =
          typeof (service as { serviceId?: unknown }).serviceId === 'string'
            ? (service as { serviceId?: string }).serviceId.trim()
            : ''

        if (!Types.ObjectId.isValid(serviceId)) {
          throw new Error('Service id must be a valid ObjectId')
        }

        const discount = Number((service as { discount?: unknown }).discount ?? 0)
        const originalPrice = Number((service as { originalPrice?: unknown }).originalPrice ?? 0)
        const discountPrice = Number((service as { discountPrice?: unknown }).discountPrice ?? 0)

        return {
          services_id: new Types.ObjectId(serviceId),
          discount: Number.isFinite(discount) ? discount : 0,
          original_price: Number.isFinite(originalPrice) ? originalPrice : 0,
          discount_price: Number.isFinite(discountPrice) ? discountPrice : 0,
        }
      })
    } catch (serviceError) {
      return versionedJson(
        {
          success: false,
          message:
            serviceError instanceof Error ? serviceError.message : 'Invalid services payload',
        },
        { status: 400 },
      )
    }

    const lastModel = await Model.findOne().sort({ id: -1 }).select(['id']).lean<{ id?: unknown }>()
    const lastIdCandidate =
      typeof lastModel?.id === 'number'
        ? lastModel.id
        : typeof lastModel?.id === 'string'
          ? Number(lastModel.id)
          : 0
    const nextId = Number.isFinite(lastIdCandidate) ? Number(lastIdCandidate) + 1 : 1

    const now = new Date()
    const createdDoc = await Model.create({
      id: nextId,
      name: rawName,
      slug: computedSlug,
      brand_id: brandId,
      brand_name: brandName,
      body_type: bodyType,
      fuel_type: fuelType,
      image: imagePath ?? '',
      thumbnail: thumbnail === undefined ? null : thumbnail,
      services,
      status,
      created_date: now,
      updated_date: now,
    })

    revalidateTag('models')

    const created = createdDoc.toObject() as RawModel & { thumbnail?: unknown }
    const thumbnailId = normalizeIconId(created.thumbnail)

    return versionedJson(
      {
        success: true,
        data: {
          id: created.id,
          name: created.name,
          slug: created.slug,
          brand_id: created.brand_id,
          brand_name: created.brand_name,
          body_type: created.body_type ?? null,
          fuel_type: Array.isArray(created.fuel_type) ? created.fuel_type : [],
          thumbnail: thumbnailId ? `/api/v1/cars/models/icon/${thumbnailId}` : null,
          image: normalizeImagePath(created.image),
          services: created.services ?? [],
          status: Boolean(created.status),
          created_date: normalizeDate(created.created_date) ?? now.toISOString(),
          updated_date: normalizeDate(created.updated_date) ?? now.toISOString(),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('❌ Error creating model:', error)
    const message = error instanceof Error ? error.message : 'Unable to create model'
    return versionedJson({ success: false, message }, { status: 500 })
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
      typeof payload?.slug === 'string' ? payload.slug.trim().toLowerCase() : undefined

    if (!targetSlug) {
      return versionedJson(
        { success: false, message: 'Model slug is required' },
        { status: 400 },
      )
    }

    const Model = getModelModel(connection)
    const existing = await Model.findOne({ slug: targetSlug })
      .select([
        'id',
        'name',
        'slug',
        'brand_id',
        'brand_name',
        'thumbnail',
        'image',
        'services',
        'status',
        'fuel_type',
        'body_type',
      ])
      .lean<RawModel | null>()

    if (!existing) {
      return versionedJson(
        { success: false, message: 'Model not found' },
        { status: 404 },
      )
    }

    const updates: Record<string, unknown> = {}
    let hasChanges = false

    const rawName =
      typeof payload?.name === 'string' ? payload.name.trim() : undefined
    if (rawName !== undefined) {
      if (!rawName) {
        return versionedJson(
          { success: false, message: 'Model name cannot be empty' },
          { status: 400 },
        )
      }
      if (rawName !== existing.name) {
        const nameRegex = new RegExp(`^${escapeRegExp(rawName)}$`, 'i')
        const nameConflict = await Model.findOne({
          id: { $ne: existing.id },
          name: nameRegex,
        }).lean()

        if (nameConflict) {
          return versionedJson(
            { success: false, message: 'Another model with the same name exists' },
            { status: 409 },
          )
        }

        updates.name = rawName
        hasChanges = true
      }
    }

    if (typeof payload?.newSlug === 'string') {
      const computed = slugify(payload.newSlug)
      if (!computed) {
        return versionedJson(
          { success: false, message: 'Model slug cannot be empty' },
          { status: 400 },
        )
      }
      if (computed !== existing.slug) {
        const slugConflict = await Model.findOne({
          id: { $ne: existing.id },
          slug: computed,
        }).lean()

        if (slugConflict) {
          return versionedJson(
            { success: false, message: 'Another model with the same slug exists' },
            { status: 409 },
          )
        }
        updates.slug = computed
        hasChanges = true
      }
    }

    if (typeof payload?.status === 'boolean' && payload.status !== existing.status) {
      updates.status = payload.status
      hasChanges = true
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'bodyType')) {
      const bodyType =
        typeof payload.bodyType === 'string' && payload.bodyType.trim().length > 0
          ? payload.bodyType.trim()
          : null
      if (bodyType !== (existing.body_type ?? null)) {
        updates.body_type = bodyType
        hasChanges = true
      }
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'fuelType')) {
      const fuelType = Array.isArray(payload.fuelType)
        ? payload.fuelType
            .filter((fuel: unknown): fuel is string => typeof fuel === 'string' && fuel.trim().length > 0)
            .map((fuel: string) => fuel.trim())
        : []
      if (JSON.stringify(fuelType) !== JSON.stringify(existing.fuel_type ?? [])) {
        updates.fuel_type = fuelType
        hasChanges = true
      }
    }

    let brandChanged = false
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'brandSlug')) {
      const brandSlug =
        typeof payload.brandSlug === 'string' ? payload.brandSlug.trim().toLowerCase() : ''
      if (!brandSlug) {
        return versionedJson(
          { success: false, message: 'Brand slug cannot be empty' },
          { status: 400 },
        )
      }

      const Brand = getBrandModel(connection)
      const brandDoc = await Brand.findOne({ slug: brandSlug })
        .select(['id', 'name'])
        .lean<{ id?: unknown; name?: unknown }>()

      if (!brandDoc) {
        return versionedJson(
          { success: false, message: 'Brand not found' },
          { status: 404 },
        )
      }

      const brandId =
        typeof brandDoc.id === 'number'
          ? brandDoc.id
          : typeof brandDoc.id === 'string'
            ? Number(brandDoc.id)
            : NaN

      if (!Number.isFinite(brandId)) {
        return versionedJson(
          { success: false, message: 'Brand record is missing a valid numeric id' },
          { status: 500 },
        )
      }

      const brandName =
        typeof brandDoc.name === 'string' && brandDoc.name.trim().length > 0
          ? brandDoc.name.trim()
          : existing.brand_name

      if (brandId !== existing.brand_id || brandName !== existing.brand_name) {
        updates.brand_id = brandId
        updates.brand_name = brandName
        hasChanges = true
        brandChanged = true
      }
    }

    let iconChanged = false
    let newIconId: string | null | undefined
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'iconId')) {
      iconChanged = true
      if (payload.iconId === null || (typeof payload.iconId === 'string' && payload.iconId.trim().length === 0)) {
        updates.thumbnail = null
        newIconId = null
        hasChanges = true
      } else if (typeof payload.iconId === 'string') {
        const trimmed = payload.iconId.trim()
        if (!Types.ObjectId.isValid(trimmed)) {
          return versionedJson(
            { success: false, message: 'Model icon must be a valid ObjectId' },
            { status: 400 },
          )
        }
        const currentThumbnail = normalizeIconId(existing.thumbnail)
        if (trimmed !== currentThumbnail) {
          updates.thumbnail = new Types.ObjectId(trimmed)
          newIconId = trimmed
          hasChanges = true
        }
      } else {
        return versionedJson(
          { success: false, message: 'Model icon must be a string or null' },
          { status: 400 },
        )
      }
    }

    let imageChanged = false
    let newImagePath: string | null | undefined
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'imagePath')) {
      try {
        newImagePath = sanitizeImagePath(payload.imagePath)
      } catch (error) {
        return versionedJson(
          {
            success: false,
            message: error instanceof Error ? error.message : 'Invalid image path',
          },
          { status: 400 },
        )
      }
      const currentImage = typeof existing.image === 'string' ? existing.image : null
      const normalizedCurrent = currentImage ? currentImage.replace(/^\/+/, '') : ''
      const normalizedNew = newImagePath ?? ''
      if (normalizedNew !== normalizedCurrent) {
        updates.image = newImagePath ?? ''
        imageChanged = true
        hasChanges = true
      }
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'services')) {
      const servicesInput = Array.isArray(payload.services) ? payload.services : []
      let services: RawModelService[] = []
      try {
        services = servicesInput.map((service) => {
          if (!service || typeof service !== 'object') {
            throw new Error('Invalid service payload')
          }

          const serviceId =
            typeof (service as { serviceId?: unknown }).serviceId === 'string'
              ? (service as { serviceId?: string }).serviceId.trim()
              : ''

          if (!Types.ObjectId.isValid(serviceId)) {
            throw new Error('Service id must be a valid ObjectId')
          }

          const discount = Number((service as { discount?: unknown }).discount ?? 0)
          const originalPrice = Number((service as { originalPrice?: unknown }).originalPrice ?? 0)
          const discountPrice = Number((service as { discountPrice?: unknown }).discountPrice ?? 0)

          return {
            services_id: new Types.ObjectId(serviceId),
            discount: Number.isFinite(discount) ? discount : 0,
            original_price: Number.isFinite(originalPrice) ? originalPrice : 0,
            discount_price: Number.isFinite(discountPrice) ? discountPrice : 0,
          }
        })
      } catch (serviceError) {
        return versionedJson(
          {
            success: false,
            message:
              serviceError instanceof Error ? serviceError.message : 'Invalid services payload',
          },
          { status: 400 },
        )
      }

      updates.services = services
      hasChanges = true
    }

    if (!hasChanges) {
      return versionedJson(
        { success: false, message: 'No updates were provided' },
        { status: 400 },
      )
    }

    const now = new Date()
    updates.updated_date = now

    const updatedDoc = await Model.findOneAndUpdate({ slug: targetSlug }, { $set: updates }, { new: true })

    if (!updatedDoc) {
      return versionedJson(
        { success: false, message: 'Model not found' },
        { status: 404 },
      )
    }

    revalidateTag('models')
    if (brandChanged) {
      revalidateTag('brands')
    }

    const updated = updatedDoc.toObject() as RawModel & { thumbnail?: unknown }
    const thumbnailId = normalizeIconId(updated.thumbnail)

    const bucket = connection.db ? new GridFSBucket(connection.db, { bucketName: 'fs' }) : null
    if (iconChanged) {
      const previousIconId = normalizeIconId(existing.thumbnail)
      const normalizedNewIconId = typeof newIconId === 'string' ? newIconId : normalizeIconId(updated.thumbnail)
      if (bucket && previousIconId && previousIconId !== normalizedNewIconId) {
        try {
          await bucket.delete(new Types.ObjectId(previousIconId))
        } catch (deleteError) {
          console.warn('⚠️ Failed to delete previous model icon:', deleteError)
        }
      }
    }

    if (
      imageChanged &&
      typeof existing.image === 'string' &&
      existing.image.trim().length > 0 &&
      isManagedModelImagePath(existing.image.replace(/^\/+/, '')) &&
      updated.image !== existing.image
    ) {
      const absolutePath = toAbsoluteImagePath(existing.image)
      try {
        await fs.unlink(absolutePath)
      } catch (deleteError) {
        if ((deleteError as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn('⚠️ Failed to delete previous model image:', deleteError)
        }
      }
    }

    return versionedJson({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        brand_id: updated.brand_id,
        brand_name: updated.brand_name,
        body_type: updated.body_type ?? null,
        fuel_type: Array.isArray(updated.fuel_type) ? updated.fuel_type : [],
        thumbnail: thumbnailId ? `/api/v1/cars/models/icon/${thumbnailId}` : null,
        image: normalizeImagePath(updated.image),
        services: updated.services ?? [],
        status: Boolean(updated.status),
        created_date: normalizeDate(updated.created_date),
        updated_date: normalizeDate(updated.updated_date) ?? now.toISOString(),
      },
    })
  } catch (error) {
    console.error('❌ Error updating model:', error)
    const message = error instanceof Error ? error.message : 'Unable to update model'
    return versionedJson({ success: false, message }, { status: 500 })
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
      return versionedJson(
        { success: false, message: 'Model slug is required' },
        { status: 400 },
      )
    }

    const Model = getModelModel(connection)
    const deleted = await Model.findOneAndDelete({ slug })

    if (!deleted) {
      return versionedJson(
        { success: false, message: 'Model not found' },
        { status: 404 },
      )
    }

    revalidateTag('models')

    return versionedJson(
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
    return versionedJson({ success: false, message }, { status: 500 })
  }
}

export const OPTIONS = (request: Request) => corsPreflight(request)
