'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { formatDate } from '@/lib/format';
import { endEnrollmentAction } from '@/features/enrollments/actions';
import type { EnrolledStudentRow } from './actions';

export function EnrolledStudentsList({ students }: { students: EnrolledStudentRow[] }) {
  const [rows, setRows] = useState(students);

  async function handleEnd(enrollmentId: string) {
    const result = await endEnrollmentAction({ enrollmentId, status: 'CANCELLED' });
    if (result.success) {
      toast.success(result.message);
      setRows((prev) => prev.filter((row) => row.enrollmentId !== enrollmentId));
    } else {
      toast.error(result.message);
    }
  }

  if (rows.length === 0) {
    return <EmptyState title="Nenhum aluno matriculado neste curso ainda." />;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {rows.map((row) => (
        <li key={row.enrollmentId} className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <Link href={`/alunos/${row.studentId}`} className="text-sm font-medium text-foreground hover:underline">
              {row.nome}
            </Link>
            <p className="text-xs text-muted-foreground">
              Matriculado em {formatDate(row.enrolledAt)}
            </p>
          </div>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm">
                Encerrar matrícula
              </Button>
            }
            title="Encerrar matrícula?"
            description={`A matrícula de ${row.nome} será encerrada. O histórico de presenças é mantido.`}
            confirmLabel="Encerrar"
            destructive
            onConfirm={() => handleEnd(row.enrollmentId)}
          />
        </li>
      ))}
    </ul>
  );
}
