/**
 * Versão 2.0, passo 1 (08/10/2026): retrato de cada pedido do TESTE no banco, em paralelo ao Trello.
 * O retrato é exatamente o que o formulário vê ao abrir o card (o código do robô, em modo só leitura).
 * Chamado depois de cada ação do Trello no card (webhook) e em lote por /tarefas/retratar.
 */
import { createHash } from 'node:crypto';
import { consulta } from './db.js';
import { retratoDoCard } from './gas/ponte.js';

const PARTES = ['lista', 'tipo', 'dados', 'pecas', 'cotacoes', 'autorizadas', 'pagas', 'recebiveis', 'totais'] as const;
const FORA = ['fornecedores', 'todosAnexos', 'podeAutorizar', 'podeDevolver', 'podeComprar', 'podeReceber', 'diretoria'];

const rodando = new Map<string, Promise<void>>();
const repetir = new Set<string>();

/** Retrata um card (shortLink). Se já estiver retratando o mesmo card, marca para repetir uma vez no fim. */
export function retratar(shortLink: string): Promise<void> {
  const r = rodando.get(shortLink);
  if (r) { repetir.add(shortLink); return r; }
  const p = (async () => {
    do { repetir.delete(shortLink); await retratarUmaVez(shortLink); } while (repetir.has(shortLink));
  })().finally(() => rodando.delete(shortLink));
  rodando.set(shortLink, p);
  return p;
}

async function retratarUmaVez(shortLink: string): Promise<void> {
  const [c] = await consulta<{ id: string; quadro: string; short_link: string; nome: string }>(`SELECT id, quadro, short_link, nome FROM trello_card WHERE short_link = $1 OR id = $1`, [shortLink]);
  if (!c) return;
  if (/^\s*AVISO\b|NOVO PEDIDO DE PE/i.test(c.nome || '')) { await consulta(`DELETE FROM pedido_retrato WHERE card_id = $1`, [c.id]); return; }
  shortLink = c.short_link;
  const t0 = Date.now();
  let r: Record<string, unknown>;
  try { r = (await retratoDoCard(shortLink)) as Record<string, unknown>; }
  catch (e) {
    await consulta(`INSERT INTO pedido_retrato (card_id, short_link, quadro, erro, ms) VALUES ($1,$2,$3,$4,$5)
                    ON CONFLICT (card_id) DO UPDATE SET erro = EXCLUDED.erro, ms = EXCLUDED.ms, retratado_em = now()`,
      [c.id, shortLink, c.quadro, (e as Error).message.slice(0, 300), Date.now() - t0]);
    return;
  }
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) if (!(PARTES as readonly string[]).includes(k) && !FORA.includes(k) && !['shortLink', 'nome', 'url'].includes(k)) extra[k] = v;
  const partes = Object.fromEntries(PARTES.map((k) => [k, r[k] ?? null]));
  const hash = (k: string) => createHash('sha1').update(JSON.stringify(partes[k] ?? null)).digest('hex').slice(0, 10);
  const hashes = PARTES.map(hash);
  const total = createHash('sha1').update(hashes.join('|')).digest('hex').slice(0, 16);
  const [velho] = await consulta<Record<string, unknown>>(`SELECT hash, lista, tipo, dados, pecas, cotacoes, autorizadas, pagas, recebiveis, totais FROM pedido_retrato WHERE card_id = $1`, [c.id]);
  const antes = velho && velho.hash ? { hash: String(velho.hash) } : null;
  await consulta(
    `INSERT INTO pedido_retrato (card_id, short_link, quadro, nome, lista, tipo, dados, pecas, cotacoes, autorizadas, pagas, recebiveis, totais, extra, hash, ms, erro, retratado_em)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NULL, now())
     ON CONFLICT (card_id) DO UPDATE SET short_link=EXCLUDED.short_link, nome=EXCLUDED.nome, lista=EXCLUDED.lista, tipo=EXCLUDED.tipo, dados=EXCLUDED.dados,
       pecas=EXCLUDED.pecas, cotacoes=EXCLUDED.cotacoes, autorizadas=EXCLUDED.autorizadas, pagas=EXCLUDED.pagas, recebiveis=EXCLUDED.recebiveis,
       totais=EXCLUDED.totais, extra=EXCLUDED.extra, hash=EXCLUDED.hash, ms=EXCLUDED.ms, erro=NULL, retratado_em=now()`,
    [c.id, shortLink, c.quadro, r.nome ?? null, r.lista ?? null, r.tipo ?? null, ...['dados', 'pecas', 'cotacoes', 'autorizadas', 'pagas', 'recebiveis', 'totais'].map((k) => JSON.stringify(partes[k])),
      JSON.stringify(extra), total, Date.now() - t0]);
  if (!antes || antes.hash !== total) {
    const mudou = antes && velho ? PARTES.filter((k) => JSON.stringify(velho[k] ?? null) !== JSON.stringify(partes[k] ?? null)) : ['novo'];
    await consulta(`INSERT INTO pedido_historico (card_id, lista, hash, mudou) VALUES ($1,$2,$3,$4)`, [c.id, r.lista ?? null, total, mudou]);
  }
}

/** Retrata em lote os cards abertos do quadro (os que ainda não têm retrato primeiro), até `ms`. */
export async function retratarTodos(quadro: string, ms: number): Promise<{ feitos: number; erros: number; faltam: number }> {
  const fim = Date.now() + ms;
  // cards de aviso e o card fixo não são pedidos
  await consulta(`DELETE FROM pedido_retrato r USING trello_card c WHERE c.id = r.card_id AND (c.nome ~* '^\\s*AVISO' OR c.nome ~* 'NOVO PEDIDO DE PE')`);
  const cards = await consulta<{ short_link: string }>(
    `SELECT c.short_link FROM trello_card c LEFT JOIN pedido_retrato r ON r.card_id = c.id
     WHERE c.quadro = $1 AND NOT c.fechado AND c.excluido_em IS NULL
       AND c.nome !~* '^\\s*AVISO' AND c.nome !~* 'NOVO PEDIDO DE PE'
     ORDER BY r.retratado_em NULLS FIRST`, [quadro]);
  let feitos = 0, erros = 0;
  for (const c of cards) {
    if (Date.now() > fim) break;
    await retratar(c.short_link);
    feitos++;
  }
  const [e] = await consulta<{ n: string }>(`SELECT count(*) n FROM pedido_retrato WHERE quadro = $1 AND erro IS NOT NULL`, [quadro]);
  erros = +e.n;
  return { feitos, erros, faltam: cards.length - feitos };
}
