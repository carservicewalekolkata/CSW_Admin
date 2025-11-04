import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { Model } from '@/types/models'
import { resolveModelErrorMessage } from '@/utils/models'
import { modelsApi } from './modelsApi'

export type ModelsStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface ModelsState {
  items: Model[]
  status: ModelsStatus
  error: string | null
  total: number
  page: number
  limit: number
}

const initialState: ModelsState = {
  items: [],
  status: 'idle',
  error: null,
  total: 0,
  page: 1,
  limit: 10,
}

const findModelIndex = (items: Model[], slug: string) => items.findIndex((item) => item.slug === slug)

const modelsSlice = createSlice({
  name: 'models',
  initialState,
  reducers: {
    addModel(state, action: PayloadAction<Model>) {
      const model = action.payload
      const existingIndex = findModelIndex(state.items, model.slug)

      if (existingIndex !== -1) {
        state.items[existingIndex] = model
      } else {
        state.items.unshift(model)
        state.total += 1
      }
    },
    updateModel(state, action: PayloadAction<{ model: Model; previousSlug?: string }>) {
      const { model, previousSlug } = action.payload
      const slugToMatch = previousSlug ?? model.slug
      let targetIndex = findModelIndex(state.items, slugToMatch)

      if (targetIndex === -1) {
        targetIndex = findModelIndex(state.items, model.slug)
      }

      if (targetIndex !== -1) {
        state.items[targetIndex] = model
      } else {
        state.items.unshift(model)
        state.total += 1
        targetIndex = 0
      }

      if (previousSlug && previousSlug !== model.slug) {
        for (let index = state.items.length - 1; index >= 0; index -= 1) {
          if (index !== targetIndex && state.items[index]?.slug === model.slug) {
            state.items.splice(index, 1)
            state.total = Math.max(0, state.total - 1)
          }
        }
      }
    },
    removeModel(state, action: PayloadAction<string>) {
      const slug = action.payload
      const index = findModelIndex(state.items, slug)

      if (index !== -1) {
        state.items.splice(index, 1)
        state.total = Math.max(0, state.total - 1)
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(modelsApi.endpoints.fetchModels.matchPending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addMatcher(modelsApi.endpoints.fetchModels.matchFulfilled, (state, action) => {
        const response = action.payload
        state.items = Array.isArray(response.data) ? response.data : []
        state.total = typeof response.total === 'number' ? response.total : response.count ?? 0
        state.page = typeof response.page === 'number' ? response.page : 1
        state.limit = typeof response.limit === 'number' ? response.limit : state.limit
        state.status = 'succeeded'
        state.error = null
      })
      .addMatcher(modelsApi.endpoints.fetchModels.matchRejected, (state, action) => {
        state.status = 'failed'
        state.error = resolveModelErrorMessage(action.payload ?? action.error, 'Failed to fetch models')
      })
  },
})

export const { addModel, updateModel, removeModel } = modelsSlice.actions

export const {
  useFetchModelsQuery,
  useDeleteModelMutation,
  useCreateModelMutation,
  useUpdateModelMutation,
} = modelsApi
export default modelsSlice.reducer
