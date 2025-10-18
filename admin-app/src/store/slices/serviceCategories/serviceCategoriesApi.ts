import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import { APIEndpoint } from '@/APIEndpoints'
import type {
  CreateServiceCategoryRequest,
  ServiceCategoryMutationResponse,
  ServiceCategoryQuery,
  ServiceCategoryResponse,
} from '@/types/serviceCategories'

const serviceCategoriesPath = APIEndpoint.services.servicesCategory

export const serviceCategoriesApi = createApi({
  reducerPath: 'serviceCategoriesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: APIEndpoint.BackendUrl,
  }),
  endpoints: (builder) => ({
    fetchServiceCategories: builder.query<ServiceCategoryResponse, ServiceCategoryQuery | void>({
      query: (query) => {
        const params = new URLSearchParams()

        if (query?.search) params.set('search', query.search)
        if (query?.sortUpdated) params.set('sortUpdated', query.sortUpdated)
        if (typeof query?.page === 'number') params.set('page', String(query.page))
        if (typeof query?.limit === 'number') params.set('limit', String(query.limit))

        return {
          url: serviceCategoriesPath,
          method: 'GET',
          params,
        }
      },
    }),

    deleteServiceCategory: builder.mutation<void, number>({
      query: (id) => ({
        url: serviceCategoriesPath,
        method: 'DELETE',
        body: { id },
      }),
    }),

    createServiceCategory: builder.mutation<
      ServiceCategoryMutationResponse,
      CreateServiceCategoryRequest
    >({
      query: (body) => ({
        url: serviceCategoriesPath,
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useFetchServiceCategoriesQuery,
  useLazyFetchServiceCategoriesQuery,
  useDeleteServiceCategoryMutation,
  useCreateServiceCategoryMutation,
} = serviceCategoriesApi
