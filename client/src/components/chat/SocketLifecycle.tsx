import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { store } from '@/store';
import { chatSocket } from '@/services/socket';
import {
  fetchConversations,
  resetChat,
  socketConversationRead,
  socketMessageReceived,
  socketTypingStart,
  socketTypingStop,
} from '@/store/slices/chatSlice';
import type { MessageSocketPayload, ReadSocketPayload, TypingSocketPayload } from '@/types/chat';

/**
 * Owns the chat socket lifecycle: connects with the access token once the
 * user is authenticated, disconnects on logout, and bridges realtime events
 * into the Redux chat slice.
 */
export function SocketLifecycle() {
  const { isAuthenticated, isInitializing, user, accessToken } = useAuth();

  useEffect(() => {
    if (isInitializing) return;

    if (!isAuthenticated || !user || !accessToken) {
      chatSocket.disconnect();
      store.dispatch(resetChat());
      return;
    }

    chatSocket.connect(accessToken);
    store.dispatch(fetchConversations({ page: 1, limit: 12 }));

    const offMessage = chatSocket.on('message:new', (payload) => {
      const event = payload as MessageSocketPayload;
      store.dispatch(socketMessageReceived(event));
      const known = store
        .getState()
        .chat.conversations.items.some((conversation) => conversation._id === event.conversationId);
      if (!known) {
        store.dispatch(fetchConversations({ page: 1, limit: 12 }));
      }
    });
    const offRead = chatSocket.on('conversation:read', (payload) => {
      const event = payload as ReadSocketPayload;
      const viewerId = store.getState().auth.user?._id;
      if (viewerId) {
        store.dispatch(socketConversationRead({ ...event, viewerId }));
      }
    });
    const offTypingStart = chatSocket.on('typing:start', (payload) => {
      store.dispatch(socketTypingStart(payload as TypingSocketPayload));
    });
    const offTypingStop = chatSocket.on('typing:stop', (payload) => {
      store.dispatch(socketTypingStop(payload as TypingSocketPayload));
    });

    return () => {
      offMessage();
      offRead();
      offTypingStart();
      offTypingStop();
    };
  }, [isAuthenticated, isInitializing, user, accessToken]);

  return null;
}
