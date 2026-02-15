import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, Users } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PairCard } from '@/components/pairs/PairCard';
import { PairRequestCard } from '@/components/pairs/PairRequestCard';
import { InviteLinkModal } from '@/components/pairs/InviteLinkModal';
import { EmptyState } from '@/components/shared/EmptyState';
import { PairListSkeleton } from '@/components/shared/PairSkeleton';
import { getPairs, respondToPair, sendPairRequest } from '@/api/pairs';
import { searchUsers } from '@/api/users';
import { useT } from '@/i18n';
import type { Pair, PendingRequest, User } from '@/types';

export function PairsPage() {
  const t = useT();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [pendingReceived, setPendingReceived] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const fetchPairs = useCallback(async () => {
    try {
      const data = await getPairs();
      setPairs(data.pairs);
      setPendingReceived(data.pendingReceived);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPairs(); }, [fetchPairs]);

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const data = await searchUsers(searchQuery);
      setSearchResults(data.users);
    } catch { /* */ } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (username: string) => {
    setSendingTo(username);
    try {
      await sendPairRequest(username);
      setSearchResults([]);
      setSearchQuery('');
      fetchPairs();
    } catch { /* */ } finally {
      setSendingTo(null);
    }
  };

  const handleAccept = async (id: string) => {
    try { await respondToPair(id, 'accept'); fetchPairs(); } catch { /* */ }
  };

  const handleDecline = async (id: string) => {
    try { await respondToPair(id, 'decline'); setPendingReceived((prev) => prev.filter((r) => r.id !== id)); } catch { /* */ }
  };

  return (
    <>
      <Header title={t('pairs')} />
      <div className="flex flex-col gap-4 p-4">
        <InviteLinkModal />
        <div className="flex gap-2">
          <Input placeholder={t('search_username')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          <Button variant="outline" size="icon" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            {searchResults.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{user.firstName} {user.lastName ?? ''}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <Button size="sm" disabled={sendingTo === user.username} onClick={() => handleSendRequest(user.username!)}>
                  {sendingTo === user.username ? <Loader2 className="h-4 w-4 animate-spin" /> : t('send_request')}
                </Button>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <PairListSkeleton />
        ) : (
          <>
            {pendingReceived.length > 0 && (
              <>
                <Separator />
                <h2 className="text-sm font-semibold text-muted-foreground">{t('incoming_requests')}</h2>
                {pendingReceived.map((req) => (
                  <PairRequestCard key={req.id} request={req} onAccept={handleAccept} onDecline={handleDecline} />
                ))}
              </>
            )}
            {pairs.length > 0 && (
              <>
                <Separator />
                <h2 className="text-sm font-semibold text-muted-foreground">{t('your_pairs')}</h2>
                {pairs.map((pair) => <PairCard key={pair.id} pair={pair} />)}
              </>
            )}
            {pairs.length === 0 && pendingReceived.length === 0 && (
              <EmptyState icon={<Users className="h-12 w-12" />} title={t('no_pairs')} description={t('no_pairs_hint')} />
            )}
          </>
        )}
      </div>
    </>
  );
}
