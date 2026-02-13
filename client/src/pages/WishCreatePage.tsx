import { Header } from '@/components/layout/Header';
import { WishForm } from '@/components/wishes/WishForm';
import { createWish } from '@/api/wishes';

export function WishCreatePage() {
  return (
    <>
      <Header title="New Wish" />
      <WishForm onSubmit={createWish as (fd: FormData) => Promise<void>} />
    </>
  );
}
