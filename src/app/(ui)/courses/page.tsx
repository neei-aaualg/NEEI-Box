import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import CoursesManager from './CoursesManager';
import type { Course } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Unidades Curriculares',
};

export default async function CoursesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const isAdmin = user.role === 'ADMIN';

  try {
    const courses = await prisma.course.findMany({
      include: {
        _count: {
          select: { materials: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const normalized: Course[] = courses.map((course) => ({
      id: course.id,
      name: course.name,
      year: course.year,
      semester: course.semester,
      created_at: course.createdAt.toISOString(),
      materials_count: course._count.materials,
    }));

    return (
      <CoursesManager
        initialCourses={normalized}
        isAdmin={isAdmin}
      />
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar Unidades Curriculares.';
    return (
      <CoursesManager
        initialCourses={[]}
        isAdmin={isAdmin}
        fetchError={msg}
      />
    );
  }
}
