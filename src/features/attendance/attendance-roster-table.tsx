'use client';

import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AttendanceStatusBadge } from '@/components/shared/attendance-status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { formatTime } from '@/lib/format';
import type { AttendanceStatus } from '@/types/database';
import { markAttendanceAction, type RosterRow } from './actions';
import { JustifyAbsenceDialog } from './justify-absence-dialog';

const SOURCE_LABEL: Record<string, string> = {
  STUDENT_CHECKIN: 'Check-in do aluno',
  TEACHER: 'Professor',
  ADMIN: 'Administrador',
  SYSTEM: 'Automático (chamada encerrada)',
};

export function AttendanceRosterTable({
  classId,
  roster,
  editable,
  onChanged,
}: {
  classId: string;
  roster: RosterRow[];
  editable: boolean;
  onChanged: (roster: RosterRow[]) => void;
}) {
  const [justifyTarget, setJustifyTarget] = useState<RosterRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleMark(row: RosterRow, status: AttendanceStatus) {
    setPendingId(row.studentId);
    try {
      const result = await markAttendanceAction({ classId, studentId: row.studentId, status });
      if (result.success) {
        toast.success(result.message);
        onChanged(
          roster.map((item) =>
            item.studentId === row.studentId ? { ...item, status, source: 'ADMIN' } : item,
          ),
        );
      } else {
        toast.error(result.message);
      }
    } finally {
      setPendingId(null);
    }
  }

  if (roster.length === 0) {
    return <EmptyState title="Nenhum aluno matriculado ativo neste curso." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aluno</TableHead>
            <TableHead>Horário</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Origem</TableHead>
            {editable ? <TableHead className="w-10" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {roster.map((row) => (
            <TableRow key={row.studentId}>
              <TableCell className="font-medium text-foreground">{row.nome}</TableCell>
              <TableCell className="text-muted-foreground">{formatTime(row.checkedInAt)}</TableCell>
              <TableCell>
                <AttendanceStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.source ? SOURCE_LABEL[row.source] : '—'}
              </TableCell>
              {editable ? (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                      aria-label={`Ações para ${row.nome}`}
                      disabled={pendingId === row.studentId}
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleMark(row, 'PRESENTE')}>
                        Marcar presente
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMark(row, 'FALTA')}>
                        Marcar falta
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setJustifyTarget(row)}>
                        Justificar falta
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMark(row, 'ATRASO')}>
                        Marcar atraso
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <JustifyAbsenceDialog
        row={justifyTarget}
        classId={classId}
        onClose={() => setJustifyTarget(null)}
        onJustified={(studentId) => {
          onChanged(
            roster.map((item) =>
              item.studentId === studentId
                ? { ...item, status: 'FALTA_JUSTIFICADA', source: 'ADMIN' }
                : item,
            ),
          );
        }}
      />
    </div>
  );
}
