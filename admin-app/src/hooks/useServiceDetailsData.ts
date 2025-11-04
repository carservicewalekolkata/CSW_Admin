import { useEffect, useMemo } from 'react'

import {
  useFetchServicesQuery,
  usePrefetchServices,
} from '@/store/slices/services/servicesSlice'
import { useFetchServiceCategoriesQuery } from '@/store/slices/serviceCategories/serviceCategoriesSlice'
import { resolveServiceErrorMessage } from '@/utils/serviceDetails'
import type { ServiceCategoryOption } from '@/types/serviceDetailsPage'
import type { Service, ServiceQuery } from '@/types/services'

type UseServiceDetailsDataParams = {
  query: ServiceQuery
  page: number
  pageSize: number
}

type UseServiceDetailsDataResult = {
  items: Service[]
  total: number
  totalPages: number
  safePage: number
  startIndex: number
  endIndex: number
  isTableLoading: boolean
  categoryOptions: ServiceCategoryOption[]
  bannerError: string | null
  refetchServices: () => Promise<unknown>
}

export const useServiceDetailsData = ({
  query,
  page,
  pageSize,
}: UseServiceDetailsDataParams): UseServiceDetailsDataResult => {
  // Fetch page-scoped data directly from RTK Query
  const { data: servicesResponse, isLoading, isFetching, refetch, error } =
    useFetchServicesQuery(query, { refetchOnMountOrArgChange: true })
  const prefetchServices = usePrefetchServices()

  const { data: categoriesResponse } = useFetchServiceCategoriesQuery({
    limit: 200,
    sortUpdated: 'desc',
  })

  const items = (servicesResponse?.data ?? []) as Service[]
  const total =
    typeof servicesResponse?.total === 'number'
      ? servicesResponse.total
      : servicesResponse?.count ?? 0

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(startIndex + Math.max(items.length - 1, 0), total)
  const isTableLoading = isLoading || isFetching

  useEffect(() => {
    if (!prefetchServices) return
    const baseQuery = { ...query }
    if (safePage < totalPages) {
      prefetchServices({ ...baseQuery, page: safePage + 1 }, { ifOlderThan: 30 })
    }
    if (safePage > 1) {
      prefetchServices({ ...baseQuery, page: safePage - 1 }, { ifOlderThan: 30 })
    }
  }, [prefetchServices, query, safePage, totalPages])

  const categoryOptions = useMemo<ServiceCategoryOption[]>(
    () =>
      (categoriesResponse?.data ?? [])
        .map((category) => ({ id: category.id.toString(), name: category.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categoriesResponse],
  )

  const bannerError = useMemo(
    () => (error ? resolveServiceErrorMessage(error, 'Failed to load services.') : null),
    [error],
  )

  return {
    items,
    total,
    totalPages,
    safePage,
    startIndex,
    endIndex,
    isTableLoading,
    categoryOptions,
    bannerError,
    refetchServices: refetch,
  }
}

export default useServiceDetailsData
