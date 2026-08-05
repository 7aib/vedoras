import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/store/slices/notificationSlice';
import { EmptyState } from '@/components/listings/EmptyState';
import { Pagination } from '@/components/listings/Pagination';
import { cn } from '@/utils/cn';
import type { SafeNotification } from '@/types/notification';

const LIMIT = 12;

function TypeIcon({ type }: { type: SafeNotification['type'] }) {
  const common = { className: 'size-5' };
  switch (type) {
    case 'message':
      return (
        <svg {...common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.97-4.03 9-9 9a9.6 9.6 0 0 1-4.2-.93L3 21l1.05-3.48A8.97 8.97 0 0 1 3 12c0-4.97 4.03-9 9-9s9 4.03 9 9Z"
          />
        </svg>
      );
    case 'listing_sold':
      return (
        <svg {...common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
        </svg>
      );
    case 'listing_removed':
      return (
        <svg {...common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 3h6M10 3v.3M14 3v.3M4 7h16M6 7l1 13a2 2 0 0 0 2 1.8h6A2 2 0 0 0 17 20l1-13"
          />
        </svg>
      );
    default:
      return (
        <svg {...common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V4a2 2 0 1 0-4 0v1.3A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
          />
        </svg>
      );
  }
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function NotificationsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, pages, status, unreadCount } = useAppSelector((state) => state.notifications.list);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchNotifications({ page, limit: LIMIT }));
  }, [dispatch, page]);

  const isLoading = status === 'idle' || status === 'loading';

  const openNotification = (notification: SafeNotification) => {
    if (!notification.read) {
      dispatch(markNotificationRead(notification._id));
    }
    if (notification.data.conversationId) {
      navigate(`/chat/${notification.data.conversationId}`);
    } else if (notification.data.listingId) {
      navigate(`/listings/${notification.data.listingId}`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {unreadCount > 0
              ? `${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}`
              : 'You are all caught up.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => dispatch(markAllNotificationsRead())}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No notifications yet"
            description="You will see updates about your conversations and listings here."
            action={
              <Link
                to="/listings"
                className="inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Browse listings
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {items.map((notification) => (
            <li key={notification._id}>
              <button
                type="button"
                onClick={() => openNotification(notification)}
                className={cn(
                  'flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60',
                  !notification.read && 'bg-brand-50/60 dark:bg-brand-950/30',
                )}
              >
                <span
                  className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-full text-lg',
                    notification.read
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'bg-brand-100 dark:bg-brand-900',
                  )}
                >
                  <TypeIcon type={notification.type} />
                </span>{' '}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span
                      className={cn(
                        'truncate text-sm font-semibold',
                        notification.read
                          ? 'text-gray-600 dark:text-gray-400'
                          : 'text-gray-900 dark:text-white',
                      )}
                    >
                      {notification.title}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                      {formatTime(notification.createdAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">
                    {notification.body}
                  </span>
                </span>
                {!notification.read && (
                  <span className="size-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        <Pagination page={page} pages={pages} onPageChange={setPage} />
      </div>
    </div>
  );
}
