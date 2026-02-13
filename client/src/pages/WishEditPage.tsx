import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { WishForm } from '@/components/wishes/WishForm';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { getMyWishes, updateWish } from '@/api/wishes';
import type { Wish } from '@/types';

export function WishEditPage() {
  const { id } = useParams<{ id: string }>();
  const [wish, setWish] = useState<Wish | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWish() {
      try {
        const data = await getMyWishes();
        const found = data.wishes.find((w) => w._id === id);
        if (found) setWish(found);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchWish();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!wish) return <p className="p-4">Wish not found</p>;

  return (
    <>
      <Header title="Edit Wish" />
      <WishForm
        initialData={wish}
        onSubmit={(fd) => updateWish(id!, fd) as unknown as Promise<void>}
      />
    </>
  );
}
