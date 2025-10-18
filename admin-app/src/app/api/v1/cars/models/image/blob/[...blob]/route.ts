import { type NextRequest } from 'next/server'

import { streamAzureModelImage } from '@/server/handlers/cars/models/imageBlob'

export const runtime = 'nodejs'

export const GET = async (
  request: NextRequest,
  context: { params: Promise<{ blob: string[] }> },
) => {
  const params = await context.params
  return streamAzureModelImage(request, params)
}
