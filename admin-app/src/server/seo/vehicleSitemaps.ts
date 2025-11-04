import type { Connection } from 'mongoose'

import {
  getBrandModel,
  getModelModel,
  getVehicleSitemapModel,
  type IBrand,
  type IModel,
  type IVehicleSitemap,
} from '@/models'

type LeanBrand = Pick<IBrand, 'id' | 'name' | 'slug' | 'status'>
type LeanModel = Pick<
  IModel,
  'id' | 'name' | 'slug' | 'brand_id' | 'brand_name' | 'fuel_type' | 'status' | 'updated_date'
>

const slugifySegment = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const toTitleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ')
    .trim()

const normaliseFuelDisplay = (value: string): string => toTitleCase(value.trim())

const normaliseFuelKey = (value: string): string => value.trim().toLowerCase()

const buildVehicleSlug = (fuelType: string | null | undefined, brandSlug: string, modelSlug: string): string => {
  const brandSegment = slugifySegment(brandSlug)
  const modelSegment = slugifySegment(modelSlug)
  const fuelSegment =
    typeof fuelType === 'string' && fuelType.trim().length > 0 ? slugifySegment(fuelType) : null
  const segments = fuelSegment
    ? [fuelSegment, brandSegment, modelSegment, 'services']
    : [brandSegment, modelSegment, 'services']
  return segments.join('-')
}

const parseDate = (value: unknown, fallback: Date): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  return fallback
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

const ensureBrandContext = async (
  connection: Connection,
  brandId: number,
): Promise<{ slug: string; name: string; status: boolean } | null> => {
  const Brand = getBrandModel(connection)
  const brandDoc = await Brand.findOne({ id: brandId }).select(['name', 'slug', 'status']).lean<LeanBrand | null>()

  if (!brandDoc) {
    return null
  }

  const slugSource = typeof brandDoc.slug === 'string' && brandDoc.slug.trim().length > 0 ? brandDoc.slug : brandDoc.name
  if (!slugSource) {
    return null
  }

  const brandSlug = slugifySegment(slugSource)
  const brandName =
    typeof brandDoc.name === 'string' && brandDoc.name.trim().length > 0 ? brandDoc.name.trim() : slugSource

  return {
    slug: brandSlug,
    name: brandName,
    status: brandDoc.status !== false,
  }
}

const upsertVehicleEntriesForModel = async (
  connection: Connection,
  model: LeanModel,
  brandContext?: { slug: string; name: string; status: boolean },
): Promise<{ created: number; updated: number; deactivated: number }> => {
  const ModelSitemap = getVehicleSitemapModel(connection)

  const brandId = toNumber(model.brand_id)
  if (brandId === null) {
    return { created: 0, updated: 0, deactivated: 0 }
  }

  const resolvedBrand =
    brandContext ??
    (await ensureBrandContext(connection, brandId)) ??
    ({
      slug: slugifySegment(model.brand_name),
      name: model.brand_name,
      status: true,
    } as const)

  const fuelTypes = Array.isArray(model.fuel_type)
    ? Array.from(
        new Map(
          model.fuel_type
            .filter((fuel): fuel is string => typeof fuel === 'string' && fuel.trim().length > 0)
            .map((fuel) => {
              const key = normaliseFuelKey(fuel)
              return [key, normaliseFuelDisplay(fuel)] as const
            }),
        ),
      )
    : []

  const existingDocs = await ModelSitemap.find({ model_id: model.id })
    .select(['_id', 'fuel_key'])
    .lean<Array<Pick<IVehicleSitemap, '_id' | 'fuel_key'>>>()

  const activeMap = new Map(existingDocs.map((doc) => [doc.fuel_key, doc._id]))

  let created = 0
  let updated = 0

  const now = new Date()
  const lastModified = parseDate(model.updated_date, now)
  const isActive = model.status !== false && resolvedBrand.status

  for (const [fuelKey, fuelDisplay] of fuelTypes) {
    const slug = buildVehicleSlug(fuelDisplay, resolvedBrand.slug, model.slug)
    const path = `/services/${slug}`

    const updatePayload = {
      brand_id: brandId,
      brand_name: resolvedBrand.name,
      brand_slug: resolvedBrand.slug,
      model_id: model.id,
      model_name: model.name,
      model_slug: model.slug,
      fuel_type: fuelDisplay,
      fuel_key: fuelKey,
      path,
      active: isActive,
      last_modified: lastModified,
      updated_at: now,
    }

    const result = await ModelSitemap.findOneAndUpdate(
      { model_id: model.id, fuel_key: fuelKey },
      {
        $set: updatePayload,
        $setOnInsert: { created_at: now },
      },
      { upsert: true, new: true },
    )

    if (result) {
      if (activeMap.has(fuelKey)) {
        updated += 1
        activeMap.delete(fuelKey)
      } else {
        created += 1
      }
    }
  }

  let deactivated = 0

  if (activeMap.size > 0) {
    const toDeactivate = Array.from(activeMap.values())
    const res = await ModelSitemap.updateMany(
      { _id: { $in: toDeactivate } },
      { $set: { active: false, updated_at: now, last_modified: lastModified } },
    )
    deactivated = res.modifiedCount ?? 0
  }

  if (fuelTypes.length === 0) {
    const res = await ModelSitemap.updateMany(
      { model_id: model.id },
      { $set: { active: false, updated_at: now, last_modified: lastModified } },
    )
    deactivated = res.modifiedCount ?? deactivated
  }

  return { created, updated, deactivated }
}

export const syncVehicleSitemapsForModel = async (
  connection: Connection,
  model: LeanModel,
  brandContext?: { slug: string; name: string; status: boolean },
) => {
  return upsertVehicleEntriesForModel(connection, model, brandContext)
}

export const removeVehicleSitemapsForModel = async (connection: Connection, modelId: number) => {
  const ModelSitemap = getVehicleSitemapModel(connection)
  await ModelSitemap.deleteMany({ model_id: modelId })
}

export const syncVehicleSitemapsForBrand = async (
  connection: Connection,
  brand: LeanBrand,
): Promise<{ processed: number; created: number; updated: number; deactivated: number }> => {
  const Model = getModelModel(connection)
  const brandId = toNumber(brand.id)
  if (brandId === null) {
    return { processed: 0, created: 0, updated: 0, deactivated: 0 }
  }

  const models = await Model.find({ brand_id: brandId })
    .select(['id', 'name', 'slug', 'brand_id', 'brand_name', 'fuel_type', 'status', 'updated_date'])
    .lean<LeanModel[]>()

  let created = 0
  let updated = 0
  let deactivated = 0

  for (const model of models) {
    const brandSlugSource =
      typeof brand.slug === 'string' && brand.slug.trim().length > 0
        ? brand.slug
        : typeof brand.name === 'string'
          ? brand.name
          : ''
    const brandSlug = slugifySegment(String(brandSlugSource))
    const brandName =
      typeof brand.name === 'string' && brand.name.trim().length > 0 ? brand.name.trim() : model.brand_name

    const result = await upsertVehicleEntriesForModel(connection, model, {
      slug: brandSlug,
      name: brandName,
      status: brand.status !== false,
    })
    created += result.created
    updated += result.updated
    deactivated += result.deactivated
  }

  return { processed: models.length, created, updated, deactivated }
}

export const removeVehicleSitemapsForBrand = async (
  connection: Connection,
  brandIdValue: number | string,
) => {
  const brandId = toNumber(brandIdValue)
  if (brandId === null) {
    return
  }
  const Sitemap = getVehicleSitemapModel(connection)
  await Sitemap.deleteMany({ brand_id: brandId })
}

export const rebuildVehicleSitemaps = async (connection: Connection) => {
  const Model = getModelModel(connection)
  const Brand = getBrandModel(connection)
  const Sitemap = getVehicleSitemapModel(connection)

  const [models, brands] = await Promise.all([
    Model.find()
      .select(['id', 'name', 'slug', 'brand_id', 'brand_name', 'fuel_type', 'status', 'updated_date'])
      .lean<LeanModel[]>(),
    Brand.find().select(['id', 'name', 'slug', 'status']).lean<LeanBrand[]>(),
  ])

  const brandLookup = new Map<number, { slug: string; name: string; status: boolean }>()
  brands.forEach((brand) => {
    const id = toNumber(brand.id)
    if (id !== null) {
      const slug = slugifySegment(
        typeof brand.slug === 'string' && brand.slug.trim().length > 0 ? brand.slug : brand.name,
      )
      const name =
        typeof brand.name === 'string' && brand.name.trim().length > 0 ? brand.name.trim() : slug
      brandLookup.set(id, {
        slug,
        name,
        status: brand.status !== false,
      })
    }
  })

  let created = 0
  let updated = 0
  let deactivated = 0

  for (const model of models) {
    const brandContext = brandLookup.get(toNumber(model.brand_id) ?? -1) ?? undefined
    const result = await upsertVehicleEntriesForModel(connection, model, brandContext)
    created += result.created
    updated += result.updated
    deactivated += result.deactivated
  }

  const referencedModelIds = models.map((model) => model.id)
  await Sitemap.deleteMany({ model_id: { $nin: referencedModelIds } })

  return { processed: models.length, created, updated, deactivated }
}
