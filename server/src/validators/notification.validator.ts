import { z } from 'zod';

export const notificationParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id'),
});

export const listNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>;
