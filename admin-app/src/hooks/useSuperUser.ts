'use client'

import { useCallback, useEffect, useState } from 'react'

import type { SuperUserInfo } from '@/types/roles'
import { APIEndpoint } from '@/APIEndpoints'

import { buildApiUrl } from '../utils/seedPageUtils'

type SuperUserResponse = {
  success: boolean
  message?: string
  data: SuperUserInfo | null
}

const superUserEndpoint = buildApiUrl(APIEndpoint.admin.superUser)

const fetchSuperUser = async (): Promise<SuperUserResponse> => {
  const response = await fetch(superUserEndpoint, {
    method: 'GET',
    credentials: 'include',
  })

  const payload = (await response.json()) as SuperUserResponse

  if (!response.ok) {
    return {
      success: false,
      message: payload.message ?? `Unable to load super admin (status ${response.status})`,
      data: null,
    }
  }

  return payload
}

const patchSuperUserPassword = async (password: string): Promise<{ success: boolean; message?: string }> => {
  const response = await fetch(superUserEndpoint, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ newPassword: password }),
  })

  const payload = (await response.json()) as { success: boolean; message?: string }

  if (!response.ok) {
    return {
      success: false,
      message: payload.message ?? `Unable to update password (status ${response.status})`,
    }
  }

  return payload
}

export const useSuperUser = () => {
  const [superUser, setSuperUser] = useState<SuperUserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const payload = await fetchSuperUser()

      if (!payload.success || !payload.data) {
        setSuperUser(null)
        setError(payload.message ?? 'Super admin user not found')
        return
      }

      setSuperUser(payload.data)
    } catch (unknownError: unknown) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to load super admin'
      setError(message)
      setSuperUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updatePassword = useCallback(
    async (password: string) => {
      setIsUpdatingPassword(true)

      try {
        const result = await patchSuperUserPassword(password)
        if (!result.success) {
          return { success: false, message: result.message ?? 'Unable to update password' }
        }

        await refresh()
        return { success: true }
      } catch (unknownError: unknown) {
        const message = unknownError instanceof Error ? unknownError.message : 'Unable to update password'
        return { success: false, message }
      } finally {
        setIsUpdatingPassword(false)
      }
    },
    [refresh],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    superUser,
    isLoading,
    error,
    refresh,
    updatePassword,
    isUpdatingPassword,
  }
}
