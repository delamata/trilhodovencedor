/**
 * Traduz os códigos de erro lançados pelas funções `trilho_*` no banco
 * (RAISE EXCEPTION 'CODIGO') para mensagens amigáveis em PT-BR. Mantenha
 * em sincronia com supabase/migrations/*_trilho_v2_functions.sql.
 */
const ERROR_MESSAGES: Record<string, string> = {
  SEM_PERMISSAO: 'Você não tem permissão para realizar esta ação.',
  CURSO_NAO_ENCONTRADO: 'Curso não encontrado.',
  AULA_MODELO_NAO_ENCONTRADA: 'Aula (módulo) não encontrada no curso.',
  TURMA_NAO_ENCONTRADA: 'Turma não encontrada.',
  TURMA_NAO_ENCONTRADA_OU_JA_ATIVA: 'Turma não encontrada ou já está ativa.',
  TURMA_NAO_ENCONTRADA_OU_JA_ENCERRADA: 'Turma não encontrada ou já foi encerrada.',
  TURMA_JA_FINALIZADA: 'Esta turma já foi finalizada.',
  TURMA_NAO_ESTA_ATIVA: 'Esta turma não está ativa no momento.',
  AULA_NAO_ENCONTRADA: 'Aula não encontrada.',
  AULA_CANCELADA: 'Esta aula foi cancelada.',
  AULA_JA_FINALIZADA: 'Esta aula já foi finalizada.',
  ENCERRE_A_CHAMADA_ANTES_DE_CANCELAR: 'Encerre a chamada desta aula antes de cancelá-la.',
  CHAMADA_JA_ABERTA: 'Já existe uma chamada aberta para esta aula.',
  CHAMADA_NAO_ABERTA: 'Não há chamada aberta para esta aula.',
  STATUS_INVALIDO: 'Status inválido.',
  ALUNO_SEM_MATRICULA_NA_TURMA: 'Este aluno não possui matrícula ativa nesta turma.',
  ALUNO_JA_POSSUI_MATRICULA_ATIVA:
    'Este aluno já possui uma matrícula ativa. Encerre a matrícula atual antes de criar uma nova.',
  MATRICULA_NAO_ENCONTRADA_OU_JA_ENCERRADA: 'Matrícula não encontrada ou já encerrada.',
  MATRICULA_NAO_ENCONTRADA: 'Matrícula não encontrada.',
  MATRICULA_NAO_ESTA_ATIVA: 'Esta matrícula não está ativa.',
  LINK_INVALIDO: 'Link de presença inválido ou desativado. Confira o link com a liderança.',
  NOME_MUITO_CURTO: 'Digite pelo menos 2 letras do nome para buscar.',
  MUITAS_TENTATIVAS: 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.',
  NAO_FOI_POSSIVEL_VALIDAR:
    'Não foi possível confirmar sua presença com os dados informados. Confira o nome e os últimos 4 dígitos do telefone.',
  PRESENCA_JA_REGISTRADA: 'Presença já registrada para esta aula.',
};

/** Extrai o código de erro (primeira linha da mensagem) lançado por uma função RPC do Postgres. */
export function friendlyRpcError(rawMessage: string | undefined | null): string {
  const code = (rawMessage ?? '').split('\n')[0]?.trim() ?? '';
  return ERROR_MESSAGES[code] ?? 'Não foi possível concluir a operação. Tente novamente.';
}
