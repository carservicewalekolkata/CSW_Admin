'use client'

import Link from 'next/link'
import type { FormEvent } from 'react'
import { FaCircle } from "react-icons/fa";

const LoginForm = () => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // TODO: replace with real submit handler when auth is connected
  }

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
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="remember"
            className="h-4 w-4 rounded border border-brand-200 bg-surface text-brand-600 focus:ring-brand-400"
            defaultChecked
          />
          Remember me
        </label>
        <span className="flex items-center gap-1 text-xs text-muted-400">Secure <FaCircle size={3} /> Encrypted</span>
      </div>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-pill bg-gradient-to-r from-brand-500 via-brand-500 to-brand-600 px-4 py-3 text-base font-semibold text-white transition hover:from-brand-600 hover:via-brand-600 hover:to-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        Log in
      </button>
    </form>
  )
}

export default LoginForm
