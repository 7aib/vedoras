import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAdminUsers, setUserRole } from '@/store/slices/adminSlice';
import { Pagination } from '@/components/listings/Pagination';
import { PageLoader } from '@/components/auth/PageLoader';
import { cn } from '@/utils/cn';

const ROLE_LABELS = {
  user: 'User',
  admin: 'Admin',
} as const;

export function AdminUsers() {
  const dispatch = useAppDispatch();
  const { items, page, pages, total, status } = useAppSelector((state) => state.admin.users);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    dispatch(
      fetchAdminUsers({
        page: 1,
        q: debouncedQuery || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
      }),
    );
  }, [dispatch, debouncedQuery, roleFilter]);

  const loadUsers = (page: number) =>
    dispatch(
      fetchAdminUsers({
        page,
        q: debouncedQuery || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
      }),
    );

  const handleRoleToggle = async (id: string, currentRole: 'user' | 'admin') => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await dispatch(setUserRole({ id, role: nextRole })).unwrap();
      toast.success(nextRole === 'admin' ? 'User promoted to admin.' : 'User demoted to member.');
    } catch {
      toast.error('Could not update role.');
    }
  };

  const isLoading = status === 'idle' || status === 'loading';

  return (
    <div>
      <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Users
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage members and admins of Vedoras.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 sm:max-w-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <div className="flex gap-2">
          {(['all', 'user', 'admin'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRoleFilter(option)}
              className={cn(
                'rounded-xl border px-3.5 py-2 text-sm font-medium capitalize transition-colors',
                roleFilter === option
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
              )}
            >
              {option === 'all' ? 'All roles' : option}
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
            No users found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{user.email}</td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          user.role === 'admin'
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
                        )}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRoleToggle(user._id, user.role)}
                        className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        {user.role === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5">
        <Pagination page={page} pages={pages} onPageChange={loadUsers} />
      </div>
      <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
        {total} {total === 1 ? 'user' : 'users'}
      </p>
    </div>
  );
}
