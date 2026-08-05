import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchMessages,
  markConversationRead,
  sendChatMessage,
  setOpenConversation,
} from '@/store/slices/chatSlice';
import { useAuth } from '@/hooks/useAuth';
import { chatSocket } from '@/services/socket';
import { PageLoader } from '@/components/auth/PageLoader';
import { formatPrice } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { SafeUser } from '@/types/auth';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatMessageTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ConversationPage() {
  const { id = '' } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const conversations = useAppSelector((state) => state.chat.conversations);
  const collection = useAppSelector((state) => state.chat.messagesByConversation[id]);
  const pendingSends = useAppSelector((state) => state.chat.pendingSends);
  const typingUsers = useAppSelector((state) => state.chat.typingByConversation[id] ?? []);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastHandledMessageRef = useRef<string | null>(null);

  const conversation = conversations.items.find((item) => item._id === id);
  const messages = useMemo(() => collection?.items ?? [], [collection]);
  const userId = user?._id ?? '';

  useEffect(() => {
    dispatch(setOpenConversation(id));
    dispatch(fetchMessages({ conversationId: id, limit: 30 }));
    if (userId) {
      dispatch(markConversationRead({ conversationId: id, userId }));
    }
    return () => {
      dispatch(setOpenConversation(null));
    };
  }, [dispatch, id, userId]);

  const peer: SafeUser | null = useMemo(() => {
    if (conversation) {
      return (
        conversation.participants.find((participant) => participant._id !== userId) ??
        conversation.participants[0]
      );
    }
    return messages.find((message) => message.sender._id !== userId)?.sender ?? null;
  }, [conversation, messages, userId]);

  const isPending = pendingSends.includes(id);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages.length]);

  const lastMessage = messages[messages.length - 1];
  useEffect(() => {
    if (!lastMessage || !userId) return;
    if (lastMessage._id === lastHandledMessageRef.current) return;
    lastHandledMessageRef.current = lastMessage._id;
    if (lastMessage.sender._id !== userId) {
      dispatch(markConversationRead({ conversationId: id, userId }));
    }
  }, [lastMessage, dispatch, id, userId]);

  useEffect(() => {
    return () => {
      chatSocket.emitTyping(id, false);
    };
  }, [id]);

  const handleDraftChange = (value: string) => {
    const wasEmpty = draft.length === 0;
    setDraft(value);
    if (value.length > 0 && wasEmpty) {
      chatSocket.emitTyping(id, true);
    } else if (value.length === 0 && !wasEmpty) {
      chatSocket.emitTyping(id, false);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isPending) return;
    setDraft('');
    chatSocket.emitTyping(id, false);
    try {
      await dispatch(sendChatMessage({ conversationId: id, text })).unwrap();
    } catch {
      toast.error('Unable to send the message. Please try again.');
    }
  };

  const isLoading = !collection || collection.status === 'idle' || collection.status === 'loading';

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4 rounded-t-2xl border border-b-0 border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
        <Link
          to="/chat"
          className="grid size-9 shrink-0 place-items-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          aria-label="Back to messages"
        >
          <svg
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>
        {peer && (
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {initialsOf(`${peer.firstName} ${peer.lastName}`)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900 dark:text-white">
                {peer.firstName} {peer.lastName}
              </p>
              {conversation?.listing && (
                <Link
                  to={`/listings/${conversation.listing._id}`}
                  className="block truncate text-xs text-brand-600 hover:underline dark:text-brand-400"
                >
                  {conversation.listing.title} ·{' '}
                  {formatPrice(conversation.listing.price, conversation.listing.currency)}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-b-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-gray-900">
        {isLoading && messages.length === 0 ? (
          <PageLoader />
        ) : messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            No messages yet. Say hello!
          </p>
        ) : (
          <ul className="space-y-3">
            {[...messages].reverse().map((message) => {
              const mine = message.sender._id === userId;
              const read = mine && peer && message.readBy.includes(peer._id);
              return (
                <li
                  key={message._id}
                  className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                      mine
                        ? 'rounded-br-sm bg-brand-600 text-white'
                        : 'rounded-bl-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
                    )}
                  >
                    <p className="whitespace-pre-line break-words">{message.text}</p>
                    <p
                      className={cn(
                        'mt-1 text-right text-[11px]',
                        mine ? 'text-brand-100' : 'text-gray-400 dark:text-gray-500',
                      )}
                    >
                      {formatMessageTime(message.createdAt)}
                      {mine && <span className="ml-1">{read ? ' · Read' : ' · Sent'}</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3">
        {typingUsers.length > 0 && peer && (
          <p className="mb-1 pl-1 text-xs italic text-gray-500 dark:text-gray-400">
            {peer.firstName} is typing…
          </p>
        )}
        <div className="flex items-end gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-card dark:border-gray-800 dark:bg-gray-900">
          <textarea
            value={draft}
            onChange={(event) => handleDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            placeholder="Write a message…"
            className="max-h-40 min-h-11 flex-1 resize-none rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isPending || draft.trim().length === 0}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
