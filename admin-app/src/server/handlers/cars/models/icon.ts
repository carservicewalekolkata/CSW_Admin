import { NextRequest, NextResponse } from 'next/server'
import { GridFSBucket } from 'mongodb'
import { Types } from 'mongoose'

import { withApiVersion, versionedJson } from '@/server/apiVersion'
import { connectToDatabase } from '@/lib/db'

type IconRouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> }

const resolveParams = async (context: IconRouteContext) => {
  const params = context.params instanceof Promise ? await context.params : context.params
  return params
}

export async function GET(
  _request: NextRequest,
  context: IconRouteContext,
) {
  try {
    const { id: fileId } = await resolveParams(context)

    const mongooseInstance = await connectToDatabase()
    const db = mongooseInstance.connection.db

    if (!db) {
      throw new Error('No active DB connection')
    }

    if (!Types.ObjectId.isValid(fileId)) {
      return versionedJson({ success: false, message: 'Invalid file ID' }, { status: 400 })
    }

    const bucket = new GridFSBucket(db, { bucketName: 'fs' })
    const objectId = new Types.ObjectId(fileId)

    const fileDoc = await db.collection('fs.files').findOne({ _id: objectId })
    if (!fileDoc) {
      return versionedJson({ success: false, message: 'File not found' }, { status: 404 })
    }

    const contentType = fileDoc.contentType || 'image/png'
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
    return withApiVersion(response)
  } catch (error: unknown) {
    console.error('❌ Error fetching model thumbnail:', error)
    const message = error instanceof Error ? error.message : 'Unable to fetch file'
    return versionedJson({ success: false, message }, { status: 500 })
  }
}

