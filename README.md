# NEEI-Box

> Partilha de materiais de estudo da comunidade de **Engenharia Informática da Universidade do Algarve**.

O **NEEI-Box** é uma plataforma web onde os estudantes do Núcleo de Estudantes
de Engenharia Informática (NEEI) da UAlg partilham apontamentos, exames
resolvidos, apresentações e sebentas — organizados por unidade curricular, ano
e semestre, com revisão e aprovação pela equipa do NEEI.

**Stack:** [Next.js 16](https://nextjs.org) (App Router) · [React 19](https://react.dev) ·
[TypeScript](https://www.typescriptlang.org) · [Tailwind CSS v4](https://tailwindcss.com) ·
[Supabase](https://supabase.com) (auth + PostgreSQL + Storage)

---

## Funcionalidades

| Área | Descrição |
| --- | --- |
| **Login por email institucional** | Autenticação com código OTP (sem palavras-passe), restrita a emails `aXXXXX@ualg.pt`. |
| **Unidades Curriculares** | Catálogo de UCs organizado por ano e semestre, com pesquisa e filtros. |
| **Partilha de materiais** | Upload de ficheiros (PDF, DOCX, PPTX, XLSX, ZIP, imagens…) com título e descrição. |
| **Revisão por administradores** | Cada material passa por um fluxo de aprovação/rejeição antes de ficar público. |
| **Painel de administração** | `/admin` — filas de materiais pendentes/aprovados/rejeitados com ações rápidas. |
| **Pré-visualização de materiais** | Imagens pré-visualizadas diretamente do storage (com fallback visual por tipo de ficheiro). |
| **Terminar sessão** | Endpoint `POST /api/auth/logout` + botão no cabeçalho. |
| **Design responsivo** | Interface adaptada a telemóvel, tablet e desktop, com suporte a *dark mode* automático. |

## Arquitetura

```
┌─────────────────┐  código OTP  ┌───────────────┐   sessão   ┌──────────┐
│   Supabase Auth │ ◄─────────── │  Next.js 16   │ ─────────► │  Proxy   │
└─────────────────┘                │ (App Router)  │            │ (middleware)
        │                          └──────┬───┬────┘            └──────────┘
        │ PostgreSQL (profiles,          │   │
        │ courses, materials)            │   │ upload / download
        ▼                                ▼   ▼
  ┌─────────────────┐           ┌──────────────────┐
  │    Supabase DB  │           │  Supabase Storage │
  └─────────────────┘           │ (bucket "materials")
                                └──────────────────┘
```

- **Autenticação** — Supabase Auth com OTP por email.
  O proxy (`src/proxy.ts`) protege as rotas privadas e renova a sessão.
- **Armazenamento de ficheiros** — Os ficheiros são carregados para o bucket
  `materials` do Supabase Storage, em `<user_id>/<uuid>-<ficheiro>`. A base de
  dados guarda apenas metadados (`storage_path` + URL pública).
- **Fluxo de revisão** — `materials.review_status` ∈ `pending | approved | rejected`.
  Os uploads de estudantes entram como `pending`; os de administradores como
  `approved`. Só materiais aprovados (ou os teus, se ainda não o estiverem) são visíveis.
- **Pré-visualizações** — ficheiros de imagem são mostrados diretamente pela URL
  pública do bucket; os restantes tipos usam um fallback visual com a cor do tipo.

### Modelo de dados

```
profiles (id, role[STUDENT|ADMIN])
courses  (id, name, year, semester, created_at)
materials(id, course_id → courses, title, description,
          storage_path, web_url, file_name, review_status,
          uploaded_by → profiles, created_at)
```

O diagrama ER está em [`docs/er.drawio`](docs/er.drawio).

## Começar a desenvolver

Pré-requisitos: **Node.js 20+** e uma conta em **Supabase**.

```bash
cd src
npm install
cp .env.example .env.local   # preenche com as tuas credenciais
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anónima (pública) do Supabase. |

### Configuração do Supabase

1. Cria as tabelas `profiles`, `courses` e `materials` (ver `docs/er.drawio`).
2. Configura **Authentication → Email → Enable Email signup** e, em
   **Authentication → Emails → Templates → Magic Link**, substitui
   `{{ .ConfirmationURL }}` por `{{ .Token }}` — é isto que faz o Supabase
   enviar o código em vez de um *magic link* (o comprimento do código é
   configurável em **Authentication → Sign In / Providers → Email → Email OTP
   length**; o cliente aceita 6–10 dígitos).
3. Configura **Storage** (ficheiros dos materiais):
   - Cria o bucket `materials` com **public access** (Storage → New bucket);
   - Executa no **SQL Editor**:
     - [`supabase/migrations/20260807_switch_onedrive_to_supabase_storage.sql`](supabase/migrations/20260807_switch_onedrive_to_supabase_storage.sql)
       — cria o bucket, renomeia a coluna `onedrive_item_id` para `storage_path`
       e aplica as políticas RLS do storage (upload apenas para a pasta própria
       de cada utilizador; eliminação apenas por administradores);
     - [`supabase/migrations/20260807_add_materials_file_name.sql`](supabase/migrations/20260807_add_materials_file_name.sql)
       — adiciona a coluna `file_name` com o nome original do ficheiro
       (o nome no bucket é sanitizado porque o Supabase Storage só aceita
       caracteres S3-safe — acentos e espaços são substituídos).
4. Executa também
   [`supabase/migrations/20260807_rls_table_policies.sql`](supabase/migrations/20260807_rls_table_policies.sql)
   no **SQL Editor** — sem estas políticas RLS, os uploads falham com
   *"new row violates row-level security policy for table 'materials'"*:
   submissão de materiais para qualquer autenticado (sempre com
   `uploaded_by = auth.uid()`), escrita de UCs e revisão/eliminação de
   materiais apenas por administradores.

### Scripts

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção
npm run start        # servidor de produção
npm run lint         # ESLint
npm run format:check # Prettier (verificação)
npm run format:write # Prettier (correção automática)
```

A CI (GitHub Actions) corre lint + Prettier + build em cada push/PR.

## Estrutura do projeto

```
src/
├── app/
│   ├── (ui)/               # páginas com layout partilhado
│   │   ├── page.tsx        # landing page
│   │   ├── login/          # entrada com código OTP
│   │   ├── courses/        # catálogo de UCs + materiais
│   │   └── admin/          # painel de administração
│   └── api/
│       ├── auth/login      # POST — envia o código OTP por email
│       ├── auth/verify     # POST — valida o código e inicia a sessão
│       ├── auth/logout     # POST — termina a sessão
│       └── materials/      # upload, review, delete, thumbnail
├── components/             # Header, Footer, MaterialPreview…
├── lib/
│   ├── supabase/           # clientes server/browser + storage
│   ├── file-types.ts       # deteção de tipo de ficheiro
│   └── types.ts            # tipos partilhados
├── proxy.ts                # middleware (proteção de rotas + sessão)
└── .env.example
```

## Pontos fortes do projeto

- **Sem palavras-passe** — o código OTP enviado para o email
  institucional é simples, seguro e garante que só estudantes da UAlg entram.
- **Tudo dentro do Supabase** — autenticação, base de dados e ficheiros no mesmo
  projeto: menos serviços externos, uma única fonte de verdade.
- **Controlo de qualidade** — o fluxo de revisão evita spam e conteúdos
  inadequados antes de chegarem à comunidade.
- **Server components + route handlers** — dados sensíveis (roles, estados)
  são verificados no servidor; os clientes nunca recebem privilégios por omissão.
- **API protegida por sessão e por role** — aprovar/rejeitar/eliminar exige
  sessão válida *e* role `ADMIN` verificada no servidor.
- **Armazenamento seguro por políticas** — o upload é restrito à pasta própria
  de cada utilizador (RLS no `storage.objects`) e a eliminação é só de admins.
- **Pré-visualizações simples** — imagens servidas diretamente do bucket
  público, com fallback estilizado por tipo de ficheiro.
- **DX e qualidade** — TypeScript estrito, ESLint, Prettier e CI que valida
  lint + formatação + build em cada alteração.

## O que aprendemos

- **Supabase Storage na prática** — buckets públicos vs. privados, caminhos
  com prefixo do utilizador, políticas RLS no `storage.objects` e URLs públicas
  para pré-visualizações.
- **Autenticação sem palavras-passe** — OTP por email com Supabase
  (`signInWithOtp` + `verifyOtp`), com a sessão renovada no middleware.
- **App Router do Next.js (16)** — server/client components, route handlers,
  route groups (`(ui)`) e o novo middleware (`proxy.ts`).
- **Design systems com Tailwind v4** — tokens de cor derivados da identidade
  do NEEI, dark mode por `prefers-color-scheme` e responsividade mobile-first.
- **Segurança por defeito** — nunca confiar no cliente para autorização:
  cada rota sensível valida a sessão e o role no servidor.

## Deploy no Vercel

Guia passo-a-passo completo em **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**.
Resumo:

```bash
git push origin main   # 1. sobe o código
vercel deploy          # 2. ou importa o repo em vercel.com
```

3. Define as variáveis de ambiente em **Project → Settings → Environment Variables**.
4. Em **Authentication → Emails → Templates → Magic Link**, substitui
   `{{ .ConfirmationURL }}` por `{{ .Token }}` para o Supabase enviar o código
   de acesso (sem isto, o email continua a conter um link em vez do código).
5. `vercel --prod`

> O repositório está em `src/` — na Vercel, escolhe **Root Directory: `src`**.

## Ideias futuras

- Estatísticas de downloads e materiais mais populares
- Perfil do estudante com o histórico das suas submissões
- Notificação por email aos administradores quando há novos pendentes
- Filtros avançados (palavras-chave, autor, formato de ficheiro)

## Licença

MIT — ver [`LICENSE`](LICENSE).
