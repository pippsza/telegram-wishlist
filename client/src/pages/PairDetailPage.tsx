import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { WishList } from '@/components/wishes/WishList';
import { getPartnerWishes, markWishReceived } from '@/api/wishes';
import type { Wish } from '@/types';

export function PairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishes = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getPartnerWishes(id);
      setWishes(data.wishes);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

  const handleReceive = async (wishId: string) => {
    try {
      await markWishReceived(wishId);
      setWishes((prev) => prev.filter((w) => w._id !== wishId));
    } catch {
      // Handle error
    }
  };

  return (
    <>
      <Header title="Partner's Wishes" />
      <WishList
        wishes={wishes}
        loading={loading}
        variant="partner"
        emptyMessage="Your partner hasn't added any wishes yet."
        onReceive={handleReceive}
      />
    </>
  );
}
