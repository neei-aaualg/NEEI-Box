import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import prisma from '@/lib/db';
import MaterialsManager from './MaterialsManager';
import type { Material } from '@/lib/types';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Materiais',
};

export default async function CourseMaterialsPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const isAdmin = user.role === 'ADMIN';

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!course) {
    notFound();
  }

  const materials = await prisma.material.findMany({
    where: { courseId: id },
    orderBy: { createdAt: 'desc' },
  });

  const normalized: Material[] = materials.map((m) => ({
    id: m.id,
    course_id: m.courseId,
    title: m.title,
    description: m.description,
    storage_path: m.storagePath,
    web_url: m.webUrl,
    file_name: m.fileName,
    review_status: m.reviewStatus as Material['review_status'],
    uploaded_by: m.uploadedById,
    created_at: m.createdAt.toISOString(),
  }));

  return (
    <MaterialsManager
      course={course}
      initialMaterials={normalized}
      isAdmin={isAdmin}
    />
  );
}
