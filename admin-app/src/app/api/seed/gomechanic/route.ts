import { spawn } from 'node:child_process'
import path from 'node:path'

import { NextResponse } from 'next/server'

interface CategoryOverridePayload {
  id: string
  apiName?: string | null
  writeAs?: string | null
}

interface CategoryConfigPayload {
  id: string
  label: string
  overrides?: CategoryOverridePayload[]
}

interface SeedRequestPayload {
  mongodbUri?: string
  databaseName?: string | null
  bearerToken?: string
  cityId?: string
  operations?: string[]
  categoryConfig?: CategoryConfigPayload[]
  includeAssets?: boolean
  dryRun?: boolean
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  const body = (await request.json()) as SeedRequestPayload

  const mongodbUri = body.mongodbUri?.trim()
  const bearerToken = body.bearerToken?.trim()
  const cityId = body.cityId?.trim()
  const operations = Array.isArray(body.operations) ? body.operations.map(String) : []
  const categoryConfig = Array.isArray(body.categoryConfig) ? body.categoryConfig : []

  if (!mongodbUri) {
    return NextResponse.json({ error: 'MongoDB connection URI is required.' }, { status: 400 })
  }

  if (!bearerToken) {
    return NextResponse.json({ error: 'GoMechanic bearer token is required.' }, { status: 400 })
  }

  if (!operations.length) {
    return NextResponse.json({ error: 'Select at least one operation to run.' }, { status: 400 })
  }

  const projectRoot = path.resolve(process.cwd(), '..')
  const scriptPath = path.join(projectRoot, 'scripts', 'seed_gomechanic_data.py')
  const pythonBinary = process.env.SEED_PYTHON_BIN ?? 'python3'

  const args = [scriptPath, '--operations', ...operations]

  if (categoryConfig.length) {
    args.push('--category-json', JSON.stringify({ categories: categoryConfig }))
  }

  if (cityId) {
    args.push('--city-id', cityId)
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    MONGODB_URI: mongodbUri,
    GOMECHANIC_BEARER_TOKEN: bearerToken,
    GOMECHANIC_CITY_ID: cityId ?? process.env.GOMECHANIC_CITY_ID ?? '',
    PYTHONUNBUFFERED: '1',
  }

  if (body.databaseName && body.databaseName.trim()) {
    env.DB_CSW_NAME = body.databaseName.trim()
  }

  if (!env.GOMECHANIC_CITY_ID) {
    delete env.GOMECHANIC_CITY_ID
  }

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream<Uint8Array>()
  const writer = writable.getWriter()

  const sendEvent = async (data: Record<string, unknown>) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`
    await writer.write(encoder.encode(payload))
  }

  const streamPromise = new Promise<void>((resolve) => {
    const child = spawn(pythonBinary, args, {
      cwd: projectRoot,
      env,
    })

    const handleChunk = async (buffer: Buffer, source: 'stdout' | 'stderr') => {
      const text = buffer.toString()
      const lines = text.split(/\r?\n/)
      for (const line of lines) {
        if (!line.trim()) {
          continue
        }
        await sendEvent({ type: 'log', source, message: line })
      }
    }

    child.stdout.on('data', (chunk) => {
      void handleChunk(chunk, 'stdout').catch(() => {})
    })

    child.stderr.on('data', (chunk) => {
      void handleChunk(chunk, 'stderr').catch(() => {})
    })

    child.on('error', async (error) => {
      await sendEvent({ type: 'error', message: error.message })
      await writer.close()
      resolve()
    })

    child.on('close', async (code) => {
      if (code === 0) {
        await sendEvent({ type: 'status', state: 'completed', exitCode: 0 })
      } else {
        await sendEvent({ type: 'status', state: 'failed', exitCode: code, message: `GoMechanic seed script exited with code ${code}.` })
      }
      await writer.close()
      resolve()
    })

    void sendEvent({ type: 'status', state: 'started' })
  })

  const response = new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })

  streamPromise.catch(async (error) => {
    const message = error instanceof Error ? error.message : 'Failed to execute GoMechanic seed script.'
    try {
      await sendEvent({ type: 'error', message })
    } catch {}
    try {
      await writer.close()
    } catch {}
  })

  return response
}
