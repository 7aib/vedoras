import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  addFavorite as apiAddFavorite,
  listFavorites as apiListFavorites,
} from '@/services/favorite';
import type { FavoriteToggleResult, PaginatedListings } from '@/types/listing';

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface FavoritesCollection extends PaginatedListings {
  status: RequestStatus;
}

interface FavoriteState {
  list: FavoritesCollection;
  /** Listing ids with an in-flight toggle (disables their heart button). */
  pendingIds: string[];
}

const emptyCollection: FavoritesCollection = {
  items: [],
  page: 1,
  limit: 12,
  total: 0,
  pages: 0,
  status: 'idle',
};

const initialState: FavoriteState = {
  list: emptyCollection,
  pendingIds: [],
};

export const fetchFavorites = createAsyncThunk(
  'favorites/list',
  async (query: { page?: number; limit?: number } = {}) => apiListFavorites(query),
);

/** PUT is a toggle — the server flips the favorite and returns the new state. */
export const toggleFavorite = createAsyncThunk('favorites/toggle', async (listingId: string) =>
  apiAddFavorite(listingId),
);

const favoriteSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    resetFavorites() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavorites.pending, (state) => {
        state.list.status = 'loading';
      })
      .addCase(fetchFavorites.fulfilled, (state, action: PayloadAction<PaginatedListings>) => {
        state.list = { ...action.payload, status: 'succeeded' };
      })
      .addCase(fetchFavorites.rejected, (state) => {
        state.list.status = 'failed';
      })
      .addCase(toggleFavorite.pending, (state, action) => {
        if (!state.pendingIds.includes(action.meta.arg)) {
          state.pendingIds.push(action.meta.arg);
        }
      })
      .addCase(toggleFavorite.fulfilled, (state, action: PayloadAction<FavoriteToggleResult>) => {
        state.pendingIds = state.pendingIds.filter((id) => id !== action.payload.listingId);
        if (!action.payload.isFavorited) {
          state.list.items = state.list.items.filter(
            (item) => item._id !== action.payload.listingId,
          );
          state.list.total = Math.max(0, state.list.total - 1);
        } else {
          state.list.items = state.list.items.map((item) =>
            item._id === action.payload.listingId
              ? { ...item, isFavorited: true, favoriteCount: action.payload.favoriteCount }
              : item,
          );
        }
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        state.pendingIds = state.pendingIds.filter((id) => id !== action.meta.arg);
      });
  },
});

export const { resetFavorites } = favoriteSlice.actions;
export default favoriteSlice.reducer;
