/**
 * Traduz os códigos de erro lançados pelas funções `trilho_*` no banco
 * (RAISE EXCEPTION 'CODIGO') para mensagens amigáveis em PT-BR (seção
 * 32 da especificação). Mantenha em sincronia com
 * supabase/migrations/*_trilho_functions.sql.
 */
const ERROR_MESSAGES: Record<string, string> = {
  SEM_PERMISSAO: 'Você não tem permissão para realizar esta ação.',
  ALUNO_JA_POSSUI_MATRICULA_ATIVA:
    'Este aluno já possui uma matrícula ativa. Encerre a matrícula atual antes de criar uma nova.',
  ALUNO_JA_MATRICULADO_NESTE_CURSO: 'Este aluno já está matriculado neste curso.',
  MATRICULA_NAO_ENCONTRADA_OU_JA_ENCERRADA: 'Matrícula não encontrada ou já encerrada.',
  STATUS_INVALIDO: 'Status inválido.',
  AULA_NAO_ENCONTRADA: 'Aula não encontrada.',
  CTL_SOMENTE_EM_TERCA:
    'A aula de CTL só pode ser gerada automaticamente quando a data cai numa terça-feira.',
  CTL_JA_GERADO_PARA_ESTA_AULA: 'Já existe uma aula de CTL gerada a partir desta aula.',
  CURSO_CTL_NAO_CONFIGURADO: 'O curso CTL ainda não está configurado no sistema.',
  ENCERRE_A_CHAMADA_ANTES_DE_CANCELAR: 'Encerre a chamada desta aula antes de cancelá-la.',
  CHAMADA_JA_ABERTA: 'Já existe uma chamada aberta para esta aula.',
  AULA_CANCELADA: 'Esta aula foi cancelada.',
  AULA_JA_FINALIZADA: 'Esta aula já foi finalizada.',
  CHAMADA_NAO_ABERTA: 'Não há chamada aberta para esta aula.',
  ALUNO_NAO_IDENTIFICADO: 'Não foi possível identificar seu cadastro de aluno.',
  CODIGO_INVALIDO: 'Código inválido.',
  CHAMADA_ENCERRADA: 'Esta chamada já foi encerrada.',
  CODIGO_EXPIRADO: 'Este código expirou.',
  SEM_MATRICULA_ATIVA: 'Você não possui matrícula ativa em nenhum curso.',
  CURSO_DIFERENTE: 'Esta aula pertence a outro curso. Sua matrícula é em outro curso.',
  AULA_NAO_E_HOJE: 'Esta aula não é hoje.',
  PRESENCA_JA_REGISTRADA: 'Você já registrou presença nesta aula.',
  ALUNO_SEM_MATRICULA_NO_CURSO: 'Este aluno não possui matrícula ativa neste curso.',
};

/** Extrai o código de erro (primeira linha da mensagem) lançado por uma função RPC do Postgres. */
export function friendlyRpcError(rawMessage: string | undefined | null): string {
  const code = (rawMessage ?? '').split('\n')[0]?.trim() ?? '';
  return ERROR_MESSAGES[code] ?? 'Não foi possível concluir a operação. Tente novamente.';
}
