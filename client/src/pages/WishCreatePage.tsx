import { Header } from '@/components/layout/Header';
import { WishForm } from '@/components/wishes/WishForm';
import { createWish } from '@/api/wishes';
import { useT } from '@/i18n';

export function WishCreatePage() {
  const t = useT();
  return (
    <>
      <Header title={t('new_wish')} />
      <WishForm onSubmit={(fd) => createWish(fd).then(() => {})} />
    </>
  );
}
