/* ============================ REGISTRO DE EVENTOS ============================
 * Cada ação do fluxo vira uma linha na aba EVENTOS da planilha de backup: pedido, cotação,
 * autorização, devolução, compra, recebimento, movimento de coluna, trava e alertas de prazo.
 * É a base do futuro sistema interno e dos indicadores (tempo por etapa, prazo prometido x real
 * por fornecedor, economia na autorização).
 * Desligar: propriedade EV_LIGADO = NAO. Nunca derruba a ação principal (tudo em try/catch).
 */
var EV = {
  ABA: 'EVENTOS',
  CAB: ['Data/hora', 'Evento', 'Card', 'Link', 'Placa', 'Unidade', 'Tipo do pedido', 'Peça', 'Particular',
        'Fornecedor', 'Valor', 'Prazo (dias úteis)', 'Previsão', 'Usuário', 'Detalhe', 'Quadro', 'Registro']
};
/* 26/10/2026 (Weslley): coluna "Registro" = frase pronta "@usuario <o que fez> …" (ex.: "@comprasunity registrou compra — PEÇA",
 * "@comprasunity alterou o prazo de PEÇA de 22/10 para 03/11 pelo motivo: …"). Robô/rotina sem usuário do Trello: sem @. */
var EV_VERBOS = { 'COTAÇÃO': 'lançou cotação', 'COTAÇÃO INDISPONÍVEL': 'marcou cotação indisponível', 'AUTORIZAÇÃO': 'autorizou', 'COMPRA': 'registrou compra',
  'COMPRA CANCELADA': 'cancelou a compra', 'PREVISÃO': 'alterou o prazo', 'FORNECIMENTO': 'atualizou o fornecimento', 'RECEBIMENTO': 'registrou recebimento',
  'RETIRADA': 'registrou retirada', 'DEVOLUÇÃO': 'registrou devolução', 'DEVOLUÇÃO FO': 'registrou devolução de FO', 'PEDIDO EDITADO': 'editou o pedido',
  'COMPLEMENTO': 'marcou complemento', 'CÓDIGO CORRIGIDO': 'corrigiu o código', 'COLUNA': 'moveu o card', 'FATURADO': 'registrou faturamento' };
function ev_frase_(evento, usuario, it) {
  it = it || {};
  var u = String(usuario || '').trim(), quem = /^[a-z0-9_.\-]{3,}$/i.test(u) && !/^rob/i.test(u) ? '@' + u : (u || 'robô');
  var verbo = EV_VERBOS[evento] || String(evento || '').toLowerCase();
  var det = String(it.detalhe || '').trim(), peca = String(it.peca || '').trim();
  if (evento === 'PREVISÃO') {
    var mp = det.match(/^PREVIS[ÃA]O\s+(?:(\S+)\s+→\s+)?(\S+)(?:\s+\(([^)]*)\))?(?::\s*(.*))?$/), ma = det.match(/^PRAZO AUTORIZADO ALTERADO:\s*(.*)$/);
    if (mp) return quem + ' alterou o prazo de ' + peca + (mp[1] ? ' de ' + mp[1] : '') + ' para ' + mp[2] + (mp[4] ? ' pelo motivo: ' + mp[4] : '');
    if (ma) return quem + ' alterou o prazo autorizado de ' + peca + (it.dias !== '' && it.dias != null ? ' para ' + it.dias + ' d.u.' : '') + ' pelo motivo: ' + ma[1];
  }
  return quem + ' ' + verbo + (peca ? ' — ' + peca : '') + (det ? ' (' + det + ')' : '');
}

var EV_CAB_OK = false;
function ev_ligado_() { return vd_prop_('EV_LIGADO', 'SIM') !== 'NAO'; }

function ev_aba_() {
  var ss = vd_planilhaBackup_().getParent();
  var sh = ss.getSheetByName(EV.ABA);
  if (!sh) {
    sh = ss.insertSheet(EV.ABA);
    sh.getRange(1, 1, 1, EV.CAB.length).setValues([EV.CAB]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sh.getRange('K:K').setNumberFormat('R$ #,##0.00');
    sh.getRange('M:M').setNumberFormat('dd/MM/yyyy');
  }
  // aba antiga (16 colunas): ganha o título da coluna nova uma vez
  if (!EV_CAB_OK) { try { if (sh.getRange(1, EV.CAB.length).getValue() !== EV.CAB[EV.CAB.length - 1]) sh.getRange(1, EV.CAB.length).setValue(EV.CAB[EV.CAB.length - 1]).setFontWeight('bold'); } catch (e) {} EV_CAB_OK = true; }
  return sh;
}

/** Unidade do card: campo personalizado "Unidade" (fonte); etiqueta TOL/MCR/CVEL/CMO só para cards antigos sem o campo. */
function ev_unidade_(card) {
  var u = '';
  try { u = cf_unidadeDoCard_(card); } catch (e) {}
  if (u) return u;
  return ev_unidadeEtiqueta_(card);
}
function ev_unidadeEtiqueta_(card) {
  var nomes = ((card && card.labels) || []).map(function (l) { return String(l.name || '').toUpperCase(); }).join(' ');
  if (/TOLEDO|\bTOL\b/.test(nomes)) return 'TOLEDO';
  if (/RONDON|\bMCR\b/.test(nomes)) return 'RONDON';
  if (/CASCAVEL|\bCVEL\b/.test(nomes)) return 'CASCAVEL';
  if (/MOUR/.test(nomes)) return 'MOURÃO';
  return '';
}

/**
 * Registra um evento. card = {name, shortLink, shortUrl, labels}; usuario = username ou nome;
 * itens = [{peca, particular, fornecedor, valor, dias, previsao, detalhe}] (vazio = 1 linha só).
 * extra = {tipo, detalhe}
 */
function ev_registrar_(evento, card, usuario, itens, extra) {
  if (!ev_ligado_()) return;
  try {
    extra = extra || {};
    card = card || {};
    // 17/10/2026 (teste das cópias): card de teste no quadro principal (TST_CARDS, 🧪 ou placa ZZT) não entra nos
    // eventos — senão as métricas de prazo/compra contam peça que nunca existiu
    if (/🧪|\bZZT\d/.test(card.name || '')) return;
    try { var tst = JSON.parse(PropertiesService.getScriptProperties().getProperty('TST_CARDS') || '[]');
      if (tst.indexOf(card.id) >= 0 || tst.indexOf(card.shortLink) >= 0) return; } catch (e) {}
    var agora = new Date();
    var placa = vd_placaDoTexto_(card.name || '') || '';
    var tipo = extra.tipo || (/\bPARTICULAR\b/i.test(card.name || '') ? 'PARTICULAR' : /\bRETORNO\b/i.test(card.name || '') ? 'RETORNO' : 'SEGURADORA');
    var base = function (it) {
      it = it || {};
      var prev = it.previsao ? new Date(it.previsao) : '';
      return [agora, evento, card.name || '', card.shortUrl || (card.shortLink ? 'https://trello.com/c/' + card.shortLink : ''),
        placa, ev_unidade_(card), tipo, it.peca || '', it.particular ? 'SIM' : '',
        it.fornecedor || '', (it.valor === 0 || it.valor) && !isNaN(+it.valor) ? +it.valor : '',
        it.dias === 0 || it.dias ? it.dias : '', prev && !isNaN(prev) ? prev : '',
        usuario || '', it.detalhe || extra.detalhe || '', vd_board_(), ev_frase_(evento, usuario, { peca: it.peca, dias: it.dias, detalhe: it.detalhe || extra.detalhe || '' })];
    };
    var linhas = (itens && itens.length ? itens : [null]).map(base).map(function (l) { return l.map(sg_celula_); });
    // appendRow é atômico por linha: robô e formulário podem gravar ao mesmo tempo sem se atropelar
    // (não usa a trava do script — o robô a segura durante a rodada inteira)
    var sh = ev_aba_();
    linhas.forEach(function (l) { sh.appendRow(l); });
  } catch (e) { console.log('eventos: ' + e); }
}

/** Peça -> campos do evento. */
function ev_peca_(p) {
  if (!p) return { peca: '' };
  return { peca: p.pneu ? 'PNEU ' + String(p.medida || '').replace(/\s+/g, '') + (p.marca ? ' ' + p.marca : '') : vd_nomePeca_(p), particular: !!p.particular };
}

/** Roda na mão: cria a aba e mostra o link da planilha. */
function ev_abrirPlanilha() {
  var sh = ev_aba_();
  Logger.log('Aba EVENTOS: ' + sh.getParent().getUrl() + '#gid=' + sh.getSheetId());
}
