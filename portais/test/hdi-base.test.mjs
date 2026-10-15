// Testes do tradutor do orçamento HDI (dados inventados — nenhum orçamento real no repositório).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { lerOrcamentoHdi, juntarNaBase, gravarHdi, numBr, compararVersao } from '../pc/hdi-base.mjs';

const linha = (cod, nome, qtd, preco, desc) => `<tr> <td nowrap class="td-label" style="color: black;">${cod}</td> <td class="td-label-nome" style="color: black;" title="${nome}"> ${nome}</td> <td nowrap class="td-label">${qtd}</td> <td nowrap class="td-valor"> ${preco}</td> <td nowrap class="td-valor"> ${preco}</td> <td nowrap class="td-label" style="text-align: right;"> ${desc}</td> </tr>`;
const cab = '<tr> <td nowrap class="td-title"><strong>Partnumber</strong></td> <td nowrap class="td-title"><strong>Descri&ccedil;&atilde;o</strong></td> <td nowrap class="td-title"><strong>Qtd</strong></td> <td nowrap class="td-title"><strong>Pre&ccedil;o Unit. (R$)</strong></td> <td nowrap class="td-title"><strong>Total (R$)</strong></td> <td nowrap class="td-title"><strong>Desconto (%)</strong></td> </tr>';
function pagina({ versoes = ['0.0 - 01/10/2026', '1.0 - 03/10/2026'], escolhida = 1, status = 'AUTORIZADO', hdi = [], oficina = [], emCotacao = false, cnpj = '43473287000180' } = {}) {
  const ops = versoes.map((v, i) => `<option value="${i}"${i === escolhida ? ' selected' : ''}>${v}</option>`).join('');
  const tabela = (linhas) => `<table class="table-mo">${cab}${linhas.map((l) => linha(...l)).join('')}</table>`;
  return `<html><head><script>var x = { m_login: "${cnpj}", y: 1 };</script></head><body>
  <!-- Data | Concordado | 00000000000 -->
  <table><tr><td>Sinistro:</td><td>099999999999999</td><td>Divis&atilde;o:</td><td>X</td></tr>
  <tr><td>Laudo:</td><td>202610010000001</td><td>/</td><td><select name="v">${ops}</select></td></tr>
  <tr><td>Or&ccedil;amento:</td><td>900001 / 1</td><td>Status:</td><td>${status}</td></tr>
  <tr><td>Placa:</td><td>ZZT9A99</td><td>Cor:</td><td>prata</td></tr></table>
  <div class="conteudo-form"><div class="topo-fieldset"><p>Pe&ccedil;as Fornecidas pela HDI</p></div><fieldset>
  ${emCotacao ? '<p>Peças em processo de cotação, aguarde a finalização para visualização</p>' : tabela(hdi)}</fieldset></div>
  ${emCotacao ? '' : `<div class="conteudo-form"><div class="topo-fieldset"><p> Pe&ccedil;as Fornecidas pela Oficina </p></div><fieldset>${tabela(oficina)}</fieldset></div>`}
  <div class="topo-fieldset-operacoes"><p>Opera&ccedil;&otilde;es</p></div><table class="table-mo-operacoes"><tr><td>R&amp;I</td><td>x</td><td>1</td><td>2</td><td>3</td></tr></table>
  </body></html>`;
}
const PAG = pagina({
  hdi: [['52196614', 'CAP&Ocirc;', '1', '3.105,92', '47,00'], ['26344869', 'PARALAMA DIANT DIR', '2', '756,53', '0,00']],
  oficina: [['26224695', 'EMBLEMA DA GRADE', '1', '289,11', '25,00']],
});

test('número brasileiro', () => {
  assert.equal(numBr('3.105,92'), 3105.92);
  assert.equal(numBr(' 47,00'), 47);
  assert.ok(Number.isNaN(numBr('')));
});

test('lê cabeçalho, versão escolhida, casa e peças com valor líquido', () => {
  const r = lerOrcamentoHdi(PAG, 'Orcamento_HDI_ZZT9A99_sin099999999999999_laudo1.0.html');
  assert.deepEqual([r.sinistro, r.placa, r.laudo, r.versao_baixada, r.status, r.casa, r.orcamento_cilia], ['099999999999999', 'ZZT9A99', '202610010000001', '1.0', 'AUTORIZADO', 'TOLEDO', '900001 / 1']);
  assert.equal(r.conclusao_detalhe.data, '2026-10-03T12:00:00-03:00');
  assert.equal(r.dispara_compra, true);
  assert.equal(r.pecas.length, 3);
  const capo = r.pecas[0];
  assert.deepEqual([capo.codigo, capo.nome, capo.fornece, capo.qtd, capo.valor_unit, capo.preco_unit], ['52196614', 'CAPÔ', 'SEGURADORA', 1, 1646.14, 3105.92]);
  assert.equal(r.pecas[1].valor_unit, 756.53);   // desconto 0: valor cheio
  assert.equal(r.pecas[2].fornece, 'OFICINA');
  assert.equal(r.totais.pecas_hdi, 3159.2);       // 1646,14 + 2 × 756,53
  assert.equal(r.totais.pecas_oficina, 216.83);
  assert.deepEqual(r.avisos, []);
  assert.ok(!JSON.stringify(r).includes('00000000000'), 'comentário do HTML não entra');
});

test('laudo com peças em cotação na HDI: sem aviso grave e não dispara', () => {
  const r = lerOrcamentoHdi(pagina({ emCotacao: true }));
  assert.equal(r.pecas_em_cotacao, true);
  assert.equal(r.dispara_compra, false);
  assert.deepEqual(r.avisos, []);
});

test('status não autorizado não dispara; casa pelo CNPJ', () => {
  const r = lerOrcamentoHdi(pagina({ status: 'EM ANALISE', cnpj: '48777901000110', hdi: [['1', 'X', '1', '10,00', '0,00']] }));
  assert.equal(r.dispara_compra, false);
  assert.equal(r.casa, 'RONDON');
});

test('versão sem selected: a última da lista; versões comparam por número', () => {
  const r = lerOrcamentoHdi(pagina({ versoes: ['0.0 - 01/10/2026', '0.1 - 02/10/2026'], escolhida: -1, hdi: [['1', 'X', '1', '10,00', '0,00']] }));
  assert.equal(r.versao_baixada, '0.1');
  assert.ok(compararVersao('1.10', '1.9') > 0);
  assert.ok(compararVersao('0.2', '1.0') < 0);
  assert.equal(compararVersao('2.0', '2.0'), 0);
});

test('juntar na base: novo, igual, peças mudaram, versão nova e versão antiga', () => {
  const base = {};
  const r1 = lerOrcamentoHdi(PAG);
  assert.equal(juntarNaBase(base, r1, '2026-10-15T05:00:00Z').situacao, 'novo');
  assert.equal(base.orcamentos.TOLEDO[0].detalhe_em, '2026-10-15T05:00:00Z');
  const igual = juntarNaBase(base, lerOrcamentoHdi(PAG), '2026-10-16T05:00:00Z');
  assert.equal(igual.situacao, 'igual');
  assert.equal(base.orcamentos.TOLEDO[0].detalhe_em, '2026-10-15T05:00:00Z', 'mesma versão: o robô não trata de novo');
  const mudou = lerOrcamentoHdi(pagina({ hdi: [['52196614', 'CAP&Ocirc;', '1', '3.105,92', '47,00']] }));
  assert.equal(juntarNaBase(base, mudou, '2026-10-17T05:00:00Z').situacao, 'pecas_mudaram');
  assert.equal(base.orcamentos.TOLEDO[0].detalhe_em, '2026-10-17T05:00:00Z');
  const v2 = lerOrcamentoHdi(pagina({ versoes: ['0.0 - 01/10/2026', '1.0 - 03/10/2026', '2.0 - 10/10/2026'], escolhida: 2, hdi: [['1', 'X', '1', '10,00', '0,00']] }));
  assert.equal(juntarNaBase(base, v2, '2026-10-18T05:00:00Z').situacao, 'versao_nova');
  assert.equal(juntarNaBase(base, r1, '2026-10-19T05:00:00Z').situacao, 'antiga');
  assert.equal(base.orcamentos.TOLEDO[0].versao_baixada, '2.0', 'versão antiga não volta a base para trás');
  assert.equal(base.orcamentos.TOLEDO.length, 1);
});

test('grava a base e copia o PDF só quando a versão é nova', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hdi-'));
  const pdf = path.join(dir, 'x.pdf'); await writeFile(pdf, '%PDF-1.4 teste');
  const a = await gravarHdi({ html: PAG, nomeHtml: 'Orcamento_HDI_ZZT9A99_sin099999999999999_laudo1.0.html', pdf, saida: dir });
  assert.equal(a.ok, true); assert.equal(a.situacao, 'novo');
  assert.equal(a.registro.pdf, 'PDF/Toledo/ZZT9A99 - HDI - laudo 1.0.pdf');
  const base = JSON.parse(await readFile(path.join(dir, 'HDI-HOJE.json'), 'utf8'));
  assert.equal(base.orcamentos.TOLEDO[0].pdf, a.registro.pdf);
  assert.ok(base.gerado_em);
  const b = await gravarHdi({ html: PAG, nomeHtml: 'x.html', pdf, saida: dir });
  assert.equal(b.situacao, 'igual');
  const ruim = await gravarHdi({ html: '<html>nada</html>', nomeHtml: 'y.html', saida: dir });
  assert.equal(ruim.ok, false);
});
