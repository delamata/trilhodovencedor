import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { getSupabaseAnonKey, getSupabaseUrl } from './env';

const PUBLIC_PATHS = [
  '/login',
  '/esqueci-senha',
  '/redefinir-senha',
  '/presenca',
  '/professores',
  // Ponte de login único vinda do Oikos (ver src/features/auth/session-bridge.tsx)
  // — chega sem cookie ainda, é o próprio fragmento da URL que estabelece a sessão.
  '/bridge',
];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest'
  );
}

/**
 * Faz o refresh do token de sessão a cada requisição (necessário com
 * @supabase/ssr) e redireciona para /login quem não está autenticado
 * e tenta acessar uma rota protegida. A checagem de PAPEL (admin vs.
 * professor vs. aluno) fica por conta de cada página/rota — aqui só
 * garantimos "está logado ou não".
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    // clone() preserva o basePath (/trilho); new URL('/login', request.url)
    // o perderia e dependeria do redirect de compatibilidade.
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === '/login' || pathname === '/')) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
