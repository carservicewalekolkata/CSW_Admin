'use client'

import { useState, type FormEvent } from 'react'
import { FiLock } from 'react-icons/fi'

import { toast } from '@/lib/sonner'

import { useSuperUser } from '../../../hooks/useSuperUser'

const MIN_PASSWORD_LENGTH = 12

const SuperAdminPanel = () => {
  const { superUser, isLoading, error, updatePassword, isUpdatingPassword } = useSuperUser()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    const trimmedPassword = newPassword.trim()
    const trimmedConfirm = confirmPassword.trim()

    if (trimmedPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`)
      return
    }

    if (trimmedPassword !== trimmedConfirm) {
      setFormError('Passwords do not match.')
      return
    }

    const result = await updatePassword(trimmedPassword)
    if (!result.success) {
      setFormError(result.message ?? 'Unable to update password.')
      return
    }

    toast.success('Super admin password updated')
    setNewPassword('')
    setConfirmPassword('')
  }

  const renderSuperUser = () => {
    if (isLoading) {
      return <p className="text-brand-500">Loading super admin details…</p>
    }

    if (error) {
      return <p className="text-rose-600">{error}</p>
    }

    if (!superUser) {
      return <p className="text-rose-600">No super admin user found.</p>
    }

    return (
      <>
        <div className="rounded-xl border border-brand-100/80 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-brand-500">Super Admin Email</p>
          <p className="mt-1 text-base font-semibold text-brand-800">{superUser.email}</p>
        </div>
        <p className="text-xs text-brand-500">
          Email originates from <code className="rounded bg-brand-50 px-1 py-0.5">scripts/seed_super_user.py</code> and
          can only be changed from the script.
        </p>
      </>
    )
  }

  return (
    <article className="space-y-5 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-sm backdrop-blur">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
          <FiLock className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-brand-800">Super Admin Account</h2>
          <p className="text-sm text-brand-600/80">Seeded from the CLI script and kept immutable for email.</p>
        </div>
      </header>

      <div className="space-y-3 text-sm">{renderSuperUser()}</div>

      <form className="grid gap-4 pt-2" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-600" htmlFor="newPassword">
            New Password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Enter a strong password"
            className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-brand-800 placeholder:text-brand-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-600" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter the new password"
            className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-brand-800 placeholder:text-brand-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            required
          />
        </div>

        <p className="text-xs text-brand-500">
          Passwords must be at least {MIN_PASSWORD_LENGTH} characters. Updating the password will invalidate active
          sessions for the super admin account.
        </p>

        {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isUpdatingPassword ? 'Updating…' : 'Update Password'}
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-brand-500 hover:text-brand-600"
            onClick={() => {
              setNewPassword('')
              setConfirmPassword('')
              setFormError(null)
            }}
            disabled={isUpdatingPassword}
          >
            Reset
          </button>
        </div>
      </form>
    </article>
  )
}

export default SuperAdminPanel
