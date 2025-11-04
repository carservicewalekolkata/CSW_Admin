import { randomInt } from 'crypto'

import { consumeOtpRecord, createOtpRecord, deleteOtpRecord, OtpError, verifyOtpRecord } from './otpStore'
import { sendOtpMessage } from '../sms/mysmsshopClient'

const DEFAULT_OTP_LENGTH = Number.parseInt(process.env.CSW_LOGIN_OTP_LENGTH ?? '4', 10) || 4
const DEFAULT_OTP_VALIDITY_MINUTES =
  Number.parseInt(process.env.CSW_LOGIN_OTP_VALIDITY_MINUTES ?? '5', 10) || 5
const DEFAULT_OTP_MAX_ATTEMPTS =
  Number.parseInt(process.env.CSW_LOGIN_OTP_MAX_ATTEMPTS ?? '5', 10) || 5

const generateNumericOtp = (length: number): string => {
  const digits = []
  for (let index = 0; index < length; index += 1) {
    const value = randomInt(0, 10)
    digits.push(value.toString())
  }
  return digits.join('')
}

export type RequestOtpResult = {
  requestId: string
  phone: string
  expiresAt: string
}

export const requestLoginOtp = async (phone: string): Promise<RequestOtpResult> => {
  const otpCode = generateNumericOtp(DEFAULT_OTP_LENGTH)

  const record = await createOtpRecord({
    phone,
    code: otpCode,
    validityMinutes: DEFAULT_OTP_VALIDITY_MINUTES,
    maxAttempts: DEFAULT_OTP_MAX_ATTEMPTS,
  })

  try {
    await sendOtpMessage({
      phone,
      otp: otpCode,
      validityMinutes: DEFAULT_OTP_VALIDITY_MINUTES,
    })
  } catch (error) {
    await deleteOtpRecord(record.id)
    console.error('Failed to send OTP via MySMSshop', error)
    throw error
  }

  return {
    requestId: record.id,
    phone: record.phone,
    expiresAt: record.expiresAt,
  }
}

export const verifyLoginOtp = verifyOtpRecord

export const consumeLoginOtpVerification = consumeOtpRecord

export { OtpError }
