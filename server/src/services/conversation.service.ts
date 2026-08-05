import { Types } from 'mongoose';
import { Conversation, type ConversationLean } from '../models/conversation.model.js';
import { Message, type MessageLean } from '../models/message.model.js';
import { Listing, type ListingLean } from '../models/listing.model.js';
import { User, toSafeUser, type UserLean } from '../models/user.model.js';
import type {
  ConversationListing,
  PaginatedMessages,
  SafeConversation,
  SafeMessage,
} from '../types/chat.js';
import { ApiError } from '../utils/ApiError.js';

const USER_SELECT = '-password -refreshTokens';
const LISTING_PREVIEW_SELECT = 'title price currency images';

type PopulatedConversation = Omit<ConversationLean, 'participants' | 'listing'> & {
  _id: Types.ObjectId;
  participants: UserLean[];
  listing: ListingLean | null;
};

export interface PaginatedConversations {
  items: SafeConversation[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function toConversationListing(listing: ListingLean): ConversationListing {
  return {
    _id: String(listing._id),
    title: listing.title,
    price: listing.price,
    currency: listing.currency,
    image: listing.images[0] ?? null,
  };
}

function toSafeMessage(message: MessageLean & { sender: UserLean }): SafeMessage {
  return {
    _id: String(message._id),
    conversationId: String(message.conversation),
    sender: toSafeUser(message.sender),
    text: message.text,
    readBy: message.readBy.map(String),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

/** Newest message per conversation (populated sender). */
async function getLastMessages(
  conversationIds: Types.ObjectId[],
): Promise<Map<string, SafeMessage>> {
  if (conversationIds.length === 0) {
    return new Map();
  }
  const rows = await Message.aggregate<{ _id: Types.ObjectId; message: MessageLean }>([
    { $match: { conversation: { $in: conversationIds } } },
    { $sort: { createdAt: -1, _id: -1 } },
    { $group: { _id: '$conversation', message: { $first: '$$ROOT' } } },
  ]);
  if (rows.length === 0) {
    return new Map();
  }

  const senderIds = rows.map((row) => row.message.sender);
  const users = await User.find({ _id: { $in: senderIds } })
    .select(USER_SELECT)
    .lean();
  const userMap = new Map(users.map((user) => [String(user._id), user]));

  const result = new Map<string, SafeMessage>();
  for (const row of rows) {
    const sender = userMap.get(String(row.message.sender));
    if (!sender) continue;
    result.set(String(row._id), toSafeMessage({ ...row.message, sender }));
  }
  return result;
}

/** Unread messages per conversation for a given participant. */
async function getUnreadCounts(
  conversationIds: Types.ObjectId[],
  userId: string,
): Promise<Map<string, number>> {
  if (conversationIds.length === 0) {
    return new Map();
  }
  const rows = await Message.aggregate<{ _id: Types.ObjectId; count: number }>([
    {
      $match: {
        conversation: { $in: conversationIds },
        sender: { $ne: new Types.ObjectId(userId) },
        readBy: { $ne: new Types.ObjectId(userId) },
      },
    },
    { $group: { _id: '$conversation', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

function buildSafeConversation(
  conversation: PopulatedConversation,
  lastMessages: Map<string, SafeMessage>,
  unreadCounts: Map<string, number>,
): SafeConversation {
  const id = String(conversation._id);
  return {
    _id: id,
    participants: conversation.participants.map(toSafeUser),
    listing: conversation.listing ? toConversationListing(conversation.listing) : null,
    lastMessage: lastMessages.get(id) ?? null,
    unreadCount: unreadCounts.get(id) ?? 0,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function participantPair(userId: string, participantId: string): Types.ObjectId[] {
  return [new Types.ObjectId(userId), new Types.ObjectId(participantId)].sort((a, b) =>
    a.toString().localeCompare(b.toString()),
  );
}

async function loadConversation(
  filter: Record<string, unknown>,
): Promise<PopulatedConversation | null> {
  return Conversation.findOne(filter)
    .populate('participants', USER_SELECT)
    .populate('listing', LISTING_PREVIEW_SELECT)
    .lean<PopulatedConversation | null>();
}

/** Returns the conversation when the user is a participant, else throws 404. */
async function requireMembership(conversationId: string, userId: string): Promise<Types.ObjectId> {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: new Types.ObjectId(userId),
  })
    .select('_id')
    .lean();
  if (!conversation) {
    throw ApiError.notFound('Conversation not found');
  }
  return conversation._id as Types.ObjectId;
}

/**
 * Finds an existing conversation for a (user pair, listing) or creates it.
 * Returns the conversation for the requesting participant, with unread state.
 */
export async function getOrCreateConversation(
  userId: string,
  input: { participantId: string; listingId?: string },
): Promise<SafeConversation> {
  if (input.participantId === userId) {
    throw ApiError.badRequest('You cannot start a conversation with yourself');
  }

  const participant = await User.findById(input.participantId).select('_id').lean();
  if (!participant) {
    throw ApiError.notFound('User not found');
  }

  let listingId: Types.ObjectId | null = null;
  if (input.listingId) {
    const listing = await Listing.findById(input.listingId).select('_id').lean();
    if (!listing) {
      throw ApiError.notFound('Listing not found');
    }
    listingId = new Types.ObjectId(input.listingId);
  }

  const participants = participantPair(userId, input.participantId);
  const filter = { participants, listing: listingId };

  let conversation = await loadConversation(filter);
  if (!conversation) {
    await Conversation.create(filter);
    conversation = await loadConversation(filter);
  }
  if (!conversation) {
    throw new Error('Failed to create conversation');
  }

  const [lastMessages, unreadCounts] = await Promise.all([
    getLastMessages([conversation._id]),
    getUnreadCounts([conversation._id], userId),
  ]);
  return buildSafeConversation(conversation, lastMessages, unreadCounts);
}

/** Paginated list of the user's conversations, most recent activity first. */
export async function listConversations(
  userId: string,
  query: { page: number; limit: number },
): Promise<PaginatedConversations> {
  const { page, limit } = query;
  const filter = { participants: new Types.ObjectId(userId) };
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('participants', USER_SELECT)
      .populate('listing', LISTING_PREVIEW_SELECT)
      .lean<PopulatedConversation[]>(),
    Conversation.countDocuments(filter),
  ]);

  const ids = conversations.map((conversation) => conversation._id);
  const [lastMessages, unreadCounts] = await Promise.all([
    getLastMessages(ids),
    getUnreadCounts(ids, userId),
  ]);
  const items = conversations.map((conversation) =>
    buildSafeConversation(conversation, lastMessages, unreadCounts),
  );
  return { items, page, limit, total, pages: Math.ceil(total / limit) };
}

/** Paginated messages for a conversation, newest first (page 1 = most recent). */
export async function listMessages(
  conversationId: string,
  userId: string,
  query: { page: number; limit: number },
): Promise<PaginatedMessages> {
  const id = await requireMembership(conversationId, userId);
  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const filter = { conversation: id };

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', USER_SELECT)
      .lean(),
    Message.countDocuments(filter),
  ]);

  const items = (messages as unknown as (MessageLean & { sender: UserLean })[]).map(toSafeMessage);
  return { items, page, limit, total, pages: Math.ceil(total / limit) };
}

/** Persists a message and bumps the conversation's activity timestamp. */
export async function sendMessage(
  conversationId: string,
  userId: string,
  text: string,
): Promise<SafeMessage> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw ApiError.badRequest('Message text is required');
  }
  const id = await requireMembership(conversationId, userId);

  const message = await Message.create({
    conversation: id,
    sender: userId,
    text: trimmed,
    readBy: [userId],
  });
  await Conversation.updateOne({ _id: id }, { lastMessageAt: new Date() });

  const sender = await User.findById(userId).select(USER_SELECT).lean();
  if (!sender) {
    throw new Error('Sender no longer exists');
  }
  return toSafeMessage({
    _id: message._id,
    conversation: message.conversation,
    sender,
    text: message.text,
    readBy: message.readBy.map(String),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  });
}

/** Marks all incoming unread messages as read; returns how many were marked. */
export async function markConversationRead(
  conversationId: string,
  userId: string,
): Promise<number> {
  const id = await requireMembership(conversationId, userId);
  const result = await Message.updateMany(
    { conversation: id, sender: { $ne: userId }, readBy: { $ne: userId } },
    { $push: { readBy: userId } },
  );
  return result.modifiedCount ?? 0;
}

/** Participant ids of a conversation (used to route socket events). */
export async function getConversationParticipants(conversationId: string): Promise<string[]> {
  const conversation = await Conversation.findById(conversationId).select('participants').lean();
  if (!conversation) {
    throw ApiError.notFound('Conversation not found');
  }
  return conversation.participants.map(String);
}

/** Whether the user belongs to the conversation (for socket room checks). */
export async function isConversationParticipant(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const conversation = await Conversation.exists({
    _id: conversationId,
    participants: new Types.ObjectId(userId),
  });
  return Boolean(conversation);
}
