import { CancelClassDialog } from './cancel-class-dialog';
import { GenerateCtlButton } from './generate-ctl-button';

export function ClassRowActions({
  classId,
  classTitle,
  status,
  courseCode,
  isTuesday,
  hasGeneratedCtl,
}: {
  classId: string;
  classTitle: string;
  status: string;
  courseCode: string;
  isTuesday: boolean;
  hasGeneratedCtl: boolean;
}) {
  const canGenerateCtl = courseCode === 'MATURIDADE' && isTuesday && !hasGeneratedCtl && status !== 'CANCELLED';
  const canCancel = status === 'SCHEDULED' || status === 'COMPLETED';

  if (!canGenerateCtl && !canCancel) return null;

  return (
    <>
      {canGenerateCtl ? <GenerateCtlButton classId={classId} classTitle={classTitle} /> : null}
      {canCancel ? <CancelClassDialog classId={classId} classTitle={classTitle} /> : null}
    </>
  );
}
