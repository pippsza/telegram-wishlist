import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { upcomingEvents } from '@/api/calendar';
import { useT } from '@/i18n';
import type { CalendarEvent } from '@/types';

// Small at-a-glance card on the Wishes home: next 2-3 calendar entries so the
// user notices upcoming birthdays/trips even though Calendar isn't a top-level tab.
export function UpcomingDatesCard() {
  const navigate = useNavigate();
  const t = useT();
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);

  useEffect(() => {
    upcomingEvents(30)
      .then((res) => setEvents(res.events.slice(0, 3)))
      .catch(() => setEvents([]));
  }, []);

  if (!events || events.length === 0) return null;

  return (
    <button
      onClick={() => navigate('/notes?tab=calendar')}
      className="block w-full text-left"
    >
      <Card className="mx-4 mt-3 p-3 transition-colors active:bg-muted/50">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5" /> {t('cal_upcoming')}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
        <ul className="space-y-1">
          {events.map((ev) => {
            const when = ev.occurrence ? new Date(ev.occurrence) : new Date(ev.date);
            return (
              <li key={ev._id} className="flex items-center gap-2 text-sm">
                <span className="w-12 flex-none text-xs text-muted-foreground">
                  {format(when, 'd MMM')}
                </span>
                <span className="truncate">{ev.title}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </button>
  );
}
