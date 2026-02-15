import { Badge } from '@/components/ui/badge';
import { useT } from '@/i18n';
import type { WishPriority } from '@/types';

const config: Record<WishPriority, { key: 'priority_high' | 'priority_medium' | 'priority_low'; className: string }> = {
  high: { key: 'priority_high', className: 'bg-red-500/15 text-red-700 border-red-200 hover:bg-red-500/20' },
  medium: { key: 'priority_medium', className: 'bg-amber-500/15 text-amber-700 border-amber-200 hover:bg-amber-500/20' },
  low: { key: 'priority_low', className: 'bg-blue-500/15 text-blue-700 border-blue-200 hover:bg-blue-500/20' },
};

export function PriorityBadge({ priority }: { priority: WishPriority }) {
  const t = useT();
  const { key, className } = config[priority];
  return <Badge variant="outline" className={className}>{t(key)}</Badge>;
}
