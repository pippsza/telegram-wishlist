import { ExternalLink, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge } from './PriorityBadge';
import type { Wish } from '@/types';

interface WishCardProps {
  wish: Wish;
  variant: 'own' | 'partner' | 'archived';
  onDelete?: (id: string) => void;
  onReceive?: (id: string) => void;
}

export function WishCard({ wish, variant, onDelete, onReceive }: WishCardProps) {
  const navigate = useNavigate();

  return (
    <Card className={`overflow-hidden ${variant === 'archived' ? 'opacity-60' : ''}`}>
      {wish.photoPath && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={`/uploads/${wish.photoPath}`}
            alt={wish.description}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={wish.priority} />
          {wish.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-sm">{wish.description}</p>

        {wish.link && (
          <a
            href={wish.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Link
          </a>
        )}

        {variant === 'own' && (
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/wishes/${wish._id}/edit`)}
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete?.(wish._id)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onReceive?.(wish._id)}
            >
              <CheckCircle className="mr-1 h-3 w-3" />
              Received
            </Button>
          </div>
        )}

        {variant === 'partner' && (
          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onReceive?.(wish._id)}
            >
              <CheckCircle className="mr-1 h-3 w-3" />
              Mark as received
            </Button>
          </div>
        )}

        {variant === 'archived' && wish.receivedAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            Received {new Date(wish.receivedAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
