import { NextResponse } from 'next/server'

import { updateCustomerCartStatus, CustomerActivityError } from '@/server/customerActivityStore'
import type { CustomerCartStatus } from '@/types/customerActivity'

const ALLOWED_STATUSES: readonly CustomerCartStatus[] = ['on-cart', 'booked', 'solved', 'cancelled']

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const entryId = typeof body?.entryId === 'string' ? body.entryId.trim() : ''
    const status = typeof body?.status === 'string' ? (body.status.trim() as CustomerCartStatus) : undefined

    if (!entryId || !status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid entry or status' }, { status: 400 })
    }

    const entry = await updateCustomerCartStatus(entryId, status)
    return NextResponse.json({ success: true, entry })
  } catch (error) {
    if (error instanceof CustomerActivityError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('Failed to update cart status', error)
    return NextResponse.json({ success: false, message: 'Unable to update cart status' }, { status: 500 })
  }
}
