import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notification.service.js';
import type { ListNotificationsQuery } from '../validators/notification.validator.js';

export const listNotificationsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await listNotifications(
      req.userId!,
      req.query as unknown as ListNotificationsQuery,
    );
    ApiResponse.send(res, 200, 'Notifications retrieved', result);
  },
);

export const markNotificationReadHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await markNotificationRead(req.params.id as string, req.userId!);
    ApiResponse.send(res, 200, 'Notification marked as read', result);
  },
);

export const markAllNotificationsReadHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await markAllNotificationsRead(req.userId!);
    ApiResponse.send(res, 200, 'All notifications marked as read', { count: result });
  },
);
