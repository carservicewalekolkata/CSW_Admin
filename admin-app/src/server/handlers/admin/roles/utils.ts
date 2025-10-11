import { ROLE_PERMISSION_TABLE_IDS, type RolePermissionTableId } from '@/constants/roles'
import type { RoleMutationPayload, RolePermission, RoleRecord } from '@/types/roles'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i

const normalizeTimestamp = (value: unknown): string | null => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  const date = new Date(value as string | number)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export const buildRoleSlug = (name: string) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const normalizeRoleRecord = (role: unknown): RoleRecord => {
  if (!role || typeof role !== 'object') {
    throw new Error('Invalid role document')
  }

  const doc = role as {
    _id?: unknown
    id?: unknown
    name?: unknown
    slug?: unknown
    description?: unknown
    members?: unknown
    permissions?: unknown
    createdAt?: unknown
    updatedAt?: unknown
  }

  const id =
    typeof doc._id === 'object' && doc._id !== null && 'toString' in doc._id
      ? String(doc._id)
      : typeof doc.id === 'string'
        ? doc.id
        : ''

  const name = typeof doc.name === 'string' ? doc.name : ''
  const slug = typeof doc.slug === 'string' ? doc.slug : buildRoleSlug(name)
  const description = typeof doc.description === 'string' && doc.description.trim() ? doc.description : null
  const members = Array.isArray(doc.members)
    ? doc.members
        .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : null))
        .filter((entry): entry is string => Boolean(entry))
    : []

  const permissions = Array.isArray(doc.permissions)
    ? doc.permissions
        .map((permission) => {
          if (!permission || typeof permission !== 'object') {
            return null
          }

          const candidate = permission as {
            table?: unknown
            canView?: unknown
            canEdit?: unknown
            canDelete?: unknown
          }

          const table = typeof candidate.table === 'string' ? (candidate.table as RolePermissionTableId) : null
          if (!table || !ROLE_PERMISSION_TABLE_IDS.includes(table)) {
            return null
          }

          const canEdit = Boolean(candidate.canEdit)
          const canDelete = Boolean(candidate.canDelete)
          const canView = Boolean(candidate.canView || canEdit || canDelete)

          return {
            table,
            canView,
            canEdit,
            canDelete,
          }
        })
        .filter((entry): entry is RolePermission => entry !== null)
    : []

  return {
    id,
    name,
    slug,
    description,
    members,
    permissions,
    createdAt: normalizeTimestamp(doc.createdAt),
    updatedAt: normalizeTimestamp(doc.updatedAt),
  }
}

type ParsedRolePayload = {
  data: RoleMutationPayload
  error?: never
}

type RolePayloadError = {
  data?: never
  error: string
}

const normalizeMembers = (input: unknown): RolePayloadError | { value: string[] } => {
  if (input === undefined) {
    return { value: [] }
  }

  if (!Array.isArray(input)) {
    return { error: 'Members must be provided as an array of email addresses' }
  }

  const seen = new Set<string>()
  const output: string[] = []

  for (const entry of input) {
    if (typeof entry !== 'string') {
      return { error: 'All members must be email strings' }
    }

    const email = entry.trim().toLowerCase()
    if (!email) {
      continue
    }

    if (!EMAIL_REGEX.test(email)) {
      return { error: `Invalid email address: ${entry}` }
    }

    if (seen.has(email)) {
      continue
    }

    seen.add(email)
    output.push(email)
  }

  return { value: output }
}

const normalizePermissions = (input: unknown): RolePayloadError | { value: RolePermission[] } => {
  if (input === undefined) {
    return { value: [] }
  }

  if (!Array.isArray(input)) {
    return { error: 'Permissions must be provided as an array' }
  }

  const seen = new Set<RolePermissionTableId>()
  const output: RolePermission[] = []

  for (const entry of input) {
    if (!entry || typeof entry !== 'object') {
      return { error: 'Each permission must be an object' }
    }

    const candidate = entry as {
      table?: unknown
      canView?: unknown
      canEdit?: unknown
      canDelete?: unknown
    }

    const table = typeof candidate.table === 'string' ? candidate.table : ''
    if (!ROLE_PERMISSION_TABLE_IDS.includes(table as RolePermissionTableId)) {
      return { error: `Unknown permission target: ${table || 'undefined'}` }
    }

    const id = table as RolePermissionTableId

    if (seen.has(id)) {
      continue
    }

    seen.add(id)

    const canEdit = Boolean(candidate.canEdit)
    const canDelete = Boolean(candidate.canDelete)
    const canView = Boolean(candidate.canView || canEdit || canDelete)

    output.push({
      table: id,
      canView,
      canEdit,
      canDelete,
    })
  }

  return { value: output }
}

export const parseRolePayload = (input: unknown): ParsedRolePayload | RolePayloadError => {
  if (!input || typeof input !== 'object') {
    return { error: 'Invalid payload' }
  }

  const payload = input as {
    name?: unknown
    description?: unknown
    members?: unknown
    permissions?: unknown
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : ''

  if (!name) {
    return { error: 'Role name is required' }
  }

  const desc =
    typeof payload.description === 'string' && payload.description.trim() ? payload.description.trim() : null

  const membersResult = normalizeMembers(payload.members)
  if ('error' in membersResult) {
    return membersResult
  }

  const permissionsResult = normalizePermissions(payload.permissions)
  if ('error' in permissionsResult) {
    return permissionsResult
  }

  return {
    data: {
      name,
      description: desc,
      members: membersResult.value,
      permissions: permissionsResult.value,
    },
  }
}
