import type { SafeUser } from '@/types/auth';

/** Minimal listing preview embedded in a conversation. */
export interface ConversationListing {
  _id: string;
  title: string;
  price: number;
  currency: string;
  image?: string | null;
}

export interface SafeMessage {
  _id: string;
  conversationId: string;
  sender: SafeUser;
  text: string;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SafeConversation {
  _id: string;
  participants: SafeUser[];
  listing: ConversationListing | null;
  lastMessage: SafeMessage | null;
  unreadCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedConversations {
  items: SafeConversation[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedMessages {
  items: SafeMessage[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CreateConversationInput {
  participantId: string;
  listingId?: string;
}

/** Server payload for a live socket message. */
export interface MessageSocketPayload {
  conversationId: string;
  message: SafeMessage;
}

export interface ReadSocketPayload {
  conversationId: string;
  readerId: string;
  count: number;
}

export interface TypingSocketPayload {
  conversationId: string;
  userId: string;
}
