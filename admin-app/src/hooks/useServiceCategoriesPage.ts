import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/sonner'

import {
  useFetchServiceCategoriesQuery,
  useDeleteServiceCategoryMutation,
  usePrefetchServiceCategories,
  useCreateServiceCategoryMutation,
  addServiceCategory,
  updateServiceCategory as updateServiceCategoryAction,
  removeServiceCategory,
  useUpdateServiceCategoryMutation,
} from '@/store/slices/serviceCategories/serviceCategoriesSlice'
import type { ServiceCategory } from '@/types/serviceCategories'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { resolveServiceCategoryErrorMessage } from '@/utils/serviceCategories'
import type {
  CreateModalState,
  EditModalState,
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
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  const dispatch = useAppDispatch()

  const { error, isLoading, isFetching, refetch } = useFetchServiceCategoriesQuery(query, {
    refetchOnMountOrArgChange: true,
  })
  const [deleteServiceCategory] = useDeleteServiceCategoryMutation()
  const [createServiceCategory, { isLoading: isCreating }] = useCreateServiceCategoryMutation()
  const [updateServiceCategory, { isLoading: isUpdating }] = useUpdateServiceCategoryMutation()
  const prefetchServiceCategories = usePrefetchServiceCategories()
  const { items, total, status: categoriesStatus } = useAppSelector((state) => state.serviceCategories)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex =
    total === 0 ? 0 : Math.min(startIndex + Math.max(items.length - 1, 0), total)
  const isTableLoading = isLoading || isFetching || categoriesStatus === 'loading'

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
      const createdCategory = response.data
      const createdName = createdCategory?.name ?? trimmed
      if (createdCategory) {
        dispatch(addServiceCategory(createdCategory))
      }
      toast.success(`Created category: ${createdName}`)
      closeCreateModal()
      if (page !== 1) {
        setPage(1)
      }
      if (!createdCategory) {
        await refetch()
      }
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
      dispatch(removeServiceCategory(id))
      toast.success(`Deleted category: ${name}`)
      setDeleteTarget(null)
      if (shouldMovePrev) {
        setPage(nextPage)
      }
      await refetch()
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
    onPrevPage: () => setPage(Math.max(1, safePage - 1)),
    onNextPage: () => setPage(Math.min(totalPages, safePage + 1)),
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

  const openEditModal = (category: ServiceCategory) => {
    setEditingCategory(category)
    setEditName(category.name)
    setEditError(null)
  }

  const closeEditModal = () => {
    setEditingCategory(null)
    setEditName('')
    setEditError(null)
  }

  const handleEditSubmit: EditModalState['onSubmit'] = async (event) => {
    event.preventDefault()
    if (!editingCategory || isUpdating) return

    const trimmed = editName.trim()
    if (!trimmed) {
      setEditError('Category name is required')
      return
    }

    if (trimmed === editingCategory.name) {
      toast.info('No changes to save')
      return
    }

    try {
      setEditError(null)
      const response = await updateServiceCategory({ id: editingCategory.id, name: trimmed }).unwrap()
      const updatedCategory =
        response.data ?? {
          ...editingCategory,
          name: trimmed,
          updated_date: new Date().toISOString(),
        }

      dispatch(updateServiceCategoryAction(updatedCategory))
      toast.success(`Updated category: ${updatedCategory.name}`)
      closeEditModal()
      await refetch()
    } catch (err) {
      const message = resolveServiceCategoryErrorMessage(err, 'Failed to update service category')
      setEditError(message)
      toast.error(message)
    }
  }

  const editModal: EditModalState = {
    isOpen: Boolean(editingCategory),
    target: editingCategory,
    name: editName,
    error: editError,
    isSubmitting: isUpdating,
    open: openEditModal,
    close: closeEditModal,
    onNameChange: (value: string) => {
      setEditName(value)
      if (editError) {
        setEditError(null)
      }
    },
    onSubmit: handleEditSubmit,
  }

  return {
    items,
    isTableLoading,
    bannerError,
    filters,
    createModal,
    editModal,
    deleteModal,
  }
}

export default useServiceCategoriesPage
