import fs from 'fs/promises';
import path from 'path';
import { Pair } from '../models/Pair';
import { User, IUser } from '../models/User';
import { env } from '../config/env';
import type { Types } from 'mongoose';

const TG_API = `https://api.telegram.org/bot${env.botToken}`;

export type Lang = 'ru' | 'uk' | 'en';

export function pickLang(user: { languageCode?: string } | null | undefined): Lang {
  const lc = user?.languageCode;
  if (lc === 'ru' || lc === 'uk' || lc === 'en') return lc;
  return 'en';
}

export interface TgSendResult {
  ok: boolean;
  description?: string;
}

export async function sendTgMessage(chatId: number, text: string): Promise<TgSendResult> {
  const resp = await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
  return resp.json() as Promise<TgSendResult>;
}

export async function sendTgPhoto(chatId: number, photoFilePath: string, caption: string): Promise<TgSendResult> {
  const photoBuffer = await fs.readFile(photoFilePath);
  const blob = new Blob([photoBuffer], { type: 'image/webp' });
  const formData = new FormData();
  formData.append('chat_id', chatId.toString());
  formData.append('photo', blob, path.basename(photoFilePath));
  formData.append('caption', caption);
  formData.append('parse_mode', 'Markdown');
  const resp = await fetch(`${TG_API}/sendPhoto`, { method: 'POST', body: formData });
  return resp.json() as Promise<TgSendResult>;
}

// Returns the partner user IDs across all active pairs the user is part of.
export async function getPartnerIds(userId: string): Promise<Types.ObjectId[]> {
  const pairs = await Pair.find({
    status: 'active',
    $or: [{ userA: userId }, { userB: userId }],
  });
  return pairs
    .map((p) => (p.userA.toString() === userId ? p.userB : p.userA))
    .filter((id): id is Types.ObjectId => Boolean(id));
}

// Returns the partner User document for a specific pair (or null if pair invalid/not active).
export async function getPartnerForPair(userId: string, pairId: string): Promise<IUser | null> {
  const pair = await Pair.findById(pairId);
  if (!pair || pair.status !== 'active') return null;
  const isUserA = pair.userA.toString() === userId;
  const isUserB = pair.userB?.toString() === userId;
  if (!isUserA && !isUserB) return null;
  const partnerId = isUserA ? pair.userB : pair.userA;
  if (!partnerId) return null;
  return User.findById(partnerId);
}

export function displayName(user: { firstName: string; username?: string }): string {
  return user.firstName + (user.username ? ` (@${user.username})` : '');
}

// Best-effort notification: send text to the partner, log on failure. Never throws.
export async function notifyPartnerText(partner: IUser, text: string): Promise<void> {
  try {
    const result = await sendTgMessage(partner.telegramId, text);
    if (!result.ok) console.error(`TG sendMessage failed for ${partner.telegramId}:`, result.description);
  } catch (err) {
    console.error(`Failed to notify partner ${partner.telegramId}:`, err);
  }
}

// Send text + photo if file exists, fall back to text-only otherwise.
export async function notifyPartnerPhoto(partner: IUser, photoPath: string, caption: string): Promise<void> {
  try {
    await fs.access(photoPath);
    const result = await sendTgPhoto(partner.telegramId, photoPath, caption);
    if (!result.ok) console.error(`TG sendPhoto failed for ${partner.telegramId}:`, result.description);
  } catch {
    await notifyPartnerText(partner, caption);
  }
}

export function uploadsDir(): string {
  return path.join(__dirname, '../../uploads');
}
