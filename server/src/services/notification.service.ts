import { Favorite } from '../models/favorite.model.js';
import { Notification, type NotificationLean } from '../models/notification.model.js';
import type {
  NotificationType,
  PaginatedNotifications,
  SafeNotification,
} from '../types/notification.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';
import { getSocketServer } from '../socket/index.js';

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export function toSafeNotification(notification: NotificationLean): SafeNotification {
  return {
    _id: String(notification._id),
    type: notification.type as SafeNotification['type'],
    title: notification.title,
    body: notification.body,
    data: notification.data as SafeNotification['data'],
    read: notification.readAt !== null,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

/**
 * Persists a notification for a user and pushes it live over the socket.
 * Never throws: notification failures must not break the triggering action
 * (e.g. sending a chat message).
 */
export async function notifyUser(userId: string, input: NotifyInput): Promise<void> {
  try {
    const notification = await Notification.create({
      user: userId,
      type: input.type,
      title: input.title,
      body: input.body ?? '',
      data: input.data ?? {},
    });
    const safe = toSafeNotification(notification.toObject() as unknown as NotificationLean);
    getSocketServer()?.to(`user:${userId}`).emit('notification:new', safe);
  } catch (error) {
    logger.error('Failed to create notification', { error });
  }
}

/**
 * Notifies every user who favorited a listing when it is sold or removed
 * (excluding the actor). Best-effort: never throws.
 */
export async function notifyFavoritersOfListingStatus(
  listingId: string,
  listingTitle: string,
  actorId: string,
  status: 'sold' | 'removed',
): Promise<void> {
  try {
    const favorites = await Favorite.find({ listing: listingId }).select('user').lean();
    const type: NotificationType = status === 'sold' ? 'listing_sold' : 'listing_removed';
    const body =
      status === 'sold'
        ? `The listing "${listingTitle}" you saved has been marked as sold.`
        : `The listing "${listingTitle}" you saved has been removed.`;
    await Promise.all(
      favorites
        .map((favorite) => String(favorite.user))
        .filter((userId) => userId !== actorId)
        .map((userId) =>
          notifyUser(userId, {
            type,
            title: 'Saved listing update',
            body,
            data: { listingId, title: listingTitle },
          }),
        ),
    );
  } catch (error) {
    logger.error('Failed to notify favoriters of listing status change', { error });
  }
}

/** Paginated list of a user's notifications, newest first. */
export async function listNotifications(
  userId: string,
  query: { page: number; limit: number },
): Promise<PaginatedNotifications> {
  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const filter = { user: userId };

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, readAt: null }),
  ]);

  return {
    items: (items as unknown as NotificationLean[]).map(toSafeNotification),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    unreadCount,
  };
}

/** Marks a single notification as read (no-op when already read). */
export async function markNotificationRead(id: string, userId: string): Promise<SafeNotification> {
  const notification = await Notification.findOne({ _id: id, user: userId }).lean();
  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }
  if (notification.readAt === null) {
    await Notification.updateOne({ _id: id }, { readAt: new Date() });
    notification.readAt = new Date();
  }
  return toSafeNotification(notification as unknown as NotificationLean);
}

/** Marks every notification as read; returns how many were newly marked. */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await Notification.updateMany(
    { user: userId, readAt: null },
    { readAt: new Date() },
  );
  return result.modifiedCount ?? 0;
}
