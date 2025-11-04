import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { APIEndpoint } from '@/APIEndpoints'
import type {
  CreateModelRequest,
  ModelMutationResponse,
  ModelQuery,
  ModelResponse,
  UpdateModelRequest,
} from '@/types/models'

const baseUrl = APIEndpoint.BackendUrl
const modelsPath = APIEndpoint.cars.models

export const modelsApi = createApi({
  reducerPath: 'modelsApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json')
      return headers
    },
  }),
  endpoints: (builder) => ({
    /**
     * GET /cars/models
     */
    fetchModels: builder.query<ModelResponse, ModelQuery | void>({
      query: (query) => {
        const params = new URLSearchParams()

        if (query?.search) params.set('search', query.search)
        if (query?.slug) params.set('slug', query.slug)
        if (query?.brand) params.set('brand', query.brand)
        if (query?.bodyType) params.set('bodyType', query.bodyType)
        if (query?.fuel) params.set('fuel', query.fuel)
        if (query?.sortStatus) params.set('sortStatus', query.sortStatus)
        if (query?.sortUpdated) params.set('sortUpdated', query.sortUpdated)
        if (query?.page) params.set('page', String(query.page))
        if (query?.limit) params.set('limit', String(query.limit))

        return {
          url: `${modelsPath}?${params.toString()}`,
          method: 'GET',
        }
      },
    }),

    /**
     * DELETE /cars/models
     */
    deleteModel: builder.mutation<void, string>({
      query: (slug) => ({
        url: `${modelsPath}`,
        method: 'DELETE',
        body: { slug },
      }),
    }),

    /**
     * POST /cars/models
     */
    createModel: builder.mutation<ModelMutationResponse, CreateModelRequest>({
      query: (body) => ({
        url: `${modelsPath}`,
        method: 'POST',
        body,
      }),
    }),

    /**
     * PATCH /cars/models
     */
    updateModel: builder.mutation<ModelMutationResponse, UpdateModelRequest>({
      query: ({ slug, ...body }) => ({
        url: `${modelsPath}`,
        method: 'PATCH',
        body: { slug, ...body },
      }),
    }),
  }),
})

export const {
  useFetchModelsQuery,
  useDeleteModelMutation,
  useCreateModelMutation,
  useUpdateModelMutation,
} = modelsApi
