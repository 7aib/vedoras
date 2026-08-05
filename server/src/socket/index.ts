import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { User, toSafeUser, type UserLean } from '../models/user.model.js';
import {
  getConversationParticipants,
  isConversationParticipant,
  markConversationRead,
  sendMessage,
} from '../services/conversation.service.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

let io: Server | null = null;

/** Rejects the handshake unless a valid access token is presented. */
async function authenticateSocket(socket: Socket, next: (err?: Error) => void): Promise<void> {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      throw ApiError.unauthorized('Authentication required');
    }
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('-password -refreshTokens').lean();
    if (!user) {
      throw ApiError.unauthorized('Account no longer exists');
    }
    socket.data.userId = String(user._id);
    socket.data.user = toSafeUser(user);
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error('Authentication failed'));
  }
}

function ackFailure(ack: ((response: unknown) => void) | undefined, error: unknown): void {
  if (!ack) return;
  ack({
    ok: false,
    error: error instanceof ApiError ? error.message : 'Failed to process event',
  });
}

function registerHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;
  socket.join(`user:${userId}`);

  socket.on('message:send', async (payload, ack?: (response: unknown) => void) => {
    try {
      const conversationId = String(payload?.conversationId ?? '');
      const text = String(payload?.text ?? '');
      if (!conversationId || !text) {
        throw ApiError.badRequest('conversationId and text are required');
      }
      const message = await sendMessage(conversationId, userId, text);
      const participants = await getConversationParticipants(conversationId);
      for (const participant of participants) {
        io.to(`user:${participant}`).emit('message:new', { conversationId, message });
      }
      ack?.({ ok: true, message });
    } catch (error) {
      ackFailure(ack, error);
    }
  });

  socket.on('message:read', async (conversationId, ack?: (response: unknown) => void) => {
    try {
      const id = String(conversationId ?? '');
      if (!id) {
        throw ApiError.badRequest('conversationId is required');
      }
      const count = await markConversationRead(id, userId);
      const participants = await getConversationParticipants(id);
      for (const participant of participants) {
        io.to(`user:${participant}`).emit('conversation:read', {
          conversationId: id,
          readerId: userId,
          count,
        });
      }
      ack?.({ ok: true, count });
    } catch (error) {
      ackFailure(ack, error);
    }
  });

  async function broadcastTyping(conversationId: string, event: string): Promise<void> {
    const id = String(conversationId ?? '');
    if (!id || !(await isConversationParticipant(id, userId))) {
      return;
    }
    const participants = await getConversationParticipants(id);
    for (const participant of participants) {
      if (participant !== userId) {
        io.to(`user:${participant}`).emit(event, { conversationId: id, userId });
      }
    }
  }

  socket.on('typing:start', (conversationId) => {
    void broadcastTyping(conversationId, 'typing:start');
  });

  socket.on('typing:stop', (conversationId) => {
    void broadcastTyping(conversationId, 'typing:stop');
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected user=${userId}`);
  });

  const user = socket.data.user as UserLean;
  logger.info(`Socket connected user=${userId} (${user.firstName} ${user.lastName})`);
}

/** Attaches the Socket.io server to an existing HTTP server. */
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.NODE_ENV === 'development' ? true : env.CLIENT_URL.split(','),
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });
  io.use(authenticateSocket);
  io.on('connection', (socket) => registerHandlers(io!, socket));
  logger.info('Socket.io initialized');
  return io;
}

export function getSocketServer(): Server | null {
  return io;
}

/** Gracefully shuts down the socket server (also closes the HTTP server). */
export function closeSocket(): Promise<void> {
  if (!io) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    io!.close(() => resolve());
  });
}
