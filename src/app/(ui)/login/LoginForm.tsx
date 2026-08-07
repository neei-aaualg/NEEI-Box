'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const ualgEmailRegex = /^a\d+@ualg\.pt$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const formattedEmail = email.trim().toLowerCase();

    if (!ualgEmailRegex.test(formattedEmail)) {
      setErrorMsg(
        'O email deve ter o formato aXXXXX@ualg.pt (ex: a12345@ualg.pt).'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formattedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Ocorreu um erro ao enviar o link de acesso.'
        );
      }

      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Ocorreu um erro inesperado. Tenta novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black px-4 min-h-screen">
      <main className="flex flex-1 w-full max-w-md flex-col items-center justify-center py-16 px-8 bg-white dark:bg-black rounded-2xl sm:shadow-sm sm:border sm:border-zinc-200 dark:sm:border-zinc-800 my-auto">
        <div className="mb-8">
          <Image
            src="/next.svg"
            alt="Logótipo NEEI"
            className="dark:invert h-5 w-[100px]"
            width={100}
            height={20}
            suppressHydrationWarning
          />
        </div>

        {!submitted ? (
          <>
            <div className="flex flex-col items-center gap-2 text-center mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
                Bem-vindo de volta
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Insere o teu email institucional para iniciar sessão.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col w-full gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Endereço de email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="a12345@ualg.pt"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-full border border-black/[.08] dark:border-white/[.145] bg-transparent px-4 text-sm text-black dark:text-zinc-50 outline-none transition-colors placeholder:text-zinc-400 focus:border-black dark:focus:border-white"
                />
              </div>

              {errorMsg && (
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-full bg-black dark:bg-zinc-50 text-white dark:text-black font-medium text-sm transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 mt-2 disabled:opacity-50"
              >
                {loading ? 'A enviar...' : 'Continuar com email'}
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-black dark:text-zinc-50">
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
              Verifica o teu email!
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs">
              Enviámos um link mágico de acesso para{' '}
              <span className="font-medium text-black dark:text-zinc-50">
                {email}
              </span>
              .
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setErrorMsg('');
              }}
              className="text-xs font-medium text-zinc-500 hover:text-black dark:hover:text-zinc-50 underline mt-2"
            >
              Utilizar outro email
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
