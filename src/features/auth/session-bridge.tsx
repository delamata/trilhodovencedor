'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Lê access_token/refresh_token do fragmento da URL (#...) — mandados
 * pelo Oikos, que já tem a sessão aberta — e estabelece a mesma sessão
 * aqui via supabase.auth.setSession(). O client do @supabase/ssr grava
 * isso em cookie sozinho, então a próxima requisição ao servidor
 * (inclusive o router.refresh() logo abaixo) já enxerga o usuário
 * logado. Sem token válido no fragmento (link acessado direto, token
 * expirado/inválido), cai no /login normal — nunca trava nesta tela.
 */
export function SessionBridge() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      router.replace('/login');
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          router.replace('/login');
          return;
        }
        router.replace('/dashboard');
        router.refresh();
      });
  }, [router]);

  return null;
}
