'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AttendanceStatusBadge } from '@/components/shared/attendance-status-badge';
import type { RosterEntry } from '@/lib/domain/roster';
import type { AttendanceStatus } from '@/types/database';
import { markAttendanceAction } from './actions';

const STATUS_OPTIONS: AttendanceStatus[] = ['PRESENTE', 'FALTA', 'FALTA_JUSTIFICADA', 'ATRASO'];

export function AttendanceRosterTable({
  classSessionId,
  roster,
  editable,
}: {
  classSessionId: string;
  roster: RosterEntry[];
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function handleChange(studentId: string, status: AttendanceStatus) {
    setPending(studentId);
    try {
      const result = await markAttendanceAction(classSessionId, studentId, status);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">Nome</th>
            <th className="px-3 py-2 font-medium">Origem</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((row) => (
            <tr key={row.studentId} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 font-medium text-foreground">{row.nome}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{row.source ?? '—'}</td>
              <td className="px-3 py-2">
                {editable ? (
                  <Select
                    value={row.status === 'PENDENTE' ? undefined : row.status}
                    onValueChange={(value) => value && handleChange(row.studentId, value as AttendanceStatus)}
                    disabled={pending === row.studentId}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Pendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <AttendanceStatusBadge status={row.status} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
