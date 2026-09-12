# NEEI-Box

> **Partilha de materiais de estudo da comunidade de Engenharia Informática da Universidade do Algarve.**

O **NEEI-Box** é a plataforma web do Núcleo de Estudantes de Engenharia
Informática (NEEI) da UAlg para partilhar apontamentos, exames resolvidos,
apresentações e sebentas — organizados por **unidade curricular, ano e
semestre**, com um fluxo de **revisão e aprovação** pela equipa do NEEI.

Está em produção, é usado pela comunidade (mais de 500 materiais partilhados)
e é **100% auto-hospedado**: a equipa controla o código, a base de dados, os
ficheiros e o processo de deploy, do `git push` à *health check*.

![CI - Code Quality & Build Check](https://github.com/neei-aaualg/NEEI-Box/actions/workflows/ci.yml/badge.svg)
![Licença](https://img.shields.io/badge/license-MIT-blue)

**Stack:** [Next.js 16](https://nextjs.org) (App Router) · [React 19](https://react.dev) ·
[TypeScript](https://www.typescriptlang.org) (estrito) ·
[Tailwind CSS v4](https://tailwindcss.com) · [Prisma 6](https://www.prisma.io) ·
[PostgreSQL](https://www.postgresql.org) · [Node.js 22](https://nodejs.org) ·
[Docker](https://www.docker.com) · self-hosted em [Coolify](https://coolify.io)

---

## Funcionalidades

| Área | Descrição |
| --- | --- |
| **Login sem palavras-passe** | Código OTP (6 dígitos) enviado por email, restrito a contas da UAlg (`aXXXXX@ualg.pt`). Sessões seguras em cookie `httpOnly`. |
| **Unidades Curriculares** | Catálogo de UCs agrupado por ano e semestre, com pesquisa por nome e filtros. |
| **Materiais** | Upload de ficheiros (PDF, DOCX, PPTX, XLSX, ZIP, imagens…) com pré-visualização por tipo. |
| **Etiquetas por UC** | A `description` de cada material é interpretada como um conjunto de **etiquetas** (ex. `Frequências`, `Exame`), com **filtro por etiqueta** dentro de cada unidade curricular. |
| **Upload com etiquetas existentes** | No formulário de upload escolhe-se entre as etiquetas já existentes na UC (multi-seleção por *chips*), evitando texto livre e *tag pollution*. |
| **Fluxo de revisão** | Materiais de estudantes entram como `pending`; os administradores aprovam ou rejeitam antes de ficarem públicos. |
| **Painel de administração** | `/admin` — filas de pendentes/aprovados/rejeitados, gestão de UCs e de utilizadores (promover/demover admins com proteção contra auto-demissão). |
| **Light/Dark mode** | Alternador de tema com persistência (localStorage + preferência do sistema), sem *flash* de tema (FOUC-free). |
| **Design responsivo** | Mobile-first, acessível (`aria-*`, semântica, `lang="pt"`), impulsionado pela identidade visual do NEEI. |
| **Health-check** | `/api/health` público para o `HEALTHCHECK` do Docker. |

---

## Arquitetura

`docs/architecture.png` · [editável `docs/architecture.drawio`](docs/architecture.drawio)

![Diagrama de arquitetura do NEEI-Box](docs/architecture.png)

A aplicação é um **monólito Next.js 16 auto-hospedado**: uma única imagem Docker
(não é preciso um SaaS por trás) que serve a UI e expõe a API, ligado a três
recursos externos — **PostgreSQL** (dados), **disco local persistente**
(ficheiros) e **SMTP** (envio dos códigos OTP).

1. **Proxy (`src/proxy.ts`)** — antigo *middleware*, agora `proxy` no Next 16.
   Faz um *gate* grosseiro: sem cookie de sessão, bloqueia `/api/*` privado
   (401) e redireciona `/courses` e `/admin` para `/login`. Rotas públicas
   (`/api/health`, `/api/auth/*`) estão fora do matcher.
2. **Route Handlers** — a API REST real (auth, courses, materials, admin). Cada
   rota sensível valida a sessão **e o role** no servidor (nunca se confia no
   cliente).
3. **Server Components + Clients** — UI com App Router, layout partilhado no
   route group `(ui)`, estados locais geridos com `useState`/`useMemo`.
4. **`lib/auth`** — OTP, sessões e envio de email (nodemailer).
5. **`lib/storage`** — guarda ficheiros em disco com caminhos sanitizados e
   limites de tamanho; serve via `/api/files/...` com cache imutável de 1 ano.
6. **`lib/db`** (Prisma) — singleton `PrismaClient`, a única fonte de verdade
   do schema, sincronizado via `prisma db push` no arranque do contentor.
7. **CI → Coolify** — GitHub Actions valida (format + lint + build) em cada
   push/PR; o Coolify faz o build multi-stage e o deploy, com `HEALTHCHECK`
   contra `/api/health`.

---

## Decisões de arquitetura

Documentámos cada decisão grande como um **ADR** (Architecture Decision Record)
— o **contexto**, a **decisão**, porque **funciona** e o **trade-off**. Isto é
isto que permite evoluir com confiança e voltar atrás sem adivinhar.

### 1. Auto-hospedado (Coolify + Docker) em vez de SaaS
- **Contexto:** o projeto começou com Supabase (auth + Postgres + Storage) e Vercel.
- **Decisão:** migrar para auto-hospedagem — Docker multi-stage (`node:22-alpine`,
  `output: 'standalone'`), PostgreSQL gerido no Coolify, volume persistente.
- **Porquê funciona:** custo previsível, dados e ficheiros sob controlo do NEEI,
  zero lock-in comercial, deploy repetível e auditável.
- **Trade-off:** a equipa é responsável por operações (backups, atualizações);
  mitigámos com um único binário Prisma na imagem e schema aplicado no arranque.

### 2. Monólito Next.js (UI + API no mesmo deploy)
- **Decisão:** uma só aplicação com server components e route handlers.
- **Porquê funciona:** um único deploy, ~zero latência rede entre UI/API,
  autorização reutilizável no servidor, rastreabilidade total.
- **Trade-off:** escala vertical; mais que suficiente para uma comunidade
  universitária. Extrair services só se fizer sentido quando houver métricas.

### 3. Autenticação sem palavras-passe (OTP por email institucional)
- **Decisão:** código OTP de 6 dígitos enviado por SMTP, restrito a
  `aNNNNN@ualg.pt` (ou `ADMIN_EMAILS`).
- **Porquê funciona:** sem gestão de palavras-passe, sem hashing de credenciais,
  só estudantes com email institucional entram; emissão é imediata.
- **Trade-off:** depende do SMTP; com TTL de 10 min, máx. 5 tentativas e
  token de uso único armazenado apenas com SHA-256, o risco é controlado.
  (Sem *rate limiting* ao reenviar — limitação conhecida, ver abaixo.)

### 4. Sessões opacas (não JWT)
- **Decisão:** `crypto.randomBytes(32)` → token aleatório; só o hash SHA-256 fica
  na BD (`sessions.token_hash`); cookie `neei_box_session` `httpOnly`,
  `sameSite=lax`, `secure` em produção, expiração de 30 dias.
- **Porquê funciona:** token mais simples e revogável — eliminar a linha do
  cookie termina a sessão instantaneamente, sem listas negras JWT.
- **Trade-off:** uma lookup à BD por pedido autenticado; desprezável aqui.

### 5. Autorização no servidor, proxy como portão grosseiro
- **Decisão:** o proxy só verifica a existência do cookie; cada route handler
  chama `getCurrentUser()` e valida `role`.
- **Porquê funciona:** "nunca confiar no cliente" — nem a presença do cookie
  nem o UI esconder botões fazem autorização. RLS no Postgres não é necessário
  porque a autorização é centralizada nas rotas.
- **Trade-off:** o proxy não conhece roles; redireciona e a rota responde 403.
  Simples e seguro.

### 6. PostgreSQL + Prisma como fonte de verdade
- **Decisão:** schema declarativo (`schema.prisma`), migração no arranque com
  `prisma db push --skip-generate`, tipos gerados consumidos em toda a app.
- **Porquê funciona:** zero SQL manual espalhado, tipos ligados ao schema
  (TS estrito), tabelas auto-criadas em dev e produção.
- **Trade-off:** abrir mão de controlo fino de migrações versionadas; para a
  dimensão do projeto é a escolha pragmática e consistente.

### 7. Ficheiros em disco local (volume persistente)
- **Decisão:** `UPLOAD_DIR` no contentor, caminho `<user_id>/<uuid>-<ficheiro>`,
  nomes sanitizados (NFD), limites de 50 MB/ficheiro e 8 GB no total; serve com
  cache `immutable`, 1 ano.
- **Porquê funciona:** barato, zero dependências externas, pré-visualizações via
  `/api/files/...` protegidas por sessão.
- **Trade-off:** o armazenamento vive na máquina; o volume persistente do
  Coolify resolve reinícios. (Limitação: o ficheiro é lido para memória na rota
  — sem *streaming*/Range. Próximo passo natural: `fs.createReadStream`.)

### 8. "Description como etiquetas" sem tabela própria
- **Decisão:** a `description` é interpretada como um conjunto de etiquetas
  separadas por `/`, `,` ou `;` (deduplicadas ignorando maiúsculas e acentos);
  filtro por etiqueta em cada UC; o upload escolhe apenas etiquetas existentes.
- **Porquê funciona:** zero migração de schema, máxima simplicidade para
  "etiquetar", e o formulário por *chips* evita inventar tags novas. Foi uma
  decisão de produto rápida com efeito imediato.
- **Trade-off:** nenhuma relação N:M dedicada; se etiquetas precisarem de
  metadados (cor, autor) evolui-se para `tags` + `material_tags` numa migração.

### 9. Dark/light mode "hand-rolled" (sem biblioteca)
- **Decisão:** script inline FOUC-free no layout, `localStorage` +
  `prefers-color-scheme`, `useSyncExternalStore` + `MutationObserver`.
- **Porquê funciona:** ~120 linhas, zero dependências, sem *flash* de tema.
  ESLint (regra `set-state-in-effect`) pegou uma armadilha e obrigou à
  versão correta.
- **Trade-off:** mais código nosso para manter; em troca, transparência total.

### 10. Qualidade: escala de PRs + CI desde o início
- **Decisão:** cada funcionalidade entra por **branch + PR**, com a CI
  (GitHub Actions: `format:check` → `lint` → `build`) a validar tudo, e o
  owner do projeto faz o merge.
- **Porquê funciona:** `main` está sempre verde e desdobrável; decisões
  levam registro no git; o ESLint com regras `react-hooks` estritas
  (ex. `set-state-in-effect`, `error-boundaries`) apanhou bugs reais antes do
  deploy. Foi o processo que permitiu mergir auth, agrupamento de UCs, tema e
  etiquetas sem regressões.

---

## Segurança

- **Passwordless** — sem palavras-passe, sem hashing de credenciais.
- **OTP sólido** — 6 dígitos, TTL de 10 min, máx. 5 tentativas (bloqueia e
  pede novo código), uso único, apenas SHA-256 persistido, emails restritos.
- **Sessões** — token opaco de 32 bytes, hash na BD, cookie `httpOnly` +
  `sameSite=lax` + `secure` em produção, 30 dias de duração, revogável.
- **Autorização no servidor** — `getCurrentUser()` + verificação de role em
  cada rota sensível; o proxy é só um portão de primeira linha.
- **Uploads seguros** — caminhos sanitizados com `getSafePath` (bloqueia
  *path traversal*), limites de tamanho, nomes de ficheiro neutralizados.
- **Admin protegido** — não podes demitir-te a ti próprio nem demitir o
  último administrador; promoção de admins é uma ação explícita por email.
- **Public endpoints mínimos** — `/api/health` e `/api/auth/*` fora do gate;
  tudo o resto exige sessão.

---

## API

Todas as rotas em `src/app/api/`. Rotas sensíveis respondem `401` (sem sessão)
ou `403` (sem role de admin).

| Rota | Método | Descrição | Auth |
| --- | --- | --- | --- |
| `/api/health` | GET | `{ status: 'ok' }` — alvo do Docker `HEALTHCHECK` | pública |
| `/api/auth/login` | POST | Valida o email e envia o código OTP (SMTP) | pública |
| `/api/auth/verify` | POST | Verifica o código, cria perfil e sessão | pública |
| `/api/auth/logout` | POST | Termina a sessão e limpa o cookie | pública¹ |
| `/api/courses` | GET/POST | Listar UCs / criar UC | sessão (+admin p/ POST) |
| `/api/courses/[id]` | PATCH/DELETE | Editar / apagar UC (apaga ficheiros associados) | admin |
| `/api/materials/upload` | POST | Upload multipart (título, etiquetas, ficheiro) | sessão |
| `/api/materials/[id]` | DELETE | Apagar material (e ficheiro do disco) | admin |
| `/api/materials/[id]/review` | POST | Aprovar ou rejeitar (rejeitar apaga ficheiro+registo) | admin |
| `/api/files/[...path]` | GET | Serve o ficheiro com MIME e cache imutável | sessão |
| `/api/admin/users` | GET/POST | Listar / adicionar utilizadores | admin |
| `/api/admin/users/[id]` | PATCH | Alterar role (com guardas anti-demissão/último admin) | admin |

¹ O handler destrói a sessão e devolve sempre, mesmo sem cookie.

---

## Modelo de dados

`docs/er.drawio.png` · [editável `docs/er.drawio`](docs/er.drawio) — notação *crow's foot*.

![Diagrama Entidade-Relacionamento do NEEI-Box](docs/er.drawio.png)

| Tabela | Papel | Campos-chave |
| --- | --- | --- |
| `profiles` | utilizadores | `id` (PK), `email` (UNIQUE), `role` (STUDENT\|ADMIN), `created_at` |
| `courses` | UCs do curso | `id` (PK), `name`, `year`, `semester`, `created_at` |
| `materials` | materiais partilhados | `id` (PK), `course_id` (FK), `title`, `description` (etiquetas), `storage_path`, `web_url`, `file_*`, `review_status`, `uploaded_by` (FK), `created_at` |
| `sessions` | sessões de login | `id` (PK), `user_id` (FK), `token_hash` (UNIQUE), `expires_at` |
| `otp_tokens` | códigos OTP | `id` (PK), `email` (IDX), `token_hash`, `expires_at`, `attempts`, `created_at` |

Relações 1—* (cascata `ON DELETE`): `profiles → materials` (upload),
`courses → materials`, `profiles → sessions`. `otp_tokens` referencia utilizador
apenas por `email` (sem FK — requisitos transitórios do login). O schema vive em
`src/prisma/schema.prisma`.

---

## Pontos fortes do projeto

**Para quem usa (estudantes e NEEI):**
- Zero palavras-passe — login com o email institucional em segundos.
- Conteúdo com curadoria — o fluxo de revisão mantém a qualidade e bloqueia spam.
- Organização por **ano/semestre** e **etiquetas por UC** — encontrar material é rápido.
- Tema claro/escuro e interface 100% móvel.

**Para quem desenvolve:**
- **TypeScript estrito** em toda a app; tipos de BD gerados do schema Prisma.
- **Segurança por desenho** — nunca confiar no cliente; tudo validado no servidor.
- **Qualidade automática** — Prettier + ESLint (rules `react-hooks` estritas) + build na CI.
- **Processo de equipa** — PRs com registo claro no git, `main` sempre deployável.
- **Acessibilidade** — labels, `aria-pressed`/`aria-labelledby`, `role="dialog"`,
  HTML semântico, `lang="pt"`.
- **Desempenho** — Server Components, cache imutável para ficheiros,
  build standalone com tamanho mínimo, sem dependências de tema/auth na UI.

**Para empregadores:**
- Um produto real em produção, usado por dezenas de pessoas — decisões
  documentadas como ADRs, diagramas de arquitetura e ER, e um pipeline de
  CI/CD funcional. Prova de boas práticas: versão controlada, revisão por PR,
  lint/format no pipeline, segurança por camadas e transparência sobre
  trade-offs e limitações.

> **Limitações conhecidas (e próximos passos honestos):** a rota
> `/api/files/...` lê o ficheiro para memória (sem *streaming*/Range) ·
> `review_status` é `String` em vez de enum Prisma · falta *rate limiting* no
> reenvio de OTP · o esquema é propagado com `prisma db push` (sem pastas de
> migrações versionadas).

---

## Estrutura do projeto

```
NEEI-Box/
├── .github/workflows/ci.yml      # CI: format:check → lint → build
├── Dockerfile                    # multi-stage, node:22-alpine, standalone
├── COOLIFY.md                    # guia de deploy operacional
├── dev.bat / dev.ps1             # lançadores de dev (Windows)
├── docs/
│   ├── architecture.drawio/.png  # diagrama de arquitetura
│   ├── er.drawio/.png            # diagrama ER (crow's foot)
│   └── DEPLOYMENT.md             # guia de deploy em produção
├── package.json                  # wrapper que delega para src/
├── src/                          # a aplicação Next.js
│   ├── app/
│   │   ├── (ui)/                 # landing, login, courses, admin (layout partilhado)
│   │   └── api/                  # route handlers (auth, courses, materials, files, admin)
│   ├── components/               # Header, Footer, ThemeToggle, MaterialPreview, TagPills
│   ├── lib/
│   │   ├── auth/                 # otp.ts · session.ts · email.ts
│   │   ├── db.ts                 # singleton PrismaClient
│   │   ├── storage.ts            # disco local + limites + getSafePath
│   │   ├── file-types.ts         # deteção/tipos de ficheiro
│   │   ├── tags.ts               # parse de etiquetas (description)
│   │   └── types.ts              # tipos partilhados
│   ├── prisma/schema.prisma      # fonte de verdade da BD
│   ├── proxy.ts                  # auth gate (Next 16 "middleware")
│   └── .env.example
└── LICENSE                       # MIT
```

---

## Desenvolvimento local

Pré-requisitos: **Node.js 20+**, **Docker** (para o PostgreSQL local) ou uma BD
PostgreSQL já a correr.

```bash
cd src
npm install
cp .env.example .env.local        # preenche DATABASE_URL e demais variáveis

# opcional: PostgreSQL local num contentor
docker run -d --name neei-box-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=neei_box -p 5432:5432 postgres:16

npm run dev                       # http://localhost:3000
```

O schema é sincronizado no arranque (se `DATABASE_URL` estiver definida) ou podes
forçar com `npx prisma db push`.

### Variáveis de ambiente

`src/.env.example` é o contrato de configuração:

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Ligação PostgreSQL (ex. `postgresql://postgres:postgres@localhost:5432/neei_box?schema=public`) |
| `UPLOAD_DIR` | Pasta dos ficheiros (dev: `uploads`) |
| `MAX_FILE_SIZE_MB` | Tamanho máximo por ficheiro (padrão `50`) |
| `MAX_STORAGE_LIMIT_GB` | Limite total do armazenamento (padrão `8`) |
| `SMTP_HOST` / `SMTP_PORT` | Servidor SMTP (padrão `587`) |
| `SMTP_USER` / `SMTP_PASS` | Credenciais de envio |
| `SMTP_FROM` | Remetente (padrão `NEEI-Box <no-reply@neei.online>`) |
| `ADMIN_EMAILS` | Emails de administradores iniciais, separados por vírgula |

> Em dev, se o SMTP não estiver configurado, o código OTP é impresso no
> terminal (`[AUTH-DEV]`) para testar o login.

---

## Qualidade e CI

```bash
npm run dev          # servidor de desenvolvimento
npm run lint         # ESLint (inclui regras react-hooks estritas)
npm run format:check # Prettier (verificação)
npm run format:write # Prettier (correção automática)
npm run build        # build de produção
```

A CI (**GitHub Actions**) corre `format:check` → `lint` → `build` em cada push e
PR. `main` está sempre verde e pronta a desdobrar.

---

## Deploy em produção

O NEEI-Box corre self-hosted no **Coolify**:

- **Uma imagem Docker** (`node:22-alpine`, multi-stage, `output: standalone`)
  com `HEALTHCHECK` contra `/api/health` e `prisma db push` no arranque.
- **PostgreSQL** gerido no Coolify (a app liga-se via `DATABASE_URL` interna).
- **Volume persistente** montado em `/app/uploads` para os ficheiros.
- **Cada `git push`/PR para `main`** dispara a CI; o Coolify faz o deploy.

Guia detalhado: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) e
[`COOLIFY.md`](COOLIFY.md).

---

## Como o projeto evoluiu (decisões sequenciais)

1. **Época OneDrive** → os ficheiros viviam em pastas partilhadas do OneDrive;
   a BD guardava os seus IDs.
2. **Supabase** → migrate para Supabase Auth + Postgres + Storage (bucket
   `materials`, RLS) com deploy na Vercel.
3. **Auto-hospedagem total** → substituir o Supabase por PostgreSQL + Prisma,
   OTP próprio com nodemailer, ficheiros em disco local e deploy no Coolify —
   eliminando serviços externos e lock-in.
4. **Produto** → upload em volume de >500 materiais em 29 UCs; auth-gate
   (PR #14), agrupamento de UCs por ano/semestre (PR #15), light/dark mode
   (PR #16), **description→etiquetas** com filtro (PR #17) e seletor de
   etiquetas no upload (PR #18). Cada passo: branch, PR, CI verde, merge.

---

## Ideias futuras

- *Streaming* e suporte a *Range* na rota de ficheiros (`createReadStream`).
- Migrações versionadas do Prisma e enum para `review_status`.
- *Rate limiting* e cooldown no reenvio de códigos OTP.
- Estatísticas de downloads, materiais populares e perfil do estudante.
- Notificações por email aos admins quando há novos pendentes.
- Filtros avançados (formato, autor, ordenação) e pesquisa global.
- Backups automáticos da BD e do volume de uploads.

---

## Licença

MIT — ver [`LICENSE`](LICENSE).

**NEEI-Box** © 2026 NEEI — Núcleo de Estudantes de Engenharia Informática da
Universidade do Algarve.