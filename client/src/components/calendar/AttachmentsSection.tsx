import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X, Gift, FileText, Star, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  listEventAttachments,
  attachToEvent,
  detachFromEvent,
} from '@/api/eventAttachments';
import { getMyWishes, getPartnerWishes } from '@/api/wishes';
import { listGiftIdeas } from '@/api/giftIdeas';
import { listNotes } from '@/api/notes';
import { useT } from '@/i18n';
import type { AttachmentKind, EventAttachment, Wish, GiftIdea, Note } from '@/types';

interface Props {
  eventId: string;
  // If set, the event is shared with this pair. Pickers preselect this scope.
  pairId?: string | null;
}

type PickerKind = AttachmentKind;

function summaryFor(att: EventAttachment): { icon: typeof Gift; title: string; subtitle?: string } {
  if (att.kind === 'wish') {
    const w = att.target as Wish | null;
    return { icon: Star, title: w?.description ?? '?', subtitle: w?.link };
  }
  if (att.kind === 'gift') {
    const g = att.target as GiftIdea | null;
    return { icon: Gift, title: g?.title ?? '?', subtitle: g?.price };
  }
  const n = att.target as Note | null;
  return { icon: FileText, title: n?.title ?? '?', subtitle: n?.plainText };
}

// Per-event picker: shows my attachments and a "+" that expands a sub-sheet
// with three kinds of items the user can pin.
export function AttachmentsSection({ eventId, pairId }: Props) {
  const t = useT();
  const [attachments, setAttachments] = useState<EventAttachment[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<PickerKind>('gift');

  useEffect(() => {
    listEventAttachments(eventId)
      .then((res) => setAttachments(res.attachments))
      .catch((err) => {
        console.error('[Attachments] load failed', err);
        toast.error(t('common_failed_load'));
        setAttachments([]);
      });
  }, [eventId, t]);

  async function handleDetach(id: string) {
    try {
      await detachFromEvent(id);
      setAttachments((prev) => (prev || []).filter((a) => a._id !== id));
    } catch {
      toast.error(t('common_failed_delete'));
    }
  }

  async function handleAttach(kind: AttachmentKind, targetId: string) {
    try {
      const res = await attachToEvent(eventId, kind, targetId);
      setAttachments((prev) => [...(prev || []), res.attachment]);
      setPickerOpen(false);
      toast.success(t('att_added'));
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 409) toast.error(t('att_already'));
      else toast.error(t('common_failed_save'));
    }
  }

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          <LinkIcon className="mr-1 inline h-3.5 w-3.5" />
          {t('att_section_title')}
        </h3>
        <Button size="sm" variant="ghost" onClick={() => setPickerOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> {t('att_add')}
        </Button>
      </div>

      {attachments === null && (
        <div className="text-xs text-muted-foreground">{t('common_loading')}</div>
      )}
      {attachments?.length === 0 && (
        <div className="rounded border border-dashed border-muted-foreground/30 p-3 text-center text-xs text-muted-foreground">
          {t('att_empty')}
        </div>
      )}
      {attachments && attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((a) => {
            const s = summaryFor(a);
            const Icon = s.icon;
            return (
              <li key={a._id} className="flex items-center gap-2 rounded border bg-card px-2 py-1.5">
                <Icon className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{s.title}</div>
                  {s.subtitle && (
                    <div className="truncate text-[10px] text-muted-foreground">{s.subtitle}</div>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => handleDetach(a._id)} aria-label="Detach">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <AttachmentPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        kind={pickerKind}
        setKind={setPickerKind}
        pairId={pairId}
        already={new Set((attachments || []).map((a) => `${a.kind}:${typeof a.target === 'object' && a.target ? (a.target as { _id: string })._id : ''}`))}
        onAttach={handleAttach}
      />
    </div>
  );
}

interface PickerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: PickerKind;
  setKind: (k: PickerKind) => void;
  pairId?: string | null;
  already: Set<string>;
  onAttach: (kind: AttachmentKind, targetId: string) => void;
}

function AttachmentPicker({ open, onOpenChange, kind, setKind, pairId, already, onAttach }: PickerProps) {
  const t = useT();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [gifts, setGifts] = useState<GiftIdea[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  // Lazy load lists when the picker opens or kind changes.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        if (kind === 'wish') {
          // If the event is pair-shared we show that partner's wishes;
          // otherwise show the user's own wishes (a date for myself).
          if (pairId) {
            const res = await getPartnerWishes(pairId);
            setWishes(res.wishes);
          } else {
            const res = await getMyWishes();
            setWishes(res.wishes);
          }
        } else if (kind === 'gift') {
          const res = await listGiftIdeas(pairId ? { pairId } : undefined);
          setGifts(res.ideas);
        } else if (kind === 'note') {
          const res = await listNotes();
          setNotes(res.notes.filter((n) => n.type === 'doc'));
        }
      } catch (err) {
        console.error('[AttachmentPicker] load failed', err);
        toast.error(t('common_failed_load'));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, kind, pairId, t]);

  const items = useMemo(() => {
    if (kind === 'wish') {
      return wishes.map((w) => ({ id: w._id, title: w.description, subtitle: w.link, alreadyKey: `wish:${w._id}` }));
    }
    if (kind === 'gift') {
      return gifts.map((g) => ({ id: g._id, title: g.title, subtitle: g.price, alreadyKey: `gift:${g._id}` }));
    }
    return notes.map((n) => ({ id: n._id, title: n.title, subtitle: n.plainText, alreadyKey: `note:${n._id}` }));
  }, [kind, wishes, gifts, notes]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('att_add')}</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-1.5 p-1">
          <Button variant={kind === 'wish' ? 'default' : 'outline'} size="sm" onClick={() => setKind('wish')}>
            <Star className="mr-1 h-3.5 w-3.5" /> {t('att_kind_wish')}
          </Button>
          <Button variant={kind === 'gift' ? 'default' : 'outline'} size="sm" onClick={() => setKind('gift')}>
            <Gift className="mr-1 h-3.5 w-3.5" /> {t('att_kind_gift')}
          </Button>
          <Button variant={kind === 'note' ? 'default' : 'outline'} size="sm" onClick={() => setKind('note')}>
            <FileText className="mr-1 h-3.5 w-3.5" /> {t('att_kind_note')}
          </Button>
        </div>
        <div className="space-y-1 p-1">
          {loading && <div className="text-xs text-muted-foreground">{t('common_loading')}</div>}
          {!loading && items.length === 0 && (
            <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
              {t('att_no_items')}
            </div>
          )}
          {items.map((it) => {
            const used = already.has(it.alreadyKey);
            return (
              <button
                key={it.id}
                disabled={used}
                onClick={() => onAttach(kind, it.id)}
                className="flex w-full items-start gap-2 rounded border bg-card px-2 py-1.5 text-left transition-colors disabled:opacity-40 active:bg-muted/50"
              >
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-none text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{it.title}</div>
                  {it.subtitle && (
                    <div className="truncate text-[10px] text-muted-foreground">{it.subtitle}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
