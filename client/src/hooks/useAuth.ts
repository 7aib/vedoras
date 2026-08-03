import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login, logout, register } from '@/store/slices/authSlice';
import type { LoginInput, RegisterInput } from '@/types/auth';

export function useAuth() {
  const { user, accessToken, status } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  return {
    user,
    accessToken,
    status,
    isAuthenticated: status === 'authenticated',
    isInitializing: status === 'idle' || status === 'loading',
    login: (input: LoginInput) => dispatch(login(input)).unwrap(),
    register: (input: RegisterInput) => dispatch(register(input)).unwrap(),
    logout: () => dispatch(logout()).unwrap(),
  };
}
