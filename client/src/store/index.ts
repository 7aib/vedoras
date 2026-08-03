import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';

/**
 * Global Redux store.
 * RTK Query API slices are mounted here in the auth/listing milestones.
 */
export const store = configureStore({
  reducer: {
    ui: uiReducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
