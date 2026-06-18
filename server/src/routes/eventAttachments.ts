import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { EventAttachment, type AttachmentKind } from '../models/EventAttachment';
import { CalendarEvent } from '../models/CalendarEvent';
import { Wish } from '../models/Wish';
import { GiftIdea } from '../models/GiftIdea';
import { Note } from '../models/Note';
import { Pair } from '../models/Pair';
import { userCanAccessNote } from '../services/noteAccess';

const router = Router();
router.use(authMiddleware);

const KINDS: AttachmentKind[] = ['wish', 'gift', 'note'];

// Confirm the user is a member of an active pair (any role).
async function isPairMember(userId: string, pairId: Types.ObjectId | string): Promise<boolean> {
  const pair = await Pair.findById(pairId);
  if (!pair || pair.status !== 'active') return false;
  return pair.userA.toString() === userId || pair.userB?.toString() === userId;
}

// The user must be able to read the event before they can pin to it.
async function canAccessEvent(userId: string, eventId: string) {
  if (!Types.ObjectId.isValid(eventId)) return null;
  const event = await CalendarEvent.findById(eventId);
  if (!event) return null;
  if (event.pair) {
    if (!(await isPairMember(userId, event.pair))) return null;
  } else if (event.owner.toString() !== userId) {
    return null;
  }
  return event;
}

// Wish target rules: the user owns it OR partner-shares it via an active pair.
async function canAttachWish(userId: string, targetId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(targetId)) return false;
  const wish = await Wish.findById(targetId);
  if (!wish) return false;
  if (wish.owner.toString() === userId) return true;
  const pair = await Pair.findOne({
    status: 'active',
    $or: [
      { userA: userId, userB: wish.owner },
      { userB: userId, userA: wish.owner },
    ],
  });
  return !!pair;
}

// GiftIdea is always private to the owner. Only the owner can pin one.
async function canAttachGift(userId: string, targetId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(targetId)) return false;
  const gift = await GiftIdea.findById(targetId);
  return !!gift && gift.owner.toString() === userId;
}

// Note rules: visible to the user (own private or shared via the note's pair).
async function canAttachNote(userId: string, targetId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(targetId)) return false;
  const note = await Note.findById(targetId);
  if (!note) return false;
  return userCanAccessNote(userId, note);
}

interface PopulatedAttachment {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  event: Types.ObjectId;
  kind: AttachmentKind;
  target: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// Hydrate each attachment with its target object so the client doesn't need
// a second round trip per item to render the list.
async function hydrate(attachments: PopulatedAttachment[]): Promise<PopulatedAttachment[]> {
  const wishIds: Types.ObjectId[] = [];
  const giftIds: Types.ObjectId[] = [];
  const noteIds: Types.ObjectId[] = [];
  for (const a of attachments) {
    const t = a.target as Types.ObjectId;
    if (a.kind === 'wish') wishIds.push(t);
    else if (a.kind === 'gift') giftIds.push(t);
    else if (a.kind === 'note') noteIds.push(t);
  }
  const [wishes, gifts, notes] = await Promise.all([
    wishIds.length
      ? Wish.find({ _id: { $in: wishIds } }).populate('owner', 'firstName username photoUrl')
      : Promise.resolve([]),
    giftIds.length ? GiftIdea.find({ _id: { $in: giftIds } }) : Promise.resolve([]),
    noteIds.length
      ? Note.find({ _id: { $in: noteIds } }, { yjsState: 0 })
      : Promise.resolve([]),
  ]);
  const wishMap = new Map(wishes.map((w) => [w._id.toString(), w]));
  const giftMap = new Map(gifts.map((g) => [g._id.toString(), g]));
  const noteMap = new Map(notes.map((n) => [n._id.toString(), n]));
  return attachments.map((a) => {
    const idStr = (a.target as Types.ObjectId).toString();
    let target: unknown = null;
    if (a.kind === 'wish') target = wishMap.get(idStr) ?? null;
    else if (a.kind === 'gift') target = giftMap.get(idStr) ?? null;
    else if (a.kind === 'note') target = noteMap.get(idStr) ?? null;
    return { ...a, target };
  });
}

// List my attachments on a specific event.
router.get('/calendar/:eventId/attachments', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const event = await canAccessEvent(userId, String(req.params.eventId));
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const docs = await EventAttachment.find({ owner: userId, event: event._id }).sort({ createdAt: 1 });
    const hydrated = await hydrate(docs.map((d) => d.toObject() as PopulatedAttachment));
    res.json({ attachments: hydrated });
  } catch (error) {
    console.error('List event attachments error:', error);
    res.status(500).json({ error: 'Failed to list attachments' });
  }
});

// Pin an item to an event.
router.post('/calendar/:eventId/attachments', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const event = await canAccessEvent(userId, String(req.params.eventId));
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const { kind, targetId } = req.body as { kind?: string; targetId?: string };
    if (!kind || !(KINDS as string[]).includes(kind)) {
      res.status(400).json({ error: 'Invalid kind' });
      return;
    }
    if (!targetId || !Types.ObjectId.isValid(targetId)) {
      res.status(400).json({ error: 'Invalid targetId' });
      return;
    }
    let allowed = false;
    if (kind === 'wish') allowed = await canAttachWish(userId, targetId);
    else if (kind === 'gift') allowed = await canAttachGift(userId, targetId);
    else if (kind === 'note') allowed = await canAttachNote(userId, targetId);
    if (!allowed) {
      res.status(403).json({ error: 'Cannot attach this item' });
      return;
    }
    try {
      const created = await EventAttachment.create({
        owner: userId,
        event: event._id,
        kind: kind as AttachmentKind,
        target: targetId,
      });
      const hydrated = await hydrate([created.toObject() as PopulatedAttachment]);
      res.status(201).json({ attachment: hydrated[0] });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        res.status(409).json({ error: 'Already attached' });
        return;
      }
      throw err;
    }
  } catch (error) {
    console.error('Create event attachment error:', error);
    res.status(500).json({ error: 'Failed to attach' });
  }
});

router.delete('/calendar/attachments/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const att = await EventAttachment.findOneAndDelete({ _id: String(req.params.id), owner: userId });
    if (!att) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }
    res.json({ message: 'Detached' });
  } catch (error) {
    console.error('Delete event attachment error:', error);
    res.status(500).json({ error: 'Failed to detach' });
  }
});

export default router;
