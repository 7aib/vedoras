import { type Ref, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function TextAreaField({ label, error, id, className, ref, ...rest }: TextAreaFieldProps) {
  const inputId = id ?? rest.name;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <textarea
        id={inputId}
        ref={ref}
        rows={4}
        aria-invalid={error ? true : undefined}
        className={cn(
          'w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 dark:bg-gray-950 dark:text-white',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100 dark:border-red-500 dark:focus:ring-red-900/50'
            : 'border-gray-300 focus:border-brand-500 focus:ring-brand-100 dark:border-gray-700 dark:focus:ring-brand-900/50',
          className,
        )}
        {...rest}
      />
      {error ? <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
