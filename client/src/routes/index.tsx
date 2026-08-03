import { createBrowserRouter, RouterProvider } from 'react-router';
import { PublicLayout } from '@/layouts/PublicLayout';
import { HomePage } from '@/pages/Home';
import { NotFoundPage } from '@/pages/NotFound';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
