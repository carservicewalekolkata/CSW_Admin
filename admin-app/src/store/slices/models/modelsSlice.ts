import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import type { Model, ModelQuery, ModelResponse } from '@/types/models'

import { modelsApi } from './modelsApi'

type ModelsStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

type FetchModelsResult = {
  response: ModelResponse
  query: ModelQuery
}

export interface ModelsState {
  items: Model[]
  status: ModelsStatus
  error: string | null
  total: number
  page: number
  limit: number
  lastQuery: ModelQuery
}

export const initialModelsState: ModelsState = {
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

export const fetchModels = createAsyncThunk<
  FetchModelsResult,
  ModelQuery | undefined,
  { rejectValue: string }
>('models/fetchAll', async (query = {}, { rejectWithValue }) => {
  try {
    const data = await modelsApi.fetchModels(query)
    return { response: data, query }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch models'
    return rejectWithValue(message)
  }
})

export const deleteModel = createAsyncThunk('models/delete', async (slug: string) => {
  await modelsApi.deleteModel(slug)
  return slug
})

const modelsSlice = createSlice({
  name: 'models',
  initialState: initialModelsState,
  reducers: {
    clearModels(state) {
      Object.assign(state, initialModelsState)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchModels.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchModels.fulfilled, (state, action) => {
        const payload = action.payload as FetchModelsResult | undefined
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
          sortStatus: query.sortStatus ?? 'none',
          sortUpdated: query.sortUpdated ?? 'desc',
          search: query.search,
          slug: query.slug,
          brand: query.brand,
          bodyType: query.bodyType,
          fuel: query.fuel,
        }
      })
      .addCase(fetchModels.rejected, (state, action) => {
        state.status = 'failed'
        state.error = (action.payload as string) ?? action.error.message ?? 'Failed to load models'
      })
      .addCase(deleteModel.pending, (state) => {
        state.error = null
      })
      .addCase(deleteModel.fulfilled, (state, action) => {
        state.items = state.items.filter((model) => model.slug !== action.payload)
        state.total = Math.max(0, state.total - 1)
        state.status = 'succeeded'
      })
      .addCase(deleteModel.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to delete model'
      })
  },
})

export const { clearModels } = modelsSlice.actions
export const modelsReducer = modelsSlice.reducer
