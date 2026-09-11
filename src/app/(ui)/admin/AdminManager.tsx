'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MaterialPreview from '@/components/MaterialPreview';
import type { AdminUser, MaterialWithCourse } from '@/lib/types';

type AdminTab = 'pending' | 'approved' | 'admins';
type ReviewStatus = 'pending' | 'approved';

interface Props {
  initialPending: MaterialWithCourse[];
  initialApproved: MaterialWithCourse[];
  initialUsers: AdminUser[];
  currentUserId: string;
  initialCounts: Record<AdminTab, number>;
  fetchError?: string;
}

const TABS: { value: AdminTab; label: string; activeClass: string }[] = [
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
  {
    value: 'admins',
    label: 'Administradores',
    activeClass:
      'bg-brand-100 text-brand-800 ring-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900/50',
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
  initialUsers,
  currentUserId,
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
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [counts, setCounts] = useState(initialCounts);
  const [activeTab, setActiveTab] = useState<AdminTab>('pending');
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingMaterial, setDeletingMaterial] =
    useState<MaterialWithCourse | null>(null);
  const [demotingUser, setDemotingUser] = useState<AdminUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Admin management filters & form
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'ADMIN' | 'STUDENT'>('all');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);

  // Background real-time polling when on the admins tab
  useEffect(() => {
    if (activeTab !== 'admins') return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const data = await response.json();
          if (isSubscribed && Array.isArray(data.users)) {
            setUsers(data.users);
            const adminCount = data.users.filter(
              (u: AdminUser) => u.role === 'ADMIN'
            ).length;
            setCounts((prev) => ({ ...prev, admins: adminCount }));
          }
        }
      } catch {
        // Silently ignore background polling errors
      }
    }, 6000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeTab]);

  const filteredMaterials = useMemo(() => {
    if (activeTab === 'admins') return [];
    return materialsByStatus[activeTab];
  }, [materialsByStatus, activeTab]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = u.email.toLowerCase().includes(userSearch.toLowerCase().trim());
      if (!matchSearch) return false;
      if (userRoleFilter === 'ADMIN') return u.role === 'ADMIN';
      if (userRoleFilter === 'STUDENT') return u.role === 'STUDENT';
      return true;
    });
  }, [users, userSearch, userRoleFilter]);

  const refreshUsers = async () => {
    setIsRefreshingUsers(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.users)) {
          setUsers(data.users);
          const adminCount = data.users.filter(
            (u: AdminUser) => u.role === 'ADMIN'
          ).length;
          setCounts((prev) => ({ ...prev, admins: adminCount }));
          setNotice('Lista de utilizadores atualizada em tempo real.');
        }
      } else {
        setNotice('Não foi possível sincronizar a lista.');
      }
    } catch {
      setNotice('Erro de ligação ao sincronizar utilizadores.');
    } finally {
      setIsRefreshingUsers(false);
    }
  };

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

  const handleRoleChange = async (targetUser: AdminUser, newRole: 'ADMIN' | 'STUDENT') => {
    if (targetUser.id === currentUserId && newRole !== 'ADMIN') {
      setNotice('Não podes despromover a tua própria conta de administrador.');
      return;
    }

    if (newRole === 'STUDENT' && counts.admins <= 1 && targetUser.role === 'ADMIN') {
      setNotice('Não podes despromover o único administrador da plataforma.');
      return;
    }

    // Optimistic UI update
    const prevUsers = [...users];
    const prevCounts = { ...counts };

    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
    );
    setCounts((prev) => ({
      ...prev,
      admins: newRole === 'ADMIN' ? prev.admins + 1 : Math.max(0, prev.admins - 1),
    }));
    setNotice(null);
    setActionLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Rollback
        setUsers(prevUsers);
        setCounts(prevCounts);
        setNotice(data.error || 'Erro ao alterar cargo.');
      } else {
        setNotice(data.message || `Permissões de ${targetUser.email} atualizadas em tempo real.`);
        setDemotingUser(null);
        router.refresh();
      }
    } catch {
      // Rollback
      setUsers(prevUsers);
      setCounts(prevCounts);
      setNotice('Erro de ligação ao alterar cargo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newAdminEmail.trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setNotice('Por favor, introduz um endereço de email válido.');
      return;
    }

    setIsAddingAdmin(true);
    setNotice(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, role: 'ADMIN' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setNotice(data.error || 'Erro ao adicionar administrador.');
      } else {
        setUsers((prev) => {
          const exists = prev.some((u) => u.email === cleanEmail);
          if (exists) {
            return prev.map((u) =>
              u.email === cleanEmail ? { ...u, role: 'ADMIN' } : u
            );
          }
          return [data.user, ...prev];
        });

        setCounts((prev) => {
          const wasAdmin = users.some((u) => u.email === cleanEmail && u.role === 'ADMIN');
          return wasAdmin ? prev : { ...prev, admins: prev.admins + 1 };
        });

        setNewAdminEmail('');
        setNotice(data.message || `Administrador ${cleanEmail} configurado com sucesso.`);
        router.refresh();
      }
    } catch {
      setNotice('Erro de ligação ao configurar administrador.');
    } finally {
      setIsAddingAdmin(false);
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
          {activeTab === 'admins' ? 'Gestão de Administradores' : 'Gestão de Materiais'}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {activeTab === 'admins'
            ? 'Gere quem tem permissões de administração no NEEI-Box. As alterações têm efeito imediato em tempo real.'
            : 'Revê as submissões dos estudantes e aprova ou rejeita os materiais antes de chegarem à comunidade.'}
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
        <div
          role="status"
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/70 p-3.5 text-sm text-brand-900 shadow-sm dark:border-brand-900/50 dark:bg-brand-950/40 dark:text-brand-200"
        >
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-xs font-semibold text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-200"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Separadores de administração"
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

      {/* ABA: ADMINISTRADORES */}
      {activeTab === 'admins' && (
        <div className="flex flex-col gap-6">
          {/* Card: Adicionar Administrador */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-night-900">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Adicionar / Promover Administrador
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Introduz o email institucional de um membro. Terá permissões de administração imediatamente.
                </p>
              </div>

              {/* Indicador de tempo real e botão de sincronização */}
              <div className="mt-2 flex items-center gap-3 sm:mt-0">
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  Tempo real
                </span>

                <button
                  type="button"
                  onClick={refreshUsers}
                  disabled={isRefreshingUsers}
                  title="Sincronizar agora"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
                >
                  <svg
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 ${isRefreshingUsers ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  Sincronizar
                </button>
              </div>
            </div>

            <form onSubmit={handleAddAdmin} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
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
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="exemplo: a12345@ualg.pt"
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 pl-10 pr-4 text-xs text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/10 dark:bg-night-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-brand-400"
                />
              </div>

              <button
                type="submit"
                disabled={isAddingAdmin || !newAdminEmail.trim()}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {isAddingAdmin ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    A adicionar...
                  </>
                ) : (
                  <>
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Tornar Administrador
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Filtros e Barra de Pesquisa */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Pesquisa */}
            <div className="relative flex-1 max-w-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
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
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Pesquisar por email..."
                className="h-9 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-8 text-xs text-zinc-900 transition placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/10 dark:bg-night-900 dark:text-white dark:placeholder:text-zinc-500"
              />
              {userSearch && (
                <button
                  type="button"
                  onClick={() => setUserSearch('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filtro de cargos */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'ADMIN', label: 'Administradores' },
                  { id: 'STUDENT', label: 'Estudantes' },
                ] as const
              ).map((filter) => {
                const isSelected = userRoleFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setUserRoleFilter(filter.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100 dark:bg-night-900 dark:text-zinc-400 dark:ring-white/10 dark:hover:bg-white/5'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Utilizadores */}
          {filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Nenhum utilizador encontrado com os filtros atuais.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-night-900">
              <div className="divide-y divide-zinc-200/80 dark:divide-white/5">
                {filteredUsers.map((u) => {
                  const isCurrentUser = u.id === currentUserId;
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <div
                      key={u.id}
                      className="flex flex-col gap-3 p-4 transition hover:bg-zinc-50/60 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-white/[0.02]"
                    >
                      {/* Info do Utilizador */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isAdmin
                              ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 ring-1 ring-brand-300/40'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300'
                          }`}
                        >
                          {u.email.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                              {u.email}
                            </span>

                            {isCurrentUser && (
                              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-900">
                                Tu
                              </span>
                            )}

                            {isAdmin ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900/50">
                                <svg
                                  className="h-2.5 w-2.5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Administrador
                              </span>
                            ) : (
                              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600 ring-1 ring-zinc-200 dark:bg-white/10 dark:text-zinc-400 dark:ring-white/10">
                                Estudante
                              </span>
                            )}
                          </div>

                          <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                            Registado a {formatDate(u.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {isCurrentUser ? (
                          <span className="text-[11px] font-medium text-zinc-400 italic">
                            Sessão atual
                          </span>
                        ) : isAdmin ? (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setDemotingUser(u)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
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
                                d="M19.5 12h-15"
                              />
                            </svg>
                            Remover Admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleRoleChange(u, 'ADMIN')}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
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
                                d="M12 4.5v15m7.5-7.5h-15"
                              />
                            </svg>
                            Promover a Admin
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA: MATERIAIS (PENDENTES OU APROVADOS) */}
      {activeTab !== 'admins' && (
        <>
          {filteredMaterials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {activeTab === 'pending'
                  ? 'Não há materiais pendentes. Tudo em dia!'
                  : 'Não há materiais aprovados.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredMaterials.map((material) => (
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
        </>
      )}

      {/* Modal: Confirmar Eliminação de Material */}
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

      {/* Modal: Confirmar Despromoção de Administrador */}
      {demotingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/60 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirmar despromoção"
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-2xl dark:border-white/10 dark:bg-night-900"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
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
              Remover Administrador?
            </h3>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
              Tens a certeza que pretendes retirar o cargo de administrador a{' '}
              <span className="font-semibold text-zinc-900 dark:text-white">
                {demotingUser.email}
              </span>
              ? O utilizador passará a ter a função de estudante e perderá acesso a este painel em tempo real.
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDemotingUser(null)}
                className="h-10 flex-1 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRoleChange(demotingUser, 'STUDENT')}
                className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading ? 'A atualizar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
