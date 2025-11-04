import { NextResponse } from 'next/server'

import { CustomerActivityError, listCustomerSessions, recordCustomerActivity } from '@/server/customerActivityStore'
import type { CustomerActivityVehicle, CustomerCartStatus } from '@/types/customerActivity'
import { applyCors, corsPreflight } from '@/server/cors'

const isValidVehicle = (vehicle: CustomerActivityVehicle | null | undefined): vehicle is CustomerActivityVehicle =>
  Boolean(
    vehicle &&
      typeof vehicle.brandSlug === 'string' &&
      typeof vehicle.brandName === 'string' &&
      typeof vehicle.modelSlug === 'string' &&
      typeof vehicle.modelName === 'string' &&
      typeof vehicle.fuelType === 'string',
  )

export const OPTIONS = corsPreflight

export async function GET(request: Request) {
  const sessions = await listCustomerSessions()
  const response = NextResponse.json({ sessions })
  return applyCors(request, response)
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    const sessionToken = typeof payload?.sessionToken === 'string' ? payload.sessionToken.trim() : undefined
    const vehicle: CustomerActivityVehicle | undefined = payload?.vehicle
    const cartItems = Array.isArray(payload?.cartItems) ? payload.cartItems : undefined
    const previousQueries = Array.isArray(payload?.previousQueries) ? payload.previousQueries : undefined
    const cartStatus = isValidCartStatus(payload?.cartStatus) ? payload.cartStatus : undefined
    const cartHistory = Array.isArray(payload?.cartHistory) ? payload.cartHistory : undefined
    const servicePageVisitedAt =
      typeof payload?.servicePageVisitedAt === 'string' && payload.servicePageVisitedAt.trim().length > 0
        ? (payload.servicePageVisitedAt as string)
        : undefined
    const searchSource =
      typeof payload?.searchSource === 'string' && payload.searchSource.trim().length > 0
        ? (payload.searchSource as string)
        : undefined

    if (!isValidVehicle(vehicle)) {
      const response = NextResponse.json({ message: 'Vehicle information is required.' }, { status: 400 })
      return applyCors(request, response)
    }

    if (sessionToken) {
      const { session, entry } = await recordCustomerActivity({
        sessionToken,
        vehicle,
        cartItems,
        previousQueries,
        cartStatus,
        cartHistory,
        servicePageVisitedAt,
        searchSource,
      })

      const response = NextResponse.json({
        sessionToken: session.token,
        entry,
        session,
      })
      return applyCors(request, response)
    }

    const phone = typeof payload?.phone === 'string' ? payload.phone.trim() : ''
    const otpRequestId = typeof payload?.otpRequestId === 'string' ? payload.otpRequestId.trim() : ''

    if (!phone) {
      const response = NextResponse.json({ message: 'Phone number is required.' }, { status: 400 })
      return applyCors(request, response)
    }

    if (!/^\d{10}$/.test(phone)) {
      const response = NextResponse.json({ message: 'Phone number must be 10 digits.' }, { status: 400 })
      return applyCors(request, response)
    }

    const { session, entry } = await recordCustomerActivity({
      phone,
      otpRequestId,
      vehicle,
      cartItems,
      previousQueries,
      cartStatus,
      cartHistory,
      servicePageVisitedAt,
      searchSource,
    })

    const response = NextResponse.json({
      sessionToken: session.token,
      entry,
      session,
    })
    return applyCors(request, response)
  } catch (error) {
    if (error instanceof CustomerActivityError) {
      const response = NextResponse.json({ message: error.message }, { status: error.status })
      return applyCors(request, response)
    }

    console.error('Failed to record customer activity', error)
    const response = NextResponse.json(
      { message: 'Unexpected error while recording customer activity.' },
      { status: 500 },
    )
    return applyCors(request, response)
  }
}
const isValidCartStatus = (value: unknown): value is CustomerCartStatus =>
  value === 'on-cart' || value === 'booked' || value === 'solved' || value === 'cancelled'
