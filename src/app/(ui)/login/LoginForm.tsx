'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const perks = [
  'Acesso a apontamentos, exames e apresentações',
  'Materiais organizados por unidade curricular',
  'Conteúdo revisto e aprovado pelo NEEI',
];

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const ualgEmailRegex = /^a\d+@ualg\.pt$/;

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
          data.error || 'Ocorreu um erro ao enviar o código de acesso.'
        );
      }

      setToken('');
      setStep('code');
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

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!/^\d{6,10}$/.test(token.trim())) {
      setErrorMsg('O código não é válido. Verifica o email e tenta novamente.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token: token.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Código inválido ou expirado. Tenta novamente.'
        );
      }

      router.push('/courses');
      router.refresh();
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
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Painel de marca */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl"
        />

        <Link href="/" className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/20">
            <Image
              src="/neei.svg"
              alt=""
              width={44}
              height={44}
              className="h-full w-full object-cover"
            />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            NEEI-Box
          </span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
            O teu curso começa aqui —{' '}
            <span className="text-brand-300">com ajuda de quem já passou.</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-brand-100/90">
            Entra com o teu email institucional e explora centenas de materiais
            partilhados pela comunidade de Engenharia Informática da UAlg.
          </p>

          <ul className="mt-8 space-y-3">
            {perks.map((perk) => (
              <li
                key={perk}
                className="flex items-center gap-3 text-sm text-brand-50/90"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/30 text-brand-200">
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200/70">
          © {new Date().getFullYear()} Núcleo de Estudantes de Engenharia
          Informática — Universidade do Algarve
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-night-950">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl ring-1 ring-zinc-900/10 dark:ring-white/10">
              <Image
                src="/neei.svg"
                alt=""
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </span>
            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
              NEEI-Box
            </span>
          </div>

          {step === 'email' ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Bem-vindo de volta
                </h1>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                  Insere o teu email institucional para receberes um código de
                  acesso.
                </p>
              </div>

              <form onSubmit={sendCode} className="flex flex-col gap-4">
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
                    autoComplete="email"
                    placeholder="a12345@ualg.pt"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-night-900 dark:text-white dark:focus:border-brand-400"
                  />
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-brand-900 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 disabled:opacity-60 dark:bg-brand-500 dark:text-night-950 dark:hover:bg-brand-400"
                >
                  {loading ? 'A enviar...' : 'Enviar código de acesso'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Só aceitamos emails institucionais da{' '}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Universidade do Algarve
                </span>
                . Não tens conta? Cria-a automaticamente com o mesmo email.
              </p>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Verifica o teu email
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Enviámos um código de acesso para{' '}
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {email}
                  </span>
                  .
                </p>
              </div>

              <form onSubmit={verifyCode} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="token"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Código de acesso
                  </label>
                  <input
                    id="token"
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={10}
                    placeholder="00000000"
                    value={token}
                    onChange={(e) =>
                      setToken(e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-center text-lg font-semibold tracking-[0.35em] text-zinc-900 outline-none transition-shadow placeholder:text-zinc-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-night-900 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-brand-400"
                  />
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-brand-900 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 disabled:opacity-60 dark:bg-brand-500 dark:text-night-950 dark:hover:bg-brand-400"
                >
                  {loading ? 'A verificar...' : 'Entrar'}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-center gap-4 text-xs font-medium">
                <button
                  onClick={() => {
                    setStep('email');
                    setErrorMsg('');
                  }}
                  className="text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Utilizar outro email
                </button>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <button
                  onClick={sendCode}
                  disabled={loading}
                  className="text-brand-700 underline underline-offset-2 hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
                >
                  Reenviar código
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
