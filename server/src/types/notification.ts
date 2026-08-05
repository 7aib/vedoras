export type NotificationType = 'message' | 'listing_sold' | 'listing_removed';

export interface NotificationData {
  conversationId?: string;
  listingId?: string;
  title?: string;
}

export interface SafeNotification {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedNotifications {
  items: SafeNotification[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  /** Total unread notifications for the requesting user (any page). */
  unreadCount: number;
}
