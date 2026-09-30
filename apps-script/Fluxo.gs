/* ============================ TRAVA DE COLUNAS (fluxo) ============================
 * As colunas do meio do fluxo só recebem card pela ação certa do formulário:
 *   COTAÇÃO FINALIZADA / PENDENTE AUTORIZAR  ← enviar a cotação (💰 Cotação)
 *   AUTORIZADO COMPRA                        ← autorizar (✅ Autorizar)
 *   FALTA CHEGAR                             ← registrar a compra de todas as peças (🛒 Compra)
 *   ENCERRADO COMPRAS/FORNEC.                ← receber todas as peças (📦 Recebimento)
 * e um card que já passou da cotação não volta à mão para EM COTAÇÃO / FALTA DADOS
 * (o caminho é Devolver para cotação, ou incluir peça nova pelo ✏️ Editar peças).
 * Movimento fora da regra é desfeito no ciclo de 1 minuto, com comentário mencionando quem moveu.
 * Livres: ESPERA/NÃO AUTORIZADO, ENTREGUES e demais colunas fora da lista.
 * O robô e o formulário deixam uma "licença" (cache 15 min) antes de mover — st_permitir_.
 * Desligar: propriedade ST_TRAVA = NAO.
 */
var ST = {
  TRAVADAS: {
    'COTAÇÃO FINALIZADA': 'quando o comprador envia a cotação (anexo **💰 Cotação / Compra** → aba Cotação)',
    'PENDENTE AUTORIZAR': 'quando o comprador envia a cotação (anexo **💰 Cotação / Compra** → aba Cotação)',
    'AUTORIZADO COMPRA': 'quando a compra é autorizada (anexo **💰 Cotação / Compra** → aba ✅ Autorizar)',
    'FALTA CHEGAR': 'quando todas as peças são compradas (anexo **💰 Cotação / Compra** → aba 🛒 Compra)',
    'ENCERRADO COMPRAS/FORNEC.': 'quando todas as peças são recebidas (anexo **💰 Cotação / Compra** → aba 📦 Recebimento)'
  },
  INICIO: ['EM COTAÇÃO', 'FALTA DADOS PARA COTAR'],
  PREFIXO_OK: 'st_ok_',
  LIMITE_MS: 30 * 1000
};

function st_ligado_() { return vd_prop_('ST_TRAVA', 'SIM') !== 'NAO'; }

/** Licença para o próximo movimento deste card para esta coluna (robô / formulário). */
function st_permitir_(cardId, idLista) {
  if (!cardId || !idLista) return;
  try { CacheService.getScriptCache().put(ST.PREFIXO_OK + cardId + '_' + idLista, '1', 900); } catch (e) {}
}
function st_temLicenca_(cardId, idLista) {
  try { return CacheService.getScriptCache().get(ST.PREFIXO_OK + cardId + '_' + idLista) === '1'; } catch (e) { return false; }
}

/** Ciclo de 1 minuto: desfaz movimentos manuais fora da regra. Devolve quantos desfez. */
function st_executar_() {
  if (!st_ligado_() || !vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var props = PropertiesService.getScriptProperties();
  var agora = new Date().toISOString();
  var desde = props.getProperty('ST_ULTIMA');
  if (!desde) { props.setProperty('ST_ULTIMA', agora); return 0; }   // 1ª vez: não olha para trás
  var board = vd_board_();
  var acoes = vd_api_('/boards/' + board + '/actions', { cru: true, query: { filter: 'updateCard:idList', since: desde, limit: 100, memberCreator_fields: 'username,fullName' } }) || [];
  props.setProperty('ST_ULTIMA', agora);
  if (!acoes.length) return 0;
  var ls = vd_listas_(board), nome = {};
  Object.keys(ls).forEach(function (k) { nome[ls[k]] = k; });
  var inicio = ST.INICIO.map(function (n) { return ls[n]; }).filter(String);
  var fim = Date.now() + ST.LIMITE_MS, desfeitos = 0, vistos = {};
  acoes.reverse().forEach(function (a) {
    if (Date.now() > fim || !a.data || !a.data.card || !a.data.listAfter || !a.data.listBefore) return;
    var cardId = a.data.card.id, para = a.data.listAfter.id, de = a.data.listBefore.id;
    if (st_temLicenca_(cardId, para)) return;
    if (vdf_cardProtegido_(a.data.card.name || '') || /^\s*AVISO\b/i.test(a.data.card.name || '')) return;
    var nPara = nome[para] || String(a.data.listAfter.name || '').trim().toUpperCase();
    var nDe = nome[de] || String(a.data.listBefore.name || '').trim().toUpperCase();
    var motivo = '';
    if (ST.TRAVADAS[nPara]) motivo = 'O card não pode ser movido à mão para **' + nPara + '**: ele vai sozinho ' + ST.TRAVADAS[nPara] + '.';
    else if (inicio.indexOf(para) >= 0 && ST.TRAVADAS[nDe]) motivo = 'Card que já passou da cotação não volta à mão para **' + nPara + '**: para refazer a cotação use **↩️ Devolver para cotação** (aba ✅ Autorizar); para pedir peça nova, **✏️ Editar peças** — o card volta sozinho.';
    if (!motivo) return;
    if (vistos[cardId]) return;   // vários movimentos seguidos: trata uma vez, devolvendo para a origem do primeiro
    vistos[cardId] = 1;
    var c;
    try { c = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'name,idList,shortLink,shortUrl,labels' } }); } catch (e) { return; }
    if (c.idList !== para) return;   // já saiu de lá
    try {
      st_permitir_(cardId, de);
      vd_api_('/cards/' + cardId, { method: 'put', payload: { idList: de, pos: 'top' } });
      desfeitos++;
      var quem = a.memberCreator ? a.memberCreator.username : '';
      vd_comentar_(c, (quem ? '@' + quem + ' ' : '') + '🔒 ' + motivo + '\nO card voltou para **' + nDe + '**.');
      ev_registrar_('MOVIMENTO DESFEITO', c, quem || '?', null, { detalhe: nDe + ' → ' + nPara + ' (à mão) — voltou para ' + nDe });
    } catch (e) { console.log('trava de colunas: ' + e); }
  });
  if (desfeitos) console.log('trava de colunas: ' + desfeitos + ' movimento(s) desfeito(s)');
  return desfeitos;
}
