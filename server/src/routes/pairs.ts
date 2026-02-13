import { Router, Response } from 'express';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Pair } from '../models/Pair';
import { User } from '../models/User';

const router = Router();
router.use(authMiddleware);

// Get all pairs for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const activePairs = await Pair.find({
      status: 'active',
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate('userA', 'firstName lastName username photoUrl telegramId')
      .populate('userB', 'firstName lastName username photoUrl telegramId')
      .sort({ createdAt: -1 });

    const pairs = activePairs.map((pair) => {
      const isUserA = pair.userA._id.toString() === userId;
      const partner = isUserA ? pair.userB : pair.userA;
      return {
        id: pair._id,
        partner,
        status: pair.status,
        createdAt: pair.createdAt,
      };
    });

    // Pending requests received (by username invite)
    const pendingReceived = await Pair.find({
      userB: userId,
      status: 'pending',
      inviteMethod: 'username',
    })
      .populate('userA', 'firstName lastName username photoUrl')
      .sort({ createdAt: -1 });

    // Pending link invites created by user (still waiting)
    const pendingSent = await Pair.find({
      userA: userId,
      status: 'pending',
    }).sort({ createdAt: -1 });

    res.json({
      pairs,
      pendingReceived: pendingReceived.map((p) => ({
        id: p._id,
        from: p.userA,
        inviteMethod: p.inviteMethod,
        inviteCode: p.inviteCode,
        createdAt: p.createdAt,
      })),
      pendingSent: pendingSent.map((p) => ({
        id: p._id,
        inviteMethod: p.inviteMethod,
        inviteCode: p.inviteCode,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pairs' });
  }
});

// Create invite link
router.post('/invite', async (req: AuthRequest, res: Response) => {
  try {
    const inviteCode = crypto.randomBytes(12).toString('hex');

    const pair = await Pair.create({
      userA: req.userId,
      inviteMethod: 'link',
      inviteCode,
    });

    res.status(201).json({
      id: pair._id,
      inviteCode,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// Accept invite link
router.post('/invite/:code/accept', async (req: AuthRequest, res: Response) => {
  try {
    const pair = await Pair.findOne({ inviteCode: req.params.code, status: 'pending' });
    if (!pair) {
      res.status(404).json({ error: 'Invite not found or already used' });
      return;
    }

    if (pair.userA.toString() === req.userId) {
      res.status(400).json({ error: 'Cannot accept your own invite' });
      return;
    }

    // Check if pair already exists between these users
    const existing = await Pair.findOne({
      status: 'active',
      $or: [
        { userA: pair.userA, userB: req.userId },
        { userA: req.userId, userB: pair.userA },
      ],
    });
    if (existing) {
      res.status(400).json({ error: 'Pair already exists' });
      return;
    }

    pair.userB = req.userId as any;
    pair.status = 'active';
    await pair.save();

    await pair.populate('userA', 'firstName lastName username photoUrl');
    res.json({
      id: pair._id,
      partner: pair.userA,
      status: pair.status,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// Send pair request by username
router.post('/request', async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.body;
    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const targetUser = await User.findOne({ username: username.replace('@', '') });
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (targetUser._id.toString() === req.userId) {
      res.status(400).json({ error: 'Cannot pair with yourself' });
      return;
    }

    // Check if pair already exists
    const existing = await Pair.findOne({
      $or: [
        { userA: req.userId, userB: targetUser._id, status: { $in: ['active', 'pending'] } },
        { userA: targetUser._id, userB: req.userId, status: { $in: ['active', 'pending'] } },
      ],
    });
    if (existing) {
      res.status(400).json({ error: 'Pair request already exists' });
      return;
    }

    const pair = await Pair.create({
      userA: req.userId,
      userB: targetUser._id,
      inviteMethod: 'username',
    });

    res.status(201).json({ id: pair._id, status: pair.status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// Respond to pair request (accept/decline)
router.patch('/:id/respond', async (req: AuthRequest, res: Response) => {
  try {
    const { action } = req.body;
    if (!action || !['accept', 'decline'].includes(action)) {
      res.status(400).json({ error: 'Action must be accept or decline' });
      return;
    }

    const pair = await Pair.findOne({ _id: req.params.id, userB: req.userId, status: 'pending' });
    if (!pair) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    pair.status = action === 'accept' ? 'active' : 'declined';
    await pair.save();

    if (action === 'accept') {
      await pair.populate('userA', 'firstName lastName username photoUrl');
    }

    res.json({
      id: pair._id,
      status: pair.status,
      partner: action === 'accept' ? pair.userA : undefined,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to respond to request' });
  }
});

// Delete pair
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pair = await Pair.findOneAndDelete({
      _id: req.params.id,
      $or: [{ userA: req.userId }, { userB: req.userId }],
    });

    if (!pair) {
      res.status(404).json({ error: 'Pair not found' });
      return;
    }

    res.json({ message: 'Pair deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete pair' });
  }
});

export default router;
