import type { RolePermissionTableId } from '@/constants/roles'

export type RolePermission = {
  table: RolePermissionTableId
  canView: boolean
  canEdit: boolean
  canDelete: boolean
}

export type RoleRecord = {
  id: string
  name: string
  slug: string
  description: string | null
  members: string[]
  permissions: RolePermission[]
  createdAt: string | null
  updatedAt: string | null
}

export type SuperUserInfo = {
  id: string
  email: string
  name: string | null
  roles: string[]
  createdAt: string | null
  updatedAt: string | null
}

export type RolesResponse = {
  success: boolean
  data: RoleRecord[]
}

export type SuperUserResponse = {
  success: boolean
  data: SuperUserInfo | null
  message?: string
}

export type RoleMutationPayload = {
  name: string
  description?: string | null
  members: string[]
  permissions: RolePermission[]
}
