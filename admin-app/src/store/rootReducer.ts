import { combineReducers } from '@reduxjs/toolkit'
import type { PersistConfig } from 'redux-persist'
import { persistReducer } from 'redux-persist'

import type { AuthState } from '@/types/auth'
import {
  authReducer,
  brandsReducer,
  modelsReducer,
  serviceCategoriesReducer,
  servicesReducer,
  uiReducer,
  sidebarReducer,
  authApi,
  brandsApi,
  modelsApi,
  serviceCategoriesApi,
  servicesApi,
} from './slices'

import { authPersistConfig, rootPersistConfig, sidebarPersistConfig } from './persist'

const combinedReducer = combineReducers({
  auth: persistReducer<AuthState>(authPersistConfig, authReducer),
  brands: brandsReducer,
  models: modelsReducer,
  services: servicesReducer,
  serviceCategories: serviceCategoriesReducer,
  ui: uiReducer,
  sidebar: persistReducer(sidebarPersistConfig, sidebarReducer),

  // ✅ Add RTK Query API reducers
  [authApi.reducerPath]: authApi.reducer,
  [brandsApi.reducerPath]: brandsApi.reducer,
  [modelsApi.reducerPath]: modelsApi.reducer,
  [serviceCategoriesApi.reducerPath]: serviceCategoriesApi.reducer,
  [servicesApi.reducerPath]: servicesApi.reducer,
})

export const rootReducer = combinedReducer
export type RootState = ReturnType<typeof combinedReducer>

const typedRootPersistConfig = rootPersistConfig as PersistConfig<RootState>

export const persistedReducer = persistReducer<RootState>(
  typedRootPersistConfig,
  combinedReducer,
)
