import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Pair } from '../models/Pair';
import { Wish } from '../models/Wish';
import { Note } from '../models/Note';
import { CalendarEvent } from '../models/CalendarEvent';
import { GiftIdea } from '../models/GiftIdea';
import { EventAttachment } from '../models/EventAttachment';
import { env } from '../config/env';

const router = Router();
router.use(authMiddleware);

// Admin check middleware
async function requireAdmin(req: AuthRequest, res: Response): Promise<boolean> {
  const user = await User.findById(req.userId);
  if (!user || !user.username || !env.adminUsernames.includes(user.username)) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

// Check if current user is admin
router.get('/check', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    const isAdmin = !!(user?.username && env.adminUsernames.includes(user.username));
    res.json({ isAdmin });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check admin status' });
  }
});

// Get stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const [
      userCount,
      pairCount,
      wishCount,
      activeWishCount,
      receivedWishCount,
      noteCount,
      noteDocCount,
      noteFolderCount,
      eventCount,
      sharedEventCount,
      giftIdeaCount,
      attachmentCount,
    ] = await Promise.all([
      User.countDocuments(),
      Pair.countDocuments({ status: 'active' }),
      Wish.countDocuments(),
      Wish.countDocuments({ status: 'active' }),
      Wish.countDocuments({ status: 'received' }),
      Note.countDocuments(),
      Note.countDocuments({ type: 'doc' }),
      Note.countDocuments({ type: 'folder' }),
      CalendarEvent.countDocuments(),
      CalendarEvent.countDocuments({ pair: { $ne: null } }),
      GiftIdea.countDocuments(),
      EventAttachment.countDocuments(),
    ]);

    res.json({
      userCount,
      pairCount,
      wishCount,
      activeWishCount,
      receivedWishCount,
      noteCount,
      noteDocCount,
      noteFolderCount,
      eventCount,
      sharedEventCount,
      giftIdeaCount,
      attachmentCount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all pairs
router.get('/pairs', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const pairs = await Pair.find()
      .populate('userA', 'firstName lastName username photoUrl')
      .populate('userB', 'firstName lastName username photoUrl')
      .sort({ createdAt: -1 });
    res.json({ pairs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pairs' });
  }
});

// Get all wishes
router.get('/wishes', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const wishes = await Wish.find()
      .populate('owner', 'firstName lastName username photoUrl')
      .sort({ createdAt: -1 });
    res.json({ wishes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wishes' });
  }
});

// Delete user
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Cleanup: delete user's wishes and pairs
    await Promise.all([
      Wish.deleteMany({ owner: req.params.id }),
      Pair.deleteMany({ $or: [{ userA: req.params.id }, { userB: req.params.id }] }),
    ]);

    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Delete pair
router.delete('/pairs/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const pair = await Pair.findByIdAndDelete(req.params.id);
    if (!pair) {
      res.status(404).json({ error: 'Pair not found' });
      return;
    }
    res.json({ message: 'Pair deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete pair' });
  }
});

// Delete wish
router.delete('/wishes/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const wish = await Wish.findByIdAndDelete(req.params.id);
    if (!wish) {
      res.status(404).json({ error: 'Wish not found' });
      return;
    }
    res.json({ message: 'Wish deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete wish' });
  }
});

// Get all notes
router.get('/notes', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const notes = await Note.find({}, { yjsState: 0 })
      .populate('owner', 'firstName lastName username photoUrl')
      .sort({ updatedAt: -1 })
      .limit(200);
    res.json({ notes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Get all calendar events
router.get('/calendar', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const events = await CalendarEvent.find()
      .populate('owner', 'firstName lastName username photoUrl')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get all gift ideas
router.get('/gift-ideas', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const ideas = await GiftIdea.find()
      .populate('owner', 'firstName lastName username photoUrl')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ ideas });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch gift ideas' });
  }
});

// Get all event attachments (cross-user, for diagnostics)
router.get('/attachments', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const attachments = await EventAttachment.find()
      .populate('owner', 'firstName username')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ attachments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

// Recent activity feed across all entity types. Used by the admin dashboard
// to see what's been happening in the app at a glance.
router.get('/recent', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10) || 20, 100);

    const [users, wishes, notes, events, ideas, pairs, attachments] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(limit).select('firstName username photoUrl createdAt'),
      Wish.find().sort({ createdAt: -1 }).limit(limit).populate('owner', 'firstName username').select('description createdAt owner'),
      Note.find().sort({ createdAt: -1 }).limit(limit).populate('owner', 'firstName username').select('title type createdAt owner pair'),
      CalendarEvent.find().sort({ createdAt: -1 }).limit(limit).populate('owner', 'firstName username').select('title date createdAt owner pair'),
      GiftIdea.find().sort({ createdAt: -1 }).limit(limit).populate('owner', 'firstName username').select('title status createdAt owner forPair'),
      Pair.find().sort({ createdAt: -1 }).limit(limit).populate('userA userB', 'firstName username').select('status createdAt userA userB'),
      EventAttachment.find().sort({ createdAt: -1 }).limit(limit).populate('owner', 'firstName username').select('kind createdAt owner event'),
    ]);

    type RecentItem = { kind: string; at: string; data: unknown };
    const items: RecentItem[] = [];
    users.forEach((u) => items.push({ kind: 'user', at: u.createdAt.toISOString(), data: u }));
    wishes.forEach((w) => items.push({ kind: 'wish', at: w.createdAt.toISOString(), data: w }));
    notes.forEach((n) => items.push({ kind: 'note', at: n.createdAt.toISOString(), data: n }));
    events.forEach((e) => items.push({ kind: 'event', at: e.createdAt.toISOString(), data: e }));
    ideas.forEach((g) => items.push({ kind: 'gift', at: g.createdAt.toISOString(), data: g }));
    pairs.forEach((p) => items.push({ kind: 'pair', at: p.createdAt.toISOString(), data: p }));
    attachments.forEach((a) => items.push({ kind: 'attachment', at: a.createdAt.toISOString(), data: a }));

    items.sort((a, b) => (a.at < b.at ? 1 : -1));
    res.json({ items: items.slice(0, limit) });
  } catch (error) {
    console.error('Recent feed error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

export default router;
