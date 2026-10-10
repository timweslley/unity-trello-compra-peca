/* ============================ TRAVA DOS CHECKLISTS ============================
 * Checklists (PAGAS*, FORNECIMENTO* e qualquer outro) só mudam pelo formulário ou pelo robô.
 * Toda escrita oficial passa por vd_api_ e deixa uma LICENÇA (cache, por card e por checklist).
 * A cada minuto o robô lê as ações de checklist do quadro; ação sem licença = feita à mão ->
 * desfaz (✔, nome, data, item criado/apagado, checklist criado/apagado/renomeado) e avisa no card.
 * Retrato dos checklists por card na aba CHECKLISTS (para refazer um checklist apagado).
 * Desligar: propriedade CK_TRAVA = NAO.
 */
var CK = {
  TIPOS: 'createCheckItem,updateCheckItem,updateCheckItemStateOnCard,deleteCheckItem,addChecklistToCard,removeChecklistFromCard,updateChecklist',
  ANTES_MS: 15 * 1000,     // ação até 15 s depois da licença...
  DEPOIS_MS: 120 * 1000,   // ...ou até 2 min antes dela = oficial (licença gravada antes e depois da escrita)
  ABA: 'CHECKLISTS'
};

function ck_ligado_() { return vd_prop_('CK_TRAVA', 'SIM') !== 'NAO'; }

/** Chamado por vd_api_ em toda escrita que mexe em checklist. */
function ck_licenca_(caminho, payload) {
  var ids = [], m;
  if ((m = caminho.match(/^\/cards\/([^\/?]+)\/(checkItem|checklists)/))) ids.push(m[1]);
  if ((m = caminho.match(/^\/checklists\/([^\/?]+)/))) ids.push(m[1]);
  if (/^\/checklists\/?(\?|$)/.test(caminho) && payload && payload.idCard) ids.push(payload.idCard);
  if (!ids.length) return;
  try {
    var c = CacheService.getScriptCache(), agora = Date.now(), atual = c.getAll(ids.map(function (i) { return 'ck_' + i; })), novo = {};
    ids.forEach(function (i) {
      var l = []; try { l = JSON.parse(atual['ck_' + i] || '[]'); } catch (e) {}
      l.push(agora); novo['ck_' + i] = JSON.stringify(l.slice(-40));
    });
    c.putAll(novo, 1800);
  } catch (e) { console.log('licença checklist: ' + e); }
}

function ck_licenciada_(a, cache) {
  var d = a.data || {}, t = new Date(a.date).getTime();
  var ids = [d.card && d.card.id, d.card && d.card.shortLink, d.checklist && d.checklist.id].filter(String);
  return ids.some(function (id) {
    var l = []; try { l = JSON.parse(cache['ck_' + id] || '[]'); } catch (e) {}
    return l.some(function (ts) { return t >= ts - CK.DEPOIS_MS && t <= ts + CK.ANTES_MS; });
  });
}

/* ---------- retrato (aba CHECKLISTS) ---------- */
function ck_aba_() {
  var ss = vd_planilhaBackup_().getParent(), sh = ss.getSheetByName(CK.ABA);
  if (!sh) { sh = ss.insertSheet(CK.ABA); sh.appendRow(['Card (id)', 'Checklists (JSON)', 'Atualizado em']); sh.setFrozenRows(1); }
  return sh;
}
function ck_retratar_(cardIds) {
  if (!cardIds.length) return;
  var sh = ck_aba_();
  cardIds.forEach(function (id) {
    try {
      var ls = vd_api_('/cards/' + id + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name,state,due,pos', fields: 'name,pos' } });
      var js = JSON.stringify(ls.map(function (k) { return { id: k.id, name: k.name, pos: k.pos, itens: (k.checkItems || []).map(function (i) { return { n: i.name, s: i.state, d: i.due || '', p: i.pos }; }) }; }));
      var cel = sh.getRange('A:A').createTextFinder(id).matchEntireCell(true).findNext();
      if (cel) sh.getRange(cel.getRow(), 2, 1, 2).setValues([[js, new Date()]]);
      else sh.appendRow([id, js, new Date()]);
    } catch (e) { console.log('retrato ' + id + ': ' + e); }
  });
}
function ck_retrato_(cardId, idChecklist) {
  try {
    var cel = ck_aba_().getRange('A:A').createTextFinder(cardId).matchEntireCell(true).findNext();
    if (!cel) return null;
    var ls = JSON.parse(String(ck_aba_().getRange(cel.getRow(), 2).getValue() || '[]'));
    return ls.filter(function (k) { return k.id === idChecklist; })[0] || null;
  } catch (e) { return null; }
}

/* ---------- desfazer ---------- */
function ck_desfazer_(a) {
  var d = a.data || {}, card = d.card || {}, it = d.checkItem || {}, cl = d.checklist || {};
  switch (a.type) {
    case 'updateCheckItemStateOnCard':
      vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'put', payload: { state: it.state === 'complete' ? 'incomplete' : 'complete' } });
      return (it.state === 'complete' ? 'desmarcado ✔ de ' : 'marcado de novo ') + pv_curto_(it.name);
    case 'updateCheckItem':
      var old = d.old || {}, volta = {};
      ['name', 'due', 'pos'].forEach(function (k) { if (Object.prototype.hasOwnProperty.call(old, k)) volta[k] = old[k] === null ? null : old[k]; });
      if (!Object.keys(volta).length) return '';
      vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'put', payload: volta });
      return 'voltou ' + (volta.name !== undefined ? 'o nome' : (volta.due !== undefined ? 'a data' : 'a posição')) + ' de ' + pv_curto_(old.name || it.name);
    case 'createCheckItem':
      vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'delete' });
      return 'apagado item incluído à mão: ' + pv_curto_(it.name);
    case 'deleteCheckItem':
      var corpo = { name: it.name, pos: 'bottom' };
      if (it.state === 'complete') corpo.checked = 'true';
      vd_api_('/checklists/' + cl.id + '/checkItems', { method: 'post', payload: corpo });
      return 'item apagado voltou: ' + pv_curto_(it.name);
    case 'addChecklistToCard':
      vd_api_('/checklists/' + cl.id, { method: 'delete' });
      return 'apagado checklist criado à mão: ' + (cl.name || '');
    case 'updateChecklist':
      if (!d.old || d.old.name === undefined) return '';
      vd_api_('/checklists/' + cl.id, { method: 'put', payload: { name: d.old.name } });
      return 'checklist voltou a se chamar ' + d.old.name;
    case 'removeChecklistFromCard':
      var r = ck_retrato_(card.id, cl.id);
      if (!r) return 'checklist ' + (cl.name || '') + ' apagado — sem retrato para refazer (refazer pelo formulário)';
      var novo = vd_api_('/checklists', { method: 'post', payload: { idCard: card.id, name: r.name, pos: 'bottom' } });
      r.itens.forEach(function (i) {
        var c2 = { name: i.n, pos: 'bottom' };
        if (i.s === 'complete') c2.checked = 'true';
        if (i.d) c2.due = i.d;
        vd_api_('/checklists/' + novo.id + '/checkItems', { method: 'post', payload: c2 });
      });
      return 'checklist ' + r.name + ' apagado voltou (' + r.itens.length + ' itens)';
  }
  return '';
}

/** Ciclo de 1 minuto. */
function ck_executar_() {
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO' || !ck_ligado_()) return 0;
  var props = PropertiesService.getScriptProperties(), board = vd_board_();
  var desde = vd_marca_('CK_DESDE');
  if (!desde) {
    // 1ª vez: só começa a vigiar daqui para frente; o retrato de cada card é tirado quando ele mexe
    // (no quadro principal, retratar ~650 cards de uma vez estouraria o ciclo de 1 minuto)
    var ult = vd_api_('/boards/' + board + '/actions', { cru: true, query: { limit: 1, fields: 'id' } });
    vd_marcaSet_('CK_DESDE', ult.length ? ult[0].id : new Date().toISOString());
    return 0;
  }
  var acts = vd_acoesQuadro_(board, { filter: CK.TIPOS, since: desde, limit: 200, memberCreator_fields: 'username,fullName' });
  if (!acts.length) return 0;
  var cache = {};
  try {
    var ids = [];
    acts.forEach(function (a) { var d = a.data || {}; [d.card && d.card.id, d.card && d.card.shortLink, d.checklist && d.checklist.id].forEach(function (i) { if (i && ids.indexOf('ck_' + i) < 0) ids.push('ck_' + i); }); });
    cache = CacheService.getScriptCache().getAll(ids);
  } catch (e) {}
  var avisos = {}, tocados = [], n = 0, manuais = {};
  acts.slice().reverse().forEach(function (a) {
    var cardId = a.data && a.data.card && a.data.card.id;
    if (!cardId) return;
    if (vd_legado_(cardId)) return;   // card antigo: segue o jeito antigo
    if (tocados.indexOf(cardId) < 0) tocados.push(cardId);
    if (ck_licenciada_(a, cache)) return;
    // 10/10/2026 (revisão, 36 ✔ desfeitos em 5 dias): ✔ marcado direto no Trello num item PAGAS*/FORNECIMENTO* por quem pode
    // receber vale como recebimento de hoje (comentário, evento, coluna) em vez de ser desfeito — ck_aceitarManual_
    if (a.type === 'updateCheckItemStateOnCard' && a.data.checkItem && a.data.checkItem.state === 'complete' && /^(PAGAS|FORNECIMENTO)/i.test(String((a.data.checklist || {}).name || '').trim()) && vd_prop_('CK_ACEITA_OK', 'SIM') !== 'NAO') {
      var quemM = a.memberCreator ? a.memberCreator.username : '';
      if (quemM) { (manuais[cardId] = manuais[cardId] || { card: a.data.card, quem: quemM, nome: (a.memberCreator && a.memberCreator.fullName) || quemM, itens: [], acoes: [] }).itens.push(a.data.checkItem); manuais[cardId].acoes.push(a); return; }
    }
    var txt = '';
    try { txt = ck_desfazer_(a); } catch (e) { txt = /\b404\b/.test(String(e.message || e)) ? '' : 'não consegui desfazer (' + String(e.message || e).slice(0, 60) + ')'; }   // 404 = o item já sumiu (checklist apagado antes): nada a desfazer
    if (!txt) return;
    n++;
    var quem = a.memberCreator ? a.memberCreator.username : '';
    var av = avisos[cardId] || (avisos[cardId] = { card: a.data.card, quem: quem, itens: [] });
    av.itens.push(txt);
    try { ev_registrar_('CHECKLIST DESFEITO', { name: a.data.card.name, shortLink: a.data.card.shortLink, labels: [] }, quem || '?', null, { detalhe: txt }); } catch (e) {}
  });
  vd_marcaSet_('CK_DESDE', acts[0].id);
  // ✔ manual aceito como recebimento (quem não pode receber: desfeito como antes)
  Object.keys(manuais).forEach(function (id) {
    var m = manuais[id], aceitos = [];
    try { aceitos = ck_aceitarManual_(id, m); } catch (e) { console.log('✔ manual: ' + e); }
    m.acoes.forEach(function (a) {
      if (aceitos.indexOf(a.data.checkItem.id) >= 0) return;
      var txt = '';
      try { txt = ck_desfazer_(a); } catch (e) { txt = /\b404\b/.test(String(e.message || e)) ? '' : 'não consegui desfazer (' + String(e.message || e).slice(0, 60) + ')'; }
      if (!txt) return;
      n++;
      var av = avisos[id] || (avisos[id] = { card: a.data.card, quem: m.quem, itens: [] });
      av.itens.push(txt);
      try { ev_registrar_('CHECKLIST DESFEITO', { name: a.data.card.name, shortLink: a.data.card.shortLink, labels: [] }, m.quem || '?', null, { detalhe: txt }); } catch (e) {}
    });
  });
  Object.keys(avisos).forEach(function (id) {
    var av = avisos[id];
    try {
      var orig = ''; try { orig = es_autor_(id); } catch (e) {}
      vd_comentar_({ id: id }, (av.quem ? '@' + av.quem + ' ' : '') + '🔒 **ALTERAÇÃO NÃO PERMITIDA** — checklist só muda pelo formulário (✔ de chegada: aba 📦 Recebimento).' + orig + ' Desfeito:\n' +
        av.itens.map(function (t) { return '- ' + t; }).join('\n'));
    } catch (e) {}
  });
  // retrato atualizado dos cards que mexeram (depois de desfazer)
  ck_retratar_(tocados.slice(0, 30));
  if (n) console.log('trava de checklist: ' + n + ' alteração(ões) desfeita(s)');
  return n;
}
