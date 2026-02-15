import { WishCard } from './WishCard';
import { WishListSkeleton } from '@/components/shared/WishSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Gift } from 'lucide-react';
import type { Wish } from '@/types';

interface WishListProps {
  wishes: Wish[];
  loading: boolean;
  variant: 'own' | 'partner' | 'archived';
  emptyMessage?: string;
  onWishClick?: (wish: Wish) => void;
}

export function WishList({
  wishes,
  loading,
  variant,
  emptyMessage = 'No wishes yet',
  onWishClick,
}: WishListProps) {
  if (loading) return <WishListSkeleton />;

  if (wishes.length === 0) {
    return (
      <EmptyState
        icon={<Gift className="h-12 w-12" />}
        title={emptyMessage}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {wishes.map((wish) => (
        <WishCard
          key={wish._id}
          wish={wish}
          variant={variant}
          onClick={onWishClick}
        />
      ))}
    </div>
  );
}
