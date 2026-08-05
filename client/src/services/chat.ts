import httpClient from './httpClient';
import type {
  CreateConversationInput,
  PaginatedConversations,
  PaginatedMessages,
  SafeConversation,
  SafeMessage,
} from '@/types/chat';

export async function listConversations(
  query: { page?: number; limit?: number } = {},
): Promise<PaginatedConversations> {
  const res = await httpClient.get<PaginatedConversations>('/conversations', { params: query });
  return res.data;
}

export async function createConversation(
  input: CreateConversationInput,
): Promise<SafeConversation> {
  const res = await httpClient.post<SafeConversation>('/conversations', input);
  return res.data;
}

export async function listMessages(
  conversationId: string,
  query: { page?: number; limit?: number } = {},
): Promise<PaginatedMessages> {
  const res = await httpClient.get<PaginatedMessages>(`/conversations/${conversationId}/messages`, {
    params: query,
  });
  return res.data;
}

export async function sendMessage(conversationId: string, text: string): Promise<SafeMessage> {
  const res = await httpClient.post<SafeMessage>(`/conversations/${conversationId}/messages`, {
    text,
  });
  return res.data;
}

export async function markConversationRead(conversationId: string): Promise<{ count: number }> {
  const res = await httpClient.put<{ count: number }>(`/conversations/${conversationId}/read`);
  return res.data;
}
