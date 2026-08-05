import httpClient from './httpClient';
import type { FavoriteToggleResult, PaginatedListings } from '@/types/listing';

export async function listFavorites(
  query: { page?: number; limit?: number } = {},
): Promise<PaginatedListings> {
  const res = await httpClient.get<PaginatedListings>('/favorites', { params: query });
  return res.data;
}

/** PUT toggles: adds when absent, removes when present. */
export async function addFavorite(listingId: string): Promise<FavoriteToggleResult> {
  const res = await httpClient.put<FavoriteToggleResult>(`/favorites/${listingId}`);
  return res.data;
}

export async function removeFavorite(listingId: string): Promise<FavoriteToggleResult> {
  const res = await httpClient.delete<FavoriteToggleResult>(`/favorites/${listingId}`);
  return res.data;
}
