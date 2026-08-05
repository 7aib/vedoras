import { Schema, model } from 'mongoose';

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
    // Users that have read this message; the sender is included on creation.
    readBy: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
  },
  { timestamps: true },
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export interface MessageLean {
  _id: unknown;
  conversation: unknown;
  sender: unknown;
  text: string;
  readBy: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export const Message = model('Message', messageSchema);
