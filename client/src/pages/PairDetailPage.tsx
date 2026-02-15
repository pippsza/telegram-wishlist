import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { WishList } from '@/components/wishes/WishList';
import { FilterBar } from '@/components/wishes/FilterBar';
import { WishDetailModal } from '@/components/wishes/WishDetailModal';
import { getPartnerWishes, markWishReceived, sendWishToChat } from '@/api/wishes';
import { useT } from '@/i18n';
import type { Wish, WishPriority } from '@/types';

export function PairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<WishPriority | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');

  const fetchWishes = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getPartnerWishes(id);
      setWishes(data.wishes);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchWishes(); }, [fetchWishes]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    wishes.forEach((w) => w.tags.forEach((t) => tags.add(t)));
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
    return result;
  }, [wishes, search, priority, selectedTag]);

  const handleReceive = async (wishId: string) => {
    try {
      await markWishReceived(wishId);
      setWishes((prev) => prev.filter((w) => w._id !== wishId));
    } catch { /* */ }
  };

  const handleSendToChat = async (wish: Wish) => {
    try { await sendWishToChat(wish._id); } catch { /* */ }
  };

  return (
    <>
      <Header title={t('partner_wishes')} />
      <FilterBar search={search} onSearchChange={setSearch} priority={priority} onPriorityChange={setPriority} tags={allTags} selectedTag={selectedTag} onTagChange={setSelectedTag} />
      <WishList wishes={filtered} loading={loading} variant="partner" emptyMessage={t('no_partner_wishes')} onWishClick={setSelectedWish} />
      <WishDetailModal wish={selectedWish} open={!!selectedWish} onOpenChange={(open) => !open && setSelectedWish(null)} variant="partner" onReceive={handleReceive} onSendToChat={handleSendToChat} />
    </>
  );
}
