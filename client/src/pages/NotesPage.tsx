import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Plus,
  Folder,
  FileText,
  ChevronRight,
  Pencil,
  Trash2,
  Home,
  Lock,
  Users,
  Search,
  X,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { listNotes, createNote, updateNote, deleteNote } from '@/api/notes';
import { getPairs } from '@/api/pairs';
import { useT } from '@/i18n';
import type { Note, Pair } from '@/types';

type Scope = { kind: 'private' } | { kind: 'pair'; pairId: string };

function scopeKey(scope: Scope): string {
  return scope.kind === 'private' ? 'private' : `pair:${scope.pairId}`;
}

function partnerLabel(p: Pair): string {
  return p.partner.firstName + (p.partner.username ? ` (@${p.partner.username})` : '');
}

export function NotesPage() {
  const navigate = useNavigate();
  const t = useT();
  const [notes, setNotes] = useState<Note[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [scope, setScope] = useState<Scope>({ kind: 'private' });
  const [path, setPath] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<'doc' | 'folder'>('doc');
  const [newTitle, setNewTitle] = useState('');
  const [renameTarget, setRenameTarget] = useState<Note | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  useEffect(() => {
    Promise.all([listNotes(), getPairs()])
      .then(([nRes, pRes]) => {
        setNotes(nRes.notes);
        setPairs(pRes.pairs);
      })
      .catch(() => toast.error(t('common_failed_load')))
      .finally(() => setLoading(false));
  }, [t]);

  // Reset breadcrumb when scope changes.
  useEffect(() => {
    setPath([]);
  }, [scope.kind, scope.kind === 'pair' ? scope.pairId : '']);

  const currentParent = path.length > 0 ? path[path.length - 1] : null;

  const isSearching = search.trim().length > 0;

  const inScope = useMemo(() => {
    return notes.filter((n) => (scope.kind === 'private' ? n.pair === null : n.pair === scope.pairId));
  }, [notes, scope]);

  const visibleChildren = useMemo(() => {
    if (isSearching) {
      const q = search.trim().toLowerCase();
      return inScope
        .filter((n) => n.type === 'doc')
        .filter((n) => n.title.toLowerCase().includes(q) || (n.plainText ?? '').toLowerCase().includes(q));
    }
    return inScope.filter((n) => (n.parent ?? null) === (currentParent?._id ?? null));
  }, [inScope, isSearching, search, currentParent]);

  const folders = isSearching ? [] : visibleChildren.filter((n) => n.type === 'folder');
  const docs = visibleChildren.filter((n) => n.type === 'doc');

  function refreshNotes() {
    listNotes().then((res) => setNotes(res.notes)).catch(() => {});
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    try {
      const res = await createNote({
        type: createKind,
        title: newTitle.trim(),
        pairId: scope.kind === 'pair' ? scope.pairId : null,
        parentId: currentParent?._id ?? null,
      });
      setNotes((prev) => [res.note, ...prev]);
      setCreateOpen(false);
      setNewTitle('');
      if (res.note.type === 'doc') {
        navigate(`/notes/${res.note._id}`);
      }
    } catch {
      toast.error(t('common_failed_save'));
    }
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      const res = await updateNote(renameTarget._id, { title: renameValue.trim() });
      setNotes((prev) => prev.map((n) => (n._id === res.note._id ? res.note : n)));
      setRenameTarget(null);
      setRenameValue('');
    } catch {
      toast.error(t('common_failed_save'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteNote(deleteTarget._id);
      refreshNotes();
      toast.success(t('common_deleted'));
    } catch {
      toast.error(t('common_failed_delete'));
    }
  }

  return (
    <>
      <Header title={t('notes_title')} />

      <div className="px-4 pt-3">
        <Select
          value={scopeKey(scope)}
          onValueChange={(v) => setScope(v === 'private' ? { kind: 'private' } : { kind: 'pair', pairId: v.slice('pair:'.length) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">
              <span className="inline-flex items-center gap-2"><Lock className="h-3 w-3" /> {t('notes_private')}</span>
            </SelectItem>
            {pairs.map((p) => (
              <SelectItem key={p.id} value={`pair:${p.id}`}>
                <span className="inline-flex items-center gap-2"><Users className="h-3 w-3" /> {t('notes_shared_with')} {partnerLabel(p)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('notes_search_placeholder')}
            className="pl-8 pr-8"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Breadcrumb (hidden while searching) */}
        {!isSearching && (
          <div className="mt-3 flex items-center gap-1 overflow-x-auto text-sm">
            <button onClick={() => setPath([])} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <Home className="h-3.5 w-3.5" /> {t('notes_root')}
            </button>
            {path.map((p, i) => (
              <div key={p._id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <button
                  onClick={() => setPath((prev) => prev.slice(0, i + 1))}
                  className="truncate hover:text-foreground"
                >
                  {p.title}
                </button>
              </div>
            ))}
          </div>
        )}

        {loading && <div className="mt-4 text-sm text-muted-foreground">{t('common_loading')}</div>}
        {!loading && folders.length === 0 && docs.length === 0 && (
          <div className="mt-6 rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-3 h-8 w-8 opacity-40" />
            {t('notes_empty')}
          </div>
        )}

        {folders.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {folders.map((f) => (
              <Card key={f._id} className="flex items-center gap-2 px-3 py-2">
                <button onClick={() => setPath((prev) => [...prev, f])} className="flex flex-1 items-center gap-2 text-left">
                  <Folder className="h-4 w-4 text-amber-500" />
                  <span className="truncate font-medium">{f.title}</span>
                </button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setRenameTarget(f); setRenameValue(f.title); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(f)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Card>
            ))}
          </div>
        )}

        {docs.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {docs.map((d) => (
              <Card key={d._id} className="flex items-center gap-2 px-3 py-2">
                <button onClick={() => navigate(`/notes/${d._id}`)} className="flex flex-1 items-center gap-2 text-left min-w-0">
                  <FileText className="h-4 w-4 text-blue-500 flex-none" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{d.title}</div>
                    {d.plainText && <div className="truncate text-xs text-muted-foreground">{d.plainText}</div>}
                    <div className="text-[10px] text-muted-foreground">{format(new Date(d.updatedAt), 'MMM d, HH:mm')}</div>
                  </div>
                </button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setRenameTarget(d); setRenameValue(d.title); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(d)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-20 right-4 z-30 flex flex-col gap-2">
        <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full shadow" onClick={() => { setCreateKind('folder'); setNewTitle(''); setCreateOpen(true); }}>
          <Folder className="h-5 w-5" />
        </Button>
        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => { setCreateKind('doc'); setNewTitle(''); setCreateOpen(true); }}>
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{createKind === 'folder' ? t('notes_new_folder') : t('notes_new_doc')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 p-1">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={createKind === 'folder' ? t('notes_folder_name') : t('notes_note_title')}
              autoFocus
            />
            <div className="text-xs text-muted-foreground">
              {scope.kind === 'private' ? t('notes_will_be_private') : t('notes_will_be_shared')}
              {currentParent && <> {t('notes_inside')} <strong>{currentParent.title}</strong>.</>}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} className="flex-1">{t('common_create')}</Button>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common_cancel')}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!renameTarget} onOpenChange={(o) => { if (!o) setRenameTarget(null); }}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{t('notes_rename')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 p-1">
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <Button onClick={handleRename} className="flex-1">{t('common_save')}</Button>
              <Button variant="outline" onClick={() => setRenameTarget(null)}>{t('common_cancel')}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={deleteTarget?.type === 'folder' ? t('notes_delete_folder_title') : t('notes_delete_doc_title')}
        description={deleteTarget?.type === 'folder' ? t('notes_delete_folder_desc') : t('notes_delete_doc_desc')}
        confirmLabel={t('common_delete')}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
