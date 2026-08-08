'use client';

import { CheckCircle2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate, formatTimeColumn } from '@/lib/format';
import type { PublicCheckinResult, PublicGetStatusResult, PublicSearchStudentsResult } from '@/types/database';
import { searchPublicStudentsAction, submitPublicCheckinAction } from './actions';

type Step = 'search' | 'confirm-phone' | 'success';

export function PublicCheckinFlow({
  cohortCode,
  token,
  status,
}: {
  cohortCode: string;
  token: string;
  status: PublicGetStatusResult;
}) {
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicSearchStudentsResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicSearchStudentsResult | null>(null);
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicCheckinResult | null>(null);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (trimmedQuery.length < 3) {
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      const res = await searchPublicStudentsAction(cohortCode, token, trimmedQuery);
      if (res.success) {
        setResults(res.students);
        setSearchError(res.students.length === 0 ? 'Nenhum aluno encontrado com este nome nesta turma.' : null);
      } else {
        setResults([]);
        setSearchError(res.message);
      }
      setSearching(false);
    }, 350);

    return () => clearTimeout(timeout);
  }, [trimmedQuery, cohortCode, token]);

  function selectStudent(student: PublicSearchStudentsResult) {
    setSelected(student);
    setCheckinError(null);
    setStep('confirm-phone');
  }

  async function handleConfirm() {
    if (!selected || phoneSuffix.trim().length !== 4) return;
    setSubmitting(true);
    setCheckinError(null);
    try {
      const res = await submitPublicCheckinAction(cohortCode, token, selected.student_id, phoneSuffix.trim());
      if (res.success && res.result) {
        setResult(res.result);
        setStep('success');
      } else {
        setCheckinError(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'success' && result) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand-teal" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Presença confirmada!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.lesson_code} — {result.lesson_title} · {formatDate(result.class_date)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 text-sm shadow-sm">
          <p className="text-muted-foreground">
            {result.presences} presença{result.presences === 1 ? '' : 's'} · {result.absences} falta
            {result.absences === 1 ? '' : 's'} · {result.attendance_pct}% de presença
          </p>
          <p className="mt-1 text-muted-foreground">
            Faltas restantes até o limite: <span className="font-medium text-foreground">{result.absences_remaining}</span>
          </p>
        </div>
      </div>
    );
  }

  if (step === 'confirm-phone' && selected) {
    return (
      <div className="space-y-5">
        <div>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline"
            onClick={() => {
              setStep('search');
              setSelected(null);
              setCheckinError(null);
            }}
          >
            ← Voltar
          </button>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Confirme que é você</h1>
          <p className="mt-1 text-sm text-muted-foreground">{selected.display_name}</p>
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
        {checkinError ? <p className="text-sm text-destructive">{checkinError}</p> : null}
        <Button
          className="h-12 w-full text-base"
          disabled={phoneSuffix.length !== 4 || submitting}
          onClick={handleConfirm}
        >
          {submitting ? 'Confirmando…' : 'Confirmar presença'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{status.course_name}</h1>
        <p className="text-sm text-muted-foreground">
          {status.cohort_name} · {status.lesson_code} — {status.lesson_title}
        </p>
        {status.class_date ? (
          <p className="text-sm text-muted-foreground">
            {formatDate(status.class_date)}
            {status.start_time ? ` às ${formatTimeColumn(status.start_time)}` : ''}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="name-search" className="text-sm font-medium text-foreground">
          Digite seu nome
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
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
          {results.map((student) => (
            <li key={student.student_id}>
              <button
                type="button"
                onClick={() => selectStudent(student)}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40"
              >
                {student.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
