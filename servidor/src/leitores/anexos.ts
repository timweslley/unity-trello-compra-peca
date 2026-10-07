/**
 * Anexos dos cards: baixar do Trello, extrair o texto, ler (leitura.ts) e guardar em anexo_leitura.
 * Mesmos critérios do robô para o que é legível: arquivo enviado (upload), até 15 MB, PDF ou imagem, até 6 por card.
 */
import { CFG } from '../config.js';
import { consulta } from '../db.js';
import { extrairTexto } from './texto.js';
import { melhorLeitura, type Leitura } from './leitura.js';
import * as R from './robo.js';

/** Sobe quando os leitores mudam (robo.js regerado, texto.ts, leitura.ts): as leituras antigas são refeitas. */
export const VERSAO_LEITOR = 1;
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_ANEXOS_CARD = 6;

export interface AnexoCard { id: string; nome: string; url: string; bytes: number | null; tipo: string | null; upload: boolean }

export function anexoLegivel(a: AnexoCard): boolean {
  return !!a.upload && (a.bytes ?? 0) <= MAX_BYTES &&
    (/pdf|image\/(jpe?g|png|webp|gif)/i.test(a.tipo || '') || /\.(pdf|jpe?g|png)$/i.test(a.nome || ''));
}

/** Download de anexo do Trello: exige o cabeçalho OAuth com chave e token (o link sozinho não basta). */
async function baixar(url: string): Promise<Buffer> {
  const r = await fetch(url, { headers: { Authorization: `OAuth oauth_consumer_key="${CFG.trello.chave}", oauth_token="${CFG.trello.token}"` } });
  if (!r.ok) throw new Error(`download ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Lê um anexo (ou devolve a leitura guardada, se for da versão atual do leitor). */
export async function lerAnexo(cardId: string, a: AnexoCard, forcar = false): Promise<{ leitura: Leitura | null; doCache: boolean; erro?: string }> {
  if (!forcar) {
    const [g] = await consulta<{ leitura: Leitura | null; erro: string | null; versao_leitor: number }>(
      `SELECT leitura, erro, versao_leitor FROM anexo_leitura WHERE anexo_id = $1`, [a.id]);
    if (g && g.versao_leitor === VERSAO_LEITOR && !g.erro) return { leitura: g.leitura, doCache: true };
  }
  const t0 = Date.now();
  try {
    const dados = await baixar(a.url);
    // mesmo arquivo já lido em outro anexo (reenvio, cópia de card): reaproveita
    const tx = await extrairTexto(dados, a.nome, a.tipo);
    const melhor = melhorLeitura(tx.versoes);
    const leitura = melhor?.leitura ?? null;
    await consulta(
      `INSERT INTO anexo_leitura (anexo_id, card_id, nome, bytes, hash, tipo, metodo, versao_texto, texto, leitura, versao_leitor, ms, erro, lido_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NULL, now())
       ON CONFLICT (anexo_id) DO UPDATE SET card_id=EXCLUDED.card_id, nome=EXCLUDED.nome, bytes=EXCLUDED.bytes, hash=EXCLUDED.hash, tipo=EXCLUDED.tipo,
         metodo=EXCLUDED.metodo, versao_texto=EXCLUDED.versao_texto, texto=EXCLUDED.texto, leitura=EXCLUDED.leitura,
         versao_leitor=EXCLUDED.versao_leitor, ms=EXCLUDED.ms, erro=NULL, lido_em=now()`,
      [a.id, cardId, a.nome, dados.length, tx.hash, tx.tipo, tx.metodo, melhor?.versao ?? null,
        melhor ? tx.versoes[melhor.versao] : null, leitura ? JSON.stringify(leitura) : null, VERSAO_LEITOR, Date.now() - t0]);
    return { leitura, doCache: false };
  } catch (e) {
    const erro = (e as Error).message.slice(0, 300);
    await consulta(
      `INSERT INTO anexo_leitura (anexo_id, card_id, nome, versao_leitor, ms, erro) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (anexo_id) DO UPDATE SET erro=EXCLUDED.erro, ms=EXCLUDED.ms, versao_leitor=EXCLUDED.versao_leitor, lido_em=now()`,
      [a.id, cardId, a.nome, VERSAO_LEITOR, Date.now() - t0, erro]);
    return { leitura: null, doCache: false, erro };
  }
}

/** Executa fn em todos os itens, no máximo `n` ao mesmo tempo, mantendo a ordem dos resultados. */
export async function emParalelo<T, R>(itens: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(itens.length);
  let prox = 0;
  await Promise.all(Array.from({ length: Math.min(n, itens.length) }, async () => {
    while (prox < itens.length) { const i = prox++; out[i] = await fn(itens[i]); }
  }));
  return out;
}

// ---------- conferência: leitura do servidor × o que o robô gravou no card ----------
const norm = (s: string) => R.cp_norm_(s) as string;

export interface Conferencia {
  card: string;                 // short_link (sem placa, sem nomes)
  anexos: number;
  orcamentos: number;
  docsFo: number;
  /** gabarito: códigos que o robô importou do orçamento para a descrição × quantos o servidor achou */
  importadas: { gabarito: number; achadas: number; faltando: string[] };
  /** peças fornecidas pela seguradora lidas × itens do checklist FORNECIMENTO */
  fo: { lidas: number; noChecklist: number };
  erros: number;
}

/**
 * Códigos das peças que o ROBÔ importou do orçamento para a descrição completa: linhas "n. CÓDIGO | DESCRIÇÃO | …"
 * do bloco **PEÇAS:**, só em cards com a marca "_Orçamento importado (…)_", sem pneus e sem COMPLEMENTO (peça
 * incluída à mão, que não está no orçamento). É o gabarito: o leitor do servidor tem de achar todos.
 */
export function codigosImportados(desc: string): string[] {
  if (!/_Or[cç]amento importado \((CILIA|HDI|WEBSOMA)\)_/i.test(desc)) return [];
  const bloco = desc.split(/\*\*PE[CÇ]AS:\*\*/i)[1]?.split(/\n\s*\n|\*\*FORNECIMENTO|===/)[0] || '';
  const out: string[] = [];
  for (const linha of bloco.split('\n')) {
    const m = linha.match(/^\s*\d+\.\s+([^|]+)\|/);
    if (!m || /\|\s*COMPLEMENTO\b/i.test(linha)) continue;
    const cod = norm(m[1]);
    // código interno (0000006, SOMA001…) é peça sem código de fábrica: o robô apaga ao ler, então não é gabarito
    if (cod.length >= 5 && cod !== 'PNEU' && !R.vd_codigoInterno_(cod)) out.push(cod);
  }
  return out;
}

/** Códigos (com 5+ caracteres) das peças lidas que aparecem num texto de referência. */
function contarPresentes(itens: Array<{ codigo?: string; pneu?: boolean }>, referencia: string): { lidas: number; presentes: number } {
  const ref = norm(referencia);
  const comCodigo = itens.filter((i) => !i.pneu && norm(i.codigo || '').length >= 5);
  return { lidas: comCodigo.length, presentes: comCodigo.filter((i) => ref.includes(norm(i.codigo || ''))).length };
}

/**
 * Lê os anexos de cards do quadro e compara. Processa até `limiteMs` e devolve o que fez — chamar de novo continua
 * de onde parou (o que já foi lido vem do banco).
 */
export async function conferirLeitores(limiteMs = 200_000, maxCards = 500) {
  const t0 = Date.now();
  const cards = await consulta<{ id: string; short_link: string; anexos: AnexoCard[]; desc_completa: string | null; desc_trello: string | null;
    checklists: Array<{ nome: string; itens: Array<{ nome: string }> }> }>(
    `SELECT id, short_link, anexos, desc_completa, desc_trello, checklists FROM trello_card
     WHERE excluido_em IS NULL AND NOT fechado AND jsonb_array_length(anexos) > 0 ORDER BY ultima_atividade DESC LIMIT $1`, [maxCards]);
  const resultado: Conferencia[] = [];
  let pendentes = 0;
  for (const c of cards) {
    const legiveis = c.anexos.filter(anexoLegivel).slice(-MAX_ANEXOS_CARD);
    const gabarito = codigosImportados(c.desc_completa || '');
    const lidos = new Set<string>();
    const conf: Conferencia = { card: c.short_link, anexos: legiveis.length, orcamentos: 0, docsFo: 0, importadas: { gabarito: gabarito.length, achadas: 0, faltando: [] }, fo: { lidas: 0, noChecklist: 0 }, erros: 0 };
    if (Date.now() - t0 > limiteMs) { pendentes = cards.length - resultado.length; break; }
    // anexos do card lidos em paralelo (3 de cada vez): as fotos passam por OCR e são o que mais demora
    const leituras = await emParalelo(legiveis, 3, (a) => lerAnexo(c.id, a));
    const vistos = new Set<string>();   // mesmo orçamento anexado duas vezes conta uma
    for (const r of leituras) {
      if (r.erro) { conf.erros++; continue; }
      const l = r.leitura;
      if (!l) continue;
      const assinatura = l.orcamento ? JSON.stringify([l.oficina, l.fo]) : '';
      if (assinatura && vistos.has(assinatura)) continue;
      if (assinatura) vistos.add(assinatura);
      if (l.orcamento) {
        conf.orcamentos++;
        for (const i of [...(l.oficina || []), ...(l.fo || [])]) if (i.codigo) lidos.add(norm(i.codigo));
        const forn = (c.checklists || []).filter((cl) => /FORNEC/i.test(cl.nome)).flatMap((cl) => cl.itens.map((i) => i.nome)).join(' | ');
        const fo = contarPresentes(l.fo || [], forn);
        conf.fo.lidas += fo.lidas; conf.fo.noChecklist += fo.presentes;
      }
      if (l.doc === 'FO') conf.docsFo++;
    }
    conf.importadas.faltando = gabarito.filter((g) => !lidos.has(g));
    conf.importadas.achadas = gabarito.length - conf.importadas.faltando.length;
    resultado.push(conf);
  }
  const soma = (f: (c: Conferencia) => number) => resultado.reduce((s, c) => s + f(c), 0);
  return {
    cardsConferidos: resultado.length, cardsPendentes: pendentes,
    anexos: soma((c) => c.anexos), orcamentos: soma((c) => c.orcamentos), docsFo: soma((c) => c.docsFo), erros: soma((c) => c.erros),
    cardsComGabarito: resultado.filter((c) => c.importadas.gabarito > 0).length,
    importadas: { gabarito: soma((c) => c.importadas.gabarito), achadas: soma((c) => c.importadas.achadas) },
    fo: { lidas: soma((c) => c.fo.lidas), noChecklist: soma((c) => c.fo.noChecklist) },
    /** cards com orçamento em que alguma peça lida não bate — para investigar um a um */
    divergentes: resultado.filter((c) => c.importadas.faltando.length || c.fo.noChecklist < c.fo.lidas)
      .map((c) => ({ card: c.card, importadas: `${c.importadas.achadas}/${c.importadas.gabarito}`, faltando: c.importadas.faltando, fo: `${c.fo.noChecklist}/${c.fo.lidas}` })),
    cardsSemOrcamentoLido: resultado.filter((c) => c.anexos > 0 && !c.orcamentos && !c.docsFo).map((c) => c.card),
  };
}
