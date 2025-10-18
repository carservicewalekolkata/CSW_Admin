import { 
  // useCallback, 
  useEffect, 
  useMemo 
} from 'react'

import type { Brand, BrandQuery } from '@/types/brands'
import { resolveBrandErrorMessage } from '@/utils/brands'
import { useAppSelector } from '@/store/hooks'
import {
  useFetchBrandsQuery,
  // useLazyFetchBrandsQuery,
  usePrefetchBrands,
} from '@/store/slices/brands/brandsSlice'

type UseBrandsDataParams = {
  query: BrandQuery
  page: number
  pageSize: number
}

type UseBrandsDataResult = {
  items: Brand[]
  total: number
  totalPages: number
  safePage: number
  startIndex: number
  endIndex: number
  isTableLoading: boolean
  bannerError: string | null
  // refreshBrands: (nextPage: number) => Promise<void>
}

export const useBrandsData = ({ query, page, pageSize }: UseBrandsDataParams): UseBrandsDataResult => {
  const { items, total, status, error } = useAppSelector((state) => state.brands)
  const { isLoading, isFetching } = useFetchBrandsQuery(query, {
    refetchOnMountOrArgChange: true,
  })
  // const [fetchBrandsLazy, { isFetching: isLazyFetching }] = useLazyFetchBrandsQuery()
  const prefetchBrands = usePrefetchBrands()

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(startIndex + Math.max(items.length - 1, 0), total)
  const isTableLoading = status === 'loading' || isLoading || isFetching
  // const isTableLoading = status === 'loading' || isLoading || isFetching || isLazyFetching

  const bannerError = useMemo(
    () => (error ? resolveBrandErrorMessage(error, 'Failed to fetch brands') : null),
    [error],
  )

  // const refreshBrands = useCallback(
  //   async (nextPage: number) => {
  //     const nextQuery: BrandQuery = { ...query, page: nextPage }
  //     await fetchBrandsLazy(nextQuery).unwrap()
  //   },
  //   [fetchBrandsLazy, query],
  // )

  useEffect(() => {
    if (!prefetchBrands) return
    const baseQuery = { ...query }

    if (safePage < totalPages) {
      prefetchBrands({ ...baseQuery, page: safePage + 1 }, { ifOlderThan: 30 })
    }
    if (safePage > 1) {
      prefetchBrands({ ...baseQuery, page: safePage - 1 }, { ifOlderThan: 30 })
    }
  }, [prefetchBrands, query, safePage, totalPages])

  return {
    items,
    total,
    totalPages,
    safePage,
    startIndex,
    endIndex,
    isTableLoading,
    bannerError,
    // refreshBrands,
  }
}

export default useBrandsData
