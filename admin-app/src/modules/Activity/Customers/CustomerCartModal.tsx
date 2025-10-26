'use client'

import { useState, useTransition } from 'react'
import { FiX, FiShoppingCart, FiClock, FiMessageCircle } from 'react-icons/fi'
import type { CustomerActivityRow } from './CustomersActivityTable'
import type { CustomerCartStatus } from '@/types/customerActivity'

const STATUS_OPTIONS: { id: CustomerCartStatus; label: string; description: string }[] = [
  { id: 'hold', label: 'Hold', description: 'Pending advisor follow-up' },
  { id: 'solved', label: 'Solved', description: 'Customer confirmed and assigned' },
  { id: 'cancelled', label: 'Cancelled', description: 'Customer dropped or moved' },
]

type CustomerCartModalProps = {
  row: CustomerActivityRow
  onClose: () => void
  onStatusUpdated: (row: CustomerActivityRow) => void
}

const CustomerCartModal = ({ row, onClose, onStatusUpdated }: CustomerCartModalProps) => {
  const [status, setStatus] = useState<CustomerCartStatus>(row.cartStatus)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleStatusChange = (nextStatus: CustomerCartStatus) => {
    if (nextStatus === status) {
      return
    }
    setError(null)
    setStatus(nextStatus)
    startTransition(async () => {
      try {
        const response = await fetch('/api/v1/activity/customers/cart', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryId: row.id, status: nextStatus }),
        })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message ?? 'Failed to update cart status')
        }
        onStatusUpdated({
          ...row,
          cartStatus: payload.entry.cartStatus,
          cartHistory: payload.entry.cartHistory,
        })
      } catch (err) {
        setStatus(row.cartStatus)
        setError(err instanceof Error ? err.message : 'Unable to update cart status')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Customer cart</p>
            <h2 className="text-2xl font-semibold text-brand-800">{row.vehicleSummary}</h2>
            <p className="text-sm text-brand-500">Session {row.sessionToken.slice(0, 8).toUpperCase()} • {row.phone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-brand-100 p-2 text-brand-500 transition hover:bg-brand-50"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </header>

        <section className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Cart status</p>
          <div className="mt-3 flex flex-col gap-2 md:flex-row">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleStatusChange(option.id)}
                className={`group flex-1 rounded-2xl border px-4 py-3 text-left transition ${
                  status === option.id
                    ? 'border-brand-500 bg-white shadow'
                    : 'border-transparent bg-white/60 hover:border-brand-200'
                }`}
              >
                <p className="text-sm font-semibold text-brand-800">{option.label}</p>
                <p className="text-xs text-brand-500">{option.description}</p>
              </button>
            ))}
          </div>
          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
          {isPending ? <p className="mt-2 text-xs text-brand-500">Saving status…</p> : null}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FiShoppingCart className="text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-brand-800">Cart items</p>
                <p className="text-xs text-brand-500">Services shortlisted by the customer</p>
              </div>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-brand-700">
              {row.cartItems.map((item) => (
                <li key={item.id} className="rounded-xl border border-brand-50 bg-brand-50/40 p-3">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-brand-500">{item.category} • Qty {item.quantity}</p>
                  <p className="text-xs text-brand-600">₹{item.price.toLocaleString('en-IN')}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FiMessageCircle className="text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-brand-800">Previous queries</p>
                <p className="text-xs text-brand-500">Recent intent captured from interactions</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-brand-700">
              {row.previousQueries.map((query) => (
                <li key={query} className="rounded-xl bg-brand-50/60 px-3 py-2 text-brand-600">
                  {query}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <FiClock className="text-brand-500" />
            <div>
              <p className="text-sm font-semibold text-brand-800">Cart history</p>
              <p className="text-xs text-brand-500">Audit trail of status changes</p>
            </div>
          </div>
          <ol className="mt-4 space-y-3">
            {[...row.cartHistory]
              .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
              .map((history) => (
                <li key={history.id} className="rounded-xl border border-brand-50 bg-brand-50/50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand-700">{history.note}</span>
                    <span className="text-xs text-brand-400">
                      {new Date(history.timestamp).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <span className="mt-1 inline-flex rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                    {history.status}
                  </span>
                </li>
              ))}
          </ol>
        </section>
      </div>
    </div>
  )
}

export default CustomerCartModal
