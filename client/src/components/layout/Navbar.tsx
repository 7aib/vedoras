import { Link, NavLink, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

const navLinks = [{ to: '/listings', label: 'Browse' }];

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function Navbar() {
  const { isDark, toggle } = useDarkMode();
  const { isAuthenticated, isInitializing, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Session is cleared locally regardless of the network result.
    }
    navigate('/');
  };

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80"
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z"
              />
            </svg>
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            vedoras
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <ul className="hidden items-center gap-1 sm:flex">
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
                      isActive && 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {!isInitializing && (
            <div className="flex items-center gap-2 sm:gap-3">
              {isAuthenticated && user ? (
                <>
                  <span className="hidden text-sm font-medium text-gray-700 sm:block dark:text-gray-300">
                    Hi, {user.firstName}
                  </span>
                  <Link
                    to="/listings/new"
                    className="hidden rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:block"
                  >
                    Post ad
                  </Link>
                  <Link
                    to="/account"
                    title="Your account"
                    className="grid size-9 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                  >
                    {initialsOf(`${user.firstName} ${user.lastName}`)}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:block dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="grid size-9 place-items-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {isDark ? (
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.8"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
            ) : (
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.8"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                />
              </svg>
            )}
          </button>
        </div>
      </nav>
    </motion.header>
  );
}
