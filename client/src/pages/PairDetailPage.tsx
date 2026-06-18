import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Gift, ExternalLink, Plus, Pencil, Trash2, Check, Package } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WishList } from '@/components/wishes/WishList';
import { FilterBar, type SortOption } from '@/components/wishes/FilterBar';
import { WishDetailModal } from '@/components/wishes/WishDetailModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getPartnerWishes, markWishReceived, sendWishToChat } from '@/api/wishes';
import { listGiftIdeas, setGiftIdeaStatus, deleteGiftIdea } from '@/api/giftIdeas';
import { useT } from '@/i18n';
import type { Wish, WishPriority, GiftIdea, GiftIdeaStatus } from '@/types';

function statusVariant(s: GiftIdeaStatus): 'default' | 'secondary' | 'outline' {
  if (s === 'gifted') return 'default';
  if (s === 'bought') return 'secondary';
  return 'outline';
}

export function PairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();

  const [wishes, setWishes] = useState<Wish[]>([]);
  const [ideas, setIdeas] = useState<GiftIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<WishPriority | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [deleteIdeaId, setDeleteIdeaId] = useState<string | null>(null);

  const fetchWishes = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getPartnerWishes(id);
      setWishes(data.wishes);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchIdeas = useCallback(async () => {
    if (!id) return;
    try {
      const data = await listGiftIdeas({ pairId: id });
      setIdeas(data.ideas);
    } catch {
      /* */
    } finally {
      setLoadingIdeas(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWishes();
    fetchIdeas();
  }, [fetchWishes, fetchIdeas]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    wishes.forEach((w) => w.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags);
  }, [wishes]);

  const filtered = useMemo(() => {
    let result = wishes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((w) => w.description.toLowerCase().includes(q));
    }
    if (priority !== 'all') result = result.filter((w) => w.priority === priority);
    if (selectedTag !== 'all') result = result.filter((w) => w.tags.includes(selectedTag));
    const sorted = [...result];
    if (sort === 'newest') sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === 'priority') {
      const o = { high: 0, medium: 1, low: 2 };
      sorted.sort((a, b) => o[a.priority] - o[b.priority]);
    } else if (sort === 'alpha') sorted.sort((a, b) => a.description.localeCompare(b.description));
    return sorted;
  }, [wishes, search, priority, selectedTag, sort]);

  const handleReceive = async (wishId: string) => {
    try {
      await markWishReceived(wishId);
      setWishes((prev) => prev.filter((w) => w._id !== wishId));
      toast.success(t('toast_wish_received'));
    } catch {
      toast.error(t('toast_error'));
    }
  };

  const handleSendToChat = async (wish: Wish) => {
    try {
      await sendWishToChat(wish._id);
      toast.success(t('toast_sent_to_chat'));
    } catch {
      toast.error(t('toast_error'));
    }
  };

  async function handleIdeaStatus(ideaId: string, status: GiftIdeaStatus) {
    try {
      const res = await setGiftIdeaStatus(ideaId, status);
      setIdeas((prev) => prev.map((i) => (i._id === ideaId ? res.idea : i)));
    } catch {
      toast.error(t('common_failed_save'));
    }
  }

  async function handleIdeaDelete() {
    if (!deleteIdeaId) return;
    try {
      await deleteGiftIdea(deleteIdeaId);
      setIdeas((prev) => prev.filter((i) => i._id !== deleteIdeaId));
      toast.success(t('common_deleted'));
    } catch {
      toast.error(t('common_failed_delete'));
    }
  }

  return (
    <>
      <Header title={t('partner_wishes')} />

      <Tabs defaultValue="wishes" className="w-full">
        <TabsList className="mx-4 mt-2 grid w-[calc(100%-2rem)] grid-cols-2">
          <TabsTrigger value="wishes">{t('partner_wishes')}</TabsTrigger>
          <TabsTrigger value="ideas">{t('gi_title')}</TabsTrigger>
        </TabsList>

        <TabsContent value="wishes" className="mt-0">
          <FilterBar search={search} onSearchChange={setSearch} priority={priority} onPriorityChange={setPriority} tags={allTags} selectedTag={selectedTag} onTagChange={setSelectedTag} sort={sort} onSortChange={setSort} />
          <WishList wishes={filtered} loading={loading} variant="partner" emptyMessage={t('no_partner_wishes')} onWishClick={setSelectedWish} />
        </TabsContent>

        <TabsContent value="ideas" className="mt-0">
          <div className="px-4 pt-3">
            <p className="mb-3 text-xs text-muted-foreground">{t('gi_subtitle')}</p>
            {loadingIdeas && <div className="text-sm text-muted-foreground">{t('common_loading')}</div>}
            {!loadingIdeas && ideas.length === 0 && (
              <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                <Gift className="mx-auto mb-3 h-8 w-8 opacity-40" />
                {t('gi_empty')}
              </div>
            )}
            <ul className="space-y-2">
              {ideas.map((idea) => (
                <Card key={idea._id} className="p-3">
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
                        <a href={idea.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                          <ExternalLink className="h-3 w-3" /> {t('gi_link').toLowerCase()}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/gift-ideas')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteIdeaId(idea._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant={idea.status === 'idea' ? 'default' : 'outline'} className="h-7 flex-1" onClick={() => handleIdeaStatus(idea._id, 'idea')}>
                      {t('gi_status_idea')}
                    </Button>
                    <Button size="sm" variant={idea.status === 'bought' ? 'default' : 'outline'} className="h-7 flex-1" onClick={() => handleIdeaStatus(idea._id, 'bought')}>
                      <Package className="mr-1 h-3 w-3" /> {t('gi_status_bought')}
                    </Button>
                    <Button size="sm" variant={idea.status === 'gifted' ? 'default' : 'outline'} className="h-7 flex-1" onClick={() => handleIdeaStatus(idea._id, 'gifted')}>
                      <Check className="mr-1 h-3 w-3" /> {t('gi_status_gifted')}
                    </Button>
                  </div>
                </Card>
              ))}
            </ul>
          </div>
          <Button
            className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg"
            size="icon"
            onClick={() => navigate('/gift-ideas')}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </TabsContent>
      </Tabs>

      <WishDetailModal wish={selectedWish} open={!!selectedWish} onOpenChange={(open) => !open && setSelectedWish(null)} variant="partner" onReceive={handleReceive} onSendToChat={handleSendToChat} />

      <ConfirmDialog
        open={!!deleteIdeaId}
        onOpenChange={(o) => !o && setDeleteIdeaId(null)}
        title={t('gi_delete_title')}
        description={t('cal_delete_desc')}
        confirmLabel={t('common_delete')}
        onConfirm={handleIdeaDelete}
        destructive
      />
    </>
  );
}
