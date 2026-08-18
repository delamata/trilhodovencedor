'use client';

import { CheckCircle2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  PublicRegisterTeacherModulesResult,
  PublicSearchMembersResult,
  PublicTeachableModuleResult,
} from '@/types/database';
import {
  createPublicMemberAction,
  listPublicCelulasAction,
  searchPublicMembersAction,
  submitModuleRegistrationAction,
} from './actions';

type Step = 'identify' | 'select-modules' | 'success';
type IdentifyMode = 'search' | 'new';

interface IdentifiedTeacher {
  memberId: string;
  displayName: string;
  /** Já sabemos os 4 últimos dígitos (acabou de digitar o telefone completo pra se cadastrar). */
  phoneSuffix: string | null;
}

function moduleKey(cohortId: string, moduleNumber: number): string {
  return `${cohortId}::${moduleNumber}`;
}

export function PublicTeacherRegistrationFlow({
  modules,
}: {
  modules: PublicTeachableModuleResult[];
}) {
  const [step, setStep] = useState<Step>('identify');
  const [mode, setMode] = useState<IdentifyMode>('search');

  // busca de cadastro existente
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicSearchMembersResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // cadastro novo
  const [novoNome, setNovoNome] = useState('');
  const [novoTel, setNovoTel] = useState('');
  const [novoCelula, setNovoCelula] = useState('');
  const [celulaOptions, setCelulaOptions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [teacher, setTeacher] = useState<IdentifiedTeacher | null>(null);
  const [phoneSuffix, setPhoneSuffix] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registerResults, setRegisterResults] = useState<PublicRegisterTeacherModulesResult[]>([]);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (trimmedQuery.length < 3) return;
    const timeout = setTimeout(async () => {
      setSearching(true);
      const res = await searchPublicMembersAction(trimmedQuery);
      if (res.success) {
        setResults(res.members);
        setSearchError(res.members.length === 0 ? 'Nenhum membro encontrado com este nome.' : null);
      } else {
        setResults([]);
        setSearchError(res.message);
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(timeout);
  }, [trimmedQuery]);

  useEffect(() => {
    if (mode === 'new' && celulaOptions.length === 0) {
      listPublicCelulasAction().then(setCelulaOptions);
    }
  }, [mode, celulaOptions.length]);

  function selectExisting(member: PublicSearchMembersResult) {
    setTeacher({ memberId: member.member_id, displayName: member.display_name, phoneSuffix: null });
    setPhoneSuffix('');
    setSubmitError(null);
    setStep('select-modules');
  }

  async function handleCreateMember() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await createPublicMemberAction(novoNome, novoTel, novoCelula);
      if (res.success && res.member) {
        const digits = novoTel.replace(/\D/g, '');
        setTeacher({
          memberId: res.member.member_id,
          displayName: res.member.display_name,
          phoneSuffix: digits.slice(-4),
        });
        setPhoneSuffix(digits.slice(-4));
        setStep('select-modules');
      } else {
        setCreateError(res.message);
      }
    } finally {
      setCreating(false);
    }
  }

  function toggleModule(cohortId: string, moduleNumber: number, taken: boolean) {
    if (taken) return;
    setSelected((current) => {
      const next = new Set(current);
      const key = moduleKey(cohortId, moduleNumber);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit() {
    if (!teacher || phoneSuffix.trim().length !== 4 || selected.size === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const selections = Array.from(selected).map((key) => {
        const [cohortId, moduleNumber] = key.split('::');
        return { cohortId: cohortId!, moduleNumber: Number(moduleNumber) };
      });
      const res = await submitModuleRegistrationAction(
        teacher.memberId,
        phoneSuffix.trim(),
        selections,
      );
      if (res.success) {
        setRegisterResults(res.results);
        setStep('success');
      } else {
        setSubmitError(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'success') {
    const STATUS_LABEL: Record<string, string> = {
      REGISTRADO: 'cadastrado agora',
      JA_ERA_SEU: 'já era seu',
      JA_OCUPADO: 'ocupado por outro professor enquanto você confirmava',
      TURMA_INVALIDA: 'turma não disponível',
      MODULO_INVALIDO: 'módulo inválido',
    };
    const anyRegistered = registerResults.some(
      (r) => r.status === 'REGISTRADO' || r.status === 'JA_ERA_SEU',
    );
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand-teal" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cadastro confirmado!</h1>
          <p className="mt-1 text-sm text-muted-foreground">{teacher?.displayName}</p>
        </div>
        <ul className="space-y-2 text-left">
          {registerResults.map((r) => (
            <li
              key={moduleKey(r.cohort_id, r.module_number)}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm"
            >
              <span className="font-medium text-foreground">
                {r.cohort_name ?? 'Turma'} — Módulo {r.module_number}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </li>
          ))}
        </ul>
        {anyRegistered ? (
          <p className="text-sm text-muted-foreground">
            Falta só entrar com seu login (peça acesso à administração, se ainda não tiver um) para
            abrir a chamada e ver a turma.
          </p>
        ) : null}
      </div>
    );
  }

  if (step === 'select-modules' && teacher) {
    const byCohort = new Map<string, PublicTeachableModuleResult[]>();
    for (const m of modules) {
      const list = byCohort.get(m.cohort_id) ?? [];
      list.push(m);
      byCohort.set(m.cohort_id, list);
    }

    return (
      <div className="space-y-5">
        <div>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline"
            onClick={() => {
              setStep('identify');
              setTeacher(null);
              setSubmitError(null);
              setSelected(new Set());
            }}
          >
            ← Voltar
          </button>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Confirme que é você</h1>
          <p className="mt-1 text-sm text-muted-foreground">{teacher.displayName}</p>
        </div>

        {teacher.phoneSuffix === null ? (
          <div className="space-y-1.5">
            <label htmlFor="phone-suffix" className="text-sm font-medium text-foreground">
              Últimos 4 dígitos do seu telefone
            </label>
            <Input
              id="phone-suffix"
              inputMode="numeric"
              maxLength={4}
              value={phoneSuffix}
              onChange={(e) => setPhoneSuffix(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              className="text-center text-lg tracking-widest"
              autoFocus
            />
          </div>
        ) : null}

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Quais módulos você vai lecionar?</p>
          {byCohort.size === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum módulo disponível no momento — fale com a administração.
            </p>
          ) : (
            Array.from(byCohort.entries()).map(([cohortId, cohortModules]) => (
              <div key={cohortId} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {cohortModules[0]!.course_name} — {cohortModules[0]!.cohort_name}
                </p>
                <ul className="space-y-2">
                  {cohortModules.map((m) => {
                    const taken = Boolean(m.taken_by_member_id);
                    const isMine = m.taken_by_member_id === teacher.memberId;
                    const key = moduleKey(m.cohort_id, m.module_number);
                    return (
                      <li key={key}>
                        <label
                          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm ${
                            taken
                              ? 'cursor-not-allowed border-border bg-muted/40 opacity-70'
                              : 'cursor-pointer border-border bg-card'
                          }`}
                        >
                          <Checkbox
                            checked={selected.has(key) || isMine}
                            disabled={taken}
                            onCheckedChange={() =>
                              toggleModule(m.cohort_id, m.module_number, taken)
                            }
                          />
                          <span className="flex-1">
                            <span className="font-medium text-foreground">
                              Módulo {m.module_number}
                            </span>
                            <span className="ml-1 text-muted-foreground">
                              — {m.lesson1_title} / {m.lesson2_title}
                            </span>
                          </span>
                          {taken ? (
                            <span className="text-xs text-muted-foreground">
                              {isMine ? 'seu' : `ocupado (${m.taken_by_name})`}
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

        <Button
          className="h-12 w-full text-base"
          disabled={phoneSuffix.length !== 4 || selected.size === 0 || submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Confirmando…' : 'Confirmar cadastro'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Cadastro de professor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Encontre seu cadastro de membro (ou crie um novo) e escolha quais módulos você vai
          lecionar.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'search' ? 'default' : 'outline'}
          onClick={() => setMode('search')}
        >
          Já sou cadastrado
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'new' ? 'default' : 'outline'}
          onClick={() => setMode('new')}
        >
          Sou novo
        </Button>
      </div>

      {mode === 'search' ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="name-search" className="text-sm font-medium text-foreground">
              Digite seu nome
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="name-search"
                value={query}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuery(value);
                  if (value.trim().length < 3) {
                    setResults([]);
                    setSearchError(null);
                  }
                }}
                placeholder="Pelo menos 3 letras…"
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          {searching ? <p className="text-sm text-muted-foreground">Buscando…</p> : null}
          {searchError ? <p className="text-sm text-muted-foreground">{searchError}</p> : null}

          {results.length > 0 ? (
            <ul className="space-y-2">
              {results.map((member) => (
                <li key={member.member_id}>
                  <button
                    type="button"
                    onClick={() => selectExisting(member)}
                    className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40"
                  >
                    {member.display_name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="novo-nome">Nome completo</Label>
            <Input id="novo-nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="novo-tel">Telefone (com DDD)</Label>
            <Input
              id="novo-tel"
              inputMode="tel"
              value={novoTel}
              onChange={(e) => setNovoTel(e.target.value)}
              placeholder="11999998888"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="novo-celula">Célula</Label>
            <Select value={novoCelula} onValueChange={(v) => setNovoCelula(v ?? '')}>
              <SelectTrigger id="novo-celula">
                <SelectValue placeholder="Selecione a célula" />
              </SelectTrigger>
              <SelectContent>
                {celulaOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
          <Button
            className="h-11 w-full"
            disabled={!novoNome.trim() || !novoTel.trim() || !novoCelula || creating}
            onClick={handleCreateMember}
          >
            {creating ? 'Criando cadastro…' : 'Continuar'}
          </Button>
        </div>
      )}
    </div>
  );
}
