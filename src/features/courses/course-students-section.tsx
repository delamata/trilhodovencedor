'use client';

import { useRouter } from 'next/navigation';
import { EnrollDialog } from '@/features/enrollments/enroll-dialog';
import { EnrolledStudentsList } from './enrolled-students-list';
import type { EnrolledStudentRow } from './actions';

export function CourseStudentsSection({
  courseId,
  courseName,
  celulaOptions,
  students,
}: {
  courseId: string;
  courseName: string;
  celulaOptions: string[];
  students: EnrolledStudentRow[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <EnrollDialog
          courseId={courseId}
          courseName={courseName}
          celulaOptions={celulaOptions}
          onEnrolled={() => router.refresh()}
        />
      </div>
      <EnrolledStudentsList students={students} />
    </div>
  );
}
