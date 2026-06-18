import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Users, Heart, Star, Loader2, FileText, Calendar as CalendarIcon, Gift, Link as LinkIcon, Activity } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import {
  checkAdmin,
  getAdminStats,
  getAdminUsers,
  getAdminPairs,
  getAdminWishes,
  getAdminRecent,
  deleteAdminUser,
  deleteAdminPair,
  deleteAdminWish,
  type RecentItem,
} from '@/api/admin';
import type { User, Wish } from '@/types';

interface AdminStats {
  userCount: number;
  pairCount: number;
  wishCount: number;
  activeWishCount: number;
  receivedWishCount: number;
  noteCount: number;
  noteDocCount: number;
  noteFolderCount: number;
  eventCount: number;
  sharedEventCount: number;
  giftIdeaCount: number;
  attachmentCount: number;
}

interface AdminPair {
  _id: string;
  userA: User;
  userB: User | null;
  status: string;
  inviteMethod: string;
  createdAt: string;
}

export function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<(User & { _id: string; createdAt: string; languageCode?: string })[]>([]);
  const [pairs, setPairs] = useState<AdminPair[]>([]);
  const [wishes, setWishes] = useState<(Wish & { owner: User })[]>([]);
  const [recent, setRecent] = useState<RecentItem[] | null>(null);
  const [tab, setTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'user' | 'pair' | 'wish'; id: string } | null>(null);

  useEffect(() => {
    checkAdmin().then((d) => {
      setIsAdmin(d.isAdmin);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [s, u, p, w, r] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminPairs(),
        getAdminWishes(),
        getAdminRecent(40),
      ]);
      setStats(s);
      setUsers(u.users);
      setPairs(p.pairs);
      setWishes(w.wishes);
      setRecent(r.items);
    } catch {
      toast.error('Failed to load admin data');
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'user') {
        await deleteAdminUser(deleteTarget.id);
        setUsers((prev) => prev.filter((u) => u._id !== deleteTarget.id));
      } else if (deleteTarget.type === 'pair') {
        await deleteAdminPair(deleteTarget.id);
        setPairs((prev) => prev.filter((p) => p._id !== deleteTarget.id));
      } else {
        await deleteAdminWish(deleteTarget.id);
        setWishes((prev) => prev.filter((w) => w._id !== deleteTarget.id));
      }
      toast.success('Deleted');
      fetchData();
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <>
      <Header title="Admin" />
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mx-4 mt-2 grid w-[calc(100%-2rem)] grid-cols-5">
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="pairs">Pairs</TabsTrigger>
          <TabsTrigger value="wishes">Wishes</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="p-4">
          {stats && (
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Users className="h-5 w-5" />} label="Users" value={stats.userCount} />
              <StatCard icon={<Heart className="h-5 w-5" />} label="Active pairs" value={stats.pairCount} />
              <StatCard icon={<Star className="h-5 w-5" />} label="Active wishes" value={stats.activeWishCount} />
              <StatCard icon={<Star className="h-5 w-5" />} label="Received wishes" value={stats.receivedWishCount} />
              <StatCard icon={<FileText className="h-5 w-5" />} label="Notes" value={stats.noteDocCount} />
              <StatCard icon={<FileText className="h-5 w-5" />} label="Folders" value={stats.noteFolderCount} />
              <StatCard icon={<CalendarIcon className="h-5 w-5" />} label="Events" value={stats.eventCount} />
              <StatCard icon={<CalendarIcon className="h-5 w-5" />} label="Shared events" value={stats.sharedEventCount} />
              <StatCard icon={<Gift className="h-5 w-5" />} label="Gift ideas" value={stats.giftIdeaCount} />
              <StatCard icon={<LinkIcon className="h-5 w-5" />} label="Attachments" value={stats.attachmentCount} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-1.5 p-4">
          {recent === null && <p className="text-sm text-muted-foreground">Loading...</p>}
          {recent?.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
          {recent?.map((item, i) => (
            <RecentRow key={`${item.kind}-${i}`} item={item} />
          ))}
        </TabsContent>

        <TabsContent value="users" className="p-4 space-y-2">
          {users.map((user) => (
            <Card key={user._id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium text-sm">{user.firstName} {user.lastName ?? ''}</p>
                  <p className="text-xs text-muted-foreground">@{user.username || '—'} · {user.languageCode || '?'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'user', id: user._id })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pairs" className="p-4 space-y-2">
          {pairs.map((pair) => (
            <Card key={pair._id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">
                    {pair.userA?.firstName ?? '?'} ↔ {pair.userB?.firstName ?? '(pending)'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pair.status} · {pair.inviteMethod} · {new Date(pair.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'pair', id: pair._id })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="wishes" className="p-4 space-y-2">
          {wishes.map((wish) => (
            <Card key={wish._id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{wish.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeof wish.owner === 'object' ? wish.owner.firstName : '?'} · {wish.status} · {wish.priority}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setDeleteTarget({ type: 'wish', id: wish._id })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete"
        description={`Are you sure you want to delete this ${deleteTarget?.type}?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="text-primary">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentRow({ item }: { item: RecentItem }) {
  const Icon = {
    user: Users,
    pair: Heart,
    wish: Star,
    note: FileText,
    event: CalendarIcon,
    gift: Gift,
    attachment: LinkIcon,
  }[item.kind] ?? Activity;
  const d = item.data as Record<string, unknown>;
  const ownerName = (() => {
    const owner = d.owner as { firstName?: string; username?: string } | undefined;
    if (owner) return owner.firstName + (owner.username ? ` (@${owner.username})` : '');
    if (item.kind === 'user') return (d.firstName as string) + ((d.username as string) ? ` (@${d.username})` : '');
    if (item.kind === 'pair') {
      const a = d.userA as { firstName?: string } | undefined;
      const b = d.userB as { firstName?: string } | undefined;
      return `${a?.firstName ?? '?'} ↔ ${b?.firstName ?? '?'}`;
    }
    return '';
  })();
  const title = (d.title as string) ?? (d.description as string) ?? (d.kind as string) ?? '';
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-2.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium uppercase text-muted-foreground text-[10px]">{item.kind}</span>
            <span className="truncate">{title}</span>
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {ownerName} · {new Date(item.at).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
