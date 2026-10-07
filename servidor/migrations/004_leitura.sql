-- Fase 2 (07/10/2026): leitura dos anexos no servidor. Uma linha por anexo do Trello; o mesmo arquivo (hash)
-- não é lido duas vezes. `versao_leitor` muda quando os leitores mudam — aí a leitura é refeita.
CREATE TABLE IF NOT EXISTS anexo_leitura (
  anexo_id       text PRIMARY KEY,
  card_id        text NOT NULL,
  nome           text,
  bytes          integer,
  hash           text,
  tipo           text,                 -- pdf | imagem | outro
  metodo         text,                 -- pdftotext | tesseract | nenhum
  versao_texto   text,                 -- layout | simples | ocr (a que rendeu mais)
  texto          text,                 -- o texto escolhido (para conferência e para refazer a leitura sem baixar de novo)
  leitura        jsonb,                -- resultado: placas, chassi, modelo, orçamento, peças oficina/FO, documento FO
  versao_leitor  integer NOT NULL,
  ms             integer,              -- tempo gasto
  erro           text,
  lido_em        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS anexo_leitura_card ON anexo_leitura (card_id);
CREATE INDEX IF NOT EXISTS anexo_leitura_hash ON anexo_leitura (hash);
