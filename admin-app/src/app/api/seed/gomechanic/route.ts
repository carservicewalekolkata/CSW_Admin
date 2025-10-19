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

  const logs: string[] = []

  try {
    const child = spawn(pythonBinary, args, {
      cwd: projectRoot,
      env,
    })

    child.stdout.on('data', (chunk) => {
      logs.push(chunk.toString())
    })

    child.stderr.on('data', (chunk) => {
      logs.push(chunk.toString())
    })

    const exitCode: number = await new Promise((resolve, reject) => {
      child.on('error', (error) => reject(error))
      child.on('close', (code) => resolve(code ?? 0))
    })

    if (exitCode !== 0) {
      return NextResponse.json(
        {
          error: `GoMechanic seed script exited with code ${exitCode}.`,
          logs,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, logs })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to execute GoMechanic seed script.'
    logs.push(message)
    return NextResponse.json({ error: message, logs }, { status: 500 })
  }
}
