import type { SafeUser } from './user.js';
import type { SafeListing } from './listing.js';

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
