import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearDetail,
  deleteListing,
  fetchListingDetail,
  fetchRelatedListings,
} from '@/store/slices/listingSlice';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { PageLoader } from '@/components/auth/PageLoader';
import { ListingCard } from '@/components/listings/ListingCard';
import { CONDITION_LABELS, formatPrice } from '@/utils/constants';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [selected, setSelected] = useState(images[0]);

  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/3] size-full place-items-center rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
        <svg
          className="size-16 text-gray-300 dark:text-gray-700"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div>
      <div className="grid aspect-[4/3] size-full place-items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
        <img src={selected} alt={title} className="size-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2">
          {images.map((image) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelected(image)}
              className={`h-16 w-20 overflow-hidden rounded-lg border-2 transition-colors ${
                image === selected
                  ? 'border-brand-600'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={image} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categoryName } = useCategories();
  const { listing, status } = useAppSelector((state) => state.listings.detail);
  const related = useAppSelector((state) => state.listings.related);

  useEffect(() => {
    if (id) {
      dispatch(fetchListingDetail(id));
      dispatch(fetchRelatedListings({ id }));
    }
    return () => {
      dispatch(clearDetail());
    };
  }, [dispatch, id]);

  const handleDelete = async () => {
    if (!listing) return;
    if (!window.confirm('Delete this listing permanently?')) return;
    try {
      await dispatch(deleteListing(listing._id)).unwrap();
      toast.success('Listing deleted');
      navigate('/account');
    } catch {
      toast.error('Unable to delete the listing. Please try again.');
    }
  };

  if (status === 'idle' || status === 'loading') {
    return <PageLoader />;
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
          Listing not found
        </h1>
        <Link
          to="/listings"
          className="mt-4 inline-block font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          Back to listings
        </Link>
      </div>
    );
  }

  const isOwner = user?._id === listing.seller._id;
  const detailRows: { label: string; value: string }[] = [
    { label: 'Condition', value: CONDITION_LABELS[listing.condition] },
    { label: 'Category', value: categoryName(listing.category) },
    ...(listing.location ? [{ label: 'Location', value: listing.location }] : []),
    { label: 'Views', value: String(listing.views) },
    {
      label: 'Posted',
      value: new Date(listing.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/listings"
        className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        ← Back to listings
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <Gallery images={listing.images} title={listing.title} />
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                {listing.status !== 'active' && (
                  <span className="mb-2 inline-block rounded-full bg-gray-900/80 px-2.5 py-1 text-xs font-semibold capitalize text-white">
                    {listing.status}
                  </span>
                )}
                <h1 className="font-display text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {listing.title}
                </h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {listing.seller.firstName} {listing.seller.lastName}
                </p>
              </div>
            </div>

            <p className="font-display mt-4 text-3xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
              {formatPrice(listing.price, listing.currency)}
            </p>

            <dl className="mt-6 space-y-3 border-t border-gray-100 pt-6 text-sm dark:border-gray-800">
              {detailRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">{row.label}</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{row.value}</dd>
                </div>
              ))}
            </dl>

            {isOwner && listing.status === 'active' && (
              <div className="mt-6 flex gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
                <Link
                  to={`/listings/${listing._id}/edit`}
                  className="flex-1 rounded-xl bg-brand-600 px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Edit listing
                </Link>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Seller</h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {initialsOf(`${listing.seller.firstName} ${listing.seller.lastName}`)}
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {listing.seller.firstName} {listing.seller.lastName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{listing.seller.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-card dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Description</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          {listing.description}
        </p>
      </div>

      {related.items.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Similar listings
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.items.map((item) => (
              <ListingCard key={item._id} listing={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
