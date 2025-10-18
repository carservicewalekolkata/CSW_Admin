import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ServiceCategory, ServiceCategoryQuery, ServiceCategoryResponse } from '@/types/serviceCategories'
import { removeCategoryFromList, upsertCategoryIntoList } from '@/utils/serviceCategories'
import { serviceCategoriesApi } from './serviceCategoriesApi'

export type ServiceCategoryStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface ServiceCategoriesState {
  items: ServiceCategory[]
  serviceCategories: ServiceCategory[]
  status: ServiceCategoryStatus
  error: string | null
  total: number
  page: number
  limit: number
  lastQuery: ServiceCategoryQuery
}

const initialState: ServiceCategoriesState = {
  items: [],
  serviceCategories: [],
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

        const data = Array.isArray(response.data) ? response.data : []
        state.items = data
        state.serviceCategories = data
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
          state.items = removeCategoryFromList(state.items, id)
          state.serviceCategories = removeCategoryFromList(state.serviceCategories, id)
          state.total = Math.max(0, state.total - 1)
        }
        state.status = 'succeeded'
      })
      .addMatcher(serviceCategoriesApi.endpoints.deleteServiceCategory.matchRejected, (state, { error }) => {
        state.status = 'failed'
        state.error = error?.message ?? 'Failed to delete service category'
      })

      // --- Create ---
      .addMatcher(serviceCategoriesApi.endpoints.createServiceCategory.matchPending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addMatcher(serviceCategoriesApi.endpoints.createServiceCategory.matchFulfilled, (state, { payload }) => {
        state.status = 'succeeded'

        const created = payload?.data
        if (!created) {
          return
        }

        const limit = state.lastQuery.limit ?? state.limit ?? 10
        const sortOrder = state.lastQuery.sortUpdated ?? 'desc'
        const alreadyTracked = state.items.some((item) => item.id === created.id)
        const matchesSearch = (() => {
          const search = state.lastQuery.search?.trim().toLowerCase()
          if (!search) return true
          return created.name.toLowerCase().includes(search)
        })()

        if (matchesSearch) {
          state.items = upsertCategoryIntoList(state.items, created, sortOrder, limit)
          state.serviceCategories = state.items

          if (!alreadyTracked) {
            state.total += 1
          }
        } else if (!alreadyTracked) {
          state.total += 1
        }
      })
      .addMatcher(serviceCategoriesApi.endpoints.createServiceCategory.matchRejected, (state, { error }) => {
        state.status = 'failed'
        state.error = error?.message ?? 'Failed to create service category'
      })
  },
})

export const {
  useFetchServiceCategoriesQuery,
  useLazyFetchServiceCategoriesQuery,
  useDeleteServiceCategoryMutation,
  useCreateServiceCategoryMutation,
} = serviceCategoriesApi

export const usePrefetchServiceCategories = () =>
  serviceCategoriesApi.usePrefetch('fetchServiceCategories')

export const { clearServiceCategories, setLastQuery } = serviceCategoriesSlice.actions
export default serviceCategoriesSlice.reducer
