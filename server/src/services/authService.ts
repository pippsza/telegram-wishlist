import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { env } from '../config/env';
import { validateInitData } from '../utils/telegram';

export async function authenticateTelegram(initDataRaw: string): Promise<{ token: string; user: IUser }> {
  const initData = validateInitData(initDataRaw, env.botToken);

  if (!initData.user) {
    throw new Error('No user data in initData');
  }

  const tgUser = initData.user;

  const user = await User.findOneAndUpdate(
    { telegramId: tgUser.id },
    {
      telegramId: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      username: tgUser.username,
      photoUrl: tgUser.photo_url,
      languageCode: tgUser.language_code,
    },
    { upsert: true, new: true }
  );

  const token = jwt.sign(
    { userId: user._id.toString(), telegramId: user.telegramId },
    env.jwtSecret,
    { expiresIn: '7d' }
  );

  return { token, user };
}
