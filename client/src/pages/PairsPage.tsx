import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Search, Loader2, Users, Link as LinkIcon, AtSign, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { PairCard } from '@/components/pairs/PairCard';
import { PairRequestCard } from '@/components/pairs/PairRequestCard';
import { InviteLinkModal } from '@/components/pairs/InviteLinkModal';
import { EmptyState } from '@/components/shared/EmptyState';
import { PairListSkeleton } from '@/components/shared/PairSkeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getPairs, respondToPair, sendPairRequest, deletePair } from '@/api/pairs';
import { searchUsers } from '@/api/users';
import { useT } from '@/i18n';
import type { Pair, PendingRequest, PendingSent, User } from '@/types';

export function PairsPage() {
  const t = useT();
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [pendingReceived, setPendingReceived] = useState<PendingRequest[]>([]);
  const [pendingSent, setPendingSent] = useState<PendingSent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [deletePairId, setDeletePairId] = useState<string | null>(null);

  const fetchPairs = useCallback(async () => {
    try {
      const data = await getPairs();
      setPairs(data.pairs);
      setPendingReceived(data.pendingReceived);
      setPendingSent(data.pendingSent ?? []);
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
    } catch { toast.error(t('toast_error')); } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (username: string) => {
    setSendingTo(username);
    try {
      await sendPairRequest(username);
      setSearchResults([]);
      setSearchQuery('');
      toast.success(t('toast_pair_request_sent'));
      fetchPairs();
    } catch { toast.error(t('toast_error')); } finally {
      setSendingTo(null);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await respondToPair(id, 'accept');
      toast.success(t('toast_pair_accepted'));
      fetchPairs();
    } catch { toast.error(t('toast_error')); }
  };

  const handleDecline = async (id: string) => {
    try {
      await respondToPair(id, 'decline');
      setPendingReceived((prev) => prev.filter((r) => r.id !== id));
      toast.success(t('toast_pair_declined'));
    } catch { toast.error(t('toast_error')); }
  };

  const handleDeletePair = async () => {
    if (!deletePairId) return;
    try {
      await deletePair(deletePairId);
      setPairs((prev) => prev.filter((p) => p.id !== deletePairId));
      toast.success(t('toast_pair_deleted'));
    } catch { toast.error(t('toast_error')); }
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

            {pendingSent.length > 0 && (
              <>
                <Separator />
                <h2 className="text-sm font-semibold text-muted-foreground">{t('pending_sent')}</h2>
                {pendingSent.map((req) => (
                  <Card key={req.id} className="opacity-70">
                    <CardContent className="flex items-center gap-3 p-4">
                      {req.inviteMethod === 'link' ? (
                        <LinkIcon className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <AtSign className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="flex-1 text-sm">
                        {req.inviteMethod === 'link' ? t('pending_sent_link') : t('pending_sent_username')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {pairs.length > 0 && (
              <>
                <Separator />
                <h2 className="text-sm font-semibold text-muted-foreground">{t('your_pairs')}</h2>
                {pairs.map((pair) => (
                  <div key={pair.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <PairCard pair={pair} />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeletePairId(pair.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </>
            )}

            {pairs.length === 0 && pendingReceived.length === 0 && pendingSent.length === 0 && (
              <EmptyState icon={<Users className="h-12 w-12" />} title={t('no_pairs')} description={t('no_pairs_hint')} />
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deletePairId}
        onOpenChange={(open) => !open && setDeletePairId(null)}
        title={t('delete_pair_title')}
        description={t('delete_pair_description')}
        confirmLabel={t('delete_confirm')}
        onConfirm={handleDeletePair}
        destructive
      />
    </>
  );
}
