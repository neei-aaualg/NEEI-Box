import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import AdminManager from './AdminManager';
import type { MaterialWithCourse } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Administração',
};

export default async function AdminPage() {
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

  if (profile?.role !== 'ADMIN') {
    redirect('/courses');
  }

  const [pendingResult, approvedResult] = await Promise.all([
    supabase
      .from('materials')
      .select('*, courses(name)')
      .eq('review_status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('materials')
      .select('*, courses(name)')
      .eq('review_status', 'approved')
      .order('created_at', { ascending: false }),
  ]);

  const toMaterials = (data: unknown) =>
    (data as MaterialWithCourse[] | null) || [];

  const counts = {
    pending: pendingResult.data?.length ?? 0,
    approved: approvedResult.data?.length ?? 0,
  };

  return (
    <AdminManager
      initialPending={toMaterials(pendingResult.data)}
      initialApproved={toMaterials(approvedResult.data)}
      initialCounts={counts}
      fetchError={pendingResult.error?.message || approvedResult.error?.message}
    />
  );
}
