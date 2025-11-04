import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'

import { versionedJson } from '@/server/apiVersion'
import { connectToDatabase } from '@/lib/db'
import { UserModel } from '@/models/User'

const MIN_PASSWORD_LENGTH = 12

const normalizeTimestamp = (value: unknown) => {
  if (!(value instanceof Date)) {
    const asDate = value ? new Date(value as string | number) : null
    if (!asDate || Number.isNaN(asDate.getTime())) {
      return null
    }
    return asDate.toISOString()
  }

  return value.toISOString()
}

const normalizeUser = (user: unknown) => {
  if (!user || typeof user !== 'object') {
    return null
  }

  const doc = user as {
    _id?: unknown
    id?: unknown
    email?: unknown
    name?: unknown
    roles?: unknown
    createdAt?: unknown
    updatedAt?: unknown
  }

  const id = typeof doc._id === 'object' && doc._id !== null && 'toString' in doc._id ? String(doc._id) : String(doc.id ?? '')

  const email = typeof doc.email === 'string' ? doc.email : ''
  const name = typeof doc.name === 'string' ? doc.name : null
  const roles = Array.isArray(doc.roles) ? doc.roles.map((role) => String(role)).filter(Boolean) : []

  return {
    id,
    email,
    name,
    roles,
    createdAt: normalizeTimestamp(doc.createdAt),
    updatedAt: normalizeTimestamp(doc.updatedAt),
  }
}

export const GET = async () => {
  try {
    await connectToDatabase()

    const user = await UserModel.findOne({ roles: 'super-admin' }).lean()

    if (!user) {
      return versionedJson(
        {
          success: false,
          data: null,
          message: 'Super admin user not found',
        },
        { status: 404 },
      )
    }

    return versionedJson({
      success: true,
      data: normalizeUser(user),
    })
  } catch (error: unknown) {
    console.error('❌ Error fetching super admin:', error)
    const message = error instanceof Error ? error.message : 'Unable to load super admin'

    return versionedJson(
      {
        success: false,
        data: null,
        message,
      },
      { status: 500 },
    )
  }
}

type UpdateSuperUserPasswordBody = {
  newPassword?: unknown
}

export const PATCH = async (request: NextRequest) => {
  let body: UpdateSuperUserPasswordBody | null = null

  try {
    body = await request.json()
  } catch {
    return versionedJson(
      {
        success: false,
        message: 'Invalid JSON payload',
      },
      { status: 400 },
    )
  }

  const password = typeof body?.newPassword === 'string' ? body.newPassword.trim() : ''

  if (password.length < MIN_PASSWORD_LENGTH) {
    return versionedJson(
      {
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      },
      { status: 400 },
    )
  }

  try {
    await connectToDatabase()

    const user = await UserModel.findOne({ roles: 'super-admin' })

    if (!user) {
      return versionedJson(
        {
          success: false,
          message: 'Super admin user not found',
        },
        { status: 404 },
      )
    }

    const hash = await bcrypt.hash(password, 12)
    user.passwordHash = hash
    user.updatedAt = new Date()
    user.refreshTokenVersion = (user.refreshTokenVersion ?? 0) + 1

    await user.save()

    return versionedJson({
      success: true,
      message: 'Super admin password updated successfully',
    })
  } catch (error: unknown) {
    console.error('❌ Error updating super admin password:', error)
    const message = error instanceof Error ? error.message : 'Unable to update super admin password'

    return versionedJson(
      {
        success: false,
        message,
      },
      { status: 500 },
    )
  }
}
