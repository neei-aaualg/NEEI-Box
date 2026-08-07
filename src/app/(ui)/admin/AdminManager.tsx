'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MaterialPreview from '@/components/MaterialPreview';
import type { MaterialWithCourse } from '@/lib/types';

type ReviewStatus = 'pending' | 'approved';

interface Props {
  initialPending: MaterialWithCourse[];
  initialApproved: MaterialWithCourse[];
  initialCounts: Record<ReviewStatus, number>;
  fetchError?: string;
}

const TABS: { value: ReviewStatus; label: string; activeClass: string }[] = [
  {
    value: 'pending',
    label: 'Pendentes',
    activeClass:
      'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900/50',
  },
  {
    value: 'approved',
    label: 'Aprovados',
    activeClass:
      'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-emerald-900/50',
  },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function AdminManager({
  initialPending,
  initialApproved,
  initialCounts,
  fetchError,
}: Props) {
  const router = useRouter();

  const [materialsByStatus, setMaterialsByStatus] = useState<
    Record<ReviewStatus, MaterialWithCourse[]>
  >({
    pending: initialPending,
    approved: initialApproved,
  });
  const [counts, setCounts] = useState(initialCounts);
  const [activeTab, setActiveTab] = useState<ReviewStatus>('pending');
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingMaterial, setDeletingMaterial] =
    useState<MaterialWithCourse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return materialsByStatus[activeTab];
  }, [materialsByStatus, activeTab]);

  const setStatus = async (
    materialId: string,
    status: ReviewStatus
  ): Promise<{ ok: boolean; message: string; deleted: boolean }> => {
    try {
      const response = await fetch(`/api/materials/${materialId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          message: data.error || 'Erro ao atualizar.',
          deleted: false,
        };
      }

      return {
        ok: true,
        message: data.message,
        deleted: Boolean(data.deleted),
      };
    } catch {
      return { ok: false, message: 'Erro de ligação.', deleted: false };
    }
  };

  const handleSetStatus = async (
    material: MaterialWithCourse,
    status: ReviewStatus
  ) => {
    setActionLoading(true);
    setNotice(null);

    const result = await setStatus(material.id, status);

    if (!result.ok) {
      setNotice(result.message);
    } else {
      const previousStatus = material.review_status as ReviewStatus;

      if (result.deleted) {
        setMaterialsByStatus((prev) => ({
          ...prev,
          [previousStatus]: prev[previousStatus].filter(
            (m) => m.id !== material.id
          ),
        }));
        setCounts((prev) => ({
          ...prev,
          [previousStatus]: Math.max(0, prev[previousStatus] - 1),
        }));
      } else {
        setMaterialsByStatus((prev) => ({
          ...prev,
          [previousStatus]: prev[previousStatus].filter(
            (m) => m.id !== material.id
          ),
          [status]: [{ ...material, review_status: status }, ...prev[status]],
        }));
        setCounts((prev) => ({
          ...prev,
          [previousStatus]: Math.max(0, prev[previousStatus] - 1),
          [status]: prev[status] + 1,
        }));
      }

      setNotice(result.message);
      router.refresh();
    }

    setActionLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMaterial) return;

    setActionLoading(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/materials/${deletingMaterial.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        setNotice(data.error || 'Erro ao eliminar.');
        return;
      }

      const status = deletingMaterial.review_status as ReviewStatus;
      setMaterialsByStatus((prev) => ({
        ...prev,
        [status]: prev[status].filter((m) => m.id !== deletingMaterial.id),
      }));
      setCounts((prev) => ({
        ...prev,
        [status]: Math.max(0, prev[status] - 1),
      }));
      setDeletingMaterial(null);
      router.refresh();
    } catch {
      setNotice('Erro de ligação ao eliminar.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Cabeçalho */}
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Painel de Administração
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
          Gestão de Materiais
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Revê as submissões dos estudantes e aprova ou rejeita os materiais
          antes de chegarem à comunidade.
        </p>
      </div>

      {fetchError && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          Erro: {fetchError}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center text-sm text-zinc-700 dark:border-white/10 dark:bg-night-900 dark:text-zinc-300"
        >
          {notice}
        </p>
      )}

      {/* Tabs */}
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Materiais por estado"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActiveTab(tab.value);
                setNotice(null);
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ring-1 transition-all ${
                isActive
                  ? tab.activeClass
                  : 'bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-100 dark:bg-night-900 dark:text-zinc-400 dark:ring-white/10 dark:hover:bg-white/5'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/70 text-zinc-700 dark:bg-night-950/40 dark:text-zinc-200'
                    : 'bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400'
                }`}
              >
                {counts[tab.value]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {activeTab === 'pending'
              ? 'Não há materiais pendentes. Tudo em dia!'
              : 'Não há materiais aprovados.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((material) => (
            <article
              key={material.id}
              className="flex flex-col gap-5 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:flex-row dark:border-white/10 dark:bg-night-900"
            >
              <div className="sm:w-52 sm:shrink-0">
                <MaterialPreview
                  title={material.title}
                  webUrl={material.web_url}
                  fileName={material.file_name ?? undefined}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  {material.courses?.name && (
                    <Link
                      href={`/courses/${material.courses.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-800 ring-1 ring-brand-100 transition-colors hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-900 dark:hover:bg-brand-900"
                    >
                      <svg
                        aria-hidden="true"
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                        />
                      </svg>
                      {material.courses.name}
                    </Link>
                  )}
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Submetido a {formatDate(material.created_at)}
                  </span>
                </div>

                <h2 className="mt-2 font-semibold text-zinc-900 dark:text-white">
                  {material.title}
                </h2>

                {material.description && (
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {material.description}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  {material.review_status !== 'approved' && (
                    <button
                      onClick={() => handleSetStatus(material, 'approved')}
                      disabled={actionLoading}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <svg
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      Aprovar
                    </button>
                  )}
                  <button
                    onClick={() => setDeletingMaterial(material)}
                    disabled={actionLoading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
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
                    Eliminar
                  </button>
                  <a
                    href={material.web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-300 px-4 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                  >
                    Abrir ficheiro
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal: Confirmar Eliminação */}
      {deletingMaterial && (
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
              Eliminar Material?
            </h3>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
              Tens a certeza que pretendes eliminar{' '}
              <span className="font-semibold text-zinc-900 dark:text-white">
                &quot;{deletingMaterial.title}&quot;
              </span>
              ? O ficheiro será removido do armazenamento e da plataforma.
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingMaterial(null)}
                className="h-10 flex-1 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDelete}
                className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading ? 'A eliminar...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
