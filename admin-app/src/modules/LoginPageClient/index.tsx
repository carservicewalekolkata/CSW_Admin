'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { FaCircle } from 'react-icons/fa'

import { authApi, AuthApiError } from '@/store/slices/auth/authApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  loginFailed,
  loginRequested,
  loginSucceeded,
  setRememberMe,
} from '@/store/slices/auth/authSlice'

type DatabaseStatus = 'checking' | 'ready' | 'unreachable'

const LoginForm = () => {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { status, error: authError, rememberMe } = useAppSelector((state) => state.auth)
  const [formError, setFormError] = useState<string | null>(null)
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>('checking')
  const [dbMessage, setDbMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    authApi
      .checkDatabaseConnection()
      .then((isConnected) => {
        if (!isMounted) return
        setDatabaseStatus(isConnected ? 'ready' : 'unreachable')
        setDbMessage(
          isConnected ? null : 'Unable to confirm the database connection. You can still try to log in.',
        )
      })
      .catch((error) => {
        if (!isMounted) return
        const message =
          error instanceof AuthApiError
            ? error.message
            : 'Unable to connect to the database. Please try again later.'
        setDatabaseStatus('unreachable')
        setDbMessage(message)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [router, status])

  const handleRememberChange = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch(setRememberMe(event.target.checked))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = (formData.get('email') as string | null)?.trim() ?? ''
    const password = (formData.get('password') as string | null) ?? ''

    if (!email || !password) {
      setFormError('Email and password are required.')
      return
    }

    dispatch(loginRequested({ email }))
    setFormError(null)

    try {
      const { user, accessToken } = await authApi.login({
        email,
        password,
        remember: rememberMe,
      })

      dispatch(loginSucceeded({ user, token: accessToken }))
    } catch (error) {
      const message =
        error instanceof AuthApiError
          ? error.message
          : 'Unable to log in. Please try again.'
      setFormError(message)
      dispatch(loginFailed(message))
    }
  }

  const isSubmitting = status === 'loading'
  const isCheckingDb = databaseStatus === 'checking'
  const buttonDisabled = isSubmitting || isCheckingDb
  const buttonLabel = isSubmitting ? 'Signing in...' : 'Log in'
  const errorMessage = formError ?? authError

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
          <Link href="/forgot-password" className="text-sm font-semibold text-brand-600 hover:text-brand-500">
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          required
          autoComplete="current-password"
          className="block w-full border border-none bg-brand-50/30 px-4 py-3 text-foreground placeholder:text-muted-400 focus:outline-none focus:ring-0 focus:ring-brand-400 focus:ring-offset-0 focus:ring-offset-surface"
        />
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
        <span className="flex items-center gap-1 text-xs text-muted-400">Secure <FaCircle size={3} /> Encrypted</span>
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
