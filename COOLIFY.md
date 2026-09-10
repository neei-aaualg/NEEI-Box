# Deploy do NEEI-Box no Coolify

Este guia explica como colocar o **NEEI-Box** em produção no **Coolify** utilizando o `Dockerfile` otimizado em modo `standalone`.

---

## 1. Adicionar o Projeto no Coolify

1. No painel do Coolify, aceda ao seu **Project / Environment**.
2. Clique em **+ New Resource** e selecione **Git Repository**.
3. Escolha a sua conta GitHub e o repositório `neei-aaualg/NEEI-Box`.
4. Selecione o branch pretendido (`main` ou o branch de teste).
5. O Coolify deteta automaticamente o `Dockerfile` na raiz do repositório.

---

## 2. Configurações Principais da Aplicação

No separador **General / Configuration**:

| Parâmetro | Valor | Notas |
| :--- | :--- | :--- |
| **Build Pack** | `Dockerfile` | Detetado automaticamente através do `Dockerfile` na raiz |
| **Base Directory** | `/` | Manter a raiz (o Dockerfile copia os ficheiros de `src/`) |
| **Dockerfile Path** | `/Dockerfile` | Ficheiro na raiz |
| **Port / Ports Exposes** | `3000` | Porta onde o Next.js escuta |
| **Healthcheck Path** | `/api/health` | Rota pública sem autenticação para validação de saúde do contentor |

---

## 3. Variáveis de Ambiente (**Crucial**)

Aceda ao separador **Environment Variables** da aplicação no Coolify.

Adicione as seguintes variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-publica
```

> [!IMPORTANT]
> **Muito Importante (Build Variable)**:
> No Next.js, as variáveis que começam por `NEXT_PUBLIC_` são embutidas no código JavaScript do cliente durante o comando `npm run build`.
> 
> No painel de variáveis de ambiente do Coolify, certifique-se de marcar a opção:
> - **Available during build** (ou **Build Variable**) para ambas as variáveis `NEXT_PUBLIC_*`.

---

## 4. Domínio e SSL

1. No campo **Domains**, insira o domínio ou subdomínio público pretendido (ex: `https://box.neei.uevora.pt` ou `https://box.neei.pt`).
2. O Coolify (via Traefik) gerará automaticamente os certificados SSL Let's Encrypt para o domínio configurado.

---

## 5. Deploy

1. Clique em **Deploy** no canto superior direito do Coolify.
2. Acompanhe os logs de build:
   - Instalação limpa via `npm ci`
   - Compilação Next.js (`npm run build`) gerando o bundle `.next/standalone`
   - Inicialização do servidor `node server.js`
   - Validação da rota de healthcheck `/api/health`
3. A sua aplicação estará pronta e disponível no domínio configurado!
