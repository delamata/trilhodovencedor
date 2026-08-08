import { cn } from '@/lib/utils';

/**
 * Barra de progresso de faltas: preenchimento proporcional a
 * faltas contadas / limite do curso. Muda de cor conforme a situação
 * fica mais crítica — nunca é a única pista (o número ao lado sempre
 * acompanha).
 */
export function AbsenceProgress({
  countedAbsences,
  maxAbsences,
}: {
  countedAbsences: number;
  maxAbsences: number;
}) {
  const ratio = maxAbsences > 0 ? countedAbsences / maxAbsences : 0;
  const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));

  const barColor =
    countedAbsences > maxAbsences
      ? 'bg-[#d03b3b]'
      : ratio >= 1
        ? 'bg-[#d03b3b]'
        : ratio >= (maxAbsences - 1) / maxAbsences
          ? 'bg-[#ec835a]'
          : ratio >= (maxAbsences - 2) / maxAbsences
            ? 'bg-[#fab219]'
            : 'bg-[#0ca30c]';

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Faltas</span>
        <span className="font-medium text-foreground">
          {countedAbsences} de {maxAbsences}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={countedAbsences}
        aria-valuemin={0}
        aria-valuemax={maxAbsences}
        aria-label={`${countedAbsences} de ${maxAbsences} faltas`}
      >
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
