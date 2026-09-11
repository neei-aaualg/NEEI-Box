'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MaterialPreview from '@/components/MaterialPreview';
import {
  getFileType,
  getFileTypeMeta,
  sanitizeFileName,
} from '@/lib/file-types';
import type { Course, Material, MaterialStatus } from '@/lib/types';

interface Props {
  course: Pick<Course, 'id' | 'name'>;
  initialMaterials: Material[];
  isAdmin: boolean;
  fetchError?: string;
}

type StatusFilter = 'all' | MaterialStatus;

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'pending', label: 'Pendentes' },
];

const STATUS_BADGE: Record<
  MaterialStatus,
  { label: string; className: string; dot: string }
> = {
  pending: {
    label: 'Pendente',
    className:
      'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:ring-amber-900/50',
    dot: 'bg-amber-500',
  },
  approved: {
    label: 'Aprovado',
    className:
      'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-emerald-900/50',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejeitado',
    className:
      'bg-red-100 text-red-700 ring-red-200 dark:bg-red-950/60 dark:text-red-400 dark:ring-red-900/50',
    dot: 'bg-red-500',
  },
};

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

function StatusBadge({ status }: { status: MaterialStatus }) {
  const badge = STATUS_BADGE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${badge.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
      {badge.label}
    </span>
  );
}

export default function MaterialsManager({
  course,
  initialMaterials,
  isAdmin,
  fetchError,
}: Props) {
  const router = useRouter();

  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const visibleMaterials = useMemo(() => {
    return materials.filter((material) => {
      if (!isAdmin && material.review_status !== 'approved') return false;
      if (statusFilter !== 'all' && material.review_status !== statusFilter)
        return false;

      return material.title.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [materials, statusFilter, searchQuery, isAdmin]);

  const counts = useMemo(() => {
    const count = (status: StatusFilter) =>
      status === 'all'
        ? materials.length
        : materials.filter((m) => m.review_status === status).length;
    return {
      all: count('all'),
      approved: count('approved'),
      pending: count('pending'),
      rejected: count('rejected'),
    };
  }, [materials]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Por favor, seleciona um ficheiro.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('O ficheiro selecionado excede o limite máximo de 50 MB.');
      return;
    }

    setUploading(true);
    setErrorMsg('');

    const formData = new FormData();
    const safeFile = new File([file], sanitizeFileName(file.name), {
      type: file.type,
    });
    formData.append('file', safeFile);
    formData.append('original_name', file.name);
    formData.append('course_id', course.id);
    formData.append('title', title);
    formData.append('description', description);

    try {
      const response = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData,
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Falha ao enviar ficheiro.');
      }

      setMaterials((prev) => [resData.material as Material, ...prev]);
      setIsUploadModalOpen(false);
      setTitle('');
      setDescription('');
      setFile(null);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro no upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (
    materialId: string,
    status: 'approved' | 'rejected'
  ) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/materials/${materialId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao atualizar o estado.');
      }

      if (resData.deleted) {
        setMaterials((prev) => prev.filter((m) => m.id !== materialId));
      } else {
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === materialId ? (resData.material as Material) : m
          )
        );
      }
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      alert(`Erro: ${message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMaterial) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/materials/${deletingMaterial.id}`, {
        method: 'DELETE',
      });

      const resData = await response.json();

      if (!response.ok) throw new Error(resData.error || 'Erro ao eliminar');

      setMaterials((prev) => prev.filter((m) => m.id !== deletingMaterial.id));
      setDeletingMaterial(null);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      alert(`Erro: ${message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const selectedFileMeta = file
    ? getFileTypeMeta(getFileType(file.name))
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Voltar */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-brand-700 dark:text-zinc-400 dark:hover:text-brand-300"
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
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Unidades Curriculares
      </Link>

      {/* Cabeçalho */}
      <div className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            {course.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Explora ou submete materiais de estudo para esta unidade curricular.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setIsUploadModalOpen(true);
          }}
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
          Adicionar Material
        </button>
      </div>

      {fetchError && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          Erro: {fetchError}
        </p>
      )}

      {/* Filtros */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {isAdmin && (
          <div
            className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-white/10 dark:bg-night-900"
            role="tablist"
            aria-label="Filtrar materiais por estado"
          >
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-brand-900 text-white dark:bg-brand-500 dark:text-night-950'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                    statusFilter === tab.value
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400'
                  }`}
                >
                  {counts[tab.value]}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="relative lg:w-72">
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
            placeholder="Pesquisar materiais..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Pesquisar materiais"
            className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-4 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-night-900 dark:text-white"
          />
        </div>
      </div>

      {/* Lista de Materiais */}
      {visibleMaterials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {statusFilter === 'all'
              ? 'Ainda não há materiais disponíveis para esta unidade curricular.'
              : 'Não há materiais com este estado.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMaterials.map((material) => (
            <article
              key={material.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card-hover dark:border-white/10 dark:bg-night-900"
            >
              <MaterialPreview
                title={material.title}
                webUrl={material.web_url}
                fileName={material.file_name ?? undefined}
              />

              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={material.review_status} />
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    {formatDate(material.created_at)}
                  </span>
                </div>

                <div>
                  <h2 className="font-semibold leading-snug text-zinc-900 dark:text-white">
                    {material.title}
                  </h2>
                  {material.description && (
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {material.description}
                    </p>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <a
                    href={material.web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-800 dark:bg-brand-500 dark:text-night-950 dark:hover:bg-brand-400"
                  >
                    Ver Material
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

                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      {material.review_status !== 'approved' && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(material.id, 'approved')
                          }
                          disabled={actionLoading}
                          title="Aprovar material"
                          aria-label={`Aprovar ${material.title}`}
                          className="inline-flex h-8 items-center rounded-lg bg-emerald-100 px-2.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-950/60 dark:text-emerald-400 dark:hover:bg-emerald-900"
                        >
                          Aprovar
                        </button>
                      )}
                      <button
                        onClick={() => setDeletingMaterial(material)}
                        title="Eliminar material"
                        aria-label={`Eliminar ${material.title}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
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
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal: Upload de Material */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Submeter material"
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-night-900"
          >
            <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-white">
              Submeter Material
            </h2>

            <form onSubmit={handleUpload} className="flex flex-col gap-4">
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
                  htmlFor="material-title"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Título do Material
                </label>
                <input
                  id="material-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Sebenta do Capítulo 1"
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-night-950 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="material-description"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Descrição (Opcional)
                </label>
                <textarea
                  id="material-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Exercícios resolvidos e apontamentos teóricos"
                  rows={3}
                  className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-night-950 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="material-file"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Ficheiro
                </label>

                <label
                  htmlFor="material-file"
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                    file
                      ? 'border-brand-300 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-950/30'
                      : 'border-zinc-300 hover:border-brand-400 hover:bg-brand-50/50 dark:border-zinc-700 dark:hover:border-brand-700 dark:hover:bg-brand-950/30'
                  }`}
                >
                  {file ? (
                    <>
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold uppercase text-white ${selectedFileMeta?.gradient ?? ''}`}
                      >
                        {selectedFileMeta?.label ?? 'FILE'}
                      </span>
                      <span className="max-w-full truncate text-xs font-semibold text-zinc-900 dark:text-white">
                        {file.name}
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        aria-hidden="true"
                        className="h-8 w-8 text-zinc-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                        />
                      </svg>
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Clica para escolher um ficheiro
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        PDF, DOCX, PPTX, XLSX, ZIP, imagens… (máx. 50 MB)
                      </span>
                    </>
                  )}
                </label>
                <input
                  id="material-file"
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="sr-only"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="h-10 rounded-xl px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="h-10 rounded-xl bg-brand-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60 dark:bg-brand-500 dark:text-night-950 dark:hover:bg-brand-400"
                >
                  {uploading ? 'A enviar...' : 'Submeter'}
                </button>
              </div>
            </form>
          </div>
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
              ?
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
