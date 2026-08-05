import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  createConversation as apiCreateConversation,
  listConversations as apiListConversations,
  listMessages as apiListMessages,
  markConversationRead as apiMarkConversationRead,
  sendMessage as apiSendMessage,
} from '@/services/chat';
import { chatSocket } from '@/services/socket';
import type {
  CreateConversationInput,
  MessageSocketPayload,
  PaginatedConversations,
  PaginatedMessages,
  ReadSocketPayload,
  SafeConversation,
  SafeMessage,
  TypingSocketPayload,
} from '@/types/chat';

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface ConversationCollection extends PaginatedConversations {
  status: RequestStatus;
}

interface MessageCollection extends PaginatedMessages {
  status: RequestStatus;
}

interface ChatState {
  conversations: ConversationCollection;
  messagesByConversation: Record<string, MessageCollection>;
  /** Conversation currently rendered in the thread view. */
  openConversationId: string | null;
  /** Conversation ids with an in-flight send (disables their composer). */
  pendingSends: string[];
  /** User ids currently typing, per conversation. */
  typingByConversation: Record<string, string[]>;
}

const emptyConversations: ConversationCollection = {
  items: [],
  page: 1,
  limit: 12,
  total: 0,
  pages: 0,
  status: 'idle',
};

const emptyMessages: MessageCollection = {
  items: [],
  page: 1,
  limit: 30,
  total: 0,
  pages: 0,
  status: 'idle',
};

const initialState: ChatState = {
  conversations: emptyConversations,
  messagesByConversation: {},
  openConversationId: null,
  pendingSends: [],
  typingByConversation: {},
};

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (query: { page?: number; limit?: number } = {}) => apiListConversations(query),
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (input: { conversationId: string; page?: number; limit?: number }) =>
    apiListMessages(input.conversationId, { page: input.page, limit: input.limit }),
);

export const createConversation = createAsyncThunk(
  'chat/createConversation',
  async (input: CreateConversationInput) => apiCreateConversation(input),
);

/** Prefers the socket (acked) and falls back to REST when disconnected. */
export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async (input: { conversationId: string; text: string }) => {
    if (chatSocket.isConnected()) {
      const ack = await chatSocket.sendMessage(input.conversationId, input.text);
      if (ack.ok && ack.message) {
        return ack.message;
      }
    }
    return apiSendMessage(input.conversationId, input.text);
  },
);

/** Prefers the socket (acked) and falls back to REST when disconnected. */
export const markConversationRead = createAsyncThunk(
  'chat/markRead',
  async (input: { conversationId: string; userId: string }) => {
    if (chatSocket.isConnected()) {
      const ack = await chatSocket.markRead(input.conversationId);
      if (ack.ok) {
        return { count: ack.count ?? 0 };
      }
    }
    return apiMarkConversationRead(input.conversationId);
  },
);

function appendMessage(state: ChatState, conversationId: string, message: SafeMessage): void {
  const collection = state.messagesByConversation[conversationId];
  if (!collection) {
    state.messagesByConversation[conversationId] = {
      ...emptyMessages,
      items: [message],
      total: 1,
      pages: 1,
      status: 'succeeded',
    };
    return;
  }
  if (!collection.items.some((item) => item._id === message._id)) {
    collection.items.push(message);
    collection.total += 1;
  }
}

function upsertConversation(state: ChatState, conversation: SafeConversation): void {
  const existing = state.conversations.items.find((item) => item._id === conversation._id);
  if (existing) {
    Object.assign(existing, conversation);
    return;
  }
  state.conversations.items.unshift(conversation);
  state.conversations.total += 1;
  state.conversations.pages = Math.max(1, state.conversations.pages);
}

function updateReadState(
  state: ChatState,
  conversationId: string,
  readerId: string,
  viewerId: string,
): void {
  const collection = state.messagesByConversation[conversationId];
  if (collection) {
    for (const message of collection.items) {
      if (!message.readBy.includes(readerId)) {
        message.readBy.push(readerId);
      }
    }
  }
  if (readerId === viewerId) {
    const conversation = state.conversations.items.find((item) => item._id === conversationId);
    if (conversation) {
      conversation.unreadCount = 0;
    }
  }
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setOpenConversation(state, action: PayloadAction<string | null>) {
      state.openConversationId = action.payload;
    },
    socketMessageReceived(state, action: PayloadAction<MessageSocketPayload>) {
      const { conversationId, message } = action.payload;
      appendMessage(state, conversationId, message);
      const conversation = state.conversations.items.find((item) => item._id === conversationId);
      if (conversation) {
        conversation.lastMessage = message;
        conversation.lastMessageAt = message.createdAt;
        if (conversationId !== state.openConversationId) {
          conversation.unreadCount += 1;
        }
      }
    },
    socketConversationRead(state, action: PayloadAction<ReadSocketPayload & { viewerId: string }>) {
      const { conversationId, readerId, viewerId } = action.payload;
      updateReadState(state, conversationId, readerId, viewerId);
    },
    socketTypingStart(state, action: PayloadAction<TypingSocketPayload>) {
      const { conversationId, userId } = action.payload;
      const list = state.typingByConversation[conversationId] ?? [];
      if (!list.includes(userId)) {
        state.typingByConversation[conversationId] = [...list, userId];
      }
    },
    socketTypingStop(state, action: PayloadAction<TypingSocketPayload>) {
      const { conversationId, userId } = action.payload;
      const list = state.typingByConversation[conversationId] ?? [];
      state.typingByConversation[conversationId] = list.filter((id) => id !== userId);
    },
    resetChat() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.conversations.status = 'loading';
      })
      .addCase(
        fetchConversations.fulfilled,
        (state, action: PayloadAction<PaginatedConversations>) => {
          state.conversations = { ...action.payload, status: 'succeeded' };
        },
      )
      .addCase(fetchConversations.rejected, (state) => {
        state.conversations.status = 'failed';
      })
      .addCase(fetchMessages.pending, (state, action) => {
        const collection = state.messagesByConversation[action.meta.arg.conversationId] ?? {
          ...emptyMessages,
        };
        collection.status = 'loading';
        state.messagesByConversation[action.meta.arg.conversationId] = collection;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { conversationId } = action.meta.arg;
        const existing = state.messagesByConversation[conversationId];
        if (existing && existing.items.length > 0) {
          const incoming = action.payload.items.filter(
            (message) => !existing.items.some((item) => item._id === message._id),
          );
          existing.items = [...existing.items, ...incoming];
          existing.total = action.payload.total;
          existing.pages = action.payload.pages;
        } else {
          state.messagesByConversation[conversationId] = {
            ...action.payload,
            status: 'succeeded',
          };
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        const collection = state.messagesByConversation[action.meta.arg.conversationId];
        if (collection) {
          collection.status = 'failed';
        }
      })
      .addCase(createConversation.pending, (state) => {
        state.conversations.status = 'loading';
      })
      .addCase(createConversation.fulfilled, (state, action: PayloadAction<SafeConversation>) => {
        upsertConversation(state, action.payload);
        state.openConversationId = action.payload._id;
        state.conversations.status = 'succeeded';
      })
      .addCase(createConversation.rejected, (state) => {
        state.conversations.status = state.conversations.items.length > 0 ? 'succeeded' : 'failed';
      })
      .addCase(sendChatMessage.pending, (state, action) => {
        const { conversationId } = action.meta.arg;
        if (!state.pendingSends.includes(conversationId)) {
          state.pendingSends.push(conversationId);
        }
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        const { conversationId } = action.meta.arg;
        state.pendingSends = state.pendingSends.filter((id) => id !== conversationId);
        appendMessage(state, conversationId, action.payload);
        const conversation = state.conversations.items.find((item) => item._id === conversationId);
        if (conversation) {
          conversation.lastMessage = action.payload;
          conversation.lastMessageAt = action.payload.createdAt;
        }
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        const { conversationId } = action.meta.arg;
        state.pendingSends = state.pendingSends.filter((id) => id !== conversationId);
      })
      .addCase(markConversationRead.fulfilled, (state, action) => {
        const { conversationId, userId } = action.meta.arg;
        const conversation = state.conversations.items.find((item) => item._id === conversationId);
        if (conversation) {
          conversation.unreadCount = 0;
        }
        updateReadState(state, conversationId, userId, userId);
      });
  },
});

export const {
  setOpenConversation,
  socketMessageReceived,
  socketConversationRead,
  socketTypingStart,
  socketTypingStop,
  resetChat,
} = chatSlice.actions;
export default chatSlice.reducer;
