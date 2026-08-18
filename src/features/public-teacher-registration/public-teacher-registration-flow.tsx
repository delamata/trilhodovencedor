'use client';

import { CheckCircle2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type {
  PublicRegisterTeacherResult,
  PublicSearchMembersResult,
  PublicTeachableCohortResult,
} from '@/types/database';
import { searchPublicMembersAction, submitPublicTeacherRegistrationAction } from './actions';

type Step = 'search' | 'select-cohorts' | 'success';

export function PublicTeacherRegistrationFlow({
  cohorts,
}: {
  cohorts: PublicTeachableCohortResult[];
}) {
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicSearchMembersResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<PublicSearchMembersResult | null>(null);

  const [selectedCohortIds, setSelectedCohortIds] = useState<Set<string>>(new Set());
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registerResults, setRegisterResults] = useState<PublicRegisterTeacherResult[]>([]);

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

  function selectMember(member: PublicSearchMembersResult) {
    setSelectedMember(member);
    setSubmitError(null);
    setStep('select-cohorts');
  }

  function toggleCohort(cohortId: string) {
    setSelectedCohortIds((current) => {
      const next = new Set(current);
      if (next.has(cohortId)) next.delete(cohortId);
      else next.add(cohortId);
      return next;
    });
  }

  async function handleSubmit() {
    if (!selectedMember || phoneSuffix.trim().length !== 4 || selectedCohortIds.size === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitPublicTeacherRegistrationAction(
        selectedMember.member_id,
        phoneSuffix.trim(),
        Array.from(selectedCohortIds),
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
    const newlyRegistered = registerResults.filter((r) => !r.already_registered);
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand-teal" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cadastro confirmado!</h1>
          <p className="mt-1 text-sm text-muted-foreground">{selectedMember?.display_name}</p>
        </div>
        <ul className="space-y-2 text-left">
          {registerResults.map((r) => (
            <li
              key={r.cohort_id}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm"
            >
              <span className="font-medium text-foreground">{r.cohort_name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {r.already_registered ? 'já era professor(a)' : 'cadastrado agora'}
              </span>
            </li>
          ))}
        </ul>
        {newlyRegistered.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Falta só entrar com seu login (peça acesso à administração, se ainda não tiver um) para
            abrir a chamada e ver a turma.
          </p>
        ) : null}
      </div>
    );
  }

  if (step === 'select-cohorts' && selectedMember) {
    return (
      <div className="space-y-5">
        <div>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline"
            onClick={() => {
              setStep('search');
              setSelectedMember(null);
              setSubmitError(null);
            }}
          >
            ← Voltar
          </button>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Confirme que é você</h1>
          <p className="mt-1 text-sm text-muted-foreground">{selectedMember.display_name}</p>
        </div>
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

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Quais turmas você vai lecionar?</p>
          {cohorts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma turma disponível no momento — fale com a administração.
            </p>
          ) : (
            <ul className="space-y-2">
              {cohorts.map((cohort) => (
                <li key={cohort.cohort_id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm">
                    <Checkbox
                      checked={selectedCohortIds.has(cohort.cohort_id)}
                      onCheckedChange={() => toggleCohort(cohort.cohort_id)}
                    />
                    <span>
                      <span className="font-medium text-foreground">{cohort.course_name}</span>
                      <span className="ml-1 text-muted-foreground">— {cohort.cohort_name}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

        <Button
          className="h-12 w-full text-base"
          disabled={phoneSuffix.length !== 4 || selectedCohortIds.size === 0 || submitting}
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
          Digite seu nome para encontrar seu cadastro de membro e escolher qual turma você vai
          lecionar.
        </p>
      </div>

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
                onClick={() => selectMember(member)}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40"
              >
                {member.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
