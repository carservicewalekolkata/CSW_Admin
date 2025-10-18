import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { Service, ServiceResponse } from '@/types/services'
import { resolveServiceErrorMessage } from '@/utils/serviceDetails'
import { servicesApi } from './servicesApi'

export type ServicesStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface ServicesState {
  items: Service[]
  status: ServicesStatus
  error: string | null
  total: number
  page: number
  limit: number
}

const initialState: ServicesState = {
  items: [],
  status: 'idle',
  error: null,
  total: 0,
  page: 1,
  limit: 10,
}

const findServiceIndex = (items: Service[], id: string) =>
  items.findIndex((service) => service.id === id)

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    addService(state, action: PayloadAction<Service>) {
      const service = action.payload
      const existingIndex = findServiceIndex(state.items, service.id)

      if (existingIndex !== -1) {
        state.items[existingIndex] = service
      } else {
        state.items.unshift(service)
        state.total += 1
      }
    },
    updateService(state, action: PayloadAction<Service>) {
      const service = action.payload
      const targetIndex = findServiceIndex(state.items, service.id)

      if (targetIndex !== -1) {
        state.items[targetIndex] = service
      } else {
        state.items.unshift(service)
        state.total += 1
      }
    },
    removeService(state, action: PayloadAction<string>) {
      const id = action.payload
      const index = findServiceIndex(state.items, id)

      if (index !== -1) {
        state.items.splice(index, 1)
        state.total = Math.max(0, state.total - 1)
      }
    },
    resetServices: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(servicesApi.endpoints.fetchServices.matchPending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addMatcher(servicesApi.endpoints.fetchServices.matchFulfilled, (state, action) => {
        const response = action.payload as ServiceResponse
        state.items = Array.isArray(response.data) ? response.data : []
        state.total = typeof response.total === 'number' ? response.total : response.count ?? 0
        state.page = typeof response.page === 'number' ? response.page : 1
        state.limit = typeof response.limit === 'number' ? response.limit : state.limit
        state.status = 'succeeded'
        state.error = null
      })
      .addMatcher(servicesApi.endpoints.fetchServices.matchRejected, (state, action) => {
        state.status = 'failed'
        state.error = resolveServiceErrorMessage(
          action.payload ?? action.error,
          'Failed to fetch services',
        )
      })
  },
})

export const {
  useFetchServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
} = servicesApi
export const usePrefetchServices = () => servicesApi.usePrefetch('fetchServices')

export const {
  addService,
  updateService,
  removeService,
  resetServices,
} = servicesSlice.actions

export default servicesSlice.reducer
