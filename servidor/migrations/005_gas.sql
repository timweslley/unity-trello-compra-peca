-- Fase 3 (07/10/2026): o código do formulário (Apps Script) roda no servidor com os serviços do Google imitados.
-- O que no Google ficava em Propriedades do Script, na planilha de backup e no Drive (arquivos temporários) fica aqui.

-- PropertiesService.getScriptProperties()
CREATE TABLE IF NOT EXISTS gas_propriedade (
  chave       text PRIMARY KEY,
  valor       text NOT NULL,
  alterada_em timestamptz NOT NULL DEFAULT now()
);

-- SpreadsheetApp: a planilha do robô vista pelo código do formulário (abas TRAVA, EVENTOS, FORNECEDORES, CHECKLISTS…).
-- Cada linha da aba é um array JSON de células; datas vão como {"$d": "ISO"}. A primeira cópia vem da planilha real.
CREATE TABLE IF NOT EXISTS gas_aba (
  nome        text PRIMARY KEY,
  posicao     integer NOT NULL DEFAULT 0,
  copiada_de  text,                        -- id da planilha real de onde veio a primeira cópia (ou NULL: nasceu aqui)
  criada_em   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gas_linha (
  aba     text NOT NULL REFERENCES gas_aba (nome) ON DELETE CASCADE,
  linha   integer NOT NULL,                -- 1 = cabeçalho, como na planilha
  valores jsonb NOT NULL,
  PRIMARY KEY (aba, linha)
);

-- DriveApp / Drive: arquivos temporários (upload do formulário) e documentos de OCR
CREATE TABLE IF NOT EXISTS gas_arquivo (
  id          text PRIMARY KEY,
  nome        text,
  tipo        text,
  dados       bytea,
  texto       text,                         -- documento de OCR (Drive.Files.create com mimeType de Google Docs)
  pasta       text,
  lixeira     boolean NOT NULL DEFAULT false,
  criado_em   timestamptz NOT NULL DEFAULT now()
);
