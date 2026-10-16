// Testes do tradutor do orçamento SOMA/Websoma (dados inventados — nenhum orçamento real no repositório). O texto imita o
// "ORÇAMENTO DETALHADO" que a rotina guarda do iframe do Websoma: um pedaço por linha, valor antes do rótulo no cabeçalho,
// códigos Ford com espaço duro ("JB3Z/  8311/D / "), rodapé de página no meio e as seções que NÃO são peça.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { lerOrcamentoSoma, gravarSoma, ehCodigo, limparCodigo, limparDescricao, linhas, isoBr } from '../pc/soma-base.mjs';

const NB = ' ';
const CAB = ['Código', 'Descrição', 'Qde', 'Vlr', 'Desc. (%)', 'Vlr', 'M.O.', 'Pintura', 'Tipo Peça'];
function relatorio({ versao = '3', status = 'LIBERADO', liberado = true, oficina = null, fo = null, cnpjOficina = '48.777.901/0001-10', seguradora = 'PORTO SEGURO CIA DE SEGUROS GERAIS', placa = 'TST1A23', chat = '' } = {}) {
  const of = oficina || [
    ['SOMA006', 'JOGOS DE BUCHAS E PRESILHAS *', '1', '70,00', '0,00', '70,00', '0,00', '0,00', 'Original'],
    [`JB3Z/ ${NB} ${NB}8311/D / ${NB}`, '(DEFLETOR LE DO RADIADOR) - Val. 2020/', '1', '446,24', '12,00', '392,69', '0,00', '0,00', 'Genuíno'],
    ['BR001', 'ADITIVO RADIADOR', '2', '75,00', '12,00', '132,00', '0,00', '0,00', 'Genuíno'],
  ];
  const f = fo || [
    [`JB3Z/ ${NB}17A385/H / ${NB}`, '(SUPORTE MOLDURA PLACA DIANT.) - Val. 2020/', '1', '284,44', '31,50', '194,84', '0,00', '0,00', 'Genuíno'],
    [`JB3Z/ ${NB}17D957/Y / ${NB}`, `(PARA CH.DT.PRIMER S/SENSOR) - Val. 2020/ ${NB} S/SENSOR *`, '1', '820,00', '0,00', '820,00', '0,50', '4,00', 'Original'],
    [`JB3Z/ ${NB}17A869/B / ${NB}`, '(99)) SUPORTE SUPORTE LD DO P/CHOQUE - Val. 2020/', '1', '81,34', '31,50', '55,72', '0,00', '0,00', 'Genuíno'],
    'RODAPE',
    [`EB3Z/ ${NB} 13008/HZ/ ${NB}`, '(FAROL LE FUME S/LUZ DIURNA) - Val. 2020/ C/LAMPADAS', '1', '2.661,04', '31,50', '1.822,81', '0,50', '0,00', 'Genuíno'],
    [`JB3Z/ ${NB} 8C324/BJ/ ${NB}`, `(CJ.GRADE DO RADIADOR CINZA) - Val. 2020/ ${NB} CINZA`, '1', '2.117,63', '31,50', '1.450,58', '0,25', '0,00', 'Genuíno'],
  ];
  const rodape = ['Page 1 of', `${NB}3`, '16/10/2026', '', ''];
  const linhasPecas = (rows) => rows.flatMap((r) => (r === 'RODAPE' ? rodape : r));
  const L = [
    `${NB}\t`, 'ORÇAMENTO DETALHADO', '0999888777666', 'Sinistro:', 'Apólice:', 'Telefone:', 'Veículo:', 'Chassi:', 'Licença:', 'Impregnação:',
    'Fabricação:', 'Modelo:', 'KM Atual:', '11112222', 'CLIENTE INVENTADO LTDA', '(00) 90000-0000', 'FORD RANGER TESTE', '9BWZZZ377VT004251', placa, 'PRATA',
    '2021', '2022', '10000',
    'Oficina:', 'Endereço:', 'Telefone:', 'WhatsApp:', 'e-mail:', 'CNPJ:', 'Contato:', 'Autor:', 'Número Orçamento:', 'Versão:',
    'UNITY CAR SERVICE', 'RUA INVENTADA, 1 - CENTRO', '(00)90000-0001', 'TESTE@EXEMPLO.COM', cnpjOficina, '00000 - Regulador Inventado (00) 90000-0002',
    '90000001', versao, 'Motivo:', 'Segurado:', 'Empresa:', 'REGULADORA TESTE', 'Data:', '15/10/2026 19:13:01', 'PRESTADOR', 'Canal de Regulação:',
    'ORÇAMENTO 1 - EMPRESA DA OFICINA LTDA (00.000.000/0001-00)', status,
    'PEÇAS - TROCA (COMPRA PELA OFICINA)', ...CAB, ...linhasPecas(of), String(of.length), '1.000,00', '900,00', '0,00', '0,00',
    'LISTA DAS PEÇAS FORNECIDAS PELA SEGURADORA', ...CAB.map((c) => (c === 'Qde' ? 'Qtd' : c)), ...linhasPecas(f), '7', '6.173,04', '4.486,84', '1,25', '4,00',
    'STATUS DE ENTREGA DAS PEÇAS FORNECIDAS PELA SEGURADORA (SOMA PEÇAS)', 'Código', 'Descrição', 'Qtde', 'Preço', '(%)', 'Preço', 'Data do Pedido',
    'Prazo Entrega', 'Fornecedor', 'Telefone Fornecedo', 'Bruto', 'Líquido', 'JB3Z/ 17D957/Y /', 'COBERTURA(PARA CH.DT.PRIMER S/SENSOR)', '1', '756,67', '0,00',
    '756,67', '24/09/2026 16:03:59', '01/10/2026', 'FORNECEDOR INVENTADO', '(00)30000000', '',
    'PEÇAS - RECUPERAR', 'Código', 'Descrição', 'Quantidade', 'M.O.', 'Total (R$)', 'Pintura', 'Total (R$)', 'Restaurar',
    'DB3Z/ 2620124/B / ', '(PORTA DIANT.LD S/DOBRADICAS) - Val. 2020/', '1', '1,00', '56,00', '5,00', '355,00', '0,00',
    'MONTAGEM - DESMONTAGEM', 'Código', 'Descrição', 'Quantidade', 'M.O.', 'Total (R$)', 'EB3Z/ 4122404/AD/ ', '(MACANETA EXT.DAS PTAS.PRIMER) - Val. 2020/', '1', '1,00', '52,00',
    'SERVIÇOS DE TERCEIROS', 'Código', 'Descrição', 'Quantidade', 'Valor', '131', 'Carga de Gás R1234yf', '1', '250,00', '1', '250,00',
    'Page 2 of', `${NB}3`, '16/10/2026', 'RESUMO - Orçamento 1 - EMPRESA DA OFICINA LTDA', ...(liberado ? ['REPARO LIBERADO', 'Por: Regulador Inventado (00) 90000-0002 - 15/10/2026 19:13:00'] : []),
    'Seguradora:', 'CNPJ Faturamento:', '00.000.000/0013-00', seguradora, 'Total PRV', '0,00',
    'RESUMO', 'OFICINA, PARA SOLICITAR COMPLEMENTO DE VISTORIA, siga as orientações abaixo:', '2. Agende a vistoria no link: Porto',
    ...(chat ? ['3. Dúvidas? Fale com: ' + chat] : []), 'Page 3 of', `${NB}3`, '16/10/2026', `\t${NB}`,
  ];
  return L.join('\n');
}

test('códigos e descrições do Websoma', () => {
  assert.ok(ehCodigo('JB3Z/ 8311/D /'));
  assert.ok(ehCodigo('SOMA006') && ehCodigo('BR001') && ehCodigo('EB3B/4116A563/AC/'));
  assert.ok(!ehCodigo('ADITIVO RADIADOR') && !ehCodigo('PNEU 235/50 R19') && !ehCodigo('(DEFLETOR LE DO RADIADOR) - Val. 2020/'));
  assert.equal(limparCodigo('JB3Z/ 8311/D /'), 'JB3Z/8311/D');
  assert.equal(limparCodigo('AB39/ 8C284/AB/'), 'AB39/8C284/AB');
  assert.equal(limparDescricao('(DEFLETOR LE DO RADIADOR) - Val. 2020/'), 'DEFLETOR LE DO RADIADOR');
  assert.equal(limparDescricao('(PARA CH.DT.PRIMER S/SENSOR) - Val. 2020/ S/SENSOR *'), 'PARA CH.DT.PRIMER S/SENSOR');
  assert.equal(limparDescricao('(FAROL LE FUME S/LUZ DIURNA) - Val. 2020/ C/LAMPADAS'), 'FAROL LE FUME S/LUZ DIURNA C/LAMPADAS');
  assert.equal(limparDescricao('(99)) SUPORTE SUPORTE LD DO P/CHOQUE - Val. 2020/'), 'SUPORTE SUPORTE LD DO P/CHOQUE');
  assert.equal(limparDescricao('(VIGA DIANTEIRA) - Val. 2020/2021'), 'VIGA DIANTEIRA');
  assert.equal(limparDescricao('JOGOS DE BUCHAS E PRESILHAS *'), 'JOGOS DE BUCHAS E PRESILHAS');
  assert.equal(isoBr('15/10/2026 19:13:00'), '2026-10-15T19:13:00-03:00');
  assert.equal(isoBr('15/10/2026'), '2026-10-15T12:00:00-03:00');
  assert.ok(linhas(`a${NB}\tb\n\n c `).join('|') === 'a b|c');
});

test('lê cabeçalho, casa, nº/versão, status, liberação, seguradora e peças (unitário líquido)', () => {
  const r = lerOrcamentoSoma(relatorio(), 'Websoma_TST1A23.txt', 'relatorio90000001.pdf');
  assert.deepEqual(r.avisos, []);
  assert.deepEqual([r.sinistro, r.placa, r.casa, r.orcamento, r.versao, r.versao_baixada, r.status, r.seguradora],
    ['0999888777666', 'TST1A23', 'RONDON', '90000001', '3', '90000001.3', 'LIBERADO', 'Porto Seguro']);
  assert.equal(r.budget_id, '90000001');
  assert.equal(r.dispara_compra, true);
  assert.deepEqual(r.conclusao_detalhe, { titulo: 'REPARO LIBERADO', data: '2026-10-15T19:13:00-03:00' });
  assert.equal(r.data_orcamento, '2026-10-15T19:13:01-03:00');
  const of = r.pecas.filter((p) => p.fornece === 'OFICINA'), fo = r.pecas.filter((p) => p.fornece === 'SEGURADORA');
  assert.equal(of.length, 3);
  assert.equal(fo.length, 5, 'rodapé de página no meio da lista não corta nem inventa peça');
  assert.deepEqual(of.map((p) => [p.codigo, p.nome, p.qtd, p.valor_unit, p.tipo]), [
    ['SOMA006', 'JOGOS DE BUCHAS E PRESILHAS', 1, 70, 'ORIGINAL'],
    ['JB3Z/8311/D', 'DEFLETOR LE DO RADIADOR', 1, 392.69, 'GENUÍNO'],
    ['BR001', 'ADITIVO RADIADOR', 2, 66, 'GENUÍNO'],   // 2 × 75 − 12% = 132 → 66 a unidade
  ]);
  assert.deepEqual(fo.map((p) => [p.codigo, p.nome, p.valor_unit]), [
    ['JB3Z/17A385/H', 'SUPORTE MOLDURA PLACA DIANT.', 194.84],
    ['JB3Z/17D957/Y', 'PARA CH.DT.PRIMER S/SENSOR', 820],
    ['JB3Z/17A869/B', 'SUPORTE SUPORTE LD DO P/CHOQUE', 55.72],
    ['EB3Z/13008/HZ', 'FAROL LE FUME S/LUZ DIURNA C/LAMPADAS', 1822.81],
    ['JB3Z/8C324/BJ', 'CJ.GRADE DO RADIADOR CINZA', 1450.58],
  ]);
  assert.ok(!r.pecas.some((p) => /PORTA DIANT|MACANETA|CARGA DE GAS|COBERTURA/i.test(p.nome)), 'recuperar, montagem, serviço e status de entrega não são peça');
  assert.ok(!JSON.stringify(r).match(/CLIENTE INVENTADO|90000-000|RUA INVENTADA|EXEMPLO\.COM|Regulador Inventado/), 'sem dado pessoal na base');
});

test('não liberado não dispara; seguradora Azul; Toledo pelo CNPJ', () => {
  const r = lerOrcamentoSoma(relatorio({ status: 'EM ANÁLISE', liberado: false, seguradora: 'AZUL COMPANHIA DE SEGUROS GERAIS', cnpjOficina: '43.473.287/0001-80' }), 'Websoma_TST1A23.txt');
  assert.equal(r.status, 'EM ANALISE');
  assert.equal(r.dispara_compra, false);
  assert.equal(r.conclusao_detalhe, null);
  assert.equal(r.seguradora, 'Azul Seguros');
  assert.equal(r.casa, 'TOLEDO');
});

test('marca pelo texto: Azul fatura pelo CNPJ da Porto ("Fale com: ChatAzul")', async () => {
  const r = lerOrcamentoSoma(relatorio({ chat: 'ChatAzul' }), 'Websoma_TST1A23.txt');
  assert.equal(r.seguradora, 'Azul Seguros');
  assert.equal(r.seguradora_faturamento, 'PORTO SEGURO CIA DE SEGUROS GERAIS');
  assert.equal(lerOrcamentoSoma(relatorio(), 'Websoma_TST1A23.txt').seguradora, 'Porto Seguro', 'sem pista: o nome do faturamento');
  const dir = await mkdtemp(path.join(tmpdir(), 'soma-'));
  const pdf = path.join(dir, 'relatorio90000001.pdf'); await writeFile(pdf, '%PDF-1.4 teste');
  const g = await gravarSoma({ txt: relatorio({ chat: 'ChatAzul' }), nomeTxt: 'Websoma_TST1A23.txt', pdf, saida: path.join(dir, 'SOMA') });
  assert.equal(g.registro.pdf, 'PDF/Rondon/TST1A23 - Azul - SOMA 90000001.3.pdf');
});

test('avisos: placa diferente do arquivo, nº diferente do PDF, texto que não é o relatório', () => {
  const a = lerOrcamentoSoma(relatorio(), 'Websoma_OUT1A11.txt', 'relatorio90000002.pdf');
  assert.ok(a.avisos.some((x) => /diferente do nome do arquivo/.test(x)) && a.avisos.some((x) => /diferente do PDF/.test(x)));
  const b = lerOrcamentoSoma('Consulta Vistoria\nPlaca\nTST1A23\nNenhum orçamento', 'Websoma_TST1A23.txt');
  assert.ok(b.avisos.some((x) => /não é o ORÇAMENTO DETALHADO/.test(x)) && b.avisos.some((x) => /tabelas de peças/.test(x)));
});

test('grava a base: novo → igual → versão nova → antiga; PDF copiado uma vez por versão', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'soma-'));
  const pdf = path.join(dir, 'relatorio90000001.pdf');
  await writeFile(pdf, '%PDF-1.4 teste');
  const saida = path.join(dir, 'SOMA');
  const r1 = await gravarSoma({ txt: relatorio(), nomeTxt: 'Websoma_TST1A23.txt', pdf, saida, agora: new Date('2026-10-16T05:00:00Z') });
  assert.equal(r1.ok, true); assert.equal(r1.situacao, 'novo');
  assert.equal(r1.registro.pdf, 'PDF/Rondon/TST1A23 - Porto - SOMA 90000001.3.pdf');
  const base1 = JSON.parse(await readFile(path.join(saida, 'SOMA-HOJE.json'), 'utf8'));
  assert.equal(base1.orcamentos.RONDON[0].detalhe_em, '2026-10-16T05:00:00.000Z');
  assert.ok(base1.gerado_em && base1.data === '2026-10-16');
  const r2 = await gravarSoma({ txt: relatorio(), nomeTxt: 'Websoma_TST1A23.txt', pdf, saida, agora: new Date('2026-10-17T05:00:00Z') });
  assert.equal(r2.situacao, 'igual');
  const base2 = JSON.parse(await readFile(path.join(saida, 'SOMA-HOJE.json'), 'utf8'));
  assert.equal(base2.orcamentos.RONDON[0].detalhe_em, '2026-10-16T05:00:00.000Z', 'igual não muda o detalhe_em (o robô não trata de novo)');
  const r3 = await gravarSoma({ txt: relatorio({ versao: '4' }), nomeTxt: 'Websoma_TST1A23.txt', pdf, saida, agora: new Date('2026-10-18T05:00:00Z') });
  assert.equal(r3.situacao, 'versao_nova');
  assert.equal(r3.registro.versao_baixada, '90000001.4');
  const r4 = await gravarSoma({ txt: relatorio({ versao: '2' }), nomeTxt: 'Websoma_TST1A23.txt', pdf, saida });
  assert.equal(r4.situacao, 'antiga');
  const pdfs = await readdir(path.join(saida, 'PDF', 'Rondon'));
  assert.deepEqual(pdfs.sort(), ['TST1A23 - Porto - SOMA 90000001.3.pdf', 'TST1A23 - Porto - SOMA 90000001.4.pdf']);
  const base = JSON.parse(await readFile(path.join(saida, 'SOMA-HOJE.json'), 'utf8'));
  assert.equal(base.orcamentos.RONDON.length, 1);
  assert.equal(base.orcamentos.RONDON[0].versao_baixada, '90000001.4');
});

test('não grava texto que não é o relatório', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'soma-'));
  const r = await gravarSoma({ txt: 'Consulta Vistoria\nTST1A23', nomeTxt: 'Websoma_TST1A23.txt', saida: path.join(dir, 'SOMA') });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /ORÇAMENTO DETALHADO/);
});
