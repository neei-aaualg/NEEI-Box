# ☁️ Guia de Deploy no Vercel

Este guia descreve, passo a passo, como colocar o **NEEI-Box** em produção na
[Vercel](https://vercel.com), o serviço onde o Next.js corre nativamente.

> **Nota importante:** o código da aplicação está dentro de `src/`. Em todos
> os passos abaixo em que a Vercel pede a *Root Directory*, escolhe `src`.

---

## 0. Pré-requisitos

- Uma conta na [Vercel](https://vercel.com/signup) (pode ser com GitHub).
- O código do projeto num repositório Git (GitHub, GitLab ou Bitbucket).
- O projeto **Supabase** configurado (tabelas, auth por email e Storage —
  ver [README → Configuração do Supabase](../README.md#configuração-do-supabase)).

---

## 1. Importar o repositório

**Opção A — Dashboard (recomendada)**

1. Vai a [vercel.com/new](https://vercel.com/new) e inicia sessão.
2. Clica em **Import Project** e seleciona o repositório do NEEI-Box.
3. A Vercel deteta automaticamente o framework **Next.js**.

**Opção B — CLI**

```bash
npm i -g vercel
cd src
vercel deploy
```

Na primeira execução, a CLI liga-te à conta e pede-te o *scope* do projeto.

---

## 2. Configurar o projeto

Durante o *import*, a Vercel faz um *build* de pré-visualização. Configura
isto antes do primeiro deploy de produção:

| Definição | Valor |
| --- | --- |
| **Framework Preset** | Next.js (automático) |
| **Root Directory** | `src` |
| **Build Command** | `npm run build` (automático) |
| **Install Command** | `npm install` (automático) |
| **Output Directory** | `.next` (automático) |

> Se o repo raiz contiver `.gitignore` a ignorar `.env*`, garante que o
> `.env.local` **não** é enviado para o Git (o `.gitignore` já o impede).

---

## 3. Variáveis de ambiente

Vai a **Project → Settings → Environment Variables** e adiciona **todas** as
variáveis do `.env.example`, nos ambientes *Production*, *Preview* e
*Development*:

| Nome | Exemplo |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abcdefg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` |

⚠️ A chave `NEXT_PUBLIC_SUPABASE_ANON_KEY` é pública por definição — está no
código do cliente. O acesso real aos dados é limitado pelas políticas RLS do
Supabase.

---

## 4. Deploy

Depois de guardar as variáveis:

```bash
vercel --prod
```

ou, no dashboard, **Deploy → Production**. Cada `git push` para a branch de
produção volta a disparar o deploy automaticamente.

---

## 5. Configurar o Supabase para produção

1. Vai ao projeto Supabase → **Authentication → URL Configuration**.
2. Adiciona o *Redirect URL*:
   `https://<o-teu-dominio>.vercel.app/api/auth/callback`
3. (Opcional) Se usares domínio próprio, adiciona também
   `https://www.<o-teu-dominio>/api/auth/callback`.

> Sem isto, o *magic link* do email aponta para o `localhost` e o login falha.

O armazenamento de ficheiros (bucket `materials` e políticas RLS) não depende
do domínio — configura-o uma única vez como descrito no README.

---

## 6. Verificar

Abre `https://<o-teu-dominio>.vercel.app` e confirma:

1. ✅ A landing page carrega e é responsiva.
2. ✅ O login com `aXXXXX@ualg.pt` envia o email e o link funciona.
3. ✅ As unidades curriculares e os materiais aprovados aparecem.
4. ✅ O painel `/admin` só abre para contas com role `ADMIN`.
5. ✅ O upload de um ficheiro aparece em `/admin` e, depois de aprovado, fica
   disponível com a pré-visualização (imagens).

---

## 7. Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| Login não conclui após clicar no email | Redirect URL errado no Supabase | Atualiza o *Redirect URL* (passo 5) |
| Build falha com `NEXT_PUBLIC_*` em falta | Variáveis públicas ausentes | Garante `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Upload devolve "Falha ao guardar o ficheiro" | Políticas do bucket em falta ou bucket não público | Executa o SQL da migração (README → Configuração do Supabase) |
| Eliminar material não apaga o ficheiro | Role `ADMIN` não definido no perfil | Atualiza `profiles.role` para `ADMIN` na tabela |
| Erros de *deploy* no GitHub Actions | — | A CI corre apenas no repo; o deploy usa a Vercel |
| Funções com *timeout* no upload | Ficheiros grandes (25 MB+) | O limite atual é 25 MB por ficheiro |

---

## 8. Domínio próprio (opcional)

1. Vercel → **Project → Settings → Domains** → **Add**.
2. Adiciona o domínio e segue as instruções de DNS (registo `A` ou `CNAME`).
3. Repete o passo 5 com o novo domínio.

---

Feito ✅. Qualquer questão adicional, consulta a

[documentação de deploy do Next.js](https://nextjs.org/docs/app/building-your-application/deploying).
