import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronRight, Trash2 } from 'lucide-react';
import type { Pair } from '@/types';

interface PairCardProps {
  pair: Pair;
  onDelete?: (id: string) => void;
}

export function PairCard({ pair, onDelete }: PairCardProps) {
  const navigate = useNavigate();
  const { partner } = pair;

  return (
    <Card
      className="cursor-pointer transition-all hover:bg-accent active:scale-[0.98]"
      onClick={() => navigate(`/pairs/${pair.id}`)}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <Avatar className="shrink-0">
          <AvatarImage src={partner.photoUrl} />
          <AvatarFallback>
            {partner.firstName?.[0] ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {partner.firstName} {partner.lastName ?? ''}
          </p>
          {partner.username && (
            <p className="text-sm text-muted-foreground truncate">@{partner.username}</p>
          )}
        </div>
        {onDelete ? (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(pair.id); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </CardContent>
    </Card>
  );
}
