/**
 * Leitura (somente) da planilha do robô — "Validação Trello — backup de descrições" — pela API do Google Sheets,
 * com a conta de serviço do próprio servidor (compra-peca-run). Sem senha: o token vem do servidor de metadados
 * do Cloud Run. A planilha precisa estar compartilhada com essa conta como Leitor.
 *  - TRAVA   (A Card id · B Assinatura · C Quando · D Vitrine · E Completa) → planilha_trava + trello_card.desc_completa
 *  - EVENTOS (16 colunas)                                                    → evento (origem 'planilha', sem duplicar)
 */
import { createHash } from 'node:crypto';
import { consulta } from '../db.js';

const ESCOPO = 'https://www.googleapis.com/auth/spreadsheets.readonly';
let tokenCache: { valor: string; expira: number } | null = null;

/** Token da conta de serviço do Cloud Run (servidor de metadados). Em desenvolvimento: GOOGLE_TOKEN. */
async function tokenGoogle(): Promise<string> {
  if (process.env.GOOGLE_TOKEN) return process.env.GOOGLE_TOKEN;
  if (tokenCache && tokenCache.expira > Date.now() + 60_000) return tokenCache.valor;
  const r = await fetch(`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=${encodeURIComponent(ESCOPO)}`,
    { headers: { 'Metadata-Flavor': 'Google' } });
  if (!r.ok) throw new Error(`metadados do Google ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json() as { access_token: string; expires_in: number };
  tokenCache = { valor: j.access_token, expira: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

export class ErroPlanilha extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}

/** Valores crus de um intervalo (números, textos; datas como número de série). */
async function lerIntervalo(planilhaId: string, intervalo: string): Promise<unknown[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${planilhaId}/values/${encodeURIComponent(intervalo)}` +
    `?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + await tokenGoogle() } });
  if (!r.ok) {
    const corpo = await r.text();
    const dica = r.status === 403 ? ' (a planilha está compartilhada com compra-peca-run@…? a API do Sheets está ativada no projeto?)' : '';
    throw new ErroPlanilha(r.status, `Sheets ${r.status} em ${intervalo}${dica}: ${corpo.slice(0, 200)}`);
  }
  const j = await r.json() as { values?: unknown[][] };
  return j.values || [];
}

/**
 * Número de série da planilha → data. A planilha está no fuso de São Paulo (UTC−3, sem horário de verão desde 2019):
 * o serial conta dias desde 30/12/1899 no horário LOCAL.
 */
export function dataDoSerial(v: unknown): Date | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return new Date(Math.round((v - 25569) * 86_400_000) + 3 * 3_600_000);
  if (typeof v === 'string' && v.trim()) {
    const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0) + 3, +(m[5] || 0), +(m[6] || 0)));
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  }
  return null;
}

const texto = (v: unknown) => (v === undefined || v === null ? '' : String(v)).replace(/^'/, '');
const numero = (v: unknown) => (v === '' || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v));

export function shortLinkDoLink(link: string): string | null {
  const m = link.match(/trello\.com\/c\/([A-Za-z0-9]{8})/);
  return m ? m[1] : null;
}

// ---------- TRAVA ----------
export interface LinhaTrava { card_id: string; assinatura: string; quando: Date | null; vitrine: string; completa: string }

export function linhasTrava(valores: unknown[][]): LinhaTrava[] {
  return valores.slice(1).filter((r) => texto(r[0]).match(/^[0-9a-f]{24}$/)).map((r) => ({
    card_id: texto(r[0]), assinatura: texto(r[1]), quando: dataDoSerial(r[2]), vitrine: texto(r[3]), completa: texto(r[4]),
  }));
}

async function gravarTrava(linhas: LinhaTrava[]): Promise<{ linhas: number; novas_ou_mudadas: number; cards_espelho: number }> {
  let mudadas = 0;
  for (const l of linhas) {
    const r = await consulta(
      `INSERT INTO planilha_trava (card_id, assinatura, quando, vitrine, completa, lida_em) VALUES ($1,$2,$3,$4,$5, now())
       ON CONFLICT (card_id) DO UPDATE SET assinatura=EXCLUDED.assinatura, quando=EXCLUDED.quando, vitrine=EXCLUDED.vitrine,
         completa=EXCLUDED.completa, lida_em=now()
       WHERE planilha_trava.assinatura IS DISTINCT FROM EXCLUDED.assinatura OR planilha_trava.completa IS DISTINCT FROM EXCLUDED.completa
       RETURNING card_id`,
      [l.card_id, l.assinatura, l.quando, l.vitrine, l.completa]);
    if (r.length) mudadas++;
  }
  // a completa é a oficial; quando a coluna E está vazia (cards antigos), a vitrine É a completa
  const atual = await consulta(
    `UPDATE trello_card c SET desc_completa = COALESCE(NULLIF(t.completa, ''), t.vitrine), desc_assinatura = t.assinatura, desc_trava_em = t.quando
     FROM planilha_trava t
     WHERE c.id = t.card_id AND (c.desc_assinatura IS DISTINCT FROM t.assinatura OR c.desc_completa IS NULL)
     RETURNING c.id`);
  return { linhas: linhas.length, novas_ou_mudadas: mudadas, cards_espelho: atual.length };
}

// ---------- EVENTOS ----------
export function linhasEventos(valores: unknown[][]) {
  return valores.slice(1).filter((r) => r.length && texto(r[1])).map((r) => {
    const chave = createHash('sha1').update(JSON.stringify(r.slice(0, 16).map(texto))).digest('hex');
    const link = texto(r[3]);
    return {
      chave, quando: dataDoSerial(r[0]), evento: texto(r[1]), card_nome: texto(r[2]), card_link: link, short_link: shortLinkDoLink(link),
      placa: texto(r[4]) || null, unidade: texto(r[5]) || null, tipo_pedido: texto(r[6]) || null, peca: texto(r[7]) || null,
      particular: texto(r[8]).toUpperCase() === 'SIM', fornecedor: texto(r[9]) || null, valor: numero(r[10]),
      prazo_du: numero(r[11]) === null ? null : Math.round(numero(r[11]) as number), previsao: dataDoSerial(r[12]),
      usuario: texto(r[13]) || null, detalhe: texto(r[14]) || null, quadro: texto(r[15]) || null,
    };
  });
}

async function gravarEventos(linhas: ReturnType<typeof linhasEventos>): Promise<{ linhas: number; novas: number }> {
  let novas = 0;
  for (const e of linhas) {
    const r = await consulta(
      `INSERT INTO evento (quando, evento, card_id, short_link, placa, unidade, tipo_pedido, peca, particular, fornecedor, valor, prazo_du,
                           previsao, usuario, detalhe, quadro, origem, chave, card_link, card_nome)
       VALUES (COALESCE($1, now()), $2, (SELECT id FROM trello_card WHERE short_link = $3), $3, $4, $5, $6, $7, $8, $9, $10, $11,
               $12::timestamptz::date, $13, $14, $15, 'planilha', $16, $17, $18)
       ON CONFLICT (chave) WHERE chave IS NOT NULL DO NOTHING RETURNING id`,
      [e.quando, e.evento, e.short_link, e.placa, e.unidade, e.tipo_pedido, e.peca, e.particular, e.fornecedor, e.valor, e.prazo_du,
        e.previsao, e.usuario, e.detalhe, e.quadro, e.chave, e.card_link, e.card_nome || null]);
    if (r.length) novas++;
  }
  // eventos que chegaram antes de o card existir no espelho: liga agora
  await consulta(`UPDATE evento e SET card_id = c.id FROM trello_card c WHERE e.card_id IS NULL AND e.short_link = c.short_link`);
  return { linhas: linhas.length, novas };
}

/** Todas as células de uma aba (valores crus; datas como número de série). */
export async function lerAbaPlanilha(planilhaId: string, aba: string): Promise<unknown[][]> {
  return lerIntervalo(planilhaId, `'${aba.replace(/'/g, "''")}'`);
}

/** Nomes das abas da planilha. */
export async function listarAbasPlanilha(planilhaId: string): Promise<string[]> {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${planilhaId}?fields=sheets.properties.title`,
    { headers: { Authorization: 'Bearer ' + await tokenGoogle() } });
  if (!r.ok) throw new ErroPlanilha(r.status, `Sheets ${r.status} ao listar abas`);
  const j = await r.json() as { sheets?: Array<{ properties: { title: string } }> };
  return (j.sheets || []).map((x) => x.properties.title);
}

/** Lê TRAVA e EVENTOS e grava no banco. Registra a execução em `sincronizacao` (tipo 'planilha'). */
export async function importarPlanilha(planilhaId: string) {
  const [s] = await consulta<{ id: string }>(`INSERT INTO sincronizacao (tipo, quadro) VALUES ('planilha', $1) RETURNING id`, [planilhaId]);
  try {
    const [trava, eventos] = await Promise.all([lerIntervalo(planilhaId, 'TRAVA!A:E'), lerIntervalo(planilhaId, 'EVENTOS!A:P')]);
    const r = { trava: await gravarTrava(linhasTrava(trava)), eventos: await gravarEventos(linhasEventos(eventos)) };
    await consulta(`UPDATE sincronizacao SET fim=now(), ok=true, resumo=$2 WHERE id=$1`, [s.id, JSON.stringify(r)]);
    return r;
  } catch (e) {
    await consulta(`UPDATE sincronizacao SET fim=now(), ok=false, erro=$2 WHERE id=$1`, [s.id, (e as Error).message]);
    throw e;
  }
}
