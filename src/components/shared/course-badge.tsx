import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const COURSE_STYLE: Record<string, string> = {
  MATURIDADE: 'bg-[#149c88]/12 text-[#0d6b5c] dark:text-[#34d3b8] border-[#149c88]/25',
  CTL: 'bg-[#3b5fdd]/12 text-[#2b46a8] dark:text-[#8fa3ef] border-[#3b5fdd]/25',
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
