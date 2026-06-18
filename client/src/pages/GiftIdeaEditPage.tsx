import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PhotoUpload } from '@/components/wishes/PhotoUpload';
import { listGiftIdeas, createGiftIdea, updateGiftIdea, deleteGiftIdea, getGiftIdea } from '@/api/giftIdeas';
import { getPairs } from '@/api/pairs';
import { useT } from '@/i18n';
import type { GiftIdeaStatus, Pair } from '@/types';

interface FormState {
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

const empty: FormState = {
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

// Full-page form for create/edit of a GiftIdea. Routes:
//   /gift-ideas/new            (defaults to first pair)
//   /gift-ideas/new?pairId=... (preselected friend)
//   /gift-ideas/:id/edit
export function GiftIdeaEditPage() {
  const navigate = useNavigate();
  const t = useT();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const [form, setForm] = useState<FormState>(empty);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getPairs()
      .then((p) => {
        setPairs(p.pairs);
        if (!isEdit) {
          const params = new URLSearchParams(window.location.search);
          const pairId = params.get('pairId') || p.pairs[0]?.id || '';
          setForm((f) => ({ ...f, pairId }));
        }
      })
      .catch(() => toast.error(t('common_failed_load')));
  }, [isEdit, t]);

  useEffect(() => {
    if (!isEdit || !id) return;
    // Direct fetch by id keeps this page independent of any list state.
    getGiftIdea(id)
      .then(({ idea }) => {
        setForm({
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
      })
      .catch((err) => {
        // Fall back to listing if direct fetch ever fails for legacy items.
        console.error('[GiftIdeaEdit] direct fetch failed, falling back to list', err);
        listGiftIdeas()
          .then((res) => {
            const idea = res.ideas.find((i) => i._id === id);
            if (!idea) {
              toast.error(t('common_failed_load'));
              navigate(-1);
              return;
            }
            setForm({
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
          });
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate, t]);

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

      if (isEdit && id) {
        await updateGiftIdea(id, fd);
        toast.success(t('common_updated'));
      } else {
        await createGiftIdea(fd);
        toast.success(t('common_added'));
      }
      navigate(-1);
    } catch (err) {
      console.error('[GiftIdeaEdit] submit failed', err);
      toast.error(t('common_failed_save'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteGiftIdea(id);
      toast.success(t('common_deleted'));
      navigate(-1);
    } catch {
      toast.error(t('common_failed_delete'));
    }
  }

  if (loading) {
    return (
      <>
        <Header title={isEdit ? t('gi_edit') : t('gi_new')} />
        <div className="px-4 pt-4 text-sm text-muted-foreground">{t('common_loading')}</div>
      </>
    );
  }

  return (
    <>
      <Header title={isEdit ? t('gi_edit') : t('gi_new')} />

      <div className="space-y-3 px-4 pt-4">
        <PhotoUpload
          initialUrl={form.existingPhotoPath ? `/uploads/${form.existingPhotoPath}` : undefined}
          onFileChange={(f) => setForm({ ...form, photoFile: f, removePhoto: f === null && !!form.existingPhotoPath })}
          onRemoveExisting={() => setForm({ ...form, removePhoto: true, existingPhotoPath: undefined })}
        />
        <div>
          <Label htmlFor="gi-title">{t('cal_title_label')}</Label>
          <Input id="gi-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus={!isEdit} />
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
            <SelectTrigger>
              <SelectValue placeholder={t('gi_choose_friend')} />
            </SelectTrigger>
            <SelectContent>
              {pairs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {partnerLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('gi_delete_title')}
        description={t('cal_delete_desc')}
        confirmLabel={t('common_delete')}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
