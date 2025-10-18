import { useMemo, useState } from 'react'

import type { ServiceCategoryQuery } from '@/types/serviceCategories'

type UseServiceCategoryFiltersResult = {
  query: ServiceCategoryQuery
  searchTerm: string
  dateSort: 'asc' | 'desc'
  pageSize: number
  page: number
  setPage: (value: number) => void
  handleSearchChange: (value: string) => void
  handleSortChange: (value: 'asc' | 'desc') => void
  handlePageSizeChange: (value: number) => void
}

const buildQuery = (params: ServiceCategoryQuery): ServiceCategoryQuery => {
  const normalized: ServiceCategoryQuery = {}
  if (params.search) normalized.search = params.search
  if (params.sortUpdated) normalized.sortUpdated = params.sortUpdated
  if (params.page) normalized.page = params.page
  if (params.limit) normalized.limit = params.limit
  return normalized
}

export const useServiceCategoryFilters = (): UseServiceCategoryFiltersResult => {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const query = useMemo<ServiceCategoryQuery>(
    () =>
      buildQuery({
        search: searchTerm || undefined,
        sortUpdated: dateSort,
        page,
        limit: pageSize,
      }),
    [searchTerm, dateSort, page, pageSize],
  )

  return {
    query,
    searchTerm,
    dateSort,
    pageSize,
    page,
    setPage,
    handleSearchChange: (value: string) => {
      setPage(1)
      setSearchTerm(value)
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

export default useServiceCategoryFilters
