import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../services/authService';

const router = Router();

router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;
    if (!initData || typeof initData !== 'string') {
      res.status(400).json({ error: 'initData is required' });
      return;
    }

    const result = await authenticateTelegram(initData);
    res.json({
      token: result.token,
      user: {
        id: result.user._id,
        telegramId: result.user.telegramId,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        username: result.user.username,
        photoUrl: result.user.photoUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    res.status(401).json({ error: message });
  }
});

export default router;
