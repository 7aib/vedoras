import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchBrowseListings } from '@/store/slices/listingSlice';
import { useCategories } from '@/hooks/useCategories';
import { ListingCard } from '@/components/listings/ListingCard';
import { EmptyState } from '@/components/listings/EmptyState';
import { Pagination } from '@/components/listings/Pagination';
import { CONDITION_LABELS, SORT_LABELS } from '@/utils/constants';
import type { SafeCategory } from '@/types/category';
import type { ListingCondition, ListingSort } from '@/types/listing';

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

const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus:ring-brand-900/50';

interface FiltersPanelProps {
  categories: SafeCategory[];
  categoryCounts: Record<string, number>;
  selectedCategory: string;
  onSelectCategory: (slug: string | null) => void;
  selectedConditions: ListingCondition[];
  conditionCounts: Record<string, number>;
  onToggleCondition: (condition: ListingCondition) => void;
  minPrice: string;
  maxPrice: string;
  onMinPrice: (value: string) => void;
  onMaxPrice: (value: string) => void;
  onClearAll: () => void;
}

function FiltersPanel({
  categories,
  categoryCounts,
  selectedCategory,
  onSelectCategory,
  selectedConditions,
  conditionCounts,
  onToggleCondition,
  minPrice,
  maxPrice,
  onMinPrice,
  onMaxPrice,
  onClearAll,
}: FiltersPanelProps) {
  const hasFilters =
    selectedCategory !== '' || selectedConditions.length > 0 || minPrice !== '' || maxPrice !== '';

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Categories
          </h2>
          {hasFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Clear all
            </button>
          )}
        </div>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                selectedCategory === ''
                  ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <span>All categories</span>
            </button>
          </li>
          {categories.map((top) => (
            <Fragment key={top.slug}>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory(top.slug)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    selectedCategory === top.slug
                      ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                      : 'text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  <span>{top.name}</span>
                  <span className="text-xs text-gray-400">{categoryCounts[top.slug] ?? 0}</span>
                </button>
              </li>
              {top.children.map((child) => (
                <li key={child.slug}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(child.slug)}
                    className={`ml-4 flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                      selectedCategory === child.slug
                        ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    <span>{child.name}</span>
                    <span className="text-xs text-gray-400">{categoryCounts[child.slug] ?? 0}</span>
                  </button>
                </li>
              ))}
            </Fragment>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Condition
        </h2>
        <div className="flex flex-col gap-1">
          {(Object.keys(CONDITION_LABELS) as ListingCondition[]).map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                selectedConditions.includes(value)
                  ? 'text-brand-700 dark:text-brand-300'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedConditions.includes(value)}
                  onChange={() => onToggleCondition(value)}
                  className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600"
                />
                {CONDITION_LABELS[value]}
              </span>
              <span className="text-xs text-gray-400">{conditionCounts[value] ?? 0}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Price range
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(event) => onMinPrice(event.target.value)}
            placeholder="Min"
            aria-label="Minimum price"
            className={inputClass}
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(event) => onMaxPrice(event.target.value)}
            placeholder="Max"
            aria-label="Maximum price"
            className={inputClass}
          />
        </div>
      </section>
    </div>
  );
}

function ActiveFilterChips({
  q,
  category,
  conditions,
  minPrice,
  maxPrice,
  categoryName,
  onRemove,
}: {
  q: string;
  category: string;
  conditions: ListingCondition[];
  minPrice: string;
  maxPrice: string;
  categoryName: (slug: string) => string;
  onRemove: (key: string, value?: string) => void;
}) {
  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: 'q', label: `"${q}"` });
  if (category) chips.push({ key: 'category', label: categoryName(category) });
  conditions.forEach((condition) =>
    chips.push({ key: `condition:${condition}`, label: CONDITION_LABELS[condition] }),
  );
  if (minPrice !== '' && maxPrice !== '') {
    chips.push({ key: 'price', label: `${minPrice} – ${maxPrice}` });
  } else if (minPrice !== '') {
    chips.push({ key: 'minPrice', label: `from ${minPrice}` });
  } else if (maxPrice !== '') {
    chips.push({ key: 'maxPrice', label: `to ${maxPrice}` });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove(chip.key)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:text-brand-300"
        >
          {chip.label}
          <span className="text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400">
            ×
          </span>
        </button>
      ))}
    </div>
  );
}

export function BrowseListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { items, total, pages, status, facets } = useAppSelector((state) => state.listings.browse);
  const { tree: categories, categoryName } = useCategories();

  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const conditionParam = searchParams.get('condition') ?? '';
  const conditions = conditionParam.split(',').filter(Boolean) as ListingCondition[];
  const explicitSort = searchParams.get('sort');
  const sort = (explicitSort ?? (q !== '' ? 'relevance' : 'newest')) as ListingSort;
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
        condition: conditionParam || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort,
      }),
    );
  }, [dispatch, page, q, category, conditionParam, minPrice, maxPrice, sort]);

  const categoryCounts = useMemo(() => {
    const leafCounts = new Map(
      (facets?.categories ?? []).map((entry) => [entry.slug, entry.count]),
    );
    const counts: Record<string, number> = {};
    const sum = (node: SafeCategory): number => {
      let total = leafCounts.get(node.slug) ?? 0;
      for (const child of node.children) total += sum(child);
      counts[node.slug] = total;
      return total;
    };
    categories.forEach(sum);
    return counts;
  }, [facets, categories]);

  const conditionCounts = useMemo(
    () =>
      Object.fromEntries((facets?.conditions ?? []).map((entry) => [entry.condition, entry.count])),
    [facets],
  );

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
    params.delete('page');
    setSearchParams(params, { replace: true });
  }

  function removeChip(key: string, value?: string) {
    if (key === 'condition') updateParam('condition', null);
    else if (key.startsWith('condition:')) {
      updateParam('condition', conditions.filter((c) => c !== key.split(':')[1]).join(',') || null);
    } else if (key === 'price') {
      updateParam('minPrice', null);
      updateParam('maxPrice', null);
    } else updateParam(key, null);
    void value;
  }

  function toggleCondition(value: ListingCondition) {
    const next = conditions.includes(value)
      ? conditions.filter((entry) => entry !== value)
      : [...conditions, value];
    updateParam('condition', next.length > 0 ? next.join(',') : null);
  }

  function clearAll() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(nextPage));
    setSearchParams(params, { replace: true });
  }

  const isLoading = status === 'idle' || status === 'loading';

  const panel = (
    <FiltersPanel
      categories={categories}
      categoryCounts={categoryCounts}
      selectedCategory={category}
      onSelectCategory={(slug) => updateParam('category', slug)}
      selectedConditions={conditions}
      conditionCounts={conditionCounts}
      onToggleCondition={toggleCondition}
      minPrice={minPrice}
      maxPrice={maxPrice}
      onMinPrice={(value) => updateParam('minPrice', value)}
      onMaxPrice={(value) => updateParam('maxPrice', value)}
      onClearAll={clearAll}
    />
  );

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
        <div className="flex w-full items-center gap-2 sm:max-w-md">
          <SearchField initial={q} onSearch={(next) => updateParam('q', next)} />
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 lg:hidden"
          >
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
            Filters
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-5 shadow-card dark:border-gray-800 dark:bg-gray-900">
            {panel}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ActiveFilterChips
              q={q}
              category={category}
              conditions={conditions}
              minPrice={minPrice}
              maxPrice={maxPrice}
              categoryName={categoryName}
              onRemove={removeChip}
            />
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
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
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: LIMIT }, (_, index) => (
                <div
                  key={index}
                  className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No listings found"
                description="Try adjusting your filters or search terms."
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
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
      </div>

      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-gray-950 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">
                  Filters
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                  aria-label="Close filters"
                >
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5">{panel}</div>
              <div className="border-t border-gray-200 p-5 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Show {total} results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
