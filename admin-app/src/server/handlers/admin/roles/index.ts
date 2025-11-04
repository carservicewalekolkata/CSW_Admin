import { versionedJson } from '@/server/apiVersion'
import { connectToDatabase } from '@/lib/db'
import { RoleModel } from '@/models/Role'

import { buildRoleSlug, normalizeRoleRecord, parseRolePayload } from './utils'

export const GET = async () => {
  try {
    await connectToDatabase()

    const roles = await RoleModel.find().sort({ name: 1 }).lean()
    const data = roles.map((role) => normalizeRoleRecord(role))

    return versionedJson({
      success: true,
      data,
    })
  } catch (error: unknown) {
    console.error('❌ Error fetching roles:', error)
    const message = error instanceof Error ? error.message : 'Unable to load roles'

    return versionedJson(
      {
        success: false,
        message,
        data: [],
      },
      { status: 500 },
    )
  }
}

export const POST = async (request: Request) => {
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

    const existing = await RoleModel.findOne({ slug })
    if (existing) {
      return versionedJson(
        {
          success: false,
          message: 'A role with this name already exists',
        },
        { status: 409 },
      )
    }

    const created = await RoleModel.create({
      name: data.name,
      slug,
      description: data.description,
      members: data.members,
      permissions: data.permissions,
    })

    return versionedJson(
      {
        success: true,
        data: normalizeRoleRecord(created.toObject()),
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    console.error('❌ Error creating role:', error)
    const message = error instanceof Error ? error.message : 'Unable to create role'

    return versionedJson(
      {
        success: false,
        message,
      },
      { status: 500 },
    )
  }
}
