import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CoursesManager from './CoursesManager';

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
    .select('id, name, created_at')
    .order('created_at', { ascending: false });

  return (
    <CoursesManager
      initialCourses={courses || []}
      isAdmin={isAdmin}
      fetchError={error?.message}
    />
  );
}
