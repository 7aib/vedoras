import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  listNotifications as apiListNotifications,
  markAllNotificationsRead as apiMarkAllNotificationsRead,
  markNotificationRead as apiMarkNotificationRead,
} from '@/services/notification';
import type { PaginatedNotifications, SafeNotification } from '@/types/notification';

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface NotificationCollection extends PaginatedNotifications {
  status: RequestStatus;
}

interface NotificationState {
  list: NotificationCollection;
  /** Total unread notifications (any page), drives the navbar badge. */
  unreadCount: number;
}

const emptyList: NotificationCollection = {
  items: [],
  page: 1,
  limit: 12,
  total: 0,
  pages: 0,
  unreadCount: 0,
  status: 'idle',
};

const initialState: NotificationState = {
  list: emptyList,
  unreadCount: 0,
};

export const fetchNotifications = createAsyncThunk(
  'notifications/list',
  async (query: { page?: number; limit?: number } = {}) => apiListNotifications(query),
);

export const markNotificationRead = createAsyncThunk('notifications/markRead', async (id: string) =>
  apiMarkNotificationRead(id),
);

export const markAllNotificationsRead = createAsyncThunk('notifications/markAllRead', async () =>
  apiMarkAllNotificationsRead(),
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    socketNotificationReceived(state, action: PayloadAction<SafeNotification>) {
      const notification = action.payload;
      if (!state.list.items.some((item) => item._id === notification._id)) {
        state.list.items.unshift(notification);
        state.list.total += 1;
        state.list.pages = Math.max(1, state.list.pages);
      }
      state.unreadCount += 1;
    },
    resetNotifications() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.list.status = 'loading';
      })
      .addCase(
        fetchNotifications.fulfilled,
        (state, action: PayloadAction<PaginatedNotifications>) => {
          state.list = { ...action.payload, status: 'succeeded' };
          state.unreadCount = action.payload.unreadCount;
        },
      )
      .addCase(fetchNotifications.rejected, (state) => {
        state.list.status = 'failed';
      })
      .addCase(markNotificationRead.fulfilled, (state, action: PayloadAction<SafeNotification>) => {
        state.list.items = state.list.items.map((item) =>
          item._id === action.payload._id ? action.payload : item,
        );
        if (!action.payload.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.list.items = state.list.items.map((item) => ({ ...item, read: true }));
        state.unreadCount = 0;
      });
  },
});

export const { socketNotificationReceived, resetNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
