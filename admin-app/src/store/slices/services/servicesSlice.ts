import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Service, ServiceQuery, ServiceResponse } from '@/types/services'
import { servicesApi } from './servicesApi'

export type ServicesStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface ServicesState {
  items: Service[]
  status: ServicesStatus
  error: string | null
  total: number
  page: number
  limit: number
  lastQuery: ServiceQuery
}

const initialState: ServicesState = {
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

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    clearServices(state) {
      Object.assign(state, initialState)
    },
    setLastQuery(state, action: PayloadAction<Partial<ServiceQuery>>) {
      state.lastQuery = { ...state.lastQuery, ...action.payload }
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch Services ---
      .addMatcher(servicesApi.endpoints.fetchServices.matchPending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addMatcher(servicesApi.endpoints.fetchServices.matchFulfilled, (state, { payload, meta }) => {
        const query = meta?.arg?.originalArgs as ServiceQuery | undefined
        const response = payload as ServiceResponse

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
          category: query?.category,
          status: query?.status,
        }
      })
      .addMatcher(servicesApi.endpoints.fetchServices.matchRejected, (state, { error }) => {
        state.status = 'failed'
        state.error = error?.message ?? 'Failed to fetch services'
      })
  },
})

export const { useFetchServicesQuery, useLazyFetchServicesQuery } = servicesApi
export const { clearServices, setLastQuery } = servicesSlice.actions
export default servicesSlice.reducer
