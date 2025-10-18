import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/sonner'

import {
  useFetchServiceCategoriesQuery,
  useDeleteServiceCategoryMutation,
  usePrefetchServiceCategories,
  useCreateServiceCategoryMutation,
  useLazyFetchServiceCategoriesQuery,
} from '@/store/slices/serviceCategories/serviceCategoriesSlice'
import type { ServiceCategory, ServiceCategoryQuery } from '@/types/serviceCategories'
import { useAppSelector } from '@/store/hooks'
import { resolveServiceCategoryErrorMessage } from '@/utils/serviceCategories'
import type {
  CreateModalState,
  DeleteModalState,
  FiltersState,
  UseServiceCategoriesPageResult,
} from '@/types/serviceCategoriesPage'
import { useServiceCategoryFilters } from '@/hooks/useServiceCategoryFilters'

const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred.'

export const useServiceCategoriesPage = (): UseServiceCategoriesPageResult => {
  const {
    query,
    searchTerm,
    dateSort,
    pageSize,
    page,
    setPage,
    handleSearchChange,
    handleSortChange,
    handlePageSizeChange,
  } = useServiceCategoryFilters()
  const [deleteTarget, setDeleteTarget] = useState<ServiceCategory | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const { error, isLoading, isFetching } = useFetchServiceCategoriesQuery(query)
  const [deleteServiceCategory] = useDeleteServiceCategoryMutation()
  const [createServiceCategory, { isLoading: isCreating }] = useCreateServiceCategoryMutation()
  const [fetchServiceCategoriesLazy, { isFetching: isLazyFetching }] = useLazyFetchServiceCategoriesQuery()
  const prefetchServiceCategories = usePrefetchServiceCategories()
  const { items, total, status: categoriesStatus, lastQuery } = useAppSelector(
    (state) => state.serviceCategories,
  )
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex =
    total === 0 ? 0 : Math.min(startIndex + Math.max(items.length - 1, 0), total)
  const isTableLoading = isLoading || isFetching || isLazyFetching || categoriesStatus === 'loading'

  useEffect(() => {
    if (!prefetchServiceCategories) return
    const baseQuery = { ...query }

    if (safePage < totalPages) {
      prefetchServiceCategories({ ...baseQuery, page: safePage + 1 }, { ifOlderThan: 30 })
    }
    if (safePage > 1) {
      prefetchServiceCategories({ ...baseQuery, page: safePage - 1 }, { ifOlderThan: 30 })
    }
  }, [prefetchServiceCategories, query, safePage, totalPages])

  const bannerError = useMemo(
    () => (error ? resolveServiceCategoryErrorMessage(error, DEFAULT_ERROR_MESSAGE) : null),
    [error],
  )

  const refreshWithLatestQuery = async (nextPage: number) => {
    const queryToUse: ServiceCategoryQuery = {
      ...lastQuery,
      search: lastQuery.search ?? (searchTerm || undefined),
      sortUpdated: lastQuery.sortUpdated ?? dateSort,
      page: nextPage,
      limit: lastQuery.limit ?? pageSize,
    }

    try {
      await fetchServiceCategoriesLazy(queryToUse).unwrap()
    } catch (err) {
      const message = resolveServiceCategoryErrorMessage(err, DEFAULT_ERROR_MESSAGE)
      toast.error(message)
    }
  }

  const openCreateModal = () => {
    setIsCreateModalOpen(true)
    setCreateError(null)
  }
  const closeCreateModal = () => {
    setIsCreateModalOpen(false)
    setNewCategoryName('')
    setCreateError(null)
  }

  const handleCreateSubmit: CreateModalState['onSubmit'] = async (event) => {
    event.preventDefault()
    if (isCreating) return

    const trimmed = newCategoryName.trim()
    if (!trimmed) {
      setCreateError('Category name is required')
      return
    }

    try {
      setCreateError(null)
      const response = await createServiceCategory({ name: trimmed }).unwrap()
      const createdName = response.data?.name ?? trimmed
      toast.success(`Created category: ${createdName}`)
      closeCreateModal()
      if (page !== 1) {
        setPage(1)
      }
      await refreshWithLatestQuery(1)
    } catch (err) {
      const message = resolveServiceCategoryErrorMessage(err, 'Failed to create service category')
      setCreateError(message)
      toast.error(message)
    }
  }

  const handleDeleteConfirm: DeleteModalState['confirm'] = async () => {
    if (!deleteTarget) return
    const { id, name } = deleteTarget
    const shouldMovePrev = items.length === 1 && safePage > 1
    const nextPage = shouldMovePrev ? Math.max(1, safePage - 1) : safePage

    try {
      await deleteServiceCategory(id).unwrap()
      toast.success(`Deleted category: ${name}`)
      setDeleteTarget(null)
      if (shouldMovePrev) {
        setPage(nextPage)
      }
      await refreshWithLatestQuery(nextPage)
    } catch (err) {
      const message = resolveServiceCategoryErrorMessage(err, 'Failed to delete service category')
      toast.error(message)
    }
  }

  const filters: FiltersState = {
    searchTerm,
    dateSort,
    pageSize,
    safePage,
    totalPages,
    total,
    startIndex,
    endIndex,
    onSearchChange: handleSearchChange,
    onSortChange: handleSortChange,
    onPageSizeChange: handlePageSizeChange,
    onPrevPage: () => setPage((prev) => Math.max(1, prev - 1)),
    onNextPage: () => setPage((prev) => Math.min(totalPages, prev + 1)),
  }

  const createModal: CreateModalState = {
    isOpen: isCreateModalOpen,
    name: newCategoryName,
    error: createError,
    isSubmitting: isCreating,
    open: openCreateModal,
    close: closeCreateModal,
    onNameChange: (value: string) => {
      setNewCategoryName(value)
      if (createError) {
        setCreateError(null)
      }
    },
    onSubmit: handleCreateSubmit,
  }

  const deleteModal: DeleteModalState = {
    target: deleteTarget,
    request: (category: ServiceCategory) => setDeleteTarget(category),
    cancel: () => setDeleteTarget(null),
    confirm: handleDeleteConfirm,
  }

  return {
    items,
    isTableLoading,
    bannerError,
    filters,
    createModal,
    deleteModal,
  }
}

export default useServiceCategoriesPage
