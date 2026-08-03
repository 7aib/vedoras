import httpClient from './httpClient';
import type { SafeCategory } from '@/types/category';

/** Fetches the category tree from the API (top-level nodes with nested children). */
export async function fetchCategories(): Promise<SafeCategory[]> {
  const res = await httpClient.get<{ categories: SafeCategory[] }>('/categories');
  return res.data.categories;
}
