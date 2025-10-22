import { versionedJson } from '@/server/apiVersion'
import { connectToDatabase } from '@/lib/db'
import {
  getModelModel,
  getVehicleSitemapModel,
  getBrandModel,
  type IVehicleSitemap,
} from '@/models'
import { applyCors, corsPreflight } from '@/server/cors'
import {
  rebuildVehicleSitemaps,
  syncVehicleSitemapsForBrand,
  syncVehicleSitemapsForModel,
} from '@/server/seo/vehicleSitemaps'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toBoolean = (value: string | null): boolean => value === 'true'

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

const ensureAuth = (request: Request) => {
  const token = process.env.SITEMAP_SYNC_TOKEN?.trim()
  if (!token) {
    return true
  }
  const headerToken = request.headers.get('x-internal-token')
  return headerToken === token
}

export async function GET(request: Request) {
  try {
    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const url = new URL(request.url)
    const includeInactive = toBoolean(url.searchParams.get('includeInactive'))
    const brandSlug = url.searchParams.get('brandSlug')?.trim().toLowerCase()
    const modelSlug = url.searchParams.get('modelSlug')?.trim().toLowerCase()
    const limitParam = url.searchParams.get('limit')
    const limitValue = limitParam ? Math.min(Number(limitParam) || 500, 5000) : undefined

    const filter: Record<string, unknown> = {}

    if (!includeInactive) {
      filter.active = true
    }

    if (brandSlug) {
      filter.brand_slug = { $regex: `^${escapeRegExp(brandSlug)}$`, $options: 'i' }
    }

    if (modelSlug) {
      filter.model_slug = { $regex: `^${escapeRegExp(modelSlug)}$`, $options: 'i' }
    }

    const VehicleSitemap = getVehicleSitemapModel(connection)

    let query = VehicleSitemap.find(filter)
      .sort({ path: 1 })
      .select(['brand_slug', 'model_slug', 'fuel_type', 'path', 'last_modified', 'active'])
      .lean<Array<Pick<IVehicleSitemap, 'brand_slug' | 'model_slug' | 'fuel_type' | 'path' | 'last_modified' | 'active'>>>()

    if (limitValue) {
      query = query.limit(limitValue)
    }

    const docs = await query

    const data = docs.map((doc) => ({
      brand_slug: doc.brand_slug,
      model_slug: doc.model_slug,
      fuel_type: doc.fuel_type,
      path: doc.path,
      active: Boolean(doc.active),
      last_modified:
        doc.last_modified instanceof Date && !Number.isNaN(doc.last_modified.getTime())
          ? doc.last_modified.toISOString()
          : new Date().toISOString(),
    }))

    return applyCors(
      request,
      versionedJson({
        success: true,
        count: data.length,
        timestamp: new Date().toISOString(),
        data,
      }),
    )
  } catch (error) {
    console.error('❌ Error fetching sitemap entries:', error)
    const message = error instanceof Error ? error.message : 'Unable to fetch sitemap entries'
    return applyCors(request, versionedJson({ success: false, message }, { status: 500 }))
  }
}

export async function POST(request: Request) {
  try {
    if (!ensureAuth(request)) {
      return applyCors(
      request,
        versionedJson({ success: false, message: 'Unauthorized sitemap sync request' }, { status: 401 }),
      )
    }

    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection

    if (!connection?.db) {
      throw new Error('No active MongoDB connection')
    }

    const payload = await request.json().catch(() => ({}))
    const mode = typeof payload?.mode === 'string' ? payload.mode : 'rebuild'

    if (mode === 'model') {
      const Model = getModelModel(connection)
      const modelId = toNumber(payload?.modelId)
      const modelSlug =
        typeof payload?.modelSlug === 'string' ? payload.modelSlug.trim().toLowerCase() : undefined

      if (modelId === null && !modelSlug) {
        return applyCors(
          request,
          versionedJson(
            { success: false, message: 'Provide modelId or modelSlug to sync a single model sitemap.' },
            { status: 400 },
          ),
        )
      }

      const modelDoc = await Model.findOne(
        modelId !== null ? { id: modelId } : { slug: modelSlug },
      )
        .select(['id', 'name', 'slug', 'brand_id', 'brand_name', 'fuel_type', 'status', 'updated_date'])
        .lean()

      if (!modelDoc) {
        return applyCors(
          request,
          versionedJson({ success: false, message: 'Model not found' }, { status: 404 }),
        )
      }

      const result = await syncVehicleSitemapsForModel(connection, modelDoc)

      return applyCors(
        request,
        versionedJson({
          success: true,
          scope: 'model',
          processed: 1,
          created: result.created,
          updated: result.updated,
          deactivated: result.deactivated,
          timestamp: new Date().toISOString(),
        }),
      )
    }

    if (mode === 'brand') {
      const Brand = getBrandModel(connection)
      const brandId = toNumber(payload?.brandId)
      const brandSlug =
        typeof payload?.brandSlug === 'string' ? payload.brandSlug.trim().toLowerCase() : undefined

      if (brandId === null && !brandSlug) {
        return applyCors(
          request,
          versionedJson(
            { success: false, message: 'Provide brandId or brandSlug to sync brand sitemaps.' },
            { status: 400 },
          ),
        )
      }

      const brandDoc = await Brand.findOne(
        brandId !== null ? { id: brandId } : { slug: brandSlug },
      )
        .select(['id', 'name', 'slug', 'status'])
        .lean()

      if (!brandDoc) {
        return applyCors(
          request,
          versionedJson({ success: false, message: 'Brand not found' }, { status: 404 }),
        )
      }

      const result = await syncVehicleSitemapsForBrand(connection, brandDoc)

      return applyCors(
        request,
        versionedJson({
          success: true,
          scope: 'brand',
          processed: result.processed,
          created: result.created,
          updated: result.updated,
          deactivated: result.deactivated,
          timestamp: new Date().toISOString(),
        }),
      )
    }

    const result = await rebuildVehicleSitemaps(connection)

    return applyCors(
      request,
      versionedJson({
        success: true,
        scope: 'rebuild',
        processed: result.processed,
        created: result.created,
        updated: result.updated,
        deactivated: result.deactivated,
        timestamp: new Date().toISOString(),
      }),
    )
  } catch (error) {
    console.error('❌ Error synchronising sitemaps:', error)
    const message = error instanceof Error ? error.message : 'Unable to sync sitemaps'
    return applyCors(request, versionedJson({ success: false, message }, { status: 500 }))
  }
}

export const OPTIONS = (request: Request) => corsPreflight(request)
