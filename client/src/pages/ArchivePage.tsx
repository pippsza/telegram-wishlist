import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { WishList } from '@/components/wishes/WishList';
import { getArchive } from '@/api/wishes';
import type { Wish } from '@/types';

export function ArchivePage() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArchive = useCallback(async () => {
    try {
      const data = await getArchive();
      setWishes(data.wishes);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  return (
    <>
      <Header title="Archive" />
      <WishList
        wishes={wishes}
        loading={loading}
        variant="archived"
        emptyMessage="No received wishes yet."
      />
    </>
  );
}
