import mongoose, { Schema, Document, Types } from 'mongoose';

export type PairStatus = 'pending' | 'active' | 'declined';
export type InviteMethod = 'link' | 'username';

export interface IPair extends Document {
  userA: Types.ObjectId;
  userB?: Types.ObjectId;
  status: PairStatus;
  inviteMethod: InviteMethod;
  inviteCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PairSchema = new Schema<IPair>(
  {
    userA: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userB: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'active', 'declined'], default: 'pending' },
    inviteMethod: { type: String, enum: ['link', 'username'], required: true },
    inviteCode: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

PairSchema.index({ userA: 1, status: 1 });
PairSchema.index({ userB: 1, status: 1 });

export const Pair = mongoose.model<IPair>('Pair', PairSchema);
