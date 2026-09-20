'use client';

import { useState } from 'react';
import Image from 'next/image';

const features = [
  {
    title: 'Apontamentos & Exames',
    tag: 'PDFs & Sebentas',
    description:
      'Sebentas, resumos e testes de anos anteriores partilhados por colegas de curso.',
    borderColor: 'border-sky-400/40 hover:border-sky-300',
    bgColor:
      'bg-gradient-to-r from-sky-500/10 via-brand-500/5 to-transparent hover:from-sky-500/15',
    shadowColor:
      'shadow-[0_0_24px_-4px_rgba(56,189,248,0.2)] hover:shadow-[0_0_28px_-2px_rgba(56,189,248,0.35)]',
    iconBorder:
      'border-sky-400/60 bg-sky-500/20 text-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.35)]',
    tagStyle: 'border-sky-400/40 bg-sky-400/15 text-sky-200',
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
    tag: '1º ao 3º Ano',
    description:
      'Materiais catalogados por ano curricular e semestre para estudo direto.',
    borderColor: 'border-cyan-400/40 hover:border-cyan-300',
    bgColor:
      'bg-gradient-to-r from-cyan-500/10 via-teal-500/5 to-transparent hover:from-cyan-500/15',
    shadowColor:
      'shadow-[0_0_24px_-4px_rgba(34,211,238,0.2)] hover:shadow-[0_0_28px_-2px_rgba(34,211,238,0.35)]',
    iconBorder:
      'border-cyan-400/60 bg-cyan-500/20 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.35)]',
    tagStyle: 'border-cyan-400/40 bg-cyan-400/15 text-cyan-200',
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
    tag: 'Verificado',
    description:
      'Conteúdos verificados pela equipa do NEEI para garantir qualidade e relevância.',
    borderColor: 'border-emerald-400/40 hover:border-emerald-300',
    bgColor:
      'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent hover:from-emerald-500/15',
    shadowColor:
      'shadow-[0_0_24px_-4px_rgba(52,211,153,0.2)] hover:shadow-[0_0_28px_-2px_rgba(52,211,153,0.35)]',
    iconBorder:
      'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-[0_0_14px_rgba(52,211,153,0.35)]',
    tagStyle: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200',
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

      // Hard navigation ensures root layout and header refresh with the new session cookie.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/courses';
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
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-b from-brand-50/70 via-white to-zinc-50 dark:from-brand-950/70 dark:via-night-950 dark:to-night-950">
      {/* Background ambient lighting and pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[800px] -translate-x-1/2 rounded-full bg-brand-300/25 blur-3xl dark:bg-brand-600/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-10 h-[480px] w-[480px] rounded-full bg-cyan-400/15 blur-[120px] dark:bg-cyan-500/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(11_51_69/0.05)_1px,transparent_0)] [background-size:28px_28px] dark:bg-[radial-gradient(circle_at_1px_1px,rgb(151_214_238/0.05)_1px,transparent_0)]"
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:py-12">
        {/* Formulário na esquerda (col-span-5) */}
        <div className="flex w-full justify-center lg:col-span-5">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white/95 p-8 shadow-card backdrop-blur-xl sm:p-10 dark:border-white/10 dark:bg-night-900/90">
            {/* Logo em mobile */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl ring-1 ring-zinc-900/10 dark:ring-white/10">
                <Image
                  src="/neei-logo.png"
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

        {/* Painel de destaque na direita (col-span-7) */}
        <div className="relative hidden overflow-hidden rounded-3xl border border-brand-200/50 bg-gradient-to-br from-brand-900 via-brand-950 to-[#072535] p-8 shadow-2xl shadow-brand-950/20 lg:flex lg:col-span-7 lg:flex-col lg:justify-between xl:p-12 dark:border-cyan-500/20">
          {/* Padrão subtil de pontos em tom ciano */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(100,189,226,0.14)_1px,transparent_0)] [background-size:24px_24px]"
          />

          {/* Efeitos de iluminação ambiente com cores vibrantes */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-16 h-[380px] w-[380px] rounded-full bg-cyan-400/20 blur-[100px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-16 h-[400px] w-[400px] rounded-full bg-sky-500/25 blur-[100px]"
          />

          {/* Cabeçalho do painel com outline luminosa */}
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-brand-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/20 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              </span>
              Repositório Académico · NEEI UAlg
            </div>
          </div>

          {/* Conteúdo central */}
          <div className="relative my-auto py-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl xl:text-[2.65rem] xl:leading-[1.18]">
              O teu curso começa aqui —{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-teal-200 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(34,211,238,0.35)]">
                com ajuda de quem já passou.
              </span>
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-brand-100/85 sm:text-base">
              Entra com o teu email institucional e explora centenas de materiais
              partilhados pela comunidade de Engenharia Informática da UAlg.
            </p>

            <div className="mt-7 space-y-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className={`group flex items-start gap-4 rounded-2xl border ${feature.borderColor} ${feature.bgColor} ${feature.shadowColor} p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${feature.iconBorder} transition-transform duration-300 group-hover:scale-105`}
                  >
                    {feature.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold tracking-tight text-white">
                        {feature.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${feature.tagStyle}`}
                      >
                        {feature.tag}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-brand-100/80">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2.5 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.2)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                100% Gratuito
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/50 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                Exclusivo UAlg
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                Feito por Estudantes
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
