'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COURSE_OPTIONS = [
  { value: 'todos', label: 'Todos os cursos' },
  { value: 'MATURIDADE', label: 'Maturidade' },
  { value: 'CTL', label: 'CTL' },
];

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'SCHEDULED', label: 'Agendada' },
  { value: 'ATTENDANCE_OPEN', label: 'Chamada aberta' },
  { value: 'COMPLETED', label: 'Finalizada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

export function CalendarFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === 'todos') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={searchParams.get('curso') ?? 'todos'}
        onValueChange={(value) => setParam('curso', value)}
      >
        <SelectTrigger className="w-44" aria-label="Filtrar por curso">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COURSE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('status') ?? 'todos'}
        onValueChange={(value) => setParam('status', value)}
      >
        <SelectTrigger className="w-44" aria-label="Filtrar por status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
