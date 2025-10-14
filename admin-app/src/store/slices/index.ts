import authReducer from './auth/authSlice'
import { authApi } from './auth/authApi'

import brandsReducer from './brands/brandsSlice'
import { brandsApi } from './brands/brandsApi'

import modelsReducer from './models/modelsSlice'
import { modelsApi } from './models/modelsApi'

import serviceCategoriesReducer from './serviceCategories/serviceCategoriesSlice'
import { serviceCategoriesApi } from './serviceCategories/serviceCategoriesApi'

import servicesReducer from './services/servicesSlice'
import { servicesApi } from './services/servicesApi'

import uiReducer from './uiSlice'

export {
  authReducer,
  brandsReducer,
  modelsReducer,
  serviceCategoriesReducer,
  servicesReducer,
  uiReducer,
  
  authApi,
  brandsApi,
  modelsApi,
  serviceCategoriesApi,
  servicesApi,
}
