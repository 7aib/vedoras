import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  deleteAdminListing as apiDeleteAdminListing,
  fetchAdminStats as apiFetchAdminStats,
  listAdminListings as apiListAdminListings,
  listAdminUsers as apiListAdminUsers,
  updateListingStatus as apiUpdateListingStatus,
  updateUserRole as apiUpdateUserRole,
} from '@/services/admin';
import type {
  AdminListingStatus,
  AdminPaginatedListings,
  AdminStats,
  PaginatedAdminUsers,
} from '@/types/admin';
import type { SafeUser } from '@/types/auth';
import type { SafeListing } from '@/types/listing';

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface AdminState {
  stats: { data: AdminStats | null; status: RequestStatus };
  users: PaginatedAdminUsers & { status: RequestStatus };
  listings: AdminPaginatedListings & { status: RequestStatus };
}

const initialUsers: PaginatedAdminUsers & { status: RequestStatus } = {
  items: [],
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,
  status: 'idle',
};

const initialListings: AdminPaginatedListings & { status: RequestStatus } = {
  items: [],
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,
  status: 'idle',
};

const initialState: AdminState = {
  stats: { data: null, status: 'idle' },
  users: initialUsers,
  listings: initialListings,
};

export const fetchAdminStats = createAsyncThunk('admin/stats', async () => apiFetchAdminStats());

export const fetchAdminUsers = createAsyncThunk(
  'admin/users/list',
  async (query: { page?: number; limit?: number; q?: string; role?: 'user' | 'admin' } = {}) =>
    apiListAdminUsers(query),
);

export const setUserRole = createAsyncThunk(
  'admin/users/role',
  async ({ id, role }: { id: string; role: 'user' | 'admin' }) => apiUpdateUserRole(id, role),
);

export const fetchAdminListings = createAsyncThunk(
  'admin/listings/list',
  async (query: { page?: number; limit?: number; q?: string; status?: AdminListingStatus } = {}) =>
    apiListAdminListings(query),
);

export const setListingStatus = createAsyncThunk(
  'admin/listings/status',
  async ({ id, status }: { id: string; status: AdminListingStatus }) =>
    apiUpdateListingStatus(id, status),
);

export const removeAdminListing = createAsyncThunk('admin/listings/delete', async (id: string) => {
  await apiDeleteAdminListing(id);
  return id;
});

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminStats.pending, (state) => {
        state.stats.status = 'loading';
      })
      .addCase(fetchAdminStats.fulfilled, (state, action: PayloadAction<AdminStats>) => {
        state.stats = { data: action.payload, status: 'succeeded' };
      })
      .addCase(fetchAdminStats.rejected, (state) => {
        state.stats.status = 'failed';
      })
      .addCase(fetchAdminUsers.pending, (state) => {
        state.users.status = 'loading';
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action: PayloadAction<PaginatedAdminUsers>) => {
        state.users = { ...action.payload, status: 'succeeded' };
      })
      .addCase(fetchAdminUsers.rejected, (state) => {
        state.users.status = 'failed';
      })
      .addCase(
        setUserRole.fulfilled,
        (state, action: PayloadAction<{ _id: string; role: 'user' | 'admin' }>) => {
          state.users.items = state.users.items.map((user: SafeUser) =>
            user._id === action.payload._id ? { ...user, role: action.payload.role } : user,
          );
        },
      )
      .addCase(fetchAdminListings.pending, (state) => {
        state.listings.status = 'loading';
      })
      .addCase(
        fetchAdminListings.fulfilled,
        (state, action: PayloadAction<AdminPaginatedListings>) => {
          state.listings = { ...action.payload, status: 'succeeded' };
        },
      )
      .addCase(fetchAdminListings.rejected, (state) => {
        state.listings.status = 'failed';
      })
      .addCase(setListingStatus.fulfilled, (state, action: PayloadAction<SafeListing>) => {
        state.listings.items = state.listings.items.map((listing: SafeListing) =>
          listing._id === action.payload._id ? action.payload : listing,
        );
      })
      .addCase(removeAdminListing.fulfilled, (state, action: PayloadAction<string>) => {
        state.listings.items = state.listings.items.filter(
          (listing: SafeListing) => listing._id !== action.payload,
        );
        state.listings.total = Math.max(0, state.listings.total - 1);
      });
  },
});

export default adminSlice.reducer;
