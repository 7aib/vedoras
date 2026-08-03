import { z } from 'zod';
import { LISTING_CONDITIONS, LISTING_SORTS } from '../utils/constants.js';

export const objectIdSchema = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id');

/** Accepts absolute http(s) URLs and local relative /uploads/ paths. */
const imageUrlSchema = z
  .string()
  .refine(
    (value) => /^https?:\/\//.test(value) || value.startsWith('/uploads/'),
    'Images must be valid URLs or /uploads/ paths',
  );

export const createListingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Max 100 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Max 5000 characters'),
  price: z.coerce
    .number()
    .min(0, 'Price must be 0 or more')
    .max(1_000_000_000, 'Price is too large'),
  currency: z.string().trim().length(3, 'Currency must be a 3-letter code').default('USD'),
  category: z
    .string()
    .trim()
    .min(1, 'Category is required')
    .max(60, 'Category is too long')
    .regex(/^[a-z0-9-]+$/, 'Invalid category'),
  condition: z.enum(LISTING_CONDITIONS).default('good'),
  location: z.string().trim().max(100, 'Max 100 characters').optional(),
  images: z.array(imageUrlSchema).max(10, 'Max 10 images').optional(),
});

export const updateListingSchema = createListingSchema.partial().strict();

export const listListingsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  // Comma-separated list, e.g. `condition=new,good`.
  condition: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(LISTING_SORTS).default('newest'),
  status: z.enum(['active', 'sold', 'removed']).optional(),
});

export const relatedListingsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(8).default(4),
});

export const listingParamsSchema = z.object({
  id: objectIdSchema,
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListListingsQuery = z.infer<typeof listListingsSchema>;
