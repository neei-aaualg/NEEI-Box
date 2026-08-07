import Link from 'next/link';

interface FooterProps {
  user: { email: string } | null;
}

export default function Footer({ user }: FooterProps) {
  const links = [
    { href: '/', label: 'Início' },
    ...(user
      ? [{ href: '/courses', label: 'Unidades Curriculares' }]
      : [{ href: '/login', label: 'Entrar' }]),
  ];

  return (
    <footer className="border-t border-zinc-200/70 bg-white dark:border-white/5 dark:bg-night-900">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          © {new Date().getFullYear()} NEEI-Box ·{' '}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Núcleo de Estudantes de Engenharia Informática
          </span>{' '}
          — Universidade do Algarve
        </p>
        <nav className="flex items-center gap-5" aria-label="Rodapé">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-brand-700 dark:text-zinc-400 dark:hover:text-brand-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
