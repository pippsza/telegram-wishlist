import { Router, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { Types } from 'mongoose';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { Note, type NoteType } from '../models/Note';
import { Pair } from '../models/Pair';
import { User } from '../models/User';
import { activePairIds, loadNoteIfAccessible, userCanAccessNote } from '../services/noteAccess';
import {
  displayName,
  getPartnerForPair,
  notifyPartnerText,
  pickLang,
  uploadsDir,
  type Lang,
} from '../services/notifications';

const router = Router();
router.use(authMiddleware);

async function ensureMemberOfPair(userId: string, pairId: string) {
  if (!Types.ObjectId.isValid(pairId)) return null;
  const pair = await Pair.findById(pairId);
  if (!pair || pair.status !== 'active') return null;
  const isUserA = pair.userA.toString() === userId;
  const isUserB = pair.userB?.toString() === userId;
  if (!isUserA && !isUserB) return null;
  return pair;
}

function noteActionText(action: 'created' | 'deleted' | 'edited', actor: string, title: string, lang: Lang): string {
  if (action === 'created') {
    return {
      ru: `📝 *${actor}* создал(а) заметку: ${title}`,
      uk: `📝 *${actor}* створив(-ла) нотатку: ${title}`,
      en: `📝 *${actor}* created a note: ${title}`,
    }[lang];
  }
  if (action === 'deleted') {
    return {
      ru: `📝 *${actor}* удалил(а) заметку: ${title}`,
      uk: `📝 *${actor}* видалив(-ла) нотатку: ${title}`,
      en: `📝 *${actor}* deleted a note: ${title}`,
    }[lang];
  }
  return {
    ru: `📝 *${actor}* редактирует заметку: ${title}`,
    uk: `📝 *${actor}* редагує нотатку: ${title}`,
    en: `📝 *${actor}* is editing a note: ${title}`,
  }[lang];
}

async function notifyPartnerAboutNote(userId: string, pairId: Types.ObjectId | string, action: 'created' | 'deleted' | 'edited', title: string) {
  try {
    const [actor, partner] = await Promise.all([
      User.findById(userId),
      getPartnerForPair(userId, pairId.toString()),
    ]);
    if (!actor || !partner) return;
    const text = noteActionText(action, displayName(actor), title || 'Untitled', pickLang(partner));
    await notifyPartnerText(partner, text);
  } catch (err) {
    console.error('Note notify error:', err);
  }
}

// Visible notes: all my private + all from pairs I belong to.
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { scope, pairId } = req.query;

    const pairIds = await activePairIds(userId);

    const filter: Record<string, unknown> = {};
    if (scope === 'private') {
      filter.owner = userId;
      filter.pair = null;
    } else if (scope === 'pair' && typeof pairId === 'string' && Types.ObjectId.isValid(pairId)) {
      const isMember = pairIds.some((id) => id.toString() === pairId);
      if (!isMember) {
        res.status(403).json({ error: 'Not a member of this pair' });
        return;
      }
      filter.pair = pairId;
    } else {
      filter.$or = [
        { owner: userId, pair: null },
        { pair: { $in: pairIds } },
      ];
    }

    const notes = await Note.find(filter, { yjsState: 0 })
      .sort({ updatedAt: -1 })
      .populate('owner', 'firstName username photoUrl')
      .populate('lastEditedBy', 'firstName username photoUrl');

    res.json({ notes });
  } catch (error) {
    console.error('List notes error:', error);
    res.status(500).json({ error: 'Failed to list notes' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const note = await loadNoteIfAccessible(req.userId!, String(req.params.id));
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    const { yjsState, ...rest } = note.toJSON() as Record<string, unknown>;
    void yjsState;
    res.json({ note: rest });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { type, title, pairId, parentId } = req.body as {
      type?: string;
      title?: string;
      pairId?: string | null;
      parentId?: string | null;
    };

    if (type !== 'doc' && type !== 'folder') {
      res.status(400).json({ error: 'type must be doc or folder' });
      return;
    }

    if (pairId) {
      const pair = await ensureMemberOfPair(userId, pairId);
      if (!pair) {
        res.status(403).json({ error: 'Not a member of this pair' });
        return;
      }
    }

    if (parentId) {
      const parent = await loadNoteIfAccessible(userId, parentId);
      if (!parent || parent.type !== 'folder') {
        res.status(400).json({ error: 'parentId must point to a folder you can access' });
        return;
      }
      // Parent and child must share the same scope.
      const parentPair = parent.pair?.toString() ?? null;
      const desiredPair = pairId ?? null;
      if (parentPair !== desiredPair) {
        res.status(400).json({ error: 'Parent folder belongs to a different scope' });
        return;
      }
    }

    const note = await Note.create({
      owner: userId,
      pair: pairId || null,
      parent: parentId || null,
      type: type as NoteType,
      title: (title || (type === 'folder' ? 'New folder' : 'Untitled')).slice(0, 200),
      lastEditedBy: userId,
    });

    res.status(201).json({ note });

    if (note.pair) {
      notifyPartnerAboutNote(userId, note.pair, 'created', note.title);
    }
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Rename, move (parent), or change sharing scope. Only owner can change sharing.
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const note = await loadNoteIfAccessible(userId, String(req.params.id));
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const { title, parentId, pairId } = req.body as {
      title?: string;
      parentId?: string | null;
      pairId?: string | null;
    };

    if (typeof title === 'string' && title.trim()) {
      note.title = title.trim().slice(0, 200);
    }

    if (pairId !== undefined && (pairId || null) !== (note.pair?.toString() ?? null)) {
      // Only the original owner can reshare a note.
      if (note.owner.toString() !== userId) {
        res.status(403).json({ error: 'Only the owner can change sharing' });
        return;
      }
      if (pairId) {
        const pair = await ensureMemberOfPair(userId, pairId);
        if (!pair) {
          res.status(403).json({ error: 'Not a member of this pair' });
          return;
        }
      }
      note.pair = pairId ? new Types.ObjectId(pairId) : null;
      // Moving across scopes means parent no longer applies.
      note.parent = null;
    }

    if (parentId !== undefined) {
      if (parentId === null || parentId === '') {
        note.parent = null;
      } else {
        const parent = await loadNoteIfAccessible(userId, parentId);
        if (!parent || parent.type !== 'folder') {
          res.status(400).json({ error: 'parentId must point to a folder' });
          return;
        }
        const parentPair = parent.pair?.toString() ?? null;
        const ownPair = note.pair?.toString() ?? null;
        if (parentPair !== ownPair) {
          res.status(400).json({ error: 'Parent belongs to a different scope' });
          return;
        }
        // Prevent cycles: walk up from new parent.
        let p: typeof parent | null = parent;
        while (p) {
          if (p._id.toString() === note._id.toString()) {
            res.status(400).json({ error: 'Cannot move a folder into itself' });
            return;
          }
          p = p.parent ? await Note.findById(p.parent) : null;
        }
        note.parent = parent._id;
      }
    }

    note.lastEditedBy = new Types.ObjectId(userId);
    await note.save();
    res.json({ note });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete a note (cascades to children if it's a folder).
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const note = await loadNoteIfAccessible(userId, String(req.params.id));
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const toDelete: Types.ObjectId[] = [note._id as Types.ObjectId];
    if (note.type === 'folder') {
      const queue: Types.ObjectId[] = [note._id as Types.ObjectId];
      while (queue.length) {
        const current = queue.shift()!;
        const children = await Note.find({ parent: current }).select('_id');
        for (const c of children) {
          toDelete.push(c._id as Types.ObjectId);
          queue.push(c._id as Types.ObjectId);
        }
      }
    }

    const wasShared = note.pair;
    const titleSnapshot = note.title;
    await Note.deleteMany({ _id: { $in: toDelete } });
    res.json({ message: 'Deleted', count: toDelete.length });

    if (wasShared) {
      notifyPartnerAboutNote(userId, wasShared, 'deleted', titleSnapshot);
    }
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Upload an image to embed inside a note. The note must be accessible.
router.post('/:id/image', upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const note = await loadNoteIfAccessible(userId, String(req.params.id));
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'image is required' });
      return;
    }
    if (note.type !== 'doc') {
      res.status(400).json({ error: 'Cannot embed images in a folder' });
      return;
    }

    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const outPath = path.join(uploadsDir(), name);
    await sharp(req.file.path)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);
    await fs.unlink(req.file.path).catch(() => {});

    res.status(201).json({ url: `/uploads/${name}`, path: name });
  } catch (error) {
    console.error('Note image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Internal helper exported for the y-websocket layer (not a route).
export { userCanAccessNote };

export default router;
