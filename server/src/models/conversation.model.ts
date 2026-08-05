import { Schema, model } from 'mongoose';

const conversationSchema = new Schema(
  {
    // Exactly two participants; stored sorted by id so the pair is canonical.
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length === 2,
        message: 'A conversation requires exactly two participants',
      },
    },
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', default: null },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One conversation per (user pair, listing). Sorted ids keep the pair unique
// regardless of who starts the chat.
conversationSchema.index({ participants: 1, listing: 1 }, { unique: true });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

export interface ConversationLean {
  _id: unknown;
  participants: unknown[];
  listing: unknown | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const Conversation = model('Conversation', conversationSchema);
