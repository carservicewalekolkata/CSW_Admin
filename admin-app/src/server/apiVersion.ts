import { NextResponse } from 'next/server'

export const API_VERSION = 'v1'
export const API_VERSION_HEADER = 'X-API-Version'

export const withApiVersion = <T>(response: NextResponse<T>) => {
  response.headers.set(API_VERSION_HEADER, API_VERSION)
  return response
}

export const versionedJson = <T>(
  body: T,
  init?: Parameters<typeof NextResponse.json>[1],
) => {
  const response = NextResponse.json(body, init)
  return withApiVersion(response)
}

