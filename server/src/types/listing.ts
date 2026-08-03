import type { SafeUser } from './user.js';
import type { LISTING_CONDITIONS } from '../utils/constants.js';

/** Category slug, e.g. `vehicles-cars`. Resolved against the seeded tree. */
export type ListingCategory = string;
export type ListingCondition = (typeof LISTING_CONDITIONS)[number];
export type ListingStatus = 'active' | 'sold' | 'removed';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface ListingFacetCategory {
  slug: string;
  count: number;
}

export interface ListingFacets {
  categories: ListingFacetCategory[];
  conditions: { condition: string; count: number }[];
  price: { min: number | null; max: number | null };
}

export interface PaginatedListings {
  items: SafeListing[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  /** Facet counts for the public browse endpoint (absent on "my listings"). */
  facets?: ListingFacets;
}
