import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { TextField } from '@/components/form/TextField';
import { useAuth } from '@/hooks/useAuth';
import { registerSchema, type RegisterFormValues } from '@/validators/auth';
import { applyFormError } from '@/utils/errors';

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      location: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerAccount({
        ...values,
        phone: values.phone || undefined,
        location: values.location || undefined,
      });
      toast.success('Account created. Welcome to vedoras!');
      navigate('/account', { replace: true });
    } catch (error) {
      applyFormError(error, setError, 'Unable to create your account. Please try again.');
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Log in
        </Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="First name"
            autoComplete="given-name"
            placeholder="Jane"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <TextField
            label="Last name"
            autoComplete="family-name"
            placeholder="Doe"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>
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
          autoComplete="new-password"
          placeholder="At least 8 characters with upper, lower and number"
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          placeholder="+1 555 000 0000"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <TextField
          label="Location (optional)"
          autoComplete="off"
          placeholder="City, neighborhood"
          error={errors.location?.message}
          {...register('location')}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
