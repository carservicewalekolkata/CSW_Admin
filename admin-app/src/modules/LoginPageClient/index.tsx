'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { FaCircle } from 'react-icons/fa'
import { FetchBaseQueryError } from '@reduxjs/toolkit/query'

import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setRememberMe } from '@/store/slices/auth/authSlice'
import {
  useLoginMutation,
  useCheckDatabaseConnectionQuery,
} from '@/store/slices/auth/authApi'

type DatabaseStatus = 'checking' | 'ready' | 'unreachable'

const LoginForm = () => {
  const router = useRouter()
  const dispatch = useAppDispatch()

  const { error: authError, rememberMe } = useAppSelector(
    (state) => state.auth,
  )

  const [formError, setFormError] = useState<string | null>(null)

  // ✅ RTK Query hooks
  const [login, { isLoading: isSubmitting, isSuccess, error: loginError }] =
    useLoginMutation()
  const {
    data: dbStatusData,
    isLoading: isCheckingDb,
    isError: dbError,
  } = useCheckDatabaseConnectionQuery()

  const databaseStatus: DatabaseStatus = isCheckingDb
    ? 'checking'
    : dbError
      ? 'unreachable'
      : dbStatusData?.connected
        ? 'ready'
        : 'unreachable'

  const dbMessage =
    databaseStatus === 'unreachable'
      ? dbStatusData?.message ||
      'Unable to confirm the database connection. You can still try to log in.'
      : null

  useEffect(() => {
    if (isSuccess) router.push('/dashboard')
  }, [isSuccess, router])

  const handleRememberChange = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch(setRememberMe(event.target.checked))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const formData = new FormData(event.currentTarget)
    const email = (formData.get('email') as string | null)?.trim() ?? ''
    const password = (formData.get('password') as string | null) ?? ''

    if (!email || !password) {
      setFormError('Email and password are required.')
      return
    }

    try {
      await login({ email, password, remember: rememberMe }).unwrap()
    } catch (err) {
      let message = 'Unable to log in. Please try again.'

      // ✅ Type-safe error narrowing for RTK Query
      if (typeof err === 'object' && err !== null) {
        const e = err as FetchBaseQueryError | { message?: string }
        if ('data' in e && e.data && typeof e.data === 'object' && 'message' in e.data) {
          message = String((e.data as { message: string }).message)
        } else if ('message' in e && typeof e.message === 'string') {
          message = e.message
        }
      }

      setFormError(message)
    }
  }

  const buttonDisabled = isSubmitting || isCheckingDb
  const buttonLabel = isSubmitting ? 'Signing in...' : 'Log in'
  const errorMessage =
    formError ||
    (loginError
      ? 'data' in loginError
        ? (loginError.data as { message?: string })?.message ?? null
        : 'error' in loginError
          ? loginError.error
          : 'message' in loginError
            ? loginError.message
            : null
      : null) ||
    authError

  const [showPassword, setShowPassword] = useState(false)

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-body">
      <fieldset className="space-y-2">
        <label htmlFor="email" className="text-label font-medium text-muted-700">
          Email<span className="text-brand-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email address"
          required
          autoComplete="email"
          className="mt-2 block w-full border border-none bg-brand-50/40 px-4 py-3 text-foreground placeholder:text-muted-400 focus:outline-none focus:ring-0 focus:ring-brand-400 focus:ring-offset-0 focus:ring-offset-surface"
        />
      </fieldset>

      <fieldset className="space-y-2">
        <div className="flex items-center justify-between text-label font-medium text-muted-700">
          <label htmlFor="password">
            Password<span className="text-brand-500">*</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-brand-600 hover:text-brand-500"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            className="block w-full border border-none bg-brand-50/30 px-4 py-3 pr-12 text-foreground placeholder:text-muted-400 focus:outline-none focus:ring-0 focus:ring-brand-400 focus:ring-offset-0 focus:ring-offset-surface"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 flex items-center text-muted-500 transition hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
          </button>
        </div>
      </fieldset>

      <div className="flex items-center justify-between text-sm text-muted-500">
        <label className="inline-flex items-center gap-2" htmlFor="remember">
          <input
            id="remember"
            type="checkbox"
            name="remember"
            className="h-4 w-4 rounded border border-brand-200 bg-surface text-brand-600 focus:ring-brand-400"
            checked={rememberMe}
            onChange={handleRememberChange}
          />
          Remember me
        </label>
        <span className="flex items-center gap-1 text-xs text-muted-400">
          Secure <FaCircle size={3} /> Encrypted
        </span>
      </div>

      {databaseStatus === 'checking' && (
        <p className="text-sm text-muted-400">Checking database connection...</p>
      )}

      {dbMessage && databaseStatus !== 'checking' && (
        <p className="text-sm text-orange-500" role="status">
          {dbMessage}
        </p>
      )}

      {errorMessage && (
        <p className="text-sm text-red-500" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={buttonDisabled}
        className="flex w-full items-center justify-center gap-2 rounded-pill bg-gradient-to-r from-brand-500 via-brand-500 to-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:from-brand-600 hover:via-brand-600 hover:to-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-70"
      >
        {buttonLabel}
      </button>
    </form>
  )
}

export default LoginForm
