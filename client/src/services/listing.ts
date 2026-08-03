import httpClient from './httpClient';
import type {
  CreateListingInput,
  ListListingsQuery,
  PaginatedListings,
  SafeListing,
  UpdateListingInput,
} from '@/types/listing';

/**
 * NOTE: the httpClient response interceptor already unwraps the standard
 * envelope, so the axios generic is the *payload* type (the response `.data`).
 */
export async function listListings(query: ListListingsQuery = {}): Promise<PaginatedListings> {
  const res = await httpClient.get<PaginatedListings>('/listings', { params: query });
  return res.data;
}

export async function listMyListings(query: ListListingsQuery = {}): Promise<PaginatedListings> {
  const res = await httpClient.get<PaginatedListings>('/listings/mine', { params: query });
  return res.data;
}

export async function fetchListing(id: string): Promise<SafeListing> {
  const res = await httpClient.get<SafeListing>(`/listings/${id}`);
  return res.data;
}

export async function createListing(input: CreateListingInput): Promise<SafeListing> {
  const res = await httpClient.post<SafeListing>('/listings', input);
  return res.data;
}

export async function updateListing(id: string, input: UpdateListingInput): Promise<SafeListing> {
  const res = await httpClient.patch<SafeListing>(`/listings/${id}`, input);
  return res.data;
}

export async function deleteListing(id: string): Promise<void> {
  await httpClient.delete<null>(`/listings/${id}`);
}

export async function fetchRelatedListings(id: string, limit = 4): Promise<SafeListing[]> {
  const res = await httpClient.get<SafeListing[]>(`/listings/${id}/related`, {
    params: { limit },
  });
  return res.data;
}
