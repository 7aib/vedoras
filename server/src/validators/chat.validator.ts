import { z } from 'zod';

export const conversationParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id'),
});

export const createConversationSchema = z.object({
  participantId: z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid id'),
  listingId: z
    .string()
    .regex(/^[0-9a-f]{24}$/i, 'Invalid id')
    .optional(),
});

export const listConversationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export const listMessagesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1, 'Message text is required').max(2000),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesSchema>;
