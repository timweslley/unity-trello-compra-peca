/**
 * Texto de um arquivo (PDF ou imagem), no próprio servidor:
 *  - PDF com texto (Cilia, HDI, Websoma exportados): pdftotext, em duas versões — "layout" (colunas na mesma
 *    linha) e "simples" (ordem de leitura). O robô usava o OCR do Google Docs; quem chama tenta as duas e fica
 *    com a que rende mais (ver leitura.ts).
 *  - PDF escaneado (sem texto) e imagens: Tesseract em português (PDF: pdftoppm 300 dpi, página a página).
 */
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

const exec = promisify(execFile);
const LIMITE_SAIDA = 20 * 1024 * 1024;
const MAX_PAGINAS_OCR = 8;

export interface TextoArquivo {
  hash: string;
  tipo: 'pdf' | 'imagem' | 'outro';
  metodo: 'pdftotext' | 'tesseract' | 'nenhum';
  /** versões do texto: pdftotext gera 'layout' e 'simples'; OCR gera só 'ocr' */
  versoes: Record<string, string>;
  paginas?: number;
}

export function tipoArquivo(nome: string, mime?: string | null, inicio?: Buffer): 'pdf' | 'imagem' | 'outro' {
  if (inicio && inicio.subarray(0, 4).toString() === '%PDF') return 'pdf';
  if (/pdf/i.test(mime || '') || /\.pdf$/i.test(nome)) return 'pdf';
  if (/^image\/(jpe?g|png|webp|gif|tiff?)/i.test(mime || '') || /\.(jpe?g|png|webp|gif|tiff?)$/i.test(nome)) return 'imagem';
  return 'outro';
}

async function ocrImagem(arquivo: string): Promise<string> {
  const { stdout } = await exec('tesseract', [arquivo, 'stdout', '-l', 'por', '--psm', '6'], { maxBuffer: LIMITE_SAIDA, timeout: 120_000 });
  return stdout;
}

export async function extrairTexto(dados: Buffer, nome: string, mime?: string | null): Promise<TextoArquivo> {
  const hash = createHash('sha256').update(dados).digest('hex');
  const tipo = tipoArquivo(nome, mime, dados);
  if (tipo === 'outro') return { hash, tipo, metodo: 'nenhum', versoes: {} };
  const dir = await mkdtemp(path.join(tmpdir(), 'leitura-'));
  try {
    const arq = path.join(dir, tipo === 'pdf' ? 'doc.pdf' : 'img' + (path.extname(nome) || '.png'));
    await writeFile(arq, dados);
    if (tipo === 'pdf') {
      const [layout, simples] = await Promise.all([
        exec('pdftotext', ['-layout', '-enc', 'UTF-8', arq, '-'], { maxBuffer: LIMITE_SAIDA, timeout: 60_000 }).then((r) => r.stdout),
        exec('pdftotext', ['-enc', 'UTF-8', arq, '-'], { maxBuffer: LIMITE_SAIDA, timeout: 60_000 }).then((r) => r.stdout),
      ]);
      // PDF com texto de verdade: pelo menos umas 40 letras/dígitos
      if ((layout.match(/[A-Za-z0-9]/g) || []).length >= 40) return { hash, tipo, metodo: 'pdftotext', versoes: { layout, simples } };
      // escaneado: rasteriza e passa OCR
      await exec('pdftoppm', ['-r', '300', '-png', '-l', String(MAX_PAGINAS_OCR), arq, path.join(dir, 'pag')], { timeout: 120_000 });
      const pags = (await readdir(dir)).filter((f) => /^pag.*\.png$/.test(f)).sort();
      const textos: string[] = [];
      for (const p of pags) textos.push(await ocrImagem(path.join(dir, p)));
      return { hash, tipo, metodo: 'tesseract', versoes: { ocr: textos.join('\n') }, paginas: pags.length };
    }
    return { hash, tipo, metodo: 'tesseract', versoes: { ocr: await ocrImagem(arq) } };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
