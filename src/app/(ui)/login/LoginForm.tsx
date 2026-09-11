'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const features = [
  {
    title: 'Apontamentos & Exames',
    description:
      'Sebentas, resumos e testes de anos anteriores partilhados por colegas de curso.',
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
    ),
  },
  {
    title: 'Organização por Disciplina',
    description:
      'Materiais catalogados por ano curricular e semestre para estudo direto.',
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
        />
      </svg>
    ),
  },
  {
    title: 'Curadoria & Revisão',
    description:
      'Conteúdos verificados pela equipa do NEEI para garantir qualidade e relevância.',
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
  },
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
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-10 lg:flex lg:flex-col lg:justify-between lg:border-r lg:border-brand-800/40 xl:p-14 dark:lg:border-white/5">
        {/* Padrão subtil de pontos */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:24px_24px]"
        />

        {/* Efeitos de iluminação ambiente */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 -left-24 h-72 w-72 -translate-y-1/2 rounded-full bg-brand-600/15 blur-3xl"
        />

        {/* Cabeçalho do painel */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/15 px-3.5 py-1.5 text-xs font-semibold text-brand-200 backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
            </span>
            Repositório Académico · NEEI UAlg
          </div>
        </div>

        {/* Conteúdo central */}
        <div className="relative my-auto max-w-lg py-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl xl:text-[2.65rem] xl:leading-[1.18]">
            O teu curso começa aqui —{' '}
            <span className="bg-gradient-to-r from-brand-200 via-brand-300 to-cyan-100 bg-clip-text text-transparent">
              com ajuda de quem já passou.
            </span>
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-brand-100/85 sm:text-base">
            Entra com o teu email institucional e explora centenas de materiais
            partilhados pela comunidade de Engenharia Informática da UAlg.
          </p>

          <div className="mt-8 space-y-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-200 ring-1 ring-white/10 transition-colors group-hover:bg-brand-500/30 group-hover:text-white">
                  {feature.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-100/75">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-brand-100/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              100% Gratuito
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-brand-100/80">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              Exclusivo UAlg
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-brand-100/80">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              Feito por Estudantes
            </span>
          </div>
        </div>

        {/* Rodapé do painel */}
        <div className="relative flex items-center justify-between border-t border-white/10 pt-5 text-xs text-brand-200/65">
          <span>
            © {new Date().getFullYear()} NEEI · Universidade do Algarve
          </span>
          <span className="hidden xl:inline text-brand-300/60">
            Licenciatura & Mestrado
          </span>
        </div>
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
