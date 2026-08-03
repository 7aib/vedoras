import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'vedoras_theme';

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface UiState {
  theme: Theme;
  sidebarOpen: boolean;
}

const initialState: UiState = {
  theme: getInitialTheme(),
  sidebarOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { setTheme, toggleTheme, setSidebarOpen } = uiSlice.actions;
export default uiSlice.reducer;
