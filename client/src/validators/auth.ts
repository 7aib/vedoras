import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number');

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'Max 50 characters'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Max 50 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: passwordSchema,
  phone: z.string().trim().max(30, 'Max 30 characters').optional(),
  location: z.string().trim().max(100, 'Max 100 characters').optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
