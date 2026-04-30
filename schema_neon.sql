-- ============================================================
-- Schema do dashboard Sequência Fixa 48h - Antilhas
-- Rodar uma vez no Neon (SQL Editor) após criar o banco
-- ============================================================

-- Tabela de arquivos enviados (Excel originais em binário)
CREATE TABLE IF NOT EXISTS arquivos (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  tipo        TEXT DEFAULT 'Programação',
  arquivo_data DATE NOT NULL,                 -- data do arquivo (extraída do nome)
  tamanho     INT NOT NULL,
  buffer      BYTEA NOT NULL,                  -- conteúdo do .xlsx
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arquivos_data ON arquivos(arquivo_data);

-- OPs extraídas de cada arquivo
CREATE TABLE IF NOT EXISTS ops (
  id            SERIAL PRIMARY KEY,
  arquivo_id    INT REFERENCES arquivos(id) ON DELETE CASCADE,
  arquivo_data  DATE NOT NULL,                 -- redundante mas facilita queries
  data_dia      DATE NOT NULL,                 -- dia em que a OP roda
  recurso       TEXT NOT NULL,
  op            TEXT NOT NULL,
  ordem         INT NOT NULL,                  -- posição da linha na planilha
  codigo        TEXT,
  produto       TEXT,
  qtd           NUMERIC,
  ini           TIMESTAMP,
  fim           TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ops_arquivo ON ops(arquivo_id);
CREATE INDEX IF NOT EXISTS idx_ops_data ON ops(arquivo_data, data_dia);
CREATE INDEX IF NOT EXISTS idx_ops_recurso ON ops(recurso);

-- Cadastro de máquinas (Nome / Grupo / Tipo)
CREATE TABLE IF NOT EXISTS maquinas (
  nome     TEXT PRIMARY KEY,
  exibido  TEXT DEFAULT '',
  grupo    TEXT DEFAULT '',
  tipo     TEXT DEFAULT ''
);

-- ============================================================
-- Verificar que tudo foi criado:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- ============================================================
