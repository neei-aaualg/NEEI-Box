'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Course = {
  id: string;
  name: string;
  year: number;
  semester: number;
  created_at: string;
};

interface Props {
  initialCourses: Course[];
  isAdmin: boolean;
  fetchError?: string;
}

export default function CoursesManager({
  initialCourses,
  isAdmin,
  fetchError,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [courses, setCourses] = useState<Course[]>(initialCourses);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');

  // Modais de Estado
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  // Estado do formulário
  const [name, setName] = useState('');
  const [year, setYear] = useState<number>(1);
  const [semester, setSemester] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenCreateModal = () => {
    setEditingCourse(null);
    setName('');
    setYear(1);
    setSemester(1);
    setErrorMsg('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (course: Course, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCourse(course);
    setName(course.name);
    setYear(course.year);
    setSemester(course.semester);
    setErrorMsg('');
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteModal = (course: Course, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingCourse(course);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (editingCourse) {
      const { data, error } = await supabase
        .from('courses')
        .update({ name, year: Number(year), semester: Number(semester) })
        .eq('id', editingCourse.id)
        .select()
        .single();

      if (error) {
        setErrorMsg(error.message);
      } else if (data) {
        setCourses((prev) =>
          prev.map((c) => (c.id === editingCourse.id ? data : c))
        );
        setIsFormModalOpen(false);
        router.refresh();
      }
    } else {
      const { data, error } = await supabase
        .from('courses')
        .insert([{ name, year: Number(year), semester: Number(semester) }])
        .select()
        .single();

      if (error) {
        setErrorMsg(error.message);
      } else if (data) {
        setCourses((prev) => [data, ...prev]);
        setIsFormModalOpen(false);
        router.refresh();
      }
    }

    setLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;

    setLoading(true);
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', deletingCourse.id);

    if (error) {
      alert(`Erro ao eliminar: ${error.message}`);
    } else {
      setCourses((prev) => prev.filter((c) => c.id !== deletingCourse.id));
      setDeletingCourse(null);
      router.refresh();
    }
    setLoading(false);
  };

  const filteredCourses = courses.filter((course) => {
    const matchesName = course.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesYear =
      selectedYear === 'all' || course.year.toString() === selectedYear;
    const matchesSemester =
      selectedSemester === 'all' || course.semester.toString() === selectedSemester;

    return matchesName && matchesYear && matchesSemester;
  });

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      {/* Cabeçalho */}
      <div className="flex flex-col items-center text-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Unidades Curriculares
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Explora as unidades curriculares disponíveis na plataforma.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="h-10 px-5 inline-flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black font-medium text-xs hover:opacity-90 transition-opacity shadow-sm"
          >
            + Criar Unidade Curricular
          </button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Pesquisar por nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 flex-1 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-transparent px-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white"
        />

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="h-10 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-transparent px-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white"
        >
          <option value="all" className="bg-white dark:bg-zinc-900">Todos os Anos</option>
          <option value="1" className="bg-white dark:bg-zinc-900">1º Ano</option>
          <option value="2" className="bg-white dark:bg-zinc-900">2º Ano</option>
          <option value="3" className="bg-white dark:bg-zinc-900">3º Ano</option>
        </select>

        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="h-10 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-transparent px-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white"
        >
          <option value="all" className="bg-white dark:bg-zinc-900">Todos os Semestres</option>
          <option value="1" className="bg-white dark:bg-zinc-900">1º Semestre</option>
          <option value="2" className="bg-white dark:bg-zinc-900">2º Semestre</option>
        </select>
      </div>

      {fetchError && (
        <p className="text-sm text-red-500 text-center mb-6">
          Erro: {fetchError}
        </p>
      )}

      {/* Lista de Unidades Curriculares */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl">
          <p className="text-sm text-zinc-500">
            Ainda não há unidades curriculares correspondentes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCourses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-black dark:hover:border-zinc-700 transition-all flex flex-col justify-between gap-6 cursor-pointer"
            >
              <div className="flex flex-col items-center text-center gap-2 py-2 flex-1">
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                    {course.year}º Ano
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                    {course.semester}º Semestre
                  </span>
                </div>
                <h2 className="font-semibold text-lg text-black dark:text-white group-hover:underline">
                  {course.name}
                </h2>
              </div>

              {isAdmin && (
                <div className="flex items-center justify-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-900/80">
                  <button
                    onClick={(e) => handleOpenEditModal(course, e)}
                    className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={(e) => handleOpenDeleteModal(course, e)}
                    className="h-8 px-3 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <h2 className="text-lg font-semibold text-black dark:text-white mb-4 text-center">
              {editingCourse
                ? 'Editar Unidade Curricular'
                : 'Criar Nova Unidade Curricular'}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {errorMsg && (
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Nome da Unidade Curricular
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Arquitetura de Computadores"
                  className="h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-transparent px-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Ano
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-transparent px-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white"
                  >
                    <option value={1} className="bg-white dark:bg-zinc-900">1º Ano</option>
                    <option value={2} className="bg-white dark:bg-zinc-900">2º Ano</option>
                    <option value={3} className="bg-white dark:bg-zinc-900">3º Ano</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Semestre
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-transparent px-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white"
                  >
                    <option value={1} className="bg-white dark:bg-zinc-900">1º Semestre</option>
                    <option value={2} className="bg-white dark:bg-zinc-900">2º Semestre</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="h-9 px-4 rounded-full text-xs font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-9 px-5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {loading
                    ? 'A guardar...'
                    : editingCourse
                      ? 'Atualizar'
                      : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Eliminação */}
      {deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 mb-4">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>

            <h3 className="text-base font-semibold text-black dark:text-white mb-2">
              Eliminar Unidade Curricular?
            </h3>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6">
              Tens a certeza que pretendes eliminar <span className="font-semibold text-black dark:text-white">&quot;{deletingCourse.name}&quot;</span>? Esta ação não pode ser desfeita.
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingCourse(null)}
                className="h-9 flex-1 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDelete}
                className="h-9 flex-1 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'A eliminar...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}