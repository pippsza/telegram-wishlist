import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2 } from 'lucide-react';
import { acceptInvite } from '@/api/pairs';
import { useT } from '@/i18n';

export function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const t = useT();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAccept = async () => {
    if (!code) return;
    setAccepting(true);
    setError(null);
    try {
      await acceptInvite(code);
      setSuccess(true);
      setTimeout(() => navigate('/pairs'), 1500);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Failed to accept invite';
      setError(message ?? 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  if (!code) return <p className="p-4">{t('invite_invalid')}</p>;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="mt-2">{t('invite_title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {success ? (
            <p className="text-sm text-green-600">{t('invite_created')}</p>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">{t('invite_description')}</p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleAccept} disabled={accepting} className="w-full">
                {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('invite_accept')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
