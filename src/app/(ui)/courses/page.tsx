import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import CoursesManager from './CoursesManager';
import type { Course } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Unidades Curriculares',
};

export default async function CoursesPage() {
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

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, name, year, semester, created_at, materials(count)')
    .order('name', { ascending: true });

  const normalized: Course[] = (courses || []).map((course) => ({
    id: course.id,
    name: course.name,
    year: course.year,
    semester: course.semester,
    created_at: course.created_at,
    materials_count: (course.materials as { count: number }[])?.[0]?.count ?? 0,
  }));

  return (
    <CoursesManager
      initialCourses={normalized}
      isAdmin={isAdmin}
      fetchError={error?.message}
    />
  );
}
