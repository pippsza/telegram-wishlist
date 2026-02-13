import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { WishList } from '@/components/wishes/WishList';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getMyWishes, deleteWish, markWishReceived } from '@/api/wishes';
import type { Wish } from '@/types';

export function MyWishesPage() {
  const navigate = useNavigate();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchWishes = useCallback(async () => {
    try {
      const data = await getMyWishes();
      setWishes(data.wishes);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteWish(deleteId);
      setWishes((prev) => prev.filter((w) => w._id !== deleteId));
    } catch {
      // Handle error
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await markWishReceived(id);
      setWishes((prev) => prev.filter((w) => w._id !== id));
    } catch {
      // Handle error
    }
  };

  return (
    <>
      <Header title="My Wishes" />
      <WishList
        wishes={wishes}
        loading={loading}
        variant="own"
        emptyMessage="No wishes yet. Add your first one!"
        onDelete={setDeleteId}
        onReceive={handleReceive}
      />

      <Button
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => navigate('/wishes/new')}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete wish"
        description="Are you sure you want to delete this wish?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
