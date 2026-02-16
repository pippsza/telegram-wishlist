import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight } from 'lucide-react';
import type { Pair } from '@/types';

interface PairCardProps {
  pair: Pair;
}

export function PairCard({ pair }: PairCardProps) {
  const navigate = useNavigate();
  const { partner } = pair;

  return (
    <Card
      className="cursor-pointer transition-all hover:bg-accent active:scale-[0.98]"
      onClick={() => navigate(`/pairs/${pair.id}`)}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <Avatar>
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
            <p className="text-sm text-muted-foreground">@{partner.username}</p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
