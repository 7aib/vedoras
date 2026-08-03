import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';

/**
 * Global Redux store.
 * RTK Query API slices are mounted here in the listing milestones.
 */
export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
