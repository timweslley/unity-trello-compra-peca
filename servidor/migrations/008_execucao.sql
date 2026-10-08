-- 08/10/2026: registro de cada ação do formulário no banco (antes ficava só na memória e sumia quando o Cloud Run
-- desligava a máquina) — para medir de verdade a leitura do principal pelo servidor e a velocidade de cada ação.
CREATE TABLE IF NOT EXISTS execucao (
  id        bigserial PRIMARY KEY,
  quando    timestamptz NOT NULL DEFAULT now(),
  quadro    text,
  fn        text,
  ms        integer,
  fila_ms   integer,
  ok        boolean,
  erro      text,
  frio      boolean,             -- a máquina/trabalhador acabou de ligar (partida a frio)
  rede      jsonb                -- chamadas por destino: {"GET api.trello.com/1/cards": {"n":3,"ms":600}, ...}
);
CREATE INDEX IF NOT EXISTS execucao_quando ON execucao (quando DESC);
