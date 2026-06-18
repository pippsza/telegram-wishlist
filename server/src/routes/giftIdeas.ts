import { Router, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { Types } from 'mongoose';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { GiftIdea, type GiftIdeaStatus } from '../models/GiftIdea';
import { Pair } from '../models/Pair';
import { uploadsDir } from '../services/notifications';

const router = Router();
router.use(authMiddleware);

const VALID_STATUSES: GiftIdeaStatus[] = ['idea', 'bought', 'gifted'];

async function ensureMemberOfPair(userId: string, pairId: string) {
  if (!Types.ObjectId.isValid(pairId)) return null;
  const pair = await Pair.findById(pairId);
  if (!pair || pair.status !== 'active') return null;
  const isUserA = pair.userA.toString() === userId;
  const isUserB = pair.userB?.toString() === userId;
  if (!isUserA && !isUserB) return null;
  return pair;
}

async function saveOptimizedPhoto(filePath: string): Promise<string> {
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  const outPath = path.join(uploadsDir(), name);
  await sharp(filePath).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(outPath);
  await fs.unlink(filePath).catch(() => {});
  return name;
}

// List all gift ideas owned by the current user. Optional filters: pairId, status.
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const filter: Record<string, unknown> = { owner: req.userId };
    const { pairId, status } = req.query;
    if (typeof pairId === 'string' && Types.ObjectId.isValid(pairId)) filter.forPair = pairId;
    if (typeof status === 'string' && (VALID_STATUSES as string[]).includes(status)) filter.status = status;

    const ideas = await GiftIdea.find(filter)
      .sort({ createdAt: -1 })
      .populate({ path: 'forPair', select: 'userA userB', populate: [
        { path: 'userA', select: 'firstName username photoUrl' },
        { path: 'userB', select: 'firstName username photoUrl' },
      ] });
    res.json({ ideas });
  } catch (error) {
    console.error('Fetch gift ideas error:', error);
    res.status(500).json({ error: 'Failed to fetch gift ideas' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const idea = await GiftIdea.findOne({ _id: req.params.id, owner: req.userId });
    if (!idea) {
      res.status(404).json({ error: 'Gift idea not found' });
      return;
    }
    res.json({ idea });
  } catch (error) {
    console.error('Fetch gift idea error:', error);
    res.status(500).json({ error: 'Failed to fetch gift idea' });
  }
});

router.post('/', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { title, body, link, price, pairId, status } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    if (!pairId || typeof pairId !== 'string') {
      res.status(400).json({ error: 'pairId is required' });
      return;
    }
    const pair = await ensureMemberOfPair(userId, pairId);
    if (!pair) {
      res.status(403).json({ error: 'Not a member of this pair' });
      return;
    }

    const photoPath = req.file ? await saveOptimizedPhoto(req.file.path) : undefined;

    const idea = await GiftIdea.create({
      owner: userId,
      forPair: pairId,
      title: title.trim().slice(0, 200),
      body: body ? String(body).slice(0, 5000) : undefined,
      link: link ? String(link).slice(0, 1000) : undefined,
      price: price ? String(price).slice(0, 50) : undefined,
      status: (VALID_STATUSES as string[]).includes(status) ? status : 'idea',
      photoPath,
    });

    res.status(201).json({ idea });
  } catch (error) {
    console.error('Create gift idea error:', error);
    res.status(500).json({ error: 'Failed to create gift idea' });
  }
});

router.put('/:id', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const idea = await GiftIdea.findOne({ _id: req.params.id, owner: userId });
    if (!idea) {
      res.status(404).json({ error: 'Gift idea not found' });
      return;
    }

    const { title, body, link, price, status, removePhoto } = req.body;

    if (typeof title === 'string' && title.trim()) idea.title = title.trim().slice(0, 200);
    if (body !== undefined) idea.body = body ? String(body).slice(0, 5000) : undefined;
    if (link !== undefined) idea.link = link ? String(link).slice(0, 1000) : undefined;
    if (price !== undefined) idea.price = price ? String(price).slice(0, 50) : undefined;
    if (typeof status === 'string' && (VALID_STATUSES as string[]).includes(status)) {
      idea.status = status as GiftIdeaStatus;
    }

    if (req.file) {
      if (idea.photoPath) {
        await fs.unlink(path.join(uploadsDir(), idea.photoPath)).catch(() => {});
      }
      idea.photoPath = await saveOptimizedPhoto(req.file.path);
    } else if (removePhoto === 'true' && idea.photoPath) {
      await fs.unlink(path.join(uploadsDir(), idea.photoPath)).catch(() => {});
      idea.photoPath = undefined;
    }

    await idea.save();
    res.json({ idea });
  } catch (error) {
    console.error('Update gift idea error:', error);
    res.status(500).json({ error: 'Failed to update gift idea' });
  }
});

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!(VALID_STATUSES as string[]).includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    const idea = await GiftIdea.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { status },
      { new: true }
    );
    if (!idea) {
      res.status(404).json({ error: 'Gift idea not found' });
      return;
    }
    res.json({ idea });
  } catch (error) {
    console.error('Update gift idea status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const idea = await GiftIdea.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!idea) {
      res.status(404).json({ error: 'Gift idea not found' });
      return;
    }
    if (idea.photoPath) {
      await fs.unlink(path.join(uploadsDir(), idea.photoPath)).catch(() => {});
    }
    res.json({ message: 'Gift idea deleted' });
  } catch (error) {
    console.error('Delete gift idea error:', error);
    res.status(500).json({ error: 'Failed to delete gift idea' });
  }
});

export default router;
