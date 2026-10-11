/**
 * Banco do módulo Cilia: área própria (schema `cilia`) no mesmo Postgres do servidor, sem tocar nas tabelas da
 * outra sessão. Fonte única para rotinas e, no futuro, para o sistema interno.
 */
import pg from 'pg';

let pool = null;
export function banco() {
  if (!pool) {
    const url = (process.env.DATABASE_URL || '').trim();
    if (!url || /^PREENCHER$/i.test(url)) throw new Error('DATABASE_URL não configurada');
    pool = new pg.Pool({ connectionString: url, max: 3, ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined });
  }
  return pool;
}
export const sql = (texto, params = []) => banco().query(texto, params).then((r) => r.rows);
export const fechar = () => (pool ? pool.end() : undefined);

export async function preparar() {
  await sql(`CREATE SCHEMA IF NOT EXISTS cilia`);
  await sql(`
    CREATE TABLE IF NOT EXISTS cilia.orcamento (
      casa text NOT NULL,
      budget_id bigint NOT NULL,
      placa text, veiculo text, seguradora text, sinistro text,
      orcamento bigint, versao int, numero_versao text, tipo_versao text,
      status text, status_texto text, status_data text,
      conclusao text, conclusao_chave text, criado_em text, oficina text, responsavel text,
      assinatura text NOT NULL,
      assinatura_detalhe text,          -- assinatura da última vez que o detalhe foi baixado
      visto_em timestamptz NOT NULL DEFAULT now(),
      atualizado_em timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (casa, budget_id)
    )`);
  await sql(`
    CREATE TABLE IF NOT EXISTS cilia.versao (
      casa text NOT NULL,
      budget_id bigint NOT NULL,
      numero_versao text NOT NULL,
      tipo_versao text,
      status text,
      conclusao jsonb,
      totais jsonb,
      pecas jsonb,
      detalhe jsonb,                    -- resposta da API sem os arquivos em base64
      pdf_drive_id text,
      pdf_nome text,
      baixado_em timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (casa, budget_id, numero_versao)
    )`);
  await sql(`
    CREATE TABLE IF NOT EXISTS cilia.execucao (
      id bigserial PRIMARY KEY,
      inicio timestamptz NOT NULL DEFAULT now(),
      fim timestamptz,
      chamadas int, detalhes int, pdfs int,
      resumo jsonb
    )`);
  await sql(`CREATE INDEX IF NOT EXISTS orcamento_placa ON cilia.orcamento (placa)`);
}

export async function lerOrcamentos(casa) {
  const linhas = await sql(`SELECT * FROM cilia.orcamento WHERE casa = $1`, [casa]);
  return new Map(linhas.map((l) => [String(l.budget_id), l]));
}

const COLS = ['placa', 'veiculo', 'seguradora', 'sinistro', 'orcamento', 'versao', 'numero_versao', 'tipo_versao',
  'status', 'status_texto', 'status_data', 'conclusao', 'conclusao_chave', 'criado_em', 'oficina', 'responsavel'];

export async function gravarOrcamento(casa, r, assinatura) {
  const vals = COLS.map((c) => r[c] ?? null);
  await sql(`
    INSERT INTO cilia.orcamento (casa, budget_id, ${COLS.join(', ')}, assinatura)
    VALUES ($1, $2, ${COLS.map((_, i) => '$' + (i + 3)).join(', ')}, $${COLS.length + 3})
    ON CONFLICT (casa, budget_id) DO UPDATE SET
      ${COLS.map((c) => `${c} = EXCLUDED.${c}`).join(', ')},
      atualizado_em = CASE WHEN cilia.orcamento.assinatura IS DISTINCT FROM EXCLUDED.assinatura THEN now() ELSE cilia.orcamento.atualizado_em END,
      assinatura = EXCLUDED.assinatura,
      visto_em = now()`, [casa, r.budget_id, ...vals, assinatura]);
}

export async function gravarVersao(casa, r, d, { pecas, pdfId, pdfNome }) {
  await sql(`
    INSERT INTO cilia.versao (casa, budget_id, numero_versao, tipo_versao, status, conclusao, totais, pecas, detalhe, pdf_drive_id, pdf_nome)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (casa, budget_id, numero_versao) DO UPDATE SET
      tipo_versao = EXCLUDED.tipo_versao, status = EXCLUDED.status, conclusao = EXCLUDED.conclusao,
      totais = EXCLUDED.totais, pecas = EXCLUDED.pecas, detalhe = EXCLUDED.detalhe,
      pdf_drive_id = COALESCE(EXCLUDED.pdf_drive_id, cilia.versao.pdf_drive_id),
      pdf_nome = COALESCE(EXCLUDED.pdf_nome, cilia.versao.pdf_nome),
      baixado_em = now()`,
  [casa, r.budget_id, r.numero_versao || String(r.versao ?? ''), r.tipo_versao, r.status,
    JSON.stringify(d?.conclusion ?? null), JSON.stringify(d?.totals_version ?? d?.totals ?? null),
    JSON.stringify(pecas ?? []), JSON.stringify(d ?? null), pdfId ?? null, pdfNome ?? null]);
}

export async function marcarDetalhe(casa, budgetId, assinatura) {
  await sql(`UPDATE cilia.orcamento SET assinatura_detalhe = $3 WHERE casa = $1 AND budget_id = $2`, [casa, budgetId, assinatura]);
}

/** Visão para a rotina: orçamentos da casa com a última versão baixada (peças e link do PDF). */
export async function retrato(casa) {
  return sql(`
    SELECT o.*, v.numero_versao AS versao_baixada, v.pecas, v.totais, v.pdf_drive_id, v.pdf_nome, v.baixado_em
    FROM cilia.orcamento o
    LEFT JOIN LATERAL (
      SELECT * FROM cilia.versao v WHERE v.casa = o.casa AND v.budget_id = o.budget_id ORDER BY v.baixado_em DESC LIMIT 1
    ) v ON true
    WHERE o.casa = $1
    ORDER BY o.atualizado_em DESC`, [casa]);
}
