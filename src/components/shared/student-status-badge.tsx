import { AlertTriangle, CheckCircle2, OctagonAlert, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SITUACAO_LABEL, type Situacao } from '@/lib/domain/situacao';

// Cores de status (reservadas para estado, nunca reaproveitadas como
// categórica) — good/warning/serious/critical.
const CONFIG: Record<Situacao, { className: string; icon: typeof CheckCircle2 }> = {
  REGULAR: {
    className: 'bg-[#0ca30c]/10 text-[#0ca30c] dark:text-[#3fc93f] border-[#0ca30c]/25',
    icon: CheckCircle2,
  },
  ATENCAO: {
    className: 'bg-[#fab219]/15 text-[#8a5c00] dark:text-[#fab219] border-[#fab219]/35',
    icon: AlertTriangle,
  },
  ALERTA: {
    className: 'bg-[#ec835a]/15 text-[#a13f16] dark:text-[#ec835a] border-[#ec835a]/35',
    icon: TriangleAlert,
  },
  LIMITE_ATINGIDO: {
    className: 'bg-[#d03b3b]/12 text-[#d03b3b] border-[#d03b3b]/30',
    icon: OctagonAlert,
  },
  LIMITE_EXCEDIDO: {
    className: 'bg-[#d03b3b] text-white border-[#d03b3b]',
    icon: OctagonAlert,
  },
};

export function StudentStatusBadge({ situacao }: { situacao: Situacao }) {
  const config = CONFIG[situacao];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', config.className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {SITUACAO_LABEL[situacao]}
    </Badge>
  );
}
