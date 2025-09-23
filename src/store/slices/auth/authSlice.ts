import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { AuthState, AuthUser } from "@/types/auth";

export const createPasswordResetState = () => ({
  status: "idle" as const,
  message: null as string | null,
});

const initialState: AuthState = {
  user: null,
  accessToken: null,
  rememberMe: true,
  status: "idle",
  error: null,
  passwordReset: createPasswordResetState(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginRequested(state, action: PayloadAction<{ email: string }>) {
      state.status = "loading";
      state.error = null;
      state.user = state.user ?? { id: "", email: action.payload.email, roles: [] };
    },
    loginSucceeded(state, action: PayloadAction<{ user: AuthUser; token: string }>) {
      state.status = "authenticated";
      state.user = action.payload.user;
      state.accessToken = action.payload.token;
      state.error = null;
    },
    loginFailed(state, action: PayloadAction<string>) {
      state.status = "error";
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.status = "idle";
      state.error = null;
      state.passwordReset = createPasswordResetState();
    },
    setRememberMe(state, action: PayloadAction<boolean>) {
      state.rememberMe = action.payload;
    },
    passwordResetRequested(state) {
      state.passwordReset = { status: "loading", message: null };
    },
    passwordResetSucceeded(state, action: PayloadAction<string | undefined>) {
      state.passwordReset = {
        status: "success",
        message: action.payload ?? "If the account exists, a reset link has been sent.",
      };
    },
    passwordResetFailed(state, action: PayloadAction<string>) {
      state.passwordReset = { status: "error", message: action.payload };
    },
    updateUserProfile(state, action: PayloadAction<Partial<AuthUser>>) {
      if (!state.user) return;
      state.user = { ...state.user, ...action.payload };
    },
    resetAuthState() {
      return initialState;
    },
  },
});

export const {
  loginRequested,
  loginSucceeded,
  loginFailed,
  logout,
  setRememberMe,
  passwordResetRequested,
  passwordResetSucceeded,
  passwordResetFailed,
  updateUserProfile,
  resetAuthState,
} = authSlice.actions;

export const authReducer = authSlice.reducer;
