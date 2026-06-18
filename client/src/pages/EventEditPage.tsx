import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AttachmentsSection } from '@/components/calendar/AttachmentsSection';
import { listEvents, createEvent, updateEvent, deleteEvent, type CalendarEventInput } from '@/api/calendar';
import { getPairs } from '@/api/pairs';
import { useT } from '@/i18n';
import type { CalendarEvent, Pair } from '@/types';

interface FormState {
  title: string;
  date: string;
  pairId: string;
  isRecurringYearly: boolean;
  note: string;
}

function partnerLabel(p: Pair): string {
  return p.partner.firstName + (p.partner.username ? ` (@${p.partner.username})` : '');
}

const empty: FormState = { title: '', date: '', pairId: '', isRecurringYearly: false, note: '' };

// Full-page form for create/edit of a CalendarEvent. Reachable via:
//   /calendar/new
//   /calendar/new?pairId=<id>
//   /calendar/:id/edit
// Replaces the previous bottom-sheet so the user gets the full screen and
// can exit with the edge-swipe-back gesture (handled at the AppShell level).
export function EventEditPage() {
  const navigate = useNavigate();
  const t = useT();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const [form, setForm] = useState<FormState>(empty);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [event, setEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    getPairs()
      .then((p) => setPairs(p.pairs))
      .catch(() => toast.error(t('common_failed_load')));
  }, [t]);

  useEffect(() => {
    if (!isEdit) {
      // Pre-fill pair scope from query string when navigating from PairDetail.
      const params = new URLSearchParams(window.location.search);
      const pairId = params.get('pairId') || '';
      setForm((f) => ({ ...f, pairId }));
      return;
    }
    listEvents()
      .then((res) => {
        const ev = res.events.find((e) => e._id === id);
        if (!ev) {
          toast.error(t('common_failed_load'));
          navigate(-1);
          return;
        }
        setEvent(ev);
        setForm({
          title: ev.title,
          date: ev.date.slice(0, 10),
          pairId: typeof ev.pair === 'string' ? ev.pair : (ev.pair?._id ?? ''),
          isRecurringYearly: ev.isRecurringYearly,
          note: ev.note ?? '',
        });
      })
      .catch(() => toast.error(t('common_failed_load')))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate, t]);

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
      if (isEdit && id) {
        await updateEvent(id, payload);
        toast.success(t('common_updated'));
      } else {
        await createEvent(payload);
        toast.success(t('common_added'));
      }
      navigate(-1);
    } catch (err) {
      console.error('[EventEdit] submit failed', err);
      toast.error(t('common_failed_save'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteEvent(id);
      toast.success(t('common_deleted'));
      navigate(-1);
    } catch {
      toast.error(t('common_failed_delete'));
    }
  }

  const title = useMemo(() => (isEdit ? t('cal_edit') : t('cal_new')), [isEdit, t]);

  if (loading) {
    return (
      <>
        <Header title={title} />
        <div className="px-4 pt-4 text-sm text-muted-foreground">{t('common_loading')}</div>
      </>
    );
  }

  return (
    <>
      <Header title={title} />

      <div className="space-y-4 px-4 pt-4">
        <div>
          <Label htmlFor="ev-title">{t('cal_title_label')}</Label>
          <Input
            id="ev-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={t('cal_title_placeholder')}
            autoFocus={!isEdit}
          />
        </div>
        <div>
          <Label htmlFor="ev-date">{t('cal_date_label')}</Label>
          <Input
            id="ev-date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div>
          <Label>{t('cal_share_label')}</Label>
          <Select
            value={form.pairId || '__private__'}
            onValueChange={(v) => setForm({ ...form, pairId: v === '__private__' ? '' : v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__private__">{t('cal_share_private')}</SelectItem>
              {pairs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {partnerLabel(p)}
                </SelectItem>
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
          <Textarea
            id="ev-note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
            {isEdit ? t('common_save') : t('common_add')}
          </Button>
          {isEdit && (
            <Button variant="destructive" onClick={() => setConfirmDelete(true)} disabled={submitting}>
              {t('common_delete')}
            </Button>
          )}
        </div>

        {isEdit && id && (
          <div className="border-t pt-3">
            <AttachmentsSection eventId={id} pairId={event?.pair ? (typeof event.pair === 'string' ? event.pair : event.pair._id) : null} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('cal_delete_title')}
        description={t('cal_delete_desc')}
        confirmLabel={t('common_delete')}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
