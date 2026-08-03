import type { SafeUser } from './user.js';
import type { LISTING_CATEGORIES, LISTING_CONDITIONS } from '../utils/constants.js';

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];
export type ListingCondition = (typeof LISTING_CONDITIONS)[number];
export type ListingStatus = 'active' | 'sold' | 'removed';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedListings {
  items: SafeListing[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}
