import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import type { Brand } from '@/types/brands'

import { brandsApi } from './brandsApi'

type BrandsStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface BrandsState {
  items: Brand[]
  status: BrandsStatus
  error: string | null
}

const initialState: BrandsState = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchBrands = createAsyncThunk('brands/fetchAll', async () => {
  const data = await brandsApi.fetchBrands()
  return data
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
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrands.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.items = action.payload
        state.status = 'succeeded'
        state.error = null
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to load brands'
      })
      .addCase(deleteBrand.pending, (state) => {
        state.error = null
      })
      .addCase(deleteBrand.fulfilled, (state, action) => {
        state.items = state.items.filter((brand) => brand.slug !== action.payload)
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
