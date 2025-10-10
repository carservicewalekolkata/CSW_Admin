import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import type { ServiceCategory, ServiceCategoryQuery, ServiceCategoryResponse } from '@/types/serviceCategories'

import { serviceCategoriesApi } from './serviceCategoriesApi'

type ServiceCategoryStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

type FetchServiceCategoriesResult = {
  response: ServiceCategoryResponse
  query: ServiceCategoryQuery
}

export interface ServiceCategoriesState {
  items: ServiceCategory[]
  status: ServiceCategoryStatus
  error: string | null
  total: number
  page: number
  limit: number
  lastQuery: ServiceCategoryQuery
}

export const initialServiceCategoriesState: ServiceCategoriesState = {
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

export const fetchServiceCategories = createAsyncThunk<
  FetchServiceCategoriesResult,
  ServiceCategoryQuery | undefined,
  { rejectValue: string }
>('serviceCategories/fetchAll', async (query = {}, { rejectWithValue }) => {
  try {
    const data = await serviceCategoriesApi.fetchServiceCategories(query)
    return { response: data, query }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch service categories'
    return rejectWithValue(message)
  }
})

export const deleteServiceCategory = createAsyncThunk('serviceCategories/delete', async (id: number) => {
  await serviceCategoriesApi.deleteServiceCategory(id)
  return id
})

export const createServiceCategory = createAsyncThunk(
  'serviceCategories/create',
  async (name: string, { rejectWithValue }) => {
    try {
      const created = await serviceCategoriesApi.createServiceCategory(name)
      return created
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create service category'
      return rejectWithValue(message)
    }
  },
)

export const updateServiceCategory = createAsyncThunk(
  'serviceCategories/update',
  async ({ id, name }: { id: number; name: string }, { rejectWithValue }) => {
    try {
      const updated = await serviceCategoriesApi.updateServiceCategory(id, name)
      return updated
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update service category'
      return rejectWithValue(message)
    }
  },
)

const serviceCategoriesSlice = createSlice({
  name: 'serviceCategories',
  initialState: initialServiceCategoriesState,
  reducers: {
    clearServiceCategories(state) {
      Object.assign(state, initialServiceCategoriesState)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServiceCategories.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchServiceCategories.fulfilled, (state, action) => {
        const payload = action.payload as FetchServiceCategoriesResult | undefined
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
        }
      })
      .addCase(fetchServiceCategories.rejected, (state, action) => {
        state.status = 'failed'
        state.error = (action.payload as string) ?? action.error.message ?? 'Failed to load service categories'
      })
      .addCase(deleteServiceCategory.pending, (state) => {
        state.error = null
      })
      .addCase(deleteServiceCategory.fulfilled, (state, action) => {
        state.items = state.items.filter((category) => category.id !== action.payload)
        state.total = Math.max(0, state.total - 1)
        state.status = 'succeeded'
      })
      .addCase(deleteServiceCategory.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to delete service category'
      })
      .addCase(createServiceCategory.pending, (state) => {
        state.error = null
      })
      .addCase(createServiceCategory.fulfilled, (state, action) => {
        const payload = action.payload
        if (payload) {
          state.items = [payload, ...state.items]
          state.total += 1
        }
        state.status = 'succeeded'
      })
      .addCase(createServiceCategory.rejected, (state, action) => {
        state.status = 'failed'
        state.error = (action.payload as string) ?? action.error.message ?? 'Failed to create service category'
      })
      .addCase(updateServiceCategory.pending, (state) => {
        state.error = null
      })
      .addCase(updateServiceCategory.fulfilled, (state, action) => {
        const payload = action.payload
        if (payload) {
          state.items = state.items.map((category) => (category.id === payload.id ? payload : category))
        }
        state.status = 'succeeded'
      })
      .addCase(updateServiceCategory.rejected, (state, action) => {
        state.status = 'failed'
        state.error = (action.payload as string) ?? action.error.message ?? 'Failed to update service category'
      })
  },
})

export const { clearServiceCategories } = serviceCategoriesSlice.actions
export const serviceCategoriesReducer = serviceCategoriesSlice.reducer
