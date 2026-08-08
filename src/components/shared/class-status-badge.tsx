import { CalendarClock, CheckCircle2, CircleSlash, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ClassSessionStatus } from '@/types/database';

const CLASS_STATUS_CONFIG: Record<
  ClassSessionStatus,
  { label: string; className: string; icon: typeof CalendarClock }
> = {
  SCHEDULED: {
    label: 'Agendada',
    className: 'bg-muted text-muted-foreground border-border',
    icon: CalendarClock,
  },
  ATTENDANCE_OPEN: {
    label: 'Chamada aberta',
    className: 'bg-[#f59e0b]/12 text-[#8a5a00] dark:text-[#fbbf24] border-[#f59e0b]/30',
    icon: Radio,
  },
  COMPLETED: {
    label: 'Finalizada',
    className: 'bg-brand-teal/12 text-[#0d6b5c] dark:text-brand-teal border-brand-teal/25',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelada',
    className: 'bg-destructive/10 text-destructive border-destructive/25',
    icon: CircleSlash,
  },
};

export function ClassStatusBadge({ status }: { status: ClassSessionStatus }) {
  const config = CLASS_STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', config.className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </Badge>
  );
}
