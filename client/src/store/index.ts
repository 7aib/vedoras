import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';
import listingReducer from './slices/listingSlice';
import categoryReducer from './slices/categorySlice';
import favoriteReducer from './slices/favoriteSlice';
import chatReducer from './slices/chatSlice';

/**
 * Global Redux store.
 * RTK Query API slices are mounted here in the listing milestones.
 */
export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    listings: listingReducer,
    categories: categoryReducer,
    favorites: favoriteReducer,
    chat: chatReducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
