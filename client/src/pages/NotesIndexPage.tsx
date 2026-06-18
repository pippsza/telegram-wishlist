import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotesPage } from './NotesPage';
import { CalendarPage } from './CalendarPage';
import { useT } from '@/i18n';

// Combined Notes + Calendar page. Calendar lives as a second tab inside Notes
// because most calendar events relate to a friend you're already paired with,
// so a dedicated bottom-nav slot would be overkill.
export function NotesIndexPage() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const initial = searchParams.get('tab') === 'calendar' ? 'calendar' : 'notes';
  const [tab, setTab] = useState<'notes' | 'calendar'>(initial);

  return (
    <>
      <Header title={tab === 'notes' ? t('notes_title') : t('cal_title')} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'notes' | 'calendar')} className="w-full">
        <TabsList className="mx-4 mt-2 grid w-[calc(100%-2rem)] grid-cols-2">
          <TabsTrigger value="notes">{t('notes_title')}</TabsTrigger>
          <TabsTrigger value="calendar">{t('cal_title')}</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-0">
          <NotesPage embedded />
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <CalendarPage embedded />
        </TabsContent>
      </Tabs>
    </>
  );
}
