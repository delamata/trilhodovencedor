import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  buildHref,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <p>
        {start}–{end} de {totalItems}
      </p>
      <div className="flex items-center gap-2">
        {page <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Anterior
          </Button>
        ) : (
          <Button variant="outline" size="sm" render={<Link href={buildHref(page - 1)} />}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Anterior
          </Button>
        )}
        <span className="tabular-nums">
          {page} / {totalPages}
        </span>
        {page >= totalPages ? (
          <Button variant="outline" size="sm" disabled>
            Próxima
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" render={<Link href={buildHref(page + 1)} />}>
            Próxima
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
