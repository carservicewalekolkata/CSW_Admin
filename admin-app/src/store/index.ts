import { configureStore } from '@reduxjs/toolkit'
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist'

import { persistedReducer } from './rootReducer'
import {
  authApi,
  brandsApi,
  modelsApi,
  serviceCategoriesApi,
  servicesApi,
} from './slices'

export type { RootState } from './rootReducer'

export const makeStore = () =>
  configureStore({
    reducer: persistedReducer,
    devTools: process.env.NODE_ENV !== 'production',
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).concat(
        authApi.middleware,
        brandsApi.middleware,
        modelsApi.middleware,
        serviceCategoriesApi.middleware,
        servicesApi.middleware,
      ),
  })

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
