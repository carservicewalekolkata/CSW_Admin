import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { APIEndpoint } from '@/APIEndpoints'
import type { ServiceCategoryQuery, ServiceCategoryResponse } from '@/types/serviceCategories'

const baseUrl = APIEndpoint.BackendUrl
const serviceCategoriesPath = APIEndpoint.services.servicesCategory

export const serviceCategoriesApi = createApi({
  reducerPath: 'serviceCategoriesApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json')
      return headers
    },
  }),
  tagTypes: ['ServiceCategories'],
  endpoints: (builder) => ({
    /**
     * GET /services/service-category
     */
    fetchServiceCategories: builder.query<ServiceCategoryResponse, ServiceCategoryQuery | void>({
      query: (query) => {
        const params = new URLSearchParams()

        if (query?.search) params.set('search', query.search)
        if (query?.sortUpdated) params.set('sortUpdated', query.sortUpdated)
        if (query?.page) params.set('page', String(query.page))
        if (query?.limit) params.set('limit', String(query.limit))

        return {
          url: `${serviceCategoriesPath}?${params.toString()}`,
          method: 'GET',
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: 'ServiceCategories' as const,
                id,
              })),
              { type: 'ServiceCategories', id: 'LIST' },
            ]
          : [{ type: 'ServiceCategories', id: 'LIST' }],
    }),

    /**
     * DELETE /services/service-category
     */
    deleteServiceCategory: builder.mutation<void, number>({
      query: (id) => ({
        url: `${serviceCategoriesPath}`,
        method: 'DELETE',
        body: { id },
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'ServiceCategories', id },
        { type: 'ServiceCategories', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useFetchServiceCategoriesQuery,
  useLazyFetchServiceCategoriesQuery,
  useDeleteServiceCategoryMutation,
} = serviceCategoriesApi
