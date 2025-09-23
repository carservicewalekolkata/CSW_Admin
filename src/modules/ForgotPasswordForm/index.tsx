'use client'

import type { FormEvent } from 'react'

const ForgotPasswordForm = () => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // TODO: replace with real submit handler when auth is connected
  }

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
          className="mt-2 block w-full border border-none bg-brand-50/30 px-4 py-3 text-foreground placeholder:text-muted-400 focus:outline-none focus:ring-0 focus:ring-brand-400 focus:ring-offset-0 focus:ring-offset-surface"
        />
      </fieldset>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-pill bg-gradient-to-r from-brand-500 via-brand-500 to-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:from-brand-600 hover:via-brand-600 hover:to-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        Send reset link
      </button>
    </form>
  )
}

export default ForgotPasswordForm
