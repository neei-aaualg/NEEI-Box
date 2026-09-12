# Deploy do NEEI-Box em produção (Coolify)

Guia de deploy da arquitetura **auto-hospedada** atual. O NEEI-Box corre numa
única imagem Docker gerida pelo [Coolify](https://coolify.io): UI, API, base de
dados (PostgreSQL), ficheiros (volume) e envio de emails (SMTP) — sem serviços
SaaS externos.

> Guia curto e operacional: [`COOLIFY.md`](../COOLIFY.md).

---

## 1. Visão geral do deploy

```
git push/PR → GitHub Actions (format · lint · build) → Coolify (build + deploy)
                                                             │
                HEALTHCHECK (30s) ──► GET /api/health ─────────┘
```

- O Dockerfile é **multi-stage** (`node:22-alpine`), com `output: 'standalone'`
  e o binário **Prisma incluído** na imagem final (para `prisma db push`).
- No arranque, se `DATABASE_URL` estiver definida, a app corre
  `prisma db push --skip-generate` — as tabelas (`profiles`, `courses`,
  `materials`, `sessions`, `otp_tokens`) são criadas/sincronizadas sozinhas.
- O Docker `HEALTHCHECK` (30s/5s×10/3 retries) valida `GET /api/health`.

---

## 2. Criar a base de dados PostgreSQL

No Coolify, Project → **+ New Resource → Database → PostgreSQL**:

1. Dá-lhe um nome (ex. `neei-box-db`) e clica **Start/Deploy**.
2. Copia a **Internal Connection String**, ex.:
   `postgresql://postgres:password@neei-box-db:5432/postgres?schema=public`
   — vais usá-la em `DATABASE_URL`.

---

## 3. Configurar o volume persistente (uploads)

Na aplicação NEEI-Box no Coolify → **Storages / Persistent Storage**:

- **Name:** `neei-box-uploads`
- **Destination Path:** `/app/uploads`

Garante que os ficheiros partilhados sobrevivem a reinícios e atualizações.

---

## 4. Variáveis de ambiente

Configura no Coolify (Environment Variables):

```env
# Base de dados
DATABASE_URL=postgresql://postgres:password@neei-box-db:5432/postgres?schema=public

# Armazenamento local e limites
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE_MB=50
MAX_STORAGE_LIMIT_GB=8

# Envio dos códigos OTP
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=seu-email@dominio.com
SMTP_PASS=sua-password-ou-app-token
SMTP_FROM="NEEI-Box <no-reply@neei.online>"

# Administradores iniciais (emails separados por vírgula)
ADMIN_EMAILS="a79994@ualg.pt"
```

> As antigas `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> **já não existem** no projeto — podem ser removidas.

---

## 5. Deploy e health-check

1. No Coolify, liga o repositório GitHub e escolhe o branch `main`.
2. Clica **Deploy** — o Coolify compila o Dockerfile e arranca o contentor.
3. Verifica:
   - `GET <dominio>/api/health` → `{"status":"ok",...}`;
   - o login com `aXXXXX@ualg.pt` envia o código OTP e entra;
   - o upload de um ficheiro aparece em `/admin` e, após aprovação, fica visível.

---

## 6. Manutenção

- **Schema:** `prisma db push` automático no arranque; também disponível no
  terminal do contentor (`npx prisma db push`).
- **Backups:** agenda backups da BD (Coolify → Base de dados) e do volume
  `neei-box-uploads`.
- **Config da imagem:** `docker compose`/`deploy` do Coolify usa o `Dockerfile`
  da raiz — alterações de runtime vivem nas env vars acima.

## 7. Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| API devolve `401` em tudo | `DATABASE_URL` errada ou BD sem tabelas | Confirma a *internal connection string* e que `prisma db push` correu |
| Login sem receber email | SMTP ausente/errado | Configura `SMTP_*`; sem SMTP, o código sai no log (`[AUTH-DEV]`) |
| Upload devolve `413`/`507` | Ficheiro >50 MB ou volume cheio (8 GB) | Reduz o ficheiro ou aumenta o limite |
| Aplicação reinicia com dados apagados | Volume não montado | Cria *persistent storage* `/app/uploads` |

---

Cobertura completa de decisões e diagramas: [`README.md`](../README.md).