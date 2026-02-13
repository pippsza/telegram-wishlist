import { Badge } from '@/components/ui/badge';
import type { WishPriority } from '@/types';

const config: Record<WishPriority, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  high: { label: 'High', variant: 'destructive' },
  medium: { label: 'Medium', variant: 'default' },
  low: { label: 'Low', variant: 'secondary' },
};

export function PriorityBadge({ priority }: { priority: WishPriority }) {
  const { label, variant } = config[priority];
  return <Badge variant={variant}>{label}</Badge>;
}
