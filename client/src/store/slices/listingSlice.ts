import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  createListing as apiCreateListing,
  deleteListing as apiDeleteListing,
  fetchListing,
  fetchRelatedListings as apiFetchRelatedListings,
  listListings,
  listMyListings,
  updateListing as apiUpdateListing,
} from '@/services/listing';
import type {
  CreateListingInput,
  ListListingsQuery,
  PaginatedListings,
  SafeListing,
  UpdateListingInput,
} from '@/types/listing';

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface ListingCollection extends PaginatedListings {
  status: RequestStatus;
}

interface ListingState {
  browse: ListingCollection;
  detail: { listing: SafeListing | null; status: RequestStatus };
  related: { items: SafeListing[]; status: RequestStatus };
  mine: ListingCollection;
}

const emptyCollection: ListingCollection = {
  items: [],
  page: 1,
  limit: 12,
  total: 0,
  pages: 0,
  status: 'idle',
};

const initialState: ListingState = {
  browse: emptyCollection,
  detail: { listing: null, status: 'idle' },
  related: { items: [], status: 'idle' },
  mine: emptyCollection,
};

function toCollection(payload: PaginatedListings): ListingCollection {
  return { ...payload, status: 'succeeded' };
}

export const fetchBrowseListings = createAsyncThunk(
  'listings/browse',
  async (query: ListListingsQuery) => listListings(query),
);

export const fetchListingDetail = createAsyncThunk('listings/detail', async (id: string) =>
  fetchListing(id),
);

export const fetchRelatedListings = createAsyncThunk(
  'listings/related',
  async ({ id, limit = 4 }: { id: string; limit?: number }) => apiFetchRelatedListings(id, limit),
);

export const fetchMyListings = createAsyncThunk('listings/mine', async (query: ListListingsQuery) =>
  listMyListings(query),
);

export const createListing = createAsyncThunk(
  'listings/create',
  async (input: CreateListingInput) => apiCreateListing(input),
);

export const updateListing = createAsyncThunk(
  'listings/update',
  async ({ id, input }: { id: string; input: UpdateListingInput }) => apiUpdateListing(id, input),
);

export const deleteListing = createAsyncThunk('listings/delete', async (id: string) => {
  await apiDeleteListing(id);
  return id;
});

const listingSlice = createSlice({
  name: 'listings',
  initialState,
  reducers: {
    clearDetail(state) {
      state.detail.listing = null;
      state.detail.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrowseListings.pending, (state) => {
        state.browse.status = 'loading';
      })
      .addCase(fetchBrowseListings.fulfilled, (state, action: PayloadAction<PaginatedListings>) => {
        state.browse = toCollection(action.payload);
      })
      .addCase(fetchBrowseListings.rejected, (state) => {
        state.browse.status = 'failed';
      })
      .addCase(fetchListingDetail.pending, (state) => {
        state.detail.status = 'loading';
        state.related = { items: [], status: 'idle' };
      })
      .addCase(fetchListingDetail.fulfilled, (state, action: PayloadAction<SafeListing>) => {
        state.detail.listing = action.payload;
        state.detail.status = 'succeeded';
      })
      .addCase(fetchListingDetail.rejected, (state) => {
        state.detail.status = 'failed';
      })
      .addCase(fetchRelatedListings.pending, (state) => {
        state.related.status = 'loading';
      })
      .addCase(fetchRelatedListings.fulfilled, (state, action: PayloadAction<SafeListing[]>) => {
        state.related.items = action.payload;
        state.related.status = 'succeeded';
      })
      .addCase(fetchRelatedListings.rejected, (state) => {
        state.related.status = 'failed';
      })
      .addCase(fetchMyListings.pending, (state) => {
        state.mine.status = 'loading';
      })
      .addCase(fetchMyListings.fulfilled, (state, action: PayloadAction<PaginatedListings>) => {
        state.mine = toCollection(action.payload);
      })
      .addCase(fetchMyListings.rejected, (state) => {
        state.mine.status = 'failed';
      })
      .addCase(createListing.fulfilled, (state, action: PayloadAction<SafeListing>) => {
        state.mine.items = [action.payload, ...state.mine.items];
        state.mine.total += 1;
      })
      .addCase(updateListing.fulfilled, (state, action: PayloadAction<SafeListing>) => {
        const updated = action.payload;
        state.detail.listing = updated;
        state.mine.items = state.mine.items.map((item) =>
          item._id === updated._id ? updated : item,
        );
        state.browse.items = state.browse.items.map((item) =>
          item._id === updated._id ? updated : item,
        );
      })
      .addCase(deleteListing.fulfilled, (state, action: PayloadAction<string>) => {
        const id = action.payload;
        state.mine.items = state.mine.items.filter((item) => item._id !== id);
        state.browse.items = state.browse.items.filter((item) => item._id !== id);
        state.mine.total = Math.max(0, state.mine.total - 1);
        if (state.detail.listing?._id === id) {
          state.detail.listing = null;
          state.detail.status = 'idle';
        }
      });
  },
});

export const { clearDetail } = listingSlice.actions;
export default listingSlice.reducer;
