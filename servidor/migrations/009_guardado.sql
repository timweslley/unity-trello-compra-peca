-- 10/10/2026: valores pequenos que o servidor guarda entre reinícios (ex.: Propriedades do robô do principal)
CREATE TABLE IF NOT EXISTS guardado (
  nome text PRIMARY KEY,
  valor jsonb NOT NULL,
  em timestamptz NOT NULL DEFAULT now()
);
