import { z } from 'zod';

export const deleteImageSchema = z.object({
  url: z.string().trim().min(1, 'Image URL is required'),
});
