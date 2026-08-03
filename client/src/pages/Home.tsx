import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useCategories } from '@/hooks/useCategories';

const steps = [
  {
    title: 'Create an account',
    description: 'Sign up in seconds and manage your listings from one place.',
  },
  {
    title: 'Post your ad',
    description: 'Add photos, a price and a description. It goes live instantly.',
  },
  {
    title: 'Chat & sell',
    description: 'Buyers message you in real time. Close the deal safely.',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { tree: categories } = useCategories();

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(query.trim() ? `/listings?q=${encodeURIComponent(query.trim())}` : '/listings');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6 py-16 text-center sm:py-24"
      >
        <span className="rounded-full bg-brand-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-900 dark:text-brand-300">
          Milestone 6 · Images & Categories
        </span>
        <h1 className="font-display max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          Buy and sell anything
          <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
            {' '}
            nearby
          </span>
        </h1>
        <p className="max-w-xl text-pretty text-lg text-gray-600 dark:text-gray-400">
          The marketplace for your neighborhood. Post a listing in minutes and chat with buyers in
          real time.
        </p>

        <div className="mt-4 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-card dark:border-gray-800 dark:bg-gray-900">
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
          <form onSubmit={search} className="flex w-full items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
        </div>
      </motion.section>

      {/* Categories */}
      <section className="py-8" aria-label="Browse categories">
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">
          Browse categories
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/listings?category=${category.slug}`}
                className="block rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover dark:border-gray-800 dark:bg-gray-900"
              >
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {category.name}
                </span>
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  Browse now
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16" aria-label="How it works">
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">
          How it works
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="font-display text-sm font-bold text-brand-600 dark:text-brand-400">
                0{index + 1}
              </span>
              <h3 className="mt-2 font-semibold text-gray-900 dark:text-white">{step.title}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
