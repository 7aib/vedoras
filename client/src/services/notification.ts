import httpClient from './httpClient';
import type { PaginatedNotifications, SafeNotification } from '@/types/notification';

export async function listNotifications(
  query: { page?: number; limit?: number } = {},
): Promise<PaginatedNotifications> {
  const res = await httpClient.get<PaginatedNotifications>('/notifications', { params: query });
  return res.data;
}

export async function markNotificationRead(id: string): Promise<SafeNotification> {
  const res = await httpClient.put<SafeNotification>(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead(): Promise<{ count: number }> {
  const res = await httpClient.put<{ count: number }>('/notifications/read-all');
  return res.data;
}
