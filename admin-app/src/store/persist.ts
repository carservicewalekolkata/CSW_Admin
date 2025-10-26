import type { Store } from "@reduxjs/toolkit";
import { persistStore } from "redux-persist";
import type { PersistConfig, Persistor } from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";

import type { AuthState } from '@/types/auth'
import type { SidebarState } from '@/types/sidebar'

const createNoopStorage = () => {
  return {
    getItem(key: string) {
      void key;
      return Promise.resolve(null);
    },
    setItem(key: string, value: string) {
      void key;
      return Promise.resolve(value);
    },
    removeItem(key: string) {
      void key;
      return Promise.resolve();
    },
  };
};

export const storage =
  typeof window === "undefined" ? createNoopStorage() : createWebStorage("local");

export const rootPersistConfig: PersistConfig<unknown> = {
  key: "root",
  storage,
  version: 1,
  whitelist: ["auth", "sidebar"],
};

export const authPersistConfig: PersistConfig<AuthState> = {
  key: "auth",
  storage,
  whitelist: ["accessToken", "rememberMe", "user"],
};

export const sidebarPersistConfig: PersistConfig<SidebarState> = {
  key: 'sidebar',
  storage,
  whitelist: ['isSecondaryOpen'],
  blacklist: ['viewport'],
}

export const createPersistor = (store: Store): Persistor => persistStore(store);
