'use client'

import { useEffect, useState } from 'react'

type ToastVariant = 'default' | 'success' | 'error' | 'info'

type ToastOptions = {
  description?: string
  duration?: number
  variant?: ToastVariant
}

type ToastEntry = {
  id: number
  title: string
  description?: string
  variant: ToastVariant
  createdAt: number
  duration: number
}

const emitter = new EventTarget()

const createToast = (title: string, options: ToastOptions = {}) => {
  const entry: ToastEntry = {
    id: Math.random(),
    title,
    description: options.description,
    variant: options.variant ?? 'default',
    duration: options.duration ?? 4000,
    createdAt: Date.now(),
  }

  emitter.dispatchEvent(new CustomEvent('toast', { detail: entry }))
  return entry.id
}

export const toast = Object.assign(createToast, {
  success: (title: string, options: ToastOptions = {}) =>
    createToast(title, { ...options, variant: 'success' }),
  error: (title: string, options: ToastOptions = {}) =>
    createToast(title, { ...options, variant: 'error' }),
  info: (title: string, options: ToastOptions = {}) => createToast(title, { ...options, variant: 'info' }),
})

const variantClasses: Record<ToastVariant, string> = {
  default: 'border-brand-200 bg-white text-brand-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
}

export const Toaster = () => {
  const [toasts, setToasts] = useState<ToastEntry[]>([])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ToastEntry>).detail
      setToasts((current) => [...current, detail])

      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== detail.id))
      }, detail.duration)
    }

    emitter.addEventListener('toast', handler)
    return () => {
      emitter.removeEventListener('toast', handler)
    }
  }, [])

  if (!toasts.length) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[9999] flex flex-col items-center gap-2 px-4 sm:top-8">
      {toasts.map((entry) => (
        <div
          key={entry.id}
          className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border px-4 py-3 shadow-md transition ${variantClasses[entry.variant]}`}
        >
          <div className="text-sm font-semibold">{entry.title}</div>
          {entry.description ? (
            <div className="mt-1 text-xs text-brand-600/80">{entry.description}</div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
