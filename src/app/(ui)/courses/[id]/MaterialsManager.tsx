'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Material = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  web_url: string;
  onedrive_item_id: string;
  review_status: 'pending' | 'approved' | 'rejected';
  uploaded_by: string;
  created_at: string;
};

type Course = {
  id: string;
  name: string;
};

interface Props {
  course: Course;
  initialMaterials: Material[];
  isAdmin: boolean;
  fetchError?: string;
}

export default function MaterialsManager({
  course,
  initialMaterials,
  isAdmin,
  fetchError,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);

  // Formulário de Upload
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Submeter Upload via Route Handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Por favor, seleciona um ficheiro.');
      return;
    }

    setUploading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);
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

      setMaterials((prev) => [resData.material, ...prev]);
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

  // Alterar Estado (Aprovar / Rejeitar - Apenas Admin)
  const handleUpdateStatus = async (
    materialId: string,
    status: 'approved' | 'rejected'
  ) => {
    const { data, error } = await supabase
      .from('materials')
      .update({ review_status: status })
      .eq('id', materialId)
      .select()
      .single();

    if (error) {
      alert(`Erro ao atualizar estado: ${error.message}`);
    } else if (data) {
      setMaterials((prev) =>
        prev.map((m) => (m.id === materialId ? (data as Material) : m))
      );
      router.refresh();
    }
  };

  const handleConfirmDelete = async () => {
  if (!deletingMaterial) return;

  try {
    const response = await fetch(`/api/materials/${deletingMaterial.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        onedrive_item_id: deletingMaterial.onedrive_item_id,
      }),
    });

    const resData = await response.json();

    if (!response.ok) throw new Error(resData.error || 'Erro ao eliminar');

    setMaterials((prev) => prev.filter((m) => m.id !== deletingMaterial.id));
    setDeletingMaterial(null);
    router.refresh();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    alert(`Erro: ${message}`);
  }
};

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      {/* Voltar */}
      <Link
        href="/courses"
        className="inline-flex items-center text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white mb-6 transition-colors"
      >
        ← Voltar às Unidades Curriculares
      </Link>

      {/* Cabeçalho */}
      <div className="flex flex-col items-center text-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            {course.name}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Explora ou submete materiais de estudo para esta unidade curricular.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setIsUploadModalOpen(true);
          }}
          className="h-10 px-5 inline-flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black font-medium text-xs hover:opacity-90 transition-opacity shadow-sm"
        >
          + Adicionar Material
        </button>
      </div>

      {fetchError && (
        <p className="text-sm text-red-500 text-center mb-6">Erro: {fetchError}</p>
      )}

      {/* Lista de Materiais */}
      {materials.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-950/50">
          <p className="text-sm text-zinc-500">
            Ainda não há materiais disponíveis para esta unidade curricular.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materials.map((material) => (
            <div
              key={material.id}
              className={`p-6 rounded-2xl border bg-white dark:bg-zinc-950 flex flex-col justify-between gap-4 relative transition-all ${
                isAdmin && material.review_status === 'pending'
                  ? 'border-amber-300 dark:border-amber-800/60 shadow-sm shadow-amber-500/5'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {/* Painel Administrativo Superior (se Admin) */}
              {isAdmin && (
                <div className="flex items-center justify-between pb-3 mb-1 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 -mx-6 -mt-6 p-4 rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Painel Admin
                    </span>
                    {material.review_status === 'pending' && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                        Pendente de Aprovação
                      </span>
                    )}
                    {material.review_status === 'approved' && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                        Aprovado
                      </span>
                    )}
                    {material.review_status === 'rejected' && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                        Rejeitado
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {material.review_status !== 'approved' && (
                      <button
                        onClick={() => handleUpdateStatus(material.id, 'approved')}
                        title="Aprovar Material"
                        className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors"
                      >
                        Aprovar
                      </button>
                    )}
                    {material.review_status !== 'rejected' && (
                      <button
                        onClick={() => handleUpdateStatus(material.id, 'rejected')}
                        title="Rejeitar Material"
                        className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors"
                      >
                        Rejeitar
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingMaterial(material)}
                      title="Eliminar Material"
                      className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors ml-1"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="font-semibold text-base text-black dark:text-white">
                    {material.title}
                  </h2>

                  {/* Badge para utilizadores comuns se estiver pendente/rejeitado */}
                  {!isAdmin && material.review_status === 'pending' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                      Pendente
                    </span>
                  )}
                  {!isAdmin && material.review_status === 'rejected' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                      Rejeitado
                    </span>
                  )}
                </div>

                {material.description && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {material.description}
                  </p>
                )}
              </div>

              {/* Ações do Material */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-900">
                <a
                  href={material.web_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-4 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-medium inline-flex items-center hover:opacity-90 transition-opacity"
                >
                  Ver Material
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal 1: Upload de Material */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <h2 className="text-lg font-semibold text-black dark:text-white text-center mb-4">
              Submeter Material
            </h2>

            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              {errorMsg && (
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Título do Material
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Sebenta do Capítulo 1"
                  className="h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-transparent px-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Descrição (Opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Exercícios resolvidos e apontamentos teóricos"
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-transparent p-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-white resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Ficheiro
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="text-xs text-zinc-600 dark:text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-zinc-100 dark:file:bg-zinc-800 file:text-black dark:file:text-white hover:file:cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="h-9 px-4 rounded-full text-xs font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="h-9 px-5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {uploading ? 'A enviar...' : 'Submeter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Confirmar Eliminação */}
      {deletingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl text-center">
            <h3 className="text-base font-semibold text-black dark:text-white mb-2">
              Eliminar Material?
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6">
              Tens a certeza que pretendes eliminar &quot;{deletingMaterial.title}&quot;?
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingMaterial(null)}
                className="h-9 flex-1 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="h-9 flex-1 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}