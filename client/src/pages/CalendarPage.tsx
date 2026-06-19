import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Trash2, Pencil, Calendar as CalendarIcon, RotateCw, Lock, Users, MoreVertical } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { listEvents, deleteEvent } from '@/api/calendar';
import { getPairs } from '@/api/pairs';
import { useT } from '@/i18n';
import type { CalendarEvent, Pair } from '@/types';

function formatPartnerName(pair: Pair | undefined): string {
  if (!pair) return '';
  return pair.partner.firstName + (pair.partner.username ? ` (@${pair.partner.username})` : '');
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function nextOccurrence(ev: CalendarEvent): Date {
  const base = new Date(ev.date);
  if (!ev.isRecurringYearly) return base;
  const now = startOfToday();
  const candidate = new Date(now.getFullYear(), base.getMonth(), base.getDate());
  if (candidate < now) candidate.setFullYear(candidate.getFullYear() + 1);
  return candidate;
}

interface CalendarPageProps {
  embedded?: boolean;
}

export function CalendarPage({ embedded = false }: CalendarPageProps = {}) {
  const t = useT();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listEvents(), getPairs()])
      .then(([eventsRes, pairsRes]) => {
        setEvents(eventsRes.events);
        setPairs(pairsRes.pairs);
      })
      .catch(() => toast.error(t('common_failed_load')))
      .finally(() => setLoading(false));
  }, [t]);

  const pairById = useMemo(() => {
    const m = new Map<string, Pair>();
    pairs.forEach((p) => m.set(p.id, p));
    return m;
  }, [pairs]);

  const { upcoming, past } = useMemo(() => {
    const today = startOfToday();
    const up: Array<{ ev: CalendarEvent; when: Date }> = [];
    const pst: Array<{ ev: CalendarEvent; when: Date }> = [];
    for (const ev of events) {
      const when = nextOccurrence(ev);
      if (when >= today) up.push({ ev, when });
      else pst.push({ ev, when });
    }
    up.sort((a, b) => a.when.getTime() - b.when.getTime());
    pst.sort((a, b) => b.when.getTime() - a.when.getTime());
    return { upcoming: up, past: pst };
  }, [events]);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteEvent(deleteId);
      setEvents((prev) => prev.filter((e) => e._id !== deleteId));
      toast.success(t('common_deleted'));
    } catch {
      toast.error(t('common_failed_delete'));
    }
  }

  function renderRow(ev: CalendarEvent, when: Date) {
    const pairId = typeof ev.pair === 'string' ? ev.pair : ev.pair?._id;
    const pair = pairId ? pairById.get(pairId) : undefined;
    return (
      <Card
        key={ev._id}
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/calendar/${ev._id}/edit`)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/calendar/${ev._id}/edit`); } }}
        className="flex flex-row cursor-pointer items-start gap-3 px-3 py-2 transition-colors active:bg-muted/50"
      >
        <div className="flex flex-col items-center justify-center rounded-md bg-muted px-2 py-1 text-center">
          <span className="text-[10px] uppercase text-muted-foreground">{format(when, 'MMM')}</span>
          <span className="text-lg font-semibold leading-tight">{format(when, 'd')}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{ev.title}</span>
            {ev.isRecurringYearly && <RotateCw className="h-3 w-3 text-muted-foreground" />}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {pair ? (
              <>
                <Users className="h-3 w-3" />
                <span>{t('cal_with')} {formatPartnerName(pair)}</span>
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" />
                <span>{t('cal_private')}</span>
              </>
            )}
          </div>
          {ev.note && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ev.note}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-none"
              onClick={(e) => e.stopPropagation()}
              aria-label="More"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => navigate(`/calendar/${ev._id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" /> {t('cal_edit')}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(ev._id)}>
              <Trash2 className="mr-2 h-4 w-4" /> {t('common_delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>
    );
  }

  return (
    <>
      {!embedded && <Header title={t('cal_title')} />}

      <div className="px-4 pt-4">
        {loading && <div className="text-sm text-muted-foreground">{t('common_loading')}</div>}
        {!loading && upcoming.length === 0 && past.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            <CalendarIcon className="mx-auto mb-3 h-8 w-8 opacity-40" />
            {t('cal_empty')}
          </div>
        )}
        {upcoming.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t('cal_upcoming')}</h2>
            <ul className="space-y-2">
              {upcoming.map(({ ev, when }) => renderRow(ev, when))}
            </ul>
          </div>
        )}
        {past.length > 0 && (
          <div className="opacity-70">
            <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t('cal_past')}</h2>
            <ul className="space-y-2">
              {past.map(({ ev, when }) => renderRow(ev, when))}
            </ul>
          </div>
        )}
      </div>

      <Button
        className="fixed fab-bottom right-4 z-30 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => navigate('/calendar/new')}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title={t('cal_delete_title')}
        description={t('cal_delete_desc')}
        confirmLabel={t('common_delete')}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
