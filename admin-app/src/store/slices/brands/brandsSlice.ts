import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import type { Brand, BrandQuery, BrandResponse } from '@/types/brands'

import { brandsApi } from './brandsApi'

type BrandsStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface BrandsState {
  items: Brand[]
  status: BrandsStatus
  error: string | null
  total: number
  page: number
  limit: number
  lastQuery: BrandQuery
}

const initialState: BrandsState = {
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

type FetchBrandsResult = {
  response: BrandResponse
  query: BrandQuery
}

export const fetchBrands = createAsyncThunk<
  FetchBrandsResult,
  BrandQuery | undefined,
  { rejectValue: string }
>('brands/fetchAll', async (query = {}, { rejectWithValue }) => {
  try {
    const data = await brandsApi.fetchBrands(query)
    return { response: data, query }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch brands'
    return rejectWithValue(message)
  }
})

export const deleteBrand = createAsyncThunk('brands/delete', async (slug: string) => {
  await brandsApi.deleteBrand(slug)
  return slug
})

const brandsSlice = createSlice({
  name: 'brands',
  initialState,
  reducers: {
    clearBrands(state) {
      state.items = []
      state.status = 'idle'
      state.error = null
      state.total = 0
      state.page = 1
      state.limit = 10
      state.lastQuery = {
        page: 1,
        limit: 10,
        sortStatus: 'none',
        sortUpdated: 'desc',
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrands.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        const payload = action.payload as FetchBrandsResult | undefined

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
        }
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.status = 'failed'
        state.error = (action.payload as string) ?? action.error.message ?? 'Failed to load brands'
      })
      .addCase(deleteBrand.pending, (state) => {
        state.error = null
      })
      .addCase(deleteBrand.fulfilled, (state, action) => {
        state.items = state.items.filter((brand) => brand.slug !== action.payload)
        state.total = Math.max(0, state.total - 1)
        state.status = 'succeeded'
      })
      .addCase(deleteBrand.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to delete brand'
      })
  },
})

export const { clearBrands } = brandsSlice.actions
export const brandsReducer = brandsSlice.reducer
