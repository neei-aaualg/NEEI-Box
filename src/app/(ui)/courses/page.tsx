// app/courses/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

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

  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">
            Cursos
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Explora as unidades curriculares disponíveis na plataforma.
          </p>
        </div>

        {profile?.role === 'ADMIN' && (
          <Link
            href="/admin/courses/new"
            className="h-9 px-4 inline-flex items-center justify-center rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium text-xs hover:opacity-90"
          >
            + Adicionar unidade curricular
          </Link>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">
          Erro ao carregar unidades curriculares: {error.message}
        </p>
      )}

      {courses && courses.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl">
          <p className="text-sm text-zinc-500">
            Ainda não há unidades curriculares disponíveis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses?.map((course) => (
            <div
              key={course.id || course.uuid}
              className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between gap-4"
            >
              <div>
                <h2 className="font-semibold text-lg text-black dark:text-white mb-2">
                  {course.title}
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                  {course.description || 'Sem descrição.'}
                </p>
              </div>

              <Link
                href={`/courses/${course.uuid}`}
                className="text-xs font-medium text-black dark:text-white underline hover:opacity-70"
              >
                Ver materiais →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
