import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Trash2, Pencil, Calendar as CalendarIcon, RotateCw, Lock, Users, MoreVertical } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { listEvents, createEvent, updateEvent, deleteEvent, type CalendarEventInput } from '@/api/calendar';
import { getPairs } from '@/api/pairs';
import { AttachmentsSection } from '@/components/calendar/AttachmentsSection';
import { useT } from '@/i18n';
import type { CalendarEvent, Pair } from '@/types';

interface FormState {
  id?: string;
  title: string;
  date: string;
  pairId: string;
  isRecurringYearly: boolean;
  note: string;
}

const emptyForm: FormState = {
  title: '',
  date: '',
  pairId: '',
  isRecurringYearly: false,
  note: '',
};

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
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

  // Auto-open an event when navigated to with ?openEvent=<id> (used by PairDetail).
  useEffect(() => {
    const target = searchParams.get('openEvent');
    if (!target || events.length === 0) return;
    const ev = events.find((e) => e._id === target);
    if (!ev) return;
    openEdit(ev);
    // Clear the param so re-open works on subsequent navigations.
    const next = new URLSearchParams(searchParams);
    next.delete('openEvent');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, searchParams]);

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

  function openCreate() {
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(ev: CalendarEvent) {
    setForm({
      id: ev._id,
      title: ev.title,
      date: ev.date.slice(0, 10),
      pairId: typeof ev.pair === 'string' ? ev.pair : (ev.pair?._id ?? ''),
      isRecurringYearly: ev.isRecurringYearly,
      note: ev.note ?? '',
    });
    setOpen(true);
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.date) {
      toast.error(t('common_required_title_date'));
      return;
    }
    setSubmitting(true);
    try {
      const payload: CalendarEventInput = {
        title: form.title.trim(),
        date: form.date,
        pairId: form.pairId || null,
        isRecurringYearly: form.isRecurringYearly,
        note: form.note.trim() || undefined,
      };
      if (form.id) {
        const res = await updateEvent(form.id, payload);
        setEvents((prev) => prev.map((e) => (e._id === form.id ? res.event : e)));
        toast.success(t('common_updated'));
      } else {
        const res = await createEvent(payload);
        setEvents((prev) => [...prev, res.event]);
        toast.success(t('common_added'));
      }
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(t('common_failed_save'));
    } finally {
      setSubmitting(false);
    }
  }

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
        onClick={() => openEdit(ev)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(ev); } }}
        className="cursor-pointer px-3 py-2 transition-colors active:bg-muted/50"
      >
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center justify-center rounded-md bg-muted px-2 py-1 text-center">
            <span className="text-[10px] uppercase text-muted-foreground">{format(when, 'MMM')}</span>
            <span className="text-lg font-semibold leading-tight">{format(when, 'd')}</span>
          </div>
          <div className="flex-1 min-w-0">
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
              <DropdownMenuItem onClick={() => openEdit(ev)}>
                <Pencil className="mr-2 h-4 w-4" /> {t('cal_edit')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(ev._id)}>
                <Trash2 className="mr-2 h-4 w-4" /> {t('common_delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
        className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={openCreate}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form.id ? t('cal_edit') : t('cal_new')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 p-1">
            <div>
              <Label htmlFor="ev-title">{t('cal_title_label')}</Label>
              <Input id="ev-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('cal_title_placeholder')} />
            </div>
            <div>
              <Label htmlFor="ev-date">{t('cal_date_label')}</Label>
              <Input id="ev-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>{t('cal_share_label')}</Label>
              <Select value={form.pairId || '__private__'} onValueChange={(v) => setForm({ ...form, pairId: v === '__private__' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__private__">{t('cal_share_private')}</SelectItem>
                  {pairs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{formatPartnerName(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isRecurringYearly}
                onChange={(e) => setForm({ ...form, isRecurringYearly: e.target.checked })}
              />
              {t('cal_recurring')}
            </label>
            <div>
              <Label htmlFor="ev-note">{t('cal_note_label')}</Label>
              <Textarea id="ev-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                {form.id ? t('common_save') : t('common_add')}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>{t('common_cancel')}</Button>
            </div>

            {form.id && (
              <div className="border-t pt-3">
                <AttachmentsSection eventId={form.id} pairId={form.pairId || null} />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
