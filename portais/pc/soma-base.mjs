/**
 * Base dos orçamentos SOMA (Websoma — Porto, Azul, Itaú, Mitsui) para o robô do Trello (16/10/2026).
 * Weslley (15/10): "eu quero que a rotina de orçamentos também contemple orçamentos fora do Cilia, que são HDI e SOMA, pra
 * fazermos daí em uma etapa apenas os anexos e lançamentos."
 *
 * O Websoma não tem API oficial: na madrugada a rotina abre o orçamento da placa (Consulta Vistoria → placa → lápis → aba
 * Orçamento), guarda o TEXTO do relatório "ORÇAMENTO DETALHADO" (o que ela já lê do iframe, um pedaço por linha) em
 * Downloads\Rotina Unity\AAAA-MM-DD\Websoma_<PLACA>.txt e baixa o relatorio<nº do orçamento>.pdf pelo "Imprimir".
 * Este script TRADUZ esse texto em dados e grava no mesmo formato da base do Cilia (CILIA-HOJE.json), como o hdi-base.mjs:
 *   <SAIDA>/SOMA-HOJE.json                                   — um registro por orçamento (nº, versão, status, peças)
 *   <SAIDA>/PDF/<Casa>/<PLACA> - <SEGURADORA> - SOMA <nº.v>.pdf — cópia do PDF da versão (uma vez por versão)
 *
 * Uso (PC do Weslley):
 *   node soma-base.mjs --txt <Websoma_PLACA.txt> [--pdf <relatorio<nº>.pdf>] [--saida <pasta da base>]
 *   node soma-base.mjs --txt <Websoma_PLACA.txt> --mostrar      (só mostra o registro, sem gravar)
 * SAIDA padrão: G:\Meu Drive\Arquivos de IA\Claude\Rotina Unity\Orçamentos\SOMA
 * Precisa do hdi-base.mjs na mesma pasta (CNPJ das casas, junção na base, números).
 *
 * Regras (texto do relatório, 1 pedaço por linha):
 *  - cabeçalho: sinistro (número antes de "Sinistro:"), placa ("Licença"), CNPJ da oficina (→ casa), nº do orçamento e
 *    versão (logo depois do CNPJ), status (linha depois de "ORÇAMENTO 1 - …", ex.: LIBERADO), liberação ("REPARO LIBERADO"
 *    + "Por: … - dd/mm/aaaa hh:mm:ss") e seguradora (a marca pelo texto — Azul e Itaú faturam pelo CNPJ da Porto, "Fale com:
 *    ChatAzul" —, senão o nome depois de "CNPJ Faturamento:", que fica em seguradora_faturamento);
 *  - peças das seções "PEÇAS - TROCA (COMPRA PELA OFICINA)" (OFICINA) e "LISTA DAS PEÇAS FORNECIDAS PELA SEGURADORA" (ou
 *    "PEÇAS - TROCA (FORNECIDAS PELA SEGURADORA)", layout antigo) (SEGURADORA). Cada peça = [código] descrição QDE VLR DESC%
 *    VLR M.O. PINTURA [TIPO]; o 1º VLR é o unitário bruto e o 2º o TOTAL líquido da linha: valor_unit = unitário × (1 − desc%)
 *    (confere com total ÷ qtd). "STATUS DE ENTREGA…", "PEÇAS - RECUPERAR", "MONTAGEM", serviços e resumo NÃO são peças;
 *  - mesma versão já gravada: não muda nada; versão nova: grava com detalhe_em = agora e copia o PDF (o robô anexa e lança);
 *  - sem dado pessoal na base: nada de nome, telefone, endereço, e-mail ou regulador.
 */
import { readFile, writeFile, mkdir, rename, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { CASA_DO_CNPJ, NOME_CASA, numBr, juntarNaBase } from './hdi-base.mjs';

export const SAIDA_PADRAO = 'G:\\Meu Drive\\Arquivos de IA\\Claude\\Rotina Unity\\Orçamentos\\SOMA';
export const ARQUIVO = 'SOMA-HOJE.json';

const dois = (n) => Math.round(n * 100) / 100;
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const U = (s) => semAcento(s).toUpperCase();
/** Linhas do texto, sem espaço duro/tab e sem linhas vazias. */
export function linhas(txt) {
  return String(txt || '').replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n')
    .map((l) => l.replace(/[\u00a0\t]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
}
const NUM = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/;   // 1.450,58
const TIPO = /^(GENUIN[OA]|ORIGINAL|REPOSICAO|PARALEL[OA]|USAD[OA]|RECONDICIONAD[OA]|VERDE|OUTRAS FONTES)$/;
/** "15/10/2026 19:13:00" → "2026-10-15T19:13:00-03:00"; só a data → meio-dia de Brasília. */
export function isoBr(s) {
  const m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return '';
  return m[4] ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || '00'}-03:00` : `${m[3]}-${m[2]}-${m[1]}T12:00:00-03:00`;
}
/** Código de peça na sua linha: "JB3Z/ 8311/D /", "SOMA006", "BR001", "EB3B/4116A563/AC/". Descrição não é código. */
export function ehCodigo(s) {
  const t = String(s || '').trim();
  if (!t || t.length > 40 || /^\(/.test(t) || !/\d/.test(t)) return false;
  if (!/^[A-Z0-9][A-Z0-9\/\-. ]*$/.test(t)) return false;
  // palavra só de letras com 4+ letras ("PNEU 235/50 R19", "FAROL 2") é descrição
  return !t.split(/[\s\/]+/).some((w) => /^[A-Z]{4,}$/.test(w));
}
/** "JB3Z/ 8311/D /" → "JB3Z/8311/D" (o mesmo que o leitor do robô faz no PDF). */
export function limparCodigo(s) {
  return String(s || '').replace(/\s+/g, '').replace(/\/{2,}/g, '/').replace(/\/+$/, '').replace(/^\/+/, '');
}
/** "(DEFLETOR LE DO RADIADOR) - Val. 2020/" → "DEFLETOR LE DO RADIADOR"; "(…S/SENSOR) - Val. 2020/ S/SENSOR *" sem repetir o
 *  complemento; "(99)) SUPORTE …" sem o "(99))"; complemento sem número (cor, "C/LAMPADAS") entra no fim. */
export function limparDescricao(s) {
  let t = String(s || '').replace(/\s+/g, ' ').trim().replace(/\s*\*\s*$/, '');
  t = t.replace(/^\(\d+\)\)\s*/, '');
  const m = t.match(/^(.*?)\s*-\s*Val\.\s*\d{2,4}\/(?:\d{2,4})?\s*(.*)$/i);
  let desc = m ? m[1] : t, extra = m ? m[2].replace(/\s*\*\s*$/, '').trim() : '';
  desc = desc.trim().replace(/^\((.*)\)$/, '$1').trim();
  if (extra && !/\d{2}\/\d{2}/.test(extra) && U(desc).indexOf(U(extra)) < 0) desc += ' ' + extra;
  return desc.replace(/\s+/g, ' ').trim();
}

const RE_SECAO = /^(PECAS - |LISTA DAS PECAS|STATUS DE ENTREGA|MONTAGEM - |SERVICOS DE TERCEIROS|RESUMO|TOTAL PECAS|OUTROS SERVICOS|INDICES)/;
const CABECALHO = /^(CODIGO|DESCRICAO|QDE|QTD|QTDE|QUANTIDADE|VLR|DESC\. \(%\)|M\.O\.|PINTURA|TIPO PECA)$/;
/** Pula o rodapé de página ("Page 1 of", "3", "16/10/2026") no meio de uma seção. */
function semRodape(ls) {
  const out = [];
  for (let i = 0; i < ls.length; i++) {
    if (/^PAGE \d+ OF$/i.test(ls[i])) { i++; if (/^\d{2}\/\d{2}\/\d{4}$/.test(ls[i + 1] || '')) i++; continue; }
    out.push(ls[i]);
  }
  return out;
}
/** Linhas de uma seção de peças (do título até a próxima seção). null = seção não existe. */
function secao(ls, reTitulo) {
  const i = ls.findIndex((l) => reTitulo.test(U(l)));
  if (i < 0) return null;
  let f = ls.length;
  for (let k = i + 1; k < ls.length; k++) if (RE_SECAO.test(U(ls[k]))) { f = k; break; }
  return semRodape(ls.slice(i + 1, f));
}
/** Peças de uma seção: cada peça termina em QDE + 5 números (VLR, DESC%, VLR, M.O., PINTURA) [+ TIPO]. */
export function pecasDaSecao(corpo, fornece) {
  const out = [], avisos = [];
  if (!corpo) return { pecas: out, avisos };
  let k = 0;
  while (k < corpo.length && CABECALHO.test(U(corpo[k]))) k++;
  let ini = k;
  for (let j = k; j < corpo.length; j++) {
    if (!/^\d{1,3}$/.test(corpo[j]) || !corpo.slice(j + 1, j + 6).every((x) => NUM.test(x)) || corpo.slice(j + 1, j + 6).length < 5) continue;
    const antes = corpo.slice(ini, j);
    let fim = j + 6;
    const tipo = TIPO.test(U(corpo[fim] || '')) ? corpo[fim++] : '';
    ini = fim;
    if (!antes.length) continue;
    let codigo = '', desc;
    if (antes.length >= 2 && ehCodigo(antes[0])) { codigo = limparCodigo(antes[0]); desc = antes.slice(1).join(' '); }
    else desc = antes.join(' ');
    const nome = limparDescricao(desc);
    if (!nome || !/[A-Z]{3}/i.test(nome)) { avisos.push('peça sem descrição perto de "' + antes.join(' | ').slice(0, 60) + '"'); j = fim - 1; continue; }
    const qtd = Number(corpo[j]);
    const bruto = numBr(corpo[j + 1]), pct = numBr(corpo[j + 2]), totalLiq = numBr(corpo[j + 3]);
    let unit = Number.isFinite(bruto) ? (Number.isFinite(pct) && pct > 0 && pct < 100 ? bruto * (1 - pct / 100) : bruto) : NaN;
    // confere com o total líquido da linha (VLR × QDE × (1 − desc%)); se só o total bater, vale o total ÷ qtd
    if (Number.isFinite(totalLiq) && qtd > 0 && (!Number.isFinite(unit) || Math.abs(unit * qtd - totalLiq) > 0.05 * qtd)) {
      if (!Number.isFinite(unit) || Math.abs(totalLiq / qtd - unit) > 0.05) avisos.push(`valor de ${nome.slice(0, 30)}: unitário ${dois(unit)} × ${qtd} ≠ total ${totalLiq}`);
      unit = totalLiq / qtd;
    }
    out.push({
      codigo, nome, fornece, troca: true,
      qtd: qtd > 0 ? qtd : 1,
      valor_unit: Number.isFinite(unit) ? dois(unit) : null,
      preco_unit: Number.isFinite(bruto) ? dois(bruto) : null,
      desconto: Number.isFinite(pct) ? pct : null,
      tipo: tipo ? tipo.toUpperCase() : '',
    });
    j = fim - 1;
  }
  const sobra = corpo.slice(ini).filter((l) => !NUM.test(l) && !/^\d{1,3}$/.test(l));
  if (sobra.some((l) => /[A-Z]{4}/i.test(l))) avisos.push('texto sem preço no fim da seção: ' + sobra.join(' | ').slice(0, 80));
  return { pecas: out, avisos };
}

/** Seguradora pelo nome do faturamento ("PORTO SEGURO CIA DE SEGUROS GERAIS" → Porto Seguro). */
export function seguradoraCurta(nome) {
  const n = U(nome);
  if (/AZUL/.test(n)) return 'Azul Seguros';
  if (/ITAU/.test(n)) return 'Itaú Seguros';
  if (/MITSUI/.test(n)) return 'Mitsui Sumitomo Seguros';
  if (/PORTO/.test(n)) return 'Porto Seguro';
  return String(nome || '').trim();
}
/** Marca do sinistro pelo texto: Azul e Itaú faturam pelo CNPJ da Porto Seguro (REY5B95, 16/10/2026: faturamento "PORTO
 *  SEGURO CIA DE SEGUROS GERAIS", "Fale com: ChatAzul" e o card "… AZUL"). Sem pista, vale o nome do faturamento. */
export function marcaDoTexto(ls) {
  const t = U(ls.join(' '));
  if (/CHAT ?AZUL|\bAZUL (SEGUROS|CIA|COMPANHIA)\b/.test(t)) return 'Azul Seguros';
  if (/CHAT ?ITAU|\bITAU (SEGUROS|AUTO)\b/.test(t)) return 'Itaú Seguros';
  return '';
}

/**
 * Lê o texto do "ORÇAMENTO DETALHADO" do Websoma e devolve o registro da base.
 * nomeArquivo (opcional) completa a placa (Websoma_<PLACA>.txt); nomePdf completa o nº do orçamento (relatorio<nº>.pdf).
 */
export function lerOrcamentoSoma(txt, nomeArquivo = '', nomePdf = '') {
  const ls = linhas(txt);
  const lu = ls.map(U);
  const avisos = [];
  const idx = (re, de = 0) => { for (let i = de; i < lu.length; i++) if (re.test(lu[i])) return i; return -1; };
  if (idx(/^ORCAMENTO DETALHADO$/) < 0) avisos.push('não é o ORÇAMENTO DETALHADO do Websoma');
  const iOfic = idx(/^OFICINA:$/);
  const cab = ls.slice(0, iOfic > 0 ? iOfic : 40);

  // sinistro: o número logo antes de "Sinistro:" (o relatório imprime o valor antes do rótulo)
  const iSin = idx(/^SINISTRO:$/);
  let sinistro = iSin > 0 && /^\d{8,}$/.test(ls[iSin - 1]) ? ls[iSin - 1] : '';
  if (!sinistro) sinistro = (cab.find((l) => /^\d{10,}$/.test(l)) || '');
  const doNome = String(nomeArquivo).toUpperCase().match(/WEBSOMA_([A-Z]{3}\d[A-Z0-9]\d{2})/) || [];
  const placa = (cab.find((l) => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(l)) || doNome[1] || '').toUpperCase();
  if (doNome[1] && placa && doNome[1] !== placa) avisos.push(`placa do texto (${placa}) diferente do nome do arquivo (${doNome[1]})`);

  // oficina: CNPJ (→ casa); logo depois vêm o nº do orçamento e a versão
  const iCnpj = iOfic >= 0 ? ls.findIndex((l, i) => i > iOfic && /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(l)) : -1;
  const cnpj = iCnpj >= 0 ? ls[iCnpj].replace(/\D/g, '') : '';
  const casa = CASA_DO_CNPJ[cnpj] || '';
  let orcamento = '', versao = '';
  if (iCnpj >= 0) {
    for (let i = iCnpj + 1; i < Math.min(ls.length, iCnpj + 8); i++) {
      if (/^\d{6,10}$/.test(ls[i])) { orcamento = ls[i]; if (/^\d{1,3}$/.test(ls[i + 1] || '')) versao = String(Number(ls[i + 1])); break; }
    }
  }
  const doPdf = String(nomePdf).match(/relatorio(\d{6,10})/i);
  if (doPdf && orcamento && doPdf[1] !== orcamento) avisos.push(`nº do orçamento do texto (${orcamento}) diferente do PDF (${doPdf[1]})`);
  if (!orcamento && doPdf) orcamento = doPdf[1];

  const iData = idx(/^DATA:$/);
  const dataOrc = iData >= 0 ? isoBr(ls[iData + 1]) : '';
  // status: a linha depois de "ORÇAMENTO 1 - <razão social> (<CNPJ>)"
  const iOrc = idx(/^ORCAMENTO \d+ - /);
  const status = iOrc >= 0 && ls[iOrc + 1] && !RE_SECAO.test(lu[iOrc + 1]) ? lu[iOrc + 1] : '';
  const outrosOrc = [...new Set(lu.filter((l) => /^ORCAMENTO \d+ - /.test(l)).map((l) => l.match(/^ORCAMENTO (\d+)/)[1]))];
  if (outrosOrc.length > 1) avisos.push('mais de um orçamento no relatório (' + outrosOrc.join(', ') + ')');
  // liberação: "REPARO LIBERADO" + "Por: <regulador> - dd/mm/aaaa hh:mm:ss" (o nome do regulador não vai para a base)
  const iLib = idx(/^REPARO LIBERADO$/);
  const porLib = iLib >= 0 ? ls.slice(iLib + 1, iLib + 3).find((l) => /^Por:/i.test(l)) : '';
  const liberadoEm = porLib ? isoBr((porLib.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(?::\d{2})?)\s*$/) || [])[1]) : '';
  // seguradora: nome depois do CNPJ de faturamento
  const iFat = idx(/^CNPJ FATURAMENTO:$/);
  let segNome = '';
  if (iFat >= 0) segNome = ls.slice(iFat + 1, iFat + 4).find((l) => /[A-Z]{4}/i.test(l) && !/^\d/.test(l)) || '';
  if (!segNome) { const s = ls.find((l) => /PORTO SEGURO|AZUL (CIA|COMPANHIA)|ITAU SEGUROS|MITSUI/i.test(U(l))); segNome = s || ''; }

  const secOf = secao(ls, /^PECAS - TROCA \((COMPRA PELA )?OFICINA\)$/);
  const secFo = secao(ls, /^(LISTA DAS PECAS FORNECIDAS PELA SEGURADORA|PECAS - TROCA \(FORNECIDAS PELA SEGURADORA\))$/);
  const rOf = pecasDaSecao(secOf, 'OFICINA'), rFo = pecasDaSecao(secFo, 'SEGURADORA');
  const pecas = [...rOf.pecas, ...rFo.pecas];
  avisos.push(...rOf.avisos.map((a) => 'oficina: ' + a), ...rFo.avisos.map((a) => 'seguradora: ' + a));
  const soma = (f) => dois(pecas.filter((p) => p.fornece === f).reduce((s, p) => s + (p.valor_unit || 0) * p.qtd, 0));

  if (!sinistro) avisos.push('sem nº do sinistro');
  if (!placa) avisos.push('sem placa');
  if (!orcamento) avisos.push('sem nº do orçamento');
  if (!versao) avisos.push('sem versão');
  if (!status) avisos.push('sem status');
  if (secOf === null && secFo === null) avisos.push('não achei as tabelas de peças (relatório do orçamento?)');
  if (!casa) avisos.push('casa da oficina não reconhecida' + (cnpj ? ' (' + cnpj + ')' : ''));

  const nv = orcamento && versao ? orcamento + '.' + versao : '';
  const liberado = /LIBERADO/.test(status) && !/NAO LIBERADO|NEGADO|RECUSADO/.test(status);
  const assinatura = createHash('sha1').update(JSON.stringify([status, pecas.map((p) => [p.codigo, p.nome, p.fornece, p.qtd, p.valor_unit])])).digest('hex').slice(0, 8);
  return {
    budget_id: orcamento, origem: 'SOMA', seguradora: marcaDoTexto(ls) || seguradoraCurta(segNome), seguradora_faturamento: segNome, sinistro, placa, casa,
    orcamento, versao, numero_versao: nv, versao_baixada: nv, chave_versao: nv + '#' + assinatura,
    data_orcamento: dataOrc,
    status, conclusao: status ? status.charAt(0) + status.slice(1).toLowerCase() : '',
    conclusao_detalhe: liberado && (liberadoEm || dataOrc) ? { titulo: iLib >= 0 ? 'REPARO LIBERADO' : status, data: liberadoEm || dataOrc } : null,
    status_data: liberadoEm || dataOrc,
    dispara_compra: liberado && pecas.length > 0,
    pecas, totais: { pecas_seguradora: soma('SEGURADORA'), pecas_oficina: soma('OFICINA'), itens: pecas.length },
    sem_tabela_oficina: secOf === null, sem_tabela_seguradora: secFo === null,
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
/** Avisos que impedem gravar (os de valor/sobra só aparecem na resposta). */
const grave = (a) => !/^(oficina|seguradora): (valor de|texto sem preço)/.test(a);

export async function gravarSoma({ txt, nomeTxt, pdf, saida = SAIDA_PADRAO, agora = new Date() }) {
  const reg = lerOrcamentoSoma(txt, nomeTxt, pdf ? path.basename(pdf) : '');
  const graves = reg.avisos.filter(grave);
  if (graves.length) return { ok: false, motivo: graves.join('; '), registro: reg };
  const arqBase = path.join(saida, ARQUIVO);
  const base = await lerJson(arqBase, { origem: 'Websoma (rotina da madrugada)', orcamentos: {} });
  const agoraIso = agora.toISOString();
  const { situacao, registro } = juntarNaBase(base, reg, agoraIso);
  if (situacao === 'antiga') return { ok: true, situacao, registro };
  if (situacao !== 'igual' && pdf) {
    const pasta = path.join(saida, 'PDF', NOME_CASA[reg.casa]);
    await mkdir(pasta, { recursive: true });
    const seg = reg.seguradora.split(' ')[0] || 'SOMA';
    const nome = nomeArquivoSeguro(`${reg.placa} - ${seg} - SOMA ${reg.versao_baixada}.pdf`);
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
  if (!o.txt) { console.error('uso: node soma-base.mjs --txt <Websoma_PLACA.txt> [--pdf <relatorio<nº>.pdf>] [--saida <pasta>] [--mostrar]'); process.exit(2); }
  const txt = await readFile(o.txt, 'utf8');
  if (o.mostrar) {
    const r = lerOrcamentoSoma(txt, path.basename(o.txt), o.pdf ? path.basename(o.pdf) : '');
    console.log(JSON.stringify(r, null, 1));
    process.exit(r.avisos.filter(grave).length ? 1 : 0);
  }
  const r = await gravarSoma({ txt, nomeTxt: path.basename(o.txt), pdf: o.pdf, saida: o.saida || SAIDA_PADRAO });
  if (!r.ok) { console.log(`NÃO GRAVEI ${path.basename(o.txt)}: ${r.motivo}`); process.exit(1); }
  const g = r.registro;
  console.log(`${g.casa} ${g.placa} orç ${g.versao_baixada} ${g.status} (${g.seguradora}): ${r.situacao} · ${g.totais.itens} peças (seguradora R$ ${g.totais.pecas_seguradora} · oficina R$ ${g.totais.pecas_oficina})${g.pdf ? ' · PDF ' + g.pdf : ''}${g.avisos.length ? ' · avisos: ' + g.avisos.join('; ') : ''}`);
}
