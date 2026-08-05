import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchAdminListings,
  removeAdminListing,
  setListingStatus,
} from '@/store/slices/adminSlice';
import type { AdminListingStatus } from '@/types/admin';
import { Pagination } from '@/components/listings/Pagination';
import { PageLoader } from '@/components/auth/PageLoader';
import { cn } from '@/utils/cn';

const STATUSES: AdminListingStatus[] = ['active', 'sold', 'removed'];

const STATUS_STYLES: Record<AdminListingStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  sold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  removed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function AdminListings() {
  const dispatch = useAppDispatch();
  const { items, page, pages, total, status } = useAppSelector((state) => state.admin.listings);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminListingStatus>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const loadListings = (page: number) =>
    dispatch(
      fetchAdminListings({
        page,
        q: debouncedQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    );

  useEffect(() => {
    dispatch(
      fetchAdminListings({
        page: 1,
        q: debouncedQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    );
  }, [dispatch, debouncedQuery, statusFilter]);

  const handleStatusChange = async (id: string, status: AdminListingStatus) => {
    try {
      await dispatch(setListingStatus({ id, status })).unwrap();
      toast.success(`Listing marked as ${status}.`);
    } catch {
      toast.error('Could not update listing.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this listing permanently? This cannot be undone.')) return;
    try {
      await dispatch(removeAdminListing(id)).unwrap();
      toast.success('Listing deleted.');
    } catch {
      toast.error('Could not delete listing.');
    }
  };

  const isLoading = status === 'idle' || status === 'loading';

  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Listings
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Moderate or remove listings across the platform.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title…"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 sm:max-w-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <div className="flex flex-wrap gap-2">
          {(['all', ...STATUSES] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatusFilter(option)}
              className={cn(
                'rounded-xl border px-3.5 py-2 text-sm font-medium capitalize transition-colors',
                statusFilter === option
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="p-10">
            <PageLoader />
          </div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
            No listings found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Seller</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((listing) => (
                  <tr key={listing._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="max-w-xs truncate px-5 py-3">
                      <Link
                        to={`/listings/${listing._id}`}
                        className="font-medium text-gray-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
                      >
                        {listing.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {listing.seller.firstName} {listing.seller.lastName}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                      {formatPrice(listing.price)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                          STATUS_STYLES[listing.status],
                        )}
                      >
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <select
                          value={listing.status}
                          onChange={(e) =>
                            handleStatusChange(listing._id, e.target.value as AdminListingStatus)
                          }
                          className="rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        >
                          {STATUSES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDelete(listing._id)}
                          className="text-sm font-semibold text-rose-600 transition-colors hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5">
        <Pagination page={page} pages={pages} onPageChange={loadListings} />
      </div>
      <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
        {total} {total === 1 ? 'listing' : 'listings'}
      </p>
    </div>
  );
}
