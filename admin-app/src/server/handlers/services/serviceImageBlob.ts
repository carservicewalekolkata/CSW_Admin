import { Readable } from 'node:stream'

import { type NextRequest } from 'next/server'

import { downloadServiceImage } from '@/lib/azureStorage'

const sanitizePath = (segments: string[]) => {
  const joined = segments.join('/')
  if (!joined || joined.includes('..') || joined.includes('\\')) {
    return null
  }
  return joined.replace(/^\/+/, '')
}

const toWebStream = (nodeStream: NodeJS.ReadableStream) => {
  if (nodeStream instanceof Readable && typeof Readable.toWeb === 'function') {
    return Readable.toWeb(nodeStream)
  }

  const reader = nodeStream
  const iterator = reader[Symbol.asyncIterator]()
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iterator.next()
      if (done) {
        controller.close()
      } else {
        controller.enqueue(value as Uint8Array)
      }
    },
    async cancel() {
      await iterator.return?.()
    },
  })
}

export const streamAzureServiceImage = async (
  _request: NextRequest,
  params: { blob: string[] },
) => {
  const blobName = sanitizePath(params.blob ?? [])
  if (!blobName) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const result = await downloadServiceImage(blobName)
    const stream = result.readableStreamBody
    if (!stream) {
      throw new Error('Azure blob stream is unavailable')
    }

    const headers = new Headers()
    headers.set('Content-Type', result.contentType ?? 'application/octet-stream')
    headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400')
    if (typeof result.contentLength === 'number') {
      headers.set('Content-Length', result.contentLength.toString())
    }
    if (result.etag) {
      headers.set('ETag', result.etag)
    }
    if (result.lastModified) {
      headers.set('Last-Modified', result.lastModified.toUTCString())
    }

    const body = toWebStream(stream) as unknown as ReadableStream<Uint8Array>

    return new Response(body, {
      status: 200,
      headers,
    })
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 404) {
      return new Response('Not found', { status: 404 })
    }

    console.error('❌ Error streaming Azure service image:', error)
    return new Response('Unable to fetch image', { status: 500 })
  }
}
