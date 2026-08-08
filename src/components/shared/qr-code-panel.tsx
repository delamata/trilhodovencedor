'use client';

import { Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/format';

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState(() => Date.parse(expiresAt) - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Date.parse(expiresAt) - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return remaining;
}

export function QRCodePanel({
  checkinUrl,
  shortCode,
  expiresAt,
}: {
  checkinUrl: string;
  shortCode: string;
  expiresAt: string;
}) {
  const remainingMs = useCountdown(expiresAt);
  const expired = remainingMs <= 0;
  const minutes = Math.max(0, Math.floor(remainingMs / 60000));
  const seconds = Math.max(0, Math.floor((remainingMs % 60000) / 1000));

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(checkinUrl);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">Chamada aberta</p>

      <div className="my-5 flex justify-center">
        <div className="rounded-xl bg-white p-4 shadow-inner">
          <QRCodeSVG value={checkinUrl} size={200} level="M" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        O aluno pode escanear o QR Code, abrir o link direto, ou digitar o código abaixo em{' '}
        <span className="font-medium text-foreground">/presenca</span>.
      </p>

      <div className="my-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Código</p>
        <p className="font-mono text-4xl font-semibold tracking-widest text-foreground">
          {shortCode}
        </p>
      </div>

      <p className={expired ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}>
        {expired
          ? 'Código expirado — encerre e abra uma nova chamada se precisar.'
          : `Expira às ${formatTime(expiresAt)} (${minutes}:${seconds.toString().padStart(2, '0')} restantes)`}
      </p>

      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={copyLink}>
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copiar link
      </Button>

      <p className="mt-3 text-xs text-muted-foreground">
        Por segurança, este código só é exibido uma vez. Se sair desta tela, encerre a chamada e
        abra uma nova para gerar outro.
      </p>
    </div>
  );
}
