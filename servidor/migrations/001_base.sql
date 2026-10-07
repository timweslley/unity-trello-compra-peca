-- Fase 0 (07/10/2026): base do servidor. As tabelas de domínio (peça, cotação, compra…) entram na fase 1,
-- junto com a importação — aqui fica o que a fase 0 precisa: configuração, usuários e o espelho cru do Trello.

-- parâmetros (seção 10 da especificação): VD_COMPRADORES, SLA_DIAS_COTAR, …
CREATE TABLE IF NOT EXISTS config (
  chave        text PRIMARY KEY,
  valor        text NOT NULL,
  descricao    text,
  alterado_em  timestamptz NOT NULL DEFAULT now(),
  alterado_por text
);

-- pessoas: login Google (e-mail unitycs.com.br) + username do Trello (para a convivência) + papéis
CREATE TABLE IF NOT EXISTS usuario (
  id             serial PRIMARY KEY,
  email          text UNIQUE NOT NULL,
  nome           text,
  trello_username text UNIQUE,
  trello_id      text UNIQUE,
  papeis         text[] NOT NULL DEFAULT '{}',   -- consultor | comprador | diretoria | financeiro | admin
  unidade        text,                            -- TOLEDO | RONDON | CASCAVEL | MOURÃO
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- toda ação recebida do Trello (webhook) ou lida na varredura: histórico cru, nunca apagado
CREATE TABLE IF NOT EXISTS trello_acao (
  id          text PRIMARY KEY,                 -- id da ação no Trello
  quadro      text NOT NULL,
  tipo        text NOT NULL,                    -- updateCard, commentCard, …
  card_id     text,
  membro_id   text,
  membro_user text,
  data        timestamptz NOT NULL,
  origem      text NOT NULL,                    -- webhook | varredura | importacao
  recebida_em timestamptz NOT NULL DEFAULT now(),
  processada_em timestamptz,
  corpo       jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS trello_acao_card ON trello_acao (card_id, data DESC);
CREATE INDEX IF NOT EXISTS trello_acao_pend ON trello_acao (recebida_em) WHERE processada_em IS NULL;

-- retrato atual de cada card do quadro (o que o Trello tem agora): base para a fase 1 montar o domínio
CREATE TABLE IF NOT EXISTS trello_card (
  id             text PRIMARY KEY,
  quadro         text NOT NULL,
  short_link     text UNIQUE,
  nome           text NOT NULL,
  lista_id       text,
  lista_nome     text,
  desc_trello    text,                          -- o que está no Trello (vitrine)
  desc_completa  text,                          -- a oficial (aba TRAVA / gerada pelo servidor)
  due            timestamptz,
  fechado        boolean NOT NULL DEFAULT false,
  etiquetas      jsonb NOT NULL DEFAULT '[]',
  checklists     jsonb NOT NULL DEFAULT '[]',
  anexos         jsonb NOT NULL DEFAULT '[]',
  campos         jsonb NOT NULL DEFAULT '{}',   -- campos personalizados
  criado_por     text,
  ultima_atividade timestamptz,
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trello_card_lista ON trello_card (quadro, lista_nome);

-- histórico analítico (= aba EVENTOS da planilha)
CREATE TABLE IF NOT EXISTS evento (
  id          bigserial PRIMARY KEY,
  quando      timestamptz NOT NULL DEFAULT now(),
  evento      text NOT NULL,                    -- PEDIDO, COTAÇÃO, AUTORIZAÇÃO, COMPRA, RECEBIMENTO, …
  card_id     text,
  short_link  text,
  placa       text,
  unidade     text,
  tipo_pedido text,
  peca        text,
  particular  boolean,
  fornecedor  text,
  valor       numeric(12,2),
  prazo_du    integer,
  previsao    date,
  usuario     text,
  detalhe     text,
  quadro      text
);
CREATE INDEX IF NOT EXISTS evento_card ON evento (card_id, quando DESC);
CREATE INDEX IF NOT EXISTS evento_tipo ON evento (evento, quando DESC);

-- registro dos webhooks criados no Trello (para não duplicar e para recriar se sumirem)
CREATE TABLE IF NOT EXISTS trello_webhook (
  id          text PRIMARY KEY,
  quadro      text NOT NULL,
  url         text NOT NULL,
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now()
);
