import { z } from 'zod';
import { objectIdSchema } from './listing.validator.js';

export const adminParamsSchema = z.object({
  id: objectIdSchema,
});

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  role: z.enum(['user', 'admin']).optional(),
});

export const adminListingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'sold', 'removed']).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const updateListingStatusSchema = z.object({
  status: z.enum(['active', 'sold', 'removed']),
});

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminListingsQuery = z.infer<typeof adminListingsQuerySchema>;
