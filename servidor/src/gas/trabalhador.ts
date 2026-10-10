/**
 * Trabalhador (worker thread) que roda o código do robô do jeito que o Google roda: síncrono.
 * Os serviços do Google (UrlFetchApp, PropertiesService, CacheService, SpreadsheetApp, DriveApp, Drive, DocumentApp,
 * Utilities, LockService, MailApp, ScriptApp, ContentService) são imitados aqui. Tudo que precisa de rede ou banco é
 * pedido à thread principal por `sinc()`, que BLOQUEIA o trabalhador até a resposta (Atomics.wait +
 * receiveMessageOnPort) — o código do robô não precisa mudar uma linha.
 */
import { parentPort, workerData, receiveMessageOnPort, type MessagePort } from 'node:worker_threads';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';

interface Dados { porta: MessagePort; sinal: SharedArrayBuffer; arquivo: string; props: Record<string, string>; fixas: Record<string, string>; somenteLeitura?: boolean }
const { porta, sinal, arquivo, props: propsIniciais, fixas, somenteLeitura } = workerData as Dados;
const flag = new Int32Array(sinal);

/** Pede algo à thread principal e espera a resposta (bloqueia este trabalhador, não o servidor). */
function sinc<T = unknown>(op: string, dados?: unknown): T {
  Atomics.store(flag, 0, 0);
  porta.postMessage({ op, dados });
  while (Atomics.load(flag, 0) === 0) Atomics.wait(flag, 0, 0, 60_000);
  const m = receiveMessageOnPort(porta);
  if (!m) throw new Error('ponte: resposta vazia para ' + op);
  const r = m.message as { ok: boolean; r?: T; erro?: string };
  if (!r.ok) throw new Error(r.erro || 'erro na ponte (' + op + ')');
  return r.r as T;
}

// ---------- bytes à moda do Apps Script (Byte[] com sinal, -128..127) ----------
const paraByteGas = (b: Uint8Array) => Array.from(b, (x) => (x > 127 ? x - 256 : x));
const deByteGas = (a: number[] | Uint8Array | string) => (typeof a === 'string' ? Buffer.from(a, 'utf8') : Buffer.from(Array.from(a as ArrayLike<number>, (x) => x & 255)));

class Blob {
  constructor(public dados: Buffer, public tipo = 'application/octet-stream', public nome = '') {}
  getBytes() { return paraByteGas(this.dados); }
  getDataAsString(_cs?: string) { return this.dados.toString('utf8'); }
  getContentType() { return this.tipo; }
  setContentType(t: string) { this.tipo = t; return this; }
  getName() { return this.nome; }
  setName(n: string) { this.nome = n; return this; }
  copyBlob() { return new Blob(Buffer.from(this.dados), this.tipo, this.nome); }
  getAs(_t: string) { return this; }
  getBlob() { return this; }
}

// ---------- Utilities ----------
const Utilities = {
  formatDate(d: Date, fuso: string, padrao: string) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: fuso || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(d)).map((x) => [x.type, x.value]));
    return String(padrao).replace(/yyyy|yy|MM|dd|HH|mm|ss|'([^']*)'/g, (t, lit) => lit !== undefined ? lit
      : ({ yyyy: p.year, yy: p.year.slice(2), MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, ss: p.second } as Record<string, string>)[t]);
  },
  sleep(ms: number) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, Math.min(ms, 30_000))); },
  base64Encode(v: number[] | string) { return deByteGas(v).toString('base64'); },
  base64Decode(s: string) { return paraByteGas(Buffer.from(String(s), 'base64')); },
  base64EncodeWebSafe(v: number[] | string) { return deByteGas(v).toString('base64url'); },
  newBlob(dados: number[] | string, tipo?: string, nome?: string) { return new Blob(deByteGas(dados ?? ''), tipo || 'application/octet-stream', nome || ''); },
  computeDigest(alg: string, valor: number[] | string, _cs?: string) { return paraByteGas(createHash(alg).update(deByteGas(valor)).digest()); },
  DigestAlgorithm: { MD5: 'md5', SHA_1: 'sha1', SHA_256: 'sha256', SHA_512: 'sha512' },
  Charset: { UTF_8: 'utf8', US_ASCII: 'ascii' },
  getUuid() { return randomUUID(); },
};

// ---------- PropertiesService (cópia em memória, gravação imediata no banco) ----------
const PROPS: Record<string, string> = { ...propsIniciais };
const propriedades = {
  getProperty(k: string) { return k in fixas ? fixas[k] : (k in PROPS ? PROPS[k] : null); },
  setProperty(k: string, v: unknown) { if (k in fixas) return propriedades; PROPS[k] = String(v); sinc('props.gravar', { [k]: String(v) }); return propriedades; },
  deleteProperty(k: string) { delete PROPS[k]; sinc('props.apagar', [k]); return propriedades; },
  getProperties() { return { ...PROPS, ...fixas }; },
  setProperties(o: Record<string, unknown>, apagarOutras?: boolean) {
    const novos = Object.fromEntries(Object.entries(o).filter(([k]) => !(k in fixas)).map(([k, v]) => [k, String(v)]));
    if (apagarOutras) { const fora = Object.keys(PROPS).filter((k) => !(k in novos)); fora.forEach((k) => delete PROPS[k]); if (fora.length) sinc('props.apagar', fora); }
    Object.assign(PROPS, novos); if (Object.keys(novos).length) sinc('props.gravar', novos); return propriedades;
  },
  getKeys() { return Object.keys({ ...PROPS, ...fixas }); },
  deleteAllProperties() { const k = Object.keys(PROPS); k.forEach((x) => delete PROPS[x]); if (k.length) sinc('props.apagar', k); return propriedades; },
};
const PropertiesService = { getScriptProperties: () => propriedades, getUserProperties: () => propriedades, getDocumentProperties: () => propriedades };

// ---------- CacheService (memória do trabalhador, com validade) ----------
const CACHE = new Map<string, { v: string; ate: number }>();
const cache = {
  get(k: string) { const x = CACHE.get(k); if (!x) return null; if (x.ate < Date.now()) { CACHE.delete(k); return null; } return x.v; },
  put(k: string, v: string, seg = 600) { if (String(v).length > 100_000) throw new Error('Argument too large: value'); CACHE.set(k, { v: String(v), ate: Date.now() + Math.min(seg, 21600) * 1000 }); },
  remove(k: string) { CACHE.delete(k); },
  getAll(ks: string[]) { const o: Record<string, string> = {}; ks.forEach((k) => { const v = cache.get(k); if (v !== null) o[k] = v; }); return o; },
  putAll(o: Record<string, string>, seg?: number) { Object.entries(o).forEach(([k, v]) => cache.put(k, v, seg)); },
  removeAll(ks: string[]) { ks.forEach((k) => CACHE.delete(k)); },
};
const CacheService = { getScriptCache: () => cache, getUserCache: () => cache, getDocumentCache: () => cache };

// ---------- UrlFetchApp ----------
interface ParamsFetch { method?: string; payload?: unknown; contentType?: string; headers?: Record<string, string>; muteHttpExceptions?: boolean }
class HTTPResponse {
  constructor(private status: number, private cab: Record<string, string>, private corpo: Buffer) {}
  getResponseCode() { return this.status; }
  getContentText(_cs?: string) { return this.corpo.toString('utf8'); }
  getBlob() { return new Blob(this.corpo, this.cab['content-type'] || 'application/octet-stream', ''); }
  getHeaders() { return this.cab; }
  getAllHeaders() { return this.cab; }
  getContent() { return paraByteGas(this.corpo); }
}
function prepararPedido(url: string, p: ParamsFetch = {}) {
  let corpo: { tipo: 'nada' } | { tipo: 'texto'; texto: string; contentType: string } | { tipo: 'multipart'; partes: Array<{ nome: string; texto?: string; bytes?: Uint8Array; arquivo?: string; tipo?: string }> } = { tipo: 'nada' };
  const pl = p.payload;
  if (pl !== undefined && pl !== null) {
    if (typeof pl === 'string') corpo = { tipo: 'texto', texto: pl, contentType: p.contentType || 'application/x-www-form-urlencoded' };
    else if (pl instanceof Blob) corpo = { tipo: 'multipart', partes: [{ nome: 'file', bytes: pl.dados, arquivo: pl.nome, tipo: pl.tipo }] };
    else if (Object.values(pl as object).some((v) => v instanceof Blob)) {
      corpo = { tipo: 'multipart', partes: Object.entries(pl as Record<string, unknown>).map(([nome, v]) => v instanceof Blob
        ? { nome, bytes: v.dados, arquivo: v.nome || 'arquivo', tipo: v.tipo } : { nome, texto: String(v) }) };
    } else {
      corpo = { tipo: 'texto', contentType: p.contentType || 'application/x-www-form-urlencoded',
        texto: Object.entries(pl as Record<string, unknown>).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v))).join('&') };
    }
  }
  return { url, metodo: String(p.method || 'get').toUpperCase(), cabecalhos: p.headers || {}, corpo, mudo: !!p.muteHttpExceptions };
}
function responder(r: { status: number; cab: Record<string, string>; corpo: Uint8Array }, mudo: boolean, url: string) {
  const resp = new HTTPResponse(r.status, r.cab, Buffer.from(r.corpo));
  if (!mudo && r.status >= 400) throw new Error(`Request failed for ${url.split('?')[0]} returned code ${r.status}. Truncated server response: ${resp.getContentText().slice(0, 200)}`);
  return resp;
}
const UrlFetchApp = {
  fetch(url: string, p?: ParamsFetch) { const ped = prepararPedido(url, p); return responder(sinc('fetch', ped), ped.mudo, url); },
  fetchAll(reqs: Array<string | (ParamsFetch & { url: string })>) {
    const peds = reqs.map((r) => (typeof r === 'string' ? prepararPedido(r) : prepararPedido(r.url, r)));
    const rs = sinc<Array<{ status: number; cab: Record<string, string>; corpo: Uint8Array }>>('fetchAll', peds);
    return rs.map((r, i) => responder(r, peds[i].mudo, peds[i].url));
  },
};

// ---------- SpreadsheetApp (abas no banco) ----------
type Celula = unknown;
const ABAS = new Map<string, Celula[][]>();      // cópia em memória (o trabalhador é o único que escreve)
const reviver = (v: unknown): unknown => (v && typeof v === 'object' && '$d' in (v as object) ? new Date((v as { $d: string }).$d) : v);
const serializar = (v: unknown): unknown => (v instanceof Date ? { $d: v.toISOString() } : v === undefined ? '' : v);
function linhasDa(nome: string): Celula[][] {
  if (!ABAS.has(nome)) ABAS.set(nome, sinc<Celula[][] | null>('aba.ler', nome)?.map((l) => l.map(reviver)) ?? []);
  return ABAS.get(nome)!;
}
function colunaDeLetra(l: string) { return l.toUpperCase().split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0); }
class Range {
  constructor(private aba: Aba, private l: number, private c: number, private nl: number, private nc: number) {}
  private linhas() { return linhasDa(this.aba.nome); }
  getValues() {
    const ls = this.linhas(), nl = this.nl === -1 ? Math.max(0, ls.length - this.l + 1) : this.nl;
    return Array.from({ length: nl }, (_, i) => Array.from({ length: this.nc }, (_, j) => (ls[this.l - 1 + i]?.[this.c - 1 + j] ?? '')));
  }
  getValue() { return this.getValues()[0]?.[0] ?? ''; }
  setValues(vs: Celula[][]) {
    const ls = this.linhas(), mudadas: Record<number, Celula[]> = {};
    vs.forEach((row, i) => {
      const n = this.l - 1 + i;
      while (ls.length <= n) ls.push([]);
      const linha = ls[n];
      row.forEach((v, j) => { while (linha.length < this.c - 1 + j) linha.push(''); linha[this.c - 1 + j] = v; });
      mudadas[n + 1] = linha;
    });
    sinc('aba.gravar', { nome: this.aba.nome, linhas: Object.fromEntries(Object.entries(mudadas).map(([k, v]) => [k, v.map(serializar)])) });
    return this;
  }
  setValue(v: Celula) { return this.setValues([[v]]); }
  getRow() { return this.l; }
  getColumn() { return this.c; }
  getNumRows() { return this.nl; }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
  setBackground() { return this; }
  setWrap() { return this; }
  createTextFinder(t: string) {
    let inteira = false; const self = this;
    const f = { matchEntireCell(b: boolean) { inteira = !!b; return f; }, matchCase() { return f; },
      findNext() {
        const ls = self.linhas();
        for (let i = self.l - 1; i < ls.length; i++) {
          const v = String(ls[i]?.[self.c - 1] ?? '');
          if (inteira ? v === String(t) : v.includes(String(t))) return new Range(self.aba, i + 1, self.c, 1, 1);
        }
        return null;
      } };
    return f;
  }
}
class Aba {
  constructor(public nome: string, private planilha: Planilha) {}
  getName() { return this.nome; }
  getParent() { return this.planilha; }
  getLastRow() { const ls = linhasDa(this.nome); let n = ls.length; while (n > 0 && !(ls[n - 1] || []).some((v) => v !== '' && v !== null)) n--; return n; }
  getLastColumn() { return linhasDa(this.nome).reduce((m, l) => Math.max(m, l.length), 0); }
  getMaxRows() { return Math.max(1000, this.getLastRow()); }
  getRange(a: number | string, b?: number, nl?: number, nc?: number) {
    if (typeof a === 'string') {
      const m = a.match(/^([A-Z]+)(\d*):([A-Z]+)(\d*)$/i) || a.match(/^([A-Z]+)(\d+)$/i);
      if (!m) throw new Error('intervalo não suportado: ' + a);
      const c1 = colunaDeLetra(m[1]), l1 = m[2] ? +m[2] : 1;
      if (m.length === 3) return new Range(this, l1, c1, 1, 1);
      const c2 = colunaDeLetra(m[3]), l2 = m[4] ? +m[4] : -1;
      return new Range(this, l1, c1, l2 === -1 ? -1 : l2 - l1 + 1, c2 - c1 + 1);
    }
    return new Range(this, a, b ?? 1, nl ?? 1, nc ?? 1);
  }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  appendRow(v: Celula[]) { const ls = linhasDa(this.nome); ls.push(v.slice()); sinc('aba.gravar', { nome: this.nome, linhas: { [ls.length]: v.map(serializar) } }); return this; }
  setFrozenRows() { return this; }
  autoResizeColumns() { return this; }
}
class Planilha {
  getId() { return 'planilha-servidor'; }
  getUrl() { return ''; }
  getName() { return 'Validação Trello — backup de descrições (servidor)'; }
  getSheets() { return sinc<string[]>('aba.lista').map((n) => new Aba(n, this)); }
  getSheetByName(n: string) { return sinc<boolean>('aba.existe', n) ? new Aba(n, this) : null; }
  insertSheet(n: string, pos?: number) { sinc('aba.criar', { nome: n, posicao: pos ?? 99 }); ABAS.set(n, []); return new Aba(n, this); }
  getParent() { return this; }
}
const PLANILHA = new Planilha();
const SpreadsheetApp = { openById: (_id: string) => PLANILHA, create: (_n: string) => PLANILHA, getActive: () => PLANILHA };

// ---------- DriveApp / Drive / DocumentApp (arquivos no banco; OCR pelo servidor) ----------
class Arquivo {
  constructor(public id: string, private nome: string, private tipo: string) {}
  getId() { return this.id; }
  getName() { return this.nome; }
  setName(n: string) { this.nome = n; sinc('arq.renomear', { id: this.id, nome: n }); return this; }
  getBlob() { const r = sinc<{ dados: Uint8Array; tipo: string; nome: string }>('arq.ler', this.id); return new Blob(Buffer.from(r.dados || []), r.tipo, r.nome); }
  getSize() { return this.getBlob().dados.length; }
  getMimeType() { return this.tipo; }
  setTrashed(b: boolean) { sinc('arq.lixeira', { id: this.id, lixeira: !!b }); return this; }
  getUrl() { return ''; }
}
function criarArquivo(blob: Blob, pasta?: string) {
  const id = sinc<string>('arq.criar', { nome: blob.nome, tipo: blob.tipo, dados: blob.dados, pasta: pasta || null });
  return new Arquivo(id, blob.nome, blob.tipo);
}
class Pasta {
  constructor(public id: string) {}
  getId() { return this.id; }
  createFile(blob: Blob) { return criarArquivo(blob, this.id); }
}
const DriveApp = {
  getFileById(id: string) { const r = sinc<{ nome: string; tipo: string } | null>('arq.info', id); if (!r) throw new Error('Arquivo não encontrado: ' + id); return new Arquivo(id, r.nome, r.tipo); },
  createFile(blob: Blob) { return criarArquivo(blob); },
  getFolderById(id: string) { return new Pasta(id); },
  createFolder(nome: string) { return new Pasta('pasta-' + createHash('md5').update(nome).digest('hex').slice(0, 12)); },
};
/** Drive avançado: create/copy com mimeType de Google Docs = OCR (o servidor extrai o texto e guarda como "documento"). */
const Drive = {
  Files: {
    create(meta: { name?: string; mimeType?: string }, blob?: Blob) {
      if (!blob) throw new Error('Drive.Files.create sem arquivo');
      if (/google-apps\.document/.test(meta.mimeType || '')) return { id: sinc<string>('ocr', { nome: meta.name || blob.nome, tipo: blob.tipo, dados: blob.dados }) };
      return { id: criarArquivo(blob.setName(meta.name || blob.nome)).id };
    },
    copy(meta: { name?: string; mimeType?: string }, idOrigem: string) {
      const b = DriveApp.getFileById(idOrigem).getBlob();
      return Drive.Files.create({ ...meta, mimeType: meta.mimeType || 'application/vnd.google-apps.document' }, b);
    },
    remove(id: string) { sinc('arq.lixeira', { id, lixeira: true }); },
  },
};
const DocumentApp = {
  openById(id: string) { const t = sinc<string>('arq.texto', id); return { getBody: () => ({ getText: () => t }), getId: () => id }; },
};

// ---------- demais serviços ----------
const LockService = { getUserLock: () => trava, getScriptLock: () => trava, getDocumentLock: () => trava };
const trava = { waitLock() {}, tryLock() { return true; }, releaseLock() {}, hasLock() { return true; } };   // um trabalhador = uma execução por vez
const MailApp = { sendEmail(para: string, assunto: string, corpo: string) { sinc('email', { para, assunto, corpo }); }, getRemainingDailyQuota: () => 100 };
const gatilhos: Array<{ fn: string }> = [];
const ScriptApp = {
  getScriptId: () => 'servidor-compra-peca',
  getProjectTriggers: () => gatilhos.map((g) => ({ getHandlerFunction: () => g.fn })),
  deleteTrigger: (t: { getHandlerFunction(): string }) => { const i = gatilhos.findIndex((g) => g.fn === t.getHandlerFunction()); if (i >= 0) gatilhos.splice(i, 1); },
  newTrigger: (fn: string) => {
    let ms = 0;
    const b = { timeBased: () => b, after: (x: number) => { ms = x; return b; }, everyMinutes: () => b, everyHours: () => b, atHour: () => b, everyDays: () => b,
      create: () => { gatilhos.push({ fn }); sinc('gatilho', { fn, ms }); return { getHandlerFunction: () => fn }; } };
    return b;
  },
  getService: () => ({ getUrl: () => '' }),
};
const ContentService = {
  MimeType: { JSON: 'application/json', TEXT: 'text/plain' },
  createTextOutput: (t: string) => { const o = { texto: String(t), setMimeType: () => o, getContent: () => o.texto }; return o; },
};
const HtmlService = { createHtmlOutput: (t: string) => ({ getContent: () => t, setTitle() { return this; } }) };
const Session = { getScriptTimeZone: () => 'America/Sao_Paulo', getActiveUser: () => ({ getEmail: () => '' }) };
const Logger = { log: (...a: unknown[]) => console.log(...a) };

// ---------- o código do robô ----------
// Roda no MESMO ambiente do trabalhador (vm.runInThisContext): um só Date/Array/Object — `instanceof` funciona igual
// ao Google. Os serviços viram globais, e as funções do robô também (como no Apps Script).
Object.assign(globalThis, {
  Logger, Utilities, PropertiesService, CacheService, UrlFetchApp, SpreadsheetApp, DriveApp, Drive, DocumentApp,
  LockService, MailApp, ScriptApp, ContentService, HtmlService, Session,
});
const ANTES = new Set(Object.keys(globalThis));
vm.runInThisContext(readFileSync(arquivo, 'utf8'), { filename: 'formulario.gs.js' });
const G = globalThis as unknown as Record<string, (...a: unknown[]) => unknown>;

// 09/10/2026 — no Apps Script as variáveis globais do robô (VD_CMP_MEM, VD_ACOES, DU_CACHE, QT_PARTES…) nascem de novo a cada
// execução; aqui o trabalhador vive entre chamadas e elas ficavam com valor velho (ex.: VD_CMP_MEM guardava a descrição completa
// lida horas antes → cotações sumiam na aba Autorizar do principal, TBU8D71/BAT9F19). Guardamos o valor inicial de cada uma e
// devolvemos antes de cada execução, como o Google faz.
const INICIAIS = new Map<string, unknown>();
for (const k of Object.keys(globalThis)) {
  if (ANTES.has(k)) continue;
  const v = (globalThis as Record<string, unknown>)[k];
  if (typeof v === 'function') continue;
  try { INICIAIS.set(k, structuredClone(v)); } catch { /* valor que não se copia: fica como está */ }
}
function renascerGlobais() {
  for (const [k, v] of INICIAIS) (globalThis as Record<string, unknown>)[k] = v !== null && typeof v === 'object' ? structuredClone(v) : v;
}

parentPort!.on('message', (m: { id: number; tipo: 'post' | 'chamar' | 'gatilho'; corpo?: string; fn?: string; args?: unknown[]; props?: Record<string, string> }) => {
  const t0 = Date.now();
  // quadro principal (10/10/2026): as Propriedades do Script vêm do próprio Apps Script (vdf_propsServidor), não do banco do TESTE
  if (somenteLeitura && m.props) { Object.keys(PROPS).forEach((k) => delete PROPS[k]); Object.assign(PROPS, m.props); }
  // leitura do quadro principal (07/10/2026): nada guardado de uma execução para outra — a planilha e o Trello são lidos de novo
  if (somenteLeitura) { ABAS.clear(); CACHE.clear(); }
  renascerGlobais();
  try {
    let r: unknown;
    if (m.tipo === 'post') r = (G.doPost({ postData: { contents: m.corpo } }) as { texto: string }).texto;
    else r = G[m.fn as string](...(m.args || []));
    parentPort!.postMessage({ id: m.id, ok: true, r, ms: Date.now() - t0 });
  } catch (e) {
    parentPort!.postMessage({ id: m.id, ok: false, erro: String((e as Error)?.message || e), ms: Date.now() - t0 });
  }
});
parentPort!.postMessage({ pronto: true });
