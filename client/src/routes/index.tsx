import { RouterProvider } from 'react-router';
import { router } from './router';
export function AppRoutes() {
  return <RouterProvider router={router} />;
}
