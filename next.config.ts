import type { NextConfig } from 'next';

// Rotas conhecidas de ANTES da unificação com o Oikos — mantidas aqui
// pra gerar os redirects de compatibilidade logo abaixo. Se um novo
// grupo de rota de topo nascer, adicione o prefixo aqui também.
const OLD_TOP_LEVEL_PATHS = [
  '/dashboard',
  '/turmas',
  '/alunos',
  '/cursos',
  '/relatorios',
  '/configuracoes',
  '/perfil',
  '/aulas',
  '/login',
  '/esqueci-senha',
  '/redefinir-senha',
  '/presenca',
  '/professores',
  '/api',
];

// Onde o Oikos (site estático) está publicado de verdade.
const OIKOS_ORIGIN = 'https://delamata.github.io/oikos';

const nextConfig: NextConfig = {
  // Unificação com o Oikos num domínio só: o Oikos ocupa a raiz (/) e
  // este app passa a viver inteiro sob /trilho. O Next prefixa
  // automaticamente <Link>, redirect(), router.push() e os assets —
  // só tags <a> cruas (fora do roteamento do Next, ver src/lib/base-path.ts)
  // e arquivos estáticos (public/manifest.webmanifest) precisam do
  // prefixo na mão.
  basePath: '/trilho',

  // Compatibilidade: quem tinha um link/favorito salvo de ANTES da
  // unificação (ex: trilhodovencedor-sandy.vercel.app/professores)
  // continua caindo no lugar certo, só que agora em /trilho/professores.
  // `basePath: false` é necessário em cada regra pra o Next tratar
  // `source`/`destination` como caminhos absolutos de verdade — sem
  // isso ele tentaria prefixar o `source` também, e a rota antiga
  // (sem prefixo) nunca bateria.
  // A raiz (/) NÃO redireciona mais pro Trilho: ela é do Oikos (ver
  // `rewrites` abaixo).
  async rewrites() {
    return {
      // `fallback` só roda quando nenhuma rota do Next (nem arquivo de
      // public/) bateu — ou seja, tudo que NÃO é do Trilho cai no Oikos,
      // servido pelo GitHub Pages por trás (proxy transparente: o
      // navegador continua vendo o mesmo domínio, então localStorage/
      // sessão do Oikos funcionam normalmente). O lookahead evita
      // engolir URLs inexistentes de /trilho/* (que devem dar o 404
      // do próprio Trilho, não o do GitHub Pages).
      fallback: [
        {
          source: '/:path((?!trilho(?:/|$)).*)',
          destination: `${OIKOS_ORIGIN}/:path`,
          basePath: false as const,
        },
        { source: '/', destination: `${OIKOS_ORIGIN}/`, basePath: false as const },
      ],
    };
  },

  async redirects() {
    return [
      ...OLD_TOP_LEVEL_PATHS.flatMap((path) => [
        { source: path, destination: `/trilho${path}`, basePath: false as const, permanent: false },
        {
          source: `${path}/:rest*`,
          destination: `/trilho${path}/:rest*`,
          basePath: false as const,
          permanent: false,
        },
      ]),
    ];
  },
};

export default nextConfig;
