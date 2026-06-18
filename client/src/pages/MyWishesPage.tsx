import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { WishList } from '@/components/wishes/WishList';
import { FilterBar, type SortOption } from '@/components/wishes/FilterBar';
import { WishDetailModal } from '@/components/wishes/WishDetailModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { UpcomingDatesCard } from '@/components/shared/UpcomingDatesCard';
import { getMyWishes, getAllPartnerWishes, deleteWish, markWishReceived, sendWishToChat } from '@/api/wishes';
import { useT } from '@/i18n';
import type { Wish, WishPriority } from '@/types';

export function MyWishesPage() {
  const navigate = useNavigate();
  const t = useT();
  const [myWishes, setMyWishes] = useState<Wish[]>([]);
  const [partnerWishes, setPartnerWishes] = useState<Wish[]>([]);
  const [loadingMy, setLoadingMy] = useState(true);
  const [loadingPartner, setLoadingPartner] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [tab, setTab] = useState('my');

  // Filters & sort
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<WishPriority | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('newest');

  const fetchMyWishes = useCallback(async () => {
    try {
      const data = await getMyWishes();
      setMyWishes(data.wishes);
    } catch (err) {
      console.error('Failed to fetch my wishes:', err);
    } finally {
      setLoadingMy(false);
    }
  }, []);

  const fetchPartnerWishes = useCallback(async () => {
    try {
      const data = await getAllPartnerWishes();
      setPartnerWishes(data.wishes);
    } catch (err) {
      console.error('Failed to fetch partner wishes:', err);
    } finally {
      setLoadingPartner(false);
    }
  }, []);

  useEffect(() => {
    fetchMyWishes();
    fetchPartnerWishes();
  }, [fetchMyWishes, fetchPartnerWishes]);

  const currentWishes = tab === 'my' ? myWishes : partnerWishes;
  const currentLoading = tab === 'my' ? loadingMy : loadingPartner;

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
    if (priority !== 'all') {
      result = result.filter((w) => w.priority === priority);
    }
    if (selectedTag !== 'all') {
      result = result.filter((w) => w.tags.includes(selectedTag));
    }
    const sorted = [...result];
    if (sort === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'priority') {
      const order = { high: 0, medium: 1, low: 2 };
      sorted.sort((a, b) => order[a.priority] - order[b.priority]);
    } else if (sort === 'alpha') {
      sorted.sort((a, b) => a.description.localeCompare(b.description));
    }
    return sorted;
  }, [currentWishes, search, priority, selectedTag, sort]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteWish(deleteId);
      setMyWishes((prev) => prev.filter((w) => w._id !== deleteId));
      toast.success(t('toast_wish_deleted'));
    } catch { toast.error(t('toast_error')); }
  };

  const handleReceive = async (id: string) => {
    try {
      await markWishReceived(id);
      setMyWishes((prev) => prev.filter((w) => w._id !== id));
      setPartnerWishes((prev) => prev.filter((w) => w._id !== id));
      toast.success(t('toast_wish_received'));
    } catch { toast.error(t('toast_error')); }
  };

  const handleSendToChat = async (wish: Wish) => {
    try {
      await sendWishToChat(wish._id);
      toast.success(t('toast_sent_to_chat'));
    } catch { toast.error(t('toast_error')); }
  };

  return (
    <>
      <Header title={t('my_wishes')} />

      <UpcomingDatesCard />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mx-4 mt-2 grid w-[calc(100%-2rem)] grid-cols-2">
          <TabsTrigger value="my">{t('archive_my_wishes')}</TabsTrigger>
          <TabsTrigger value="partners">{t('archive_from_partners')}</TabsTrigger>
        </TabsList>

        <FilterBar
          search={search}
          onSearchChange={setSearch}
          priority={priority}
          onPriorityChange={setPriority}
          tags={allTags}
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
          sort={sort}
          onSortChange={setSort}
        />

        <TabsContent value="my" className="mt-0">
          <WishList
            wishes={filtered}
            loading={currentLoading}
            variant="own"
            emptyMessage={t('no_wishes_hint')}
            onWishClick={setSelectedWish}
          />
        </TabsContent>

        <TabsContent value="partners" className="mt-0">
          <WishList
            wishes={filtered}
            loading={currentLoading}
            variant="partner"
            emptyMessage={t('no_partner_wishes')}
            onWishClick={setSelectedWish}
          />
        </TabsContent>
      </Tabs>

      <Button
        className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => navigate('/wishes/new')}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <WishDetailModal
        wish={selectedWish}
        open={!!selectedWish}
        onOpenChange={(open) => !open && setSelectedWish(null)}
        variant={tab === 'my' ? 'own' : 'partner'}
        onEdit={(id) => navigate(`/wishes/${id}/edit`)}
        onDelete={setDeleteId}
        onReceive={handleReceive}
        onSendToChat={handleSendToChat}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('delete_title')}
        description={t('delete_description')}
        confirmLabel={t('delete_confirm')}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
