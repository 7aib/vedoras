import { createBrowserRouter } from 'react-router';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RequireAuth, RequireAdmin, GuestOnly } from '@/components/auth/guards';
import { HomePage } from '@/pages/Home';
import { NotFoundPage } from '@/pages/NotFound';
import { LoginPage } from '@/pages/auth/Login';
import { RegisterPage } from '@/pages/auth/Register';
import { AccountPage } from '@/pages/Account';
import { BrowseListingsPage } from '@/pages/listings/BrowseListings';
import { ListingDetailPage } from '@/pages/listings/ListingDetail';
import { ListingFormPage } from '@/pages/listings/ListingForm';
import { FavoritesPage } from '@/pages/listings/Favorites';
import { InboxPage } from '@/pages/chat/Inbox';
import { ConversationPage } from '@/pages/chat/Conversation';
import { NotificationsPage } from '@/pages/notifications/Notifications';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminUsers } from '@/pages/admin/AdminUsers';
import { AdminListings } from '@/pages/admin/AdminListings';

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
          { path: 'chat', element: <InboxPage /> },
          { path: 'chat/:id', element: <ConversationPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'listings/new', element: <ListingFormPage mode="create" /> },
          { path: 'listings/:id/edit', element: <ListingFormPage mode="edit" /> },
          {
            element: <RequireAdmin />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  { index: true, path: 'admin', element: <AdminDashboard /> },
                  { path: 'admin/users', element: <AdminUsers /> },
                  { path: 'admin/listings', element: <AdminListings /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
