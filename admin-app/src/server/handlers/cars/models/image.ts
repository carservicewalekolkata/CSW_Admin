import { promises as fs } from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'

import { applyCors, corsPreflight } from '@/server/cors'
import { versionedJson } from '@/server/apiVersion'

const MODELS_IMAGE_DIR = path.join(process.cwd(), 'public', 'assets', 'images', 'models')

const allowedMimeTypes = new Map<string, string>([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
  ['image/svg+xml', '.svg'],
])

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'model'

const resolveExtension = (file: File) => {
  const fromMime = allowedMimeTypes.get(file.type)
  if (fromMime) return fromMime

  const parsed = path.parse(file.name ?? '')
  if (parsed.ext) {
    return parsed.ext.toLowerCase()
  }

  return '.png'
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return applyCors(
        request,
        versionedJson({ success: false, message: 'Image file is required' }, { status: 400 }),
      )
    }

    if (file.size === 0) {
      return applyCors(
        request,
        versionedJson({ success: false, message: 'Uploaded image is empty' }, { status: 400 }),
      )
    }

    if (file.type && !allowedMimeTypes.has(file.type)) {
      return applyCors(
        request,
        versionedJson(
          {
            success: false,
            message: 'Unsupported image format. Use PNG, JPEG, WebP, or SVG.',
          },
          { status: 415 },
        ),
      )
    }

    const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return applyCors(
        request,
        versionedJson(
          {
            success: false,
            message: 'Image must be 4 MB or smaller',
          },
          { status: 413 },
        ),
      )
    }

    const requestedBase =
      typeof formData.get('basename') === 'string' ? (formData.get('basename') as string) : null
    const derivedBase =
      requestedBase && requestedBase.trim().length > 0
        ? requestedBase
        : (file.name ?? '').split('.').slice(0, -1).join('.') || 'model-image'

    const extension = resolveExtension(file)
    const safeBase = slugify(derivedBase)
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const finalFilename = `${safeBase}-${uniqueSuffix}${extension}`

    await fs.mkdir(MODELS_IMAGE_DIR, { recursive: true })
    const absolutePath = path.join(MODELS_IMAGE_DIR, finalFilename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(absolutePath, buffer)

    const relativePath = path.posix.join('assets', 'images', 'models', finalFilename)

    return applyCors(
      request,
      versionedJson(
        {
          success: true,
          path: relativePath,
          url: `/${relativePath}`,
        },
        {
          status: 201,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      ),
    )
  } catch (error) {
    console.error('❌ Error uploading model image:', error)
    return applyCors(
      request,
      versionedJson(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Unable to upload image',
        },
        { status: 500 },
      ),
    )
  }
}

export const OPTIONS = (request: NextRequest) => corsPreflight(request)
