import { ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge } from './PriorityBadge';
import { useT } from '@/i18n';
import type { Wish } from '@/types';

interface WishCardProps {
  wish: Wish;
  variant: 'own' | 'partner' | 'archived';
  onClick?: (wish: Wish) => void;
}

export function WishCard({ wish, variant, onClick }: WishCardProps) {
  const t = useT();

  return (
    <Card
      className={`overflow-hidden cursor-pointer transition-shadow hover:shadow-md active:scale-[0.99] ${
        variant === 'archived' ? 'opacity-60' : ''
      }`}
      onClick={() => onClick?.(wish)}
    >
      {wish.photoPath && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={`/uploads/${wish.photoPath}`}
            alt={wish.description}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={wish.priority} />
          {wish.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>

        <p className="text-sm line-clamp-2">{wish.description}</p>

        {wish.link && (
          <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary">
            <ExternalLink className="h-3 w-3" />
            {t('link')}
          </span>
        )}

        {variant === 'archived' && wish.receivedAt && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t('wish_received_date')} {new Date(wish.receivedAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
