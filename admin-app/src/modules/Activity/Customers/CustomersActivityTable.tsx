
'use client'

import { useMemo, useState, useEffect } from 'react'

import Table, { type TableColumn } from '@/components/Table'
import type { CustomerCartHistory, CustomerCartItem, CustomerCartStatus } from '@/types/customerActivity'
import SearchHistoryModal from './SearchHistoryModal'
import CustomerCartModal from './CustomerCartModal'

export type CustomerActivityRow = {
  id: string
  phone: string
  vehicleSummary: string
  brandName: string
  modelName: string
  searchedAt: string
  sessionToken: string
  searchNumber: number
  searches: string[]
  searchEvents: { label: string; timestamp: string }[]
  cartStatus: CustomerCartStatus
  cartItems: CustomerCartItem[]
  previousQueries: string[]
  cartHistory: CustomerCartHistory[]
}

const formatTimestamp = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

type CustomersActivityTableProps = {
  rows: CustomerActivityRow[]
}

type DisplayRow = CustomerActivityRow & { displayNumber: number }

const CustomersActivityTable = ({ rows }: CustomersActivityTableProps) => {
  const [localRows, setLocalRows] = useState(rows)
  const [selectedRow, setSelectedRow] = useState<CustomerActivityRow | null>(null)
  const [selectedSearchRow, setSelectedSearchRow] = useState<CustomerActivityRow | null>(null)
  type StatusFilter = 'all' | 'on-cart' | 'booked' | 'solved' | 'cancelled'
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    setLocalRows(rows)
  }, [rows])

  const columns: TableColumn<DisplayRow>[] = useMemo(
    () => [
      {
        key: 'searchNumber',
        label: 'Search #',
        render: (row) => `#${row.displayNumber}`,
        className: 'w-20 font-semibold',
      },
      {
        key: 'phone',
        label: 'Phone (Session)',
        render: (row) => <span className="font-medium text-brand-700">{row.phone}</span>,
      },
      {
        key: 'searches',
        label: 'Searches',
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex max-w-[520px] flex-wrap gap-2">
              {row.searchEvents.length === 0 ? (
                <span className="text-xs text-brand-400">No searches recorded</span>
              ) : (
                (() => {
                  const latest = row.searchEvents.reduce(
                    (acc, e) => (acc.timestamp > e.timestamp ? acc : e),
                    row.searchEvents[0],
                  )
                  return (
                    <span
                      key={`${row.id}-latest`}
                      className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                    >
                      {latest.label}
                    </span>
                  )
                })()
              )}
            </div>
            {row.searchEvents.length > 1 ? (
              <button
                type="button"
                onClick={() => setSelectedSearchRow(row)}
                className="text-xs font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
              >
                View all
              </button>
            ) : null}
          </div>
        ),
      },
      {
        key: 'cart',
        label: 'Customer Cart',
        render: (row) => (
          <button
            type="button"
            onClick={() => setSelectedRow(row)}
            className="text-xs font-semibold text-brand-600 underline underline-offset-2 transition hover:text-brand-700"
          >
            View cart
          </button>
        ),
        className: 'w-32',
      },
      {
        key: 'searchedAt',
        label: 'Last Searched',
        render: (row) => formatTimestamp(row.searchedAt),
      },
    ],
    [],
  )

  const computedRows: DisplayRow[] = useMemo(() => {
    let working = [...localRows]
    if (statusFilter !== 'all') {
      working = working.filter((r) => r.cartStatus === statusFilter)
    }
    const sorted = working.sort((a, b) => (a.searchedAt > b.searchedAt ? -1 : 1))
    const total = sorted.length
    return sorted.map((row, index) => ({ ...row, displayNumber: total - index }))
  }, [localRows, statusFilter])

  const handleStatusUpdated = (updated: CustomerActivityRow) => {
    setLocalRows((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)))
    setSelectedRow((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev))
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-500">Filters</span>
        {([
          { id: 'all', label: 'All' },
          { id: 'on-cart', label: 'On Cart' },
          { id: 'booked', label: 'Booked' },
          { id: 'solved', label: 'Solved' },
          { id: 'cancelled', label: 'Cancelled' },
        ] as Array<{ id: StatusFilter; label: string }>).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setStatusFilter(opt.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              statusFilter === opt.id
                ? 'bg-brand-600 text-white'
                : 'border border-brand-200 text-brand-700 hover:bg-brand-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <Table
        data={computedRows}
        columns={columns}
        getRowKey={(row) => row.id}
        emptyMessage="No customer activity recorded yet."
      />
      {selectedSearchRow ? (
        <SearchHistoryModal
          row={selectedSearchRow}
          onClose={() => setSelectedSearchRow(null)}
        />
      ) : null}
      {selectedRow ? (
        <CustomerCartModal
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      ) : null}
    </>
  )
}

export default CustomersActivityTable
