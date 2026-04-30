# Dashboard Antilhas — Setup com Neon + Netlify Functions

Stack: HTML estático + Netlify Functions (Node.js) + Neon (Postgres).
Todos da Antilhas vêem os mesmos dados, sem login.

## O que está nessa pasta

```
neon_deploy/
├── index.html              ← dashboard (frontend)
├── package.json            ← dependências do backend
├── netlify.toml            ← configuração do Netlify
├── schema.sql              ← SQL para criar tabelas no Neon
├── README.md               ← este arquivo
└── netlify/
    └── functions/
        ├── _db.js          ← helper compartilhado
        ├── upload.js       ← recebe Excel e salva no DB
        ├── list-files.js   ← lista arquivos do histórico
        ├── delete-file.js  ← exclui um arquivo
        ├── download-file.js← baixa arquivo limpo
        ├── get-data.js     ← retorna dados pro dashboard
        ├── get-machines.js ← lista máquinas cadastradas
        └── save-machine.js ← salva/atualiza uma máquina
```

---

## Passo a passo

### 1. Criar banco no Neon

1. Acesse https://neon.tech e crie uma conta (grátis)
2. Clique em **Create Project**
3. Escolha região: **AWS · sa-east-1 (São Paulo)** (latência menor pro Brasil)
4. Nome do projeto: `antilhas-dashboard`
5. Copie a **Connection String** que aparece — algo como:
   ```
   postgresql://usuario:senha@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
   ```
   **Guarde essa string em segurança.**

### 2. Criar as tabelas

1. Ainda no Neon, vá em **SQL Editor** (menu lateral)
2. Cole todo o conteúdo de `schema.sql` na janela do editor
3. Clique em **Run**
4. Verifique no **Tables** que existem 3 tabelas: `arquivos`, `ops`, `maquinas`

### 3. Subir o código pro GitHub

1. No seu repositório do GitHub onde já está o dashboard, **substitua tudo** pelo conteúdo desta pasta `neon_deploy/`
2. Commits importantes pra subir:
   - `index.html` (substitui o antigo)
   - `package.json` (novo)
   - `netlify.toml` (novo)
   - `netlify/functions/*.js` (novos)
   - `schema.sql` (já rodou no Neon, mas é bom guardar no repo pra histórico)

   Você pode subir tudo via interface web ou via Git CLI:
   ```bash
   git add .
   git commit -m "migração para Neon + Netlify Functions"
   git push
   ```

### 4. Configurar Netlify

1. Vá no seu site no painel do Netlify
2. **Site configuration** → **Environment variables**
3. Clique em **Add a variable** → **Add a single variable**
4. Adicione:
   - **Key**: `DATABASE_URL`
   - **Value**: a connection string do Neon (do passo 1)
   - **Scopes**: deixe em "Same value for all deploy contexts"
5. Salvar

### 5. Trigger novo deploy

1. **Deploys** → **Trigger deploy** → **Deploy site**
2. Aguardar build (uns 1-2 minutos)
3. Verificar logs — se aparecer erro de "build failed", clique pra ver o motivo

### 6. Testar

1. Abrir o site
2. Ir em **Upload** → enviar uma planilha
3. No console do navegador (F12) você deve ver:
   ```
   [Upload] Enviando: 28.04.xlsx (...)
   [Upload] Sucesso: { id: ..., arquivoData: '2026-04-28', ... }
   ```
4. Os dados devem aparecer nos KPIs e na Sequência 48h

---

## Solução de problemas

### "DATABASE_URL não configurada"
Você esqueceu de configurar a variável de ambiente no Netlify (passo 4).

### Build falha com erro de package
Verifique que `package.json` está na raiz do repo (mesmo nível do `index.html`).

### Upload muito grande estoura limite
Netlify Functions têm limite de 6MB no payload. Se sua planilha for maior:
- Verifique se está bem grande mesmo (a maioria é < 1MB)
- Se for um caso real, me avise pra implementar upload em chunks

### Mudei o schema, como atualizar?
Rode o novo SQL no SQL Editor do Neon. Se for mudança destrutiva (drop column),
faça backup primeiro com `pg_dump` ou export via interface do Neon.

### Quero limpar todos os dados pra testar do zero
No SQL Editor do Neon:
```sql
TRUNCATE arquivos, ops, maquinas RESTART IDENTITY CASCADE;
```

---

## Custos

Plano grátis cobre o uso normal:

- **Neon Free**: 0.5 GB storage, 190h compute/mês — sobra
- **Netlify Free**: 125k function invocations/mês, 100GB bandwidth/mês — sobra
- **Total**: R$ 0/mês

Se a empresa começar a crescer (10+ usuários simultâneos sempre), aí pode pagar pra ter mais compute, mas não é o caso agora.

---

## Backup

Pra exportar tudo do Neon:
- Interface: **Settings** → **Export** → exporta SQL
- CLI: `pg_dump $DATABASE_URL > backup.sql`
