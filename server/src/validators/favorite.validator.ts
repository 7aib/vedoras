import { z } from 'zod';

export const favoriteParamsSchema = z.object({
  listingId: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id'),
});

export const listFavoritesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export type ListFavoritesQuery = z.infer<typeof listFavoritesSchema>;
