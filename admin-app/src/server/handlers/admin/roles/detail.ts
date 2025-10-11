import { Types } from 'mongoose'

import { versionedJson } from '@/server/apiVersion'
import { connectToDatabase } from '@/lib/db'
import { RoleModel } from '@/models/Role'

import { buildRoleSlug, normalizeRoleRecord, parseRolePayload } from './utils'

const isValidObjectId = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false
  }

  return Types.ObjectId.isValid(value)
}

export const PATCH = async (request: Request, context: { params?: { id?: string } }) => {
  const id = context.params?.id ?? ''

  if (!isValidObjectId(id)) {
    return versionedJson(
      {
        success: false,
        message: 'Invalid role identifier',
      },
      { status: 400 },
    )
  }

  let body: unknown

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

  const parsed = parseRolePayload(body)
  if ('error' in parsed) {
    return versionedJson(
      {
        success: false,
        message: parsed.error,
      },
      { status: 400 },
    )
  }

  const { data } = parsed
  const slug = buildRoleSlug(data.name)

  if (!slug) {
    return versionedJson(
      {
        success: false,
        message: 'Role name must include at least one alphanumeric character',
      },
      { status: 400 },
    )
  }

  try {
    await connectToDatabase()

    const role = await RoleModel.findById(id)
    if (!role) {
      return versionedJson(
        {
          success: false,
          message: 'Role not found',
        },
        { status: 404 },
      )
    }

    if (role.slug !== slug) {
      const duplicate = await RoleModel.findOne({
        slug,
        _id: { $ne: new Types.ObjectId(id) },
      })

      if (duplicate) {
        return versionedJson(
          {
            success: false,
            message: 'Another role with this name already exists',
          },
          { status: 409 },
        )
      }
    }

    role.name = data.name
    role.slug = slug
    role.description = data.description
    role.members = data.members
    role.permissions = data.permissions

    await role.save()

    return versionedJson({
      success: true,
      data: normalizeRoleRecord(role.toObject()),
    })
  } catch (error: unknown) {
    console.error('❌ Error updating role:', error)
    const message = error instanceof Error ? error.message : 'Unable to update role'

    return versionedJson(
      {
        success: false,
        message,
      },
      { status: 500 },
    )
  }
}

export const DELETE = async (_request: Request, context: { params?: { id?: string } }) => {
  const id = context.params?.id ?? ''

  if (!isValidObjectId(id)) {
    return versionedJson(
      {
        success: false,
        message: 'Invalid role identifier',
      },
      { status: 400 },
    )
  }

  try {
    await connectToDatabase()

    const deleted = await RoleModel.findByIdAndDelete(id)

    if (!deleted) {
      return versionedJson(
        {
          success: false,
          message: 'Role not found',
        },
        { status: 404 },
      )
    }

    return versionedJson({
      success: true,
      message: 'Role deleted successfully',
    })
  } catch (error: unknown) {
    console.error('❌ Error deleting role:', error)
    const message = error instanceof Error ? error.message : 'Unable to delete role'

    return versionedJson(
      {
        success: false,
        message,
      },
      { status: 500 },
    )
  }
}
