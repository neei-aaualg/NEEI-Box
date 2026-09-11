---
description: Executa o projeto NEEI-Box localmente e valida a disponibilidade do servidor
---

# Workflow: Executar NEEI-Box Localmente

Este workflow automatiza o arranque do servidor de desenvolvimento local do NEEI-Box e a validação do seu estado.

## Procedimento:

1. **Verificar se a porta 3000 já está em uso**:
   - Verificar se já existe um processo ativo a escutar em `http://localhost:3000/api/health`.

2. **Iniciar o Servidor Next.js**:
   - Executar o comando `npm run dev` na pasta `src/` (ou diretamente na raiz com `npm run dev` ou `.\dev.bat` / `.\dev.ps1`).
   - O servidor iniciará em `http://localhost:3000`.

3. **Validação**:
   - Testar o endpoint `GET http://localhost:3000/api/health` para confirmar que a aplicação está pronta a responder.
   - Confirmar o acesso à rota principal `http://localhost:3000` e ao painel de administração `http://localhost:3000/admin`.
