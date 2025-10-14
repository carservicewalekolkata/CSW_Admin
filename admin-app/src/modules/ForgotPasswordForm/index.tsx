'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'

import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { SerializedError } from '@reduxjs/toolkit'

import { authApi } from '@/store/slices/auth/authApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  passwordResetFailed,
  passwordResetRequested,
  passwordResetSucceeded,
  createPasswordResetState,
} from '@/store/slices/auth/authSlice'

const ForgotPasswordForm = () => {
  const dispatch = useAppDispatch()
  const { passwordReset = createPasswordResetState() } = useAppSelector((state) => state.auth)
  const [email, setEmail] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail) {
      setLocalError('Email is required.')
      return
    }

    dispatch(passwordResetRequested())
    setLocalError(null)

    const resetRequest = dispatch(
      authApi.endpoints.requestPasswordReset.initiate({ email: trimmedEmail }),
    )

    try {
      const response = await resetRequest.unwrap()
      dispatch(passwordResetSucceeded(response.message))
    } catch (error) {
      const message = extractErrorMessage(
        error,
        'Unable to send the reset link right now. Please try again later.',
      )
      setLocalError(message)
      dispatch(passwordResetFailed(message))
    }
  }

  const isSubmitting = passwordReset.status === 'loading'
  const successMessage = passwordReset.status === 'success' ? passwordReset.message : null
  const errorMessage = localError ?? (passwordReset.status === 'error' ? passwordReset.message : null)
  const buttonLabel = isSubmitting ? 'Sending...' : 'Send reset link'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-body">
      <p className="text-sm text-muted-500">
        Enter the email associated with your account and we&apos;ll send you a link to reset your password.
      </p>

      <fieldset className="space-y-2">
        <label htmlFor="email" className="text-label font-medium text-muted-700">
          Email<span className="text-brand-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          value={email}
          onChange={handleEmailChange}
          disabled={isSubmitting}
          className="mt-2 block w-full border border-none bg-brand-50/30 px-4 py-3 text-foreground placeholder:text-muted-400 focus:outline-none focus:ring-0 focus:ring-brand-400 focus:ring-offset-0 focus:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-70"
        />
      </fieldset>

      {successMessage && (
        <p className="text-sm text-green-600" role="status">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className="text-sm text-red-500" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-pill bg-gradient-to-r from-brand-500 via-brand-500 to-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:from-brand-600 hover:via-brand-600 hover:to-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-70"
      >
        {buttonLabel}
      </button>
    </form>
  )
}

export default ForgotPasswordForm

function extractErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  const fetchError = error as FetchBaseQueryError | SerializedError | undefined
  if (fetchError) {
    if ('status' in fetchError) {
      const data = (fetchError as FetchBaseQueryError).data
      if (typeof data === 'string' && data.trim()) {
        return data
      }
      if (data && typeof data === 'object' && 'message' in data) {
        const maybeMessage = (data as { message?: unknown }).message
        if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
          return maybeMessage
        }
      }
    }

    if ('message' in fetchError && typeof fetchError.message === 'string' && fetchError.message.trim()) {
      return fetchError.message
    }
  }

  return fallback
}
