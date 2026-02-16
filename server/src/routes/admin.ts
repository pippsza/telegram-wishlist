import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Pair } from '../models/Pair';
import { Wish } from '../models/Wish';
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

    const [userCount, pairCount, wishCount, activeWishCount, receivedWishCount] = await Promise.all([
      User.countDocuments(),
      Pair.countDocuments({ status: 'active' }),
      Wish.countDocuments(),
      Wish.countDocuments({ status: 'active' }),
      Wish.countDocuments({ status: 'received' }),
    ]);

    res.json({ userCount, pairCount, wishCount, activeWishCount, receivedWishCount });
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

export default router;
