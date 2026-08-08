import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AttendanceStatusBadge } from '@/components/shared/attendance-status-badge';
import type { AttendanceStatus } from '@/types/database';
import type { ClassDetail } from './actions';

export function StudentClassView({
  classDetail,
  myStatus,
}: {
  classDetail: ClassDetail;
  myStatus: AttendanceStatus | 'PENDENTE' | null;
}) {
  const canCheckIn = classDetail.status === 'ATTENDANCE_OPEN' && (!myStatus || myStatus === 'PENDENTE');

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
      <p className="text-sm text-muted-foreground">Sua presença nesta aula</p>
      <div className="my-4 flex justify-center">
        {myStatus && myStatus !== 'PENDENTE' ? (
          <AttendanceStatusBadge status={myStatus} />
        ) : (
          <span className="text-sm text-muted-foreground">
            {classDetail.status === 'ATTENDANCE_OPEN'
              ? 'Chamada aberta — registre sua presença.'
              : 'Ainda não registrada.'}
          </span>
        )}
      </div>

      {canCheckIn ? (
        <Button render={<Link href="/presenca" />} size="lg">
          Registrar presença
        </Button>
      ) : null}
    </div>
  );
}
