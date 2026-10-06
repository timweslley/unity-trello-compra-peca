/* ============================ FATURAMENTO ============================
 * Substitui as 2 regras do Butler "comentário com faturado -> arquivar" (desligar no Butler na virada).
 * Comentário "faturado" num card de ENCERRADO COMPRAS/FORNEC. ou ENTREGUES:
 *   - só vale de quem confirma faturamento (FAT_USUARIOS, padrão financeirounity,christianfarias23);
 *   - "não faturado", "faturado?", "falta faturar"... não contam (ignorados);
 *   - todos os checklists completos -> arquiva o card e registra FATURADO na planilha de eventos;
 *   - senão responde no card dizendo o que falta (o card fica).
 * Vale para todos os cards, inclusive os antigos (anteriores à virada).
 * Cobrança: card em ENTREGUES há 7+ dias úteis -> menciona os mesmos usuários (ver PRAZOS POR ETAPA, Fluxo.gs).
 * Desligar: FAT_LIGADO = NAO.
 */
var FAT = { LISTAS: ['ENCERRADO COMPRAS/FORNEC.', 'ENTREGUES'], MARCA: '🧾' };

function fat_usuarios_() {
  var us = String(vd_prop_('FAT_USUARIOS', 'financeirounity,christianfarias23')).toLowerCase().split(/[,;\s]+/).filter(String);
  if (vd_board_() === VD.BOARD_PADRAO && us.indexOf('timweslley') < 0) us.push('timweslley');   // TESTE: dá para testar com a conta do script
  return us;
}

/** "faturado" afirmativo? (palavra inteira, sem negação nem pergunta) */
function fat_ehConfirmacao_(txt) {
  var t = vd_semAcento_(txt || '');
  if (!/\bFATURAD[OA]S?\b/.test(t)) return false;
  if (/\?/.test(t)) return false;
  if (/\b(NAO|FALTA|FALTAM|PENDENTE|AGUARDANDO|AGUARDA|SEM|NUNCA|AINDA NAO)\b/.test(t)) return false;
  return true;
}

function fat_executar_() {
  if (vd_prop_('FAT_LIGADO', 'SIM') === 'NAO' || !vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var desde = vd_marca_('FAT_ULTIMA');
  if (!desde) { vd_marcaSet_('FAT_ULTIMA', new Date().toISOString()); return 0; }   // 1ª vez: só daqui para frente
  var board = vd_board_();
  var acoes = vd_acoesQuadro_(board, { filter: 'commentCard', since: desde, limit: 100, memberCreator_fields: 'username,fullName' });
  if (!acoes.length) return 0;
  vd_marcaSet_('FAT_ULTIMA', new Date(new Date(acoes[0].date).getTime() + 1).toISOString());   // a 1ª é a mais nova
  var ls = vd_listas_(board), nomeL = {};
  Object.keys(ls).forEach(function (k) { nomeL[ls[k]] = k; });
  var us = fat_usuarios_(), n = 0, vistos = {};
  acoes.reverse().forEach(function (a) {
    var txt = (a.data && a.data.text) || '', cardId = a.data && a.data.card && a.data.card.id;
    if (!cardId || vistos[cardId]) return;
    if (txt.indexOf(FAT.MARCA) >= 0 || txt.indexOf('⏰') >= 0) return;   // comentário do próprio robô
    if (!fat_ehConfirmacao_(txt)) return;
    var quem = a.memberCreator ? String(a.memberCreator.username || '').toLowerCase() : '';
    var c;
    try { c = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'name,idList,closed,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state' } }); } catch (e) { return; }
    if (!c || c.closed || vdf_cardProtegido_(c.name || '')) return;
    vistos[cardId] = 1;
    var lista = nomeL[c.idList] || '';
    try {
      if (us.indexOf(quem) < 0) {
        vd_comentar_(c, '@' + quem + ' ' + FAT.MARCA + ' O faturamento é confirmado por ' + us.filter(function (u) { return u !== 'timweslley' || vd_board_() === VD.BOARD_PADRAO; }).map(function (u) { return '@' + u; }).join(' / ') + ' — o card não foi arquivado.');
        return;
      }
      if (FAT.LISTAS.indexOf(lista) < 0) {
        vd_comentar_(c, '@' + quem + ' ' + FAT.MARCA + ' Card em **' + (lista || '?') + '** — só é arquivado como faturado em ' + FAT.LISTAS.join(' ou ') + '. O card continua no quadro.');
        return;
      }
      var falta = [];
      (c.checklists || []).forEach(function (k) { (k.checkItems || []).forEach(function (i) { if (i.state !== 'complete') falta.push(String(i.name).split(/\s+-\s+/)[0] + ' (' + k.name + ')'); }); });
      if (falta.length) {
        vd_comentar_(c, '@' + quem + ' ' + FAT.MARCA + ' Não arquivei: ainda há ' + falta.length + ' item(ns) sem ✔ — ' + falta.slice(0, 8).join(', ') + (falta.length > 8 ? '…' : '') + '. Depois de conferir, comente de novo.');
        return;
      }
      ev_registrar_('FATURADO', c, quem, null, { detalhe: lista + ' — arquivado' });
      vd_api_('/cards/' + c.id, { method: 'put', payload: { closed: 'true' } });
      n++;
    } catch (e) { console.log('faturamento: ' + e); }
  });
  if (n) console.log('faturamento: ' + n + ' card(s) arquivado(s)');
  return n;
}
