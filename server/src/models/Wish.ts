import mongoose, { Schema, Document, Types } from 'mongoose';

export type WishPriority = 'high' | 'medium' | 'low';
export type WishStatus = 'active' | 'received';

export interface IWish extends Document {
  owner: Types.ObjectId;
  description: string;
  link?: string;
  photoPath?: string;
  priority: WishPriority;
  tags: string[];
  status: WishStatus;
  receivedAt?: Date;
  receivedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WishSchema = new Schema<IWish>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true, maxlength: 1000 },
    link: { type: String },
    photoPath: { type: String },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    tags: [{ type: String, maxlength: 50 }],
    status: { type: String, enum: ['active', 'received'], default: 'active' },
    receivedAt: { type: Date },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WishSchema.index({ owner: 1, status: 1, createdAt: -1 });

export const Wish = mongoose.model<IWish>('Wish', WishSchema);
