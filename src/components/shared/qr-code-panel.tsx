'use client';

import { Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * Painel de QR Code + link genérico. Usado para o link permanente de
 * presença da turma (seção 20) — diferente da v1, não tem expiração
 * própria: o link em si é permanente, o que muda é se há chamada
 * aberta no momento (mostrado fora deste componente).
 */
export function QRCodePanel({
  url,
  title = 'Link de presença da turma',
  helperText = 'Compartilhe este link (ou o QR Code) com os alunos da turma. Ele é permanente — pode ser usado em toda aula, sem precisar gerar um novo código a cada vez.',
}: {
  url: string;
  title?: string;
  helperText?: string;
}) {
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>

      <div className="my-5 flex justify-center">
        <div className="rounded-xl bg-white p-4 shadow-inner">
          <QRCodeSVG value={url} size={200} level="M" />
        </div>
      </div>

      <p className="break-all text-xs text-muted-foreground">{url}</p>

      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={copyLink}>
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copiar link
      </Button>

      <p className="mt-3 text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}
