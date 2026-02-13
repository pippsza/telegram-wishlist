import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, Copy, Check, Loader2 } from 'lucide-react';
import { createInvite } from '@/api/pairs';

export function InviteLinkModal() {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    try {
      const data = await createInvite();
      setInviteCode(data.inviteCode);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const inviteLink = inviteCode
    ? `${window.location.origin}/invite/${inviteCode}`
    : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setInviteCode(null);
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Link className="mr-2 h-4 w-4" />
          Create invite link
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite link</DialogTitle>
        </DialogHeader>
        {!inviteCode ? (
          <Button onClick={generateLink} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate link
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this link with the person you want to pair with.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
