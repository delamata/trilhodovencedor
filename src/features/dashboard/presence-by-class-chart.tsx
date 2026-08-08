'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDate } from '@/lib/format';
import type { PresenceByClassPoint } from '@/lib/domain/dashboard-metrics';

// Hue sequencial único (azul da marca) — uma métrica de magnitude, uma
// série. Usa a CSS var direto (não um hex fixo) para acompanhar o modo escuro.
const BAR_COLOR = 'var(--brand-blue)';

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PresenceByClassPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-2.5 text-xs shadow-md">
      <p className="font-medium text-foreground">{point.label}</p>
      <p className="text-muted-foreground">{formatDate(point.classDate)}</p>
      <p className="mt-1 text-foreground">
        {point.present} de {point.total} presentes ({point.pct}%)
      </p>
    </div>
  );
}

export function PresenceByClassChart({ data }: { data: PresenceByClassPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Ainda não há aulas finalizadas para mostrar aqui.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          label={{ value: 'Presentes', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--muted-foreground)' }}
        />
        <Tooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTooltip />} />
        <Bar dataKey="present" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
