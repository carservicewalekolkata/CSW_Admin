import { useServiceDetailsFilters } from '@/hooks/useServiceDetailsFilters'
import { useServiceDetailsData } from '@/hooks/useServiceDetailsData'
import { useServiceDetailsForm } from '@/hooks/useServiceDetailsForm'
import { useServiceDetailsDelete } from '@/hooks/useServiceDetailsDelete'
import type { ServiceFiltersState, UseServiceDetailsPageResult } from '@/types/serviceDetailsPage'

export const useServiceDetailsPage = (): UseServiceDetailsPageResult => {
  const {
    query,
    searchTerm,
    categoryId,
    status,
    dateSort,
    pageSize,
    page,
    setPage,
    handleSearchChange,
    handleCategoryChange,
    handleStatusChange,
    handleSortChange,
    handlePageSizeChange,
  } = useServiceDetailsFilters()

  const {
    items,
    total,
    totalPages,
    safePage,
    startIndex,
    endIndex,
    isTableLoading,
    categoryOptions,
    bannerError,
    refreshServices,
  } = useServiceDetailsData({ query, page, pageSize })

  const formModal = useServiceDetailsForm({
    categoryOptions,
    page,
    setPage,
    refreshServices,
  })

  const deleteModal = useServiceDetailsDelete({
    items,
    safePage,
    setPage,
    refreshServices,
  })

  const filters: ServiceFiltersState = {
    searchTerm,
    categoryId,
    status,
    dateSort,
    pageSize,
    safePage,
    totalPages,
    total,
    startIndex,
    endIndex,
    categoryOptions,
    onSearchChange: handleSearchChange,
    onCategoryChange: handleCategoryChange,
    onStatusChange: handleStatusChange,
    onSortChange: handleSortChange,
    onPageSizeChange: handlePageSizeChange,
    onPrevPage: () => setPage(Math.max(1, safePage - 1)),
    onNextPage: () => setPage(Math.min(totalPages, safePage + 1)),
  }

  return {
    items,
    isTableLoading,
    bannerError,
    filters,
    formModal,
    deleteModal,
  }
}

export default useServiceDetailsPage
