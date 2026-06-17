import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { PhotoUpload } from './PhotoUpload';
import { useT } from '@/i18n';
import type { Wish, WishPriority, WishOption } from '@/types';

interface WishFormProps {
  initialData?: Wish;
  onSubmit: (formData: FormData) => Promise<void>;
}

export function WishForm({ initialData, onSubmit }: WishFormProps) {
  const navigate = useNavigate();
  const t = useT();
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [link, setLink] = useState(initialData?.link ?? '');
  const [priority, setPriority] = useState<WishPriority>(initialData?.priority ?? 'medium');
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [options, setOptions] = useState<WishOption[]>(initialData?.options ?? []);
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagInput('');
  };

  const addOption = () => setOptions([...options, { label: '', link: '', price: '' }]);
  const updateOption = (i: number, field: keyof WishOption, value: string) =>
    setOptions(options.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)));
  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('description', description.trim());
      formData.append('link', link.trim());
      formData.append('priority', priority);
      formData.append('tags', JSON.stringify(tags));
      formData.append('options', JSON.stringify(options.filter((o) => o.label.trim())));
      if (photo) formData.append('photo', photo);
      if (removePhoto) formData.append('removePhoto', 'true');
      await onSubmit(formData);
      toast.success(initialData ? t('toast_wish_updated') : t('toast_wish_created'));
      navigate(-1);
    } catch {
      toast.error(t('toast_error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <PhotoUpload
        initialUrl={initialData?.photoPath ? `/uploads/${initialData.photoPath}` : undefined}
        onFileChange={setPhoto}
        onRemoveExisting={() => setRemovePhoto(true)}
      />
      <div className="space-y-2">
        <Label htmlFor="description">{t('wish_description')} *</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('wish_description_placeholder')} maxLength={1000} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="link">{t('wish_link')}</Label>
        <Input id="link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder={t('wish_link_placeholder')} />
      </div>
      <div className="space-y-2">
        <Label>{t('wish_priority')}</Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as WishPriority)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="high">{t('priority_high')}</SelectItem>
            <SelectItem value="medium">{t('priority_medium')}</SelectItem>
            <SelectItem value="low">{t('priority_low')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('wish_tags')}</Label>
        <div className="flex gap-2">
          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder={t('wish_tags_placeholder')} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
          <Button type="button" variant="outline" onClick={addTag}>{t('wish_add_tag')}</Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button type="button" onClick={() => setTags(tags.filter((tt) => tt !== tag))} className="rounded-full p-0.5 transition-colors hover:bg-destructive/20 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>{t('wish_options')}</Label>
        <p className="text-xs text-muted-foreground">{t('wish_options_hint')}</p>
        {options.length > 0 && (
          <div className="flex flex-col gap-2">
            {options.map((opt, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-md border border-border p-2">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">{t('wish_or')}</span>
                  <Input value={opt.label} onChange={(e) => updateOption(i, 'label', e.target.value)} placeholder={t('wish_option_label_placeholder')} />
                  <button type="button" onClick={() => removeOption(i)} className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="flex gap-2 pl-7">
                  <Input value={opt.price ?? ''} onChange={(e) => updateOption(i, 'price', e.target.value)} placeholder={t('wish_option_price_placeholder')} className="w-32" />
                  <Input type="url" value={opt.link ?? ''} onChange={(e) => updateOption(i, 'link', e.target.value)} placeholder={t('wish_link_placeholder')} />
                </div>
              </div>
            ))}
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t('wish_add_option')}
        </Button>
      </div>

      <Button type="submit" disabled={submitting || !description.trim()} className="mt-2">
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? t('wish_save') : t('wish_create')}
      </Button>
    </form>
  );
}
