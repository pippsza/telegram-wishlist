import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useT } from '@/i18n';
import type { WishPriority } from '@/types';
import { useState } from 'react';

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  priority: WishPriority | 'all';
  onPriorityChange: (v: WishPriority | 'all') => void;
  tags: string[];
  selectedTag: string | 'all';
  onTagChange: (v: string | 'all') => void;
}

export function FilterBar({
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  tags,
  selectedTag,
  onTagChange,
}: FilterBarProps) {
  const t = useT();
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-col gap-2 px-4 pt-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('filter_search')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-col gap-2">
          <Select value={priority} onValueChange={(v) => onPriorityChange(v as WishPriority | 'all')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('filter_priority')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter_all')}</SelectItem>
              <SelectItem value="high">{t('priority_high')}</SelectItem>
              <SelectItem value="medium">{t('priority_medium')}</SelectItem>
              <SelectItem value="low">{t('priority_low')}</SelectItem>
            </SelectContent>
          </Select>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={selectedTag === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => onTagChange('all')}
              >
                {t('filter_all')}
              </Badge>
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => onTagChange(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
