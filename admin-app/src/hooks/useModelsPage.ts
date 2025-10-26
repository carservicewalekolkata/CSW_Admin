import useModelFilters from '@/hooks/useModelFilters'
import useModelsData from '@/hooks/useModelsData'
import useModelForm from '@/hooks/useModelForm'
import useModelDelete from '@/hooks/useModelDelete'
import useModelServicesPreview from '@/hooks/useModelServicesPreview'
import useModelFuelModal from '@/hooks/useModelFuelModal'
import type { ModelFiltersState, UseModelsPageResult } from '@/types/modelsPage'

export const useModelsPage = (): UseModelsPageResult => {
  const filtersHook = useModelFilters()
  const dataHook = useModelsData({ query: filtersHook.query, page: filtersHook.page, pageSize: filtersHook.pageSize })

  const formModal = useModelForm({
    brandOptions: dataHook.brandOptions,
    categoryOptions: dataHook.categoryOptions,
    refetchBrands: dataHook.refetchBrands,
    page: filtersHook.page,
    setPage: filtersHook.setPage,
  })

  const deleteModal = useModelDelete({
    items: dataHook.items,
    safePage: dataHook.safePage,
    setPage: filtersHook.setPage,
  })

  const servicesPreview = useModelServicesPreview()
  const fuelModal = useModelFuelModal()

  const filters: ModelFiltersState = {
    searchName: filtersHook.searchName,
    slug: filtersHook.slug,
    brand: filtersHook.brand,
    statusSort: filtersHook.statusSort,
    dateSort: filtersHook.dateSort,
    pageSize: filtersHook.pageSize,
    safePage: dataHook.safePage,
    totalPages: dataHook.totalPages,
    total: dataHook.total,
    startIndex: dataHook.startIndex,
    endIndex: dataHook.endIndex,
    brandFilterOptions: dataHook.brandFilterOptions,
    onNameChange: filtersHook.handleNameChange,
    onSlugChange: filtersHook.handleSlugChange,
    onBrandChange: filtersHook.handleBrandChange,
    onStatusChange: filtersHook.handleStatusSortChange,
    onSortChange: filtersHook.handleDateSortChange,
    onPageSizeChange: filtersHook.handlePageSizeChange,
    onPrevPage: () => filtersHook.setPage(Math.max(1, filtersHook.page - 1)),
    onNextPage: () => filtersHook.setPage(Math.min(dataHook.totalPages, filtersHook.page + 1)),
  }

  return {
    items: dataHook.items,
    isTableLoading: dataHook.isTableLoading,
    bannerError: dataHook.bannerError,
    filters,
    formModal,
    deleteModal,
    servicesPreview,
    fuelModal,
  }
}

export default useModelsPage
