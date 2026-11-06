/**
 * Ações de checklist que o Trello só entrega pelo webhook (06/11/2026, ATZ2D85):
 * `createCheckItem`, `deleteCheckItem` e `updateCheckItem` (item incluído / apagado / renomeado) NÃO aparecem em GET /boards/{id}/actions — a trava de
 * checklist do robô (ck_executar_, TravaChecklist.gs) lê esse histórico e por isso nunca via um item apagado à mão
 * (no ATZ2D85 o item FO "GRADE DO PAINEL DO LIMPADOR" sumiu e a trava, que sabe desfazer exclusão, não soube).
 * O webhook do principal (/trello/robo) e o do TESTE (/trello/webhook) guardam essas ações aqui, em memória, e a ponte
 * junta-as à resposta do Trello quando o robô pede o histórico do quadro (mesclarAcoesChecklist). Memória: últimas 3 h,
 * até 3000 ações — a trava julga ações de minutos atrás; o que se perde num deploy já não seria julgado (licença também morre).
 */
import type { AcaoTrello } from './webhook.js';

const TIPOS = /^(createCheckItem|deleteCheckItem|updateCheckItem)$/;   // o Trello não guarda nenhuma das três no histórico (/actions): só ✔ e checklist criado/apagado
const GUARDA_MS = 3 * 3_600_000;
const MAXIMO = 3000;
const acoes: AcaoTrello[] = [];
const vistas = new Set<string>();
let guardadas = 0;

export function ehAcaoChecklistDoWebhook(tipo: string): boolean { return TIPOS.test(tipo); }

export function guardarAcaoChecklist(a: AcaoTrello): boolean {
  if (!a || !a.id || !TIPOS.test(a.type) || vistas.has(a.id)) return false;
  vistas.add(a.id);
  acoes.push(a);
  guardadas++;
  const lim = Date.now() - GUARDA_MS;
  while (acoes.length && (Date.parse(acoes[0].date) < lim || acoes.length > MAXIMO)) vistas.delete(acoes.shift()!.id);
  return true;
}

export function estadoAcoesChecklist(): { guardadas: number; naMemoria: number; desde: string | null } {
  return { guardadas, naMemoria: acoes.length, desde: acoes[0]?.date || null };
}

/** Ações do quadro (id longo ou shortLink não é conferido aqui: o webhook é de um quadro só) dentro da janela. */
export function acoesChecklistEntre(desdeMs: number, ateMs: number, tipos?: string[]): AcaoTrello[] {
  return acoes.filter((a) => {
    const t = Date.parse(a.date);
    return t > desdeMs && t <= ateMs && (!tipos || tipos.includes(a.type));
  });
}

/** Data de uma ação guardada (o robô usa o id da última ação julgada como `since`; o Trello não conhece esses ids). */
export function dataDaAcaoChecklist(id: string): string | null {
  const a = acoes.find((x) => x.id === id);
  return a ? a.date : null;
}

/**
 * Junta as ações guardadas à resposta de GET /1/boards/{id}/actions. `filter` ausente ou com um dos tipos → mescla;
 * resultado ordenado do mais novo para o mais velho, sem repetir id. Devolve null quando não há nada a mesclar.
 */
export function mesclarAcoesChecklist(url: string, corpo: string): string | null {
  let u: URL; try { u = new URL(url); } catch { return null; }
  if (u.host !== 'api.trello.com' || !/^\/1\/boards\/[A-Za-z0-9]+\/actions\/?$/.test(u.pathname)) return null;
  const filtro = (u.searchParams.get('filter') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const tipos = filtro.length ? filtro.filter((t) => TIPOS.test(t)) : undefined;
  if (filtro.length && !tipos!.length) return null;
  const since = u.searchParams.get('since') || '', before = u.searchParams.get('before') || '';
  const desdeMs = since ? (Date.parse(since) || Date.parse(dataDaAcaoChecklist(since) || '') || (/^[a-f0-9]{24}$/.test(since) ? parseInt(since.slice(0, 8), 16) * 1000 : 0)) : Date.now() - GUARDA_MS;
  const ateMs = before ? (Date.parse(before) || Date.now()) : Date.now();
  const extras = acoesChecklistEntre(desdeMs, ateMs, tipos);
  if (!extras.length) return null;
  let lista: AcaoTrello[];
  try { lista = JSON.parse(corpo); } catch { return null; }
  if (!Array.isArray(lista)) return null;
  const ids = new Set(lista.map((a) => a && a.id));
  const juntas = lista.concat(extras.filter((a) => !ids.has(a.id)));
  juntas.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const limite = Number(u.searchParams.get('limit') || 0);
  return JSON.stringify(limite > 0 && juntas.length > limite ? juntas.slice(0, limite) : juntas);
}

/** `since=<id de ação só do webhook>` vira `since=<data>` — o Trello não conhece esses ids. */
export function corrigirSincePorId(url: string): string {
  let u: URL; try { u = new URL(url); } catch { return url; }
  if (u.host !== 'api.trello.com' || !/\/actions\/?$/.test(u.pathname)) return url;
  for (const k of ['since', 'before']) {
    const v = u.searchParams.get(k) || '';
    if (/^[a-f0-9]{24}$/.test(v)) { const d = dataDaAcaoChecklist(v); if (d) u.searchParams.set(k, new Date(Date.parse(d) + (k === 'since' ? 1 : 0)).toISOString()); }   // +1 ms: a própria ação não volta
  }
  return u.toString();
}
