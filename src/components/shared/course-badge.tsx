import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Teal e azul da própria logo da Videira (ver globals.css --brand-teal/--brand-blue).
const COURSE_STYLE: Record<string, string> = {
  MATURIDADE: 'bg-brand-teal/12 text-[#0d6b5c] dark:text-brand-teal border-brand-teal/25',
  CTL: 'bg-brand-blue/12 text-[#2b46a8] dark:text-brand-blue border-brand-blue/25',
};

export function CourseBadge({ code, name }: { code: string; name?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', COURSE_STYLE[code] ?? 'bg-muted text-muted-foreground')}
    >
      {name ?? code}
    </Badge>
  );
}
