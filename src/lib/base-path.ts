/**
 * O app inteiro vive sob /trilho (ver `basePath` em next.config.ts) —
 * parte da unificação com o Oikos num domínio só: raiz (/) mostra o
 * Oikos, /trilho mostra este app. O Next já prefixa automaticamente
 * `<Link>`, `redirect()`, `router.push()` e os assets — mas uma tag
 * `<a>` crua (fora do roteamento do Next) precisa do prefixo na mão.
 * Mantenha o valor abaixo em sincronia com o `basePath` do
 * next.config.ts.
 */
export const BASE_PATH = '/trilho';
