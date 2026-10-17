/**
 * Texto de um arquivo IGUAL ao do robô (16/10/2026, Weslley: "o robô foi atualizado várias vezes nessas leituras de PDF,
 * não esquece de usar o aprendizado").
 *
 * Os leitores (robo.js, cópia fiel do Apps Script) foram afinados por meses sobre o texto do OCR do Google Docs. O
 * pdftotext do servidor arruma o texto de outro jeito (linhas de tabela quebradas, "ﬁ" ligado, cabeçalho de tabela solto)
 * e, nos 55 PDFs reais conferidos em 16/10, só 13 saíam iguais ao robô. Por isso o servidor pede o texto ao próprio
 * Apps Script (vdf_ocrServidor — mesma conversão do Drive que o robô usa), guarda por hash e só cai no pdftotext/Tesseract
 * se o Google não responder (e tenta o Google de novo depois de 1 h).
 */
import { createHash } from 'node:crypto';
import { CFG } from '../config.js';
import { consulta } from '../db.js';
import { extrairTexto, tipoArquivo } from './texto.js';
import { melhorLeitura } from './leitura.js';

export const URL_APP = process.env.URL_APP
  ?? 'https://script.google.com/macros/s/AKfycbwkTI6PgPTe8OgIcyxzk5oysMvK2BvWwIQEdh5vhOY2n44KlVJvmeHdXTU1HQ3I5BoQew/exec';
const PRAZO_GOOGLE_MS = 90_000;
const REFAZER_LOCAL_MS = 60 * 60_000;

export interface TextoDoArquivo { texto: string; fonte: 'google' | 'local'; doCache: boolean; hash: string; tipo: 'pdf' | 'imagem' | 'outro'; ms: number }

async function ocrGoogle(dados: Buffer, nome: string, mime: string): Promise<string> {
  const r = await fetch(URL_APP, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ fn: 'vdf_ocrServidor', args: [CFG.trello.token, dados.toString('base64'), mime, nome] }),
    signal: AbortSignal.timeout(PRAZO_GOOGLE_MS),
  });
  const j = await r.json() as { ok?: boolean; r?: { texto?: string }; erro?: string };
  if (!j || !j.ok || !j.r || typeof j.r.texto !== 'string') throw new Error(j?.erro || 'resposta inválida do Apps Script');
  return j.r.texto;
}

/** Texto local (pdftotext em 2 versões / Tesseract), com as ligaduras desfeitas ("ﬁ" → "fi"). */
async function textoLocal(dados: Buffer, nome: string, mime: string): Promise<string> {
  const tx = await extrairTexto(dados, nome, mime);
  const m = melhorLeitura(tx.versoes);
  return (m ? tx.versoes[m.versao] : (Object.values(tx.versoes)[0] || '')).normalize('NFKC');
}

export async function textoDoArquivo(dados: Buffer, nome: string, mime?: string | null): Promise<TextoDoArquivo> {
  const t0 = Date.now();
  const hash = createHash('sha256').update(dados).digest('hex');
  const tipo = tipoArquivo(nome, mime, dados);
  const tipoMime = mime || (tipo === 'pdf' ? 'application/pdf' : tipo === 'imagem' ? 'image/jpeg' : 'application/octet-stream');
  if (tipo === 'outro') return { texto: '', fonte: 'local', doCache: false, hash, tipo, ms: 0 };
  const [c] = await consulta<{ fonte: string; texto: string; em: Date }>(`SELECT fonte, texto, em FROM ocr_texto WHERE hash = $1`, [hash]).catch(() => []);
  if (c && (c.fonte === 'google' || Date.now() - new Date(c.em).getTime() < REFAZER_LOCAL_MS)) {
    return { texto: c.texto, fonte: c.fonte as 'google' | 'local', doCache: true, hash, tipo, ms: Date.now() - t0 };
  }
  let texto = '', fonte: 'google' | 'local' = 'google';
  if (URL_APP && CFG.trello.token) {
    try { texto = await ocrGoogle(dados, nome || 'arquivo', tipoMime); }
    catch (e) { console.warn('OCR do Google indisponível, usando o local:', (e as Error).message); texto = ''; }
  }
  if (!texto.trim()) { fonte = 'local'; texto = await textoLocal(dados, nome || 'arquivo', tipoMime); }
  const ms = Date.now() - t0;
  await consulta(`INSERT INTO ocr_texto (hash, fonte, texto, ms, em) VALUES ($1,$2,$3,$4, now())
                  ON CONFLICT (hash) DO UPDATE SET fonte = EXCLUDED.fonte, texto = EXCLUDED.texto, ms = EXCLUDED.ms, em = now()`,
    [hash, fonte, texto, ms]).catch(() => null);
  return { texto, fonte, doCache: false, hash, tipo, ms };
}
