import { NextResponse } from 'next/server'

import { applyCors, corsPreflight } from '@/server/cors'
import { OtpError, verifyLoginOtp } from '@/server/otp/service'

export const OPTIONS = corsPreflight

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}))

    const requestId = typeof payload?.requestId === 'string' ? payload.requestId.trim() : ''
    const phone = typeof payload?.phone === 'string' ? payload.phone.trim() : ''
    const otp = typeof payload?.otp === 'string' ? payload.otp.trim() : ''

    if (!requestId) {
      return applyCors(
        request,
        NextResponse.json({ message: 'OTP request id is required.' }, { status: 400 }),
      )
    }

    if (!phone) {
      return applyCors(request, NextResponse.json({ message: 'Phone number is required.' }, { status: 400 }))
    }

    if (!otp) {
      return applyCors(request, NextResponse.json({ message: 'OTP code is required.' }, { status: 400 }))
    }

    const result = await verifyLoginOtp({ requestId, phone, code: otp })

    return applyCors(
      request,
      NextResponse.json({
        requestId: result.id,
        phone: result.phone,
        expiresAt: result.expiresAt,
        verifiedAt: result.verifiedAt,
        attemptsRemaining: result.attemptsRemaining,
      }),
    )
  } catch (error) {
    if (error instanceof OtpError) {
      return applyCors(request, NextResponse.json({ message: error.message }, { status: error.status }))
    }

    console.error('Failed to verify OTP', error)
    return applyCors(
      request,
      NextResponse.json(
        { message: 'Unable to verify OTP at the moment. Please try again shortly.' },
        { status: 500 },
      ),
    )
  }
}
