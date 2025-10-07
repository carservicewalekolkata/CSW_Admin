import { combineReducers } from "@reduxjs/toolkit";
import type { PersistConfig } from "redux-persist";
import { persistReducer } from "redux-persist";

import type { AuthState } from "@/types/auth";

import { authPersistConfig, rootPersistConfig } from "./persist";
import { authReducer, uiReducer } from "./slices";

const combinedReducer = combineReducers({
  auth: persistReducer<AuthState>(authPersistConfig, authReducer),
  ui: uiReducer,
});

export const rootReducer = combinedReducer;

export type RootState = ReturnType<typeof combinedReducer>;

const typedRootPersistConfig = rootPersistConfig as PersistConfig<RootState>;

export const persistedReducer = persistReducer<RootState>(
  typedRootPersistConfig,
  combinedReducer,
);
