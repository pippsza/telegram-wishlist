import { useEffect, useState, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { WishList } from '@/components/wishes/WishList';
import { FilterBar } from '@/components/wishes/FilterBar';
import { WishDetailModal } from '@/components/wishes/WishDetailModal';
import { getArchiveAll, sendWishToChat } from '@/api/wishes';
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
    return result;
  }, [currentWishes, search, priority, selectedTag]);

  const handleSendToChat = async (wish: Wish) => {
    try { await sendWishToChat(wish._id); } catch (err) { console.error('Send to chat error:', err); }
  };

  return (
    <>
      <Header title={t('archive')} />
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mx-4 mt-2 grid w-[calc(100%-2rem)] grid-cols-2">
          <TabsTrigger value="own">{t('archive_my_wishes')}</TabsTrigger>
          <TabsTrigger value="partners">{t('archive_from_partners')}</TabsTrigger>
        </TabsList>
        <FilterBar search={search} onSearchChange={setSearch} priority={priority} onPriorityChange={setPriority} tags={allTags} selectedTag={selectedTag} onTagChange={setSelectedTag} />
        <TabsContent value="own" className="mt-0">
          <WishList wishes={filtered} loading={loading} variant="archived" emptyMessage={t('no_archive')} onWishClick={setSelectedWish} />
        </TabsContent>
        <TabsContent value="partners" className="mt-0">
          <WishList wishes={filtered} loading={loading} variant="archived" emptyMessage={t('no_archive')} onWishClick={setSelectedWish} />
        </TabsContent>
      </Tabs>
      <WishDetailModal wish={selectedWish} open={!!selectedWish} onOpenChange={(open) => !open && setSelectedWish(null)} variant="archived" onSendToChat={handleSendToChat} />
    </>
  );
}
