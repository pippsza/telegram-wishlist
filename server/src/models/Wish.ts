import mongoose, { Schema, Document, Types } from 'mongoose';

export type WishPriority = 'high' | 'medium' | 'low';
export type WishStatus = 'active' | 'received';

// One alternative within an "undecided" wish (owner wants ONE of the options).
export interface IWishOption {
  label: string;
  link?: string;
  price?: string;
}

export interface IWish extends Document {
  owner: Types.ObjectId;
  description: string;
  link?: string;
  photoPath?: string;
  priority: WishPriority;
  tags: string[];
  options: IWishOption[];
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
    options: {
      type: [
        {
          _id: false,
          label: { type: String, required: true, maxlength: 200 },
          link: { type: String, maxlength: 1000 },
          price: { type: String, maxlength: 50 },
        },
      ],
      default: [],
    },
    status: { type: String, enum: ['active', 'received'], default: 'active' },
    receivedAt: { type: Date },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WishSchema.index({ owner: 1, status: 1, createdAt: -1 });

export const Wish = mongoose.model<IWish>('Wish', WishSchema);
