import mongoose, { Schema, Document, Types } from 'mongoose';

export type GiftIdeaStatus = 'idea' | 'bought' | 'gifted';

export interface IGiftIdea extends Document {
  // Owner is the ONLY person who can see/edit this idea. Never shared.
  owner: Types.ObjectId;
  // Pair the gift is intended for (i.e. the friend the gift is for).
  forPair: Types.ObjectId;
  title: string;
  body?: string;
  link?: string;
  price?: string;
  status: GiftIdeaStatus;
  photoPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GiftIdeaSchema = new Schema<IGiftIdea>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    forPair: { type: Schema.Types.ObjectId, ref: 'Pair', required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, maxlength: 5000 },
    link: { type: String, maxlength: 1000 },
    price: { type: String, maxlength: 50 },
    status: { type: String, enum: ['idea', 'bought', 'gifted'], default: 'idea' },
    photoPath: { type: String },
  },
  { timestamps: true }
);

GiftIdeaSchema.index({ owner: 1, forPair: 1, status: 1, createdAt: -1 });

export const GiftIdea = mongoose.model<IGiftIdea>('GiftIdea', GiftIdeaSchema);
