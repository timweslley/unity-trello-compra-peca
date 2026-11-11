-- 11/11/2026 (ATV4G70): licenças das travas (st_ok_ coluna, ck_ checklist, tr_rec_) ficavam só na memória de cada processo.
-- Num deploy, duas instâncias do Cloud Run rodam ao mesmo tempo: a compra registrada numa (licença lá) foi julgada "à mão"
-- pelo robô da outra, que desfez o movimento e APAGOU o checklist PAGAS. Agora a licença vive aqui, compartilhada.
CREATE TABLE IF NOT EXISTS licenca (
  chave text PRIMARY KEY,
  valor text NOT NULL,
  ate   timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS licenca_ate ON licenca (ate);
