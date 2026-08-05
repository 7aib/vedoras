import type { SafeUser } from '@/types/auth';
import type { SafeListing, ListingStatus } from '@/types/listing';

export interface AdminStats {
  users: { total: number; admins: number };
  listings: { total: number; active: number; sold: number; removed: number };
  conversations: number;
  messages: number;
  favorites: number;
}

export interface PaginatedAdminUsers {
  items: SafeUser[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AdminPaginatedListings {
  items: SafeListing[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type AdminListingStatus = ListingStatus;
