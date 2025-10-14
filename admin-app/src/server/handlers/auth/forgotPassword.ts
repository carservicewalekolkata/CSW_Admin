import { type NextRequest } from 'next/server'

import { versionedJson } from '@/server/apiVersion'
import { connectToDatabase } from '@/lib/db'
import { signResetToken } from '@/lib/auth/tokens'
import { UserModel } from '@/models/User'

interface ForgotPasswordRequestBody {
  email: string
}

export async function POST(request: NextRequest) {
  let body: Partial<ForgotPasswordRequestBody>

  try {
    body = await request.json()
  } catch {
    return versionedJson({ message: 'Invalid JSON payload' }, { status: 400 })
  }

  const email = body.email?.toLowerCase().trim()

  if (!email) {
    return versionedJson({ message: 'Email is required' }, { status: 400 })
  }

  await connectToDatabase()

  const user = await UserModel.findOne({ email }).exec()

  if (!user) {
    return versionedJson({ message: 'If the account exists, a reset link has been sent.' })
  }

  user.resetTokenVersion = (user.resetTokenVersion ?? 0) + 1
  await user.save()

  const resetToken = await signResetToken({
    sub: user.id,
    email: user.email,
    tokenVersion: user.resetTokenVersion,
  })

  const payload = {
    message: 'If the account exists, a reset link has been sent.',
    resetToken: process.env.NODE_ENV === 'production' ? undefined : resetToken,
  }

  return versionedJson(payload)
}

