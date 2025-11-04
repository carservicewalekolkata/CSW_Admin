import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { APIEndpoint } from '@/APIEndpoints'
import type {
  CreateServiceRequest,
  ServiceMutationResponse,
  ServiceQuery,
  ServiceResponse,
  UpdateServiceRequest,
} from '@/types/services'

const servicesPath = APIEndpoint.services.servicesDetails

export const servicesApi = createApi({
  reducerPath: 'servicesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: APIEndpoint.BackendUrl,
  }),
  endpoints: (builder) => ({
    fetchServices: builder.query<ServiceResponse, ServiceQuery | void>({
      query: (query) => {
        const params = new URLSearchParams()

        if (query?.search) params.set('search', query.search)
        if (query?.category) params.set('category', query.category)
        if (query?.status) params.set('status', query.status)
        if (query?.sortUpdated) params.set('sortUpdated', query.sortUpdated)
        if (typeof query?.page === 'number') params.set('page', String(query.page))
        if (typeof query?.limit === 'number') params.set('limit', String(query.limit))

        return {
          url: servicesPath,
          method: 'GET',
          params,
        }
      },
    }),

    createService: builder.mutation<ServiceMutationResponse, CreateServiceRequest>({
      query: (body) => ({
        url: servicesPath,
        method: 'POST',
        body,
      }),
    }),

    updateService: builder.mutation<ServiceMutationResponse, UpdateServiceRequest>({
      query: ({ id, ...body }) => ({
        url: servicesPath,
        method: 'PATCH',
        body: { id, ...body },
      }),
    }),

    deleteService: builder.mutation<void, string>({
      query: (id) => ({
        url: servicesPath,
        method: 'DELETE',
        body: { id },
      }),
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
