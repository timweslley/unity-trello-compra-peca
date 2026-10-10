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
/* 10/10/2026 (revisão, dados de 08–09/10): o financeiro escreve "OK FATURADO" e ARQUIVA o card no mesmo segundo (51 cards em
 * 2 dias) — o robô via o card já fechado e não registrava nada, nem conferia os checklists. Agora card arquivado à mão por quem
 * confirma faturamento, numa coluna de faturamento, vale como "faturado": registra o evento; se falta ✔ ou há complementar
 * antecipado sem confirmação, o card é DESARQUIVADO com o aviso do que falta. "fechado/fechada" (O.S. fechada) também confirma.
 * As colunas de pendência do financeiro entram nas colunas onde "faturado"/arquivar vale (antes só ENTREGUES e ENCERRADO). */
var FAT = { LISTAS: ['ENCERRADO COMPRAS/FORNEC.', 'ENTREGUES', 'PENDÊNCIA DE FATURAMENTO', 'PENDÊNCIA TRATADA - FATURAR'], MARCA: '🧾' };

function fat_usuarios_() {
  var us = String(vd_prop_('FAT_USUARIOS', 'financeirounity,christianfarias23')).toLowerCase().split(/[,;\s]+/).filter(String);
  if (vd_board_() === VD.BOARD_PADRAO && us.indexOf('timweslley') < 0) us.push('timweslley');   // TESTE: dá para testar com a conta do script
  return us;
}

/** "faturado"/"fechado" afirmativo? (palavra inteira, sem pergunta; negação só conta quando está a até 2 palavras da confirmação —
 *  "faturado, sem desconto" e "faturado — aguardando pagamento" eram ignorados em silêncio, 10/10/2026) */
var FAT_CONF = '(?:FATURAD|FECHAD)[OA]S?', FAT_NEG = '(?:NAO|FALTA|FALTAM|PENDENTE|AGUARDANDO|AGUARDA|SEM|NUNCA)';
function fat_ehConfirmacao_(txt) {
  var t = vd_semAcento_(txt || '').replace(/[^A-Z0-9?]+/g, ' ').trim();
  if (!new RegExp('\\b' + FAT_CONF + '\\b').test(t)) return false;
  if (/\?/.test(t)) return false;
  if (new RegExp('\\b' + FAT_NEG + '\\b(?: \\S+){0,2} ' + FAT_CONF + '\\b').test(t)) return false;        // "não faturado", "ainda não foi faturado"
  if (new RegExp('\\b' + FAT_CONF + ' NAO\\b').test(t)) return false;                                        // "faturado não"
  return true;
}

function fat_executar_() {
  if (vd_prop_('FAT_LIGADO', 'SIM') === 'NAO' || !vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var desde = vd_marca_('FAT_ULTIMA');
  if (!desde) { vd_marcaSet_('FAT_ULTIMA', new Date().toISOString()); return 0; }   // 1ª vez: só daqui para frente
  var board = vd_board_();
  var acoes = vd_acoesQuadro_(board, { filter: 'commentCard,updateCard:closed', since: desde, limit: 100, memberCreator_fields: 'username,fullName' });
  if (!acoes.length) return 0;
  vd_marcaSet_('FAT_ULTIMA', new Date(new Date(acoes[0].date).getTime() + 1).toISOString());   // a 1ª é a mais nova
  var ls = vd_listas_(board), nomeL = {};
  Object.keys(ls).forEach(function (k) { nomeL[ls[k]] = k; });
  var us = fat_usuarios_(), n = 0, vistos = {};
  var usTxt = us.filter(function (u) { return u !== 'timweslley' || vd_board_() === VD.BOARD_PADRAO; }).map(function (u) { return '@' + u; }).join(' / ');
  acoes.reverse().forEach(function (a) {
    var cardId = a.data && a.data.card && a.data.card.id;
    if (!cardId || vistos[cardId]) return;
    var quem = a.memberCreator ? String(a.memberCreator.username || '').toLowerCase() : '';
    var arquivou = a.type === 'updateCard';
    if (arquivou) {
      // arquivamento à mão: só interessa o de quem confirma faturamento (arquivar = "faturado")
      if (!(a.data.card && a.data.card.closed) || !quem || us.indexOf(quem) < 0) return;
      if (quem === 'timweslley' && vd_board_() !== VD.BOARD_PADRAO) return;   // no quadro real o Weslley arquiva por outros motivos
    } else {
      var txt = (a.data && a.data.text) || '';
      if (txt.indexOf(FAT.MARCA) >= 0 || txt.indexOf('⏰') >= 0) return;   // comentário do próprio robô
      if (!fat_ehConfirmacao_(txt)) return;   // negação perto da palavra ou pergunta: não é confirmação
    }
    var c;
    try { c = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'name,idList,closed,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state' } }); } catch (e) { return; }
    if (!c || vdf_cardProtegido_(c.name || '')) return;
    if (c.closed !== arquivou) return;   // comentário em card já arquivado (o arquivamento trata) / arquivamento já desfeito
    vistos[cardId] = 1;
    var lista = nomeL[c.idList] || '';
    try {
      if (us.indexOf(quem) < 0) {
        vd_comentar_(c, '@' + quem + ' ' + FAT.MARCA + ' O faturamento é confirmado por ' + usTxt + ' — o card não foi arquivado.');
        return;
      }
      if (FAT.LISTAS.indexOf(lista) < 0) {
        if (arquivou) return;   // arquivou em outra coluna: não é faturamento, não mexe
        vd_comentar_(c, '@' + quem + ' ' + FAT.MARCA + ' Card em **' + (lista || '?') + '** — só é arquivado como faturado em ' + FAT.LISTAS.join(' ou ') + '. O card continua no quadro.');
        return;
      }
      var reabrir = function (motivo) {
        if (arquivou) { try { vd_api_('/cards/' + c.id, { method: 'put', payload: { closed: 'false' } }); } catch (e) {} }
        vd_comentar_(c, '@' + quem + ' ' + FAT.MARCA + ' ' + (arquivou ? 'Desarquivei o card: ' : 'Não arquivei: ') + motivo);
      };
      // 09/10/2026 (Weslley): complementar comprado antes da autorização e ainda sem confirmação da seguradora não fatura
      var cpP = [];
      try { var cD = vd_api_('/cards/' + c.id, { query: { fields: 'name,desc' } }); cpP = vd_complPendentes_(vd_analisar_(cD.desc, cD.name)); } catch (e) {}   // desc completa (o card acima veio cru)
      if (cpP.length) {
        reabrir('complementar comprado **antes da autorização** e ainda sem confirmação da seguradora — verificar autorização e importação no Databox do item ' + vd_complPendTxt_(cpP) + '. Depois de marcar na aba Compra do formulário, comente «faturado» de novo.');
        return;
      }
      var falta = [];
      (c.checklists || []).forEach(function (k) { (k.checkItems || []).forEach(function (i) { if (i.state !== 'complete') falta.push(String(i.name).split(/\s+-\s+/)[0] + ' (' + k.name + ')'); }); });
      if (falta.length) {
        reabrir('ainda há ' + falta.length + ' item(ns) sem ✔ — ' + falta.slice(0, 8).join(', ') + (falta.length > 8 ? '…' : '') + '. Depois de conferir, comente «faturado» de novo.');
        return;
      }
      ev_registrar_('FATURADO', c, quem, null, { detalhe: lista + (arquivou ? ' — arquivado à mão' : ' — arquivado') });
      if (!arquivou) vd_api_('/cards/' + c.id, { method: 'put', payload: { closed: 'true' } });
      n++;
    } catch (e) { console.log('faturamento: ' + e); }
  });
  if (n) console.log('faturamento: ' + n + ' card(s) faturado(s)');
  return n;
}
