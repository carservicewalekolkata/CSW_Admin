'use client'

import { useMemo } from 'react'

import Table, { type TableColumn } from '@/components/Table'

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

const CustomersActivityTable = ({ rows }: CustomersActivityTableProps) => {
  const columns: TableColumn<CustomerActivityRow>[] = useMemo(
    () => [
      {
        key: 'searchNumber',
        label: 'Search #',
        render: (row) => `#${row.searchNumber}`,
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
        key: 'searchedAt',
        label: 'Searched At',
        render: (row) => formatTimestamp(row.searchedAt),
      },
    ],
    [],
  )

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (a.searchedAt > b.searchedAt ? -1 : 1)),
    [rows],
  )

  return (
    <Table
      data={sortedRows}
      columns={columns}
      getRowKey={(row) => row.id}
      emptyMessage="No customer activity recorded yet."
    />
  )
}

export default CustomersActivityTable
