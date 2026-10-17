-- 16/10/2026: texto de cada arquivo (por hash) — o MESMO do robô (OCR do Google pelo Apps Script) ou, na falta, o local
CREATE TABLE IF NOT EXISTS ocr_texto (
  hash text PRIMARY KEY,
  fonte text NOT NULL,          -- 'google' | 'local'
  texto text NOT NULL,
  ms integer,
  em timestamptz NOT NULL DEFAULT now()
);
