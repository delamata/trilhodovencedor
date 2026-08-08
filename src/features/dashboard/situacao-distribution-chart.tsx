'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SITUACAO_LABEL, type Situacao } from '@/lib/domain/situacao';
import type { SituacaoCount } from '@/lib/domain/dashboard-metrics';

// Cores de status (reservadas para estado — nunca usadas como categórica
// em outro lugar). Duas situações intermediárias dividem o tom
// "serious": o rótulo de cada barra já diferencia as duas.
const SITUACAO_COLOR: Record<Situacao, string> = {
  REGULAR: '#0ca30c',
  ATENCAO: '#fab219',
  ALERTA: '#ec835a',
  LIMITE_ATINGIDO: '#ec835a',
  LIMITE_EXCEDIDO: '#d03b3b',
};

function SituacaoTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: SituacaoCount & { label: string } }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-2.5 text-xs shadow-md">
      <p className="font-medium text-foreground">{point.label}</p>
      <p className="text-muted-foreground">{point.count} aluno(s)</p>
    </div>
  );
}

export function SituacaoDistributionChart({ data }: { data: SituacaoCount[] }) {
  const chartData = data.map((d) => ({ ...d, label: SITUACAO_LABEL[d.situacao] }));
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Ainda não há alunos matriculados para mostrar aqui.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
      >
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={130}
          tick={{ fontSize: 12, fill: 'var(--foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: 'var(--muted)' }} content={<SituacaoTooltip />} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28} label={{ position: 'right', fontSize: 12, fill: 'var(--muted-foreground)' }}>
          {chartData.map((entry) => (
            <Cell key={entry.situacao} fill={SITUACAO_COLOR[entry.situacao]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
