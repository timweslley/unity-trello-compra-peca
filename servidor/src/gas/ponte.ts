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
import { textoDoArquivo, URL_APP } from '../leitores/ocr.js';
import { tokenGoogle, lerAbaPlanilha, listarAbasPlanilha, gravarLinhasPlanilha, anexarLinhasPlanilha } from '../google/planilha.js';
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
const quadroDe = new Map<string, { q: string; em: number }>();   // 17/10: id → quadro, já perguntado (1 h)
async function quadroNoTrello(tipo: 'cards' | 'checklists' | 'actions' | 'lists', id: string): Promise<string> {
  const g = quadroDe.get(tipo + id);
  if (g && Date.now() - g.em < 3_600_000) return g.q;
  const q = await quadroNoTrello0(tipo, id);
  if (q) { if (quadroDe.size > 5000) quadroDe.clear(); quadroDe.set(tipo + id, { q, em: Date.now() }); }
  return q;
}
async function quadroNoTrello0(tipo: 'cards' | 'checklists' | 'actions' | 'lists', id: string): Promise<string> {
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

/** id do quadro a partir do shortLink (17/10/2026: gravação do principal) — perguntado ao Trello uma vez. */
const idsDeQuadro = new Map<string, string>();
async function idDoQuadroSl(sl: string): Promise<string> {
  if (sl === CFG.trello.quadro) return idDoQuadro();
  if (!idsDeQuadro.has(sl)) { const b = await trello<{ id: string }>(`/boards/${sl}`, { query: { fields: 'id' }, tentativas: 2 }); idsDeQuadro.set(sl, b.id); }
  return idsDeQuadro.get(sl)!;
}

/** Decide se uma gravação no Trello pode ser feita (só no quadro do trabalhador). Devolve o motivo da recusa ou ''. */
export async function conferirEscrita(url: string, metodo: string, corpo: string, quadroSl: string = CFG.trello.quadro): Promise<string> {
  if (metodo === 'GET' || !/^https:\/\/api\.trello\.com\//.test(url)) return '';
  if (CFG.permitirPrincipal) return '';
  const quadro = await idDoQuadroSl(quadroSl);
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
    return l?.listas.some((x) => x.id === alvo) || (/^[a-f0-9]{24}$/.test(alvo) && await quadroNoTrello('lists', alvo) === quadro) ? '' : 'card novo em lista de fora do quadro';
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
  if (/^\/lists\/[a-f0-9]{24}$/.test(c)) return 10 * 60_000;                           // nome da lista (10/10/2026)
  return 0;
}

// ---------- leituras do PRINCIPAL guardadas, sempre conferidas (velocidade, 10/10/2026 — pedido da sessão do formulário) ----------
// O card do Trello (com checklists, anexos, campos) e as listas de cards do quadro ficam guardados. Antes de usar, o servidor
// confere com UMA consulta leve se mudou algo (data da última atividade + última ação do card/quadro + campos personalizados).
// Mudou ou não conferiu → lê ao vivo, como antes. Nada disso vale para o TESTE (que grava).
type Carimbo = { valor: string; ultima: number; id?: string; shortLink?: string };
const apelidoCard = new Map<string, string>();   // shortLink → id (a mesma conferência vale para os dois)
const guardadoPrincipal = new Map<string, { carimbo: string; em: number; r: Resposta }>();
const conferidosNaExecucao = new WeakMap<Execucao, Map<string, Promise<Carimbo | null>>>();
const IDADE_MAX_GUARDADO = 15 * 60_000;

function alvoDoPrincipal(url: string): { tipo: 'card' | 'quadro'; ref: string } | null {
  let u: URL; try { u = new URL(url); } catch { return null; }
  if (u.host !== 'api.trello.com') return null;
  const c = u.pathname.replace(/^\/1/, '');
  let m = c.match(/^\/cards\/([A-Za-z0-9]{8}|[a-f0-9]{24})(\/(actions|checklists|attachments|customFieldItems|labels))?$/);
  if (m) return { tipo: 'card', ref: m[1] };
  m = c.match(/^\/boards\/([A-Za-z0-9]{8}|[a-f0-9]{24})\/(cards|checklists|actions)(\/[a-z]+)?$/);
  if (m) return { tipo: 'quadro', ref: m[1] };
  return null;
}

/** Consulta leve que diz se o card/quadro mudou: devolve um "carimbo" que muda a cada alteração. */
async function carimboAoVivo(tipo: 'card' | 'quadro', ref: string, auth: { key: string; token: string }): Promise<Carimbo | null> {
  const base = 'https://api.trello.com/1/' + (tipo === 'card' ? 'cards/' : 'boards/') + ref;
  const q = new URLSearchParams({ key: auth.key, token: auth.token, fields: tipo === 'card' ? 'id,shortLink,dateLastActivity,idList,closed' : 'dateLastActivity',
    actions: 'all', actions_limit: '1', action_fields: 'id,date' });
  if (tipo === 'card') q.set('customFieldItems', 'true');
  const r = await fetch(base + '?' + q.toString(), { signal: AbortSignal.timeout(8000) });
  if (r.status !== 200) return null;
  const j = await r.json() as { id?: string; shortLink?: string; dateLastActivity?: string; idList?: string; closed?: boolean; actions?: Array<{ id: string; date: string }>; customFieldItems?: unknown };
  const ultimaAcao = j.actions && j.actions[0];
  const valor = [j.dateLastActivity, j.idList, j.closed, ultimaAcao?.id, JSON.stringify(j.customFieldItems ?? null)].join('|');
  const ultima = Math.max(Date.parse(j.dateLastActivity || '') || 0, Date.parse(ultimaAcao?.date || '') || 0);
  if (j.id && j.shortLink) apelidoCard.set(j.shortLink, j.id);
  return { valor, ultima, id: j.id, shortLink: j.shortLink };
}

/** Até quando as leituras do principal ignoram o que está guardado (marcado a cada gravação pelo servidor). */
let gravouAte = 0;
export function marcarGravacaoPrincipal(): void { gravouAte = Date.now() + 30_000; guardadoPrincipal.clear(); abasGuardadas.delete('TRAVA'); }

async function buscarPrincipal(p: Pedido, ctx: Contexto): Promise<Resposta | null> {
  const alvo = alvoDoPrincipal(p.url);
  const ex = ctx.atual;
  if (!alvo || !ex || !ex.usarGuardado) return null;
  // 17/10/2026 (teste das cópias): logo depois de uma gravação pelo servidor o Trello ainda pode devolver o carimbo antigo
  // (data da última atividade atrasa ~1 s) — a releitura do formulário via o card de antes. Por 30 s lê tudo ao vivo.
  if (Date.now() < gravouAte) return null;
  const u = new URL(p.url);
  const auth = { key: u.searchParams.get('key') || '', token: u.searchParams.get('token') || '' };
  if (!auth.key || !auth.token) return null;
  let conferidos = conferidosNaExecucao.get(ex);
  if (!conferidos) { conferidos = new Map(); conferidosNaExecucao.set(ex, conferidos); }
  const ref = alvo.tipo === 'card' ? (apelidoCard.get(alvo.ref) || alvo.ref) : alvo.ref;
  const chaveAlvo = alvo.tipo + ':' + ref;
  if (!conferidos.has(chaveAlvo)) {
    const pr = carimboAoVivo(alvo.tipo, ref, auth).catch(() => null);
    conferidos.set(chaveAlvo, pr);
    const mapa = conferidos;
    void pr.then((c) => { if (c && c.id) { mapa.set('card:' + c.id, pr); if (c.shortLink) mapa.set('card:' + c.shortLink, pr); } });
  }
  const carimbo = await conferidos.get(chaveAlvo)!;
  if (carimbo) ex.ultimaAtividade = Math.max(ex.ultimaAtividade || 0, carimbo.ultima);
  const chave = p.url;
  const g = guardadoPrincipal.get(chave);
  if (carimbo && g && g.carimbo === carimbo.valor && Date.now() - g.em < IDADE_MAX_GUARDADO) {
    ex.guardado = (ex.guardado || 0) + 1;
    return g.r;
  }
  const r = await buscarRede(p);
  ex.aoVivo = (ex.aoVivo || 0) + 1;
  if (carimbo && r.status === 200) {
    if (guardadoPrincipal.size > 3000) guardadoPrincipal.clear();
    guardadoPrincipal.set(chave, { carimbo: carimbo.valor, em: Date.now(), r });
  }
  return r;
}

/* Abas da planilha lidas ao vivo no principal (TRAVA = descrição completa, FORNECEDORES = cadastro): guardadas em memória.
   TRAVA só vale se foi lida DEPOIS da última atividade do card desta execução (o robô grava a TRAVA antes do Trello) e por no
   máximo 2 min; FORNECEDORES por 5 min. */
const abasGuardadas = new Map<string, { em: number; v: unknown[][] }>();
async function abaDoPrincipal(nome: string, ex: Execucao | null): Promise<unknown[][]> {
  const g = abasGuardadas.get(nome);
  const idadeMax = nome === 'TRAVA' ? 2 * 60_000 : 5 * 60_000;
  const depoisDaAtividade = nome !== 'TRAVA' || !ex || !ex.ultimaAtividade || (g && g.em > ex.ultimaAtividade + 10_000);
  if (g && Date.now() - g.em < idadeMax && depoisDaAtividade) {
    if (ex) ex.guardado = (ex.guardado || 0) + 1;
    return g.v;
  }
  const em = Date.now();
  const v = (await lerAbaPlanilha(CFG.planilhaId, nome)).map(reviverData(ABAS_COPIADAS[nome] || []));
  abasGuardadas.set(nome, { em, v });
  if (ex) ex.aoVivo = (ex.aoVivo || 0) + 1;
  return v;
}

/** 17/10/2026 — Drive (só leitura) com a conta do servidor: bases de orçamento na pasta compartilhada pelo Weslley. */
/** Cache compartilhado entre os trabalhadores (travas sg_* do robô e do formulário). */
const cacheCompart = new Map<string, { v: string; ate: number }>();
const cacheObs = new Map<string, { v: string; ate: number }>();
const ESCOPO_DRIVE = 'https://www.googleapis.com/auth/drive.readonly';
const CAMPOS_DRIVE = 'id,name,mimeType,modifiedTime,trashed,parents';
async function driveApi(caminho: string, q: Record<string, string> = {}, bin = false): Promise<any> {   // eslint-disable-line @typescript-eslint/no-explicit-any
  const u = new URL('https://www.googleapis.com/drive/v3/' + caminho);
  for (const [k, v] of Object.entries({ supportsAllDrives: 'true', ...q })) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { Authorization: 'Bearer ' + await tokenGoogle(ESCOPO_DRIVE) }, signal: AbortSignal.timeout(60_000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Drive ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return bin ? new Uint8Array(await r.arrayBuffer()) : r.json();
}
const nomesPasta = new Map<string, string>();
async function infoDrive(f: { id: string; name: string; mimeType: string; modifiedTime: string; trashed?: boolean; parents?: string[] }) {
  const pais = [] as Array<{ id: string; nome: string }>;
  for (const p of f.parents || []) {
    if (!nomesPasta.has(p)) { const x = await driveApi('files/' + p, { fields: 'id,name' }).catch(() => null); nomesPasta.set(p, x?.name || ''); }
    pais.push({ id: p, nome: nomesPasta.get(p)! });
  }
  return { id: f.id, nome: f.name, tipo: f.mimeType, modificado: f.modifiedTime, lixeira: !!f.trashed, pais };
}
async function driveLer(op: string, d: any): Promise<unknown> {   // eslint-disable-line @typescript-eslint/no-explicit-any
  if (op === 'drive.info') { const f = await driveApi('files/' + encodeURIComponent(d), { fields: CAMPOS_DRIVE }); return f ? infoDrive(f) : null; }
  if (op === 'drive.ler') return { dados: await driveApi('files/' + encodeURIComponent(d), { alt: 'media' }, true) };
  const q = op === 'drive.buscar' ? String(d)
    : `'${String(d.pai).replace(/'/g, "\\'")}' in parents and name = '${String(d.nome).replace(/'/g, "\\'")}' and trashed = false and mimeType ${d.pasta ? '=' : '!='} 'application/vnd.google-apps.folder'`;
  const r = await driveApi('files', { q: q.replace(/"([^"]*)"/g, "'$1'"), fields: 'files(' + CAMPOS_DRIVE + ')', pageSize: '100', includeItemsFromAllDrives: 'true', corpora: 'allDrives' });
  return Promise.all(((r?.files || []) as Array<Parameters<typeof infoDrive>[0]>).map(infoDrive));
}

async function buscar(p: Pedido, ctx: Contexto) {
  // 17/10/2026 — robô no servidor em OBSERVAR: nenhuma gravação sai; cada uma fica anotada (o que ele faria) e volta uma resposta falsa
  if (ctx.observar && p.metodo !== 'GET' && /api\.trello\.com/.test(p.url)) return anotarEscrita(p, ctx);
  if (ctx.somenteLeitura && p.metodo !== 'GET') {
    return { status: 403, cab: { 'content-type': 'text/plain' }, corpo: new TextEncoder().encode('servidor: no quadro principal o servidor só lê') };
  }
  if (ctx.nome === 'principal' && p.metodo === 'GET') {
    const r = await buscarPrincipal(p, ctx);
    if (r) return r;
  }
  const ttl = p.metodo === 'GET' ? validadeMemoria(p.url) : 0;
  const chave = ttl ? p.url + '|' + (p.cabecalhos.Authorization || p.cabecalhos.authorization || '') : '';
  if (ttl) {
    const m = memoria.get(chave);
    if (m && m.ate > Date.now()) { memoriaUsos++; return m.r; }
  } else if (p.metodo !== 'GET' && /api\.trello\.com\/1\/(boards|lists|labels|customFields)/.test(p.url)) {
    memoria.clear();   // mudou a estrutura do quadro: esquece tudo
  }
  const r = await buscarRede(p, ctx.quadro);
  if (ttl && r.status === 200) {
    if (memoria.size > 500) memoria.clear();
    memoria.set(chave, { ate: Date.now() + ttl, r });
  }
  return r;
}

async function buscarRede(p: Pedido, quadroSl?: string): Promise<Resposta> {
  const corpoTexto = p.corpo.tipo === 'texto' ? p.corpo.texto : '';
  const recusa = await conferirEscrita(p.url, p.metodo, corpoTexto, quadroSl);
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
      if (ctx.nome === 'principal' && ctx.atual?.usarGuardado) return abaDoPrincipal(d, ctx.atual);
      return (await lerAbaPlanilha(CFG.planilhaId, d)).map(reviverData(ABAS_COPIADAS[d] || []));
    }
    default: return atender(op, d, ctx);
  }
}

/** 17/10/2026 — chamada ao Apps Script (o robô do Google) como servidor: mesmo protocolo do formulário. */
async function chamarAppsScript(fn: string, args: unknown[], prazoMs = 30_000): Promise<unknown> {
  const r = await fetch(URL_APP, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ fn, args }), signal: AbortSignal.timeout(prazoMs) });
  const j = await r.json() as { ok?: boolean; r?: unknown; erro?: string };
  if (!j || !j.ok) throw new Error('Apps Script ' + fn + ': ' + (j?.erro || 'resposta inválida'));
  return j.r;
}
/** Todas as Propriedades do Script do robô do Google, lidas AGORA. */
async function propsAoVivo(): Promise<Record<string, string>> {
  const r = await chamarAppsScript('vdf_servidorProps', [CFG.trello.token, { ler: true }]) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(r || {}).map(([k, v]) => [k, String(v)]));
}
/**
 * Cópia das propriedades do robô para as gravações (17/10/2026): ler e devolver ao Apps Script a cada chamada custava 5–10 s.
 * A cópia vale até 5 min (mais velha que isso a chamada espera a leitura nova); com mais de 15 s é renovada em segundo plano.
 * O que o servidor grava entra na cópia na hora e vai ao Apps Script em segundo plano, em ordem (a TRAVA do robô só
 * confere descrições com mais de 40 s, então a assinatura chega antes).
 */
let espelhoProps: { v: Record<string, string>; em: number } | null = null;
let renovandoProps: Promise<void> | null = null;
/** 17/10/2026: o que o servidor gravou nos últimos 3 min vale sobre a leitura do Apps Script (a devolução pode não ter chegado). */
const escritasRecentes = new Map<string, { v: string | null; em: number }>();
function lembrarEscritas(set: Record<string, string>, del: string[]): void {
  const agora = Date.now();
  for (const [k, v] of Object.entries(set)) escritasRecentes.set(k, { v, em: agora });
  for (const k of del) escritasRecentes.set(k, { v: null, em: agora });
}
function renovarProps(): Promise<void> {
  const inicio = Date.now();
  if (!renovandoProps) renovandoProps = propsAoVivo().then((v) => {
    for (const [k, x] of escritasRecentes) {
      if (Date.now() - x.em > 180_000) { escritasRecentes.delete(k); continue; }
      if (x.em >= inicio - 60_000) { if (x.v === null) delete v[k]; else v[k] = x.v; }
    }
    espelhoProps = { v, em: Date.now() };
  })
    .finally(() => { renovandoProps = null; });
  return renovandoProps;
}
/** Card de teste do principal (TST_CARDS do robô) — com a gravação desligada, só eles gravam pelo servidor (conferência). */
export async function ehCardTesteDoPrincipal(ref: string): Promise<boolean> {
  if (!ref) return false;
  try { const lista = JSON.parse((await propsParaGravacao()).TST_CARDS || '[]') as string[]; return lista.includes(ref); } catch { return false; }
}
async function propsParaGravacao(): Promise<Record<string, string>> {
  const idade = espelhoProps ? Date.now() - espelhoProps.em : Infinity;
  // 17/10/2026: Apps Script lento/fora → segue com a cópia que tem (até 30 min); sem cópia nenhuma, aí sim falha
  if (idade > 5 * 60_000) { try { await renovarProps(); } catch (e) { if (!espelhoProps || idade > 30 * 60_000) throw e; console.warn('[props] usando cópia de', Math.round(idade / 1000), 's:', (e as Error).message); } }
  else if (idade > 15_000) renovarProps().catch((e) => console.error('props (segundo plano):', (e as Error).message));
  return { ...espelhoProps!.v };
}
let filaDevolver: Promise<unknown> = Promise.resolve();
let abasReaisCache: { v: string[]; em: number } | null = null;
async function abasReais(): Promise<string[]> {
  if (!CFG.planilhaId) return [];
  if (!abasReaisCache || Date.now() - abasReaisCache.em > 10 * 60_000) abasReaisCache = { v: await listarAbasPlanilha(CFG.planilhaId), em: Date.now() };
  return abasReaisCache.v;
}

/**
 * 17/10/2026 — gravações do quadro principal pelo servidor (passo 2 da virada): o código do robô roda aqui, mas as
 * Propriedades do Script e a planilha são as REAIS do robô do Google — propriedades lidas no começo de cada chamada e
 * gravadas de volta no fim (vdf_servidorProps, com a trava do script); planilha lida e gravada ao vivo (linhas novas
 * entram por "append", sem disputar o número da linha com o robô).
 */
async function atenderRemoto(op: string, d: any, ctx: Contexto): Promise<unknown> {   // eslint-disable-line @typescript-eslint/no-explicit-any
  switch (op) {
    case 'cache.licenca': { const x = d as { k: string; v: string; seg: number }; ctx.licencas[x.k] = { v: x.v, seg: x.seg }; return null; }
    case 'email': if (ctx.observar) { if (ctx.atual) (ctx.atual.escritas ||= []).push({ m: 'EMAIL', c: String(d?.para || ''), b: String(d?.assunto || '').slice(0, 200) }); }
      else ctx.emails.push(d);   // o Apps Script (conta do robô) envia no fim da chamada
      return null;
    case 'props.gravar':
      for (const [k, v] of Object.entries(d as Record<string, string>)) { ctx.pend.set[k] = String(v); ctx.pend.del.delete(k); }
      return null;
    case 'props.apagar':
      for (const k of d as string[]) { delete ctx.pend.set[k]; ctx.pend.del.add(k); }
      return null;
    case 'aba.existe': return d === 'backup' || (await abasReais()).includes(d);
    case 'aba.lista': return ['backup', ...(await abasReais()).filter((n) => n !== 'backup')];
    case 'aba.criar': console.warn('[gravação do principal] aba nova não criada pelo servidor:', d?.nome); return null;
    case 'aba.ler': {
      if (d === 'backup' || !CFG.planilhaId || !(await abasReais()).includes(d)) { ctx.tam[d] = 0; return []; }
      const v = (await lerAbaPlanilha(CFG.planilhaId, d)).map(reviverData(ABAS_COPIADAS[d] || []));
      ctx.tam[d] = v.length;
      return v;
    }
    case 'aba.gravar': {
      // 17/10/2026: as gravações da planilha juntam até o fim da chamada (31 gravações = 11 s; juntas = 2 chamadas)
      if (!CFG.planilhaId || d.nome === 'backup' || !(await abasReais()).includes(d.nome)) return null;
      const tam = ctx.tam[d.nome] ?? 0, b = (ctx.bufAbas[d.nome] = ctx.bufAbas[d.nome] || { fixas: {}, novas: {} });
      for (const [n, v] of Object.entries(d.linhas as Record<string, unknown[]>)) { if (+n > tam) b.novas[n] = v; else b.fixas[n] = v; }
      return null;
    }
    case 'gatilho': console.warn('[gravação do principal] gatilho fica com o robô do Google:', d?.fn); return null;
    default: return atender(op, d, ctx);
  }
}

async function atender(op: string, d: any, ctx: Contexto): Promise<unknown> {   // eslint-disable-line @typescript-eslint/no-explicit-any
  switch (op) {
    case 'cache.licenca': return null;   // só interessa nas gravações remotas (atenderRemoto)
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
    case 'drive.buscar': case 'drive.info': case 'drive.filhos': case 'drive.ler': return driveLer(op, d);
    case 'cache.comp': {
      const cacheComp = ctx.observar ? cacheObs : cacheCompart;   // robô em OBSERVAR não trava o formulário
      // 19/10/2026: em OBSERVAR o robô também LÊ o que é real (licenças e travas gravadas pelo formulário), só não escreve lá
      const x = cacheComp.get(d.k) || (ctx.observar && d.op === 'get' ? cacheCompart.get(d.k) : undefined);
      if (d.op === 'get') return x && x.ate > Date.now() ? x.v : null;
      if (d.op === 'put') cacheComp.set(d.k, { v: d.v, ate: Date.now() + Math.min(+d.seg || 600, 21600) * 1000 }); else cacheComp.delete(d.k);
      if (cacheComp.size > 2000) for (const [k, y] of cacheComp) if (y.ate < Date.now()) cacheComp.delete(k);
      return null;
    }
    case 'arq.criar': {
      const id = 'arq-' + randomUUID();
      await consulta(`INSERT INTO gas_arquivo (id, nome, tipo, dados, pasta) VALUES ($1,$2,$3,$4,$5)`, [id, d.nome, d.tipo, Buffer.from(d.dados), d.pasta]);
      return id;
    }
    case 'arq.info': { const [a] = await consulta<{ nome: string; tipo: string; pasta: string | null }>(`SELECT nome, tipo, pasta FROM gas_arquivo WHERE id = $1 AND NOT lixeira`, [d]); return a || null; }
    case 'arq.ler': { const [a] = await consulta<{ nome: string; tipo: string; dados: Buffer }>(`SELECT nome, tipo, dados FROM gas_arquivo WHERE id = $1`, [d]); return a ? { ...a, dados: new Uint8Array(a.dados || []) } : null; }
    case 'arq.renomear': await consulta(`UPDATE gas_arquivo SET nome = $2 WHERE id = $1`, [d.id, d.nome]); return null;
    case 'arq.lixeira': await consulta(`UPDATE gas_arquivo SET lixeira = $2, dados = CASE WHEN $2 THEN NULL ELSE dados END WHERE id = $1`, [d.id, d.lixeira]); return null;
    case 'arq.texto': { const [a] = await consulta<{ texto: string }>(`SELECT texto FROM gas_arquivo WHERE id = $1`, [d]); return a?.texto ?? ''; }
    case 'ocr': {
      // 16/10/2026: o MESMO texto do robô (OCR do Google pelo Apps Script), guardado por hash; pdftotext só de reserva
      const { texto } = await textoDoArquivo(Buffer.from(d.dados), d.nome || 'arquivo', d.tipo);
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
  /** robô em OBSERVAR: as gravações que ele faria */
  escritas?: Array<{ m: string; c: string; b: string }>;
  propsObs?: string[];
  fn: string; rid?: string; quadro?: string; chegou: string; frio?: boolean; filaMs: number; ms?: number; ok?: boolean; erro?: string;
  /** por operação pedida pelo trabalhador: quantas vezes e quanto tempo (ms) */
  ops: Record<string, { n: number; ms: number }>;
  /** chamadas de rede por destino (host + 1º trecho do caminho) */
  rede: Record<string, { n: number; ms: number }>;
  /** principal: respostas servidas da memória (conferidas) × lidas ao vivo; última atividade vista nos cards conferidos */
  guardado?: number; aoVivo?: number; ultimaAtividade?: number; usarGuardado?: boolean;
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
/** 19/10/2026 — tamanho das Propriedades do Script do robô (só nomes/tamanhos por prefixo, nunca os valores). */
export async function tamanhoProps(): Promise<unknown> {
  const v = await propsParaGravacao();
  let tot = 0; const por: Record<string, { n: number; kb: number }> = {}; const maiores: Array<[string, number]> = [];
  for (const [k, val] of Object.entries(v)) {
    const t = k.length + String(val).length; tot += t;
    const pre = (k.match(/^[A-Z]+_[A-Z0-9]*_?/) || [k])[0];
    (por[pre] ||= { n: 0, kb: 0 }).n++; por[pre].kb += t / 1024;
    maiores.push([k.replace(/[0-9a-f]{24}/g, '<id>'), t]);
  }
  maiores.sort((a, b) => b[1] - a[1]);
  const top = Object.entries(por).sort((a, b) => b[1].kb - a[1].kb).slice(0, 25).map(([p, x]) => ({ p, n: x.n, kb: Math.round(x.kb * 10) / 10 }));
  return { ok: true, chaves: Object.keys(v).length, kb: Math.round(tot / 1024), idadeSeg: espelhoProps ? Math.round((Date.now() - espelhoProps.em) / 1000) : null, porPrefixo: top, maiores: maiores.slice(0, 15).map(([k, t]) => ({ k, kb: Math.round(t / 102.4) / 10 })) };
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
  /** gravação remota (17/10/2026): propriedades a devolver ao Apps Script no fim da chamada e tamanho das abas lidas */
  pend: { set: Record<string, string>; del: Set<string> } = { set: {}, del: new Set() };
  tam: Record<string, number> = {};
  bufAbas: Record<string, { fixas: Record<string, unknown[]>; novas: Record<string, unknown[]> }> = {};
  licencas: Record<string, { v: string; seg: number }> = {};
  emails: Array<Record<string, unknown>> = [];
  marcadores = new Map<string, string>();
  constructor(readonly nome: 'teste' | 'principal' | 'retrato' | 'principalGrava' | 'testeRemoto' | 'robo', readonly somenteLeitura: boolean, readonly quadro: string, readonly abasAoVivo = false, readonly remoto = false, public observar = false) {}

  private fixas(): Record<string, string> {
    return {
      TRELLO_KEY: CFG.trello.chave, TRELLO_TOKEN: CFG.trello.token, VD_PLANILHA_BACKUP: 'planilha-servidor',
      VD_BOARD: this.quadro,
      // links ✏️/💰: no TESTE o atalho que abre o formulário com srv=1; no principal o formulário de sempre
      VD_URL_FORM: (this.nome === 'principal' || this.nome === 'principalGrava') ? 'https://timweslley.github.io/unity-trello-compra-peca/powerup/formulario.html'
        : 'https://timweslley.github.io/unity-trello-compra-peca/powerup/servidor.html',
    };
  }

  private iniciar(): Promise<void> {
    if (this.pronto) return this.pronto;
    this.pronto = (async () => {
      const props = (this.nome === 'principal' || this.remoto) ? {} : await propsIniciais();   // principal: vêm do Apps Script a cada chamada
      const sinal = new SharedArrayBuffer(4);
      const flag = new Int32Array(sinal);
      const { port1, port2 } = new MessageChannel();
      const w = new Worker(path.join(AQUI, 'trabalhador.js'), {
        workerData: { porta: port2, sinal, arquivo: ARQUIVO_ROBO, props, fixas: this.fixas(), somenteLeitura: this.somenteLeitura }, transferList: [port2] });
      port1.on('message', async (m: { op: string; dados: unknown }) => {
        let resp: { ok: boolean; r?: unknown; erro?: string };
        const t0 = Date.now();
        try { resp = { ok: true, r: await (this.somenteLeitura ? atenderLeitura(m.op, m.dados, this) : this.remoto ? atenderRemoto(m.op, m.dados, this) : atender(m.op, m.dados, this)) }; }
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

  enviar(msg: Record<string, unknown>, opcoes: { usarGuardado?: boolean } = {}): Promise<unknown> {
    // uma execução por vez em cada quadro, como no Google para o mesmo usuário (e o trabalhador é síncrono)
    const chegou = Date.now();
    const ex: Execucao = { ...descrever(msg), quadro: this.nome, chegou: new Date(chegou).toISOString(), filaMs: 0, ops: {}, rede: {}, ...(opcoes.usarGuardado ? { usarGuardado: true } : {}) };
    const p = this.fila.then(async () => {
      ex.filaMs = Date.now() - chegou;
      execucoes.push(ex); if (execucoes.length > 60) execucoes.shift();
      this.atual = ex;
      const t0 = Date.now();
      try {
        if (!this.trabalhador) ex.frio = true;
        await this.iniciar();
        let extra: Record<string, unknown> = this.nome === 'principal' ? { props: await propsDoPrincipal() } : {};
        if (this.remoto) {
          this.pend = { set: {}, del: new Set() }; this.tam = {}; this.bufAbas = {}; this.licencas = {}; this.emails = [];
          try { extra = { props: await propsParaGravacao(), propsTrocar: true }; } catch (e) { throw new Error('servidor (nada gravado): ' + (e as Error).message); }
          if (this.nome === 'robo') this.observar = process.env.ROBO_SERVIDOR !== 'ATIVO';
          // OBSERVAR: o robô-sombra anda com os PRÓPRIOS marcadores de ações (senão só veria o que o Google já tratou)
          if (this.observar && this.marcadores.size) { const pr = (extra as { props: Record<string, string> }).props; for (const [k, v] of this.marcadores) pr[k] = v; }
        }
        const id = ++this.seq;
        let r: unknown;
        try { r = await new Promise((ok, erro) => { this.esperando.set(id, { ok, erro }); this.trabalhador!.postMessage({ id, ...msg, ...extra }); }); }
        finally { if (this.remoto && this.observar) { ex.ops['observar'] = { n: Object.keys(this.pend.set).length + this.pend.del.size, ms: Object.keys(this.bufAbas).length };
          for (const [k, v] of Object.entries(this.pend.set)) if (/(_ACT|ULTIMA|DESDE|VERIFICACAO)/.test(k)) this.marcadores.set(k, v);
          ex.propsObs = [...Object.keys(this.pend.set), ...[...this.pend.del].map((k) => '-' + k)].slice(0, 60); this.bufAbas = {}; this.licencas = {}; }
          else if (this.remoto) { await this.gravarAbas(ex); await this.enviarLicencas(ex); this.devolverProps(ex); if (this.quadro === QUADRO_PRINCIPAL_SL) marcarGravacaoPrincipal(); } }   // mesmo com erro no meio: o que já foi gravado no Trello fica assinado (em segundo plano)
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
  /** Grava na planilha real o que a chamada juntou (uma chamada por aba para as linhas que mudaram e outra para as novas). */
  private async gravarAbas(ex: Execucao): Promise<void> {
    const t0 = Date.now(), n = Object.keys(this.bufAbas).length;
    try { await this.gravarAbas2(ex); } finally { if (n) ex.ops['planilha.fim'] = { n, ms: Date.now() - t0 }; }
  }
  private async gravarAbas2(ex: Execucao): Promise<void> {
    for (const [aba, b] of Object.entries(this.bufAbas)) {
      const novas = Object.entries(b.novas).sort((x, y) => +x[0] - +y[0]).map(([, v]) => v);
      try {
        await gravarLinhasPlanilha(CFG.planilhaId, aba, b.fixas);
        await anexarLinhasPlanilha(CFG.planilhaId, aba, novas);
      } catch (e) {
        // a planilha é cópia de segurança/registro: falha nela não desfaz a gravação no Trello — fica guardada para refazer
        console.error('[gravação do principal] planilha', aba, (e as Error).message);
        ex.erro = ('planilha ' + aba + ': ' + (e as Error).message).slice(0, 200);
        await consulta(`INSERT INTO guardado (nome, valor, em) VALUES ($1, $2, now()) ON CONFLICT (nome) DO UPDATE SET valor = EXCLUDED.valor, em = now()`,
          ['planilha_pendente_' + Date.now() + '_' + aba, JSON.stringify({ aba, fixas: b.fixas, novas })]).catch(() => null);
      }
    }
    this.bufAbas = {};
  }
  /** Licenças das travas (checklist/coluna) no cache do Apps Script — ANTES de responder: o robô confere a cada minuto
   * (e só ações com mais de 90 s, desde 17/10/2026). Falhou: segue em segundo plano com as propriedades. */
  private async enviarLicencas(ex: Execucao): Promise<void> {
    const lic = this.licencas; this.licencas = {};
    const emails = this.emails; this.emails = [];
    if (emails.length) filaDevolver = filaDevolver.then(() => chamarAppsScript('vdf_servidorProps', [CFG.trello.token, { emails }], 60_000)).catch((e) => console.error('[robô] e-mail:', (e as Error).message));
    if (!Object.keys(lic).length) return;
    const t0 = Date.now();
    try { await chamarAppsScript('vdf_servidorProps', [CFG.trello.token, { cache: lic }], 15_000); }
    catch (e) {
      console.error('[gravação do principal] licenças', (e as Error).message);
      filaDevolver = filaDevolver.then(() => chamarAppsScript('vdf_servidorProps', [CFG.trello.token, { cache: lic }], 40_000)).catch(() => null);
    } finally { ex.ops['licencas'] = { n: Object.keys(lic).length, ms: Date.now() - t0 }; }
  }
  /** Devolve ao Apps Script as propriedades que a chamada mudou (assinatura da TRAVA etc.) — até 3 tentativas. */
  private devolverProps(ex: Execucao): void {
    const set = this.pend.set, del = [...this.pend.del];
    if (!Object.keys(set).length && !del.length) return;
    if (espelhoProps) { Object.assign(espelhoProps.v, set); del.forEach((k) => delete espelhoProps!.v[k]); }
    lembrarEscritas(set, del);
    filaDevolver = filaDevolver.then(() => this.enviarProps(ex, set, del)).catch(() => null);
  }
  private async enviarProps(ex: Execucao, set: Record<string, string>, del: string[]): Promise<void> {
    let erro = '';
    for (let i = 0; i < 3; i++) {
      try { await chamarAppsScript('vdf_servidorProps', [CFG.trello.token, { set, del }], 40_000); await refazerPropsPendentes(); return; }
      catch (e) { erro = (e as Error).message; await new Promise((ok) => setTimeout(ok, 1500 * (i + 1))); }
    }
    ex.erro = ('propriedades não devolvidas ao Apps Script: ' + erro).slice(0, 200);
    console.error('[gravação do principal] ' + ex.erro, Object.keys(set), del);
    await consulta(`INSERT INTO guardado (nome, valor, em) VALUES ($1, $2, now()) ON CONFLICT (nome) DO UPDATE SET valor = EXCLUDED.valor, em = now()`,
      ['props_pendentes_' + Date.now(), JSON.stringify({ set, del })]).catch(() => null);
  }
  chamar(fn: string, args: unknown[]): Promise<unknown> { return this.enviar({ tipo: 'chamar', fn, args }); }
  /** Liga o trabalhador antes da primeira chamada (partida a frio fora do caminho do usuário). */
  aquecer(): Promise<void> { return this.iniciar().catch(() => undefined); }
}

/** 17/10/2026: devoluções de propriedades que falharam (trava do robô ocupada) são refeitas na ordem, depois da próxima
 * devolução que der certo. Refazer é seguro: a TRAVA confere a descrição oficial na aba TRAVA antes de restaurar. */
let refazendo = false;
async function refazerPropsPendentes(): Promise<number> {
  if (refazendo) return 0; refazendo = true; let n = 0;
  try {
    const linhas = await consulta<{ nome: string; valor: string }>(`SELECT nome, valor FROM guardado WHERE nome LIKE 'props_pendentes_%' ORDER BY nome LIMIT 10`);
    for (const l of linhas) {
      const v = (typeof l.valor === 'string' ? JSON.parse(l.valor) : l.valor) as { set: Record<string, string>; del: string[] };
      await chamarAppsScript('vdf_servidorProps', [CFG.trello.token, { set: v.set || {}, del: v.del || [] }], 40_000);
      await consulta(`DELETE FROM guardado WHERE nome = $1`, [l.nome]); n++;
    }
  } catch (e) { console.error('[gravação do principal] refazer propriedades', (e as Error).message); }
  finally { refazendo = false; }
  return n;
}
/** Resumo das gravações pendentes (sem conteúdo de card): nomes das abas, número de linhas e chaves de propriedades. */
export async function resumoPendentes(): Promise<unknown> {
  const linhas = await consulta<{ nome: string; valor: string; em: string }>(`SELECT nome, valor, em FROM guardado WHERE nome LIKE 'props_pendentes_%' OR nome LIKE 'planilha_pendente_%' ORDER BY nome`).catch(() => []);
  return linhas.map((l) => {
    let v: Record<string, unknown> = {}; try { v = typeof l.valor === 'string' ? JSON.parse(l.valor) : (l.valor as Record<string, unknown>); } catch { /* */ }
    return l.nome.startsWith('props') ? { nome: l.nome, em: l.em, chaves: Object.keys((v.set as object) || {}), apagar: v.del }
      : { nome: l.nome, em: l.em, aba: v.aba, linhasFixas: Object.keys((v.fixas as object) || {}), novas: ((v.novas as unknown[]) || []).length };
  });
}
export { refazerPropsPendentes };

const TESTE = new Contexto('teste', false, CFG.trello.quadro);
const PRINCIPAL = new Contexto('principal', true, QUADRO_PRINCIPAL_SL, true);
/** Retrato dos pedidos do TESTE no banco (versão 2.0, passo 1): lê o card como o formulário lê, sem gravar nada. */
const RETRATO = new Contexto('retrato', true, CFG.trello.quadro);
/** 17/10/2026 — gravações do principal pelo servidor (propriedades e planilha reais do robô do Google). */
/** 17/10/2026 — o robô inteiro (ciclo de 1 min e rotinas diárias) no servidor, no quadro principal. Começa em OBSERVAR. */
const ROBO = new Contexto('robo', false, QUADRO_PRINCIPAL_SL, true, true, true);
const obsRobo: Array<Record<string, unknown>> = [];
let roboRodando = false, roboUltimo = 0;
/** Roda uma função do robô no servidor (gatilho do agendador). Uma por vez; no máximo 1 a cada 40 s. */
/** 19/10/2026: licenças das travas gravadas no Apps Script (gravação que caiu no Google) → cache compartilhado daqui,
 *  antes de cada ciclo do robô. ck_/tr_rec_ são listas JSON (junta as duas); st_ok_ é '1'. */
async function trazerLicencasDoGoogle(): Promise<void> {
  const js = (await propsParaGravacao()).LIC_SRV;
  if (!js) return;
  let m: Record<string, [string, number]> = {};
  try { m = JSON.parse(js); } catch { return; }
  const agora = Date.now();
  for (const [k, par] of Object.entries(m)) {
    if (!Array.isArray(par) || !(par[1] > agora) || !/^(ck_|st_ok_|tr_rec_)/.test(k)) continue;
    const atual = cacheCompart.get(k);
    let v = String(par[0]);
    if (atual && atual.ate > agora && /^st_ok_/.test(k)) v = String(Math.max(parseInt(atual.v, 10) || 0, parseInt(v, 10) || 0));   // contador
    else if (atual && atual.ate > agora && /^(ck_|tr_rec_)/.test(k)) {
      try { const a = JSON.parse(atual.v) as unknown[], b = JSON.parse(v) as unknown[]; v = JSON.stringify([...new Set([...a, ...b])].slice(-40)); } catch { /* fica o do Google */ }
    }
    cacheCompart.set(k, { v, ate: Math.max(par[1], atual?.ate || 0) });
  }
}
export async function rodarRobo(fn: string): Promise<Record<string, unknown>> {
  if (!/^(validarDadosPedido|verificarAlteracoesDescricao|rotinaDiaria|relatorioDiario|sd_diario|es_sincronizar|axPadronizarQuadro)$/.test(fn)) return { ok: false, erro: 'função não permitida' };
  if (roboRodando) return { ok: false, erro: 'já rodando' };
  if (fn === 'validarDadosPedido' && Date.now() - roboUltimo < 40_000) return { ok: false, erro: 'rodou há menos de 40 s' };
  roboRodando = true; if (fn === 'validarDadosPedido') roboUltimo = Date.now();
  const t0 = Date.now();
  let erro = '';
  try { await trazerLicencasDoGoogle(); } catch { /* sem cópia das propriedades: segue com o cache daqui */ }
  try { await ROBO.chamar(fn, []); } catch (e) { erro = (e as Error).message.slice(0, 300); }
  finally { roboRodando = false; }
  const ex = execucoes.filter((e) => e.quadro === 'robo').pop();
  const reg = { em: new Date(t0).toISOString(), fn, ms: Date.now() - t0, modo: ROBO.observar ? 'OBSERVAR' : 'ATIVO', erro: erro || undefined,
    escritas: ex?.escritas || [], props: ex?.propsObs,  abas: ex?.ops?.observar?.ms, rede: ex?.rede };
  obsRobo.push(reg); if (obsRobo.length > 120) obsRobo.shift();
  if ((reg.escritas as unknown[]).length) consulta(`INSERT INTO guardado (nome, valor, em) VALUES ($1, $2, now()) ON CONFLICT (nome) DO UPDATE SET valor = EXCLUDED.valor, em = now()`,
    ['robo_obs_' + t0, JSON.stringify(reg)]).catch(() => null);
  return { ok: !erro, ...reg };
}
/** Chave do Apps Script (VD_ROBO_SERVIDOR) acompanhando o modo do servidor: ATIVO aqui = Google parado (reserva). */
async function alinharChaveGoogle(): Promise<string> {
  const quer = process.env.ROBO_SERVIDOR === 'ATIVO' ? 'SIM' : 'NAO';
  const tem = (await propsParaGravacao()).VD_ROBO_SERVIDOR || 'NAO';
  if (tem === quer) return quer;
  await chamarAppsScript('vdf_servidorProps', [CFG.trello.token, { set: { VD_ROBO_SERVIDOR: quer } }], 40_000);
  if (espelhoProps) espelhoProps.v.VD_ROBO_SERVIDOR = quer;
  lembrarEscritas({ VD_ROBO_SERVIDOR: quer }, []);
  console.log('[robô] chave do Google VD_ROBO_SERVIDOR =', quer);
  return quer;
}
const diarias: Array<{ fn: string; hhmm: string }> = [{ fn: 'rotinaDiaria', hhmm: '07:00' }, { fn: 'relatorioDiario', hhmm: '07:15' }];
/** Agendador (Cloud Scheduler, a cada minuto): ciclo do robô, log de descrição e as rotinas diárias na hora. */
export async function minutoRobo(): Promise<Record<string, unknown>> {
  if (roboRodando) return { ok: true, pulado: 'robô ainda rodando' };
  const out: Record<string, unknown> = { modo: process.env.ROBO_SERVIDOR === 'ATIVO' ? 'ATIVO' : 'OBSERVAR' };
  try { out.chaveGoogle = await alinharChaveGoogle(); } catch (e) { out.chaveGoogle = 'erro: ' + (e as Error).message.slice(0, 120); if (out.modo === 'ATIVO') return { ok: false, ...out, erro: 'não consegui parar o robô do Google — nada rodado' }; }
  out.ciclo = await rodarRobo('validarDadosPedido');
  out.log = await rodarRobo('verificarAlteracoesDescricao');
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  const hoje = p.year + '-' + p.month + '-' + p.day, hhmm = p.hour + ':' + p.minute;
  for (const d of diarias) {
    if (hhmm < d.hhmm) continue;
    const k = 'robo_diaria_' + String(out.modo) + '_' + d.fn;
    const [g] = await consulta<{ valor: unknown }>(`SELECT valor FROM guardado WHERE nome = $1`, [k]).catch(() => []);
    if (g && String((g.valor as { dia?: string })?.dia) === hoje) continue;
    await consulta(`INSERT INTO guardado (nome, valor, em) VALUES ($1, $2, now()) ON CONFLICT (nome) DO UPDATE SET valor = EXCLUDED.valor, em = now()`, [k, JSON.stringify({ dia: hoje })]).catch(() => null);
    out[d.fn] = await rodarRobo(d.fn);
  }
  return { ok: true, ...out };
}
export async function testeDrive(): Promise<unknown> {
  const out: Record<string, unknown> = {};
  for (const n of ['CILIA-HOJE.json', 'HDI-HOJE.json', 'SOMA-HOJE.json']) {
    try { const l = await driveLer('drive.buscar', `name = '${n}' and trashed = false`) as Array<{ nome: string; modificado: string; pais: Array<{ nome: string }> }>;
      out[n] = l.map((x) => ({ modificado: x.modificado, pasta: x.pais.map((p) => p.nome).join(',') })); }
    catch (e) { out[n] = 'erro: ' + (e as Error).message.slice(0, 200); }
  }
  return out;
}
/**
 * Comparação OBSERVAR × robô do Google (17/10/2026): o que o servidor faria (gravações anotadas) e o que o robô do Google fez
 * de fato (ações do quadro feitas pela conta do robô) nas últimas `horas`, por card e tipo (comentário, coluna, checklist,
 * anexo, descrição, etiqueta). Sem texto de card na resposta — só ids, tipos e contagens.
 */
const tipoEscrita = (m: string, c: string, b: string): string => {
  if (/\/actions\/comments/.test(c)) return 'comentario';
  if (/checkItem|checklists/.test(c)) return 'checklist';
  if (/attachments/.test(c)) return 'anexo';
  if (/idLabels|labels/.test(c)) return 'etiqueta';
  if (/^\/cards\/[^/]+$/.test(c) && /idList/.test(b)) return 'coluna';
  if (/^\/cards\/[^/]+$/.test(c) && /desc/.test(b)) return 'descricao';
  if (/^\/cards\/[^/]+$/.test(c) && /closed/.test(b)) return 'arquivar';
  return m.toLowerCase() + ' ' + c.split('/').slice(0, 2).join('/');
};
const tipoAcao = (a: { type: string; data?: Record<string, any> }): string => {   // eslint-disable-line @typescript-eslint/no-explicit-any
  const t = a.type, d = a.data || {};
  if (t === 'commentCard') return 'comentario';
  if (/CheckItem|Checklist/.test(t)) return 'checklist';
  if (/Attachment/.test(t)) return 'anexo';
  if (/Label/.test(t)) return 'etiqueta';
  if (t === 'updateCard' && d.listAfter) return 'coluna';
  if (t === 'updateCard' && d.old && 'desc' in d.old) return 'descricao';
  if (t === 'updateCard' && d.old && 'closed' in d.old) return 'arquivar';
  return t;
};
export async function compararRobo(horas = 1, detalhe = ''): Promise<unknown> {
  const desde = Date.now() - horas * 3600_000;
  const rs = await consulta<{ valor: any }>(`SELECT valor FROM guardado WHERE nome LIKE 'robo_obs_%' AND em > now() - ($1 || ' hours')::interval`, [String(horas)]);   // eslint-disable-line @typescript-eslint/no-explicit-any
  const srv = new Map<string, number>();
  for (const r of rs) for (const e of (r.valor?.escritas || []) as Array<{ m: string; c: string; b: string }>) {
    if (e.m === 'EMAIL') { srv.set('EMAIL', (srv.get('EMAIL') || 0) + 1); continue; }
    const card = (e.c.match(/^\/cards\/([A-Za-z0-9]+)/) || [])[1] || (e.c.match(/^\/checklists\/([a-f0-9]{24})/) ? 'checklist:' + e.c.split('/')[2] : '?');
    const k = card + ' ' + tipoEscrita(e.m, e.c, e.b);
    srv.set(k, (srv.get(k) || 0) + 1);
  }
  const quadro = await idDoQuadroSl(QUADRO_PRINCIPAL_SL);
  const robo = (await trello<{ id: string }>('/members/me', { query: { fields: 'id' } })).id;
  const acoes = await trello<Array<{ type: string; date: string; idMemberCreator: string; data?: Record<string, any> }>>(`/boards/${quadro}/actions`, { query: { since: new Date(desde).toISOString(), limit: 1000, fields: 'type,date,idMemberCreator,data' } });   // eslint-disable-line @typescript-eslint/no-explicit-any
  const ggl = new Map<string, number>();
  for (const a of acoes) {
    if (a.idMemberCreator !== robo) continue;
    const card = a.data?.card?.id || a.data?.card?.shortLink || '?';
    const k = card + ' ' + tipoAcao(a);
    ggl.set(k, (ggl.get(k) || 0) + 1);
  }
  if (detalhe) {   // 19/10/2026: o que o servidor teria gravado (corpo curto, sem token) — para avaliar a virada
    const lista: unknown[] = [];
    for (const r of rs) for (const e of (r.valor?.escritas || []) as Array<{ m: string; c: string; b: string }>) if (!/^[a-z0-9]+$/i.test(detalhe) || detalhe === 'tudo' || e.c.includes(detalhe)) lista.push({ em: r.valor?.em, fn: r.valor?.fn, m: e.m, c: e.c, b: String(e.b || '').slice(0, 400) });
    return { horas, escritas: lista };
  }
  const chaves = new Set([...srv.keys(), ...ggl.keys()]);
  const iguais: string[] = [], soServidor: string[] = [], soGoogle: string[] = [];
  for (const k of chaves) {
    const a = srv.get(k) || 0, b = ggl.get(k) || 0;
    if (a && b) iguais.push(k + (a !== b ? ` (servidor ${a} × Google ${b})` : '')); else if (a) soServidor.push(k + ' ×' + a); else soGoogle.push(k + ' ×' + b);
  }
  return { horas, execucoesComGravacao: rs.length, servidor: [...srv.values()].reduce((x, y) => x + y, 0), google: [...ggl.values()].reduce((x, y) => x + y, 0), iguais, soServidor, soGoogle };
}
export function observacoesRobo(): unknown[] { return obsRobo.slice(-60).reverse(); }
function anotarEscrita(p: Pedido, ctx: Contexto): Resposta {
  let c = p.url; try { c = new URL(p.url).pathname.replace(/^\/1/, ''); } catch { /* */ }
  const b = p.corpo.tipo === 'texto' ? p.corpo.texto : p.corpo.tipo === 'multipart' ? '[arquivo]' : '';
  if (ctx.atual) (ctx.atual.escritas ||= []).push({ m: p.metodo, c, b: b.replace(/(key|token)=[^&]+/gi, '$1=…').slice(0, 300) });
  const id = 'obs' + Math.random().toString(16).slice(2, 14).padEnd(21, '0');
  const corpo = /\/checklists$/.test(c) ? { id, name: '', checkItems: [] } : { id };
  return { status: 200, cab: { 'content-type': 'application/json' }, corpo: new TextEncoder().encode(JSON.stringify(corpo)) };
}

const PRINCIPAL_GRAVA = new Contexto('principalGrava', false, QUADRO_PRINCIPAL_SL, true, true);
/** O mesmo modo no TESTE, para conferir antes de ligar no principal (?quadro=testeremoto). */
const TESTE_REMOTO = new Contexto('testeRemoto', false, CFG.trello.quadro, true, true);
/** Liga os trabalhadores do TESTE e do principal assim que o servidor sobe. */
export function aquecerTrabalhadores(): Promise<unknown> { void propsDoPrincipal(); return Promise.all([TESTE.aquecer(), PRINCIPAL.aquecer()]); }
export function retratoDoCard(shortLink: string): Promise<unknown> { return RETRATO.chamar('vdf_carregarCard', [CFG.trello.token, shortLink]); }

/** O doPost do robô: recebe o corpo `{fn, args, rid}` do formulário e devolve o texto JSON da resposta. */
export function executarPost(corpo: string): Promise<string> { return TESTE.enviar({ tipo: 'post', corpo }) as Promise<string>; }
/** Leitura de navegação do quadro principal (só as funções de LEITURAS_PRINCIPAL; quem chama confere). */
export function executarLeituraPrincipal(corpo: string, usarGuardado = false): Promise<string> { return PRINCIPAL.enviar({ tipo: 'post', corpo }, { usarGuardado }) as Promise<string>; }
/** Gravação (e leitura) do quadro principal pelo servidor, com propriedades e planilha do robô do Google (17/10/2026). */
export function executarGravacaoPrincipal(corpo: string): Promise<string> { return PRINCIPAL_GRAVA.enviar({ tipo: 'post', corpo }) as Promise<string>; }
export function executarTesteRemoto(corpo: string): Promise<string> { return TESTE_REMOTO.enviar({ tipo: 'post', corpo }) as Promise<string>; }
/** Chama uma função do robô direto (gatilhos, diagnóstico) — quadro do servidor. */
export function chamar(fn: string, args: unknown[]): Promise<unknown> { return TESTE.chamar(fn, args); }
