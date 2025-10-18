import useBrandFilters from '@/hooks/useBrandFilters'
import useBrandsData from '@/hooks/useBrandsData'
import useBrandForm from '@/hooks/useBrandForm'
import useBrandDelete from '@/hooks/useBrandDelete'
import type { BrandFiltersState, UseBrandsPageResult } from '@/types/brandsPage'

export const useBrandsPage = (): UseBrandsPageResult => {
  const filtersHook = useBrandFilters()
  const dataHook = useBrandsData({ query: filtersHook.query, page: filtersHook.page, pageSize: filtersHook.pageSize })

  const formModal = useBrandForm({
    page: filtersHook.page,
    setPage: filtersHook.setPage,
    // refreshBrands: dataHook.refreshBrands,
  })

  const deleteModal = useBrandDelete({
    items: dataHook.items,
    safePage: dataHook.safePage,
    setPage: filtersHook.setPage,
    // refreshBrands: dataHook.refreshBrands,
  })

  const filters: BrandFiltersState = {
    searchName: filtersHook.searchName,
    slug: filtersHook.slug,
    statusSort: filtersHook.statusSort,
    dateSort: filtersHook.dateSort,
    pageSize: filtersHook.pageSize,
    safePage: dataHook.safePage,
    totalPages: dataHook.totalPages,
    total: dataHook.total,
    startIndex: dataHook.startIndex,
    endIndex: dataHook.endIndex,
    onSearchChange: filtersHook.handleSearchChange,
    onSlugChange: filtersHook.handleSlugChange,
    onStatusChange: filtersHook.handleStatusChange,
    onSortChange: filtersHook.handleSortChange,
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
  }
}

export default useBrandsPage
