import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchBrowseListings } from '@/store/slices/listingSlice';
import { ListingCard } from '@/components/listings/ListingCard';
import { EmptyState } from '@/components/listings/EmptyState';
import { Pagination } from '@/components/listings/Pagination';
import { CATEGORY_LABELS, CONDITION_LABELS, SORT_LABELS } from '@/utils/constants';
import type { ListingCategory, ListingCondition, ListingSort } from '@/types/listing';

const LIMIT = 12;

function SearchField({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [value, setValue] = useState(initial);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
      className="flex w-full items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-card dark:border-gray-800 dark:bg-gray-900"
    >
      <svg
        className="ml-2 size-5 shrink-0 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search for cars, phones, apartments…"
        className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white"
        aria-label="Search listings"
      />
      <button
        type="submit"
        className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Search
      </button>
    </form>
  );
}

export function BrowseListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { items, total, pages, status } = useAppSelector((state) => state.listings.browse);

  const q = searchParams.get('q') ?? '';
  const category = (searchParams.get('category') ?? '') as ListingCategory | '';
  const condition = (searchParams.get('condition') ?? '') as ListingCondition | '';
  const sort = (searchParams.get('sort') ?? 'newest') as ListingSort;
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

  useEffect(() => {
    dispatch(
      fetchBrowseListings({
        page,
        limit: LIMIT,
        q: q || undefined,
        category: category || undefined,
        condition: condition || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort,
      }),
    );
  }, [dispatch, page, q, category, condition, minPrice, maxPrice, sort]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
    params.delete('page');
    setSearchParams(params, { replace: true });
  }

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(nextPage));
    setSearchParams(params, { replace: true });
  }

  const isLoading = status === 'idle' || status === 'loading';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Browse listings
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {total} {total === 1 ? 'listing' : 'listings'} available
          </p>
        </div>
        <div className="w-full sm:max-w-md">
          <SearchField initial={q} onSearch={(next) => updateParam('q', next)} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
          Category
          <select
            value={category}
            onChange={(event) => updateParam('category', event.target.value || null)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/50"
          >
            <option value="">All categories</option>
            {(Object.keys(CATEGORY_LABELS) as ListingCategory[]).map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
          Condition
          <select
            value={condition}
            onChange={(event) => updateParam('condition', event.target.value || null)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/50"
          >
            <option value="">Any condition</option>
            {(Object.keys(CONDITION_LABELS) as ListingCondition[]).map((value) => (
              <option key={value} value={value}>
                {CONDITION_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
          Min price
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(event) => updateParam('minPrice', event.target.value || null)}
            placeholder="Any"
            className="w-28 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/50"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
          Max price
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(event) => updateParam('maxPrice', event.target.value || null)}
            placeholder="Any"
            className="w-28 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/50"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 sm:ml-auto">
          Sort
          <select
            value={sort}
            onChange={(event) => updateParam('sort', event.target.value || null)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/50"
          >
            {(Object.keys(SORT_LABELS) as ListingSort[]).map((value) => (
              <option key={value} value={value}>
                {SORT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: LIMIT }, (_, index) => (
            <div
              key={index}
              className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No listings found"
            description="Try adjusting your filters or search terms."
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {items.map((listing, index) => (
            <motion.div
              key={listing._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ListingCard listing={listing} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="mt-10">
        <Pagination page={page} pages={pages} onPageChange={goToPage} />
      </div>
    </div>
  );
}
