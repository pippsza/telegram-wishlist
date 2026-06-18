import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Lock, Users, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { getNote, updateNote, deleteNote } from '@/api/notes';
import { getPairs } from '@/api/pairs';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import type { Note, Pair } from '@/types';

const NoteEditor = lazy(() =>
  import('@/components/notes/NoteEditor')
    .then((m) => {
      console.log('[NoteEditorPage] editor chunk loaded');
      return { default: m.NoteEditor };
    })
    .catch((err) => {
      console.error('[NoteEditorPage] failed to load editor chunk', err);
      throw err;
    })
);

function partnerLabel(p: Pair): string {
  return p.partner.firstName + (p.partner.username ? ` (@${p.partner.username})` : '');
}

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = useT();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePair, setSharePair] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    console.log('[NoteEditorPage] fetching note', id);
    Promise.all([getNote(id), getPairs()])
      .then(([nRes, pRes]) => {
        console.log('[NoteEditorPage] note loaded', { id: nRes.note._id, type: nRes.note.type, pair: nRes.note.pair, title: nRes.note.title });
        setNote(nRes.note);
        setTitle(nRes.note.title);
        setPairs(pRes.pairs);
        setSharePair(nRes.note.pair ?? '');
      })
      .catch((err) => {
        console.error('[NoteEditorPage] failed to load note', err);
        toast.error(t('common_failed_load'));
      });
  }, [id]);

  async function saveTitle() {
    if (!note || !title.trim() || title === note.title) return;
    try {
      const res = await updateNote(note._id, { title: title.trim() });
      setNote(res.note);
    } catch {
      toast.error(t('common_failed_save'));
    }
  }

  async function applyShare() {
    if (!note) return;
    try {
      const res = await updateNote(note._id, { pairId: sharePair || null });
      setNote(res.note);
      setShareOpen(false);
      toast.success(res.note.pair ? t('notes_now_shared') : t('notes_now_private'));
    } catch (err) {
      console.error(err);
      toast.error(t('common_failed_save'));
    }
  }

  async function handleDelete() {
    if (!note) return;
    try {
      await deleteNote(note._id);
      navigate('/notes', { replace: true });
    } catch {
      toast.error(t('common_failed_delete'));
    }
  }

  if (!note) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">{t('common_loading')}</div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-14 items-center gap-2 px-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="h-9 border-none bg-transparent px-1 text-base font-semibold focus-visible:ring-0"
            placeholder={t('notes_untitled')}
          />
          <Button variant="ghost" size="icon" onClick={() => setShareOpen(true)} aria-label="Share">
            {note.pair ? <Users className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setConfirmDelete(true)} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ErrorBoundary label="NoteEditor">
        <Suspense fallback={<div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>}>
          <NoteEditor noteId={note._id} userName={user?.firstName || 'You'} noteTitle={note.title} />
        </Suspense>
      </ErrorBoundary>

      <Sheet open={shareOpen} onOpenChange={setShareOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle><Share2 className="mr-2 inline h-4 w-4" />{t('notes_share_title')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 p-1">
            <Select value={sharePair || '__private__'} onValueChange={(v) => setSharePair(v === '__private__' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__private__">
                  <span className="inline-flex items-center gap-2"><Lock className="h-3 w-3" /> {t('cal_share_private')}</span>
                </SelectItem>
                {pairs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="inline-flex items-center gap-2"><Users className="h-3 w-3" /> {partnerLabel(p)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('notes_share_desc')}</p>
            <div className="flex gap-2">
              <Button onClick={applyShare} className="flex-1">{t('common_apply')}</Button>
              <Button variant="outline" onClick={() => setShareOpen(false)}>{t('common_cancel')}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('notes_delete_doc_title')}
        description={t('notes_delete_doc_desc')}
        confirmLabel={t('common_delete')}
        onConfirm={handleDelete}
        destructive
      />
    </div>
  );
}
