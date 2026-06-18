import { Types } from 'mongoose';
import { Note, INote } from '../models/Note';
import { Pair } from '../models/Pair';

export interface AccessibleScope {
  pairIds: Types.ObjectId[];
}

// All pair ids the user is an active member of.
export async function activePairIds(userId: string): Promise<Types.ObjectId[]> {
  const pairs = await Pair.find({
    status: 'active',
    $or: [{ userA: userId }, { userB: userId }],
  }).select('_id');
  return pairs.map((p) => p._id);
}

// True iff the user can read/edit this note (owner of a private note, or member of its pair).
export async function userCanAccessNote(userId: string, note: Pick<INote, 'owner' | 'pair'>): Promise<boolean> {
  if (!note.pair) return note.owner.toString() === userId;
  const pair = await Pair.findById(note.pair);
  if (!pair || pair.status !== 'active') return false;
  return pair.userA.toString() === userId || pair.userB?.toString() === userId;
}

export async function loadNoteIfAccessible(userId: string, noteId: string): Promise<INote | null> {
  if (!Types.ObjectId.isValid(noteId)) return null;
  const note = await Note.findById(noteId);
  if (!note) return null;
  const ok = await userCanAccessNote(userId, note);
  return ok ? note : null;
}
