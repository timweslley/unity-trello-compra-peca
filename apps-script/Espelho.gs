/* ============================ ESPELHO DO QUADRO PRINCIPAL NO TESTE ============================
 * Só LÊ o quadro principal e copia para o TESTE os cards do fluxo ativo (ESPERA até ENCERRADO),
 * para ver o sistema trabalhando com os pedidos reais antes da virada. Comentários antigos não são
 * copiados (as menções neles notificariam a equipe); os novos entram como 💬 com as menções neutralizadas.
 *  - es_iniciar()      : arquiva os cards de teste, copia os cards do fluxo (com anexos, checklists,
 *                        etiquetas e prazo) e liga a sincronização a cada 10 min.
 *  - es_sincronizar    : traz o que mudou no principal (card novo, movimento, descrição, prazo,
 *                        comentário, anexo, etiqueta, checklist, arquivado). Mudanças feitas à mão no
 *                        principal entram no TESTE "à mão" também -> as travas reagem como reagiriam lá.
 *  - es_desligar()     : para a sincronização (na virada). Os cards espelhados ficam no TESTE.
 * Enquanto o espelho está ligado, menções no TESTE só notificam ES.MENCOES_OK (as outras viram 👤nome).
 * Mapa principal -> TESTE na aba ESPELHO da planilha.
 */
var ES = {
  ORIGEM: 'oH4TbTqb',                       // quadro principal (só leitura)
  DESTINO: 'ZX4gRmnX',                      // quadro TESTE
  FLUXO: ['ESPERA/NÃO AUTORIZADO', 'FALTA DADOS PARA COTAR', 'EM COTAÇÃO', 'COTAÇÃO FINALIZADA', 'PENDENTE AUTORIZAR',
          'AUTORIZADO COMPRA', 'FALTA CHEGAR', 'ENCERRADO COMPRAS/FORNEC.'],
  FORA: 'ENTREGUES',                        // card que sai do fluxo no principal vai para cá no TESTE
  ABA: 'ESPELHO',
  MENCOES_OK: ['timweslley'],
  LIMITE_MS: 4.5 * 60 * 1000,
  TIPOS: 'createCard,copyCard,moveCardToBoard,convertToCardFromCheckItem,emailCard,updateCard,commentCard,' +
         'addAttachmentToCard,deleteAttachmentFromCard,addLabelToCard,removeLabelFromCard,addChecklistToCard,' +
         'removeChecklistFromCard,updateChecklist,createCheckItem,deleteCheckItem,updateCheckItem,updateCheckItemStateOnCard'
};

// só vale com o sistema no TESTE: esquecer o espelho ligado na virada não cala as menções do quadro principal
function es_ligado_() { return vd_prop_('ES_LIGADO', 'NAO') === 'SIM' && vd_board_() === ES.DESTINO; }

/** Nunca escreve no principal: só roda com o sistema apontado para o TESTE. */
function es_guarda_() {
  if (vd_board_() !== ES.DESTINO) throw new Error('Espelho só roda com o sistema no quadro TESTE.');
  if (ES.ORIGEM === ES.DESTINO) throw new Error('origem = destino');
}

/** Menções: com o espelho ligado, só ES.MENCOES_OK é notificado. */
function es_filtrarMencoes_(txt) {
  if (!es_ligado_()) return txt;
  return String(txt).replace(/(^|[^A-Za-z0-9_.])@([A-Za-z0-9_]{3,})/g, function (m, pre, u) {
    return ES.MENCOES_OK.indexOf(u.toLowerCase()) >= 0 ? m : pre + '👤' + u;
  });
}

/** Quem fez a mudança no principal (para os avisos das travas no TESTE). */
function es_marcarAutor_(idTeste, nome) { try { CacheService.getScriptCache().put('es_autor_' + idTeste, String(nome || '').slice(0, 60), 900); } catch (e) {} }
function es_autor_(idTeste) {
  try { var n = CacheService.getScriptCache().get('es_autor_' + idTeste); return n ? ' _(no principal: ' + n + ')_' : ''; } catch (e) { return ''; }
}

/* ---------- mapa (aba ESPELHO) ---------- */
function es_aba_() {
  var ss = vd_planilhaBackup_().getParent(), sh = ss.getSheetByName(ES.ABA);
  if (!sh) { sh = ss.insertSheet(ES.ABA); sh.appendRow(['Card principal (id)', 'Card TESTE (id)', 'Link TESTE', 'Nome', 'Copiado em']); sh.setFrozenRows(1); }
  return sh;
}
function es_mapa_() {
  var sh = es_aba_(), n = sh.getLastRow(), m = {};
  if (n < 2) return m;
  sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r) { if (r[0] && r[1]) m[r[0]] = r[1]; });
  return m;
}

/* ---------- escrita "à mão" no TESTE (sem licença das travas) ---------- */
function es_api_(caminho, opts) { opts = opts || {}; opts.semLicenca = true; return vd_api_(caminho, opts); }

function es_listasDestino_() { return vd_listas_(ES.DESTINO); }
function es_nomeListaOrigem_() {
  var m = {};
  vd_api_('/boards/' + ES.ORIGEM + '/lists', { cru: true, query: { fields: 'name' } }).forEach(function (l) { m[l.id] = vd_nomeColuna_(l.name); });
  return m;
}

/** Copia um card do principal para o TESTE (estado atual: anexos, checklists, comentários, etiquetas, prazo). */
function es_copiar_(cardOrigem, nomeLista, listasDest, mapa) {
  var idL = listasDest[nomeLista];
  if (!idL) return null;
  var novo = vd_api_('/cards', { method: 'post', query: {
    idList: idL, idCardSource: cardOrigem.id, keepFromSource: 'attachments,checklists,due,start,labels,stickers', pos: 'bottom' } });
  try { ck_licenca_('/cards/' + novo.id + '/checklists'); } catch (e) {}   // a cópia não é "mão" — a trava não desfaz
  mapa[cardOrigem.id] = novo.id;
  es_aba_().appendRow([cardOrigem.id, novo.id, novo.shortUrl || '', cardOrigem.name || '', new Date()]);
  return novo;
}

/* ---------- início ---------- */
function es_iniciar() {
  es_guarda_();
  var p = PropertiesService.getScriptProperties();
  // 1) arquiva os cards de teste (menos o card fixo do pedido)
  var mapa = es_mapa_(), espelhados = {};
  Object.keys(mapa).forEach(function (k) { espelhados[mapa[k]] = true; });
  var arq = 0;
  vd_api_('/boards/' + ES.DESTINO + '/cards', { cru: true, query: { fields: 'name' } }).forEach(function (c) {
    if (espelhados[c.id] || /NOVO PEDIDO DE PE[ÇC]A/i.test(c.name || '')) return;
    vd_api_('/cards/' + c.id, { method: 'put', payload: { closed: true } }); arq++;
  });
  Logger.log('cards de teste arquivados: ' + arq);
  // 2) daqui para frente as mudanças do principal entram pela sincronização
  if (!p.getProperty('ES_DESDE')) {
    var ult = vd_api_('/boards/' + ES.ORIGEM + '/actions', { cru: true, query: { limit: 1, fields: 'id' } });
    p.setProperty('ES_DESDE', ult.length ? ult[0].id : new Date().toISOString());
  }
  p.setProperty('ES_LIGADO', 'SIM');
  p.setProperty('ES_COPIA_INICIAL', 'PENDENTE');
  if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'es_sincronizar'; }))
    ScriptApp.newTrigger('es_sincronizar').timeBased().everyMinutes(10).create();
  es_sincronizar();
}

function es_desligar() {
  PropertiesService.getScriptProperties().setProperty('ES_LIGADO', 'NAO');
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'es_sincronizar') ScriptApp.deleteTrigger(t); });
}

/* ---------- ciclo de 10 min ---------- */
function es_sincronizar() {
  if (!es_ligado_()) return;   // (fora do TESTE: não roda e não dá erro a cada 10 min)
  es_guarda_();
  var p = PropertiesService.getScriptProperties();
  var rodando = +(p.getProperty('ES_RODANDO') || 0);
  if (Date.now() - rodando < 7 * 60000) return;            // outra rodada ainda em andamento
  p.setProperty('ES_RODANDO', String(Date.now()));
  try {
    var fim = Date.now() + ES.LIMITE_MS, mapa = es_mapa_(), dest = es_listasDestino_(), origemNome = es_nomeListaOrigem_();
    var r = { copiados: 0, aplicados: 0, erros: 0 };
    // cópia inicial (em partes, se precisar)
    if (p.getProperty('ES_COPIA_INICIAL') === 'PENDENTE') {
      var cards = vd_api_('/boards/' + ES.ORIGEM + '/cards', { cru: true, query: { fields: 'name,idList,pos' } });
      var ordem = {}; ES.FLUXO.forEach(function (n, i) { ordem[n] = i; });
      cards = cards.filter(function (c) { return ordem[origemNome[c.idList]] !== undefined && !mapa[c.id] && !/NOVO PEDIDO DE PE[ÇC]A/i.test(c.name || ''); })
        .sort(function (a, b) { return (ordem[origemNome[a.idList]] - ordem[origemNome[b.idList]]) || (a.pos - b.pos); });
      for (var i = 0; i < cards.length && Date.now() < fim; i++) {
        try { if (es_copiar_(cards[i], origemNome[cards[i].idList], dest, mapa)) r.copiados++; } catch (e) { r.erros++; console.log('copiar ' + cards[i].name + ': ' + e); }
      }
      if (i >= cards.length) p.setProperty('ES_COPIA_INICIAL', 'FEITA');
    }
    // mudanças do principal
    if (Date.now() < fim) {
      var desde = p.getProperty('ES_DESDE');
      var acts = vd_api_('/boards/' + ES.ORIGEM + '/actions', { cru: true, query: { filter: ES.TIPOS, since: desde, limit: 500, memberCreator_fields: 'username,fullName' } }) || [];
      var feitos = {}, ultimo = desde;
      acts.reverse().some(function (a) {
        if (Date.now() > fim) return true;
        try { if (es_aplicar_(a, mapa, dest, origemNome, feitos)) r.aplicados++; } catch (e) { r.erros++; console.log('espelho ' + a.type + ': ' + e); }
        ultimo = a.id;
        return false;
      });
      if (ultimo) p.setProperty('ES_DESDE', ultimo);
    }
    p.setProperty('ES_ULTIMA', new Date().toISOString());
    Logger.log('espelho: ' + r.copiados + ' card(s) copiado(s), ' + r.aplicados + ' mudança(s) aplicada(s), ' + r.erros + ' erro(s)');
    return r;
  } finally { p.deleteProperty('ES_RODANDO'); }
}

/** Aplica uma ação do principal no card espelhado. */
function es_aplicar_(a, mapa, dest, origemNome, feitos) {
  var d = a.data || {}, cardO = d.card || {};
  if (!cardO.id) return false;
  if (feitos[cardO.id]) return false;                       // copiado nesta rodada: já veio com o estado atual
  var autor = a.memberCreator ? (a.memberCreator.fullName || a.memberCreator.username) : '';
  var idT = mapa[cardO.id];

  // card ainda não espelhado: copia se ele está (agora) no fluxo
  if (!idT) {
    var criou = /^(createCard|copyCard|moveCardToBoard|convertToCardFromCheckItem|emailCard)$/.test(a.type);
    var entrou = a.type === 'updateCard' && d.listAfter && ES.FLUXO.indexOf(vd_nomeColuna_(d.listAfter.name)) >= 0;
    if (!criou && !entrou) return false;
    var atual; try { atual = vd_api_('/cards/' + cardO.id, { cru: true, query: { fields: 'name,idList,closed' } }); } catch (e) { return false; }
    var nl = origemNome[atual.idList];
    if (atual.closed || ES.FLUXO.indexOf(nl) < 0) return false;
    if (/NOVO PEDIDO DE PE[ÇC]A/i.test(atual.name || '')) return false;
    es_copiar_(atual, nl, dest, mapa);
    feitos[cardO.id] = true;
    return true;
  }
  es_marcarAutor_(idT, autor);

  switch (a.type) {
    case 'updateCard':
      var old = d.old || {}, put = {};
      if (d.listAfter) {
        var nomeL = vd_nomeColuna_(d.listAfter.name), alvo = dest[ES.FLUXO.indexOf(nomeL) >= 0 ? nomeL : ES.FORA];
        if (alvo) put.idList = alvo;
      }
      if (Object.prototype.hasOwnProperty.call(old, 'desc')) put.desc = cardO.desc || '';
      if (Object.prototype.hasOwnProperty.call(old, 'name')) put.name = cardO.name || '';
      if (Object.prototype.hasOwnProperty.call(old, 'due')) put.due = cardO.due || null;
      if (Object.prototype.hasOwnProperty.call(old, 'dueComplete')) put.dueComplete = !!cardO.dueComplete;
      if (Object.prototype.hasOwnProperty.call(old, 'closed')) put.closed = !!cardO.closed;
      if (!Object.keys(put).length) return false;
      es_api_('/cards/' + idT, { method: 'put', payload: put });
      return true;
    case 'commentCard':
      es_api_('/cards/' + idT + '/actions/comments', { method: 'post', payload: { text: '💬 **' + autor + '** _(principal)_: ' + String(d.text || '') } });
      return true;
    case 'addAttachmentToCard':
      return es_copiarAnexo_(d.attachment || {}, cardO.id, idT);
    case 'deleteAttachmentFromCard':
      var ans = vd_api_('/cards/' + idT + '/attachments', { query: { fields: 'name' } });
      var alvoA = ans.filter(function (x) { return x.name === (d.attachment || {}).name; })[0];
      if (!alvoA) return false;
      es_api_('/cards/' + idT + '/attachments/' + alvoA.id, { method: 'delete' });
      return true;
    case 'addLabelToCard':
    case 'removeLabelFromCard':
      var et = es_etiqueta_((d.label || {}).name, (d.label || {}).color);
      if (!et) return false;
      if (a.type === 'addLabelToCard') { try { es_api_('/cards/' + idT + '/idLabels', { method: 'post', payload: { value: et } }); } catch (e) { if (e.codigo !== 400) throw e; } }
      else { try { es_api_('/cards/' + idT + '/idLabels/' + et, { method: 'delete' }); } catch (e) { if (e.codigo !== 404) throw e; } }
      return true;
    default:
      return es_checklist_(a, idT);
  }
}

function es_etiqueta_(nome, cor) {
  if (!nome) return '';
  var c = CacheService.getScriptCache(), k = 'es_etq_' + ES.DESTINO, js = c.get(k), ls;
  if (js) ls = JSON.parse(js); else { ls = vd_api_('/boards/' + ES.DESTINO + '/labels', { query: { fields: 'name,color', limit: 200 } }); c.put(k, JSON.stringify(ls), 3600); }
  var l = ls.filter(function (x) { return (x.name || '').trim().toUpperCase() === String(nome).trim().toUpperCase(); })[0];
  if (l) return l.id;
  var novo = vd_api_('/boards/' + ES.DESTINO + '/labels', { method: 'post', payload: { name: nome, color: cor || null } });
  c.remove(k);
  return novo.id;
}

/** Anexo novo no principal -> mesmo arquivo no TESTE (upload baixado com o token do robô; link fica link). */
function es_copiarAnexo_(at, idO, idT) {
  if (!at.id) return false;
  var info = vd_api_('/cards/' + idO + '/attachments/' + at.id, { cru: true, query: { fields: 'name,url,isUpload,mimeType' } });
  if (!info.isUpload) { es_api_('/cards/' + idT + '/attachments', { method: 'post', payload: { url: info.url, name: info.name } }); return true; }
  var r = qt_fetch_(info.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error('download do anexo ' + info.name + ': ' + r.getResponseCode());
  var blob = r.getBlob().setName(info.name);
  es_api_('/cards/' + idT + '/attachments', { method: 'post', multipart: { file: blob, name: info.name } });
  return true;
}

/** Ações de checklist: refaz no espelho, "à mão" (a trava do TESTE reage como reagiria no principal). */
function es_checklist_(a, idT) {
  var d = a.data || {}, nomeCl = (d.checklist || {}).name, it = d.checkItem || {};
  var cls = vd_api_('/cards/' + idT + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name,state,due', fields: 'name' } });
  var cl = cls.filter(function (k) { return k.name === nomeCl; })[0];
  var item = cl && it.name ? (cl.checkItems || []).filter(function (i) { return i.name === it.name || (d.old && i.name === d.old.name); })[0] : null;
  switch (a.type) {
    case 'addChecklistToCard':
      if (cl) return false;
      es_api_('/checklists', { method: 'post', payload: { idCard: idT, idChecklistSource: (d.checklist || {}).id } });
      return true;
    case 'removeChecklistFromCard':
      if (!cl) return false;
      es_api_('/checklists/' + cl.id, { method: 'delete' });
      return true;
    case 'updateChecklist':
      var antigo = d.old && d.old.name;
      var cl2 = cls.filter(function (k) { return k.name === antigo; })[0];
      if (!cl2) return false;
      es_api_('/checklists/' + cl2.id, { method: 'put', payload: { name: nomeCl } });
      return true;
    case 'createCheckItem':
      if (!cl || item) return false;
      es_api_('/checklists/' + cl.id + '/checkItems', { method: 'post', payload: { name: it.name, pos: 'bottom' } });
      return true;
    case 'deleteCheckItem':
      if (!item) return false;
      es_api_('/cards/' + idT + '/checkItem/' + item.id, { method: 'delete' });
      return true;
    case 'updateCheckItemStateOnCard':
      if (!item || item.state === it.state) return false;
      es_api_('/cards/' + idT + '/checkItem/' + item.id, { method: 'put', payload: { state: it.state } });
      return true;
    case 'updateCheckItem':
      if (!item) return false;
      var put = {};
      if (d.old && d.old.name !== undefined) put.name = it.name;
      if (d.old && d.old.due !== undefined) put.due = it.due || null;
      if (!Object.keys(put).length) return false;
      es_api_('/cards/' + idT + '/checkItem/' + item.id, { method: 'put', payload: put });
      return true;
  }
  return false;
}

/** Situação do espelho (rodar na mão). */
function es_situacao() {
  var p = PropertiesService.getScriptProperties();
  Logger.log('ligado: ' + p.getProperty('ES_LIGADO') + ' · cópia inicial: ' + p.getProperty('ES_COPIA_INICIAL') + ' · última sincronização: ' + p.getProperty('ES_ULTIMA') +
    ' · cards espelhados: ' + Object.keys(es_mapa_()).length);
}
