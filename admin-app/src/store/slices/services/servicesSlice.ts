import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import type { Service, ServiceQuery, ServiceResponse } from '@/types/services'

import { servicesApi } from './servicesApi'

type ServicesStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

type FetchServicesResult = {
  response: ServiceResponse
  query: ServiceQuery
}

export interface ServiceDetailsState {
  items: Service[]
  status: ServicesStatus
  error: string | null
  total: number
  page: number
  limit: number
  lastQuery: ServiceQuery & { page?: number; limit?: number }
}

export const initialServiceDetailsState: ServiceDetailsState = {
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

export const fetchServices = createAsyncThunk<FetchServicesResult, ServiceQuery | undefined, { rejectValue: string }>(
  'services/fetchAll',
  async (query = {}, { rejectWithValue }) => {
    try {
      const data = await servicesApi.fetchServices(query)
      return { response: data, query }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch services'
      return rejectWithValue(message)
    }
  },
)

const servicesSlice = createSlice({
  name: 'services',
  initialState: initialServiceDetailsState,
  reducers: {
    clearServices(state) {
      state.items = []
      state.status = 'idle'
      state.error = null
      state.total = 0
      state.page = 1
      state.limit = 10
      state.lastQuery = {
        page: 1,
        limit: 10,
        sortUpdated: 'desc',
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServices.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        const payload = action.payload as FetchServicesResult | undefined

        if (!payload) {
          state.status = 'succeeded'
          state.error = null
          return
        }

        const { response, query } = payload
        state.items = Array.isArray(response.data) ? response.data : []
        state.total = typeof response.total === 'number' ? response.total : 0
        state.page = typeof response.page === 'number' ? response.page : 1
        state.limit = typeof response.limit === 'number' ? response.limit : 10
        state.status = 'succeeded'
        state.error = null
        state.lastQuery = {
          page: state.page,
          limit: state.limit,
          sortUpdated: query.sortUpdated ?? 'desc',
          search: query.search,
          category: query.category,
          status: query.status,
        }
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.status = 'failed'
        state.error = (action.payload as string) ?? action.error.message ?? 'Failed to load services'
      })
  },
})

export const { clearServices } = servicesSlice.actions
export const servicesReducer = servicesSlice.reducer
