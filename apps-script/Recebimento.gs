/* ============================ RECEBIMENTO DE PEÇAS ============================
 * Aba 📦 Recebimento do formulário (qualquer membro do quadro): marca o que chegou nos checklists
 * PAGAS / PAGAS PARTICULAR / PAGAS COMPLEMENTO (compradas pela oficina) e FORNECIMENTO / FORNECIMENTO COMPLEMENTO (seguradora), com data de chegada, observação por
 * peça e anexos (fotos / nota) — cada anexo ligado a uma ou mais peças.
 * - O ✔ do item é a equipe registrando a chegada (o robô continua sem marcar ✔ sozinho).
 * - Comentário no card com chegada x previsão (atraso em dias úteis) e os anexos.
 * - Linha RECEBIMENTO por peça na planilha de eventos (prazo prometido x real por fornecedor).
 * - Tudo recebido (PAGAS + FORNECIMENTO) -> ENCERRADO COMPRAS/FORNEC. (se a coluna existir).
 */
var RC = { LISTA_FIM: 'ENCERRADO COMPRAS/FORNEC.' };

/** Itens recebíveis do card: [{id, nome, ok, due, lista: PAGAS|FORNECIMENTO}] */
function vdf_itensRecebimento_(c) {
  var out = [];
  (c.checklists || []).forEach(function (k) {
    var nm = String(k.name || '').trim();
    var comp = /COMPLEMENTO/i.test(nm);
    var tipo = /^PAGAS/i.test(nm) ? (/PARTICULAR/i.test(nm) ? 'PAGAS PARTICULAR' : (comp ? 'PAGAS COMPLEMENTO' : 'PAGAS')) : (/FORNECIMENTO/i.test(nm) ? (comp ? 'FORNECIMENTO COMPLEMENTO' : 'FORNECIMENTO') : '');
    if (!tipo) return;
    (k.checkItems || []).forEach(function (i) { out.push({ id: i.id, nome: i.name, ok: i.state === 'complete', due: i.due || '', lista: tipo }); });
  });
  return out;
}

/** Dias úteis de atraso entre a previsão e a chegada (negativo = chegou antes). */
function rc_atraso_(dueIso, chegada) {
  if (!dueIso) return null;
  var d0 = new Date(dueIso), a = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), 12);
  var b = new Date(chegada.getFullYear(), chegada.getMonth(), chegada.getDate(), 12);
  if (a.getTime() === b.getTime()) return 0;
  var sinal = b > a ? 1 : -1, n = 0, d = new Date(a.getTime()), guarda = 0;
  while (du_chave_(d) !== du_chave_(b) && guarda++ < 400) { d.setDate(d.getDate() + sinal); if (du_ehUtil_(d)) n++; }
  return sinal * n;
}

function rc_data_(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  var h = new Date();
  var d = m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12);
  if (d.getTime() > Date.now() + 864e5) d = new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12);   // sem data futura
  return d;
}

/**
 * p = {shortLink, itens:[{id, data:'aaaa-mm-dd', obs}], anexos:[{fileId, ids:[idItem...]}], geral}
 */
/** Recebimento: em Toledo só compras/diretoria; nas filiais (ou card sem unidade) também o consultor (qualquer membro). */
function vdf_podeReceber_(me, card) {
  if (vdf_podeComprar_(me)) return true;
  var u = ev_unidade_(card);
  if (!u) {   // sem etiqueta de unidade: campo personalizado "Unidade"
    try {
      var d = cf_defs_()['Unidade'], itens = vd_api_('/cards/' + card.id + '/customFieldItems', { cru: true }) || [];
      var it = d && itens.filter(function (x) { return x.idCustomField === d.id; })[0];
      if (it && it.idValue) Object.keys(d.opcoes).forEach(function (k) { if (d.opcoes[k] === it.idValue) u = k; });
    } catch (e) {}
  }
  return !/TOLEDO/i.test(u || '');
}
function vdf_salvarRecebimento(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (!vdf_podeReceber_(me, card)) return { ok: false, faltas: ['Em Toledo, o recebimento é registrado pelo setor de compras (ou pela diretoria) — sua conta: ' + me.username + '.'] };
  var todos = vdf_itensRecebimento_(card), porId = {};
  todos.forEach(function (i) { porId[i.id] = i; });
  var itens = (p.itens || []).filter(function (x) { return porId[x.id]; });
  var anexos = (p.anexos || []).filter(function (a) { return a && a.fileId; });
  if (!itens.length && !anexos.length) return { ok: false, faltas: ['Marque pelo menos uma peça que chegou (ou anexe a nota/foto).'] };

  var linhas = [], evs = [], feitos = 0;
  itens.forEach(function (x) {
    var it = porId[x.id], quando = rc_data_(x.data), obs = String(x.obs || '').replace(/\s*\n\s*/g, ' ').trim();
    if (!it.ok) {
      vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'put', payload: { state: 'complete' } }, token);
      it.ok = true; feitos++;
    }
    var atr = rc_atraso_(it.due, quando);
    var atrTxt = atr === null ? '' : (atr > 0 ? ' · **' + atr + ' d.u. de atraso**' : (atr < 0 ? ' · ' + (-atr) + ' d.u. antes' : ' · no prazo'));
    linhas.push('✔ ' + String(it.nome).split(/\s+-\s+/)[0] + ' — ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM') + atrTxt + (obs ? ' · 📝 ' + obs : ''));
    var partes = String(it.nome).split(/\s+-\s+/);
    var ehPg = /^PAGAS/.test(it.lista);
    evs.push({ peca: partes[0], particular: it.lista === 'PAGAS PARTICULAR', fornecedor: ehPg && partes.length >= 2 ? partes[1] : (/^FORNECIMENTO/.test(it.lista) ? 'SEGURADORA (FO)' : ''),
      valor: ehPg ? vd_valorNum_(((partes[2] || '').match(/[\d.]+(?:,\d{1,2})?/) || [''])[0]) : '',
      previsao: it.due || '', dias: atr === null ? '' : atr,
      detalhe: 'chegou ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM/yyyy') + (atr === null ? '' : ' · atraso ' + atr + ' d.u.') + (obs ? ' · ' + obs : '') + ' · ' + it.lista });
  });

  // anexos: nome diz a quais peças se referem
  var nAnexos = 0, nomesAnexos = [];
  anexos.forEach(function (a) {
    try {
      var f = vdf_arquivoTemp_(a.fileId);
      var refs = (a.ids || []).map(function (id) { return porId[id] ? String(porId[id].nome).split(/\s+-\s+/)[0] : ''; }).filter(String);
      var tipo = /pdf|xml/i.test(f.getMimeType() || '') || /\.(pdf|xml)$/i.test(f.getName()) ? 'NF' : 'Foto';
      var nome = '📦 ' + tipo + (refs.length ? ' — ' + refs.join(', ').slice(0, 120) : '') + ' — ' + f.getName();
      vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: { file: f.getBlob(), name: nome } }, token);
      f.setTrashed(true);
      nAnexos++; nomesAnexos.push(nome);
    } catch (e) { console.log('recebimento/anexo: ' + e); }
  });

  var pend = todos.filter(function (i) { return !i.ok; });
  var movido = '';
  // só fecha o card se ele estiver em FALTA CHEGAR (peça da oficina ainda em cotação/compra não fica para trás)
  try { movido = rc_reavaliarColuna_(card.id, token, me.username); } catch (e) { console.log('recebimento/coluna: ' + e); }
  try {
    var geral = String(p.geral || '').trim();
    var txt = '📦 **RECEBIMENTO** — ' + me.fullName + (movido ? ' → **' + movido + '**' : '') + '\n' + (linhas.length ? linhas.join('\n') : '_(só anexos)_') +
      (nAnexos ? '\n📎 ' + nAnexos + ' anexo(s)' : '') +
      (geral ? '\n📝 ' + geral : '') +
      (pend.length ? '\n⏳ Falta chegar: ' + pend.map(function (i) { return i.nome.split(/\s+-\s+/)[0]; }).join(', ') : '\n✅ Tudo recebido.');
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } }, token);
  } catch (e) {}
  try { ev_registrar_('RECEBIMENTO', card, me.username, evs.length ? evs : null, { detalhe: nAnexos ? nAnexos + ' anexo(s)' : '' }); } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: feitos, anexos: nAnexos, faltam: pend.length, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

/**
 * Coluna certa pelo estado dos checklists PAGAS e FORNECIMENTO (chamado depois de toda escrita neles):
 *  - tudo recebido e card em FALTA CHEGAR                      -> ENCERRADO COMPRAS/FORNEC.
 *  - item pendente e card em ENCERRADO / ENTREGUES              -> FALTA CHEGAR (complemento / FO nova)
 *  - card sem peça da oficina, só FO, ainda em EM COTAÇÃO      -> FALTA CHEGAR (não tem o que cotar)
 * Card em qualquer outra coluna não é mexido (peça ainda em cotação/autorização/compra).
 * Retorna o nome da coluna para onde foi ('' se ficou).
 */
function rc_reavaliarColuna_(cardOuId, token, usuario) {
  var id = typeof cardOuId === 'string' ? cardOuId : cardOuId.id;
  var card = vd_api_('/cards/' + id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state' } });
  if (vdf_cardProtegido_(card.name)) return '';
  var ctx = vd_contexto_(), lista = vdf_nomeLista_(ctx, card.idList);
  var itens = vdf_itensRecebimento_(card), pend = itens.filter(function (i) { return !i.ok; });
  var alvo = '';
  if (lista === VDF_LISTA_CHEGAR && itens.length && !pend.length) alvo = RC.LISTA_FIM;
  else if (lista === VDF_LISTA_AUTORIZADO) {
    // toda peça autorizada já está no PAGAS (ex.: a não autorizada foi removida do pedido)
    var anA = vd_analisar_(card.desc, card.name), autsA = vd_autorizacoesDaDescricao_(card.desc, anA.pecas);
    var pagas = vdf_itensPagas_(card);
    if (autsA.length && autsA.every(function (a) { return pagas.some(function (n) { return vd_casaItem_(n, a.chave); }); })) alvo = VDF_LISTA_CHEGAR;
  }
  else if ((lista === RC.LISTA_FIM || lista === 'ENTREGUES') && pend.length) alvo = VDF_LISTA_CHEGAR;
  else if (lista === VD.LISTA_COTACAO && itens.length && itens.every(function (i) { return /^FORNECIMENTO/.test(i.lista); })) {
    var an = vd_analisar_(card.desc, card.name);
    if (!an.pecas.length) alvo = pend.length ? VDF_LISTA_CHEGAR : RC.LISTA_FIM;
  }
  if (!alvo || !ctx.listas[alvo]) return '';
  var movido = vdf_moverPara_(card, ctx, alvo, token, usuario || 'robô');
  if (movido && lista !== VDF_LISTA_CHEGAR) {
    try {
      vd_comentar_(card, '↪️ Card → **' + movido + '** (' + (alvo === VDF_LISTA_CHEGAR ? pend.length + ' peça(s) para chegar' : 'tudo recebido') + ').');
    } catch (e) {}
  }
  return movido;
}
