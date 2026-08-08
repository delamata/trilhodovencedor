import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: 'default' | 'warning' | 'critical';
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon ? (
          <Icon
            className={cn(
              'h-4 w-4',
              tone === 'critical'
                ? 'text-[#d03b3b]'
                : tone === 'warning'
                  ? 'text-[#fab219]'
                  : 'text-muted-foreground',
            )}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-semibold tabular-nums',
          tone === 'critical' ? 'text-[#d03b3b]' : 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}
