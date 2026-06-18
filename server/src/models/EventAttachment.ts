import mongoose, { Schema, Document, Types } from 'mongoose';

export type AttachmentKind = 'wish' | 'gift' | 'note';

export interface IEventAttachment extends Document {
  // Always scoped to the owner who pinned the item, even on a shared event.
  // The partner never sees the owner's attachments.
  owner: Types.ObjectId;
  event: Types.ObjectId;
  kind: AttachmentKind;
  // ObjectId into Wish, GiftIdea, or Note depending on `kind`.
  target: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventAttachmentSchema = new Schema<IEventAttachment>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: 'CalendarEvent', required: true, index: true },
    kind: { type: String, enum: ['wish', 'gift', 'note'], required: true },
    target: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

// Avoid duplicate pins of the same item to the same event by the same owner.
EventAttachmentSchema.index({ owner: 1, event: 1, kind: 1, target: 1 }, { unique: true });
EventAttachmentSchema.index({ owner: 1, event: 1 });

export const EventAttachment = mongoose.model<IEventAttachment>('EventAttachment', EventAttachmentSchema);
