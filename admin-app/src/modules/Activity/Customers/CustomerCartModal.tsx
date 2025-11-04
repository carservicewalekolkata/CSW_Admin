'use client'

import { useState, useTransition } from 'react'
import { FiX, FiShoppingCart, FiClock } from 'react-icons/fi'
import type { CustomerActivityRow } from './CustomersActivityTable'
import type { CustomerCartStatus } from '@/types/customerActivity'

const STATUS_LABEL: Record<CustomerCartStatus, string> = {
  'on-cart': 'On Cart',
  booked: 'Booked',
  solved: 'Solved',
  cancelled: 'Cancelled',
}

type CustomerCartModalProps = {
  row: CustomerActivityRow
  onClose: () => void
  onStatusUpdated: (row: CustomerActivityRow) => void
}

const CustomerCartModal = ({ row, onClose, onStatusUpdated }: CustomerCartModalProps) => {
  const [status, setStatus] = useState<CustomerCartStatus>(row.cartStatus)
  const [isPending, startTransition] = useTransition()
  const [confirmStatus, setConfirmStatus] = useState<Extract<CustomerCartStatus, 'solved' | 'cancelled'> | null>(null)
  const isFinal = status === 'solved' || status === 'cancelled'
  const [error, setError] = useState<string | null>(null)

  const commitStatusChange = (nextStatus: CustomerCartStatus) => {
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
          cartItems: payload.entry.cartItems ?? row.cartItems,
        })
      } catch (err) {
        setStatus(row.cartStatus)
        setError(err instanceof Error ? err.message : 'Unable to update cart status')
      } finally {
        setConfirmStatus(null)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Customer cart</p>
            <h2 className="text-2xl font-semibold text-brand-800">{row.phone} Cart</h2>
            <p className="text-sm text-brand-500">Session {row.sessionToken.slice(0, 8).toUpperCase()}</p>
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

        <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Cart status</p>
              <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                <span className={`h-2 w-2 rounded-full ${
                  status === 'on-cart'
                    ? 'bg-amber-500'
                    : status === 'booked'
                    ? 'bg-indigo-500'
                    : status === 'solved'
                    ? 'bg-emerald-600'
                    : 'bg-rose-600'
                }`} />
                {STATUS_LABEL[status]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                title="Managed by customer"
                className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-400 disabled:cursor-not-allowed"
              >
                On Cart
              </button>
              <button
                type="button"
                disabled
                title="Managed by customer"
                className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-400 disabled:cursor-not-allowed"
              >
                Booked
              </button>
              <button
                type="button"
                onClick={() => setConfirmStatus('solved')}
                disabled={isFinal}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isFinal
                    ? 'cursor-not-allowed border border-brand-200 text-brand-300'
                    : 'border border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Mark Solved
              </button>
              <button
                type="button"
                onClick={() => setConfirmStatus('cancelled')}
                disabled={isFinal}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isFinal
                    ? 'cursor-not-allowed border border-brand-200 text-brand-300'
                    : 'border border-rose-600 text-rose-700 hover:bg-rose-50'
                }`}
              >
                Cancel Order
              </button>
            </div>
          </div>
          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
          {isPending ? <p className="mt-2 text-xs text-brand-500">Saving status…</p> : null}
        </section>

        {confirmStatus ? (
          <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
            <p className="text-sm text-brand-700">
              {confirmStatus === 'solved'
                ? 'Confirm you want to mark this cart as Solved?'
                : 'Confirm you want to mark this cart as Cancelled?'}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => commitStatusChange(confirmStatus)}
                className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${
                  confirmStatus === 'solved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmStatus(null)}
                className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
              >
                Back
              </button>
            </div>
          </div>
        ) : null}

        <section className="mt-6 grid gap-6">
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
        </section>

        <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <FiClock className="text-brand-500" />
            <div>
              <p className="text-sm font-semibold text-brand-800">Previous orders</p>
              <p className="text-xs text-brand-500">Audit trail of previous cart bookings</p>
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
