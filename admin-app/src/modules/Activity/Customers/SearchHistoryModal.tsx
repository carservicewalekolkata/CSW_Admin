'use client'

import { FiClock, FiX } from 'react-icons/fi'
import type { CustomerActivityRow } from './CustomersActivityTable'

type SearchHistoryModalProps = {
  row: Pick<
    CustomerActivityRow,
    'phone' | 'sessionToken' | 'searchEvents' | 'vehicleSummary'
  >
  onClose: () => void
}

const SearchHistoryModal = ({ row, onClose }: SearchHistoryModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Search history</p>
            <h2 className="text-2xl font-semibold text-brand-800">{row.phone}</h2>
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
          <div className="flex items-center gap-2">
            <FiClock className="text-brand-500" />
            <div>
              <p className="text-sm font-semibold text-brand-800">All searches</p>
              <p className="text-xs text-brand-500">Most recent first</p>
            </div>
          </div>

          <ol className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto">
            {[...row.searchEvents]
              .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
              .map((entry, idx) => (
                <li key={`${row.sessionToken}-se-${idx}`} className="rounded-xl border border-brand-50 bg-brand-50/50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand-700">{entry.label}</span>
                    <span className="text-xs text-brand-400">
                      {new Date(entry.timestamp).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </li>
              ))}
          </ol>
        </section>
      </div>
    </div>
  )
}

export default SearchHistoryModal

