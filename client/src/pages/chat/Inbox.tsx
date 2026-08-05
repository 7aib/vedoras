import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchConversations } from '@/store/slices/chatSlice';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/listings/EmptyState';
import { Pagination } from '@/components/listings/Pagination';
import { formatPrice } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { SafeConversation } from '@/types/chat';
import type { SafeUser } from '@/types/auth';

const LIMIT = 12;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function otherParticipant(conversation: SafeConversation, userId: string): SafeUser {
  return (
    conversation.participants.find((participant) => participant._id !== userId) ??
    conversation.participants[0]
  );
}

function formatTime(timestamp: string | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function InboxPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { items, pages, status } = useAppSelector((state) => state.chat.conversations);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchConversations({ page, limit: LIMIT }));
  }, [dispatch, page]);

  const isLoading = status === 'idle' || status === 'loading';
  const totalUnread = items.reduce((sum, conversation) => sum + conversation.unreadCount, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Messages
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {totalUnread > 0
            ? `${totalUnread} unread ${totalUnread === 1 ? 'conversation' : 'conversations'}`
            : 'Stay in touch with buyers and sellers.'}
        </p>
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
            title="No conversations yet"
            description="Contact a seller from any listing to start chatting."
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
          {items.map((conversation) => {
            const peer = otherParticipant(conversation, user?._id ?? '');
            const lastMessage = conversation.lastMessage;
            return (
              <li key={conversation._id}>
                <Link
                  to={`/chat/${conversation._id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                >
                  <span
                    className={cn(
                      'grid size-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white',
                      conversation.unreadCount > 0
                        ? 'bg-brand-600'
                        : 'bg-gray-400 dark:bg-gray-600',
                    )}
                  >
                    {initialsOf(`${peer.firstName} ${peer.lastName}`)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {peer.firstName} {peer.lastName}
                      </p>
                      <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'mt-0.5 truncate text-sm',
                        conversation.unreadCount > 0
                          ? 'font-medium text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400',
                      )}
                    >
                      {lastMessage ? lastMessage.text : 'No messages yet'}
                    </p>
                    {conversation.listing && (
                      <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
                        {conversation.listing.title} ·{' '}
                        {formatPrice(conversation.listing.price, conversation.listing.currency)}
                      </p>
                    )}
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10">
        <Pagination page={page} pages={pages} onPageChange={setPage} />
      </div>
    </div>
  );
}
