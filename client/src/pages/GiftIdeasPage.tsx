import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Gift, ExternalLink, Check, Package, MoreVertical } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { listGiftIdeas, setGiftIdeaStatus, deleteGiftIdea } from '@/api/giftIdeas';
import { getPairs } from '@/api/pairs';
import { useT } from '@/i18n';
import type { GiftIdea, GiftIdeaStatus, Pair } from '@/types';

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
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<GiftIdea[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [filterPair, setFilterPair] = useState<string>('all');
  const [loading, setLoading] = useState(true);
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
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                {t('gi_for')} {pair ? partnerLabel(pair) : ''}
              </h2>
              <ul className="space-y-2">
                {items.map((idea) => (
                  <Card
                    key={idea._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/gift-ideas/${idea._id}/edit`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/gift-ideas/${idea._id}/edit`); } }}
                    className="flex flex-col cursor-pointer gap-2 p-3 transition-colors active:bg-muted/50"
                  >
                    <div className="flex flex-row items-start gap-3">
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
                          <DropdownMenuItem onClick={() => navigate(`/gift-ideas/${idea._id}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" /> {t('gi_edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(idea._id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> {t('common_delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
        onClick={() => {
          const pairParam = filterPair !== 'all' ? `?pairId=${filterPair}` : '';
          navigate(`/gift-ideas/new${pairParam}`);
        }}
        disabled={pairs.length === 0}
      >
        <Plus className="h-6 w-6" />
      </Button>

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
