import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAdminStats } from '@/store/slices/adminSlice';
import { PageLoader } from '@/components/auth/PageLoader';

interface StatCardProps {
  label: string;
  value: number | string;
  accent?: string;
}

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`mt-2 font-display text-3xl font-bold ${accent ?? 'text-gray-900 dark:text-white'}`}
      >
        {value}
      </p>
    </div>
  );
}

export function AdminDashboard() {
  const dispatch = useAppDispatch();
  const { data, status } = useAppSelector((state) => state.admin.stats);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAdminStats());
    }
  }, [dispatch, status]);

  if (status === 'idle' || status === 'loading' || !data) {
    return <PageLoader />;
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Dashboard
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Platform overview and moderation at a glance.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={data.users.total} accent="text-brand-600" />
        <StatCard label="Admins" value={data.users.admins} />
        <StatCard label="Conversations" value={data.conversations} />
        <StatCard label="Messages" value={data.messages} />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Listings</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total listings" value={data.listings.total} />
          <StatCard
            label="Active"
            value={data.listings.active}
            accent="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="Sold"
            value={data.listings.sold}
            accent="text-amber-600 dark:text-amber-400"
          />
          <StatCard
            label="Removed"
            value={data.listings.removed}
            accent="text-rose-600 dark:text-rose-400"
          />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Engagement</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Favorites" value={data.favorites} />
        </div>
      </div>
    </div>
  );
}
