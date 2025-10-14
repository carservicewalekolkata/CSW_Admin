import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ServiceCategory, ServiceCategoryQuery, ServiceCategoryResponse } from '@/types/serviceCategories'
import { serviceCategoriesApi } from './serviceCategoriesApi'

export type ServiceCategoryStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface ServiceCategoriesState {
  items: ServiceCategory[]
  status: ServiceCategoryStatus
  error: string | null
  total: number
  page: number
  limit: number
  lastQuery: ServiceCategoryQuery
}

const initialState: ServiceCategoriesState = {
  items: [],
  status: 'idle',
  error: null,
  total: 0,
  page: 1,
  limit: 10,
  lastQuery: {
    page: 1,
    limit: 10,
    sortUpdated: 'desc',
  },
}

const serviceCategoriesSlice = createSlice({
  name: 'serviceCategories',
  initialState,
  reducers: {
    clearServiceCategories(state) {
      Object.assign(state, initialState)
    },
    setLastQuery(state, action: PayloadAction<Partial<ServiceCategoryQuery>>) {
      state.lastQuery = { ...state.lastQuery, ...action.payload }
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch All ---
      .addMatcher(serviceCategoriesApi.endpoints.fetchServiceCategories.matchPending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addMatcher(serviceCategoriesApi.endpoints.fetchServiceCategories.matchFulfilled, (state, { payload, meta }) => {
        const query = meta?.arg?.originalArgs as ServiceCategoryQuery | undefined
        const response = payload as ServiceCategoryResponse

        state.items = Array.isArray(response.data) ? response.data : []
        state.total = response.total ?? 0
        state.page = response.page ?? 1
        state.limit = response.limit ?? 10
        state.status = 'succeeded'
        state.error = null

        state.lastQuery = {
          page: state.page,
          limit: state.limit,
          sortUpdated: query?.sortUpdated ?? 'desc',
          search: query?.search,
        }
      })
      .addMatcher(serviceCategoriesApi.endpoints.fetchServiceCategories.matchRejected, (state, { error }) => {
        state.status = 'failed'
        state.error = error?.message ?? 'Failed to fetch service categories'
      })

      // --- Delete ---
      .addMatcher(serviceCategoriesApi.endpoints.deleteServiceCategory.matchPending, (state) => {
        state.error = null
      })
      .addMatcher(serviceCategoriesApi.endpoints.deleteServiceCategory.matchFulfilled, (state, { meta }) => {
        const id = meta?.arg?.originalArgs as number
        if (id) {
          state.items = state.items.filter((cat) => cat.id !== id)
          state.total = Math.max(0, state.total - 1)
        }
        state.status = 'succeeded'
      })
      .addMatcher(serviceCategoriesApi.endpoints.deleteServiceCategory.matchRejected, (state, { error }) => {
        state.status = 'failed'
        state.error = error?.message ?? 'Failed to delete service category'
      })
  },
})

export const {
  useFetchServiceCategoriesQuery,
  useLazyFetchServiceCategoriesQuery,
  useDeleteServiceCategoryMutation,
} = serviceCategoriesApi

export const usePrefetchServiceCategories = () =>
  serviceCategoriesApi.usePrefetch('fetchServiceCategories')

export const { clearServiceCategories, setLastQuery } = serviceCategoriesSlice.actions
export default serviceCategoriesSlice.reducer
