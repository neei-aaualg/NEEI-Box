import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import AdminManager from './AdminManager';
import type { AdminUser, MaterialWithCourse } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Administração',
};

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'ADMIN') {
    redirect('/courses');
  }

  const [pendingMaterials, approvedMaterials, dbUsers] = await Promise.all([
    prisma.material.findMany({
      where: { reviewStatus: 'pending' },
      include: { course: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.material.findMany({
      where: { reviewStatus: 'approved' },
      include: { course: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    }),
  ]);

  const toMaterials = (data: typeof pendingMaterials): MaterialWithCourse[] =>
    data.map((m) => ({
      id: m.id,
      course_id: m.courseId,
      title: m.title,
      description: m.description,
      storage_path: m.storagePath,
      web_url: m.webUrl,
      file_name: m.fileName,
      review_status: m.reviewStatus as MaterialWithCourse['review_status'],
      uploaded_by: m.uploadedById,
      created_at: m.createdAt.toISOString(),
      courses: { id: m.courseId, name: m.course.name },
    }));

  const initialUsers: AdminUser[] = dbUsers.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    created_at: u.createdAt.toISOString(),
  }));

  const counts = {
    pending: pendingMaterials.length,
    approved: approvedMaterials.length,
    admins: dbUsers.filter((u) => u.role === 'ADMIN').length,
  };

  return (
    <AdminManager
      initialPending={toMaterials(pendingMaterials)}
      initialApproved={toMaterials(approvedMaterials)}
      initialUsers={initialUsers}
      currentUserId={user.id}
      initialCounts={counts}
    />
  );
}
