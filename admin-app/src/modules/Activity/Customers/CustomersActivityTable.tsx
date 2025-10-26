
'use client'

import { useMemo, useState, useEffect } from 'react'

import Table, { type TableColumn } from '@/components/Table'
import type { CustomerCartHistory, CustomerCartItem, CustomerCartStatus } from '@/types/customerActivity'
import CustomerCartModal from './CustomerCartModal'

export type CustomerActivityRow = {
  id: string
  phone: string
  vehicleSummary: string
  brandName: string
  modelName: string
  fuelType: string
  searchedAt: string
  sessionToken: string
  searchNumber: number
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
        key: 'vehicleSummary',
        label: 'Vehicle',
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-semibold text-brand-700">{row.vehicleSummary}</span>
            <span className="text-xs text-brand-500">{`${row.brandName} / ${row.modelName}`}</span>
          </div>
        ),
        className: 'min-w-[200px]',
      },
      {
        key: 'fuelType',
        label: 'Fuel Type',
        render: (row) => row.fuelType,
        className: 'capitalize',
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
        label: 'Searched At',
        render: (row) => formatTimestamp(row.searchedAt),
      },
    ],
    [],
  )

  const computedRows: DisplayRow[] = useMemo(() => {
    const sorted = [...localRows].sort((a, b) => (a.searchedAt > b.searchedAt ? -1 : 1))
    const total = sorted.length
    return sorted.map((row, index) => ({ ...row, displayNumber: total - index }))
  }, [localRows])

  const handleStatusUpdated = (updated: CustomerActivityRow) => {
    setLocalRows((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)))
    setSelectedRow((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev))
  }

  return (
    <>
      <Table
        data={computedRows}
        columns={columns}
        getRowKey={(row) => row.id}
        emptyMessage="No customer activity recorded yet."
      />
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
