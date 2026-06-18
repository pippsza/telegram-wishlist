import mongoose, { Schema, Document, Types } from 'mongoose';

export type NoteType = 'doc' | 'folder';

export interface INote extends Document {
  // Creator. Always set. Cannot be changed.
  owner: Types.ObjectId;
  // If set, the note is shared with the partner inside that Pair. Both members can read/edit.
  // If null, the note is personal and only the owner sees it.
  pair?: Types.ObjectId | null;
  // Parent folder. null/undefined means the note is at the root of its scope (private vs pair).
  parent?: Types.ObjectId | null;
  type: NoteType;
  title: string;
  // Binary Yjs document state. Only for type='doc'. Persisted by the ws layer.
  yjsState?: Buffer;
  // Plain-text projection of the doc body for search/preview. Kept in sync by the ws layer.
  plainText?: string;
  lastEditedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pair: { type: Schema.Types.ObjectId, ref: 'Pair', default: null, index: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Note', default: null, index: true },
    type: { type: String, enum: ['doc', 'folder'], required: true },
    title: { type: String, required: true, maxlength: 200, default: 'Untitled' },
    yjsState: { type: Buffer },
    plainText: { type: String, maxlength: 20000 },
    lastEditedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

NoteSchema.index({ owner: 1, pair: 1, parent: 1, updatedAt: -1 });

export const Note = mongoose.model<INote>('Note', NoteSchema);
