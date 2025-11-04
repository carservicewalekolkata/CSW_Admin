import { useMemo, useState } from 'react'

import type { BrandQuery, BrandSortStatus, BrandSortUpdated } from '@/types/brands'

type UseBrandFiltersResult = {
  query: BrandQuery
  searchName: string
  slug: string
  statusSort: BrandSortStatus
  dateSort: BrandSortUpdated
  pageSize: number
  page: number
  setPage: (value: number) => void
  handleSearchChange: (value: string) => void
  handleSlugChange: (value: string) => void
  handleStatusChange: (value: BrandSortStatus) => void
  handleSortChange: (value: BrandSortUpdated) => void
  handlePageSizeChange: (value: number) => void
}

export const useBrandFilters = (): UseBrandFiltersResult => {
  const [searchName, setSearchName] = useState('')
  const [slugFilter, setSlugFilter] = useState('')
  const [statusSort, setStatusSort] = useState<BrandSortStatus>('none')
  const [dateSort, setDateSort] = useState<BrandSortUpdated>('desc')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const query = useMemo<BrandQuery>(
    () => ({
      search: searchName || undefined,
      slug: slugFilter || undefined,
      sortStatus: statusSort,
      sortUpdated: dateSort,
      page,
      limit: pageSize,
    }),
    [searchName, slugFilter, statusSort, dateSort, page, pageSize],
  )

  return {
    query,
    searchName,
    slug: slugFilter,
    statusSort,
    dateSort,
    pageSize,
    page,
    setPage,
    handleSearchChange: (value: string) => {
      setPage(1)
      setSearchName(value)
    },
    handleSlugChange: (value: string) => {
      setPage(1)
      setSlugFilter(value)
    },
    handleStatusChange: (value: BrandSortStatus) => {
      setPage(1)
      setStatusSort(value)
    },
    handleSortChange: (value: BrandSortUpdated) => {
      setPage(1)
      setDateSort(value)
    },
    handlePageSizeChange: (value: number) => {
      setPage(1)
      setPageSize(value)
    },
  }
}

export default useBrandFilters
