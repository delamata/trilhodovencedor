'use client';

import { MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MemberCombobox } from '@/components/shared/member-combobox';
import { formatDate } from '@/lib/format';
import { searchMembersAction, type MemberSearchResult } from '@/features/students/actions';
import {
  assignModuleTeacherAction,
  removeModuleTeacherAction,
  type ModuleTeacherRow,
} from './actions';

/** "11/08/2026 e 18/08/2026", só a(s) data(s) que existir(em), ou "" se nenhuma aula está agendada ainda. */
function formatModuleDates(row: ModuleTeacherRow): string {
  const dates = [row.lesson1Date, row.lesson2Date].filter((d): d is string => Boolean(d));
  if (dates.length === 0) return '';
  return dates.map((d) => formatDate(d)).join(' e ');
}

function buildWhatsAppSummary(cohortLabel: string, rows: ModuleTeacherRow[]): string {
  const lines = [`📋 Professores — ${cohortLabel}`, ''];
  for (const row of rows) {
    const teacher = row.teacherName ?? 'sem professor definido';
    const dates = formatModuleDates(row);
    lines.push(`*Módulo ${row.moduleNumber}*${dates ? ` — 📅 ${dates}` : ''}`);
    lines.push(`${row.lesson1Code} — ${row.lesson1Title}`);
    lines.push(`${row.lesson2Code} — ${row.lesson2Title}`);
    lines.push(`👤 ${teacher}`, '');
  }
  return lines.join('\n').trimEnd();
}

export function ModuleTeachersPanel({
  cohortId,
  cohortLabel,
  rows,
}: {
  cohortId: string;
  cohortLabel: string;
  rows: ModuleTeacherRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [assigningModule, setAssigningModule] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [assigning, setAssigning] = useState(false);

  async function handleRemove(moduleTeacherId: string) {
    setBusyId(moduleTeacherId);
    try {
      const result = await removeModuleTeacherAction(moduleTeacherId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusyId(null);
    }
  }

  function startAssigning(moduleNumber: number) {
    setAssigningModule(moduleNumber);
    setSelectedMember(null);
  }

  function cancelAssigning() {
    setAssigningModule(null);
    setSelectedMember(null);
  }

  async function handleAssign(moduleNumber: number) {
    if (!selectedMember) return;
    setAssigning(true);
    try {
      const result = await assignModuleTeacherAction(cohortId, moduleNumber, selectedMember.id);
      if (result.success) {
        toast.success(result.message);
        setAssigningModule(null);
        setSelectedMember(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setAssigning(false);
    }
  }

  function shareOnWhatsApp() {
    const text = buildWhatsAppSummary(cohortLabel, rows);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  const assignedCount = rows.filter((r) => r.teacherId).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {assignedCount} de {rows.length} módulo{rows.length === 1 ? '' : 's'} com professor
        </p>
        <Button size="sm" variant="outline" onClick={shareOnWhatsApp} disabled={rows.length === 0}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Compartilhar no WhatsApp
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Este curso ainda não tem módulos cadastrados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Módulo</th>
                <th className="px-3 py-2 font-medium">Aulas</th>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Professor</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const dates = formatModuleDates(row);
                return (
                  <tr key={row.moduleNumber} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{row.moduleNumber}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <div>
                        {row.lesson1Code} — {row.lesson1Title}
                      </div>
                      <div>
                        {row.lesson2Code} — {row.lesson2Title}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {dates || <span className="text-xs italic">ainda não agendada</span>}
                    </td>
                    <td className="px-3 py-2">
                      {row.teacherName ? (
                        row.teacherName
                      ) : assigningModule === row.moduleNumber ? (
                        <div className="flex items-center gap-2">
                          <div className="w-56">
                            <MemberCombobox
                              value={selectedMember}
                              onChange={setSelectedMember}
                              onSearch={searchMembersAction}
                              placeholder="Buscar professor…"
                            />
                          </div>
                          <Button
                            size="sm"
                            disabled={!selectedMember || assigning}
                            onClick={() => handleAssign(row.moduleNumber)}
                          >
                            Atribuir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={assigning}
                            onClick={cancelAssigning}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline">sem professor</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {row.moduleTeacherId ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === row.moduleTeacherId}
                          onClick={() => handleRemove(row.moduleTeacherId!)}
                          aria-label={`Remover professor do módulo ${row.moduleNumber}`}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      ) : assigningModule !== row.moduleNumber ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startAssigning(row.moduleNumber)}
                        >
                          Atribuir professor
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
