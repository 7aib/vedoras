import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { TextField } from '@/components/form/TextField';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, type LoginFormValues } from '@/validators/auth';
import { applyFormError } from '@/utils/errors';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (error) {
      applyFormError(error, setError, 'Unable to log in. Please try again.');
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Log in
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        New here?{' '}
        <Link
          to="/register"
          className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Create an account
        </Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
