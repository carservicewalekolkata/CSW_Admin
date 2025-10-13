import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { APIEndpoint } from '@/APIEndpoints'
import type { BrandQuery, BrandResponse } from '@/types/brands'

const baseUrl = APIEndpoint.BackendUrl
const brandsPath = APIEndpoint.cars.brands

export const brandsApi = createApi({
  reducerPath: 'brandsApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json')
      return headers
    },
  }),
  tagTypes: ['Brands'],
  endpoints: (builder) => ({
    /**
     * GET /cars/brands
     */
    fetchBrands: builder.query<BrandResponse, BrandQuery | void>({
      query: (query) => {
        const params = new URLSearchParams()

        if (query?.search) params.set('search', query.search)
        if (query?.slug) params.set('slug', query.slug)
        if (query?.sortStatus) params.set('sortStatus', query.sortStatus)
        if (query?.sortUpdated) params.set('sortUpdated', query.sortUpdated)
        if (query?.page) params.set('page', String(query.page))
        if (query?.limit) params.set('limit', String(query.limit))

        return {
          url: `${brandsPath}?${params.toString()}`,
          method: 'GET',
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ slug }) => ({ type: 'Brands' as const, id: slug })),
              { type: 'Brands', id: 'LIST' },
            ]
          : [{ type: 'Brands', id: 'LIST' }],
    }),

    /**
     * DELETE /cars/brands
     */
    deleteBrand: builder.mutation<void, string>({
      query: (slug) => ({
        url: `${brandsPath}`,
        method: 'DELETE',
        body: { slug },
      }),
      invalidatesTags: (_result, _error, slug) => [
        { type: 'Brands', id: slug },
        { type: 'Brands', id: 'LIST' },
      ],
    }),
  }),
})

