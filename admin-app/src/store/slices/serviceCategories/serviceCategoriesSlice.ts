import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ServiceCategory, ServiceCategoryResponse } from '@/types/serviceCategories'
import { resolveServiceCategoryErrorMessage } from '@/utils/serviceCategories'
import { serviceCategoriesApi } from './serviceCategoriesApi'

export type ServiceCategoryStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface ServiceCategoriesState {
  items: ServiceCategory[]
  status: ServiceCategoryStatus
  error: string | null
  total: number
  page: number
  limit: number
}

const initialState: ServiceCategoriesState = {
  items: [],
  status: 'idle',
  error: null,
  total: 0,
  page: 1,
  limit: 10,
}

const findCategoryIndex = (items: ServiceCategory[], id: number) =>
  items.findIndex((item) => item.id === id)

const ensureCategoryType = (category: ServiceCategory): ServiceCategory => {
  const normalized = typeof category.type === 'string' ? category.type.trim().toLowerCase() : null
  const safeType: ServiceCategory['type'] = normalized === 'custom' ? 'custom' : 'basic'
  const descriptionValue =
    typeof category.description === 'string' && category.description.trim().length > 0
      ? category.description.trim()
      : null

  return {
    ...category,
    description: descriptionValue,
    type: safeType,
  }
}

const serviceCategoriesSlice = createSlice({
  name: 'serviceCategories',
  initialState,
  reducers: {
    addServiceCategory(state, action: PayloadAction<ServiceCategory>) {
      const category = ensureCategoryType(action.payload)
      const existingIndex = findCategoryIndex(state.items, category.id)

      if (existingIndex !== -1) {
        state.items[existingIndex] = category
      } else {
        state.items.unshift(category)
        state.total += 1
      }
    },
    updateServiceCategory(state, action: PayloadAction<ServiceCategory>) {
      const category = ensureCategoryType(action.payload)
      const targetIndex = findCategoryIndex(state.items, category.id)

      if (targetIndex !== -1) {
        state.items[targetIndex] = category
      } else {
        state.items.unshift(category)
        state.total += 1
      }
    },
    removeServiceCategory(state, action: PayloadAction<number>) {
      const id = action.payload
      const index = findCategoryIndex(state.items, id)

      if (index !== -1) {
        state.items.splice(index, 1)
        state.total = Math.max(0, state.total - 1)
      }
    },
    resetServiceCategories: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(serviceCategoriesApi.endpoints.fetchServiceCategories.matchPending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addMatcher(serviceCategoriesApi.endpoints.fetchServiceCategories.matchFulfilled, (state, action) => {
        const response = action.payload as ServiceCategoryResponse
        state.items = Array.isArray(response.data)
          ? response.data.map(ensureCategoryType)
          : []
        state.total = typeof response.total === 'number' ? response.total : response.count ?? 0
        state.page = typeof response.page === 'number' ? response.page : 1
        state.limit = typeof response.limit === 'number' ? response.limit : state.limit
        state.status = 'succeeded'
        state.error = null
      })
      .addMatcher(serviceCategoriesApi.endpoints.fetchServiceCategories.matchRejected, (state, action) => {
        state.status = 'failed'
        state.error = resolveServiceCategoryErrorMessage(
          action.payload ?? action.error,
          'Failed to fetch service categories',
        )
      })
  },
})

export const {
  useFetchServiceCategoriesQuery,
  useLazyFetchServiceCategoriesQuery,
  useDeleteServiceCategoryMutation,
  useCreateServiceCategoryMutation,
  useUpdateServiceCategoryMutation,
} = serviceCategoriesApi

export const usePrefetchServiceCategories = () =>
  serviceCategoriesApi.usePrefetch('fetchServiceCategories')

export const {
  addServiceCategory,
  updateServiceCategory,
  removeServiceCategory,
  resetServiceCategories,
} = serviceCategoriesSlice.actions

export default serviceCategoriesSlice.reducer
