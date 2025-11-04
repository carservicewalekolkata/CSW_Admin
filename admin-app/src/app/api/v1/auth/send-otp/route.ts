import { NextResponse } from 'next/server'

import { applyCors, corsPreflight } from '@/server/cors'
import { requestLoginOtp } from '@/server/otp/service'

export const OPTIONS = corsPreflight

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}))
    const phone = typeof payload?.phone === 'string' ? payload.phone.trim() : ''

    if (!phone) {
      return applyCors(request, NextResponse.json({ message: 'Phone number is required.' }, { status: 400 }))
    }

    if (!/^\d{10}$/.test(phone)) {
      return applyCors(
        request,
        NextResponse.json({ message: 'Phone number must be a 10 digit Indian mobile number.' }, { status: 400 }),
      )
    }

    const result = await requestLoginOtp(phone)

    return applyCors(
      request,
      NextResponse.json({
        requestId: result.requestId,
        expiresAt: result.expiresAt,
      }),
    )
  } catch (error) {
    console.error('Failed to send login OTP', error)
    return applyCors(
      request,
      NextResponse.json(
        { message: 'Unable to send OTP at the moment. Please try again shortly.' },
        { status: 500 },
      ),
    )
  }
}
