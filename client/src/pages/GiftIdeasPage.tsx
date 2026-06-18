import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Gift, ExternalLink, Check, Package, MoreVertical } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PhotoUpload } from '@/components/wishes/PhotoUpload';
import {
  listGiftIdeas,
  createGiftIdea,
  updateGiftIdea,
  setGiftIdeaStatus,
  deleteGiftIdea,
} from '@/api/giftIdeas';
import { getPairs } from '@/api/pairs';
import { useT } from '@/i18n';
import type { GiftIdea, GiftIdeaStatus, Pair } from '@/types';

interface FormState {
  id?: string;
  title: string;
  body: string;
  link: string;
  price: string;
  pairId: string;
  status: GiftIdeaStatus;
  photoFile: File | null;
  removePhoto: boolean;
  existingPhotoPath?: string;
}

const emptyForm: FormState = {
  title: '',
  body: '',
  link: '',
  price: '',
  pairId: '',
  status: 'idea',
  photoFile: null,
  removePhoto: false,
};

function partnerLabel(p: Pair): string {
  return p.partner.firstName + (p.partner.username ? ` (@${p.partner.username})` : '');
}

function statusVariant(s: GiftIdeaStatus): 'default' | 'secondary' | 'outline' {
  if (s === 'gifted') return 'default';
  if (s === 'bought') return 'secondary';
  return 'outline';
}

export function GiftIdeasPage() {
  const t = useT();
  const [ideas, setIdeas] = useState<GiftIdea[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [filterPair, setFilterPair] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listGiftIdeas(), getPairs()])
      .then(([ideasRes, pairsRes]) => {
        setIdeas(ideasRes.ideas);
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

  const grouped = useMemo(() => {
    const filtered = filterPair === 'all'
      ? ideas
      : ideas.filter((i) => (typeof i.forPair === 'string' ? i.forPair : i.forPair._id) === filterPair);
    const map = new Map<string, GiftIdea[]>();
    for (const idea of filtered) {
      const pairId = typeof idea.forPair === 'string' ? idea.forPair : idea.forPair._id;
      if (!map.has(pairId)) map.set(pairId, []);
      map.get(pairId)!.push(idea);
    }
    return Array.from(map.entries());
  }, [ideas, filterPair]);

  function openCreate() {
    setForm({ ...emptyForm, pairId: pairs[0]?.id ?? '' });
    setOpen(true);
  }

  function openEdit(idea: GiftIdea) {
    setForm({
      id: idea._id,
      title: idea.title,
      body: idea.body ?? '',
      link: idea.link ?? '',
      price: idea.price ?? '',
      pairId: typeof idea.forPair === 'string' ? idea.forPair : idea.forPair._id,
      status: idea.status,
      photoFile: null,
      removePhoto: false,
      existingPhotoPath: idea.photoPath,
    });
    setOpen(true);
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.pairId) {
      toast.error(t('common_required_title_friend'));
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set('title', form.title.trim());
      if (form.body.trim()) fd.set('body', form.body.trim());
      if (form.link.trim()) fd.set('link', form.link.trim());
      if (form.price.trim()) fd.set('price', form.price.trim());
      fd.set('pairId', form.pairId);
      fd.set('status', form.status);
      if (form.photoFile) fd.set('photo', form.photoFile);
      if (form.removePhoto) fd.set('removePhoto', 'true');

      if (form.id) {
        const res = await updateGiftIdea(form.id, fd);
        setIdeas((prev) => prev.map((i) => (i._id === form.id ? res.idea : i)));
        toast.success(t('common_updated'));
      } else {
        const res = await createGiftIdea(fd);
        setIdeas((prev) => [res.idea, ...prev]);
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

  async function handleStatusChange(id: string, status: GiftIdeaStatus) {
    try {
      const res = await setGiftIdeaStatus(id, status);
      setIdeas((prev) => prev.map((i) => (i._id === id ? res.idea : i)));
    } catch {
      toast.error(t('common_failed_save'));
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteGiftIdea(deleteId);
      setIdeas((prev) => prev.filter((i) => i._id !== deleteId));
      toast.success(t('common_deleted'));
    } catch {
      toast.error(t('common_failed_delete'));
    }
  }

  return (
    <>
      <Header title={t('gi_title')} />

      <div className="px-4 pt-4">
        <p className="mb-3 text-xs text-muted-foreground">{t('gi_subtitle')}</p>

        {pairs.length > 1 && (
          <Select value={filterPair} onValueChange={setFilterPair}>
            <SelectTrigger className="mb-3"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('gi_filter_all')}</SelectItem>
              {pairs.map((p) => (
                <SelectItem key={p.id} value={p.id}>{partnerLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {loading && <div className="text-sm text-muted-foreground">{t('common_loading')}</div>}
        {!loading && grouped.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            <Gift className="mx-auto mb-3 h-8 w-8 opacity-40" />
            {t('gi_empty')}
          </div>
        )}

        {grouped.map(([pairId, items]) => {
          const pair = pairById.get(pairId);
          return (
            <div key={pairId} className="mb-5">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">{t('gi_for')} {pair ? partnerLabel(pair) : ''}</h2>
              <ul className="space-y-2">
                {items.map((idea) => (
                  <Card
                    key={idea._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(idea)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(idea); } }}
                    className="cursor-pointer p-3 transition-colors active:bg-muted/50"
                  >
                    <div className="flex gap-3">
                      {idea.photoPath && (
                        <img src={`/uploads/${idea.photoPath}`} alt="" className="h-16 w-16 flex-none rounded object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{idea.title}</span>
                          <Badge variant={statusVariant(idea.status)}>{t(`gi_status_${idea.status}` as const)}</Badge>
                        </div>
                        {idea.price && <div className="text-xs text-muted-foreground">{idea.price}</div>}
                        {idea.body && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{idea.body}</p>}
                        {idea.link && (
                          <a
                            href={idea.link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-primary"
                          >
                            <ExternalLink className="h-3 w-3" /> {t('gi_link').toLowerCase()}
                          </a>
                        )}
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
                          <DropdownMenuItem onClick={() => openEdit(idea)}>
                            <Pencil className="mr-2 h-4 w-4" /> {t('gi_edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(idea._id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> {t('common_delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant={idea.status === 'idea' ? 'default' : 'outline'} className="h-7 flex-1" onClick={() => handleStatusChange(idea._id, 'idea')}>
                        {t('gi_status_idea')}
                      </Button>
                      <Button size="sm" variant={idea.status === 'bought' ? 'default' : 'outline'} className="h-7 flex-1" onClick={() => handleStatusChange(idea._id, 'bought')}>
                        <Package className="mr-1 h-3 w-3" /> {t('gi_status_bought')}
                      </Button>
                      <Button size="sm" variant={idea.status === 'gifted' ? 'default' : 'outline'} className="h-7 flex-1" onClick={() => handleStatusChange(idea._id, 'gifted')}>
                        <Check className="mr-1 h-3 w-3" /> {t('gi_status_gifted')}
                      </Button>
                    </div>
                  </Card>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <Button
        className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={openCreate}
        disabled={pairs.length === 0}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form.id ? t('gi_edit') : t('gi_new')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 p-1">
            <PhotoUpload
              initialUrl={form.existingPhotoPath ? `/uploads/${form.existingPhotoPath}` : undefined}
              onFileChange={(f) => setForm({ ...form, photoFile: f, removePhoto: f === null && !!form.existingPhotoPath })}
              onRemoveExisting={() => setForm({ ...form, removePhoto: true, existingPhotoPath: undefined })}
            />
            <div>
              <Label htmlFor="gi-title">{t('cal_title_label')}</Label>
              <Input id="gi-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="gi-body">{t('gi_note')}</Label>
              <Textarea id="gi-body" rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="gi-price">{t('gi_price')}</Label>
                <Input id="gi-price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="gi-link">{t('gi_link')}</Label>
                <Input id="gi-link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label>{t('gi_for_label')}</Label>
              <Select value={form.pairId} onValueChange={(v) => setForm({ ...form, pairId: v })}>
                <SelectTrigger><SelectValue placeholder={t('gi_choose_friend')} /></SelectTrigger>
                <SelectContent>
                  {pairs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{partnerLabel(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                {form.id ? t('common_save') : t('common_add')}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>{t('common_cancel')}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title={t('gi_delete_title')}
        description={t('cal_delete_desc')}
        confirmLabel={t('common_delete')}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
