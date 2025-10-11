import { NextRequest, NextResponse } from 'next/server'
import { GridFSBucket } from 'mongodb'
import { Types } from 'mongoose'

import { connectToDatabase } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  context: RouteContext<'/api/cars/models/icon/[id]'>
) {
  try {
    const mongooseInstance = await connectToDatabase()
    const db = mongooseInstance.connection.db

    if (!db) {
      throw new Error('No active DB connection')
    }

    const { id: fileId } = await context.params
    if (!Types.ObjectId.isValid(fileId)) {
      return NextResponse.json({ success: false, message: 'Invalid file ID' }, { status: 400 })
    }

    const bucket = new GridFSBucket(db, { bucketName: 'fs' })
    const objectId = new Types.ObjectId(fileId)

    const fileDoc = await db.collection('fs.files').findOne({ _id: objectId })
    if (!fileDoc) {
      return NextResponse.json({ success: false, message: 'File not found' }, { status: 404 })
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

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: unknown) {
    console.error('❌ Error fetching model thumbnail:', error)
    const message = error instanceof Error ? error.message : 'Unable to fetch file'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
