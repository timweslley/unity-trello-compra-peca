/* ============================ ROTEIRO DE TESTE (só quadro TESTE) ============================
 * Roda o fluxo de verdade em cards do quadro TESTE, chamando as MESMAS funções do formulário
 * (vdf_*) com a conta do script — para ver no quadro como fica cada etapa.
 * Só funciona com VD_BOARD = quadro TESTE. Durante o teste as menções a compras ficam só no Weslley.
 *   tst_atualizarCards()  — redesenha a descrição de todos os cards no modelo novo + links do formulário
 *   tst_fluxoCompleto()   — os cenários abaixo, em sequência · tst_saude() — conferência geral
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

/* ============================ CONFERÊNCIA GERAL (só lê) ============================ */
function tst_saude() {
  var tk = tst_tk_(), ok = 0, prob = [];
  var P = PropertiesService.getScriptProperties();
  var bate = function (cond, txt) { if (cond) ok++; else prob.push(txt); };
  // acionadores
  var acs = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  Logger.log('acionadores: ' + acs.join(', '));
  bate(acs.indexOf('validarDadosPedido') >= 0, 'falta o acionador validarDadosPedido');
  bate(acs.indexOf('verificarAlteracoesDescricao') >= 0, 'falta o acionador do log de descrição (quadro principal)');
  bate(!P.getProperty('LOG_RECUPERANDO'), 'LOG_RECUPERANDO ficou marcado (log do quadro principal parado)');
  bate(vd_modo_() === 'ATIVO', 'VD_MODO não está ATIVO');
  bate(!!vd_marca_('CK_DESDE'), 'trava de checklist não iniciou (CK_DESDE)');
  bate(!!vd_marca_('CP_DESDE'), 'complemento por anexo não iniciou (CP_DESDE)');
  // log do quadro principal em dia
  var ult = P.getProperty('ULTIMA_VERIFICACAO');
  bate(ult && Date.now() - new Date(ult).getTime() < 15 * 60000, 'log de descrição do quadro principal atrasado (' + ult + ')');
  // cada card do TESTE abre no formulário e tem vitrine/campos coerentes
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { cru: true, query: { fields: 'name,shortLink,desc' } });
  cards.forEach(function (c) {
    if (vdf_cardProtegido_(c.name || '') || /^\s*AVISO\b/i.test(c.name || '')) return;
    try {
      var m = vdf_carregarCard(tk, c.shortLink);
      bate(!!m.totais, c.name + ': sem totais');
      var semVit = m.padrao && !/\*\*/.test(c.desc || '');
      bate(!semVit, c.name + ': descrição no padrão mas sem vitrine');
      var compl = vd_completa_(c.id);
      bate(!m.padrao || !!compl, c.name + ': sem cópia completa na aba TRAVA');
      (m.recebiveis || []).forEach(function (r) { if (!r.ok && r.due && new Date(r.due) < new Date(Date.now() - 864e5)) prob.push(c.name + ': ' + r.nome.split(' - ')[0] + ' com previsão vencida (' + r.dueTxt + ') sem ✔'); });
    } catch (e) { prob.push(c.name + ': não abre no formulário — ' + e.message); }
  });
  // planilha
  var ss = vd_planilhaBackup_().getParent();
  ['TRAVA', 'EVENTOS', 'FORNECEDORES', 'CHECKLISTS'].forEach(function (a) { bate(!!ss.getSheetByName(a), 'falta a aba ' + a); });
  // permissões (simuladas)
  var cons = { username: 'consultor_teste' }, dir = { username: 'timweslley' }, comp = { username: 'comprasunity' };
  bate(!vdf_podeComprar_(cons) && vdf_podeComprar_(dir) && vdf_podeComprar_(comp), 'permissão de compra/cotação errada');
  bate(vdf_ehAutorizador_(dir) && !vdf_ehAutorizador_(comp), 'permissão de diretoria errada');
  Logger.log('✅ ' + ok + ' conferência(s) ok');
  prob.forEach(function (x) { Logger.log('⚠️ ' + x); });
  return prob;
}

/* 9) PONTA A PONTA num card novo (particular): pedido -> cotação -> autorização -> compra (1 fora da
 *    autorização, com motivo) -> previsão alterada -> recebimento -> ENCERRADO. Card: TST9A99. */
function tst_cenario9() {
  var tk = tst_tk_();
  var ex = vdf_buscarPlaca(tk, 'TST9A99');
  var sl = ex && ex.length ? ex[0].shortLink : '';
  if (!sl) {
    var r = tst_log_('Novo: pedido particular', vdf_salvar(tk, { shortLink: '', dados: { placa: 'TST9A99', modelo: 'VW GOL 1.0', ano: '2020/2021', motor: '1.0', chassi: '9BWAG45U0LT000001' },
      pecas: [{ pneu: false, codigo: '5U0807221', descricao: 'PARACHOQUE DIANT', tipos: ['ORIGINAL'], qtd: '1' }, { pneu: false, codigo: '5U0941005', descricao: 'FAROL ESQ', tipos: ['PARALELO'], qtd: '1' }],
      obs: 'card de teste ponta a ponta', fileIds: [], capaId: '', orcamento: null,
      novo: { tipo: 'PARTICULAR', carro: 'GOL', cor: 'BRANCO', seguradora: '', sinistro: '', unidade: '' } }));
    sl = r.shortLink;
  }
  var c = vdf_carregarCard(tk, sl);
  Logger.log('Novo: card ' + c.nome + ' em ' + c.lista);
  if (!c.cotacoes.cotacoes.length) {
    tst_log_('Novo: cotação', vdf_salvarCotacao(tk, { shortLink: sl, cotacoes: [tst_cot_(c, 'PARACHOQUE', 'IMPERIAL', 'ORIGINAL', '450,00', 2), tst_cot_(c, 'PARACHOQUE', 'METROSUL', 'ORIGINAL', '480,00', 1), tst_cot_(c, 'FAROL', 'AVENIDA', 'PARALELO', '210,00', 3)] }));
    c = vdf_carregarCard(tk, sl);
  }
  tst_comMencoesSoMinhas_(function () {
    if (!c.autorizadas.length) { tst_log_('Novo: autorização', vdf_autorizar(tk, { shortLink: sl, escolhas: [tst_barata_(c, 'PARACHOQUE'), tst_barata_(c, 'FAROL')], obs: [], geral: '' })); c = vdf_carregarCard(tk, sl); }
    if (!c.pagas.length) {
      var para = c.autorizadas.filter(function (a) { return a.chave === tst_peca_(c, 'PARACHOQUE').chave; })[0];
      var far = c.autorizadas.filter(function (a) { return a.chave === tst_peca_(c, 'FAROL').chave; })[0];
      // sem a etiqueta ORDEM AUTORIZADA a compra é recusada
      var semEt = vdf_salvarCompra(tk, { shortLink: sl, compras: [{ chave: far.chave, fornecedor: far.fornecedor, valor: far.valor, dias: 3 }] });
      Logger.log(semEt.ok ? '❌ compra sem etiqueta ORDEM AUTORIZADA passou' : '✅ compra sem etiqueta ORDEM AUTORIZADA recusada');
      var etq = vd_api_('/boards/' + vd_board_() + '/labels', { query: { fields: 'name', limit: 100 } }).filter(function (l) { return /ORDEM AUTORIZADA/i.test(l.name || ''); })[0];
      var cid = vd_api_('/cards/' + sl, { query: { fields: 'id' } }).id;
      if (etq) vd_api_('/cards/' + cid + '/idLabels', { method: 'post', payload: { value: etq.id } });
      var sem = vdf_salvarCompra(tk, { shortLink: sl, compras: [{ chave: para.chave, fornecedor: 'METROSUL', valor: 480, dias: 1 }] });
      Logger.log(sem.ok ? '❌ compra fora da autorização passou sem motivo' : '✅ compra fora da autorização sem motivo recusada');
      tst_log_('Novo: compra (parachoque fora da autorização, com motivo)', vdf_salvarCompra(tk, { shortLink: sl, compras: [
        { chave: para.chave, fornecedor: 'METROSUL', valor: 480, dias: 1, just: 'Imperial sem estoque hoje, Metrosul entrega amanhã' },
        { chave: far.chave, fornecedor: far.fornecedor, valor: far.valor, dias: 3 }] }));
      c = vdf_carregarCard(tk, sl);
    }
  });
  var rv = c.recebiveis.filter(function (i) { return /FAROL/.test(i.nome) && !i.ok; })[0];
  if (rv) {
    var nova = Utilities.formatDate(new Date(Date.now() + 6 * 864e5), 'America/Sao_Paulo', 'yyyy-MM-dd');
    var sm = vdf_alterarPrevisao(tk, { shortLink: sl, itens: [{ tipo: 'PAGAS', id: rv.id, previsao: nova }] });
    Logger.log(sm.ok ? '❌ previsão mudou sem motivo' : '✅ previsão sem motivo recusada');
    tst_log_('Novo: previsão do farol alterada com motivo', vdf_alterarPrevisao(tk, { shortLink: sl, itens: [{ tipo: 'PAGAS', id: rv.id, previsao: nova, motivo: 'fornecedor atrasou o envio' }] }));
    c = vdf_carregarCard(tk, sl);
  }
  // diretoria pode mexer em peça comprada; a trava vale para quem não é diretoria
  var trav = c.pecas.filter(function (p) { return p.travada; }).map(function (p) { return p.nome + ' (' + p.travada + ')'; });
  Logger.log((trav.length === 2 ? '✅' : '❌') + ' peças travadas: ' + trav.join('; '));
  var pend = c.recebiveis.filter(function (i) { return !i.ok; });
  if (pend.length) tst_log_('Novo: recebimento de tudo', vdf_salvarRecebimento(tk, { shortLink: sl, itens: pend.map(function (i) { return { id: i.id, data: '', obs: '' }; }), anexos: [], geral: 'teste ponta a ponta' }));
  c = vdf_carregarCard(tk, sl);
  Logger.log('Novo: terminou em ' + c.lista + ' · total seg+part ' + vd_valorBR_(c.totais.tot.valor) + ' (part. ' + vd_valorBR_(c.totais.part.valor) + ')');
}

function tst_fluxoCompleto() {
  ['tst_cenario1', 'tst_cenario2', 'tst_cenario3', 'tst_cenario4', 'tst_cenario5', 'tst_cenario6'].forEach(function (f) {
    try { globalThis[f](); } catch (e) { Logger.log('❌ ' + f + ': ' + e.message); }
  });
}

/* DEMONSTRAÇÃO (prints do guia): 4 cards particulares, cada um parado numa etapa.
 * DEM1A01 EM COTAÇÃO · DEM2A02 COTAÇÃO FINALIZADA · DEM3A03 AUTORIZADO COMPRA (sem etiqueta) · DEM4A04 FALTA CHEGAR */
function tst_demo() {
  var tk = tst_tk_();
  var pecas = [{ pneu: false, codigo: '5U0807221', descricao: 'PARACHOQUE DIANT', tipos: ['ORIGINAL'], qtd: '1' }, { pneu: false, codigo: '5U0941005', descricao: 'FAROL ESQ', tipos: ['PARALELO'], qtd: '1' }];
  var etq = vd_api_('/boards/' + vd_board_() + '/labels', { query: { fields: 'name', limit: 100 } }).filter(function (l) { return /ORDEM AUTORIZADA/i.test(l.name || ''); })[0];
  var out = {};
  [['DEM1A01', 1], ['DEM2A02', 2], ['DEM3A03', 3], ['DEM4A04', 4]].forEach(function (d) {
    var placa = d[0], ate = d[1];
    var ex = vdf_buscarPlaca(tk, placa), sl = ex && ex.length ? ex[0].shortLink : '';
    if (!sl) sl = vdf_salvar(tk, { shortLink: '', dados: { placa: placa, modelo: 'VW GOL 1.0', ano: '2020/2021', motor: '1.0', chassi: '9BWAG45U0LT00000' + ate },
      pecas: pecas, obs: 'card de demonstração', fileIds: [], capaId: '', orcamento: null,
      novo: { tipo: 'PARTICULAR', carro: 'GOL', cor: 'BRANCO', seguradora: '', sinistro: '', unidade: '' } }).shortLink;
    var c = vdf_carregarCard(tk, sl);
    tst_comMencoesSoMinhas_(function () {
      if (ate >= 2 && !c.cotacoes.cotacoes.length) { vdf_salvarCotacao(tk, { shortLink: sl, cotacoes: [tst_cot_(c, 'PARACHOQUE', 'IMPERIAL', 'ORIGINAL', '450,00', 2), tst_cot_(c, 'PARACHOQUE', 'METROSUL', 'ORIGINAL', '480,00', 1), tst_cot_(c, 'FAROL', 'AVENIDA', 'PARALELO', '210,00', 3)] }); c = vdf_carregarCard(tk, sl); }
      if (ate >= 3 && !c.autorizadas.length) { vdf_autorizar(tk, { shortLink: sl, escolhas: [tst_barata_(c, 'PARACHOQUE'), tst_barata_(c, 'FAROL')], obs: [], geral: '' }); c = vdf_carregarCard(tk, sl); }
      if (ate >= 4 && !c.pagas.length) {
        var cid = vd_api_('/cards/' + sl, { query: { fields: 'id' } }).id;
        if (etq) { try { vd_api_('/cards/' + cid + '/idLabels', { method: 'post', payload: { value: etq.id } }); } catch (e) {} }
        vdf_salvarCompra(tk, { shortLink: sl, compras: c.autorizadas.map(function (a) { return { chave: a.chave, fornecedor: a.fornecedor, valor: a.valor, dias: 3 }; }) });
      }
    });
    out[placa] = 'https://trello.com/c/' + sl + ' · ' + vdf_carregarCard(tk, sl).lista;
  });
  Logger.log(JSON.stringify(out, null, 1));
  return out;
}
