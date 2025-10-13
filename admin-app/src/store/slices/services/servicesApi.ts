import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { APIEndpoint } from '@/APIEndpoints'
import type { ServiceQuery, ServiceResponse } from '@/types/services'

const baseUrl = APIEndpoint.BackendUrl
const servicesPath = APIEndpoint.services.servicesDetails

export const servicesApi = createApi({
  reducerPath: 'servicesApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json')
      return headers
    },
  }),
  tagTypes: ['Services'],
  endpoints: (builder) => ({
    /**
     * GET /services/details
     */
    fetchServices: builder.query<ServiceResponse, ServiceQuery | void>({
      query: (query) => {
        const params = new URLSearchParams()

        if (query?.search) params.set('search', query.search)
        if (query?.category) params.set('category', query.category)
        if (query?.status) params.set('status', query.status)
        if (query?.sortUpdated) params.set('sortUpdated', query.sortUpdated)
        if (query?.page) params.set('page', String(query.page))
        if (query?.limit) params.set('limit', String(query.limit))

        return {
          url: `${servicesPath}?${params.toString()}`,
          method: 'GET',
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Services' as const, id })),
              { type: 'Services', id: 'LIST' },
            ]
          : [{ type: 'Services', id: 'LIST' }],
    }),
  }),
})

export const {
  useFetchServicesQuery,
  useLazyFetchServicesQuery,
} = servicesApi
