import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import type { ToastMessage, UIState } from "@/types/ui";

const initialState: UIState = {
  theme: "light",
  toasts: [],
  activeModal: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<UIState["theme"]>) {
      state.theme = action.payload;
    },
    showModal(state, action: PayloadAction<string | null>) {
      state.activeModal = action.payload;
    },
    enqueueToast(state, action: PayloadAction<Omit<ToastMessage, "id">>) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      state.toasts.push({ id, ...action.payload });
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    clearToasts(state) {
      state.toasts = [];
    },
  },
});

export const { setTheme, showModal, enqueueToast, removeToast, clearToasts } = uiSlice.actions;

export default uiSlice.reducer;
