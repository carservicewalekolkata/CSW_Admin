import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { SidebarState } from '@/types/sidebar'

const initialState: SidebarState = {
  isSecondaryOpen: false,
  viewport: 'small',
}

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.isSecondaryOpen = action.payload
    },
    toggleSidebar(state) {
      state.isSecondaryOpen = !state.isSecondaryOpen
    },
    setViewport(state, action: PayloadAction<SidebarState['viewport']>) {
      state.viewport = action.payload
    },
  },
})

export const { setSidebarOpen, toggleSidebar, setViewport } = sidebarSlice.actions

export default sidebarSlice.reducer
