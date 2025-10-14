import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Model, ModelQuery, ModelResponse } from '@/types/models'
import { modelsApi } from './modelsApi'

export type ModelsStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface ModelsState {
  items: Model[]
  status: ModelsStatus
  error: string | null
  total: number
  page: number
  limit: number
  lastQuery: ModelQuery
}

const initialState: ModelsState = {
  items: [],
  status: 'idle',
  error: null,
  total: 0,
  page: 1,
  limit: 10,
  lastQuery: {
    page: 1,
    limit: 10,
    sortStatus: 'none',
    sortUpdated: 'desc',
  },
}

const modelsSlice = createSlice({
  name: 'models',
  initialState,
  reducers: {
    clearModels(state) {
      Object.assign(state, initialState)
    },
    setLastQuery(state, action: PayloadAction<Partial<ModelQuery>>) {
      state.lastQuery = { ...state.lastQuery, ...action.payload }
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(modelsApi.endpoints.fetchModels.matchPending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addMatcher(modelsApi.endpoints.fetchModels.matchFulfilled, (state, { payload, meta }) => {
        const query = meta?.arg?.originalArgs as ModelQuery | undefined
        const response = payload as ModelResponse

        state.items = Array.isArray(response.data) ? response.data : []
        state.total = response.total ?? 0
        state.page = response.page ?? 1
        state.limit = response.limit ?? 10
        state.status = 'succeeded'
        state.error = null

        state.lastQuery = {
          page: state.page,
          limit: state.limit,
          sortStatus: query?.sortStatus ?? 'none',
          sortUpdated: query?.sortUpdated ?? 'desc',
          search: query?.search,
          slug: query?.slug,
          brand: query?.brand,
          bodyType: query?.bodyType,
          fuel: query?.fuel,
        }
      })
      .addMatcher(modelsApi.endpoints.fetchModels.matchRejected, (state, { error }) => {
        state.status = 'failed'
        state.error = error?.message ?? 'Failed to fetch models'
      })
      .addMatcher(modelsApi.endpoints.deleteModel.matchPending, (state) => {
        state.error = null
      })
      .addMatcher(modelsApi.endpoints.deleteModel.matchFulfilled, (state, { meta }) => {
        const slug = meta?.arg?.originalArgs as string
        if (slug) {
          state.items = state.items.filter((m) => m.slug !== slug)
          state.total = Math.max(0, state.total - 1)
        }
        state.status = 'succeeded'
      })
      .addMatcher(modelsApi.endpoints.deleteModel.matchRejected, (state, { error }) => {
        state.status = 'failed'
        state.error = error?.message ?? 'Failed to delete model'
      })
  },
})

export const { useFetchModelsQuery, useLazyFetchModelsQuery, useDeleteModelMutation } = modelsApi
export const usePrefetchModels = () => modelsApi.usePrefetch('fetchModels')
export const { clearModels, setLastQuery } = modelsSlice.actions
export default modelsSlice.reducer
