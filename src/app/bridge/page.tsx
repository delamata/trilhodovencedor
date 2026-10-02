import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LogoMark } from '@/components/shared/logo-mark';
import { SessionBridge } from '@/features/auth/session-bridge';

export const metadata: Metadata = { title: 'Entrando… — Trilho do Vencedor' };

/**
 * Ponte de login único a partir do Oikos (ver app.js `abrirTrilhoApp` —
 * mesma origem desde a unificação de domínio). O Oikos manda a sessão
 * já aberta via fragmento da URL (#access_token=...&refresh_token=...)
 * — nunca chega ao servidor (fragmento não é enviado em requisição
 * HTTP), só o JS do navegador lê. Por isso o trabalho de verdade é no
 * client component; esta página só dá a moldura visual.
 */
export default function BridgePage() {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <LogoMark size={48} />
        <p className="text-sm text-muted-foreground">Entrando…</p>
        <Suspense>
          <SessionBridge />
        </Suspense>
      </div>
    </main>
  );
}
