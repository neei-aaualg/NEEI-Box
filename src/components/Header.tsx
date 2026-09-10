'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface HeaderProps {
  user: { email: string } | null;
  isAdmin: boolean;
}

export default function Header({ user, isAdmin }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    { href: '/', label: 'Início' },
    ...(user ? [{ href: '/courses', label: 'Unidades Curriculares' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Administração' }] : []),
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-night-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
          aria-label="NEEI-Box — Início"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-zinc-900/10 dark:ring-white/10">
            <Image
              src="/neei.svg"
              alt=""
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          </span>
          <span className="truncate text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-white">
            NEEI-Box
            <span className="ml-1.5 hidden rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-800 sm:inline-block dark:bg-brand-950 dark:text-brand-300">
              UAlg
            </span>
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Navegação principal"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://neei.online"
            className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200/80 bg-zinc-50/70 px-3 text-xs font-medium text-zinc-700 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-brand-800 dark:hover:bg-brand-950/40 dark:hover:text-brand-200"
            title="Voltar ao site do NEEI (neei.online)"
          >
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5 text-zinc-500 transition-transform group-hover:-translate-x-0.5 dark:text-zinc-400"
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
            <span className="hidden sm:inline">Voltar ao site do NEEI</span>
            <span className="sm:hidden">NEEI</span>
          </a>

          {user ? (
            <>
              <span className="hidden max-w-44 truncate rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 lg:block dark:bg-white/5 dark:text-zinc-400">
                {user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Terminar sessão"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200 px-3.5 text-xs font-medium text-zinc-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:border-white/10 dark:text-zinc-300 dark:hover:border-red-900/50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
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
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {loggingOut ? 'A sair...' : 'Sair'}
                </span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-full bg-brand-900 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 dark:bg-brand-500 dark:text-night-950 dark:hover:bg-brand-400"
            >
              Entrar
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Abrir menu de navegação"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-white/5"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          className="border-t border-zinc-200/70 bg-white/95 px-4 py-3 md:hidden dark:border-white/5 dark:bg-night-950/95"
          aria-label="Navegação móvel"
        >
          <div className="flex flex-col gap-1">
            <a
              href="https://neei.online"
              className="mb-1 flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-brand-50 hover:text-brand-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-brand-950/40 dark:hover:text-brand-200"
            >
              <span className="flex items-center gap-2">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
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
                Voltar ao site do NEEI
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">neei.online</span>
            </a>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <p className="px-4 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Sessão iniciada como {user.email}
              </p>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
