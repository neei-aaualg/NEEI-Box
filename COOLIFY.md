# Deploy do NEEI-Box no Coolify (Arquitetura Auto-Hospedada)

O **NEEI-Box** funciona agora de forma 100% autónoma e auto-hospedada, sem qualquer dependência do Supabase:
- **Base de Dados**: PostgreSQL gerido nativamente no Coolify.
- **Autenticação**: Códigos OTP enviados por email institucional via SMTP e sessões seguras em cookies HTTP-Only.
- **Armazenamento de Ficheiros**: Volume persistente Docker montado em `/app/uploads` com rota de streaming ultra-rápida.

---

## 1. Criar a Base de Dados PostgreSQL no Coolify

1. No seu Projeto no Coolify, clique em **+ New Resource** e selecione **Database → PostgreSQL**.
2. Dê um nome ao serviço (ex: `neei-box-db`).
3. Clique em **Start / Deploy**.
4. Aceda ao separador da base de dados e copie a **Internal Connection String** (ex: `postgresql://postgres:password@neei-box-db:5432/postgres?schema=public`).

---

## 2. Configurar o Volume Persistente para Uploads

Para garantir que os materiais partilhados não se perdem ao reiniciar ou atualizar o contentor:

1. Na aplicação NEEI-Box no Coolify, vá a **Storages / Persistent Storage**.
2. Clique em **+ Add Persistent Storage**:
   - **Name**: `neei-box-uploads`
   - **Destination Path**: `/app/uploads`
3. Guarde a alteração.

---

## 3. Variáveis de Ambiente

No separador **Environment Variables** da aplicação no Coolify, configure:

```env
# 1. Ligação à Base de Dados PostgreSQL
DATABASE_URL=postgresql://postgres:sua-password@neei-box-db:5432/postgres?schema=public

# 2. Caminho de Armazenamento no Contentor
UPLOAD_DIR=/app/uploads

# 3. Servidor de Email SMTP (para envio de códigos de acesso OTP aos estudantes)
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=seu-email@dominio.com
SMTP_PASS=sua-password-ou-app-token
SMTP_FROM="NEEI-Box <no-reply@neei.online>"

# 4. Administradores da Plataforma (emails separados por vírgula)
ADMIN_EMAILS="a79994@ualg.pt"
```

> [!TIP]
> Já **não** são necessárias as variáveis antigas `NEXT_PUBLIC_SUPABASE_URL` nem `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Pode removê-las no Coolify.

---

## 4. Inicialização das Tabelas da Base de Dados

Após o primeiro deploy com sucesso:
1. No Coolify, abra o separador **Terminal** da aplicação.
2. Execute o comando:
   ```bash
   npx prisma db push
   ```
   Isto criará automaticamente as tabelas `profiles`, `courses`, `materials`, `sessions` e `otp_tokens` na base de dados PostgreSQL.

---

## 5. Deploy

1. Clique em **Deploy**.
2. O Coolify compilará o Dockerfile com Prisma e colocará a aplicação online no domínio configurado (ex: `box.neei.online`).
