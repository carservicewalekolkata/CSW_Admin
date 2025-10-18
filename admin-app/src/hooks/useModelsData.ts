import { useEffect, useMemo } from 'react'
import { toast } from '@/lib/sonner'

import { useFetchModelsQuery } from '@/store/slices/models/modelsSlice'
import { useFetchServiceCategoriesQuery } from '@/store/slices/serviceCategories/serviceCategoriesSlice'
import { resolveModelErrorMessage } from '@/utils/models'
import { resolveBrandErrorMessage } from '@/utils/brands'
import type { Model } from '@/types/models'
import type { ServiceCategory } from '@/types/serviceCategories'
import { useFetchBrandsQuery } from '@/store/slices/brands/brandsSlice'
import { useAppSelector } from '@/store/hooks'
import type { ModelQuery } from '@/types/models'

type UseModelsDataParams = {
  query: ModelQuery
  page: number
  pageSize: number
}

type UseModelsDataResult = {
  items: Model[]
  total: number
  totalPages: number
  safePage: number
  startIndex: number
  endIndex: number
  isTableLoading: boolean
  brandOptions: { slug: string; name: string }[]
  brandFilterOptions: string[]
  categoryOptions: ServiceCategory[]
  bannerError: string | null
  refetchBrands: () => Promise<unknown>
}

export const useModelsData = ({ query, page, pageSize }: UseModelsDataParams): UseModelsDataResult => {
  const { items, total, status, error } = useAppSelector((state) => state.models)
  const { isLoading, isFetching } = useFetchModelsQuery(query, {
    refetchOnMountOrArgChange: true,
  })

  const {
    data: brandsResponse,
    error: brandsError,
    refetch: refetchBrands,
  } = useFetchBrandsQuery({
    limit: 200,
    sortStatus: 'none',
    sortUpdated: 'desc',
  })

  const { data: categoriesResponse } = useFetchServiceCategoriesQuery({
    limit: 200,
    sortUpdated: 'desc',
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = total === 0 ? 0 : Math.min(startIndex + Math.max(items.length - 1, 0), total)
  const isTableLoading = status === 'loading' || isLoading || isFetching

  const brandOptions = useMemo(() => {
    const data = brandsResponse?.data ?? []
    return data
      .map((brand) => ({ slug: brand.slug, name: brand.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [brandsResponse])

  const brandFilterOptions = useMemo(
    () => brandOptions.map((option) => option.name),
    [brandOptions],
  )

  const categoryOptions = useMemo<ServiceCategory[]>(() => categoriesResponse?.data ?? [], [categoriesResponse])

  const bannerError = useMemo(
    () => (error ? resolveModelErrorMessage(error, 'Failed to fetch models') : null),
    [error],
  )

  useEffect(() => {
    if (!brandsError) {
      return
    }
    const message = resolveBrandErrorMessage(brandsError, 'Failed to load brands')
    toast.error(message)
  }, [brandsError])

  return {
    items,
    total,
    totalPages,
    safePage,
    startIndex,
    endIndex,
    isTableLoading,
    brandOptions,
    brandFilterOptions,
    categoryOptions,
    bannerError,
    refetchBrands,
  }
}

export default useModelsData
