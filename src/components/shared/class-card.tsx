import Link from 'next/link';
import { CourseBadge } from '@/components/shared/course-badge';
import { ClassStatusBadge } from '@/components/shared/class-status-badge';
import { formatDate, formatTimeColumn } from '@/lib/format';
import { weekdayLabel } from '@/lib/domain/calendar';
import type { ClassStatus } from '@/types/database';

export interface ClassCardData {
  id: string;
  courseCode: string;
  courseName: string;
  classNumber: number;
  title: string;
  classDate: string;
  startTime: string;
  endTime: string;
  status: ClassStatus;
}

export function ClassCard({ data, actions }: { data: ClassCardData; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/aulas/${data.id}`} className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CourseBadge code={data.courseCode} name={data.courseName} />
          <ClassStatusBadge status={data.status} />
        </div>
        <p className="font-medium text-foreground">
          Aula {data.classNumber} — {data.title}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatDate(data.classDate)} ({weekdayLabel(data.classDate)}) · {formatTimeColumn(data.startTime)}–
          {formatTimeColumn(data.endTime)}
        </p>
      </Link>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
