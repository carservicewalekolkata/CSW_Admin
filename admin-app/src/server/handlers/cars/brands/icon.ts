/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from 'next/server'
import { GridFSBucket } from 'mongodb'
import { Types } from 'mongoose'

import { withApiVersion, versionedJson } from '@/server/apiVersion'
import { connectToDatabase } from '@/lib/db'
import { applyCors, corsPreflight } from '@/server/cors'

type IconRouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

const resolveParams = async (context: IconRouteContext) => {
  const params = context.params instanceof Promise ? await context.params : context.params
  return params
}

export async function GET(
  request: NextRequest,
  context: IconRouteContext,
): Promise<NextResponse<unknown>> {
  try {
    const { id } = await resolveParams(context)

    const mongooseInstance = await connectToDatabase()
    const db = mongooseInstance.connection.db
    if (!db) throw new Error('No active DB connection')

    if (!Types.ObjectId.isValid(id)) {
      return versionedJson(
        { success: false, message: 'Invalid file ID' },
        { status: 400 },
      )
    }

    const bucket = new GridFSBucket(db, { bucketName: 'fs' })
    const objectId = new Types.ObjectId(id)

    const fileDoc = await db.collection('fs.files').findOne({ _id: objectId })
    if (!fileDoc) {
      return versionedJson(
        { success: false, message: 'File not found' },
        { status: 404 },
      )
    }

    const filename = fileDoc.filename || ''
    const contentType =
      fileDoc.contentType ||
      (filename.endsWith('.jpg') || filename.endsWith('.jpeg')
        ? 'image/jpeg'
        : filename.endsWith('.webp')
        ? 'image/webp'
        : filename.endsWith('.png')
        ? 'image/png'
        : 'application/octet-stream')

    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      const stream = bucket.openDownloadStream(objectId)
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', resolve)
      stream.on('error', reject)
    })

    const buffer = Buffer.concat(chunks)

    const response = new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
    return applyCors(request, withApiVersion(response))
  } catch (err: any) {
    console.error('❌ Error fetching GridFS file:', err)
    return applyCors(
      request,
      versionedJson(
        { success: false, message: err.message },
        { status: 500 },
      ),
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<unknown>> {
  try {
    const mongooseInstance = await connectToDatabase()
    const db = mongooseInstance.connection.db

    if (!db) {
      throw new Error('No active DB connection')
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return applyCors(
        request,
        versionedJson(
          { success: false, message: 'Icon file is required' },
          { status: 400 },
        ),
      )
    }

    if (file.size === 0) {
      return applyCors(
        request,
        versionedJson(
          { success: false, message: 'Uploaded icon is empty' },
          { status: 400 },
        ),
      )
    }

    const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
    if (file.type && !allowedMimeTypes.has(file.type)) {
      return applyCors(
        request,
        versionedJson(
          {
            success: false,
            message: 'Unsupported icon format. Use PNG, JPEG, WebP, or SVG.',
          },
          { status: 415 },
        ),
      )
    }

    const MAX_ICON_SIZE_BYTES = 1.5 * 1024 * 1024 // 1.5 MB
    if (file.size > MAX_ICON_SIZE_BYTES) {
      return applyCors(
        request,
        versionedJson(
          {
            success: false,
            message: 'Icon must be 1.5 MB or smaller',
          },
          { status: 413 },
        ),
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const bucket = new GridFSBucket(db, { bucketName: 'fs' })
    const filenameFromForm = formData.get('filename')
    const safeFilename =
      typeof filenameFromForm === 'string' && filenameFromForm.trim().length > 0
        ? filenameFromForm.trim()
        : file.name && file.name.trim().length > 0
        ? file.name.trim()
        : `brand-icon-${Date.now()}`

    const uploadStream = bucket.openUploadStream(safeFilename, {
      contentType: file.type || 'application/octet-stream',
    })

    const iconId = await new Promise<string>((resolve, reject) => {
      uploadStream.on('finish', () => resolve(String(uploadStream.id)))
      uploadStream.on('error', reject)
      uploadStream.end(buffer)
    })

    return applyCors(
      request,
      versionedJson(
        {
          success: true,
          iconId,
          url: `/api/v1/cars/brands/icon/${iconId}`,
        },
        {
          status: 201,
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      ),
    )
  } catch (err: any) {
    console.error('❌ Error uploading brand icon:', err)
    return applyCors(
      request,
      versionedJson(
        {
          success: false,
          message: err?.message ?? 'Unable to upload icon',
        },
        { status: 500 },
      ),
    )
  }
}

export const OPTIONS = (request: NextRequest) => corsPreflight(request)
