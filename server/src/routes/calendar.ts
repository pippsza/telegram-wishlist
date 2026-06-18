import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { CalendarEvent } from '../models/CalendarEvent';
import { Pair } from '../models/Pair';
import { User } from '../models/User';
import {
  displayName,
  getPartnerForPair,
  notifyPartnerText,
  pickLang,
  type Lang,
} from '../services/notifications';

const router = Router();
router.use(authMiddleware);

interface EventPayload {
  title?: unknown;
  date?: unknown;
  pairId?: unknown;
  isRecurringYearly?: unknown;
  remindDaysBefore?: unknown;
  note?: unknown;
}

function parsePayload(body: EventPayload, isCreate: boolean) {
  const errors: string[] = [];

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (isCreate && !title) errors.push('title is required');
  if (title && title.length > 200) errors.push('title too long');

  let date: Date | undefined;
  if (body.date !== undefined) {
    const d = new Date(body.date as string);
    if (isNaN(d.getTime())) errors.push('date is invalid');
    else date = d;
  } else if (isCreate) {
    errors.push('date is required');
  }

  let pairId: string | null | undefined;
  if (body.pairId !== undefined) {
    if (body.pairId === null || body.pairId === '') pairId = null;
    else if (typeof body.pairId === 'string' && Types.ObjectId.isValid(body.pairId)) pairId = body.pairId;
    else errors.push('pairId is invalid');
  }

  const isRecurringYearly = body.isRecurringYearly !== undefined ? Boolean(body.isRecurringYearly) : undefined;

  let remindDaysBefore: number[] | undefined;
  if (body.remindDaysBefore !== undefined) {
    if (!Array.isArray(body.remindDaysBefore)) {
      errors.push('remindDaysBefore must be array');
    } else {
      const cleaned = (body.remindDaysBefore as unknown[])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 365);
      remindDaysBefore = Array.from(new Set(cleaned)).sort((a, b) => b - a);
    }
  }

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : undefined;

  return { errors, title, date, pairId, isRecurringYearly, remindDaysBefore, note };
}

// Confirm the user belongs to the active pair, return Pair doc, else null.
async function ensureMemberOfPair(userId: string, pairId: string) {
  const pair = await Pair.findById(pairId);
  if (!pair || pair.status !== 'active') return null;
  const isUserA = pair.userA.toString() === userId;
  const isUserB = pair.userB?.toString() === userId;
  if (!isUserA && !isUserB) return null;
  return pair;
}

function eventActionText(action: 'created' | 'updated' | 'deleted', actor: string, title: string, lang: Lang): string {
  if (action === 'created') {
    return {
      ru: `📅 *${actor}* добавил(а) дату: ${title}`,
      uk: `📅 *${actor}* додав(-ла) дату: ${title}`,
      en: `📅 *${actor}* added a date: ${title}`,
    }[lang];
  }
  if (action === 'updated') {
    return {
      ru: `📅 *${actor}* обновил(а) дату: ${title}`,
      uk: `📅 *${actor}* оновив(-ла) дату: ${title}`,
      en: `📅 *${actor}* updated a date: ${title}`,
    }[lang];
  }
  return {
    ru: `📅 *${actor}* удалил(а) дату: ${title}`,
    uk: `📅 *${actor}* видалив(-ла) дату: ${title}`,
    en: `📅 *${actor}* deleted a date: ${title}`,
  }[lang];
}

async function notifyPartnerAboutEvent(
  userId: string,
  pairId: Types.ObjectId | string,
  action: 'created' | 'updated' | 'deleted',
  title: string
) {
  try {
    const [actor, partner] = await Promise.all([
      User.findById(userId),
      getPartnerForPair(userId, pairId.toString()),
    ]);
    if (!actor || !partner) return;
    const text = eventActionText(action, displayName(actor), title, pickLang(partner));
    await notifyPartnerText(partner, text);
  } catch (err) {
    console.error('Calendar notify error:', err);
  }
}

// List: own events + all events for pairs I am a member of.
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const pairs = await Pair.find({
      status: 'active',
      $or: [{ userA: userId }, { userB: userId }],
    }).select('_id');
    const pairIds = pairs.map((p) => p._id);

    const events = await CalendarEvent.find({
      $or: [
        { owner: userId, pair: null },
        { pair: { $in: pairIds } },
      ],
    })
      .sort({ date: 1 })
      .populate('owner', 'firstName username photoUrl')
      .populate({ path: 'pair', select: 'userA userB' });

    res.json({ events });
  } catch (error) {
    console.error('Fetch calendar events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Upcoming: next N days, includes yearly recurring ones whose next occurrence falls inside the window.
router.get('/upcoming', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const days = Math.min(Math.max(parseInt((req.query.days as string) || '30', 10) || 30, 1), 365);

    const pairs = await Pair.find({
      status: 'active',
      $or: [{ userA: userId }, { userB: userId }],
    }).select('_id');
    const pairIds = pairs.map((p) => p._id);

    const all = await CalendarEvent.find({
      $or: [
        { owner: userId, pair: null },
        { pair: { $in: pairIds } },
      ],
    })
      .populate('owner', 'firstName username photoUrl')
      .populate({ path: 'pair', select: 'userA userB' });

    const now = new Date();
    const horizon = new Date(now.getTime() + days * 86400000);

    const upcoming = all
      .map((ev) => {
        const occurrence = ev.isRecurringYearly ? nextYearlyOccurrence(ev.date, now) : ev.date;
        return { event: ev, occurrence };
      })
      .filter(({ occurrence }) => occurrence >= startOfDay(now) && occurrence <= horizon)
      .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime())
      .map(({ event, occurrence }) => ({ ...event.toJSON(), occurrence }));

    res.json({ events: upcoming });
  } catch (error) {
    console.error('Upcoming calendar events error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Create an event. If pairId set, the user must be a member of an active pair.
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = parsePayload(req.body, true);
    if (parsed.errors.length) {
      res.status(400).json({ error: parsed.errors.join(', ') });
      return;
    }

    if (parsed.pairId) {
      const pair = await ensureMemberOfPair(userId, parsed.pairId);
      if (!pair) {
        res.status(403).json({ error: 'Not a member of this pair' });
        return;
      }
    }

    const event = await CalendarEvent.create({
      owner: userId,
      pair: parsed.pairId || null,
      title: parsed.title,
      date: parsed.date,
      isRecurringYearly: parsed.isRecurringYearly ?? false,
      remindDaysBefore: parsed.remindDaysBefore ?? [],
      note: parsed.note,
    });

    res.status(201).json({ event });

    if (event.pair) {
      notifyPartnerAboutEvent(userId, event.pair, 'created', event.title);
    }
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update an event. Both pair members can edit a shared event; only owner edits a personal one.
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const event = await CalendarEvent.findById(req.params.id);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const isOwner = event.owner.toString() === userId;
    if (event.pair) {
      const pair = await ensureMemberOfPair(userId, event.pair.toString());
      if (!pair) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }
    } else if (!isOwner) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const parsed = parsePayload(req.body, false);
    if (parsed.errors.length) {
      res.status(400).json({ error: parsed.errors.join(', ') });
      return;
    }

    // Changing the sharing scope is only allowed for the owner.
    if (parsed.pairId !== undefined && parsed.pairId !== (event.pair?.toString() ?? null)) {
      if (!isOwner) {
        res.status(403).json({ error: 'Only owner can change sharing' });
        return;
      }
      if (parsed.pairId) {
        const pair = await ensureMemberOfPair(userId, parsed.pairId);
        if (!pair) {
          res.status(403).json({ error: 'Not a member of this pair' });
          return;
        }
      }
      event.pair = parsed.pairId ? new Types.ObjectId(parsed.pairId) : (null as unknown as Types.ObjectId);
    }

    if (parsed.title) event.title = parsed.title;
    if (parsed.date) event.date = parsed.date;
    if (parsed.isRecurringYearly !== undefined) event.isRecurringYearly = parsed.isRecurringYearly;
    if (parsed.remindDaysBefore !== undefined) event.remindDaysBefore = parsed.remindDaysBefore;
    if (parsed.note !== undefined) event.note = parsed.note;

    await event.save();
    res.json({ event });

    if (event.pair) {
      notifyPartnerAboutEvent(userId, event.pair, 'updated', event.title);
    }
  } catch (error) {
    console.error('Update calendar event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete an event. Same authorization as edit.
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const event = await CalendarEvent.findById(req.params.id);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const isOwner = event.owner.toString() === userId;
    if (event.pair) {
      const pair = await ensureMemberOfPair(userId, event.pair.toString());
      if (!pair) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }
    } else if (!isOwner) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const wasShared = event.pair;
    const title = event.title;
    await event.deleteOne();
    res.json({ message: 'Event deleted' });

    if (wasShared) {
      notifyPartnerAboutEvent(userId, wasShared, 'deleted', title);
    }
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Next occurrence of a yearly event on/after `from`. Preserves month/day from `base`.
function nextYearlyOccurrence(base: Date, from: Date): Date {
  const candidate = new Date(from.getFullYear(), base.getMonth(), base.getDate(), base.getHours(), base.getMinutes());
  if (candidate < startOfDay(from)) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }
  return candidate;
}

export default router;
