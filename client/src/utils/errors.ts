import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import type { ApiError } from '@/types/api';

/**
 * Maps a rejected API call onto react-hook-form field errors when the
 * backend reports field-level validation errors; otherwise shows a toast.
 */
export function applyFormError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fallback: string,
) {
  const payload = isAxiosError(error) ? (error.response?.data as ApiError | undefined) : undefined;
  const fieldErrors = payload?.errors?.filter((entry) => entry.field) ?? [];

  if (fieldErrors.length > 0) {
    fieldErrors.forEach(({ field, message }) => {
      setError(field as FieldPath<T>, { message });
    });
    return;
  }

  toast.error(payload?.message ?? fallback);
}
