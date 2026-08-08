/**
 * Gera o código de uma aula a partir do prefixo do curso + módulo +
 * número da aula — BR-005 (Maturidade: MAxx-xx) / BR-006 (CTL:
 * CTxx-xx). Sempre 2 dígitos, sempre este helper — nunca duplicar essa
 * regra em componentes (seção 4 da spec de evolução).
 *
 * Exemplos:
 *   generateLessonCode('MA', 1, 1) -> 'MA01-01'
 *   generateLessonCode('MA', 12, 2) -> 'MA12-02'
 *   generateLessonCode('CT', 3, 1) -> 'CT03-01'
 */
export function generateLessonCode(
  coursePrefix: string,
  moduleNumber: number,
  lessonNumber: number,
): string {
  if (!Number.isInteger(moduleNumber) || moduleNumber <= 0) {
    throw new Error('Número do módulo deve ser um inteiro positivo.');
  }
  if (lessonNumber !== 1 && lessonNumber !== 2) {
    throw new Error('Número da aula deve ser 1 ou 2 (todo módulo tem exatamente duas aulas).');
  }
  const paddedModule = String(moduleNumber).padStart(2, '0');
  const paddedLesson = String(lessonNumber).padStart(2, '0');
  return `${coursePrefix}${paddedModule}-${paddedLesson}`;
}
