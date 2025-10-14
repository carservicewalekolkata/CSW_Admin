import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Brand, BrandQuery, BrandResponse } from '@/types/brands'
import { brandsApi } from './brandsApi'

export type BrandsStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

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

const brandsSlice = createSlice({
  name: 'brands',
  initialState,
  reducers: {
    clearBrands(state) {
      Object.assign(state, initialState)
    },
    setLastQuery(state, action: PayloadAction<Partial<BrandQuery>>) {
      state.lastQuery = { ...state.lastQuery, ...action.payload }
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(brandsApi.endpoints.fetchBrands.matchPending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addMatcher(brandsApi.endpoints.fetchBrands.matchFulfilled, (state, { payload, meta }) => {
        const query = meta?.arg?.originalArgs as BrandQuery | undefined
        const response = payload as BrandResponse

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
        }
      })
      .addMatcher(brandsApi.endpoints.fetchBrands.matchRejected, (state, { error }) => {
        state.status = 'failed'
        state.error = error?.message ?? 'Failed to fetch brands'
      })
      .addMatcher(brandsApi.endpoints.deleteBrand.matchPending, (state) => {
        state.error = null
      })
      .addMatcher(brandsApi.endpoints.deleteBrand.matchFulfilled, (state, { meta }) => {
        const slug = meta?.arg?.originalArgs as string
        if (slug) {
          state.items = state.items.filter((b) => b.slug !== slug)
          state.total = Math.max(0, state.total - 1)
        }
        state.status = 'succeeded'
      })
      .addMatcher(brandsApi.endpoints.deleteBrand.matchRejected, (state, { error }) => {
        state.status = 'failed'
        state.error = error?.message ?? 'Failed to delete brand'
      })
  },
})

export const { useFetchBrandsQuery, useLazyFetchBrandsQuery, useDeleteBrandMutation } = brandsApi
export const usePrefetchBrands = () => brandsApi.usePrefetch('fetchBrands')
export const { clearBrands, setLastQuery } = brandsSlice.actions
export default brandsSlice.reducer
