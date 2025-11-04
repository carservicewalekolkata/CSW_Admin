import type { RolePermission, RoleRecord } from '@/types/roles'
import type { RolePermissionTableId } from '@/constants/roles'

export type PermissionStateEntry = {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
}

export type PermissionState = Record<RolePermissionTableId, PermissionStateEntry>

export type RoleDraft = {
  name: string
  description: string
  members: string
  permissions: PermissionState
}

export const createEmptyPermissionState = (tables: RolePermissionTableId[]): PermissionState =>
  tables.reduce((accumulator, tableId) => {
    accumulator[tableId] = {
      canView: false,
      canEdit: false,
      canDelete: false,
    }
    return accumulator
  }, {} as PermissionState)

export const createEmptyRoleDraft = (tables: RolePermissionTableId[]): RoleDraft => ({
  name: '',
  description: '',
  members: '',
  permissions: createEmptyPermissionState(tables),
})

export const createDraftFromRole = (role: RoleRecord, tables: RolePermissionTableId[]): RoleDraft => {
  const draft = createEmptyRoleDraft(tables)

  draft.name = role.name
  draft.description = role.description ?? ''
  draft.members = role.members.join('\n')

  for (const permission of role.permissions) {
    const existing = draft.permissions[permission.table]
    if (!existing) {
      continue
    }

    const canEdit = Boolean(permission.canEdit)
    const canDelete = Boolean(permission.canDelete)

    existing.canEdit = canEdit
    existing.canDelete = canDelete
    existing.canView = Boolean(permission.canView || canEdit || canDelete)
  }

  return draft
}

export const toRoleMutationPayload = (draft: RoleDraft): RolePermission[] =>
  Object.entries(draft.permissions)
    .map(([tableId, entry]) => ({
      table: tableId as RolePermissionTableId,
      canView: Boolean(entry.canView || entry.canEdit || entry.canDelete),
      canEdit: Boolean(entry.canEdit),
      canDelete: Boolean(entry.canDelete),
    }))
    .filter((permission) => permission.canView)
