import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import { APIEndpoint } from '@/APIEndpoints'
import type {
  BrandMutationResponse,
  BrandQuery,
  BrandResponse,
  CreateBrandRequest,
  UpdateBrandRequest,
} from '@/types/brands'

const brandsPath = APIEndpoint.cars.brands

export const brandsApi = createApi({
  reducerPath: 'brandsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: APIEndpoint.BackendUrl,
    // credentials: 'include',
    // prepareHeaders: (headers) => {
    //   headers.set('Accept', 'application/json')
    //   headers.set('Content-Type', 'application/json')
    //   return headers
    // },
  }),
  endpoints: (builder) => ({
    fetchBrands: builder.query<BrandResponse, BrandQuery | void>({
      query: (query) => {
        const params = new URLSearchParams()

        if (query?.search) params.set('search', query.search)
        if (query?.slug) params.set('slug', query.slug)
        if (query?.sortStatus) params.set('sortStatus', query.sortStatus)
        if (query?.sortUpdated) params.set('sortUpdated', query.sortUpdated)
        if (typeof query?.page === 'number') params.set('page', String(query.page))
        if (typeof query?.limit === 'number') params.set('limit', String(query.limit))

        return {
          url: brandsPath,
          method: 'GET',
          params,
        }
      },
    }),
    createBrand: builder.mutation<BrandMutationResponse, CreateBrandRequest>({
      query: (body) => ({
        url: brandsPath,
        method: 'POST',
        body,
      }),
    }),
    updateBrand: builder.mutation<BrandMutationResponse, UpdateBrandRequest>({
      query: (body) => ({
        url: brandsPath,
        method: 'PATCH',
        body,
      }),
    }),
    deleteBrand: builder.mutation<BrandMutationResponse, string>({
      query: (slug) => ({
        url: brandsPath,
        method: 'DELETE',
        body: { slug },
      }),
    }),
  }),
})

export const {
  useFetchBrandsQuery,
  useLazyFetchBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
} = brandsApi
