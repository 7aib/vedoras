import { io, type Socket } from 'socket.io-client';
import type { SafeMessage } from '@/types/chat';

export type ChatSocketEvent =
  | 'connect'
  | 'disconnect'
  | 'message:new'
  | 'conversation:read'
  | 'typing:start'
  | 'typing:stop'
  | 'notification:new';

type ChatSocketListener = (payload: unknown) => void;

interface SendAck {
  ok: boolean;
  message?: SafeMessage;
  error?: string;
}

interface ReadAck {
  ok: boolean;
  count?: number;
  error?: string;
}

const socketUrl = (() => {
  const socketUrlRaw = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (socketUrlRaw) return socketUrlRaw;
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  return apiUrl ? new URL(apiUrl, window.location.origin).origin : window.location.origin;
})();

/**
 * Singleton Socket.io client for chat. Connects with the current access token,
 * fans events out to subscribers, and exposes ack-style emit helpers. The
 * connection lifecycle is driven by auth state (see SocketLifecycle).
 */
class ChatSocket {
  private socket: Socket | null = null;
  private listeners = new Map<ChatSocketEvent, Set<ChatSocketListener>>();

  private emit(event: ChatSocketEvent, payload: unknown) {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }

  on(event: ChatSocketEvent, listener: ChatSocketListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  connect(token: string): void {
    if (this.socket) {
      this.socket.auth = { token };
      this.socket.connect();
      return;
    }
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnectionAttempts: 5,
      auth: { token },
    });
    this.socket = socket;

    socket.on('connect', () => this.emit('connect', undefined));
    socket.on('disconnect', (reason) => this.emit('disconnect', reason));
    socket.on('message:new', (payload) => this.emit('message:new', payload));
    socket.on('conversation:read', (payload) => this.emit('conversation:read', payload));
    socket.on('typing:start', (payload) => this.emit('typing:start', payload));
    socket.on('typing:stop', (payload) => this.emit('typing:stop', payload));
    socket.on('notification:new', (payload) => this.emit('notification:new', payload));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  sendMessage(conversationId: string, text: string): Promise<SendAck> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ ok: false, error: 'Socket not connected' });
        return;
      }
      this.socket.emit('message:send', { conversationId, text }, (ack: SendAck) => resolve(ack));
    });
  }

  markRead(conversationId: string): Promise<ReadAck> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ ok: false, error: 'Socket not connected' });
        return;
      }
      this.socket.emit('message:read', conversationId, (ack: ReadAck) => resolve(ack));
    });
  }

  emitTyping(conversationId: string, typing: boolean): void {
    if (!this.socket?.connected) return;
    this.socket.emit(typing ? 'typing:start' : 'typing:stop', conversationId);
  }
}

export const chatSocket = new ChatSocket();
