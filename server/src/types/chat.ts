import type { SafeUser } from './user.js';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeConversation {
  _id: string;
  participants: SafeUser[];
  /** The item being discussed; may be null for generic chats. */
  listing: ConversationListing | null;
  lastMessage: SafeMessage | null;
  /** Unread messages for the requesting participant. */
  unreadCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedMessages {
  items: SafeMessage[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/** Payload broadcast over the socket for a newly created message. */
export interface MessageSocketPayload {
  message: SafeMessage;
  /** The other participant(s) receive this to bump their inbox. */
  conversationId: string;
}
