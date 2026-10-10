/**
 * Lado do servidor da imitação do Google: atende os pedidos síncronos do trabalhador (rede, banco, OCR) e
 * expõe `executarPost` (o doPost do robô) para a rota /api.
 *
 * PROTEÇÃO DO QUADRO PRINCIPAL: toda gravação no Trello (POST/PUT/DELETE) só passa se o alvo (card, checklist,
 * item, comentário, anexo, campo) pertence ao quadro configurado no espelho do banco. Sem como confirmar, recusa.
 */
import { Worker, MessageChannel } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { CFG } from '../config.js';
import { consulta } from '../db.js';
import { extrairTexto } from '../leitores/texto.js';
import { melhorLeitura } from '../leitores/leitura.js';
import { lerAbaPlanilha, listarAbasPlanilha } from '../google/planilha.js';
import { trello } from '../trello/api.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ARQUIVO_ROBO = process.env.GAS_ARQUIVO || path.resolve(AQUI, '..', '..', 'recursos', 'formulario.gs.js');

/** Abas que o código do formulário usa e que nascem como cópia da planilha real (colunas de data a converter). */
const ABAS_COPIADAS: Record<string, number[]> = { TRAVA: [3], EVENTOS: [1, 13], FORNECEDORES: [7], CHECKLISTS: [3] };

// ---------- quadro do servidor ----------
let quadroId = '';
export async function idDoQuadro(): Promise<string> {
  if (quadroId) return quadroId;
  const [q] = await consulta<{ id: string }>(`SELECT id FROM trello_quadro WHERE short_link = $1 OR id = $1`, [CFG.trello.quadro]);
  if (!q) throw new Error('quadro ainda não sincronizado no banco');
  quadroId = q.id;
  return quadroId;
}

/**
 * O espelho pode ainda não ter o que a própria execução acabou de criar (checklist PAGAS criado e logo preenchido,
 * card novo, comentário novo — 07/10/2026, compra do TAJ0E65). Nesse caso pergunta ao Trello (só leitura) de que
 * quadro é. Sem chave do Trello (testes) ou se o Trello não responder: '' (= não confirmado, recusa).
 */
async function quadroNoTrello(tipo: 'cards' | 'checklists' | 'actions' | 'lists', id: string): Promise<string> {
  if (!CFG.trello.chave || !CFG.trello.token) return '';
  try {
    if (tipo === 'actions') {
      const a = await trello<{ data?: { board?: { id?: string } } }>(`/actions/${id}`, { query: { fields: 'data' }, tentativas: 2 });
      return a?.data?.board?.id || '';
    }
    const r = await trello<{ idBoard?: string }>(`/${tipo}/${id}`, { query: { fields: 'idBoard' }, tentativas: 2 });
    return r?.idBoard || '';
  } catch { return ''; }
}

/** Decide se uma gravação no Trello pode ser feita (só no quadro do servidor). Devolve o motivo da recusa ou ''. */
export async function conferirEscrita(url: string, metodo: string, corpo: string): Promise<string> {
  if (metodo === 'GET' || !/^https:\/\/api\.trello\.com\//.test(url)) return '';
  if (CFG.permitirPrincipal) return '';
  const quadro = await idDoQuadro();
  const caminho = new URL(url).pathname.replace(/^\/1/, '');
  let json: Record<string, unknown> = {};
  try { json = corpo ? JSON.parse(corpo) : {}; } catch { /* corpo de formulário */ }
  const doCard = async (ref: string) => (await consulta(`SELECT 1 FROM trello_card WHERE (id = $1 OR short_link = $1) AND quadro = $2`, [ref, quadro])).length > 0
    || (/^[A-Za-z0-9]{8}$|^[a-f0-9]{24}$/.test(ref) && await quadroNoTrello('cards', ref) === quadro);
  let m: RegExpMatchArray | null;
  if ((m = caminho.match(/^\/cards\/([A-Za-z0-9]+)/))) return (await doCard(m[1])) ? '' : `card ${m[1]} não é do quadro ${CFG.trello.quadro}`;
  if ((m = caminho.match(/^\/checklists\/([a-f0-9]{24})/))) {
    const ok = await consulta(`SELECT 1 FROM trello_card WHERE quadro = $2 AND checklists @> jsonb_build_array(jsonb_build_object('id', $1::text))`, [m[1], quadro]);
    return ok.length || await quadroNoTrello('checklists', m[1]) === quadro ? '' : `checklist ${m[1]} não é de card do quadro ${CFG.trello.quadro}`;
  }
  if (caminho === '/checklists' || caminho === '/cards') {
    const alvo = String(json.idCard || json.idList || '');
    if (caminho === '/checklists') return (await doCard(alvo)) ? '' : 'checklist novo em card de fora do quadro';
    const [l] = await consulta<{ listas: Array<{ id: string }> }>(`SELECT listas FROM trello_quadro WHERE id = $1`, [quadro]);
    return l?.listas.some((x) => x.id === alvo) ? '' : 'card novo em lista de fora do quadro';
  }
  if ((m = caminho.match(/^\/actions\/([a-f0-9]{24})/))) {
    const ok = await consulta(`SELECT 1 FROM trello_acao WHERE id = $1 AND quadro = $2`, [m[1], quadro]);
    return ok.length || await quadroNoTrello('actions', m[1]) === quadro ? '' : 'comentário de fora do quadro';
  }
  if ((m = caminho.match(/^\/customFields\/([a-f0-9]{24})/))) {
    const ok = await consulta(`SELECT 1 FROM trello_quadro WHERE id = $2 AND campos_def @> jsonb_build_array(jsonb_build_object('id', $1::text))`, [m[1], quadro]);
    return ok.length ? '' : 'campo personalizado de fora do quadro';
  }
  if (caminho === '/customFields') return String(json.idModel || '') === quadro ? '' : 'campo personalizado em outro quadro';
  if ((m = caminho.match(/^\/boards\/([A-Za-z0-9]+)/))) return m[1] === quadro || m[1] === CFG.trello.quadro ? '' : 'outro quadro';
  if ((m = caminho.match(/^\/lists\/([a-f0-9]{24})/))) {
    const [l] = await consulta<{ listas: Array<{ id: string }> }>(`SELECT listas FROM trello_quadro WHERE id = $1`, [quadro]);
    return l?.listas.some((x) => x.id === m![1]) || await quadroNoTrello('lists', m[1]) === quadro ? '' : 'lista de fora do quadro';
  }
  return `gravação não reconhecida (${metodo} ${caminho}) — recusada por segurança`;
}

// ---------- pedidos do trabalhador ----------
interface Pedido { url: string; metodo: string; cabecalhos: Record<string, string>; corpo:
  { tipo: 'nada' } | { tipo: 'texto'; texto: string; contentType: string } |
  { tipo: 'multipart'; partes: Array<{ nome: string; texto?: string; bytes?: Uint8Array; arquivo?: string; tipo?: string }> } }

// ---------- memória das leituras do Trello que quase não mudam (velocidade, 07/10/2026) ----------
// Cada ida ao Trello custa ~0,2 s daqui. O robô pergunta várias vezes por execução o id do quadro, quem é o usuário
// e as listas/etiquetas/campos do quadro — isso fica guardado por pouco tempo. Card, checklist, anexo e ação: nunca.
type Resposta = { status: number; cab: Record<string, string>; corpo: Uint8Array };
const memoria = new Map<string, { ate: number; r: Resposta }>();
let memoriaUsos = 0;
export function usosDaMemoria(): { itens: number; usos: number } { return { itens: memoria.size, usos: memoriaUsos }; }
export function esquecerMemoria(): void { memoria.clear(); }

function validadeMemoria(url: string): number {
  let u: URL; try { u = new URL(url); } catch { return 0; }
  if (u.host !== 'api.trello.com') return 0;
  const c = u.pathname.replace(/^\/1/, '');
  if (/^\/members\/me$/.test(c)) return 10 * 60_000;                                     // quem é o usuário (por token)
  if (/^\/boards\/[A-Za-z0-9]+$/.test(c)) return 60 * 60_000;                           // id / nome do quadro
  if (/^\/boards\/[A-Za-z0-9]+\/(lists|labels|customFields|members)$/.test(c)) return 60_000;   // estrutura do quadro
  return 0;
}

async function buscar(p: Pedido, ctx: Contexto) {
  if (ctx.somenteLeitura && p.metodo !== 'GET') {
    return { status: 403, cab: { 'content-type': 'text/plain' }, corpo: new TextEncoder().encode('servidor: no quadro principal o servidor só lê') };
  }
  const ttl = p.metodo === 'GET' ? validadeMemoria(p.url) : 0;
  const chave = ttl ? p.url + '|' + (p.cabecalhos.Authorization || p.cabecalhos.authorization || '') : '';
  if (ttl) {
    const m = memoria.get(chave);
    if (m && m.ate > Date.now()) { memoriaUsos++; return m.r; }
  } else if (p.metodo !== 'GET' && /api\.trello\.com\/1\/(boards|lists|labels|customFields)/.test(p.url)) {
    memoria.clear();   // mudou a estrutura do quadro: esquece tudo
  }
  const r = await buscarRede(p);
  if (ttl && r.status === 200) {
    if (memoria.size > 500) memoria.clear();
    memoria.set(chave, { ate: Date.now() + ttl, r });
  }
  return r;
}

async function buscarRede(p: Pedido): Promise<Resposta> {
  const corpoTexto = p.corpo.tipo === 'texto' ? p.corpo.texto : '';
  const recusa = await conferirEscrita(p.url, p.metodo, corpoTexto);
  if (recusa) {
    console.warn('[proteção] gravação recusada:', p.metodo, p.url.split('?')[0], '-', recusa);
    return { status: 403, cab: { 'content-type': 'text/plain' }, corpo: new TextEncoder().encode('servidor: ' + recusa) };
  }
  const init: RequestInit = { method: p.metodo, headers: { ...p.cabecalhos } };
  if (p.corpo.tipo === 'texto') { init.body = p.corpo.texto; (init.headers as Record<string, string>)['content-type'] = p.corpo.contentType; }
  if (p.corpo.tipo === 'multipart') {
    const fd = new FormData();
    for (const pt of p.corpo.partes) {
      if (pt.bytes) fd.append(pt.nome, new globalThis.Blob([Buffer.from(pt.bytes)], { type: pt.tipo || 'application/octet-stream' }), pt.arquivo || 'arquivo');
      else fd.append(pt.nome, pt.texto ?? '');
    }
    init.body = fd;
  }
  const r = await fetch(p.url, init);
  const cab: Record<string, string> = {};
  r.headers.forEach((v, k) => { cab[k] = v; });
  return { status: r.status, cab, corpo: new Uint8Array(await r.arrayBuffer()) };
}

const reviverData = (cols: number[]) => (linha: unknown[]) => linha.map((v, i) => {
  if (cols.includes(i + 1) && typeof v === 'number' && v > 20000) return { $d: new Date(Math.round((v - 25569) * 86_400_000) + 3 * 3_600_000).toISOString() };
  return v;
});

async function abaExiste(nome: string): Promise<boolean> {
  if ((await consulta(`SELECT 1 FROM gas_aba WHERE nome = $1`, [nome])).length) return true;
  // primeira vez: copia da planilha real, se for uma das abas do formulário
  if (CFG.planilhaId && ABAS_COPIADAS[nome] && (await listarAbasPlanilha(CFG.planilhaId)).includes(nome)) {
    const valores = await lerAbaPlanilha(CFG.planilhaId, nome);
    await consulta(`INSERT INTO gas_aba (nome, posicao, copiada_de) VALUES ($1, 10, $2) ON CONFLICT DO NOTHING`, [nome, CFG.planilhaId]);
    const conv = reviverData(ABAS_COPIADAS[nome]);
    for (let i = 0; i < valores.length; i += 500) {
      const lote = valores.slice(i, i + 500).map(conv);
      await consulta(`INSERT INTO gas_linha (aba, linha, valores) SELECT $1, n + $3, v FROM jsonb_array_elements($2::jsonb) WITH ORDINALITY AS t(v, n)
                      ON CONFLICT DO NOTHING`, [nome, JSON.stringify(lote), i]);
    }
    return true;
  }
  return false;
}

/** Abas da planilha real que a leitura do principal consulta ao vivo (as outras ficam vazias). */
const ABAS_AO_VIVO = ['TRAVA', 'FORNECEDORES'];

/** Pedidos do trabalhador no modo "só leitura" (quadro principal): nada é gravado no banco; a planilha é lida ao vivo. */
async function atenderLeitura(op: string, d: any, ctx: Contexto): Promise<unknown> {   // eslint-disable-line @typescript-eslint/no-explicit-any
  switch (op) {
    case 'props.gravar': case 'props.apagar': case 'aba.criar': case 'aba.gravar': case 'gatilho': case 'email': return null;
    // retrato do TESTE: as abas são as do próprio servidor (banco), só leitura
    case 'aba.existe': case 'aba.lista': case 'aba.ler': if (!ctx.abasAoVivo) return atender(op, d, ctx); break;
  }
  switch (op) {
    case 'aba.existe': return d === 'backup' || ABAS_AO_VIVO.includes(d);
    case 'aba.lista': return ['backup', ...ABAS_AO_VIVO];
    case 'aba.ler': {
      if (!ABAS_AO_VIVO.includes(d) || !CFG.planilhaId) return [];
      return (await lerAbaPlanilha(CFG.planilhaId, d)).map(reviverData(ABAS_COPIADAS[d] || []));
    }
    default: return atender(op, d, ctx);
  }
}

async function atender(op: string, d: any, ctx: Contexto): Promise<unknown> {   // eslint-disable-line @typescript-eslint/no-explicit-any
  switch (op) {
    case 'fetch': return buscar(d, ctx);
    case 'fetchAll': return Promise.all((d as Pedido[]).map((x) => buscar(x, ctx)));
    case 'props.gravar':
      for (const [k, v] of Object.entries(d as Record<string, string>)) {
        await consulta(`INSERT INTO gas_propriedade (chave, valor) VALUES ($1,$2) ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, alterada_em = now()`, [k, v]);
      }
      return null;
    case 'props.apagar': await consulta(`DELETE FROM gas_propriedade WHERE chave = ANY($1::text[])`, [d]); return null;
    case 'aba.existe': return abaExiste(d);
    case 'aba.lista': {
      await consulta(`INSERT INTO gas_aba (nome, posicao) VALUES ('backup', 0) ON CONFLICT DO NOTHING`);
      return (await consulta<{ nome: string }>(`SELECT nome FROM gas_aba ORDER BY posicao, criada_em`)).map((r) => r.nome);
    }
    case 'aba.criar': await consulta(`INSERT INTO gas_aba (nome, posicao) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [d.nome, d.posicao]); return null;
    case 'aba.ler': {
      if (!(await abaExiste(d))) { if (d === 'backup') await consulta(`INSERT INTO gas_aba (nome, posicao) VALUES ('backup', 0) ON CONFLICT DO NOTHING`); else return []; }
      const rs = await consulta<{ linha: number; valores: unknown[] }>(`SELECT linha, valores FROM gas_linha WHERE aba = $1 ORDER BY linha`, [d]);
      const out: unknown[][] = [];
      for (const r of rs) { while (out.length < r.linha - 1) out.push([]); out[r.linha - 1] = r.valores; }
      return out;
    }
    case 'aba.gravar':
      await consulta(`INSERT INTO gas_aba (nome) VALUES ($1) ON CONFLICT DO NOTHING`, [d.nome]);
      for (const [n, v] of Object.entries(d.linhas as Record<string, unknown[]>)) {
        await consulta(`INSERT INTO gas_linha (aba, linha, valores) VALUES ($1,$2,$3) ON CONFLICT (aba, linha) DO UPDATE SET valores = EXCLUDED.valores`, [d.nome, +n, JSON.stringify(v)]);
      }
      return null;
    case 'arq.criar': {
      const id = 'arq-' + randomUUID();
      await consulta(`INSERT INTO gas_arquivo (id, nome, tipo, dados, pasta) VALUES ($1,$2,$3,$4,$5)`, [id, d.nome, d.tipo, Buffer.from(d.dados), d.pasta]);
      return id;
    }
    case 'arq.info': { const [a] = await consulta<{ nome: string; tipo: string }>(`SELECT nome, tipo FROM gas_arquivo WHERE id = $1 AND NOT lixeira`, [d]); return a || null; }
    case 'arq.ler': { const [a] = await consulta<{ nome: string; tipo: string; dados: Buffer }>(`SELECT nome, tipo, dados FROM gas_arquivo WHERE id = $1`, [d]); return a ? { ...a, dados: new Uint8Array(a.dados || []) } : null; }
    case 'arq.renomear': await consulta(`UPDATE gas_arquivo SET nome = $2 WHERE id = $1`, [d.id, d.nome]); return null;
    case 'arq.lixeira': await consulta(`UPDATE gas_arquivo SET lixeira = $2, dados = CASE WHEN $2 THEN NULL ELSE dados END WHERE id = $1`, [d.id, d.lixeira]); return null;
    case 'arq.texto': { const [a] = await consulta<{ texto: string }>(`SELECT texto FROM gas_arquivo WHERE id = $1`, [d]); return a?.texto ?? ''; }
    case 'ocr': {
      // o Google devolvia UM texto; aqui extraímos as versões e ficamos com a que os leitores aproveitam melhor
      const tx = await extrairTexto(Buffer.from(d.dados), d.nome || 'arquivo', d.tipo);
      const m = melhorLeitura(tx.versoes);
      const texto = m ? tx.versoes[m.versao] : (Object.values(tx.versoes)[0] || '');
      const id = 'doc-' + randomUUID();
      await consulta(`INSERT INTO gas_arquivo (id, nome, tipo, texto) VALUES ($1,$2,'application/vnd.google-apps.document',$3)`, [id, d.nome, texto]);
      return id;
    }
    case 'email': console.warn('[e-mail do robô — ainda não enviado pelo servidor]', d.para, d.assunto); return null;
    case 'gatilho': setTimeout(() => { ctx.chamar(d.fn, []).catch((e) => console.error('gatilho', d.fn, e)); }, Math.max(1000, d.ms || 0)); return null;
    default: throw new Error('operação desconhecida: ' + op);
  }
}

// ---------- registro das execuções (diagnóstico: o que demorou e onde) ----------
export interface Execucao {
  fn: string; rid?: string; quadro?: string; chegou: string; frio?: boolean; filaMs: number; ms?: number; ok?: boolean; erro?: string;
  /** por operação pedida pelo trabalhador: quantas vezes e quanto tempo (ms) */
  ops: Record<string, { n: number; ms: number }>;
  /** chamadas de rede por destino (host + 1º trecho do caminho) */
  rede: Record<string, { n: number; ms: number }>;
}
const execucoes: Execucao[] = [];
export function ultimasExecucoes(): Execucao[] { return execucoes.slice().reverse(); }

function contar(atual: Execucao | null, m: { op: string; dados: unknown }, ms: number) {
  if (!atual) return;
  const o = (atual.ops[m.op] ||= { n: 0, ms: 0 }); o.n++; o.ms += ms;
  const pedidos = m.op === 'fetch' ? [m.dados] : m.op === 'fetchAll' ? (m.dados as unknown[]) : [];
  for (const p of pedidos as Array<{ url?: string; metodo?: string }>) {
    let k = '?';
    try { const u = new URL(String(p.url)); k = (p.metodo || 'GET') + ' ' + u.host + '/' + u.pathname.split('/').filter(Boolean).slice(0, 2).map((x) => /\d/.test(x) && x.length > 6 ? ':id' : x).join('/'); } catch { /* */ }
    const r = (atual.rede[k] ||= { n: 0, ms: 0 }); r.n++; r.ms += m.op === 'fetch' ? ms : 0;
  }
}

function descrever(msg: Record<string, unknown>): { fn: string; rid?: string } {
  if (msg.tipo === 'chamar') return { fn: String(msg.fn) };
  try { const c = JSON.parse(String(msg.corpo)); return { fn: String(c.fn || '?'), rid: c.rid ? String(c.rid) : undefined }; } catch { return { fn: '?' }; }
}

// ---------- trabalhadores: um por quadro ----------
// TESTE: o formulário inteiro (lê e grava, com a proteção de escrita). PRINCIPAL (07/10/2026): só as leituras de navegação
// (abrir, carregar card, buscar placa) — VD_BOARD do principal, nenhuma gravação no Trello, no banco nem na planilha.
/* Propriedades do quadro PRINCIPAL (10/10/2026, Weslley autorizou): as listas e configurações do robô (locais de estoque, quem
   retira, compradores, autorizadores, feriados extras…) só existem nas Propriedades do Script do Apps Script. O servidor pede a
   ele (vdf_propsServidor — só leitura, só chaves da lista, nunca token) e guarda por 5 min; sem resposta, usa a última que tem. */
const URL_APP = process.env.URL_APP
  ?? 'https://script.google.com/macros/s/AKfycbwkTI6PgPTe8OgIcyxzk5oysMvK2BvWwIQEdh5vhOY2n44KlVJvmeHdXTU1HQ3I5BoQew/exec';
let propsPrinc: { v: Record<string, string>; em: number } | null = null;
let buscandoProps: Promise<void> | null = null;
let erroProps = '';
let ultimaTentativa = 0;
let lidoDoBanco = false;
async function buscarPropsPrincipal(): Promise<void> {
  ultimaTentativa = Date.now();
  // o Apps Script às vezes demora (partida a frio): 30 s de prazo, sempre em segundo plano — nunca segura a abertura do card
  const r = await fetch(URL_APP, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ fn: 'vdf_propsServidor', args: [CFG.trello.token] }), signal: AbortSignal.timeout(30_000) });
  const j = await r.json() as { ok?: boolean; r?: Record<string, string>; erro?: string };
  if (!j || !j.ok || !j.r || typeof j.r !== 'object') throw new Error(j?.erro || 'resposta inválida do Apps Script');
  propsPrinc = { v: Object.fromEntries(Object.entries(j.r).map(([k, v]) => [k, String(v)])), em: Date.now() };
  erroProps = '';
  await consulta(`INSERT INTO guardado (nome, valor, em) VALUES ('props_principal', $1, now())
                  ON CONFLICT (nome) DO UPDATE SET valor = EXCLUDED.valor, em = now()`, [JSON.stringify(propsPrinc.v)]).catch(() => null);
}
async function propsDoPrincipal(): Promise<Record<string, string>> {
  if (!URL_APP) return {};   // testes (URL_APP vazio): não sai para a rede
  if (!propsPrinc && !lidoDoBanco) {   // depois de reiniciar: a última cópia guardada no banco vale até chegar a nova
    lidoDoBanco = true;
    const [g] = await consulta<{ valor: Record<string, string>; em: Date }>(`SELECT valor, em FROM guardado WHERE nome = 'props_principal'`).catch(() => []);
    if (g) propsPrinc = { v: g.valor, em: new Date(g.em).getTime() };
  }
  const velho = !propsPrinc || Date.now() - propsPrinc.em > 5 * 60_000;
  const podeTentar = Date.now() - ultimaTentativa > (erroProps ? 60_000 : 0);   // depois de erro, tenta de novo só a cada 1 min
  if (velho && podeTentar && !buscandoProps) {
    buscandoProps = buscarPropsPrincipal().catch((e) => { erroProps = (e as Error).message; console.error('props do principal:', erroProps); })
      .finally(() => { buscandoProps = null; });
  }
  return propsPrinc?.v || {};   // nunca espera: sem cópia ainda, usa o padrão do código (como antes)
}
export function estadoPropsPrincipal() {
  return { chaves: propsPrinc ? Object.keys(propsPrinc.v) : [], idadeSeg: propsPrinc ? Math.round((Date.now() - propsPrinc.em) / 1000) : null, erro: erroProps || null };
}

async function propsIniciais(): Promise<Record<string, string>> {
  const rs = await consulta<{ chave: string; valor: string }>(`SELECT chave, valor FROM gas_propriedade`);
  return Object.fromEntries(rs.map((r) => [r.chave, r.valor]));
}

export const QUADRO_PRINCIPAL_SL = 'oH4TbTqb';
/** Funções que o quadro principal pode chamar no servidor (só leitura). */
export const LEITURAS_PRINCIPAL = ['vdf_iniciar', 'vdf_abrir', 'vdf_buscarPlaca', 'vdf_carregarCard'];

class Contexto {
  private trabalhador: Worker | null = null;
  private pronto: Promise<void> | null = null;
  private seq = 0;
  private esperando = new Map<number, { ok: (v: unknown) => void; erro: (e: Error) => void }>();
  private fila: Promise<unknown> = Promise.resolve();
  atual: Execucao | null = null;
  constructor(readonly nome: 'teste' | 'principal' | 'retrato', readonly somenteLeitura: boolean, readonly quadro: string, readonly abasAoVivo = false) {}

  private fixas(): Record<string, string> {
    return {
      TRELLO_KEY: CFG.trello.chave, TRELLO_TOKEN: CFG.trello.token, VD_PLANILHA_BACKUP: 'planilha-servidor',
      VD_BOARD: this.quadro,
      // links ✏️/💰: no TESTE o atalho que abre o formulário com srv=1; no principal o formulário de sempre
      VD_URL_FORM: this.nome === 'principal' ? 'https://timweslley.github.io/unity-trello-compra-peca/powerup/formulario.html'
        : 'https://timweslley.github.io/unity-trello-compra-peca/powerup/servidor.html',
    };
  }

  private iniciar(): Promise<void> {
    if (this.pronto) return this.pronto;
    this.pronto = (async () => {
      const props = this.nome === 'principal' ? {} : await propsIniciais();   // principal: vêm do Apps Script a cada chamada
      const sinal = new SharedArrayBuffer(4);
      const flag = new Int32Array(sinal);
      const { port1, port2 } = new MessageChannel();
      const w = new Worker(path.join(AQUI, 'trabalhador.js'), {
        workerData: { porta: port2, sinal, arquivo: ARQUIVO_ROBO, props, fixas: this.fixas(), somenteLeitura: this.somenteLeitura }, transferList: [port2] });
      port1.on('message', async (m: { op: string; dados: unknown }) => {
        let resp: { ok: boolean; r?: unknown; erro?: string };
        const t0 = Date.now();
        try { resp = { ok: true, r: await (this.somenteLeitura ? atenderLeitura(m.op, m.dados, this) : atender(m.op, m.dados, this)) }; }
        catch (e) { resp = { ok: false, erro: (e as Error).message }; }
        contar(this.atual, m, Date.now() - t0);
        port1.postMessage(resp);
        Atomics.store(flag, 0, 1);
        Atomics.notify(flag, 0);
      });
      w.on('message', (m: { pronto?: boolean; id?: number; ok?: boolean; r?: unknown; erro?: string }) => {
        if (m.pronto) return;
        const e = this.esperando.get(m.id!);
        if (!e) return;
        this.esperando.delete(m.id!);
        if (m.ok) e.ok(m.r); else e.erro(new Error(m.erro));
      });
      w.on('error', (e) => { console.error('trabalhador caiu:', this.nome, e); this.trabalhador = null; this.pronto = null; this.esperando.forEach((x) => x.erro(e)); this.esperando.clear(); });
      w.on('exit', () => { this.trabalhador = null; this.pronto = null; });
      await new Promise<void>((ok) => w.once('message', () => ok()));
      this.trabalhador = w;
    })().catch((e) => { this.pronto = null; throw e; });   // falha na partida não fica guardada: a próxima chamada tenta de novo
    return this.pronto;
  }

  enviar(msg: Record<string, unknown>): Promise<unknown> {
    // uma execução por vez em cada quadro, como no Google para o mesmo usuário (e o trabalhador é síncrono)
    const chegou = Date.now();
    const ex: Execucao = { ...descrever(msg), quadro: this.nome, chegou: new Date(chegou).toISOString(), filaMs: 0, ops: {}, rede: {} };
    const p = this.fila.then(async () => {
      ex.filaMs = Date.now() - chegou;
      execucoes.push(ex); if (execucoes.length > 60) execucoes.shift();
      this.atual = ex;
      const t0 = Date.now();
      try {
        if (!this.trabalhador) ex.frio = true;
        await this.iniciar();
        const extra = this.nome === 'principal' ? { props: await propsDoPrincipal() } : {};
        const id = ++this.seq;
        const r = await new Promise((ok, erro) => { this.esperando.set(id, { ok, erro }); this.trabalhador!.postMessage({ id, ...msg, ...extra }); });
        ex.ok = !(typeof r === 'string' && r.startsWith('{"ok":false'));
        if (!ex.ok) ex.erro = String(r).slice(0, 200);
        return r;
      } catch (e) { ex.ok = false; ex.erro = (e as Error).message.slice(0, 200); throw e; }
      finally {
        ex.ms = Date.now() - t0; this.atual = null;
        consulta(`INSERT INTO execucao (quadro, fn, ms, fila_ms, ok, erro, frio, rede) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [ex.quadro, ex.fn, ex.ms, ex.filaMs, ex.ok ?? null, ex.erro ?? null, !!ex.frio, JSON.stringify(ex.rede)]).catch(() => null);
      }
    });
    this.fila = p.catch(() => null);
    return p;
  }
  chamar(fn: string, args: unknown[]): Promise<unknown> { return this.enviar({ tipo: 'chamar', fn, args }); }
  /** Liga o trabalhador antes da primeira chamada (partida a frio fora do caminho do usuário). */
  aquecer(): Promise<void> { return this.iniciar().catch(() => undefined); }
}

const TESTE = new Contexto('teste', false, CFG.trello.quadro);
const PRINCIPAL = new Contexto('principal', true, QUADRO_PRINCIPAL_SL, true);
/** Retrato dos pedidos do TESTE no banco (versão 2.0, passo 1): lê o card como o formulário lê, sem gravar nada. */
const RETRATO = new Contexto('retrato', true, CFG.trello.quadro);
/** Liga os trabalhadores do TESTE e do principal assim que o servidor sobe. */
export function aquecerTrabalhadores(): Promise<unknown> { void propsDoPrincipal(); return Promise.all([TESTE.aquecer(), PRINCIPAL.aquecer()]); }
export function retratoDoCard(shortLink: string): Promise<unknown> { return RETRATO.chamar('vdf_carregarCard', [CFG.trello.token, shortLink]); }

/** O doPost do robô: recebe o corpo `{fn, args, rid}` do formulário e devolve o texto JSON da resposta. */
export function executarPost(corpo: string): Promise<string> { return TESTE.enviar({ tipo: 'post', corpo }) as Promise<string>; }
/** Leitura de navegação do quadro principal (só as funções de LEITURAS_PRINCIPAL; quem chama confere). */
export function executarLeituraPrincipal(corpo: string): Promise<string> { return PRINCIPAL.enviar({ tipo: 'post', corpo }) as Promise<string>; }
/** Chama uma função do robô direto (gatilhos, diagnóstico) — quadro do servidor. */
export function chamar(fn: string, args: unknown[]): Promise<unknown> { return TESTE.chamar(fn, args); }
