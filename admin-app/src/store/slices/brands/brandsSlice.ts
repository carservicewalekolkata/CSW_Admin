import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { Brand } from '@/types/brands'
import { resolveBrandErrorMessage } from '@/utils/brands'
import { brandsApi } from './brandsApi'

export type BrandsStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface BrandsState {
  items: Brand[]
  status: BrandsStatus
  error: string | null
  total: number
  page: number
  limit: number
}

const initialState: BrandsState = {
  items: [],
  status: 'idle',
  error: null,
  total: 0,
  page: 1,
  limit: 10,
}

const findBrandIndex = (items: Brand[], slug: string) => items.findIndex((item) => item.slug === slug)

const brandsSlice = createSlice({
  name: 'brands',
  initialState,
  reducers: {
    addBrand(state, action: PayloadAction<Brand>) {
      const brand = action.payload
      const existingIndex = findBrandIndex(state.items, brand.slug)

      if (existingIndex !== -1) {
        state.items[existingIndex] = brand
      } else {
        state.items.unshift(brand)
        state.total += 1
      }
    },
    updateBrand(state, action: PayloadAction<{ brand: Brand; previousSlug?: string }>) {
      const { brand, previousSlug } = action.payload
      const slugToMatch = previousSlug ?? brand.slug
      let targetIndex = findBrandIndex(state.items, slugToMatch)

      if (targetIndex === -1) {
        targetIndex = findBrandIndex(state.items, brand.slug)
      }

      if (targetIndex !== -1) {
        state.items[targetIndex] = brand
      } else {
        state.items.unshift(brand)
        state.total += 1
        targetIndex = 0
      }

      if (previousSlug && previousSlug !== brand.slug) {
        for (let index = state.items.length - 1; index >= 0; index -= 1) {
          if (index !== targetIndex && state.items[index]?.slug === brand.slug) {
            state.items.splice(index, 1)
            state.total = Math.max(0, state.total - 1)
          }
        }
      }
    },
    removeBrand(state, action: PayloadAction<string>) {
      const slug = action.payload
      const index = findBrandIndex(state.items, slug)

      if (index !== -1) {
        state.items.splice(index, 1)
        state.total = Math.max(0, state.total - 1)
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(brandsApi.endpoints.fetchBrands.matchPending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addMatcher(brandsApi.endpoints.fetchBrands.matchFulfilled, (state, action) => {
        const response = action.payload
        state.items = Array.isArray(response.data) ? response.data : []
        state.total = typeof response.total === 'number' ? response.total : response.count ?? 0
        state.page = typeof response.page === 'number' ? response.page : 1
        state.limit = typeof response.limit === 'number' ? response.limit : state.limit
        state.status = 'succeeded'
        state.error = null
      })
      .addMatcher(brandsApi.endpoints.fetchBrands.matchRejected, (state, action) => {
        state.status = 'failed'
        state.error = resolveBrandErrorMessage(action.payload ?? action.error, 'Failed to fetch brands')
      })
  },
})

export const { addBrand, updateBrand, removeBrand } = brandsSlice.actions

export const {
  useFetchBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
} = brandsApi
export const usePrefetchBrands = () => brandsApi.usePrefetch('fetchBrands')

export default brandsSlice.reducer
