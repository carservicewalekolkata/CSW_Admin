import { type NextRequest } from 'next/server'

import { streamAzureServiceImage } from '@/server/handlers/services/serviceImageBlob'

export const runtime = 'nodejs'

export const GET = async (
  request: NextRequest,
  context: { params: Promise<{ blob: string[] }> },
) => {
  const params = await context.params
  return streamAzureServiceImage(request, params)
}
