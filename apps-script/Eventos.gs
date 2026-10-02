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
        'Fornecedor', 'Valor', 'Prazo (dias úteis)', 'Previsão', 'Usuário', 'Detalhe', 'Quadro']
};

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
  return sh;
}

function ev_unidade_(card) {
  var nomes = ((card && card.labels) || []).map(function (l) { return String(l.name || '').toUpperCase(); }).join(' ');
  if (/TOLEDO|\bTOL\b/.test(nomes)) return 'TOLEDO';
  if (/RONDON|\bMCR\b/.test(nomes)) return 'MARECHAL C. RONDON';
  if (/CASCAVEL|\bCVEL\b/.test(nomes)) return 'CASCAVEL';
  if (/MOUR/.test(nomes)) return 'CAMPO MOURÃO';
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
    var agora = new Date();
    var placa = vd_placaDoTexto_(card.name || '') || '';
    var tipo = extra.tipo || (/\bPARTICULAR\b/i.test(card.name || '') ? 'PARTICULAR' : 'SEGURADORA');
    var base = function (it) {
      it = it || {};
      var prev = it.previsao ? new Date(it.previsao) : '';
      return [agora, evento, card.name || '', card.shortUrl || (card.shortLink ? 'https://trello.com/c/' + card.shortLink : ''),
        placa, ev_unidade_(card), tipo, it.peca || '', it.particular ? 'SIM' : '',
        it.fornecedor || '', (it.valor === 0 || it.valor) && !isNaN(+it.valor) ? +it.valor : '',
        it.dias === 0 || it.dias ? it.dias : '', prev && !isNaN(prev) ? prev : '',
        usuario || '', it.detalhe || extra.detalhe || '', vd_board_()];
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
