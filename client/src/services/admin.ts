import httpClient from './httpClient';
import type { SafeListing } from '@/types/listing';
import type {
  AdminListingStatus,
  AdminPaginatedListings,
  AdminStats,
  PaginatedAdminUsers,
} from '@/types/admin';

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await httpClient.get<AdminStats>('/admin/stats');
  return res.data;
}

export async function listAdminUsers(
  query: {
    page?: number;
    limit?: number;
    q?: string;
    role?: 'user' | 'admin';
  } = {},
): Promise<PaginatedAdminUsers> {
  const res = await httpClient.get<PaginatedAdminUsers>('/admin/users', { params: query });
  return res.data;
}

export async function updateUserRole(
  id: string,
  role: 'user' | 'admin',
): Promise<{ _id: string; role: 'user' | 'admin' }> {
  const res = await httpClient.patch<{ _id: string; role: 'user' | 'admin' }>(
    `/admin/users/${id}/role`,
    { role },
  );
  return res.data;
}

export async function listAdminListings(
  query: {
    page?: number;
    limit?: number;
    q?: string;
    status?: AdminListingStatus;
  } = {},
): Promise<AdminPaginatedListings> {
  const res = await httpClient.get<AdminPaginatedListings>('/admin/listings', { params: query });
  return res.data;
}

export async function updateListingStatus(
  id: string,
  status: AdminListingStatus,
): Promise<SafeListing> {
  const res = await httpClient.patch<SafeListing>(`/admin/listings/${id}/status`, { status });
  return res.data;
}

export async function deleteAdminListing(id: string): Promise<void> {
  await httpClient.delete<null>(`/admin/listings/${id}`);
}
