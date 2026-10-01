/* ============================ ROTEIRO DE TESTE (só quadro TESTE) ============================
 * Roda o fluxo de verdade em cards do quadro TESTE, chamando as MESMAS funções do formulário
 * (vdf_*) com a conta do script — para ver no quadro como fica cada etapa.
 * Só funciona com VD_BOARD = quadro TESTE. Durante o teste as menções a compras ficam só no Weslley.
 *   tst_atualizarCards()  — redesenha a descrição de todos os cards no modelo novo + links do formulário
 *   tst_fluxoCompleto()   — os 6 cenários abaixo, em sequência
 */
var TST = { CRUZE: 'zTlw8wkG', HB20: 'RlnMHBZB', TRACKER: '9NjfPbKL', MONTANA: 'LrWWoE6V', LR: 'JzBo8oWm' };

function tst_tk_() {
  if (vd_board_() !== VD.BOARD_PADRAO) throw new Error('Roteiro de teste só roda no quadro TESTE.');
  return PropertiesService.getScriptProperties().getProperty('TRELLO_TOKEN');
}
function tst_log_(nome, r) {
  var ok = r && r.ok !== false;
  Logger.log((ok ? '✅ ' : '❌ ') + nome + (ok ? (r && r.lista ? ' → ' + r.lista : '') : ' — ' + JSON.stringify(r && r.faltas)));
  if (!ok) throw new Error(nome + ': ' + JSON.stringify(r && r.faltas));
  return r;
}
function tst_peca_(c, trecho) {
  var p = (c.pecas || []).filter(function (x) { return vd_semAcento_(x.nome).indexOf(vd_semAcento_(trecho)) >= 0; })[0];
  if (!p) throw new Error('peça "' + trecho + '" não achada em ' + c.nome);
  return p;
}
function tst_cot_(c, trecho, forn, tipo, valor, dias, marca) { return { chave: tst_peca_(c, trecho).chave, fornecedor: forn, tipo: tipo || '', marca: marca || '', valor: valor, dias: dias === undefined ? '' : String(dias) }; }
/** Cotação mais barata lançada para a peça. */
function tst_barata_(c, trecho) {
  var k = tst_peca_(c, trecho).chave;
  var l = c.cotacoes.cotacoes.filter(function (q) { return q.chave === k; }).sort(function (a, b) { return a.valor - b.valor; });
  if (!l.length) throw new Error('sem cotação para ' + trecho);
  return { chave: k, fornecedor: l[0].fornecedor, valor: l[0].valor, dias: l[0].dias, tipo: l[0].tipo, marca: l[0].marca };
}
/** Menções a compras/diretoria só no Weslley durante o teste. */
function tst_comMencoesSoMinhas_(fn) {
  var p = PropertiesService.getScriptProperties(), velho = p.getProperty('VD_COMPRADORES');
  p.setProperty('VD_COMPRADORES', 'timweslley');
  try { return fn(); } finally { if (velho === null) p.deleteProperty('VD_COMPRADORES'); else p.setProperty('VD_COMPRADORES', velho); }
}

/** Redesenha a descrição de todos os cards no modelo novo e garante os links do formulário. */
function tst_atualizarCards() {
  tst_tk_();
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { cru: true, query: { fields: 'name' } }), n = 0;
  cards.forEach(function (c) {
    if (vdf_cardProtegido_(c.name || '') || /^\s*AVISO\b/i.test(c.name || '')) return;
    try { if (vd_completa_(c.id)) { vd_redesenhar_(c.id); n++; } } catch (e) { Logger.log('redesenhar ' + c.name + ': ' + e); }
  });
  try { vd_garantirLinks_(true); } catch (e) { Logger.log('links: ' + e); }
  Logger.log('descrições redesenhadas: ' + n + ' de ' + cards.length + ' card(s)');
}

/* 1) CRUZE — cotação com 2 fornecedores -> PENDENTE AUTORIZAR (para aqui) */
function tst_cenario1() {
  var tk = tst_tk_(), c = vdf_carregarCard(tk, TST.CRUZE);
  tst_log_('Cruze: cotação', vdf_salvarCotacao(tk, { shortLink: TST.CRUZE, cotacoes: [
    tst_cot_(c, 'FAROL', 'IMPERIAL', 'GENUÍNO', '1.280,00', 3), tst_cot_(c, 'FAROL', 'METROSUL', 'GENUÍNO', '1.350,00', 2)] }));
}

/* 2) HB20 — pedido particular no mesmo card + cotação (com justificativa) + edição de cotação
 *    + autorização só da seguradora -> fica esperando o consultor autorizar a particular */
function tst_cenario2() {
  var tk = tst_tk_(), c = vdf_carregarCard(tk, TST.HB20);
  if (!c.pecas.some(function (p) { return p.particular; })) {
    var pecas = c.pecas.map(function (p) { return { pneu: p.pneu, codigo: p.codigo, descricao: p.descricao, tipos: p.tipos, medida: p.medida, categoria: p.categoria, marca: p.marca, qtd: p.qtd, particular: p.particular, partPor: p.partPor }; });
    pecas.push({ pneu: false, codigo: '', descricao: 'TAPETE DE BORRACHA', tipos: ['PARALELO'], qtd: '1', particular: true });
    tst_log_('HB20: pedido particular (tapete)', vdf_salvar(tk, { shortLink: TST.HB20, dados: { placa: c.dados.placa, modelo: c.dados.modelo, ano: c.dados.ano, motor: c.dados.motor, chassi: c.dados.chassi },
      pecas: pecas, obs: c.obs || '', fileIds: [], capaId: '', orcamento: null,
      novo: { tipo: 'SEGURADORA', carro: c.titulo.carro, cor: c.titulo.cor, seguradora: c.titulo.seguradora || c.dados.seguradora, sinistro: c.dados.sinistro || '', unidade: '' } }));
    c = vdf_carregarCard(tk, TST.HB20);
  }
  tst_log_('HB20: cotação', vdf_salvarCotacao(tk, { shortLink: TST.HB20,
    cotacoes: [tst_cot_(c, 'FAIXA', 'IMPERIAL', 'GENUÍNO', '180,00', 4), tst_cot_(c, 'FAIXA', 'HYUNDAI TOLEDO', 'GENUÍNO', '210,00', 1), tst_cot_(c, 'TAPETE', 'MERCADO LIVRE', 'PARALELO', '89,90', 5)],
    semCot: [{ chave: tst_peca_(c, 'GUARNICAO').chave, texto: 'fora de linha na Hyundai e sem paralelo no mercado' }] }));
  c = vdf_carregarCard(tk, TST.HB20);
  tst_log_('HB20: cotador edita (Hyundai Toledo 210 -> 195)', vdf_salvarCotacao(tk, { shortLink: TST.HB20,
    remover: [{ chave: tst_peca_(c, 'FAIXA').chave, fornecedor: 'HYUNDAI TOLEDO', valor: 210 }],
    cotacoes: [tst_cot_(c, 'FAIXA', 'HYUNDAI TOLEDO', 'GENUÍNO', '195,00', 1)] }));
  c = vdf_carregarCard(tk, TST.HB20);
  tst_comMencoesSoMinhas_(function () {
    tst_log_('HB20: diretoria autoriza só a peça da seguradora', vdf_autorizar(tk, { shortLink: TST.HB20, escolhas: [tst_barata_(c, 'FAIXA')], obs: [], geral: 'teste: falta o consultor autorizar o tapete' }));
  });
}

/* 3) TRACKER — cotação nova + autorização das duas partes + compra (PAGAS e PAGAS PARTICULAR)
 *    + recebimento parcial -> FALTA CHEGAR */
function tst_cenario3() {
  var tk = tst_tk_(), c = vdf_carregarCard(tk, TST.TRACKER);
  tst_log_('Tracker: cotação nova', vdf_salvarCotacao(tk, { shortLink: TST.TRACKER, cotacoes: [tst_cot_(c, 'LANTERNA', 'IMPERIAL', 'ORIGINAL', '260,00', 4)] }));
  c = vdf_carregarCard(tk, TST.TRACKER);
  tst_comMencoesSoMinhas_(function () {
    tst_log_('Tracker: autoriza seguradora + particular', vdf_autorizar(tk, { shortLink: TST.TRACKER, escolhas: [tst_barata_(c, 'LANTERNA'), tst_barata_(c, 'PNEU')], obs: [], geral: '' }));
    c = vdf_carregarCard(tk, TST.TRACKER);
    var auts = c.autorizadas;
    tst_log_('Tracker: compra das duas', vdf_salvarCompra(tk, { shortLink: TST.TRACKER, compras: auts.map(function (a) {
      var q = c.cotacoes.cotacoes.filter(function (x) { return x.chave === a.chave && x.fornecedor === a.fornecedor && Math.abs(x.valor - a.valor) < 0.005; })[0] || {};
      return { chave: a.chave, fornecedor: a.fornecedor, valor: a.valor, dias: q.dias === '' || q.dias == null ? 3 : q.dias, tipo: q.tipo, marca: q.marca };
    }) }));
  });
  c = vdf_carregarCard(tk, TST.TRACKER);
  var lan = c.recebiveis.filter(function (i) { return !i.ok && /LANTERNA/i.test(i.nome); })[0];
  if (lan) tst_log_('Tracker: recebe a lanterna', vdf_salvarRecebimento(tk, { shortLink: TST.TRACKER, itens: [{ id: lan.id, data: '', obs: 'veio sem o soquete — fornecedor manda amanhã' }], anexos: [] }));
}

/* 4) MONTANA (particular) — cotação com justificativas + autorização + compra parcial
 *    + cotação indisponível com cotação nova -> volta para COTAÇÃO FINALIZADA */
function tst_cenario4() {
  var tk = tst_tk_(), c = vdf_carregarCard(tk, TST.MONTANA);
  var lidas = c.cotacoes.cotacoes, sem = c.cotacoes.semCot || [];
  var falta = c.pecas.filter(function (p) { return !lidas.some(function (q) { return q.chave === p.chave; }) && !sem.some(function (s) { return s.chave === p.chave; }); });
  var cots = [], semCot = [];
  falta.forEach(function (p) {
    if (/COMBUSTIVEL/.test(p.nome)) semCot.push({ chave: p.chave, texto: 'só tem genuína e o cliente não quer pagar' });
    else if (/LATERAL/.test(p.nome)) semCot.push({ chave: p.chave, texto: 'vamos recuperar a peça do cliente' });
    else if (p.pneu) cots.push({ chave: p.chave, fornecedor: 'PNEU FORTE', tipo: '', marca: p.marca || 'NACIONAL', valor: /175/.test(p.medida) ? '280,00' : '320,00', dias: '2' });
    else cots.push({ chave: p.chave, fornecedor: /GUIA/.test(p.nome) ? 'MERCADO LIVRE' : 'METROSUL', tipo: (p.tipos || [])[0] || 'ORIGINAL', marca: '', valor: /GUIA/.test(p.nome) ? '160,00' : '45,00', dias: '3' });
  });
  if (cots.length || semCot.length) tst_log_('Montana: cotação (com 2 justificativas)', vdf_salvarCotacao(tk, { shortLink: TST.MONTANA, cotacoes: cots, semCot: semCot }));
  c = vdf_carregarCard(tk, TST.MONTANA);
  var escolhas = c.pecas.filter(function (p) { return c.cotacoes.cotacoes.some(function (q) { return q.chave === p.chave; }); }).map(function (p) { return tst_barata_(c, p.nome); });
  tst_comMencoesSoMinhas_(function () {
    tst_log_('Montana: consultor autoriza (' + escolhas.length + ' peças)', vdf_autorizar(tk, { shortLink: TST.MONTANA, escolhas: escolhas, obs: [], geral: '' }));
    c = vdf_carregarCard(tk, TST.MONTANA);
    var para = tst_peca_(c, 'PARACHOQUE TRAS').chave;
    var comprar = c.autorizadas.filter(function (a) { return a.chave !== para; });
    tst_log_('Montana: compra (menos o parachoque)', vdf_salvarCompra(tk, { shortLink: TST.MONTANA, compras: comprar.map(function (a) { return { chave: a.chave, fornecedor: a.fornecedor, valor: a.valor, dias: 3 }; }) }));
    var ap = c.autorizadas.filter(function (a) { return a.chave === para; })[0];
    if (ap) tst_log_('Montana: parachoque indisponível + cotação nova', vdf_cotacaoIndisponivel(tk, { shortLink: TST.MONTANA, itens: [{ chave: para, fornecedor: ap.fornecedor, valor: ap.valor,
      motivo: 'a Imperial vendeu a última peça', nova: { fornecedor: 'AVENIDA', tipo: 'ORIGINAL', marca: 'DTS', valor: '530,00', dias: '4' } }] }));
  });
}

/* 5) LAND ROVER — recebimento de todas as peças da seguradora (FO) */
function tst_cenario5() {
  var tk = tst_tk_(), c = vdf_carregarCard(tk, TST.LR);
  var pend = c.recebiveis.filter(function (i) { return !i.ok; });
  if (pend.length) tst_log_('Land Rover: recebe todas as FO', vdf_salvarRecebimento(tk, { shortLink: TST.LR, itens: pend.map(function (i, k) { return { id: i.id, data: '', obs: k === 0 ? 'conferido com a nota da seguradora' : '' }; }), anexos: [], geral: 'teste do recebimento completo' }));
}

/* 6) TRACKER — orçamento complementar depois da compra: 1 peça nova da oficina + 1 FO nova
 *    -> pelo formulário (compara, inclui marcada COMPLEMENTO, card volta para EM COTAÇÃO)
 *    -> cotação -> autorização -> compra no checklist PAGAS COMPLEMENTO */
function tst_cenario6() {
  var tk = tst_tk_(), c = vdf_carregarCard(tk, TST.TRACKER);
  var antigas = c.pecas.filter(function (p) { return !p.particular; });
  var orc = { oficina: antigas.map(function (p) { return { pneu: p.pneu, codigo: p.codigo, descricao: p.descricao, medida: p.medida, marca: p.marca, qtd: p.qtd || '1' }; })
      .concat([{ pneu: false, codigo: '52083520', descricao: 'SUPORTE LATERAL PARACHOQUE DIANT ESQ', qtd: '1', dica: 'GENUÍNO' }]),
    fo: [{ pneu: false, codigo: '42577912', descricao: 'GRADE INFERIOR PARACHOQUE', qtd: '1' }] };
  var cmp = vdf_compararComplemento(tk, TST.TRACKER, orc, '');
  Logger.log('Tracker: comparação do orçamento complementar → ' + cmp.oficina.length + ' nova(s) da oficina, ' + cmp.fo.length + ' FO nova(s), ' + cmp.jaTinha + ' já estavam no card');
  if (cmp.oficina.length || cmp.fo.length) {
    var pecas = c.pecas.map(function (p) { return { pneu: p.pneu, codigo: p.codigo, descricao: p.descricao, tipos: p.tipos, medida: p.medida, categoria: p.categoria, marca: p.marca, qtd: p.qtd, particular: p.particular, partPor: p.partPor, complemento: p.complemento, compData: p.compData }; });
    var seg = pecas.filter(function (p) { return !p.particular; }), part = pecas.filter(function (p) { return p.particular; });
    cmp.oficina.forEach(function (p) { seg.push({ pneu: false, codigo: p.codigo, descricao: p.descricao, tipos: ['GENUÍNO'], qtd: p.qtd, complemento: true }); });
    tst_log_('Tracker: consultor envia o orçamento complementar', vdf_salvar(tk, { shortLink: TST.TRACKER, dados: { placa: c.dados.placa, modelo: c.dados.modelo, ano: c.dados.ano, motor: c.dados.motor, chassi: c.dados.chassi },
      pecas: seg.concat(part), obs: c.obs || '', fileIds: [], capaId: '', orcamento: null, complemento: { origem: 'CILIA', fo: cmp.fo },
      novo: { tipo: 'SEGURADORA', carro: c.titulo.carro, cor: c.titulo.cor, seguradora: c.titulo.seguradora || c.dados.seguradora, sinistro: c.dados.sinistro || '', unidade: '' } }));
    c = vdf_carregarCard(tk, TST.TRACKER);
  }
  var nova = tst_peca_(c, 'SUPORTE LATERAL');
  Logger.log('Tracker: card em ' + c.lista + ' · peça nova marcada complemento = ' + nova.complemento + ' (' + nova.compData + ')');
  if (!c.cotacoes.cotacoes.some(function (q) { return q.chave === nova.chave; })) {
    tst_log_('Tracker: cotação da peça do complemento', vdf_salvarCotacao(tk, { shortLink: TST.TRACKER, cotacoes: [tst_cot_(c, 'SUPORTE LATERAL', 'IMPERIAL', 'GENUÍNO', '95,00', 2), tst_cot_(c, 'SUPORTE LATERAL', 'METROSUL', 'GENUÍNO', '110,00', 1)] }));
    c = vdf_carregarCard(tk, TST.TRACKER);
  }
  tst_comMencoesSoMinhas_(function () {
    tst_log_('Tracker: diretoria autoriza o complemento', vdf_autorizar(tk, { shortLink: TST.TRACKER, escolhas: [tst_barata_(c, 'SUPORTE LATERAL')], obs: [], geral: 'complemento da seguradora' }));
    c = vdf_carregarCard(tk, TST.TRACKER);
    var a = c.autorizadas.filter(function (x) { return x.chave === nova.chave; })[0];
    tst_log_('Tracker: compra do complemento (PAGAS COMPLEMENTO)', vdf_salvarCompra(tk, { shortLink: TST.TRACKER, compras: [{ chave: a.chave, fornecedor: a.fornecedor, valor: a.valor, dias: 2 }] }));
  });
  c = vdf_carregarCard(tk, TST.TRACKER);
  Logger.log('Tracker: a receber → ' + c.recebiveis.filter(function (i) { return !i.ok; }).map(function (i) { return i.lista + ': ' + i.nome; }).join(' | '));
}

/* 7) MONTANA — compra do parachoque SEM autorização: sem motivo é recusada; com motivo passa e fica no card */
function tst_cenario7() {
  var tk = tst_tk_(), c = vdf_carregarCard(tk, TST.MONTANA);
  var q = tst_barata_(c, 'PARACHOQUE TRAS');
  var sem = vdf_salvarCompra(tk, { shortLink: TST.MONTANA, compras: [{ chave: q.chave, fornecedor: q.fornecedor, valor: q.valor, dias: 4 }] });
  Logger.log((sem.ok ? '❌ aceitou sem motivo' : '✅ recusou sem motivo: ' + sem.faltas.join(' | ')));
  tst_comMencoesSoMinhas_(function () {
    tst_log_('Montana: compra fora da autorização com motivo', vdf_salvarCompra(tk, { shortLink: TST.MONTANA, compras: [{ chave: q.chave, fornecedor: q.fornecedor, valor: q.valor, dias: 4, just: 'cliente com pressa — diretoria aprovou por telefone' }] }));
  });
}

/* 8) LAND ROVER — rotina atualiza o fornecimento (FO) pela API: fornecedor + previsão; depois muda a previsão sem motivo (recusa) e com motivo */
function tst_cenario8() {
  var tk = tst_tk_(), c = vdf_carregarCard(tk, TST.LR);
  var fo = c.recebiveis.filter(function (i) { return /^FORNECIMENTO/.test(i.lista); });
  if (!fo.length) throw new Error('Land Rover sem FO');
  var d1 = Utilities.formatDate(du_somarUteis_(5) ? new Date(du_somarUteis_(5)) : new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  tst_log_('Land Rover: rotina lança fornecedor/previsão', vdf_atualizarFornecimento(tk, { shortLink: TST.LR, origem: 'rotina', itens: [{ id: fo[0].id, fornecedor: 'GM ZAFFARI', previsao: d1 }] }));
  var d2 = Utilities.formatDate(new Date(new Date(d1 + 'T12:00:00').getTime() + 3 * 864e5), 'America/Sao_Paulo', 'yyyy-MM-dd');
  var sem = vdf_atualizarFornecimento(tk, { shortLink: TST.LR, origem: 'formulário', itens: [{ id: fo[0].id, previsao: d2 }] });
  Logger.log(sem.ok ? '❌ aceitou mudar previsão sem motivo' : '✅ recusou sem motivo: ' + sem.faltas.join(' | '));
  tst_log_('Land Rover: muda previsão com motivo', vdf_atualizarFornecimento(tk, { shortLink: TST.LR, origem: 'formulário', itens: [{ id: fo[0].id, previsao: d2, motivo: 'portal HDI mudou a data' }] }));
}

function tst_fluxoCompleto() {
  ['tst_cenario1', 'tst_cenario2', 'tst_cenario3', 'tst_cenario4', 'tst_cenario5', 'tst_cenario6'].forEach(function (f) {
    try { globalThis[f](); } catch (e) { Logger.log('❌ ' + f + ': ' + e.message); }
  });
}
