'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Course } from '@/lib/types';

interface Props {
  initialCourses: Course[];
  isAdmin: boolean;
  fetchError?: string;
}

const emptyCourseForm = { name: '', year: 1, semester: 1 };

export default function CoursesManager({
  initialCourses,
  isAdmin,
  fetchError,
}: Props) {
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>(initialCourses);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  const [form, setForm] = useState(emptyCourseForm);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenCreateModal = () => {
    setEditingCourse(null);
    setForm(emptyCourseForm);
    setErrorMsg('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (course: Course, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCourse(course);
    setForm({
      name: course.name,
      year: course.year,
      semester: course.semester,
    });
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

    const payload = {
      name: form.name,
      year: Number(form.year),
      semester: Number(form.semester),
    };

    try {
      if (editingCourse) {
        const res = await fetch(`/api/courses/${editingCourse.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.error || 'Erro ao atualizar.');
        } else {
          setCourses((prev) =>
            prev.map((c) => (c.id === editingCourse.id ? data : c))
          );
          setIsFormModalOpen(false);
          router.refresh();
        }
      } else {
        const res = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.error || 'Erro ao criar.');
        } else {
          setCourses((prev) => [data, ...prev]);
          setIsFormModalOpen(false);
          router.refresh();
        }
      }
    } catch {
      setErrorMsg('Erro de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${deletingCourse.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(`Erro ao eliminar: ${data.error || 'Falha ao eliminar.'}`);
      } else {
        setCourses((prev) => prev.filter((c) => c.id !== deletingCourse.id));
        setDeletingCourse(null);
        router.refresh();
      }
    } catch {
      setErrorMsg('Erro de comunicação ao eliminar.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesName = course.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesYear =
      selectedYear === 'all' || course.year.toString() === selectedYear;
    const matchesSemester =
      selectedSemester === 'all' ||
      course.semester.toString() === selectedSemester;

    return matchesName && matchesYear && matchesSemester;
  });

  const years = Array.from(new Set(courses.map((c) => c.year))).sort(
    (a, b) => a - b
  );

  const sections = years.flatMap((year) => {
    const semesters = Array.from(
      new Set(
        filteredCourses.filter((c) => c.year === year).map((c) => c.semester)
      )
    ).sort((a, b) => a - b);

    return semesters.map((semester) => ({
      year,
      semester,
      courses: filteredCourses.filter(
        (c) => c.year === year && c.semester === semester
      ),
    }));
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Cabeçalho */}
      <div className="mb-9 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Unidades Curriculares
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Explora os materiais de estudo partilhados pela comunidade NEEI.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-900 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 dark:bg-brand-500 dark:text-night-950 dark:hover:bg-brand-400"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Nova Unidade Curricular
          </button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="mb-8 flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="search"
            placeholder="Pesquisar por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Pesquisar unidades curriculares"
            className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-4 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-night-900 dark:text-white"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            aria-label="Filtrar por ano"
            className="h-11 flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-night-900 dark:text-white"
          >
            <option value="all" className="bg-white dark:bg-night-900">
              Todos os Anos
            </option>
            <option value="1" className="bg-white dark:bg-night-900">
              1º Ano
            </option>
            <option value="2" className="bg-white dark:bg-night-900">
              2º Ano
            </option>
            <option value="3" className="bg-white dark:bg-night-900">
              3º Ano
            </option>
          </select>

          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            aria-label="Filtrar por semestre"
            className="h-11 flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-night-900 dark:text-white"
          >
            <option value="all" className="bg-white dark:bg-night-900">
              Todos os Semestres
            </option>
            <option value="1" className="bg-white dark:bg-night-900">
              1º Semestre
            </option>
            <option value="2" className="bg-white dark:bg-night-900">
              2º Semestre
            </option>
          </select>
        </div>
      </div>

      {fetchError && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          Erro: {fetchError}
        </p>
      )}

      {/* Lista */}
      {filteredCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ainda não há unidades curriculares correspondentes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {sections.map((section) => (
            <section
              key={`${section.year}-${section.semester}`}
              aria-labelledby={`courses-section-${section.year}-${section.semester}`}
            >
              <div className="mb-4 flex items-center gap-3">
                <h2
                  id={`courses-section-${section.year}-${section.semester}`}
                  className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-900"
                >
                  {section.year}º Ano · {section.semester}º Semestre
                </h2>
                <div
                  aria-hidden="true"
                  className="h-px flex-1 bg-zinc-200 dark:bg-white/10"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="group flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover dark:border-white/10 dark:bg-night-900 dark:hover:border-brand-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-105 dark:from-brand-500 dark:to-brand-700">
                        {course.name
                          .split(' ')
                          .slice(0, 2)
                          .map((word) => word.charAt(0))
                          .join('')
                          .slice(0, 2)
                          .toUpperCase() || 'UC'}
                      </div>
                      <div className="flex gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-800 ring-1 ring-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-900">
                          {course.year}º Ano
                        </span>
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                          {course.semester}º Sem
                        </span>
                      </div>
                    </div>

                    <h2 className="mt-4 text-base font-semibold text-zinc-900 group-hover:text-brand-800 dark:text-white dark:group-hover:text-brand-300">
                      {course.name}
                    </h2>

                    <div className="mt-auto flex items-center justify-between pt-5">
                      <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <svg
                          aria-hidden="true"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                          />
                        </svg>
                        {course.materials_count ?? 0} materiais
                      </p>

                      {isAdmin && (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.preventDefault()}
                        >
                          <button
                            onClick={(e) => handleOpenEditModal(course, e)}
                            aria-label={`Editar ${course.name}`}
                            className="h-8 w-8 rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                          >
                            <svg
                              aria-hidden="true"
                              className="mx-auto h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleOpenDeleteModal(course, e)}
                            aria-label={`Eliminar ${course.name}`}
                            className="h-8 w-8 rounded-lg text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                          >
                            <svg
                              aria-hidden="true"
                              className="mx-auto h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              editingCourse
                ? 'Editar unidade curricular'
                : 'Criar nova unidade curricular'
            }
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-night-900"
          >
            <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-white">
              {editingCourse
                ? 'Editar Unidade Curricular'
                : 'Criar Nova Unidade Curricular'}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                >
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="course-name"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Nome da Unidade Curricular
                </label>
                <input
                  id="course-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Arquitetura de Computadores"
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-night-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="course-year"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Ano
                  </label>
                  <select
                    id="course-year"
                    value={form.year}
                    onChange={(e) =>
                      setForm({ ...form, year: Number(e.target.value) })
                    }
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-night-950 dark:text-white"
                  >
                    <option value={1} className="bg-white dark:bg-night-950">
                      1º Ano
                    </option>
                    <option value={2} className="bg-white dark:bg-night-950">
                      2º Ano
                    </option>
                    <option value={3} className="bg-white dark:bg-night-950">
                      3º Ano
                    </option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="course-semester"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Semestre
                  </label>
                  <select
                    id="course-semester"
                    value={form.semester}
                    onChange={(e) =>
                      setForm({ ...form, semester: Number(e.target.value) })
                    }
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-night-950 dark:text-white"
                  >
                    <option value={1} className="bg-white dark:bg-night-950">
                      1º Semestre
                    </option>
                    <option value={2} className="bg-white dark:bg-night-950">
                      2º Semestre
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="h-10 rounded-xl px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-10 rounded-xl bg-brand-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60 dark:bg-brand-500 dark:text-night-950 dark:hover:bg-brand-400"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/60 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirmar eliminação"
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-2xl dark:border-white/10 dark:bg-night-900"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <svg
                aria-hidden="true"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            <h3 className="mb-2 text-base font-bold text-zinc-900 dark:text-white">
              Eliminar Unidade Curricular?
            </h3>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
              Tens a certeza que pretendes eliminar{' '}
              <span className="font-semibold text-zinc-900 dark:text-white">
                &quot;{deletingCourse.name}&quot;
              </span>
              ? Esta ação não pode ser desfeita.
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingCourse(null)}
                className="h-10 flex-1 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDelete}
                className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
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
