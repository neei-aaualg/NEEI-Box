import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getCurrentUser } from '@/lib/auth/session';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'NEEI-Box · Partilha de Materiais de Estudo',
    template: '%s · NEEI-Box',
  },
  description:
    'A plataforma do Núcleo de Estudantes de Engenharia Informática da Universidade do Algarve para partilhar apontamentos, exames e materiais de estudo entre estudantes.',
  icons: {
    icon: [{ url: '/neei-logo.png' }, { url: '/favicon.ico' }],
    apple: [{ url: '/neei-logo.png' }],
    shortcut: '/neei-logo.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-zinc-900 dark:bg-night-950 dark:text-zinc-50">
        <Header user={user ? { email: user.email } : null} isAdmin={isAdmin} />
        <main className="flex-1">{children}</main>
        <Footer user={user ? { email: user.email } : null} />
      </body>
    </html>
  );
}
