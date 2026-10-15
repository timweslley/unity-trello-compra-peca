/**
 * Base dos orçamentos HDI para o robô do Trello (15/10/2026).
 * Weslley: "eu quero que a rotina de orçamentos também contemple orçamentos fora do Cilia, que são HDI e SOMA, pra
 * fazermos daí em uma etapa apenas os anexos e lançamentos."
 *
 * O HDI não tem API oficial: a rotina da madrugada lê o orçamento no portal HDI Prestador (fetch na aba logada, sem
 * navegar), salva o HTML e gera o PDF no padrão do "Imprimir" (ferramentas/hdipdf.ps1). Este script TRADUZ o HTML salvo
 * em dados — sem ler PDF — e grava no mesmo formato da base do Cilia (CILIA-HOJE.json), que o robô já sabe tratar:
 *   <SAIDA>/HDI-HOJE.json                     — um registro por sinistro (versão do laudo, status, peças HDI × oficina)
 *   <SAIDA>/PDF/<Casa>/<PLACA> - HDI - laudo <v>.pdf — cópia do PDF da versão (uma vez por versão)
 * Pastas (Weslley 15/10: "colocar Cilia dentro da mesma pasta, vamos organizar melhor nossas pastas"): Rotina Unity/Orçamentos/
 * Cilia, HDI e SOMA — a pasta Orçamentos é a antiga "Cilia" renomeada, já compartilhada com sistema@.
 *
 * Uso (PC do Weslley, depois do hdipdf.ps1):
 *   node hdi-base.mjs --html <orçamento.html> [--pdf <orçamento.pdf>] [--saida <pasta da base>] [--casa TOLEDO|CASCAVEL|RONDON|MOURAO]
 *   node hdi-base.mjs --html <orçamento.html> --mostrar      (só mostra o registro, sem gravar)
 *   (--casa só quando o HTML não traz o CNPJ do login; normalmente a casa sai da própria página)
 * SAIDA padrão: G:\Meu Drive\Arquivos de IA\Claude\Rotina Unity\Orçamentos\HDI
 *
 * Regras:
 *  - peças das tabelas "Peças Fornecidas pela HDI" (fornece SEGURADORA) e "Peças Fornecidas pela Oficina" (OFICINA);
 *    valor_unit = preço unitário LÍQUIDO (preço × (1 − desconto%)), como no Cilia e no leitor de PDF do robô;
 *  - mesma versão do laudo já gravada: não muda nada (o robô não trata de novo);
 *  - versão nova: grava o registro com detalhe_em = agora e copia o PDF (o robô anexa e lança no card);
 *  - sem dado pessoal na base: só sinistro, placa, laudo, versões, status e peças (nada de nome, CPF ou telefone).
 */
import { readFile, writeFile, mkdir, rename, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const SAIDA_PADRAO = 'G:\\Meu Drive\\Arquivos de IA\\Claude\\Rotina Unity\\Orçamentos\\HDI';
export const ARQUIVO = 'HDI-HOJE.json';
const GUARDAR_DIAS = 90;   // registro sem novidade há mais de 90 dias sai da base

/** CNPJ do login (m_login do portal) → casa. Mourão e Toledo têm a mesma razão social; o CNPJ decide. */
export const CASA_DO_CNPJ = {
  '43473287000180': 'TOLEDO',
  '43473287000260': 'MOURAO',
  '48777901000110': 'RONDON',
  '43473287000341': 'CASCAVEL',
};
export const NOME_CASA = { TOLEDO: 'Toledo', CASCAVEL: 'Cascavel', RONDON: 'Rondon', MOURAO: 'Campo Mourão' };

const ENT = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ordm: 'º', ordf: 'ª', deg: '°',
  aacute: 'á', agrave: 'à', acirc: 'â', atilde: 'ã', eacute: 'é', ecirc: 'ê', iacute: 'í', oacute: 'ó', ocirc: 'ô',
  otilde: 'õ', uacute: 'ú', uuml: 'ü', ccedil: 'ç', Aacute: 'Á', Agrave: 'À', Acirc: 'Â', Atilde: 'Ã', Eacute: 'É',
  Ecirc: 'Ê', Iacute: 'Í', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Uacute: 'Ú', Uuml: 'Ü', Ccedil: 'Ç',
};
export function decodificar(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : m;
    }
    return ENT[e] ?? m;
  });
}
const tirarBlocos = (h) => String(h)
  .replace(/<script[\s\S]*?<\/script>/gi, '\u0001')
  .replace(/<style[\s\S]*?<\/style>/gi, '\u0001')
  .replace(/<!--[\s\S]*?-->/g, '\u0001');
export const semTags = (h) => decodificar(tirarBlocos(h).replace(/<[^>]+>/g, ' ')).replace(/[\u0001\s]+/g, ' ').trim();
/** Textos da página na ordem (um por célula/rótulo), sem script, estilo e comentário. */
export function textos(h) {
  return decodificar(tirarBlocos(h).replace(/<[^>]+>/g, '\u0001')).split('\u0001')
    .map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
}
const igual = (a, b) => a.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase();
function depoisDe(lista, rotulo) {
  const i = lista.findIndex((t) => igual(t, rotulo));
  return i >= 0 ? lista[i + 1] || '' : '';
}
/** "3.105,92" → 3105.92; "47,00" → 47 */
export function numBr(s) {
  const t = String(s || '').replace(/[^\d,.-]/g, '');
  if (!t) return NaN;
  return Number(t.replace(/\./g, '').replace(',', '.'));
}
const dois = (n) => Math.round(n * 100) / 100;
/** "14/10/2026" → "2026-10-14T12:00:00-03:00" (meio-dia de Brasília: a data não vira no fuso) */
export function isoDia(br) {
  const m = String(br || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}T12:00:00-03:00` : '';
}

/** Linhas de dados da 1ª tabela depois do título da seção (null = seção não existe; [] = seção sem peças). */
function tabelaDaSecao(html, reTitulo) {
  const m = reTitulo.exec(html);
  if (!m) return null;
  const proxSecao = html.slice(m.index + m[0].length).search(/topo-fieldset|Pe(?:ç|&ccedil;)as Fornecidas pela|Opera(?:ç|&ccedil;)(?:õ|&otilde;)es/i);
  const limite = proxSecao < 0 ? html.length : m.index + m[0].length + proxSecao;
  const ini = html.indexOf('<table', m.index);
  if (ini < 0 || ini > limite) return [];
  const fim = html.indexOf('</table>', ini);
  const tab = html.slice(ini, fim < 0 ? limite : fim);
  return tab.split(/<tr[\s>]/i).slice(1).map((tr) => [...tr.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/gi)].map((c) => ({
    titulo: /class="[^"]*td-title/i.test(c[1]),
    texto: semTags(c[2]),
    title: decodificar((c[1].match(/\btitle="([^"]*)"/i) || [])[1] || '').trim(),
  }))).filter((cs) => cs.length >= 5 && !cs.some((c) => c.titulo));
}

function pecasDa(linhas, fornece) {
  const out = [];
  for (const cs of linhas || []) {
    const codigo = cs[0].texto.replace(/\s+/g, '');
    const nome = (cs[1].title || cs[1].texto).replace(/\s+/g, ' ').trim();
    if (!nome || /^total\b/i.test(nome) || (!codigo && /^total/i.test(cs[0].texto))) continue;
    const qtd = numBr(cs[2].texto);
    const preco = numBr(cs[3].texto);
    const desconto = cs.length >= 6 ? numBr(cs[5].texto) : NaN;
    const liquido = Number.isFinite(preco) ? (Number.isFinite(desconto) && desconto > 0 && desconto < 100 ? preco * (1 - desconto / 100) : preco) : NaN;
    out.push({
      codigo, nome, fornece, troca: true,
      qtd: Number.isFinite(qtd) && qtd > 0 ? qtd : 1,
      valor_unit: Number.isFinite(liquido) ? dois(liquido) : null,
      preco_unit: Number.isFinite(preco) ? dois(preco) : null,
      desconto: Number.isFinite(desconto) ? desconto : null,
    });
  }
  return out;
}

/**
 * Lê o HTML de um orçamento HDI ("Exibir Sinistro" / dsp_rel_orcamento_sinistro.htm) e devolve o registro da base.
 * nomeArquivo (opcional) completa placa, sinistro e versão se a página não trouxer (Orcamento_HDI_<PLACA>_sin<n>_laudo<v>.html).
 */
export function lerOrcamentoHdi(html, nomeArquivo = '') {
  const t = textos(html);
  const doNome = String(nomeArquivo).match(/HDI_([A-Z0-9]{7})_sin(\d+)_laudo(\d+\.\d+)/i) || [];
  const sinistro = (depoisDe(t, 'Sinistro:').match(/\d{6,}/) || [doNome[2] || ''])[0];
  const placa = (depoisDe(t, 'Placa:').toUpperCase().match(/[A-Z]{3}\d[A-Z0-9]\d{2}/) || [String(doNome[1] || '').toUpperCase()])[0];
  const laudo = (depoisDe(t, 'Laudo:').match(/\d{6,}/) || [''])[0];
  const orcamento = depoisDe(t, 'Orçamento:');
  const status = depoisDe(t, 'Status:').toUpperCase();

  // versões do laudo: <select> com "0.0 - 13/10/2026", "1.0 - 14/10/2026"… e a escolhida (selected)
  const versoes = []; let escolhida = '';
  for (const sel of html.match(/<select[\s\S]*?<\/select>/gi) || []) {
    const ops = [...sel.matchAll(/<option([^>]*)>([\s\S]*?)<\/option>/gi)]
      .map((o) => ({ sel: /\bselected\b/i.test(o[1]), m: semTags(o[2]).match(/^(\d+\.\d+)\s*-\s*(\d{2}\/\d{2}\/\d{4})/) }))
      .filter((o) => o.m);
    if (!ops.length) continue;
    for (const o of ops) versoes.push({ v: o.m[1], data: isoDia(o.m[2]) });
    escolhida = (ops.find((o) => o.sel) || ops[ops.length - 1]).m[1];
    break;
  }
  const v = escolhida || doNome[3] || '';
  const dataV = (versoes.find((x) => x.v === v) || {}).data || '';

  const cnpj = (html.match(/m_login\s*:\s*["'](\d{14})["']/) || [])[1]
    || (() => { const b = (html.match(/name="m_login"[^>]*value="([^"]+)"/i) || [])[1]; try { return b ? Buffer.from(decodeURIComponent(b), 'base64').toString('latin1').replace(/\D/g, '') : ''; } catch { return ''; } })();
  const casa = CASA_DO_CNPJ[cnpj] || '';

  const linhasHdi = tabelaDaSecao(html, /Pe(?:ç|&ccedil;)as Fornecidas pela HDI/i);
  const linhasOf = tabelaDaSecao(html, /Pe(?:ç|&ccedil;)as Fornecidas pela Oficina/i);
  const pecas = [...pecasDa(linhasHdi, 'SEGURADORA'), ...pecasDa(linhasOf, 'OFICINA')];
  const soma = (f) => dois(pecas.filter((p) => p.fornece === f).reduce((s, p) => s + (p.valor_unit || 0) * p.qtd, 0));
  // laudo com as peças ainda em cotação na HDI (BXZ4J84, 11/10): não lista peça — o robô espera a HDI fechar
  const emCotacao = t.some((x) => /Pe[çc]as em processo de cota[çc][ãa]o/i.test(x));
  // a mesma versão do laudo pode ganhar as peças depois (fim da cotação na HDI): a chave muda junto com as peças
  const assinatura = createHash('sha1').update(JSON.stringify([status, emCotacao, pecas.map((p) => [p.codigo, p.nome, p.fornece, p.qtd, p.valor_unit])])).digest('hex').slice(0, 8);

  const avisos = [];
  if (!sinistro) avisos.push('sem nº do sinistro');
  if (!placa) avisos.push('sem placa');
  if (!v) avisos.push('sem versão do laudo');
  if (!status) avisos.push('sem status');
  if (linhasHdi === null && linhasOf === null && !emCotacao) avisos.push('não achei as tabelas de peças (página do orçamento?)');
  if (!casa) avisos.push('casa do login não reconhecida' + (cnpj ? ' (' + cnpj + ')' : ''));

  return {
    budget_id: sinistro, origem: 'HDI', seguradora: 'HDI', sinistro, placa, casa,
    laudo, orcamento_cilia: orcamento, numero_versao: v, versao_baixada: v, chave_versao: v + '#' + assinatura, versoes,
    status, conclusao: status ? status.charAt(0) + status.slice(1).toLowerCase() : '',
    conclusao_detalhe: dataV ? { titulo: status, data: dataV } : null,
    dispara_compra: /^AUTORIZ/.test(status) && !emCotacao && pecas.length > 0,
    pecas_em_cotacao: emCotacao,
    pecas, totais: { pecas_hdi: soma('SEGURADORA'), pecas_oficina: soma('OFICINA'), itens: pecas.length },
    sem_tabela_hdi: linhasHdi === null, sem_tabela_oficina: linhasOf === null,
    avisos,
  };
}

const nomeArquivoSeguro = (s) => String(s).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
async function lerJson(arq, padrao) { try { return JSON.parse(await readFile(arq, 'utf8')); } catch { return padrao; } }
async function gravarJson(arq, obj) {
  await mkdir(path.dirname(arq), { recursive: true });
  const tmp = arq + '.tmp';
  await writeFile(tmp, JSON.stringify(obj, null, 1), 'utf8');
  await rename(tmp, arq);
}

/**
 * Junta um registro lido à base (HDI-HOJE.json). Mesma versão já gravada = não mexe (devolve 'igual').
 * Devolve {situacao: 'novo'|'versao_nova'|'pecas_mudaram'|'igual'|'antiga', registro}.
 */
/** "1.10" > "1.9" > "0.2": compara versão do laudo por partes numéricas. */
export function compararVersao(a, b) {
  const pa = String(a || '').split('.').map(Number), pb = String(b || '').split('.').map(Number);
  for (let k = 0; k < Math.max(pa.length, pb.length); k++) { const d = (pa[k] || 0) - (pb[k] || 0); if (d) return d; }
  return 0;
}

export function juntarNaBase(base, reg, agoraIso = new Date().toISOString()) {
  base.orcamentos ||= {};
  const lista = (base.orcamentos[reg.casa || 'SEM_CASA'] ||= []);
  const i = lista.findIndex((x) => x.budget_id === reg.budget_id);
  const ant = i >= 0 ? lista[i] : null;
  // HTML de versão mais velha que a gravada (reprocessar arquivo antigo): não volta a base para trás
  if (ant && compararVersao(reg.versao_baixada, ant.versao_baixada) < 0) return { situacao: 'antiga', registro: ant };
  let situacao;
  if (!ant) situacao = 'novo';
  else if (ant.versao_baixada !== reg.versao_baixada) situacao = 'versao_nova';
  else if (ant.chave_versao !== reg.chave_versao) situacao = 'pecas_mudaram';   // mesma versão, peças/status diferentes
  else situacao = 'igual';
  const novo = { ...(ant || {}), ...reg, visto_em: agoraIso };
  if (situacao !== 'igual') {
    novo.detalhe_em = agoraIso;   // o robô trata versões com detalhe_em novo
    novo.atualizado_em = agoraIso;
  }
  if (situacao === 'igual' && ant.pdf) novo.pdf = ant.pdf;
  if (i >= 0) lista[i] = novo; else lista.unshift(novo);
  // registros parados há mais de GUARDAR_DIAS saem
  const corte = Date.now() - GUARDAR_DIAS * 864e5;
  base.orcamentos[reg.casa || 'SEM_CASA'] = lista.filter((x) => new Date(x.visto_em || x.detalhe_em || 0).getTime() >= corte);
  return { situacao, registro: novo };
}

export async function gravarHdi({ html, nomeHtml, pdf, saida = SAIDA_PADRAO, agora = new Date(), casa = '' }) {
  const reg = lerOrcamentoHdi(html, nomeHtml);
  if (casa && CASA_DO_CNPJ[Object.keys(CASA_DO_CNPJ).find((k) => CASA_DO_CNPJ[k] === casa.toUpperCase())]) {
    reg.casa = casa.toUpperCase(); reg.avisos = reg.avisos.filter((a) => !/casa do login/.test(a));
  }
  const graves = reg.avisos.filter((a) => !/casa do login/.test(a));
  if (graves.length) return { ok: false, motivo: graves.join('; '), registro: reg };
  if (!reg.casa) return { ok: false, motivo: reg.avisos.join('; '), registro: reg };
  const arqBase = path.join(saida, ARQUIVO);
  const base = await lerJson(arqBase, { origem: 'portal HDI (rotina da madrugada)', orcamentos: {} });
  const agoraIso = agora.toISOString();
  const { situacao, registro } = juntarNaBase(base, reg, agoraIso);
  if (situacao === 'antiga') return { ok: true, situacao, registro };
  if (situacao !== 'igual' && pdf) {
    const pasta = path.join(saida, 'PDF', NOME_CASA[reg.casa]);
    await mkdir(pasta, { recursive: true });
    const nome = nomeArquivoSeguro(`${reg.placa} - HDI - laudo ${reg.versao_baixada}.pdf`);
    await copyFile(pdf, path.join(pasta, nome));
    registro.pdf = `PDF/${NOME_CASA[reg.casa]}/${nome}`;
  }
  if (situacao !== 'igual') {
    base.gerado_em = agoraIso;
    base.data = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora);
    await gravarJson(arqBase, base);
  }
  return { ok: true, situacao, registro };
}

function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mostrar') o.mostrar = true;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
  }
  return o;
}

if (import.meta.url === `file:///${String(process.argv[1] || '').replace(/\\/g, '/')}` || import.meta.url === `file://${process.argv[1]}`) {
  const o = args(process.argv.slice(2));
  if (!o.html) { console.error('uso: node hdi-base.mjs --html <orçamento.html> [--pdf <orçamento.pdf>] [--saida <pasta>] [--casa <CASA>] [--mostrar]'); process.exit(2); }
  const html = await readFile(o.html, 'utf8');
  if (o.mostrar) {
    const r = lerOrcamentoHdi(html, path.basename(o.html));
    console.log(JSON.stringify(r, null, 1));
    process.exit(r.avisos.length ? 1 : 0);
  }
  const r = await gravarHdi({ html, nomeHtml: path.basename(o.html), pdf: o.pdf, saida: o.saida || SAIDA_PADRAO, casa: o.casa || '' });
  if (!r.ok) { console.log(`NÃO GRAVEI ${path.basename(o.html)}: ${r.motivo}`); process.exit(1); }
  const g = r.registro;
  console.log(`${g.casa} ${g.placa} sin ${g.sinistro} laudo ${g.versao_baixada} ${g.status}: ${r.situacao} · ${g.totais.itens} peças (HDI R$ ${g.totais.pecas_hdi} · oficina R$ ${g.totais.pecas_oficina})${g.pdf ? ' · PDF ' + g.pdf : ''}`);
}
