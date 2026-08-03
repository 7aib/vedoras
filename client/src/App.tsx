import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
import { AppRoutes } from '@/routes';

export default function App() {
  return (
    <Provider store={store}>
      <AppRoutes />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '12px',
            background: 'var(--color-gray-900)',
            color: '#fff',
          },
        }}
      />
    </Provider>
  );
}
