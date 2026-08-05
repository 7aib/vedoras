import { createServer, type Server as HttpServer } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { AddressInfo } from 'node:net';
import { io as createSocketClient, type Socket } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { closeSocket, initSocket } from '../src/socket/index.js';
import { clearDb, connectTestDb, disconnectTestDb } from './helpers/db.js';
import type { SafeConversation, SafeMessage } from '../src/types/chat.js';

const app: Express = createApp();

const baseListing = {
  title: 'Vintage bicycle for sale',
  description: 'A well maintained vintage road bike in great shape, recently serviced.',
  price: 150,
  currency: 'USD',
  category: 'vehicles',
  condition: 'good',
  location: 'Lisbon',
};

let httpServer: HttpServer;
let socketUrl: string;
const clients: Socket[] = [];

async function registerUser(): Promise<{ token: string; userId: string }> {
  const email = `chat_${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app).post('/api/v1/auth/register').send({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email,
    password: 'StrongPass123',
  });
  expect(res.status).toBe(201);
  return {
    token: res.body.data.accessToken as string,
    userId: res.body.data.user._id as string,
  };
}

async function createListing(token: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/listings')
    .set('Authorization', `Bearer ${token}`)
    .send(baseListing);
  expect(res.status).toBe(201);
  return res.body.data._id as string;
}

function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

function connectClient(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const client = createSocketClient(socketUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    client.once('connect', () => {
      clients.push(client);
      resolve(client);
    });
    client.once('connect_error', reject);
  });
}

function waitForEvent<T>(client: Socket, event: string, timeoutMs = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off(event);
      reject(new Error(`Timed out waiting for socket event "${event}"`));
    }, timeoutMs);
    client.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function emitAndAck(client: Socket, event: string, payload: unknown): Promise<unknown> {
  return new Promise((resolve) => client.emit(event, payload, resolve));
}

describe('Chat API', () => {
  beforeAll(async () => {
    await connectTestDb();
    httpServer = createServer(app);
    initSocket(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    socketUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    for (const client of clients) {
      client.close();
    }
    await closeSocket();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  describe('REST conversations', () => {
    it('creates a conversation and returns it idempotently', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const listingId = await createListing(seller.token);

      const first = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId, listingId });
      expect(first.status).toBe(200);
      expect(first.body.data.participants).toHaveLength(2);
      expect(first.body.data.listing._id).toBe(listingId);
      expect(first.body.data.unreadCount).toBe(0);
      expect(first.body.data.lastMessage).toBeNull();

      const second = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId, listingId });
      expect(second.body.data._id).toBe(first.body.data._id);
    });

    it('creates a listing-less conversation when no listing is given', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const res = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });
      expect(res.status).toBe(200);
      expect(res.body.data.listing).toBeNull();
    });

    it('rejects a conversation with yourself', async () => {
      const user = await registerUser();
      const res = await request(app)
        .post('/api/v1/conversations')
        .set(auth(user.token))
        .send({ participantId: user.userId });
      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown participant or listing', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();

      const noUser = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: '000000000000000000000000' });
      expect(noUser.status).toBe(404);

      const noListing = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId, listingId: '000000000000000000000000' });
      expect(noListing.status).toBe(404);
    });

    it('returns 400 for malformed ids', async () => {
      const user = await registerUser();
      const res = await request(app)
        .post('/api/v1/conversations')
        .set(auth(user.token))
        .send({ participantId: 'not-an-id' });
      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      const res = await request(app).post('/api/v1/conversations').send({ participantId: 'x' });
      expect(res.status).toBe(401);
    });
  });

  describe('REST messages', () => {
    async function seedConversation(): Promise<{
      buyer: { token: string; userId: string };
      seller: { token: string; userId: string };
      conversationId: string;
      listingId: string;
    }> {
      const buyer = await registerUser();
      const seller = await registerUser();
      const listingId = await createListing(seller.token);
      const res = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId, listingId });
      return { buyer, seller, conversationId: res.body.data._id as string, listingId };
    }

    it('sends a message over REST and surfaces it in the conversation', async () => {
      const { buyer, seller, conversationId } = await seedConversation();

      const send = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(auth(buyer.token))
        .send({ text: 'Is this still available?' });
      expect(send.status).toBe(201);
      expect(send.body.data.text).toBe('Is this still available?');
      expect(send.body.data.readBy).toEqual([buyer.userId]);

      const list = await request(app)
        .get(`/api/v1/conversations/${conversationId}/messages`)
        .set(auth(seller.token));
      expect(list.status).toBe(200);
      expect(list.body.data.items).toHaveLength(1);
      expect(list.body.data.items[0].sender._id).toBe(buyer.userId);
      expect(list.body.data.items[0].sender.password).toBeUndefined();

      const inbox = await request(app).get('/api/v1/conversations').set(auth(seller.token));
      expect(inbox.body.data.items[0].unreadCount).toBe(1);
      expect(inbox.body.data.items[0].lastMessage.text).toBe('Is this still available?');
    });

    it('orders messages newest first and paginates', async () => {
      const { buyer, conversationId } = await seedConversation();
      for (let i = 0; i < 3; i += 1) {
        await request(app)
          .post(`/api/v1/conversations/${conversationId}/messages`)
          .set(auth(buyer.token))
          .send({ text: `message ${i}` });
      }

      const res = await request(app)
        .get(`/api/v1/conversations/${conversationId}/messages?limit=2&page=2`)
        .set(auth(buyer.token));
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].text).toBe('message 0');
    });

    it('hides conversations and messages from non-participants', async () => {
      const { buyer, seller, conversationId } = await seedConversation();
      const stranger = await registerUser();

      const messages = await request(app)
        .get(`/api/v1/conversations/${conversationId}/messages`)
        .set(auth(stranger.token));
      expect(messages.status).toBe(404);

      await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(auth(buyer.token))
        .send({ text: 'hello' });

      const inbox = await request(app).get('/api/v1/conversations').set(auth(stranger.token));
      expect(inbox.body.data.items).toEqual([]);

      const sellerInbox = await request(app).get('/api/v1/conversations').set(auth(seller.token));
      expect(sellerInbox.body.data.items).toHaveLength(1);
    });

    it('sorts the inbox by most recent activity', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const listingId = await createListing(seller.token);

      const conv = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId, listingId });
      const second = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });

      await request(app)
        .post(`/api/v1/conversations/${second.body.data._id}/messages`)
        .set(auth(buyer.token))
        .send({ text: 'newer' });

      const inbox = await request(app).get('/api/v1/conversations').set(auth(buyer.token));
      expect(inbox.body.data.items.map((c: SafeConversation) => c._id)).toEqual([
        second.body.data._id,
        conv.body.data._id,
      ]);
    });

    it('marks incoming messages as read and reports the count', async () => {
      const { buyer, seller, conversationId } = await seedConversation();
      await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(auth(buyer.token))
        .send({ text: 'ping' });

      const read = await request(app)
        .put(`/api/v1/conversations/${conversationId}/read`)
        .set(auth(seller.token));
      expect(read.status).toBe(200);
      expect(read.body.data.count).toBe(1);

      const inbox = await request(app).get('/api/v1/conversations').set(auth(seller.token));
      expect(inbox.body.data.items[0].unreadCount).toBe(0);

      const list = await request(app)
        .get(`/api/v1/conversations/${conversationId}/messages`)
        .set(auth(seller.token));
      expect(list.body.data.items[0].readBy).toContain(seller.userId);
    });

    it('rejects an empty message and a 404 for unknown conversations', async () => {
      const { buyer, conversationId } = await seedConversation();

      const empty = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(auth(buyer.token))
        .send({ text: '   ' });
      expect(empty.status).toBe(400);

      const missing = await request(app)
        .post('/api/v1/conversations/000000000000000000000000/messages')
        .set(auth(buyer.token))
        .send({ text: 'hi' });
      expect(missing.status).toBe(404);
    });
  });

  describe('Socket gateway', () => {
    it('rejects a connection without a valid token', async () => {
      const connectPromise = new Promise<void>((resolve, reject) => {
        const client = createSocketClient(socketUrl, {
          auth: { token: 'invalid-token' },
          transports: ['websocket'],
          reconnection: false,
        });
        client.once('connect', () => {
          client.close();
          reject(new Error('Unexpectedly connected with an invalid token'));
        });
        client.once('connect_error', () => {
          client.close();
          resolve();
        });
      });
      await connectPromise;
    });

    it('delivers a message sent over the socket to both participants', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const res = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });
      const conversationId = res.body.data._id as string;

      const buyerClient = await connectClient(buyer.token);
      const sellerClient = await connectClient(seller.token);

      const sellerGotMessage = waitForEvent<{
        conversationId: string;
        message: SafeMessage;
      }>(sellerClient, 'message:new');
      const senderGotEcho = waitForEvent<{ conversationId: string; message: SafeMessage }>(
        buyerClient,
        'message:new',
      );

      const ack = (await emitAndAck(buyerClient, 'message:send', {
        conversationId,
        text: 'Hi from socket',
      })) as { ok: boolean; message: SafeMessage };
      expect(ack.ok).toBe(true);
      expect(ack.message.text).toBe('Hi from socket');

      const payload = await sellerGotMessage;
      expect(payload.conversationId).toBe(conversationId);
      expect(payload.message.sender._id).toBe(buyer.userId);

      const echo = await senderGotEcho;
      expect(echo.message.text).toBe('Hi from socket');
    });

    it('does not leak socket messages to a non-participant', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const stranger = await registerUser();
      const res = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });
      const conversationId = res.body.data._id as string;

      const strangerClient = await connectClient(stranger.token);
      let strangerGotMessage = false;
      strangerClient.on('message:new', () => {
        strangerGotMessage = true;
      });

      const buyerClient = await connectClient(buyer.token);
      const buyerGotMessage = waitForEvent<{ conversationId: string; message: SafeMessage }>(
        buyerClient,
        'message:new',
      );
      const ack = (await emitAndAck(buyerClient, 'message:send', {
        conversationId,
        text: 'private',
      })) as { ok: boolean };
      expect(ack.ok).toBe(true);

      await buyerGotMessage;
      expect(strangerGotMessage).toBe(false);
      strangerClient.off('message:new');
    });

    it('fails the ack when a non-participant tries to send', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const stranger = await registerUser();
      const res = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });
      const conversationId = res.body.data._id as string;

      const strangerClient = await connectClient(stranger.token);
      const ack = (await emitAndAck(strangerClient, 'message:send', {
        conversationId,
        text: 'sneak',
      })) as { ok: boolean };
      expect(ack.ok).toBe(false);
    });

    it('broadcasts typing to the other participant only', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const res = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });
      const conversationId = res.body.data._id as string;

      const buyerClient = await connectClient(buyer.token);
      const sellerClient = await connectClient(seller.token);

      const sellerTyping = waitForEvent<{ conversationId: string; userId: string }>(
        sellerClient,
        'typing:start',
      );
      buyerClient.emit('typing:start', conversationId);
      const payload = await sellerTyping;
      expect(payload.conversationId).toBe(conversationId);
      expect(payload.userId).toBe(buyer.userId);

      let buyerSawOwnTyping = false;
      buyerClient.on('typing:start', () => {
        buyerSawOwnTyping = true;
      });
      sellerClient.emit('typing:stop', conversationId);
      await waitForEvent(buyerClient, 'typing:stop');
      expect(buyerSawOwnTyping).toBe(false);
      buyerClient.off('typing:start');
    });

    it('emits conversation:read to participants and marks messages read', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const res = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });
      const conversationId = res.body.data._id as string;

      const buyerClient = await connectClient(buyer.token);
      const sellerClient = await connectClient(seller.token);

      await emitAndAck(buyerClient, 'message:send', { conversationId, text: 'read me' });

      const sellerSeesRead = waitForEvent<{
        conversationId: string;
        readerId: string;
        count: number;
      }>(sellerClient, 'conversation:read');
      const readAck = (await emitAndAck(sellerClient, 'message:read', conversationId)) as {
        ok: boolean;
        count: number;
      };
      expect(readAck.ok).toBe(true);
      expect(readAck.count).toBe(1);

      const payload = await sellerSeesRead;
      expect(payload.readerId).toBe(seller.userId);
      expect(payload.count).toBe(1);
    });
  });
});
