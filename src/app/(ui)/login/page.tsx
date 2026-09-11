import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Entrar',
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/courses');
  }

  return <LoginForm />;
}
