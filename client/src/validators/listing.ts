import { z } from 'zod';
import { LISTING_CONDITIONS } from '@/types/listing';

export const listingFormSchema = z.object({
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
  currency: z.string().trim().length(3, 'Currency must be a 3-letter code'),
  category: z.string().trim().min(1, 'Select a category'),
  condition: z.enum(LISTING_CONDITIONS),
  location: z.string().trim().max(100, 'Max 100 characters').optional(),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;

const URL_PATTERN = /^https?:\/\/\S+$/i;
const UPLOAD_PATTERN = /^\/uploads\/\S+$/i;
export const MAX_IMAGES = 10;

/** Returns the URLs that are neither absolute http(s) URLs nor /uploads/ paths. */
export function validateImageUrls(urls: string[]): string[] {
  return urls.filter((url) => !URL_PATTERN.test(url) && !UPLOAD_PATTERN.test(url));
}
