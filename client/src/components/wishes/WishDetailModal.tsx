import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from './PriorityBadge';
import { ExternalLink, Send, CheckCircle, Pencil, Trash2, ArchiveRestore } from 'lucide-react';
import { useT } from '@/i18n';
import type { Wish } from '@/types';

interface WishDetailModalProps {
  wish: Wish | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: 'own' | 'partner' | 'archived';
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReceive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onSendToChat?: (wish: Wish) => void;
}

export function WishDetailModal({
  wish,
  open,
  onOpenChange,
  variant,
  onEdit,
  onDelete,
  onReceive,
  onUnarchive,
  onSendToChat,
}: WishDetailModalProps) {
  const t = useT();
  if (!wish) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 gap-0">
        {wish.photoPath && (
          <div className="w-full">
            <img
              src={`/uploads/${wish.photoPath}`}
              alt={wish.description}
              className="w-full max-h-[50vh] object-contain bg-muted"
            />
          </div>
        )}
        <div className="p-4 space-y-3">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <PriorityBadge priority={wish.priority} />
              {wish.tags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
            <DialogTitle className="text-base font-normal leading-relaxed text-left">
              {wish.description}
            </DialogTitle>
          </DialogHeader>

          {wish.link && (
            <a
              href={wish.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {t('link')}
            </a>
          )}

          {variant === 'archived' && wish.receivedAt && (
            <p className="text-sm text-muted-foreground">
              {t('wish_received_date')} {new Date(wish.receivedAt).toLocaleDateString()}
            </p>
          )}

          {variant === 'archived' && onUnarchive && (
            <Button variant="outline" size="sm" onClick={() => { onUnarchive(wish._id); onOpenChange(false); }}>
              <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
              {t('wish_unarchive')}
            </Button>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {variant === 'own' && (
              <>
                <Button variant="outline" size="sm" onClick={() => { onEdit?.(wish._id); onOpenChange(false); }}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {t('wish_edit')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { onDelete?.(wish._id); onOpenChange(false); }}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {t('wish_delete')}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { onReceive?.(wish._id); onOpenChange(false); }}>
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  {t('wish_received')}
                </Button>
              </>
            )}

            {variant === 'partner' && (
              <Button variant="secondary" size="sm" onClick={() => { onReceive?.(wish._id); onOpenChange(false); }}>
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                {t('wish_mark_received')}
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => onSendToChat?.(wish)}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {t('wish_send_to_chat')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
