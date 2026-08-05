import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { AppRoutes } from '@/routes';
import { router } from '@/routes/router';
import { fetchMe, setUnauthenticated } from '@/store/slices/authSlice';
import { authBus, tokenStorage } from '@/services/tokenStorage';
import { SocketLifecycle } from '@/components/chat/SocketLifecycle';

function AuthBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (tokenStorage.getAccessToken()) {
      dispatch(fetchMe());
    } else {
      dispatch(setUnauthenticated());
    }

    const unsubscribe = authBus.subscribe(() => {
      router.navigate('/login', { replace: true });
    });
    return unsubscribe;
  }, [dispatch]);

  return null;
}

export default function App() {
  return (
    <Provider store={store}>
      <AuthBootstrap />
      <SocketLifecycle />
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
