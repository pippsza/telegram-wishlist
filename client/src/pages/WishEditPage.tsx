import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { WishForm } from '@/components/wishes/WishForm';
import { WishListSkeleton } from '@/components/shared/WishSkeleton';
import { getWishById, updateWish } from '@/api/wishes';
import { useT } from '@/i18n';
import type { Wish } from '@/types';

export function WishEditPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const [wish, setWish] = useState<Wish | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWish() {
      if (!id) return;
      try {
        const data = await getWishById(id);
        setWish(data.wish);
      } catch { /* */ } finally {
        setLoading(false);
      }
    }
    fetchWish();
  }, [id]);

  if (loading) return <WishListSkeleton count={1} />;
  if (!wish) return <p className="p-4">{t('wish_not_found')}</p>;

  return (
    <>
      <Header title={t('edit_wish')} />
      <WishForm
        initialData={wish}
        onSubmit={(fd) => updateWish(id!, fd) as unknown as Promise<void>}
      />
    </>
  );
}
