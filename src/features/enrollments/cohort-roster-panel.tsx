'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { MemberCombobox } from '@/components/shared/member-combobox';
import { getCelulaOptionsAction, searchMembersAction, type MemberSearchResult } from '@/features/students/actions';
import type { CohortRosterEntry } from '@/features/cohorts/actions';
import { dropoutReasonOptions } from '@/validations/enrollment';
import { endEnrollmentAction, enrollStudentAction, markDropoutAction } from './actions';

const REASON_LABEL: Record<string, string> = {
  MUDANCA: 'Mudança de cidade/igreja',
  SAUDE: 'Saúde',
  TRABALHO: 'Trabalho/horário',
  DESINTERESSE: 'Desinteresse',
  OUTRO: 'Outro',
};

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function CohortRosterPanel({
  cohortId,
  roster,
}: {
  cohortId: string;
  roster: CohortRosterEntry[];
}) {
  const router = useRouter();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [celula, setCelula] = useState('');
  const [celulaOptions, setCelulaOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [dropoutTarget, setDropoutTarget] = useState<CohortRosterEntry | null>(null);
  const [dropoutDate, setDropoutDate] = useState(todayIso());
  const [dropoutReason, setDropoutReason] = useState<string>('OUTRO');
  const [dropoutNotes, setDropoutNotes] = useState('');
  const [dropoutSubmitting, setDropoutSubmitting] = useState(false);

  useEffect(() => {
    if (enrollOpen && mode === 'new' && celulaOptions.length === 0) {
      getCelulaOptionsAction().then((options) => {
        setCelulaOptions(options);
        setCelula((current) => current || (options[0] ?? ''));
      });
    }
  }, [enrollOpen, mode, celulaOptions.length]);

  async function handleEnroll() {
    setSubmitting(true);
    try {
      const result = await enrollStudentAction(
        mode === 'existing'
          ? { mode: 'existing', studentId: selectedMember?.id ?? '', cohortId }
          : { mode: 'new', nome, email, tel, celula, cohortId },
      );
      if (result.success) {
        toast.success(result.message);
        setEnrollOpen(false);
        setSelectedMember(null);
        setNome('');
        setEmail('');
        setTel('');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEndEnrollment(enrollmentId: string) {
    const result = await endEnrollmentAction(enrollmentId);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  async function handleDropout() {
    if (!dropoutTarget) return;
    setDropoutSubmitting(true);
    try {
      const result = await markDropoutAction({
        enrollmentId: dropoutTarget.enrollmentId,
        droppedOutAt: dropoutDate,
        reason: dropoutReason as (typeof dropoutReasonOptions)[number],
        notes: dropoutNotes,
      });
      if (result.success) {
        toast.success(result.message);
        setDropoutTarget(null);
        setDropoutNotes('');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setDropoutSubmitting(false);
    }
  }

  const active = roster.filter((r) => r.status === 'ACTIVE');
  const others = roster.filter((r) => r.status !== 'ACTIVE');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {active.length} aluno{active.length === 1 ? '' : 's'} ativo{active.length === 1 ? '' : 's'}
        </p>
        <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
          <DialogTrigger render={<Button size="sm" />}>Matricular aluno</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Matricular aluno na turma</DialogTitle>
              <DialogDescription>
                Escolha um aluno já cadastrado ou cadastre um novo — em ambos os casos ele será
                matriculado nesta turma.
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === 'existing' ? 'default' : 'outline'}
                onClick={() => setMode('existing')}
              >
                Aluno existente
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'new' ? 'default' : 'outline'}
                onClick={() => setMode('new')}
              >
                Novo aluno
              </Button>
            </div>

            {mode === 'existing' ? (
              <MemberCombobox value={selectedMember} onChange={setSelectedMember} onSearch={searchMembersAction} />
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-nome">Nome completo</Label>
                  <Input id="new-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">E-mail</Label>
                  <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-tel">Telefone</Label>
                  <Input id="new-tel" value={tel} onChange={(e) => setTel(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-celula">Célula</Label>
                  <Select value={celula} onValueChange={(value) => setCelula(value ?? '')}>
                    <SelectTrigger id="new-celula">
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
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={handleEnroll}
                disabled={
                  submitting || (mode === 'existing' ? !selectedMember : !nome || !email || !celula)
                }
              >
                {submitting ? 'Matriculando…' : 'Matricular'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {roster.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum aluno matriculado nesta turma ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Resultado</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {[...active, ...others].map((row) => (
                <tr key={row.enrollmentId} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">{row.nome}</td>
                  <td className="px-3 py-2">
                    <Badge variant={row.status === 'ACTIVE' ? 'secondary' : 'outline'}>{row.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.academicResult}</td>
                  <td className="px-3 py-2 text-right">
                    {row.status === 'ACTIVE' ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDropoutTarget(row)}>
                          Desistência
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button size="sm" variant="ghost">
                              Encerrar
                            </Button>
                          }
                          title="Encerrar matrícula"
                          description={`Encerra a matrícula de ${row.nome} nesta turma (cancelamento administrativo, diferente de desistência).`}
                          confirmLabel="Encerrar matrícula"
                          destructive
                          onConfirm={() => handleEndEnrollment(row.enrollmentId)}
                        />
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(dropoutTarget)} onOpenChange={(open) => !open && setDropoutTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar desistência</DialogTitle>
            <DialogDescription>
              {dropoutTarget?.nome} deixa de contar faltas a partir de agora e não é elegível para
              promoção automática.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="dropout-date">Data da desistência</Label>
              <Input
                id="dropout-date"
                type="date"
                value={dropoutDate}
                onChange={(e) => setDropoutDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dropout-reason">Motivo</Label>
              <Select value={dropoutReason} onValueChange={(value) => setDropoutReason(value ?? 'OUTRO')}>
                <SelectTrigger id="dropout-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dropoutReasonOptions.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {REASON_LABEL[reason]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dropout-notes">Observações (opcional)</Label>
              <Textarea id="dropout-notes" rows={2} value={dropoutNotes} onChange={(e) => setDropoutNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleDropout} disabled={dropoutSubmitting}>
              {dropoutSubmitting ? 'Salvando…' : 'Confirmar desistência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
