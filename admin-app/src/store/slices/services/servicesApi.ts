import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { APIEndpoint } from '@/APIEndpoints'
import type {
  CreateServiceRequest,
  ServiceMutationResponse,
  ServiceQuery,
  ServiceResponse,
  UpdateServiceRequest,
} from '@/types/services'

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
  keepUnusedDataFor: 5 * 60,
  refetchOnFocus: false,
  refetchOnReconnect: false,
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

    /**
     * POST /services/details
     */
    createService: builder.mutation<ServiceMutationResponse, CreateServiceRequest>({
      query: (body) => ({
        url: `${servicesPath}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Services', id: 'LIST' }],
    }),

    /**
     * PATCH /services/details
     */
    updateService: builder.mutation<ServiceMutationResponse, UpdateServiceRequest>({
      query: ({ id, ...body }) => ({
        url: `${servicesPath}`,
        method: 'PATCH',
        body: { id, ...body },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Services', id },
        { type: 'Services', id: 'LIST' },
      ],
    }),

    /**
     * DELETE /services/details
     */
    deleteService: builder.mutation<void, string>({
      query: (id) => ({
        url: `${servicesPath}`,
        method: 'DELETE',
        body: { id },
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Services', id },
        { type: 'Services', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useFetchServicesQuery,
  useLazyFetchServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
} = servicesApi
