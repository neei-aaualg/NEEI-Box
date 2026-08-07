import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MaterialsManager from './MaterialsManager';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CourseMaterialsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Validar Sessão
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Verificar Role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'ADMIN';

  // 3. Obter Detalhes da UC
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, name')
    .eq('id', id)
    .single();

  if (courseError || !course) {
    notFound();
  }

  // 4. Obter Materiais
  const { data: materials, error: materialsError } = await supabase
    .from('materials')
    .select('*')
    .eq('course_id', id)
    .order('created_at', { ascending: false });

  return (
    <MaterialsManager
      course={course}
      initialMaterials={materials || []}
      isAdmin={isAdmin}
      fetchError={materialsError?.message}
    />
  );
}