import { connectToDatabase } from '@/lib/db'
import { getVehicleSitemapModel, type IVehicleSitemap } from '@/models'

const XML_NAMESPACES = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`)
const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const baseUrl = () => trimTrailingSlash(process.env.PUBLIC_SITE_BASE_URL?.trim() || 'https://carservicewale.com')

const toAbsoluteUrl = (route: string) => {
  const normalizedBase = baseUrl()
  if (route === '/') return `${normalizedBase}/`
  return `${normalizedBase}${ensureLeadingSlash(route)}`
}

const formatDate = (value?: Date | string | null) => {
  const d = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null
  if (!d || Number.isNaN(d.getTime())) return new Date().toISOString().split('T')[0]
  return d.toISOString().split('T')[0]
}

const buildUrlEntry = ({ loc, lastmod }: { loc: string; lastmod: string }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`

const buildUrlSet = (entries: Array<{ loc: string; lastmod: string }>) => {
  const urls = entries.map(buildUrlEntry).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${XML_NAMESPACES}>\n${urls}\n</urlset>\n`
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('includeInactive') === 'true'
    const brandSlug = url.searchParams.get('brandSlug')?.trim().toLowerCase()
    const modelSlug = url.searchParams.get('modelSlug')?.trim().toLowerCase()
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.min(Number(limitParam) || 500, 5000) : undefined

    const mongooseInstance = await connectToDatabase()
    const connection = mongooseInstance.connection
    if (!connection?.db) throw new Error('No active MongoDB connection')

    const VehicleSitemap = getVehicleSitemapModel(connection)

    const filter: Record<string, unknown> = {}
    if (!includeInactive) filter.active = true
    if (brandSlug) filter.brand_slug = { $regex: `^${escapeRegExp(brandSlug)}$`, $options: 'i' }
    if (modelSlug) filter.model_slug = { $regex: `^${escapeRegExp(modelSlug)}$`, $options: 'i' }

    let query = VehicleSitemap.find(filter)
      .sort({ path: 1 })
      .select(['path', 'last_modified'])
      .lean<Array<Pick<IVehicleSitemap, 'path' | 'last_modified'>>>()
    if (limit) query = query.limit(limit)

    const docs = await query

    const today = new Date().toISOString().split('T')[0]
    const entries = docs
      .filter((doc) => typeof doc.path === 'string' && doc.path.trim().length > 0)
      .map((doc) => ({ loc: toAbsoluteUrl(doc.path), lastmod: formatDate(doc.last_modified) || today }))

    const xml = buildUrlSet(entries)
    return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<error>${msg}</error>\n`, {
      status: 500,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }
}

