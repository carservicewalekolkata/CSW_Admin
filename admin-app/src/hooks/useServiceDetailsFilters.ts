import { useMemo, useState } from 'react'

import type { ServiceQuery } from '@/types/services'
import type { StatusFilterOption } from '@/types/serviceDetailsPage'

type UseServiceDetailsFiltersResult = {
  query: ServiceQuery
  searchTerm: string
  categoryId: string
  status: StatusFilterOption
  dateSort: 'asc' | 'desc'
  pageSize: number
  page: number
  setPage: (value: number) => void
  handleSearchChange: (value: string) => void
  handleCategoryChange: (value: string) => void
  handleStatusChange: (value: StatusFilterOption) => void
  handleSortChange: (value: 'asc' | 'desc') => void
  handlePageSizeChange: (value: number) => void
}

const buildQuery = (params: ServiceQuery): ServiceQuery => {
  const normalized: ServiceQuery = {}

  if (params.search) normalized.search = params.search
  if (params.category) normalized.category = params.category
  if (params.status) normalized.status = params.status
  if (params.sortUpdated) normalized.sortUpdated = params.sortUpdated
  if (params.page) normalized.page = params.page
  if (params.limit) normalized.limit = params.limit

  return normalized
}

export const useServiceDetailsFilters = (): UseServiceDetailsFiltersResult => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState<StatusFilterOption>('all')
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const query = useMemo<ServiceQuery>(
    () =>
      buildQuery({
        search: searchTerm || undefined,
        category: categoryId || undefined,
        status: status === 'all' ? undefined : status,
        sortUpdated: dateSort,
        page,
        limit: pageSize,
      }),
    [searchTerm, categoryId, status, dateSort, page, pageSize],
  )

  return {
    query,
    searchTerm,
    categoryId,
    status,
    dateSort,
    pageSize,
    page,
    setPage,
    handleSearchChange: (value: string) => {
      setPage(1)
      setSearchTerm(value)
    },
    handleCategoryChange: (value: string) => {
      setPage(1)
      setCategoryId(value)
    },
    handleStatusChange: (value: StatusFilterOption) => {
      setPage(1)
      setStatus(value)
    },
    handleSortChange: (value: 'asc' | 'desc') => {
      setPage(1)
      setDateSort(value)
    },
    handlePageSizeChange: (value: number) => {
      setPage(1)
      setPageSize(value)
    },
  }
}

export default useServiceDetailsFilters
