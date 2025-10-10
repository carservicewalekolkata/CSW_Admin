'use client'

import type { ReactNode } from 'react'

export type TableColumn<T> = {
  /** Unique identifier for the column. */
  key: keyof T | string
  /** Column header label. */
  label: string
  /** Optional custom renderer for cell content. */
  render?: (row: T) => ReactNode
  /** Optional additional classes for column cells. */
  className?: string
}

type TableProps<T> = {
  /** Data rows to render. */
  data: T[]
  /** Column configuration for the table. */
  columns: TableColumn<T>[]
  /** Provide a stable key for each row when rendering dynamic data. */
  getRowKey?: (row: T, index: number) => string | number
  /** Message to display when the data array is empty. */
  emptyMessage?: string
  /** Display a pending state while data is loading. */
  isLoading?: boolean
}

const defaultEmptyMessage = 'No records found.'

const baseCellClasses = 'px-4 py-3 text-sm text-brand-700/90'

const Table = <T,>({
  data,
  columns,
  getRowKey,
  emptyMessage = defaultEmptyMessage,
  isLoading = false,
}: TableProps<T>) => {
  const hasRows = data.length > 0
  const skeletonRowCount = Math.max(1, Math.min(3, hasRows ? data.length : 3))

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/60 shadow-sm backdrop-blur">
      <table className="min-w-full divide-y divide-brand-100/60">
        <thead className="bg-brand-50/70">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-600/70"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-100/40 bg-white/50">
          {isLoading
            ? Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="animate-pulse">
                  {columns.map((column, columnIndex) => (
                    <td
                      key={`skeleton-${rowIndex}-${String(column.key)}`}
                      className={`${baseCellClasses} ${column.className ?? ''}`}
                    >
                      <div
                        className={`h-4 w-full rounded-full bg-brand-100/80 ${
                          columnIndex === 0 ? 'max-w-[140px]' : columnIndex === columns.length - 1 ? 'max-w-[80px]' : ''
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))
            : null}

          {!isLoading && hasRows
            ? data.map((row, index) => {
                const rowKey = getRowKey ? getRowKey(row, index) : index

                return (
                  <tr key={rowKey} className="hover:bg-brand-50/40">
                    {columns.map((column) => {
                      const content = column.render
                        ? column.render(row)
                        : (row as Record<string, ReactNode>)[column.key as string]
                      return (
                        <td key={String(column.key)} className={`${baseCellClasses} ${column.className ?? ''}`}>
                          {content}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            : null}

          {!isLoading && !hasRows && (
            <tr>
              <td colSpan={columns.length} className={`${baseCellClasses} text-center text-brand-500`}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Table
