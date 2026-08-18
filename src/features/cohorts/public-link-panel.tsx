'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { QRCodePanel } from '@/components/shared/qr-code-panel';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { regeneratePublicTokenAction, setPublicAttendanceEnabledAction } from './actions';

export function PublicLinkPanel({
  cohortId,
  cohortCode,
  enabled,
  hasToken,
  siteUrl,
}: {
  cohortId: string;
  cohortCode: string;
  enabled: boolean;
  hasToken: boolean;
  siteUrl: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  async function handleToggle(checked: boolean) {
    setBusy(true);
    try {
      const result = await setPublicAttendanceEnabledAction(cohortId, checked);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    setBusy(true);
    try {
      const result = await regeneratePublicTokenAction(cohortId);
      if (result.success && result.token) {
        setNewToken(result.token);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const checkinUrl = newToken ? `${siteUrl}/presenca/${cohortCode}?t=${newToken}` : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div>
          <p className="font-medium text-foreground">Link de presença ativo</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enquanto ativo, o link permanente da turma permite que alunos registrem presença sem
            login, durante uma chamada aberta.
          </p>
        </div>
        <Switch checked={enabled} disabled={busy || !hasToken} onCheckedChange={handleToggle} />
      </div>

      {checkinUrl ? (
        <div className="space-y-2">
          <p className="rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-3 text-sm text-[#8a5a00] dark:text-[#fbbf24]">
            Este link só é exibido agora — copie e distribua para a turma (WhatsApp, mural, etc). Se
            sair desta página sem copiar, será preciso gerar um novo.
          </p>
          <QRCodePanel url={checkinUrl} title={`Presença — ${cohortCode}`} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {hasToken
            ? 'Link já gerado anteriormente. Por segurança, o token não pode ser mostrado novamente — gere um novo link se precisar redistribuí-lo.'
            : 'Nenhum link gerado ainda para esta turma.'}
        </p>
      )}

      <ConfirmDialog
        trigger={
          <Button size="sm" variant="outline" disabled={busy}>
            {hasToken ? 'Gerar novo link' : 'Gerar link de presença'}
          </Button>
        }
        title="Gerar novo link de presença"
        description="O link atual (se houver) deixa de funcionar imediatamente. Só o novo link, mostrado uma única vez após confirmar, poderá ser usado."
        confirmLabel="Gerar novo link"
        onConfirm={handleRegenerate}
      />
    </div>
  );
}
