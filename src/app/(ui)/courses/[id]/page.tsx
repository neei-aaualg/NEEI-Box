import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'ADMIN';

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, name')
    .eq('id', id)
    .single();

  if (courseError || !course) {
    notFound();
  }

  const { data: materials, error: materialsError } = await supabase
    .from('materials')
    .select('*')
    .eq('course_id', id)
    .order('created_at', { ascending: false });

  return (
    <MaterialsManager
      course={course}
      initialMaterials={(materials as Material[]) || []}
      isAdmin={isAdmin}
      fetchError={materialsError?.message}
    />
  );
}
