export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export interface UIState {
  theme: "light" | "dark";
  toasts: ToastMessage[];
  activeModal: string | null;
}
