import { createBrowserRouter } from 'react-router';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RequireAuth, GuestOnly } from '@/components/auth/guards';
import { HomePage } from '@/pages/Home';
import { NotFoundPage } from '@/pages/NotFound';
import { LoginPage } from '@/pages/auth/Login';
import { RegisterPage } from '@/pages/auth/Register';
import { AccountPage } from '@/pages/Account';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
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
        children: [{ path: 'account', element: <AccountPage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
