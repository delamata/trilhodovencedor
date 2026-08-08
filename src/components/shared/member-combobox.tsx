'use client';

import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { MemberSearchResult } from '@/features/students/actions';

interface MemberComboboxProps {
  value: MemberSearchResult | null;
  onChange: (member: MemberSearchResult | null) => void;
  onSearch: (query: string) => Promise<MemberSearchResult[]>;
  placeholder?: string;
}

/** Busca de aluno/membro existente por nome, com debounce. Usado na matrícula e ao adicionar professor. */
export function MemberCombobox({
  value,
  onChange,
  onSearch,
  placeholder = 'Buscar por nome…',
}: MemberComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

    const timeout = setTimeout(() => {
      if (trimmed.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      onSearch(query)
        .then(setResults)
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, onSearch]);

  const label = useMemo(() => value?.nome ?? placeholder, [value, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-xs',
          !value && 'text-muted-foreground',
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite ao menos 2 letras do nome…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Buscando…
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {query.trim().length < 2
                    ? 'Digite ao menos 2 letras para buscar.'
                    : 'Nenhum aluno encontrado com este nome.'}
                </CommandEmpty>
                <CommandGroup>
                  {results.map((member) => (
                    <CommandItem
                      key={member.id}
                      value={member.id}
                      onSelect={() => {
                        onChange(member);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4',
                          value?.id === member.id ? 'opacity-100' : 'opacity-0',
                        )}
                        aria-hidden="true"
                      />
                      <span>
                        {member.nome}
                        <span className="ml-2 text-xs text-muted-foreground">{member.celula}</span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
