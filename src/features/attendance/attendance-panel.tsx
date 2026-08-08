'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { QRCodePanel } from '@/components/shared/qr-code-panel';
import type { ClassStatus } from '@/types/database';
import {
  closeAttendanceSessionAction,
  getClassRosterAction,
  openAttendanceSessionAction,
  type ClassDetail,
  type OpenSessionResult,
  type RosterRow,
} from './actions';
import { AttendanceRosterTable } from './attendance-roster-table';

const POLL_INTERVAL_MS = 5000;

export function AttendancePanel({
  classDetail,
  initialRoster,
  initialStatus,
}: {
  classDetail: ClassDetail;
  initialRoster: RosterRow[];
  initialStatus: ClassStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ClassStatus>(initialStatus);
  const [roster, setRoster] = useState<RosterRow[]>(initialRoster);
  const [session, setSession] = useState<OpenSessionResult | null>(null);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);

  const pendingCount = useMemo(
    () => roster.filter((row) => row.status === 'PENDENTE').length,
    [roster],
  );
  const presentCount = useMemo(
    () => roster.filter((row) => row.status === 'PRESENTE').length,
    [roster],
  );

  useEffect(() => {
    if (status !== 'ATTENDANCE_OPEN') return;

    const interval = setInterval(() => {
      getClassRosterAction(classDetail.id).then(setRoster);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, classDetail.id]);

  async function handleOpen() {
    setOpening(true);
    try {
      const result = await openAttendanceSessionAction(classDetail.id);
      if (result.success && result.session) {
        toast.success(result.message);
        setSession(result.session);
        setStatus('ATTENDANCE_OPEN');
        const freshRoster = await getClassRosterAction(classDetail.id);
        setRoster(freshRoster);
      } else {
        toast.error(result.message);
      }
    } finally {
      setOpening(false);
    }
  }

  async function handleClose() {
    setClosing(true);
    try {
      const result = await closeAttendanceSessionAction(classDetail.id);
      if (result.success) {
        toast.success(result.message);
        setSession(null);
        setStatus('COMPLETED');
        router.refresh();
        const freshRoster = await getClassRosterAction(classDetail.id);
        setRoster(freshRoster);
      } else {
        toast.error(result.message);
      }
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="space-y-6">
      {status === 'SCHEDULED' ? (
        <div className="flex justify-center">
          <Button onClick={handleOpen} disabled={opening} size="lg">
            {opening ? 'Abrindo…' : 'Abrir chamada'}
          </Button>
        </div>
      ) : null}

      {status === 'ATTENDANCE_OPEN' && session ? (
        <QRCodePanel
          checkinUrl={session.checkinUrl}
          shortCode={session.shortCode}
          expiresAt={session.expiresAt}
        />
      ) : null}

      {status === 'ATTENDANCE_OPEN' ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Presentes: <span className="font-semibold text-foreground">{presentCount}</span> /{' '}
            {roster.length}
          </p>
          <ConfirmDialog
            trigger={
              <Button variant="destructive" disabled={closing}>
                {closing ? 'Encerrando…' : 'Encerrar chamada'}
              </Button>
            }
            title="Encerrar chamada?"
            description={
              pendingCount > 0
                ? `${pendingCount} aluno${pendingCount === 1 ? '' : 's'} ainda não registrou presença. Ao encerrar a chamada, ${pendingCount === 1 ? 'ele será marcado' : 'eles serão marcados'} como falta. Deseja continuar?`
                : 'Todos os alunos já registraram presença. Deseja encerrar a chamada?'
            }
            confirmLabel="Encerrar chamada"
            destructive
            onConfirm={handleClose}
          />
        </div>
      ) : null}

      <AttendanceRosterTable
        classId={classDetail.id}
        roster={roster}
        editable={status === 'ATTENDANCE_OPEN' || status === 'COMPLETED'}
        onChanged={setRoster}
      />
    </div>
  );
}
