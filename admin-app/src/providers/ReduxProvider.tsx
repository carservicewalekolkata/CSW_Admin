"use client";

import { ReactNode, useRef } from "react";
import { Provider } from "react-redux";
import type { Persistor } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";

import { AppStore, makeStore } from "@/store";
import { createPersistor } from "@/store/persist";

type ReduxProviderProps = {
  children: ReactNode;
};

export const ReduxProvider = ({ children }: ReduxProviderProps) => {
  const storeRef = useRef<AppStore | undefined>(undefined);
  const persistorRef = useRef<Persistor | undefined>(undefined);

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  if (typeof window !== "undefined" && !persistorRef.current) {
    persistorRef.current = createPersistor(storeRef.current);
  }

  return (
    <Provider store={storeRef.current}>
      {persistorRef.current ? (
        <PersistGate loading={null} persistor={persistorRef.current}>
          {children}
        </PersistGate>
      ) : null}
    </Provider>
  );
};
