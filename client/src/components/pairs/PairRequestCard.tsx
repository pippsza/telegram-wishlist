import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import type { PendingRequest } from '@/types';

interface PairRequestCardProps {
  request: PendingRequest;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export function PairRequestCard({ request, onAccept, onDecline }: PairRequestCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Avatar>
          <AvatarImage src={request.from.photoUrl} />
          <AvatarFallback>{request.from.firstName?.[0] ?? '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {request.from.firstName} {request.from.lastName ?? ''}
          </p>
          {request.from.username && (
            <p className="text-sm text-muted-foreground">@{request.from.username}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="default" onClick={() => onAccept(request.id)}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => onDecline(request.id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
