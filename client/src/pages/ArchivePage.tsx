import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { WishList } from '@/components/wishes/WishList';
import { FilterBar, type SortOption } from '@/components/wishes/FilterBar';
import { WishDetailModal } from '@/components/wishes/WishDetailModal';
import { getArchiveAll, sendWishToChat, unarchiveWish } from '@/api/wishes';
import { useT } from '@/i18n';
import type { Wish, WishPriority } from '@/types';

export function ArchivePage() {
  const t = useT();
  const [own, setOwn] = useState<Wish[]>([]);
  const [partners, setPartners] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [tab, setTab] = useState('own');
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<WishPriority | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('newest');

  const fetchArchive = useCallback(async () => {
    try {
      const data = await getArchiveAll();
      setOwn(data.own);
      setPartners(data.partners);
    } catch (err) {
      console.error('Failed to fetch archive:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArchive(); }, [fetchArchive]);

  const currentWishes = tab === 'own' ? own : partners;

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    currentWishes.forEach((w) => w.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [currentWishes]);

  const filtered = useMemo(() => {
    let result = currentWishes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((w) => w.description.toLowerCase().includes(q));
    }
    if (priority !== 'all') result = result.filter((w) => w.priority === priority);
    if (selectedTag !== 'all') result = result.filter((w) => w.tags.includes(selectedTag));
    const sorted = [...result];
    if (sort === 'newest') sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === 'priority') { const o = { high: 0, medium: 1, low: 2 }; sorted.sort((a, b) => o[a.priority] - o[b.priority]); }
    else if (sort === 'alpha') sorted.sort((a, b) => a.description.localeCompare(b.description));
    return sorted;
  }, [currentWishes, search, priority, selectedTag, sort]);

  const handleSendToChat = async (wish: Wish) => {
    try {
      await sendWishToChat(wish._id);
      toast.success(t('toast_sent_to_chat'));
    } catch { toast.error(t('toast_error')); }
  };

  const handleUnarchive = async (id: string) => {
    try {
      await unarchiveWish(id);
      setOwn((prev) => prev.filter((w) => w._id !== id));
      toast.success(t('toast_wish_unarchived'));
    } catch { toast.error(t('toast_error')); }
  };

  return (
    <>
      <Header title={t('archive')} />
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mx-4 mt-2 grid w-[calc(100%-2rem)] grid-cols-2">
          <TabsTrigger value="own">{t('archive_my_wishes')}</TabsTrigger>
          <TabsTrigger value="partners">{t('archive_from_partners')}</TabsTrigger>
        </TabsList>
        <FilterBar search={search} onSearchChange={setSearch} priority={priority} onPriorityChange={setPriority} tags={allTags} selectedTag={selectedTag} onTagChange={setSelectedTag} sort={sort} onSortChange={setSort} />
        <TabsContent value="own" className="mt-0">
          <WishList wishes={filtered} loading={loading} variant="archived" emptyMessage={t('no_archive')} onWishClick={setSelectedWish} />
        </TabsContent>
        <TabsContent value="partners" className="mt-0">
          <WishList wishes={filtered} loading={loading} variant="archived" emptyMessage={t('no_archive')} onWishClick={setSelectedWish} />
        </TabsContent>
      </Tabs>
      <WishDetailModal wish={selectedWish} open={!!selectedWish} onOpenChange={(open) => !open && setSelectedWish(null)} variant="archived" onSendToChat={handleSendToChat} onUnarchive={tab === 'own' ? handleUnarchive : undefined} />
    </>
  );
}
