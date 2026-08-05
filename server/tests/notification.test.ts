import { createServer, type Server as HttpServer } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { AddressInfo } from 'node:net';
import { io as createSocketClient, type Socket } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { closeSocket, initSocket } from '../src/socket/index.js';
import { clearDb, connectTestDb, disconnectTestDb } from './helpers/db.js';
import type { SafeNotification } from '../src/types/notification.js';

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

async function registerUser(): Promise<{ token: string; userId: string; name: string }> {
  const email = `notify_${Math.random().toString(36).slice(2)}@example.com`;
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
    name: `${res.body.data.user.firstName} ${res.body.data.user.lastName}` as string,
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

describe('Notifications API', () => {
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

  describe('triggers', () => {
    it('notifies the recipient (not the sender) when a message is sent', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const conv = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });

      await request(app)
        .post(`/api/v1/conversations/${conv.body.data._id}/messages`)
        .set(auth(buyer.token))
        .send({ text: 'Is this still available?' });

      const sellerNotifications = await request(app)
        .get('/api/v1/notifications')
        .set(auth(seller.token));
      expect(sellerNotifications.body.data.items).toHaveLength(1);
      const notification = sellerNotifications.body.data.items[0];
      expect(notification.type).toBe('message');
      expect(notification.title).toBe(`New message from ${buyer.name}`);
      expect(notification.data.conversationId).toBe(conv.body.data._id);
      expect(notification.read).toBe(false);

      const buyerNotifications = await request(app)
        .get('/api/v1/notifications')
        .set(auth(buyer.token));
      expect(buyerNotifications.body.data.items).toEqual([]);
    });

    it('notifies favoriters (not the owner) when a listing is marked sold', async () => {
      const owner = await registerUser();
      const fan = await registerUser();
      const listingId = await createListing(owner.token);
      await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(fan.token));

      const sold = await request(app)
        .patch(`/api/v1/listings/${listingId}`)
        .set(auth(owner.token))
        .send({ status: 'sold' });
      expect(sold.status).toBe(200);

      const fanNotifications = await request(app).get('/api/v1/notifications').set(auth(fan.token));
      expect(fanNotifications.body.data.items).toHaveLength(1);
      const notification = fanNotifications.body.data.items[0];
      expect(notification.type).toBe('listing_sold');
      expect(notification.data.listingId).toBe(listingId);
      expect(notification.body).toContain('saved');

      const ownerNotifications = await request(app)
        .get('/api/v1/notifications')
        .set(auth(owner.token));
      expect(ownerNotifications.body.data.items).toEqual([]);
    });

    it('does not notify when a listing is marked active or stays the same', async () => {
      const owner = await registerUser();
      const fan = await registerUser();
      const listingId = await createListing(owner.token);
      await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(fan.token));

      const noop = await request(app)
        .patch(`/api/v1/listings/${listingId}`)
        .set(auth(owner.token))
        .send({ price: 200 });
      expect(noop.status).toBe(200);

      const fanNotifications = await request(app).get('/api/v1/notifications').set(auth(fan.token));
      expect(fanNotifications.body.data.items).toEqual([]);
    });

    it('notifies each favoriter for a removed listing', async () => {
      const owner = await registerUser();
      const first = await registerUser();
      const second = await registerUser();
      const listingId = await createListing(owner.token);
      await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(first.token));
      await request(app).put(`/api/v1/favorites/${listingId}`).set(auth(second.token));

      const removed = await request(app)
        .patch(`/api/v1/listings/${listingId}`)
        .set(auth(owner.token))
        .send({ status: 'removed' });
      expect(removed.status).toBe(200);

      for (const fan of [first, second]) {
        const res = await request(app).get('/api/v1/notifications').set(auth(fan.token));
        expect(res.body.data.items[0].type).toBe('listing_removed');
      }
    });
  });

  describe('list & read state', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('lists notifications newest first with unread counts and pagination', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const conv = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });

      for (let i = 0; i < 3; i += 1) {
        await request(app)
          .post(`/api/v1/conversations/${conv.body.data._id}/messages`)
          .set(auth(buyer.token))
          .send({ text: `message ${i}` });
      }

      const res = await request(app).get('/api/v1/notifications?limit=2').set(auth(seller.token));
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.unreadCount).toBe(3);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.items[0].body).toBe('message 2');
    });

    it('marks a single notification as read idempotently', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const conv = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });
      await request(app)
        .post(`/api/v1/conversations/${conv.body.data._id}/messages`)
        .set(auth(buyer.token))
        .send({ text: 'hi' });

      const list = await request(app).get('/api/v1/notifications').set(auth(seller.token));
      const id = list.body.data.items[0]._id as string;

      const first = await request(app)
        .put(`/api/v1/notifications/${id}/read`)
        .set(auth(seller.token));
      expect(first.status).toBe(200);
      expect(first.body.data.read).toBe(true);

      const second = await request(app)
        .put(`/api/v1/notifications/${id}/read`)
        .set(auth(seller.token));
      expect(second.body.data.read).toBe(true);

      const after = await request(app).get('/api/v1/notifications').set(auth(seller.token));
      expect(after.body.data.unreadCount).toBe(0);
    });

    it('returns 404 when marking an unknown or foreign notification', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const conv = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });
      await request(app)
        .post(`/api/v1/conversations/${conv.body.data._id}/messages`)
        .set(auth(buyer.token))
        .send({ text: 'hi' });

      const list = await request(app).get('/api/v1/notifications').set(auth(seller.token));
      const id = list.body.data.items[0]._id as string;

      const missing = await request(app)
        .put('/api/v1/notifications/000000000000000000000000/read')
        .set(auth(seller.token));
      expect(missing.status).toBe(404);

      const foreign = await request(app)
        .put(`/api/v1/notifications/${id}/read`)
        .set(auth(buyer.token));
      expect(foreign.status).toBe(404);
    });

    it('marks all notifications as read', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const conv = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });
      for (let i = 0; i < 2; i += 1) {
        await request(app)
          .post(`/api/v1/conversations/${conv.body.data._id}/messages`)
          .set(auth(buyer.token))
          .send({ text: `msg ${i}` });
      }

      const readAll = await request(app)
        .put('/api/v1/notifications/read-all')
        .set(auth(seller.token));
      expect(readAll.status).toBe(200);
      expect(readAll.body.data.count).toBe(2);

      const after = await request(app).get('/api/v1/notifications').set(auth(seller.token));
      expect(after.body.data.unreadCount).toBe(0);
      expect(after.body.data.items.every((item: SafeNotification) => item.read)).toBe(true);
    });
  });

  describe('socket delivery', () => {
    it('pushes notification:new to the recipient in real time', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const conv = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });
      const conversationId = conv.body.data._id as string;

      const sellerClient = await connectClient(seller.token);
      const notificationPromise = waitForEvent<SafeNotification>(sellerClient, 'notification:new');

      await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(auth(buyer.token))
        .send({ text: 'live ping' });

      const notification = await notificationPromise;
      expect(notification.type).toBe('message');
      expect(notification.data.conversationId).toBe(conversationId);
      expect(notification.read).toBe(false);
    });

    it('does not push a notification to the actor', async () => {
      const buyer = await registerUser();
      const seller = await registerUser();
      const conv = await request(app)
        .post('/api/v1/conversations')
        .set(auth(buyer.token))
        .send({ participantId: seller.userId });

      const buyerClient = await connectClient(buyer.token);
      let buyerGotNotification = false;
      buyerClient.on('notification:new', () => {
        buyerGotNotification = true;
      });

      await request(app)
        .post(`/api/v1/conversations/${conv.body.data._id}/messages`)
        .set(auth(buyer.token))
        .send({ text: 'echo' });

      // Give the server a tick to deliver anything it shouldn't.
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(buyerGotNotification).toBe(false);
      buyerClient.off('notification:new');
    });
  });
});
