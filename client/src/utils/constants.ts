import type { ListingCategory, ListingCondition, ListingSort } from '@/types/listing';

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  vehicles: 'Vehicles',
  'real-estate': 'Real Estate',
  electronics: 'Electronics',
  furniture: 'Furniture',
  jobs: 'Jobs',
  fashion: 'Fashion',
};

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export const SORT_LABELS: Record<ListingSort, string> = {
  newest: 'Newest first',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
};

/** Formats a price with its currency code, e.g. `$150.00` / `150 USD`. */
export function formatPrice(price: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: price % 1 === 0 ? 0 : 2,
  }).format(price);
}
