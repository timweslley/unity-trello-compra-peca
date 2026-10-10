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
  try { CacheService.getScriptCache().put(ST.PREFIXO_OK + cardId + '_' + idLista, '1', 240); } catch (e) {}   // 4 min: o ciclo é de 1 min
}
function st_temLicenca_(cardId, idLista) {
  try { return CacheService.getScriptCache().get(ST.PREFIXO_OK + cardId + '_' + idLista) === '1'; } catch (e) { return false; }
}

/** Ciclo de 1 minuto: desfaz movimentos manuais fora da regra. Devolve quantos desfez. */
function st_executar_() {
  if (!st_ligado_() || !vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var props = PropertiesService.getScriptProperties();
  var agora = new Date().toISOString();
  var desde = vd_marca_('ST_ULTIMA');
  if (!desde) { vd_marcaSet_('ST_ULTIMA', agora); return 0; }   // 1ª vez: não olha para trás
  var board = vd_board_();
  var acoes = vd_acoesQuadro_(board, { filter: 'updateCard:idList', since: desde, limit: 100, memberCreator_fields: 'username,fullName' });
  if (!acoes.length) { vd_marcaSet_('ST_ULTIMA', agora); return 0; }
  var ultimaFeita = desde;   // o marcador só avança sobre o que foi processado de verdade
  var ls = vd_listas_(board), nome = {};
  Object.keys(ls).forEach(function (k) { nome[ls[k]] = k; });
  var inicio = ST.INICIO.map(function (n) { return ls[n]; }).filter(String);
  var fim = vd_prazo_(ST.LIMITE_MS), desfeitos = 0, vistos = {};
  var parou = false;
  acoes.reverse().forEach(function (a) {
    if (parou || Date.now() > fim) { parou = true; return; }
    if (a.date) ultimaFeita = new Date(new Date(a.date).getTime() + 1).toISOString();   // +1 ms: não reprocessa a mesma ação
    if (!a.data || !a.data.card || !a.data.listAfter || !a.data.listBefore) return;
    var cardId = a.data.card.id, para = a.data.listAfter.id, de = a.data.listBefore.id;
    if (vd_legado_(cardId)) return;   // card antigo: segue o jeito antigo
    var nPara = nome[para] || vd_nomeColuna_(a.data.listAfter.name);
    var nDe = nome[de] || vd_nomeColuna_(a.data.listBefore.name);
    var motivo = '', ESP = 'ESPERA/NÃO AUTORIZADO', kEsp = 'ST_ESP_' + cardId;
    // 10/10/2026 (revisão): a marca "veio de X para a ESPERA" só era gravada e nunca apagada — card que saía da ESPERA
    // por licença (devolver para cotação) ou por outra coluna carregava a marca velha e era devolvido indevidamente na
    // passagem seguinte. Agora: saiu da ESPERA por qualquer caminho aceito = marca apagada; entrou na ESPERA vindo de
    // coluna livre = marca apagada.
    var tiraMarca = function () { try { props.deleteProperty(kEsp); } catch (e) {} };
    if (st_temLicenca_(cardId, para)) { try { CacheService.getScriptCache().remove(ST.PREFIXO_OK + cardId + '_' + para); } catch (e) {} if (nDe === ESP) tiraMarca(); return; }
    if (vdf_cardProtegido_(a.data.card.name || '') || /^\s*AVISO\b/i.test(a.data.card.name || '')) return;
    // card estacionado em ESPERA: guarda de onde veio; pode voltar só para lá
    if (nPara === ESP) { if (ST.TRAVADAS[nDe]) props.setProperty(kEsp, nDe); else tiraMarca(); return; }
    // Butler "todos os checklists completos em FALTA CHEGAR -> ENCERRADO": é a mesma regra do sistema, aceita
    if (nDe === 'FALTA CHEGAR' && nPara === 'ENCERRADO COMPRAS/FORNEC.') {
      try {
        var cE = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'name', checklists: 'all', checkItem_fields: 'name,state' } });
        var itE = vdf_itensRecebimento_(cE);
        if (itE.length && itE.every(function (i) { return i.ok; })) return;
      } catch (e) {}
    }
    if (nDe === ESP && ST.TRAVADAS[nPara] && props.getProperty(kEsp) === nPara) { props.deleteProperty(kEsp); return; }
    if (nDe === ESP && inicio.indexOf(para) >= 0 && props.getProperty(kEsp)) {
      motivo = 'Card que já passou da cotação não volta pela ESPERA para **' + nPara + '**: devolva para **' + props.getProperty(kEsp) + '**, ou use **↩️ Devolver para cotação** / **✏️ EDITAR/INCLUIR PEÇA**.';
    }
    else if (ST.TRAVADAS[nPara]) motivo = 'O card não pode ser movido à mão para **' + nPara + '**: ele vai sozinho ' + ST.TRAVADAS[nPara] + '.';
    else if (inicio.indexOf(para) >= 0 && ST.TRAVADAS[nDe]) motivo = 'Card que já passou da cotação não volta à mão para **' + nPara + '**: para refazer a cotação use **↩️ Devolver para cotação** (aba ✅ Autorizar); para pedir peça nova, **✏️ Editar peças** — o card volta sozinho.';
    if (!motivo) { if (nDe === ESP) tiraMarca(); return; }   // saiu da ESPERA para coluna livre: aceito, marca apagada
    if (vistos[cardId]) return;   // vários movimentos seguidos: trata uma vez, devolvendo para a origem do primeiro
    vistos[cardId] = 1;
    var c;
    try { c = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'name,desc,idList,shortLink,shortUrl,labels' } }); } catch (e) { return; }
    if (c.idList !== para) return;   // já saiu de lá
    // volta à mão para EM COTAÇÃO com peça da oficina ainda sem cotação (ex.: peça que deixou de ser "não comprar" ou passou
    // de FO para oficina — QPG1B84, 06/10/2026): o movimento está certo, fica
    if (inicio.indexOf(para) >= 0 && ST.TRAVADAS[nDe]) {
      var semCot = [];
      // sem "cru": precisa da descrição completa (a vitrine não tem o bloco PEÇAS)
      try { semCot = vd_pecasSemCotacao_(vd_api_('/cards/' + cardId, { query: { fields: 'name,desc' } })); } catch (e) {}
      if (semCot.length) {
        var quemM = a.memberCreator ? a.memberCreator.username : '';
        try { vd_comentar_(c, '✔ Card em **' + nPara + '**' + (quemM ? ' (movido por @' + quemM + ')' : '') + ' — peça(s) aguardando cotação: ' + semCot.join('; ')); } catch (e) {}
        try { PropertiesService.getScriptProperties().deleteProperty('VD_NOVAS_' + cardId); } catch (e) {}
        return;
      }
    }
    try {
      st_permitir_(cardId, de);
      vd_api_('/cards/' + cardId, { method: 'put', payload: { idList: de, pos: 'top' } });
      vd_fixarTopo_(de);
      desfeitos++;
      var quem = a.memberCreator ? a.memberCreator.username : '';
      var orig = ''; try { orig = es_autor_(cardId); } catch (e) {}
      vd_comentar_(c, (quem ? '@' + quem + ' ' : '') + '🔒 ' + motivo + orig + '\nO card voltou para **' + nDe + '**.');
      ev_registrar_('MOVIMENTO DESFEITO', c, quem || '?', null, { detalhe: nDe + ' → ' + nPara + ' (à mão) — voltou para ' + nDe });
    } catch (e) { console.log('trava de colunas: ' + e); }
  });
  vd_marcaSet_('ST_ULTIMA', parou ? ultimaFeita : agora);
  if (desfeitos) console.log('trava de colunas: ' + desfeitos + ' movimento(s) desfeito(s)');
  return desfeitos;
}

/* ============================ PRAZOS POR ETAPA (SLA) ============================
 * Comentário mencionando o responsável quando a etapa passa do prazo (dias úteis):
 *   EM COTAÇÃO há 2+ dias úteis                        -> compras        (SLA_COTAR, padrão comprasunity)
 *   PENDENTE AUTORIZAR / COTAÇÃO FINALIZADA há 2+ d.u.  -> quem autoriza  (peças da seguradora: SLA_AUTORIZAR,
 *                                                         padrão timweslley,comercialunity; peças particulares: o consultor)
 *   peça comprada/FO sem recebimento 1 d.u. depois da previsão -> compras (SLA_RECEBER, padrão comprasunity)
 * O aviso se repete a cada 2 dias úteis enquanto continuar atrasado. Roda de hora em hora, em dia útil,
 * das 8h às 18h. Prazos: SLA_DIAS_COTAR, SLA_DIAS_AUTORIZAR, SLA_DIAS_RECEBER. Desligar: SLA_LIGADO = NAO.
 */
var SLA = { INTERVALO_MS: 55 * 60 * 1000, REPETIR_DU: 2, REPETIR_FATURAR_DU: 5, LIMITE_MS: 40 * 1000, RESUMO_MAX: 120 };
/* 10/10/2026 (revisão, dados de 05–09/10): o lembrete de faturamento saía por card, todo dia, em 85 cards (256 comentários em
 * 5 dias, ~70 notificações/dia ao financeiro) e só alcançava parte dos 369 cards de ENTREGUES (corte de 40 s + 1 chamada ao
 * histórico por card). Agora: entrada na coluna vem do cache PZ_COL_ (pz_entradaColuna_), o lembrete no card sai na 1ª vez
 * (7 d.u.) e depois a cada SLA_REPETIR_FATURAR d.u. (padrão 5), e UM resumo por dia útil (sla_resumoFaturamento_) lista
 * todos os cards vencidos, por idade, no card fixo do quadro — uma notificação em vez de dezenas. Desligar o resumo: FAT_RESUMO = NAO. */

function sla_dia_(d) { d = new Date(d); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }
function sla_mais_(d, n) { d = sla_dia_(d); var g = 0; while (n > 0 && g++ < 400) { d.setDate(d.getDate() + 1); if (du_ehUtil_(d)) n--; } return d; }
/** No quadro TESTE os avisos mencionam só o Weslley (não chamar compras/diretoria por card de teste). */
function sla_users_(prop, padrao) { if (vd_board_() === VD.BOARD_PADRAO) padrao = 'timweslley'; return String(vd_prop_(prop, padrao)).split(/[,;\s]+/).filter(String); }
function sla_mencao_(us) { return us.filter(function (u, i) { return u && us.indexOf(u) === i; }).map(function (u) { return '@' + u; }).join(' '); }

/** Já avisou desta pendência há menos de 2 dias úteis? (chave por card+etapa+entrada ou por item+previsão) */
function sla_podeAvisar_(props, chave, hoje, repetirDu) {
  var ult = props.getProperty(chave);
  if (!ult) return true;
  return sla_mais_(new Date(ult), repetirDu || SLA.REPETIR_DU) <= hoje;
}

/** Resumo diário do faturamento pendente (um comentário no card fixo do quadro, mencionando quem fatura). */
function sla_resumoFaturamento_(props, itens, hoje, diasPrazo) {
  if (vd_prop_('FAT_RESUMO', 'SIM') === 'NAO' || !itens.length) return false;
  var kDia = 'FAT_RESUMO_DIA', dia = Utilities.formatDate(hoje, 'America/Sao_Paulo', 'yyyy-MM-dd');
  if (props.getProperty(kDia) === dia) return false;
  var g = String(props.getProperty('VD_FIXO') || '').split('|');
  if (!g[0]) { console.log('resumo de faturamento: sem card fixo'); return false; }
  itens.sort(function (a, b) { return b.dias - a.dias; });
  var mostra = itens.slice(0, SLA.RESUMO_MAX);
  var usF = fat_usuarios_();
  if (vd_board_() !== VD.BOARD_PADRAO) usF = usF.filter(function (u) { return u !== 'timweslley'; });
  var mencao = sla_mencao_(vd_board_() === VD.BOARD_PADRAO ? ['timweslley'] : usF);
  var txt = mencao + ' 🧾 **Faturamento pendente — ' + Utilities.formatDate(hoje, 'America/Sao_Paulo', 'dd/MM') + '**: ' + itens.length +
    ' card(s) em ENTREGUES há mais de ' + diasPrazo + ' dia(s) útil(eis), do mais antigo para o mais novo. Depois de faturar, comente «faturado» no card (ou arquive) — ele sai da lista.\n' +
    mostra.map(function (x) { return '- ' + x.dias + ' d.u. · [' + x.nome + '](' + x.url + ')' + (x.compl ? ' ⚠️ complementar antecipado sem confirmação' : ''); }).join('\n') +
    (itens.length > mostra.length ? '\n- … e mais ' + (itens.length - mostra.length) + ' card(s)' : '');
  try {
    vd_api_('/cards/' + g[0] + '/actions/comments', { method: 'post', payload: { text: txt.slice(0, 16000) } });
    props.setProperty(kDia, dia);
    return true;
  } catch (e) { console.log('resumo de faturamento: ' + e); return false; }
}

function sla_executar_(forcar) {
  if (vd_prop_('SLA_LIGADO', 'SIM') === 'NAO' || !vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var props = PropertiesService.getScriptProperties();
  var agora = new Date(), hoje = sla_dia_(agora);
  var hora = +Utilities.formatDate(agora, 'America/Sao_Paulo', 'H');
  // zerar (uma vez por quadro, ou de novo apagando SLA_ZERADO_<quadro>): o que já está atrasado hoje fica
  // marcado para nunca avisar, sem comentar — só pendência nova (nova entrada na etapa / nova previsão) avisa
  var kZ = 'SLA_ZERADO_' + vd_board_(), silencioso = props.getProperty(kZ) !== 'SIM';
  if (silencioso) forcar = true;
  if (!forcar) {
    if (!du_ehUtil_(hoje) || hora < 8 || hora >= 18) return 0;
    if (Date.now() - (+props.getProperty('SLA_ULTIMA') || 0) < SLA.INTERVALO_MS) return 0;
  }
  props.setProperty('SLA_ULTIMA', String(Date.now()));
  var fim = vd_prazo_(SLA.LIMITE_MS), n = 0, resumoFat = [], fatCompleto = true;
  var board = vd_board_(), ls = vd_listas_(board);
  var etapas = [
    { lista: 'EM COTAÇÃO', dias: +vd_prop_('SLA_DIAS_COTAR', 2), quem: 'cotar' },
    { lista: 'PENDENTE AUTORIZAR', dias: +vd_prop_('SLA_DIAS_AUTORIZAR', 2), quem: 'autorizar' },
    { lista: 'COTAÇÃO FINALIZADA', dias: +vd_prop_('SLA_DIAS_AUTORIZAR', 2), quem: 'autorizar' },
    { lista: 'ENTREGUES', dias: +vd_prop_('SLA_DIAS_FATURAR', 7), quem: 'faturar' }   // vale também para card antigo
  ];
  // 1) tempo parado na etapa
  etapas.forEach(function (et) {
    var idL = ls[et.lista];
    if (!idL || Date.now() > fim) return;
    vd_api_('/lists/' + idL + '/cards', { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels' } }).forEach(function (c) {
      if (Date.now() > fim) { if (et.quem === 'faturar') fatCompleto = false; return; }
      if (vdf_cardProtegido_(c.name || '') || /^\s*AVISO\b/i.test(c.name || '')) return;
      if (et.quem !== 'faturar' && vd_legado_(c.id)) return;   // card antigo: segue o jeito antigo (menos a cobrança do faturamento)
      // entrada na coluna: cache PZ_COL_ (1 chamada ao histórico só na 1ª vez por coluna — 10/10/2026; antes era 1 por card por hora)
      var ent = pz_entradaColuna_(c, props);
      var limite = sla_mais_(ent, et.dias);
      if (hoje < limite) return;
      var dias = 0, d = sla_dia_(ent), g = 0;
      while (d < hoje && g++ < 400) { d.setDate(d.getDate() + 1); if (du_ehUtil_(d)) dias++; }
      var cpP = [];
      if (et.quem === 'faturar') {
        try { cpP = vd_complPendentes_(vd_analisar_(c.desc, c.name)); } catch (e) {}
        resumoFat.push({ nome: c.name, url: c.shortUrl, dias: dias, compl: cpP.length > 0 });
      }
      var chave = 'SLA_' + c.id + '_' + idL + '_' + ent.slice(0, 16);
      if (!sla_podeAvisar_(props, chave, hoje, et.quem === 'faturar' ? +vd_prop_('SLA_REPETIR_FATURAR', SLA.REPETIR_FATURAR_DU) : 0)) return;
      var mencao, txt;
      if (et.quem === 'faturar') {
        var usF = fat_usuarios_();
        if (vd_board_() !== VD.BOARD_PADRAO) usF = usF.filter(function (u) { return u !== 'timweslley'; });
        mencao = sla_mencao_(vd_board_() === VD.BOARD_PADRAO ? ['timweslley'] : usF);
        txt = '⏰ Card em **ENTREGUES** há ' + dias + ' dia(s) útil(eis) sem confirmação de faturamento (prazo: ' + et.dias + '). Depois de faturar, comente a palavra faturado no card (ou arquive) — ele é arquivado.';
        // 09/10/2026 (Weslley): complementar comprado antes da autorização e ainda sem confirmação da seguradora entra no lembrete
        if (cpP.length) txt += '\n⚠️ Complementar comprado **antes da autorização** e ainda sem confirmação da seguradora — verificar autorização e importação no Databox do item ' + vd_complPendTxt_(cpP) + ' (marcar na aba Compra do formulário).';
      } else if (et.quem === 'cotar') {
        mencao = sla_mencao_(sla_users_('SLA_COTAR', 'comprasunity'));
        txt = '⏰ Card em **EM COTAÇÃO** há ' + dias + ' dia(s) útil(eis) (prazo: ' + et.dias + '). Lançar a cotação pelo anexo **💰 Cotação / Compra**.';
      } else {
        var an = vd_analisar_(c.desc, c.name), criador = '';
        try { criador = vd_criador_(c.id); } catch (e) {}
        var auts = []; try { auts = vd_autorizacoesDaDescricao_(c.desc, an.pecas); } catch (e) {}
        var falta = an.pecas.filter(function (p) { return !auts.some(function (x) { return x.chave === vd_chavePeca_(p); }); });
        var seg = falta.filter(function (p) { return !vdf_pecaParticular_(p, c, an); }), part = falta.filter(function (p) { return vdf_pecaParticular_(p, c, an); });
        var us = [];
        if (seg.length) us = us.concat(sla_users_('SLA_AUTORIZAR', 'timweslley,comercialunity'));
        part.forEach(function (p) { us.push(p.partPor || criador); });
        if (!us.length) return;
        mencao = sla_mencao_(us);
        txt = '⏰ Cotação aguardando autorização há ' + dias + ' dia(s) útil(eis) (prazo: ' + et.dias + ')' +
          (seg.length && part.length ? ' — peças da seguradora: diretoria; peças particulares: consultor' : '') + '. Autorizar pelo anexo **💰 Cotação / Compra** → aba ✅ Autorizar.';
      }
      try {
        if (silencioso) { props.setProperty(chave, '2999-01-01T12:00:00.000Z'); return; }   // pendência antiga: não avisa mais
        vd_comentar_(c, mencao + ' ' + txt);
        ev_registrar_('ALERTA PRAZO', c, 'robô', null, { detalhe: et.lista + ' há ' + dias + ' d.u. — ' + mencao });
        props.setProperty(chave, hoje.toISOString()); n++;
      } catch (e) { console.log('sla: ' + e); }
    });
  });
  // resumo diário do faturamento (só quando a coluna inteira foi vista — senão a lista sairia pela metade)
  if (!silencioso && fatCompleto && resumoFat.length) { try { if (sla_resumoFaturamento_(props, resumoFat, hoje, +vd_prop_('SLA_DIAS_FATURAR', 7))) n++; } catch (e) { console.log('resumo faturamento: ' + e); } }
  // 2) peça comprada / FO sem recebimento 1 d.u. depois da previsão
  var folga = +vd_prop_('SLA_DIAS_RECEBER', 1);
  var cards = vd_api_('/boards/' + board + '/cards', { cru: true, query: { fields: 'name,idList,shortLink,shortUrl,labels', checklists: 'all', checklist_fields: 'name', checkItem_fields: 'name,state,due' } });
  cards.forEach(function (c) {
    if (Date.now() > fim) return;
    if (vd_legado_(c.id)) return;   // card antigo: sem avisos de prazo
    var atrasados = { PAGAS: [], FO: [] }, chaves = [];
    (c.checklists || []).forEach(function (k) {
      var tipo = /^PAGAS/i.test(String(k.name || '').trim()) ? 'PAGAS' : (/FORNECIMENTO/i.test(k.name || '') ? 'FO' : '');
      if (!tipo) return;
      (k.checkItems || []).forEach(function (it) {
        if (it.state === 'complete' || !it.due) return;
        if (hoje <= sla_mais_(it.due, folga)) return;
        var ch = 'SLA_I_' + it.id + '_' + String(it.due).slice(0, 10);
        if (!sla_podeAvisar_(props, ch, hoje)) return;
        atrasados[tipo].push(it.name.split(/\s+-\s+/)[0] + ' (previsão ' + vd_dataCurta_(it.due) + ')');
        chaves.push(ch);
      });
    });
    if (!chaves.length) return;
    var partes = [];
    if (atrasados.PAGAS.length) partes.push('verificar compra do item ' + atrasados.PAGAS.join(', '));
    if (atrasados.FO.length) partes.push('verificar prazo do item ' + atrasados.FO.join(', '));
    var mencao = sla_mencao_(sla_users_('SLA_RECEBER', 'comprasunity'));
    try {
      if (silencioso) { chaves.forEach(function (ch) { props.setProperty(ch, '2999-01-01T12:00:00.000Z'); }); return; }
      vd_comentar_(c, mencao + ' ⏰ Peça sem recebimento informado depois da previsão — ' + partes.join('; ') + '. Se já chegou, registrar na aba **📦 Recebimento**.');
      ev_registrar_('ALERTA PRAZO', c, 'robô', null, { detalhe: 'recebimento: ' + partes.join('; ') });
      chaves.forEach(function (ch) { props.setProperty(ch, hoje.toISOString()); }); n++;
    } catch (e) { console.log('sla/receb: ' + e); }
  });
  if (silencioso) { props.setProperty(kZ, 'SIM'); console.log('prazos por etapa: histórico zerado (sem avisos)'); return 0; }
  if (n) console.log('prazos por etapa: ' + n + ' aviso(s)');
  return n;
}

/** Roda os avisos de prazo agora (ignora horário e intervalo) — teste no editor. */
function sla_rodarAgora() { Logger.log('avisos de prazo: ' + sla_executar_(true)); }

/* ============================ PROTEÇÃO CONTRA EXCLUSÃO ============================
 * O Trello não tem permissão "só administrador exclui card". Rede de segurança: card excluído por
 * quem não é administrador do quadro é RECRIADO na mesma coluna, com o mesmo título e a descrição
 * completa (guardada na aba TRAVA), comentário listando as compras registradas na planilha de eventos
 * (checklists e anexos não voltam) e e-mail de alerta. Para tirar um card do quadro: ARQUIVAR.
 * Desligar: propriedade EXC_PROTEGER = NAO. Liberar outros usuários por nome: EXC_LIVRES = "usuario1, usuario2" (padrão timweslley).
 * 06/10/2026: o histórico compartilhado vinha sem idMemberCreator e o robô recriou card excluído pelo próprio Weslley — corrigido.
 */
function exc_executar_() {
  if (vd_prop_('EXC_PROTEGER', 'SIM') === 'NAO' || !vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var props = PropertiesService.getScriptProperties();
  var agora = new Date().toISOString(), desde = vd_marca_('EXC_ULTIMA');
  vd_marcaSet_('EXC_ULTIMA', agora);
  if (!desde) return 0;
  var board = vd_board_();
  var acoes = vd_acoesQuadro_(board, { filter: 'deleteCard', since: desde, limit: 50, memberCreator_fields: 'username,fullName' });
  if (!acoes.length) return 0;
  var admins = null, kAdm = 'exc_admins_' + board;
  try { admins = JSON.parse(CacheService.getScriptCache().get(kAdm) || 'null'); } catch (e) {}
  if (!admins) {
    admins = (vd_api_('/boards/' + board + '/memberships', { cru: true, query: { member: 'false' } }) || [])
      .filter(function (m) { return m.memberType === 'admin'; }).map(function (m) { return m.idMember; });
    try { CacheService.getScriptCache().put(kAdm, JSON.stringify(admins), 3600); } catch (e) {}
  }
  var n = 0;
  acoes.forEach(function (a) {
    if (!a.data || !a.data.card || !a.data.list) return;
    var quemId = a.idMemberCreator || (a.memberCreator && a.memberCreator.id) || '';
    var quem = a.memberCreator ? a.memberCreator.username : '?';
    if (!quemId || admins.indexOf(quemId) >= 0) return;   // administrador pode excluir; sem autor identificado, não recria (nunca recriar por falta de dado)
    if (vd_prop_('EXC_LIVRES', 'timweslley').split(/[,\s]+/).filter(String).indexOf(quem) >= 0) return;   // usuários liberados por nome (propriedade EXC_LIVRES; Weslley sempre pode excluir)
    var velho = a.data.card;
    try {
      var desc = vd_completa_(velho.id) || tr_ler_(velho.id) || '';
      var nome = String(velho.name || '').trim() || ('CARD RECUPERADO ' + (velho.idShort || ''));
      var novo = vd_api_('/cards', { method: 'post', payload: { idList: a.data.list.id, name: nome, pos: 'top' } });
      if (desc) vd_gravarDesc_(novo.id, desc);
      var compras = exc_comprasDoCard_(velho.shortLink);
      vd_comentar_(novo, '@' + quem + ' ♻️ **Card recuperado**: ele foi excluído em ' + Utilities.formatDate(new Date(a.date), 'America/Sao_Paulo', 'dd/MM HH:mm') +
        ' e só administrador pode excluir — para tirar um card do quadro, use **Arquivar**.\nA descrição voltou; checklists e anexos não voltam com a exclusão.' +
        (compras.length ? '\n\n🛒 Compras registradas antes da exclusão (planilha de eventos):\n' + compras.map(function (c) { return '- ' + c; }).join('\n') : ''));
      ev_registrar_('CARD EXCLUÍDO E RECRIADO', { name: nome, shortLink: novo.shortLink, shortUrl: novo.shortUrl }, quem, null, { detalhe: 'card antigo ' + (velho.shortLink || velho.id) });
      try {
        MailApp.sendEmail(vd_prop_('EXC_EMAIL', 'weslley.santos@unitycs.com.br'), 'Trello: card excluído e recriado — ' + nome,
          quem + ' excluiu o card "' + nome + '" (' + vd_board_() + ') em ' + a.date + '.\nO robô recriou o card: ' + novo.shortUrl +
          '\nChecklists e anexos não voltam com a exclusão — conferir no card.\n\nCompras registradas:\n' + (compras.join('\n') || '(nenhuma)'));
      } catch (e) {}
      n++;
    } catch (e) { console.log('exclusão: ' + e); }
  });
  return n;
}

/** Linhas de COMPRA da planilha de eventos para o card (pelo link curto). */
function exc_comprasDoCard_(shortLink) {
  if (!shortLink) return [];
  try {
    var sh = ev_aba_(), n = sh.getLastRow();
    if (n < 2) return [];
    var v = sh.getRange(2, 1, n - 1, 13).getValues();
    return v.filter(function (r) { return r[1] === 'COMPRA' && String(r[3]).indexOf(shortLink) >= 0; }).map(function (r) {
      return [r[7], r[9], r[10] !== '' ? vd_valorBR_(r[10]) : '', r[12] ? 'previsão ' + Utilities.formatDate(new Date(r[12]), 'America/Sao_Paulo', 'dd/MM') : ''].filter(String).join(' - ');
    });
  } catch (e) { return []; }
}
