import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, Copy, Check, Loader2 } from 'lucide-react';
import { createInvite } from '@/api/pairs';
import { useT } from '@/i18n';

export function InviteLinkModal() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    try {
      const data = await createInvite();
      setInviteCode(data.inviteCode);
    } catch { /* */ } finally {
      setLoading(false);
    }
  };

  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'w_ishlist_bot';
  const inviteLink = inviteCode ? `https://t.me/${botUsername}?start=invite_${inviteCode}` : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) { setInviteCode(null); setCopied(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Link className="mr-2 h-4 w-4" />
          {t('create_invite')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('invite_link')}</DialogTitle>
        </DialogHeader>
        {!inviteCode ? (
          <Button onClick={generateLink} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('invite_generate')}
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{t('invite_share_hint')}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
