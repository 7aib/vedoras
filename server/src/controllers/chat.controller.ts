import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getOrCreateConversation,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
} from '../services/conversation.service.js';
import type {
  CreateConversationInput,
  ListConversationsQuery,
  ListMessagesQuery,
} from '../validators/chat.validator.js';

export const createConversationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await getOrCreateConversation(req.userId!, req.body as CreateConversationInput);
    ApiResponse.send(res, 200, 'Conversation ready', result);
  },
);

export const listConversationsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await listConversations(
      req.userId!,
      req.query as unknown as ListConversationsQuery,
    );
    ApiResponse.send(res, 200, 'Conversations retrieved', result);
  },
);

export const listMessagesHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await listMessages(
      req.params.id as string,
      req.userId!,
      req.query as unknown as ListMessagesQuery,
    );
    ApiResponse.send(res, 200, 'Messages retrieved', result);
  },
);

export const sendMessageHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await sendMessage(
      req.params.id as string,
      req.userId!,
      (req.body as { text: string }).text,
    );
    ApiResponse.send(res, 201, 'Message sent', result);
  },
);

export const markReadHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await markConversationRead(req.params.id as string, req.userId!);
  ApiResponse.send(res, 200, 'Conversation marked as read', { count: result });
});
