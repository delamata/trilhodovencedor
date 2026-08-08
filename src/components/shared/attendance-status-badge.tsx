import { CheckCircle2, Clock, HelpCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AttendanceStatus } from '@/types/database';

const CONFIG: Record<
  AttendanceStatus | 'PENDENTE',
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  PRESENTE: {
    label: 'Presente',
    className: 'bg-brand-teal/12 text-[#0d6b5c] dark:text-brand-teal border-brand-teal/25',
    icon: CheckCircle2,
  },
  FALTA: {
    label: 'Falta',
    className: 'bg-destructive/10 text-destructive border-destructive/25',
    icon: XCircle,
  },
  FALTA_JUSTIFICADA: {
    label: 'Falta justificada',
    className: 'bg-[#f59e0b]/12 text-[#8a5a00] dark:text-[#fbbf24] border-[#f59e0b]/30',
    icon: HelpCircle,
  },
  ATRASO: {
    label: 'Atraso',
    className: 'bg-brand-blue/12 text-[#2b46a8] dark:text-brand-blue border-brand-blue/25',
    icon: Clock,
  },
  PENDENTE: {
    label: 'Aguardando',
    className: 'bg-muted text-muted-foreground border-border',
    icon: Clock,
  },
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus | 'PENDENTE' }) {
  const config = CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', config.className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </Badge>
  );
}
