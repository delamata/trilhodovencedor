'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SITUACAO_LABEL } from '@/lib/domain/situacao';

const COURSE_OPTIONS = [
  { value: 'todos', label: 'Todos os cursos' },
  { value: 'MATURIDADE', label: 'Maturidade' },
  { value: 'CTL', label: 'CTL' },
];

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos os status' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
];

const SITUACAO_OPTIONS = [
  { value: 'todos', label: 'Todas as situações' },
  ...Object.entries(SITUACAO_LABEL).map(([value, label]) => ({ value, label })),
];

export function StudentFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [nome, setNome] = useState(searchParams.get('q') ?? '');
  const isFirstRender = useRef(true);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === 'todos') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      setParam('q', nome || null);
    }, 400);

    return () => clearTimeout(timeout);
    // Só reage a mudanças no texto digitado — setParam/pathname/router
    // são estáveis o suficiente para este debounce de busca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome]);

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative w-full max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder="Buscar por nome…"
          className="pl-9"
          aria-label="Buscar aluno por nome"
        />
      </div>

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
        value={searchParams.get('situacao') ?? 'todos'}
        onValueChange={(value) => setParam('situacao', value)}
      >
        <SelectTrigger className="w-48" aria-label="Filtrar por situação">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SITUACAO_OPTIONS.map((option) => (
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
        <SelectTrigger className="w-40" aria-label="Filtrar por status">
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
