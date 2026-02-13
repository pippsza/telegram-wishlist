import { Router, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { Wish } from '../models/Wish';
import { Pair } from '../models/Pair';

const router = Router();
router.use(authMiddleware);

// Get own wishes
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'active', tag, priority, page = '1', limit = '20' } = req.query;
    const filter: Record<string, unknown> = { owner: req.userId, status };

    if (tag) filter.tags = tag;
    if (priority) filter.priority = priority;

    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    const [wishes, total] = await Promise.all([
      Wish.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit as string, 10)),
      Wish.countDocuments(filter),
    ]);

    res.json({ wishes, total, page: parseInt(page as string, 10), limit: parseInt(limit as string, 10) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wishes' });
  }
});

// Get archived wishes
router.get('/archive', async (req: AuthRequest, res: Response) => {
  try {
    const wishes = await Wish.find({ owner: req.userId, status: 'received' })
      .sort({ receivedAt: -1 })
      .populate('receivedBy', 'firstName username photoUrl');
    res.json({ wishes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch archive' });
  }
});

// Get partner's wishes in a pair
router.get('/partner/:pairId', async (req: AuthRequest, res: Response) => {
  try {
    const pair = await Pair.findById(req.params.pairId);
    if (!pair || pair.status !== 'active') {
      res.status(404).json({ error: 'Pair not found' });
      return;
    }

    const userId = req.userId!;
    const isUserA = pair.userA.toString() === userId;
    const isUserB = pair.userB?.toString() === userId;
    if (!isUserA && !isUserB) {
      res.status(403).json({ error: 'Not a member of this pair' });
      return;
    }

    const partnerId = isUserA ? pair.userB : pair.userA;
    const wishes = await Wish.find({ owner: partnerId, status: 'active' }).sort({ createdAt: -1 });
    res.json({ wishes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch partner wishes' });
  }
});

// Create wish
router.post('/', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const { description, link, priority, tags } = req.body;
    if (!description) {
      res.status(400).json({ error: 'Description is required' });
      return;
    }

    let photoPath: string | undefined;
    if (req.file) {
      const optimizedName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const optimizedPath = path.join(__dirname, '../../uploads', optimizedName);
      await sharp(req.file.path)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(optimizedPath);
      await fs.unlink(req.file.path);
      photoPath = optimizedName;
    }

    const wish = await Wish.create({
      owner: req.userId,
      description,
      link,
      photoPath,
      priority: priority || 'medium',
      tags: tags ? JSON.parse(tags) : [],
    });

    res.status(201).json({ wish });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create wish' });
  }
});

// Update wish
router.put('/:id', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const wish = await Wish.findOne({ _id: req.params.id, owner: req.userId });
    if (!wish) {
      res.status(404).json({ error: 'Wish not found' });
      return;
    }

    const { description, link, priority, tags, removePhoto } = req.body;
    if (description) wish.description = description;
    if (link !== undefined) wish.link = link || undefined;
    if (priority) wish.priority = priority;
    if (tags) wish.tags = JSON.parse(tags);

    if (req.file) {
      // Delete old photo
      if (wish.photoPath) {
        await fs.unlink(path.join(__dirname, '../../uploads', wish.photoPath)).catch(() => {});
      }
      const optimizedName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const optimizedPath = path.join(__dirname, '../../uploads', optimizedName);
      await sharp(req.file.path)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(optimizedPath);
      await fs.unlink(req.file.path);
      wish.photoPath = optimizedName;
    } else if (removePhoto === 'true' && wish.photoPath) {
      await fs.unlink(path.join(__dirname, '../../uploads', wish.photoPath)).catch(() => {});
      wish.photoPath = undefined;
    }

    await wish.save();
    res.json({ wish });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update wish' });
  }
});

// Delete wish
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const wish = await Wish.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!wish) {
      res.status(404).json({ error: 'Wish not found' });
      return;
    }

    if (wish.photoPath) {
      await fs.unlink(path.join(__dirname, '../../uploads', wish.photoPath)).catch(() => {});
    }

    res.json({ message: 'Wish deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete wish' });
  }
});

// Mark wish as received
router.patch('/:id/receive', async (req: AuthRequest, res: Response) => {
  try {
    const wish = await Wish.findById(req.params.id);
    if (!wish) {
      res.status(404).json({ error: 'Wish not found' });
      return;
    }

    // Check the current user is either the owner or a partner
    const userId = req.userId!;
    if (wish.owner.toString() !== userId) {
      const pair = await Pair.findOne({
        status: 'active',
        $or: [
          { userA: userId, userB: wish.owner },
          { userB: userId, userA: wish.owner },
        ],
      });
      if (!pair) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }
    }

    wish.status = 'received';
    wish.receivedAt = new Date();
    wish.receivedBy = userId as any;
    await wish.save();

    res.json({ wish });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark wish as received' });
  }
});

export default router;
