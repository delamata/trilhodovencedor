import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Ponte de login único com o Oikos (mesmo Supabase Auth, domínio
 * compartilhado desde a unificação — ver next.config.ts). O Oikos
 * guarda a sessão em localStorage; este app guarda em cookie (via
 * @supabase/ssr). Quando alguém já está logado aqui e abre o Oikos
 * (mesma origem agora), o app.js chama esta rota pra pegar os tokens
 * e logar sozinho lá, sem pedir senha de novo.
 *
 * Só funciona same-origin: não há cabeçalho CORS aqui, então o
 * navegador bloqueia sozinho qualquer chamada vinda de outro domínio
 * (ex: o Oikos acessado direto pelo GitHub Pages, fora do domínio
 * unificado) — a ponte só vale pra quem já está em sistemaoikos.vercel.app.
 * Devolve só os tokens de QUEM JÁ ESTÁ AUTENTICADO nesta requisição
 * (via o cookie que o próprio navegador manda) — nunca de outra
 * pessoa, então não há elevação de privilégio aqui.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'SEM_SESSAO' }, { status: 401 });
  }

  return NextResponse.json(
    { access_token: session.access_token, refresh_token: session.refresh_token },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
