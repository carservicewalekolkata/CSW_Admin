'use client'

import { useCallback, useEffect, useState } from 'react'

import type { RoleMutationPayload, RoleRecord } from '@/types/roles'
import { APIEndpoint } from '@/APIEndpoints'

import { buildApiUrl } from '../utils/seedPageUtils'

type RolesListResponse = {
  success: boolean
  message?: string
  data?: RoleRecord[]
}

type RoleMutationResponse = {
  success: boolean
  message?: string
  data?: RoleRecord
}

const rolesBaseEndpoint = buildApiUrl(APIEndpoint.admin.roles.base)
const roleDetailEndpoint = (id: string) => buildApiUrl(APIEndpoint.admin.roles.detail(id))

const fetchRoles = async (): Promise<RolesListResponse> => {
  const response = await fetch(rolesBaseEndpoint, {
    method: 'GET',
    credentials: 'include',
  })

  const payload = (await response.json()) as RolesListResponse

  if (!response.ok) {
    return {
      success: false,
      message: payload.message ?? `Unable to load roles (status ${response.status})`,
      data: [],
    }
  }

  return payload
}

const createRoleRequest = async (payload: RoleMutationPayload): Promise<RoleMutationResponse> => {
  const response = await fetch(rolesBaseEndpoint, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = (await response.json()) as RoleMutationResponse

  if (!response.ok) {
    return {
      success: false,
      message: result.message ?? `Unable to create role (status ${response.status})`,
    }
  }

  return result
}

const updateRoleRequest = async (id: string, payload: RoleMutationPayload): Promise<RoleMutationResponse> => {
  const response = await fetch(roleDetailEndpoint(id), {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = (await response.json()) as RoleMutationResponse

  if (!response.ok) {
    return {
      success: false,
      message: result.message ?? `Unable to update role (status ${response.status})`,
    }
  }

  return result
}

const deleteRoleRequest = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const response = await fetch(roleDetailEndpoint(id), {
    method: 'DELETE',
    credentials: 'include',
  })

  const result = (await response.json()) as { success: boolean; message?: string }

  if (!response.ok) {
    return {
      success: false,
      message: result.message ?? `Unable to delete role (status ${response.status})`,
    }
  }

  return result
}

export const useRoles = () => {
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const payload = await fetchRoles()

      if (!payload.success) {
        setRoles([])
        setError(payload.message ?? 'Unable to load roles')
        return
      }

      setRoles(Array.isArray(payload.data) ? payload.data : [])
    } catch (unknownError: unknown) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to load roles'
      setRoles([])
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createRole = useCallback(
    async (payload: RoleMutationPayload) => {
      try {
        const response = await createRoleRequest(payload)
        if (!response.success || !response.data) {
          return { success: false, message: response.message ?? 'Unable to create role' }
        }

        setRoles((current) => [response.data as RoleRecord, ...current])
        return { success: true, data: response.data }
      } catch (unknownError: unknown) {
        const message = unknownError instanceof Error ? unknownError.message : 'Unable to create role'
        return { success: false, message }
      }
    },
    [],
  )

  const updateRole = useCallback(
    async (id: string, payload: RoleMutationPayload) => {
      try {
        const response = await updateRoleRequest(id, payload)

        if (!response.success || !response.data) {
          return { success: false, message: response.message ?? 'Unable to update role' }
        }

        setRoles((current) =>
          current.map((role) => {
            if (role.id !== id) {
              return role
            }
            return response.data as RoleRecord
          }),
        )

        return { success: true, data: response.data }
      } catch (unknownError: unknown) {
        const message = unknownError instanceof Error ? unknownError.message : 'Unable to update role'
        return { success: false, message }
      }
    },
    [],
  )

  const deleteRole = useCallback(async (id: string) => {
    try {
      const response = await deleteRoleRequest(id)

      if (!response.success) {
        return { success: false, message: response.message ?? 'Unable to delete role' }
      }

      setRoles((current) => current.filter((role) => role.id !== id))
      return { success: true }
    } catch (unknownError: unknown) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to delete role'
      return { success: false, message }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    roles,
    isLoading,
    error,
    setError,
    refresh,
    createRole,
    updateRole,
    deleteRole,
  }
}
