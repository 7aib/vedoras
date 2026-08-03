import type { SafeUser } from '@/types/auth';

export const LISTING_CATEGORIES = [
  'vehicles',
  'real-estate',
  'electronics',
  'furniture',
  'jobs',
  'fashion',
] as const;

export const LISTING_CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'] as const;

export const LISTING_SORTS = ['newest', 'price_asc', 'price_desc'] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];
export type ListingCondition = (typeof LISTING_CONDITIONS)[number];
export type ListingSort = (typeof LISTING_SORTS)[number];
export type ListingStatus = 'active' | 'sold' | 'removed';

/** Listing shape returned by the API (mirrors server SafeListing). */
export interface SafeListing {
  _id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: ListingCategory;
  condition: ListingCondition;
  location: string | null;
  images: string[];
  status: ListingStatus;
  views: number;
  seller: SafeUser;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedListings {
  items: SafeListing[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CreateListingInput {
  title: string;
  description: string;
  price: number;
  currency: string;
  category: ListingCategory;
  condition: ListingCondition;
  location?: string;
  images?: string[];
}

export type UpdateListingInput = Partial<CreateListingInput>;

export interface ListListingsQuery {
  page?: number;
  limit?: number;
  q?: string;
  category?: ListingCategory;
  condition?: ListingCondition;
  minPrice?: number;
  maxPrice?: number;
  sort?: ListingSort;
  status?: ListingStatus;
}
