import Link from 'next/link';
import Image from 'next/image';

const stats = [
  { value: '1º ao 3º ano', label: 'Unidades curriculares organizadas' },
  { value: '100% gratuito', label: 'Feito por estudantes, para estudantes' },
  { value: 'aXXXXX@ualg.pt', label: 'Acesso com email institucional' },
  { value: '2 semestres', label: 'Conteúdo filtrado por ano e semestre' },
];

const features = [
  {
    title: 'Partilha em segundos',
    description:
      'Carrega apontamentos, exames resolvidos, apresentações e sebentas diretamente para a unidade curricular que pretendes.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    ),
  },
  {
    title: 'Qualidade garantida',
    description:
      'Cada material é revisto e aprovado pela equipa do NEEI antes de ficar visível para toda a comunidade.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    title: 'Acesso exclusivo UAlg',
    description:
      'Apenas estudantes da Universidade do Algarve, identificados pelo email institucional, podem participar.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    ),
  },
  {
    title: 'Tudo num só lugar',
    description:
      'Consulta, pesquisa e descarrega materiais sem perder tempo — tudo organizado por unidade curricular, ano e semestre.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
      />
    ),
  },
  {
    title: 'Armazenamento seguro',
    description:
      'Os ficheiros ficam guardados no Supabase Storage, com ligações estáveis e seguras.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
      />
    ),
  },
  {
    title: 'Feito pelo NEEI',
    description:
      'Uma iniciativa do Núcleo de Estudantes de Engenharia Informática para ajudar toda a comunidade estudantil.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
];

const steps = [
  {
    number: '01',
    title: 'Entra com o teu email UAlg',
    description:
      'Utiliza o teu email institucional aXXXXX@ualg.pt. Recebes um link mágico e entras sem palavras-passe.',
  },
  {
    number: '02',
    title: 'Explora ou partilha materiais',
    description:
      'Navega pelas unidades curriculares, pesquisa por nome, ano ou semestre e envia os teus próprios materiais.',
  },
  {
    number: '03',
    title: 'Aprovação e acesso',
    description:
      'A equipa do NEEI revê cada submissão. Assim que for aprovada, fica disponível para toda a comunidade.',
  },
];

const mockMaterials = [
  {
    title: 'Apontamentos — Lógica Matemática',
    type: 'PDF',
    course: '1º Ano · 1º Semestre',
    status: 'Aprovado',
    statusClass:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    accent: 'from-red-500 to-rose-600',
  },
  {
    title: 'Exames Resolvidos — Programação I',
    type: 'PDF',
    course: '1º Ano · 2º Semestre',
    status: 'Aprovado',
    statusClass:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    accent: 'from-red-500 to-rose-600',
  },
  {
    title: 'Slides — Arquitetura de Computadores',
    type: 'PPTX',
    course: '2º Ano · 1º Semestre',
    status: 'Pendente',
    statusClass:
      'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    accent: 'from-orange-500 to-amber-600',
  },
];

function MaterialCard({
  material,
}: {
  material: (typeof mockMaterials)[number];
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-night-800">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${material.accent} text-[10px] font-bold uppercase tracking-wide text-white shadow-sm`}
      >
        {material.type}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
          {material.title}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {material.course}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${material.statusClass}`}
      >
        {material.status}
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* ============ HERO ============ */}
      <section className="relative">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-brand-50 via-white to-white dark:from-brand-950/70 dark:via-night-950 dark:to-night-950"
        />
        <div
          aria-hidden="true"
          className="absolute -top-32 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-brand-300/30 blur-3xl dark:bg-brand-600/15"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(11_51_69/0.06)_1px,transparent_0)] [background-size:28px_28px] dark:bg-[radial-gradient(circle_at_1px_1px,rgb(151_214_238/0.05)_1px,transparent_0)]"
        />

        <div className="relative mx-auto grid min-w-0 max-w-6xl items-center gap-14 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-28">
          <div className="min-w-0 animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Plataforma oficial do NEEI · Universidade do Algarve
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-white">
              Partilha o conhecimento.{' '}
              <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 bg-clip-text text-transparent dark:from-brand-300 dark:via-brand-400 dark:to-brand-500">
                Passa todas as cadeiras.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              O{' '}
              <strong className="font-semibold text-zinc-900 dark:text-white">
                NEEI-Box
              </strong>{' '}
              é o espaço onde os estudantes de Engenharia Informática da UAlg
              partilham apontamentos, exames resolvidos e apresentações — para
              que ninguém comece do zero.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/courses"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-900 px-7 text-sm font-semibold text-white shadow-lg shadow-brand-900/20 transition-all hover:bg-brand-800 hover:shadow-brand-900/30 dark:bg-brand-500 dark:text-night-950 dark:shadow-brand-500/20 dark:hover:bg-brand-400"
              >
                Explorar Unidades Curriculares
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
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-7 text-sm font-semibold text-zinc-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 dark:border-white/15 dark:text-zinc-300 dark:hover:border-brand-700 dark:hover:bg-brand-950 dark:hover:text-brand-200"
              >
                Como funciona
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Login por email institucional
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Conteúdo revisto pelo NEEI
              </span>
            </div>
          </div>

          {/* Mockup */}
          <div
            aria-hidden="true"
            className="min-w-0 animate-fade-up [animation-delay:150ms]"
          >
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-400/20 to-brand-600/10 blur-2xl" />

              <div className="relative rounded-3xl border border-zinc-200/80 bg-white/90 p-5 shadow-card backdrop-blur dark:border-white/10 dark:bg-night-900/90">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  <span className="ml-3 min-w-0 flex-1 truncate rounded-full bg-zinc-100 px-3 py-1 text-[10px] text-zinc-400 dark:bg-white/5 dark:text-zinc-500">
                    neeibox.pt/cursos
                  </span>
                </div>

                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Unidades Curriculares
                  </p>
                  <span className="rounded-full bg-brand-900 px-3 py-1 text-[10px] font-semibold text-white dark:bg-brand-500 dark:text-night-950">
                    + Partilhar
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {mockMaterials.map((material) => (
                    <MaterialCard key={material.title} material={material} />
                  ))}
                </div>
              </div>

              <div className="absolute -right-3 -top-4 hidden animate-float rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 shadow-card sm:block dark:border-white/10 dark:bg-night-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Materiais ativos
                </p>
                <p className="mt-0.5 text-xl font-bold text-brand-700 dark:text-brand-300">
                  +150
                </p>
              </div>

              <div className="absolute -bottom-5 -left-3 hidden animate-float rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 shadow-card [animation-delay:2s] sm:block dark:border-white/10 dark:bg-night-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Material aprovado
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Disponível para a comunidade
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="border-y border-zinc-200/70 bg-white dark:border-white/5 dark:bg-night-900">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold tracking-tight text-brand-800 sm:text-2xl dark:text-brand-300">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ O QUE É ============ */}
      <section className="bg-white py-20 sm:py-24 dark:bg-night-950">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
              O que é
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              Estuda em comunidade, não em isolamento
            </h2>
            <p className="mt-5 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              O NEEI-Box nasceu de uma realidade que todos conhecemos: cada
              semestre, centenas de estudantes procuram os mesmos apontamentos,
              resolvem os mesmos exames e passam horas a pedir materiais em
              grupos de mensagens.
            </p>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Esta plataforma centraliza esses recursos num único sítio,
              organizado por unidade curricular, ano e semestre — com o{' '}
              <strong className="font-semibold text-zinc-900 dark:text-white">
                selo de qualidade do NEEI
              </strong>{' '}
              em cada material partilhado.
            </p>

            <ul className="mt-7 space-y-3">
              {[
                'Conteúdo 100% revisto pela equipa do NEEI antes de publicar',
                'Pesquisa rápida por nome, ano e semestre',
                'Sem publicidade e sem custos para os estudantes',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <svg
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-brand-50 to-white p-8 sm:p-10 dark:border-white/10 dark:from-night-900 dark:to-night-950">
            <Image
              src="/neei.svg"
              alt="Logótipo do NEEI"
              width={96}
              height={96}
              className="mx-auto mb-6 h-24 w-24 rounded-2xl shadow-card ring-1 ring-zinc-900/10 dark:ring-white/10"
            />
            <blockquote className="text-center">
              <p className="text-lg font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">
                &ldquo;Se um estudante partilhou os apontamentos que o ajudaram
                a passar, porque é que o estudante seguinte tem de os procurar
                do zero?&rdquo;
              </p>
            </blockquote>
            <p className="mt-4 text-center text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
              — Núcleo de Estudantes de Engenharia Informática
            </p>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="bg-zinc-50 py-20 sm:py-24 dark:bg-night-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
              Funcionalidades
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              Tudo o que precisas para estudar melhor
            </h2>
            <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
              Uma plataforma simples, rápida e feita à medida da comunidade de
              Engenharia Informática da UAlg.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-card-hover dark:border-white/10 dark:bg-night-950 dark:hover:border-brand-900"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-900 group-hover:text-white dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-900 dark:group-hover:bg-brand-500 dark:group-hover:text-night-950">
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMO FUNCIONA ============ */}
      <section
        id="como-funciona"
        className="bg-white py-20 sm:py-24 dark:bg-night-950"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
              Como funciona
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              Do email institucional à aprovação em três passos
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="relative rounded-2xl border border-zinc-200/80 bg-white p-7 dark:border-white/10 dark:bg-night-900"
              >
                <span className="bg-gradient-to-br from-brand-600 to-brand-800 bg-clip-text text-4xl font-bold text-transparent dark:from-brand-300 dark:to-brand-500">
                  {step.number}
                </span>
                <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {step.description}
                </p>
                {index < steps.length - 1 && (
                  <svg
                    aria-hidden="true"
                    className="absolute -right-4 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-brand-300 md:block dark:text-brand-800"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 px-6 py-16 text-center shadow-card sm:px-12 dark:from-brand-950 dark:via-night-900 dark:to-night-950">
          <div
            aria-hidden="true"
            className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Pronto para deixar de procurar apontamentos?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-brand-100/90 dark:text-zinc-300">
              Entra com o teu email institucional e começa a partilhar — ou a
              aproveitar o que a comunidade já partilhou.
            </p>
            <Link
              href="/courses"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-bold text-brand-900 shadow-lg transition-transform hover:scale-[1.03] dark:bg-brand-300 dark:text-night-950"
            >
              Começar agora
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
