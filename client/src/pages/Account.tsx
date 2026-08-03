import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out. See you soon!');
    } catch {
      // Session is cleared locally regardless of the network result.
    }
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Your account
      </h1>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-card dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-brand-600 text-lg font-bold text-white">
            {initialsOf(`${user.firstName} ${user.lastName}`)}
          </span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-gray-100 pt-6 text-sm sm:grid-cols-2 dark:border-gray-800">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Member since</dt>
            <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
              {new Date(user.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Location</dt>
            <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
              {user.location ?? 'Not set'}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
