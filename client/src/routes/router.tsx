import { createBrowserRouter } from 'react-router';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RequireAuth, GuestOnly } from '@/components/auth/guards';
import { HomePage } from '@/pages/Home';
import { NotFoundPage } from '@/pages/NotFound';
import { LoginPage } from '@/pages/auth/Login';
import { RegisterPage } from '@/pages/auth/Register';
import { AccountPage } from '@/pages/Account';
import { BrowseListingsPage } from '@/pages/listings/BrowseListings';
import { ListingDetailPage } from '@/pages/listings/ListingDetail';
import { ListingFormPage } from '@/pages/listings/ListingForm';
import { FavoritesPage } from '@/pages/listings/Favorites';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'listings', element: <BrowseListingsPage /> },
      { path: 'listings/:id', element: <ListingDetailPage /> },
      {
        element: <GuestOnly />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: 'login', element: <LoginPage /> },
              { path: 'register', element: <RegisterPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: 'account', element: <AccountPage /> },
          { path: 'favorites', element: <FavoritesPage /> },
          { path: 'listings/new', element: <ListingFormPage mode="create" /> },
          { path: 'listings/:id/edit', element: <ListingFormPage mode="edit" /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
