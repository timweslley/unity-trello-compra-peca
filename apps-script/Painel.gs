/* ============================ PAINEL DE INDICADORES ============================
 * Aba PAINEL da planilha, montada a partir da aba EVENTOS (só o quadro em uso — vd_board_()).
 * Atualiza todo dia junto com a conferência diária (sd_diario) e na mão: pn_atualizar().
 *  1. Resumo dos últimos 30 dias          4. Compras fora da autorização (motivos)
 *  2. Fornecedores: prazo prometido x real 5. Travas por usuário (onde treinar a equipe)
 *  3. Tempo por etapa (mediana, dias)
 */
var PN = { ABA: 'PAINEL', DIAS: 30, AZUL: '#0c66e4', CINZA: '#f1f2f4' };

function pn_atualizar() {
  var ss = vd_planilhaBackup_().getParent(), ev = ss.getSheetByName(EV.ABA);
  var linhas = ev && ev.getLastRow() > 1 ? ev.getRange(2, 1, ev.getLastRow() - 1, EV.CAB.length).getValues() : [];
  var quadro = vd_board_(), desde = Date.now() - PN.DIAS * 864e5;
  // colunas: 0 data,1 evento,2 card,3 link,4 placa,5 unidade,6 tipo,7 peça,8 particular,9 fornecedor,10 valor,11 dias,12 previsão,13 usuário,14 detalhe,15 quadro
  var L = linhas.filter(function (r) { return r[0] instanceof Date && (!r[15] || r[15] === quadro); });
  var rec30 = L.filter(function (r) { return r[0].getTime() >= desde; });
  var conta = function (arr, ev) { return arr.filter(function (r) { return r[1] === ev; }).length; };
  var cards = function (arr, ev) { var s = {}; arr.forEach(function (r) { if (r[1] === ev) s[r[3] || r[2]] = 1; }); return Object.keys(s).length; };
  var soma = function (arr, f) { return arr.reduce(function (t, r) { return t + (f(r) ? (+r[10] || 0) : 0); }, 0); };

  var out = [];   // [texto/valores, estilo]
  var titulo = function (t) { out.push({ v: [t], t: 'tit' }); };
  var cab = function (a) { out.push({ v: a, t: 'cab' }); };
  var lin = function (a, fmt) { out.push({ v: a, t: 'lin', f: fmt }); };
  var vazio = function () { out.push({ v: [''], t: '' }); };

  out.push({ v: ['📊 PAINEL — COMPRA DE PEÇA (' + (quadro === VD.BOARD_PADRAO ? 'quadro TESTE' : 'quadro principal') + ')'], t: 'top' });
  out.push({ v: ['Atualizado em ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm') + ' · fonte: aba EVENTOS · ' + L.length + ' evento(s)'], t: 'sub' });
  vazio();

  // 1. resumo 30 dias
  titulo('1. ÚLTIMOS ' + PN.DIAS + ' DIAS');
  cab(['Indicador', 'Valor']);
  var compras30 = rec30.filter(function (r) { return r[1] === 'COMPRA'; });
  var receb30 = rec30.filter(function (r) { return r[1] === 'RECEBIMENTO' && r[11] !== ''; });
  var noPrazo30 = receb30.filter(function (r) { return +r[11] <= 0; }).length;
  lin(['Pedidos novos (cards)', cards(rec30, 'PEDIDO')]);
  lin(['Cards cotados', cards(rec30, 'COTAÇÃO')]);
  lin(['Cards autorizados', cards(rec30, 'AUTORIZAÇÃO')]);
  lin(['Devoluções para cotação', conta(rec30, 'DEVOLUÇÃO')]);
  lin(['Peças compradas', compras30.length]);
  lin(['Valor comprado — seguradora', soma(compras30, function (r) { return r[6] !== 'PARTICULAR' && r[6] !== 'RETORNO' && r[8] !== 'SIM'; })], 'R$ #,##0.00');
  lin(['Valor comprado — particular', soma(compras30, function (r) { return r[6] === 'PARTICULAR' || r[8] === 'SIM'; })], 'R$ #,##0.00');
  lin(['Valor comprado — retorno (oficina paga)', soma(compras30, function (r) { return r[6] === 'RETORNO' && r[8] !== 'SIM'; })], 'R$ #,##0.00');
  lin(['Compras fora da autorização', compras30.filter(function (r) { return /FORA DA AUTORIZA/.test(r[14]); }).length]);
  lin(['Peças recebidas', conta(rec30, 'RECEBIMENTO')]);
  lin(['Recebidas no prazo', receb30.length ? noPrazo30 / receb30.length : ''], '0%');
  lin(['Alterações à mão desfeitas (travas)', conta(rec30, 'MOVIMENTO DESFEITO') + conta(rec30, 'CHECKLIST DESFEITO')]);
  vazio();

  // 2. fornecedores
  titulo('2. FORNECEDORES — PRAZO PROMETIDO x REAL (todo o período)');
  cab(['Fornecedor', 'Peças compradas', 'Valor comprado', 'Peças recebidas', 'Atraso médio (d.u.)', 'No prazo', 'Pior atraso (d.u.)']);
  var F = {};
  L.forEach(function (r) {
    var f = String(r[9] || '').trim().toUpperCase();
    if (!f || (r[1] !== 'COMPRA' && r[1] !== 'RECEBIMENTO')) return;
    var x = F[f] || (F[f] = { comp: 0, valor: 0, rec: 0, atrasos: [] });
    if (r[1] === 'COMPRA') { x.comp++; x.valor += +r[10] || 0; }
    if (r[1] === 'RECEBIMENTO') { x.rec++; if (r[11] !== '' && !isNaN(+r[11])) x.atrasos.push(+r[11]); }
  });
  var fs = Object.keys(F).sort(function (a, b) { return (F[b].comp + F[b].rec) - (F[a].comp + F[a].rec); });
  if (!fs.length) lin(['(sem compras registradas ainda)']);
  fs.forEach(function (f) {
    var x = F[f], n = x.atrasos.length;
    lin([f, x.comp, x.valor, x.rec, n ? x.atrasos.reduce(function (t, v) { return t + v; }, 0) / n : '', n ? x.atrasos.filter(function (v) { return v <= 0; }).length / n : '', n ? Math.max.apply(null, x.atrasos) : ''],
      [null, '0', 'R$ #,##0.00', '0', '0.0', '0%', '0']);
  });
  vazio();

  // 3. tempo por etapa
  titulo('3. TEMPO POR ETAPA (mediana em dias corridos, cards com as duas pontas)');
  cab(['Etapa', 'Mediana (dias)', 'Cards medidos']);
  var C = {};
  L.forEach(function (r) {
    var k = r[3] || r[2]; if (!k) return;
    var c = C[k] || (C[k] = {}), t = r[0].getTime(), e = r[1];
    if (['PEDIDO', 'COTAÇÃO', 'AUTORIZAÇÃO', 'COMPRA'].indexOf(e) >= 0 && !c[e]) c[e] = t;
    if (e === 'RECEBIMENTO') c.REC = t;
  });
  var etapa = function (nome, a, b) {
    var ds = Object.keys(C).map(function (k) { var c = C[k]; return c[a] && c[b] && c[b] >= c[a] ? (c[b] - c[a]) / 864e5 : null; }).filter(function (v) { return v !== null; }).sort(function (x, y) { return x - y; });
    var med = ds.length ? (ds.length % 2 ? ds[(ds.length - 1) / 2] : (ds[ds.length / 2 - 1] + ds[ds.length / 2]) / 2) : '';
    lin([nome, med, ds.length], [null, '0.0', '0']);
  };
  etapa('Pedido → cotação', 'PEDIDO', 'COTAÇÃO');
  etapa('Cotação → autorização', 'COTAÇÃO', 'AUTORIZAÇÃO');
  etapa('Autorização → compra', 'AUTORIZAÇÃO', 'COMPRA');
  etapa('Compra → última peça recebida', 'COMPRA', 'REC');
  etapa('Pedido → última peça recebida (total)', 'PEDIDO', 'REC');
  vazio();

  // 4. fora da autorização
  titulo('4. COMPRAS FORA DA AUTORIZAÇÃO (últimas 20)');
  cab(['Data', 'Card', 'Peça', 'Fornecedor', 'Valor', 'Comprador', 'Motivo']);
  var fora = L.filter(function (r) { return r[1] === 'COMPRA' && /FORA DA AUTORIZA/.test(r[14]); }).slice(-20).reverse();
  if (!fora.length) lin(['(nenhuma)']);
  fora.forEach(function (r) {
    var motivo = String(r[14]).split(' — ').slice(1).join(' — ') || String(r[14]).replace(/^FORA DA AUTORIZAÇÃO:\s*/, '');
    lin([r[0], r[2], r[7], r[9], r[10], r[13], motivo], ['dd/MM/yyyy', null, null, null, 'R$ #,##0.00', null, null]);
  });
  vazio();

  // 5. travas por usuário
  titulo('5. ALTERAÇÕES À MÃO DESFEITAS POR USUÁRIO (últimos ' + PN.DIAS + ' dias) — onde reforçar o treinamento');
  cab(['Usuário', 'Movimentos de coluna', 'Checklists', 'Total']);
  var U = {};
  rec30.forEach(function (r) {
    if (r[1] !== 'MOVIMENTO DESFEITO' && r[1] !== 'CHECKLIST DESFEITO') return;
    var u = r[13] || '?', x = U[u] || (U[u] = { mov: 0, ck: 0 });
    if (r[1] === 'MOVIMENTO DESFEITO') x.mov++; else x.ck++;
  });
  var us = Object.keys(U).sort(function (a, b) { return (U[b].mov + U[b].ck) - (U[a].mov + U[a].ck); });
  if (!us.length) lin(['(nenhuma)']);
  us.forEach(function (u) { lin([u, U[u].mov, U[u].ck, U[u].mov + U[u].ck]); });

  // escreve
  var sh = ss.getSheetByName(PN.ABA) || ss.insertSheet(PN.ABA, 0);
  sh.clear(); sh.clearFormats();
  var larg = 7;
  out.forEach(function (o, i) {
    var row = i + 1, v = o.v.slice(); while (v.length < larg) v.push('');
    var rg = sh.getRange(row, 1, 1, larg);
    rg.setValues([v]);
    if (o.t === 'top') rg.setFontSize(15).setFontWeight('bold').setFontColor(PN.AZUL);
    else if (o.t === 'sub') rg.setFontColor('#626f86').setFontStyle('italic');
    else if (o.t === 'tit') rg.setFontWeight('bold').setFontSize(11).setBackground(PN.AZUL).setFontColor('#ffffff');
    else if (o.t === 'cab') rg.setFontWeight('bold').setBackground(PN.CINZA);
    else if (o.t === 'lin' && o.f) {
      if (typeof o.f === 'string') sh.getRange(row, 2).setNumberFormat(o.f);
      else o.f.forEach(function (f, j) { if (f) sh.getRange(row, j + 1).setNumberFormat(f); });
    }
  });
  sh.setColumnWidth(1, 300); for (var c = 2; c <= larg; c++) sh.setColumnWidth(c, 140);
  sh.setFrozenRows(2);
  Logger.log('painel: ' + out.length + ' linhas · ' + ss.getUrl() + '#gid=' + sh.getSheetId());
  return ss.getUrl() + '#gid=' + sh.getSheetId();
}
