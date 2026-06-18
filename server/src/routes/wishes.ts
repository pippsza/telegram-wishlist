import { Router, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { Wish } from '../models/Wish';
import { Pair } from '../models/Pair';
import { User } from '../models/User';
import {
  sendTgMessage,
  sendTgPhoto,
  getPartnerIds,
  displayName,
  pickLang,
  uploadsDir,
} from '../services/notifications';

const router = Router();
router.use(authMiddleware);

type WishOptionInput = { label: string; link?: string; price?: string };

// Parse the options[] array coming from the multipart form (JSON string), keep only valid entries.
function parseOptions(raw: unknown): WishOptionInput[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((o) => o && typeof o.label === 'string' && o.label.trim())
      .map((o) => ({
        label: String(o.label).trim().slice(0, 200),
        link: o.link ? String(o.link).trim().slice(0, 1000) : undefined,
        price: o.price ? String(o.price).trim().slice(0, 50) : undefined,
      }));
  } catch {
    return [];
  }
}

// Render options as an "either/or" block for Telegram messages.
const OPTIONS_HEADER: Record<string, string> = {
  ru: 'Варианты (выбрать одно):',
  uk: 'Варіанти (обрати одне):',
  en: 'Options (choose one):',
};
function optionsText(options: WishOptionInput[] | undefined, lang = 'en'): string {
  if (!options || options.length === 0) return '';
  const header = OPTIONS_HEADER[lang] || OPTIONS_HEADER.en;
  const lines = options.map((o) => {
    const price = o.price ? ` - ${o.price}` : '';
    const link = o.link ? ` (${o.link})` : '';
    return `• ${o.label}${price}${link}`;
  });
  return `\n\n${header}\n${lines.join('\n')}`;
}

// Notify all active-pair partners about a new wish (fire-and-forget).
async function notifyPartners(userId: string, wish: { description: string; photoPath?: string; priority: string; tags: string[]; link?: string; options?: WishOptionInput[] }) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const partnerIds = await getPartnerIds(userId);
    if (partnerIds.length === 0) return;

    const partners = await User.find({ _id: { $in: partnerIds } });
    if (partners.length === 0) return;

    const priorityEmoji: Record<string, string> = { high: '🔴', medium: '🟡', low: '🔵' };
    const name = displayName(user);
    const tagsStr = wish.tags.length ? `\n${wish.tags.map((t) => `#${t}`).join(' ')}` : '';
    const linkStr = wish.link ? `\n🔗 ${wish.link}` : '';

    for (const partner of partners) {
      try {
        const lang = pickLang(partner);
        const captions: Record<string, string> = {
          ru: `🎁 *${name}* добавил(а) в вишлист:`,
          uk: `🎁 *${name}* додав(-ла) у вішліст:`,
          en: `🎁 *${name}* added to wishlist:`,
        };
        const optionsStr = optionsText(wish.options, lang);
        const caption = `${captions[lang]}\n\n${priorityEmoji[wish.priority] || '🟡'} ${wish.description}${optionsStr}${linkStr}${tagsStr}`;

        if (wish.photoPath) {
          const photoFilePath = path.join(uploadsDir(), wish.photoPath);
          try {
            await fs.access(photoFilePath);
            await sendTgPhoto(partner.telegramId, photoFilePath, caption);
          } catch {
            await sendTgMessage(partner.telegramId, caption);
          }
        } else {
          await sendTgMessage(partner.telegramId, caption);
        }
      } catch (err) {
        console.error(`Failed to notify partner ${partner.telegramId}:`, err);
      }
    }
  } catch (err) {
    console.error('Notify partners error:', err);
  }
}

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
    console.error('Fetch wishes error:', error);
    res.status(500).json({ error: 'Failed to fetch wishes' });
  }
});

// Get archived wishes (own only)
router.get('/archive', async (req: AuthRequest, res: Response) => {
  try {
    const wishes = await Wish.find({ owner: req.userId, status: 'received' })
      .sort({ receivedAt: -1 })
      .populate('receivedBy', 'firstName username photoUrl');
    res.json({ wishes });
  } catch (error) {
    console.error('Archive error:', error);
    res.status(500).json({ error: 'Failed to fetch archive' });
  }
});

// Get archive for all (own + partners)
router.get('/archive/all', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const partnerIds = await getPartnerIds(userId);

    const [own, partners] = await Promise.all([
      Wish.find({ owner: userId, status: 'received' })
        .sort({ receivedAt: -1 })
        .populate('receivedBy', 'firstName username photoUrl'),
      partnerIds.length > 0
        ? Wish.find({ owner: { $in: partnerIds }, status: 'received' })
            .sort({ receivedAt: -1 })
            .populate('owner', 'firstName username photoUrl')
            .populate('receivedBy', 'firstName username photoUrl')
        : Promise.resolve([]),
    ]);

    res.json({ own, partners });
  } catch (error) {
    console.error('Archive all error:', error);
    res.status(500).json({ error: 'Failed to fetch archive' });
  }
});

// Get all partners' active wishes
router.get('/partners', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const partnerIds = await getPartnerIds(userId);

    if (partnerIds.length === 0) {
      res.json({ wishes: [] });
      return;
    }

    const wishes = await Wish.find({ owner: { $in: partnerIds }, status: 'active' })
      .sort({ createdAt: -1 })
      .populate('owner', 'firstName lastName username photoUrl');

    res.json({ wishes });
  } catch (error) {
    console.error('Partner wishes error:', error);
    res.status(500).json({ error: 'Failed to fetch partner wishes' });
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
    console.error('Partner pair wishes error:', error);
    res.status(500).json({ error: 'Failed to fetch partner wishes' });
  }
});

// Get single wish by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const wish = await Wish.findOne({ _id: req.params.id, owner: req.userId });
    if (!wish) {
      res.status(404).json({ error: 'Wish not found' });
      return;
    }
    res.json({ wish });
  } catch (error) {
    console.error('Fetch wish error:', error);
    res.status(500).json({ error: 'Failed to fetch wish' });
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
    const parsedOptions = parseOptions(req.body.options);

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

    const parsedTags = tags ? JSON.parse(tags) : [];
    const wish = await Wish.create({
      owner: req.userId,
      description,
      link,
      photoPath,
      priority: priority || 'medium',
      tags: parsedTags,
      options: parsedOptions,
    });

    res.status(201).json({ wish });

    // Notify partners asynchronously (don't block response)
    notifyPartners(req.userId!, { description, photoPath, priority: priority || 'medium', tags: parsedTags, link, options: parsedOptions });
  } catch (error) {
    console.error('Create wish error:', error);
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
    if (req.body.options !== undefined) wish.options = parseOptions(req.body.options);

    if (req.file) {
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
    console.error('Update wish error:', error);
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
    console.error('Delete wish error:', error);
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
    console.error('Mark received error:', error);
    res.status(500).json({ error: 'Failed to mark wish as received' });
  }
});

// Unarchive wish (set back to active)
router.patch('/:id/unarchive', async (req: AuthRequest, res: Response) => {
  try {
    const wish = await Wish.findById(req.params.id);
    if (!wish) {
      res.status(404).json({ error: 'Wish not found' });
      return;
    }

    if (wish.owner.toString() !== req.userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    wish.status = 'active';
    wish.receivedAt = undefined;
    wish.receivedBy = undefined;
    await wish.save();

    res.json({ wish });
  } catch (error) {
    console.error('Unarchive error:', error);
    res.status(500).json({ error: 'Failed to unarchive wish' });
  }
});

// Send wish to chat via bot
router.post('/:id/send-to-chat', async (req: AuthRequest, res: Response) => {
  try {
    const wish = await Wish.findById(req.params.id).populate('owner', 'firstName username telegramId');
    if (!wish) {
      res.status(404).json({ error: 'Wish not found' });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const priorityEmoji: Record<string, string> = { high: '🔴', medium: '🟡', low: '🔵' };
    const lang = user.languageCode || 'en';
    const tagsLabels: Record<string, string> = { ru: 'Теги', uk: 'Теги', en: 'Tags' };
    const tagsLabel = tagsLabels[lang] || tagsLabels.en;
    const tagsStr = wish.tags.length ? `\n${tagsLabel}: ${wish.tags.map((t: string) => `#${t}`).join(' ')}` : '';
    const linkStr = wish.link ? `\n🔗 ${wish.link}` : '';
    const optionsStr = optionsText(wish.options, lang);
    const text = `${priorityEmoji[wish.priority] || '🟡'} *Wish*\n\n${wish.description}${optionsStr}${linkStr}${tagsStr}`;

    let tgResult: { ok: boolean; description?: string };

    if (wish.photoPath) {
      const photoFilePath = path.join(__dirname, '../../uploads', wish.photoPath);
      try {
        await fs.access(photoFilePath);
        tgResult = await sendTgPhoto(user.telegramId, photoFilePath, text);
      } catch {
        tgResult = await sendTgMessage(user.telegramId, text + '\n\n(фото недоступно)');
      }
    } else {
      tgResult = await sendTgMessage(user.telegramId, text);
    }

    if (!tgResult.ok) {
      console.error('Telegram API error:', tgResult);
      res.status(502).json({ error: tgResult.description || 'Telegram API error' });
      return;
    }

    res.json({ message: 'Sent to chat' });
  } catch (error) {
    console.error('Send to chat error:', error);
    res.status(500).json({ error: 'Failed to send to chat' });
  }
});

export default router;
