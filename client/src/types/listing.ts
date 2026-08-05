import type { SafeUser } from '@/types/auth';

export const LISTING_CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'] as const;

export const LISTING_SORTS = ['newest', 'price_asc', 'price_desc', 'relevance'] as const;

/** Category slug, e.g. `vehicles-cars`. Populated from the API category tree. */
export type ListingCategory = string;
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
  /** Ancestor slug chain, self last (e.g. `['vehicles', 'vehicles-cars']`). */
  categoryPath: string[];
  condition: ListingCondition;
  location: string | null;
  images: string[];
  status: ListingStatus;
  views: number;
  seller: SafeUser;
  createdAt: string;
  updatedAt: string;
  /** Number of users who favorited this listing. */
  favoriteCount: number;
  /** Whether the signed-in user favorited it; only present when authenticated. */
  isFavorited?: boolean;
}

export interface FavoriteToggleResult {
  listingId: string;
  isFavorited: boolean;
  favoriteCount: number;
}

export interface ListingFacets {
  categories: { slug: string; count: number }[];
  conditions: { condition: string; count: number }[];
  price: { min: number | null; max: number | null };
}

export interface PaginatedListings {
  items: SafeListing[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  facets?: ListingFacets;
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

export type UpdateListingInput = Partial<CreateListingInput> & { status?: ListingStatus };

export interface ListListingsQuery {
  page?: number;
  limit?: number;
  q?: string;
  category?: ListingCategory;
  /** Comma-separated list, e.g. `new,good`. */
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ListingSort;
  status?: ListingStatus;
}
