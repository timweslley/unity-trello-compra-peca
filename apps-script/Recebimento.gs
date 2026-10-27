/* ============================ RECEBIMENTO DE PEÇAS ============================
 * Aba 📦 Recebimento do formulário (qualquer membro do quadro): marca o que chegou nos checklists
 * PAGAS / PAGAS PARTICULAR / PAGAS COMPLEMENTO (compradas pela oficina) e FORNECIMENTO / FORNECIMENTO COMPLEMENTO (seguradora), com data de chegada, observação por
 * peça e anexos (fotos / nota) — cada anexo ligado a uma ou mais peças.
 * - O ✔ do item é a equipe registrando a chegada (o robô continua sem marcar ✔ sozinho).
 * - Comentário no card com chegada x previsão (atraso em dias úteis) e os anexos.
 * - Linha RECEBIMENTO por peça na planilha de eventos (prazo prometido x real por fornecedor).
 * - Tudo recebido (PAGAS + FORNECIMENTO) -> ENCERRADO COMPRAS/FORNEC. (se a coluna existir).
 */
var RC = { LISTA_FIM: 'ENCERRADO COMPRAS/FORNEC.', LOCAIS_MAX: 60 };

/* ---------- marcas no nome do item do checklist (10/10/2026, revisão) ----------
 * O comprador escrevia em comentário livre onde a peça ficou guardada ("parachoque em F1") e quem a retirou ("Leomar retirou o
 * paralama") — ~60 comentários em 5 dias que se perdiam. Agora o item do checklist carrega isso no fim do nome:
 *   "COD DESC - FORNECEDOR - R$ 100,00 · 📍 F1 · ✋ LEOMAR 10/10"   (· em vez de " - " para não mexer nas partes já lidas)
 * e "↩️ DEVOLVIDA dd/MM" quando a peça voltou ao fornecedor. rc_marcas_ lê, rc_comMarcas_ escreve. */
var RC_RE_MARCA = /\s*·\s*(📍|✋|↩️?)\s*([^·]*?)\s*(?=\s*·\s*(?:📍|✋|↩️?)|$)/g;   // ↩ com ou sem o seletor FE0F
function rc_marcas_(nome) {
  var out = { base: String(nome || ''), local: '', retirada: '', devolvida: '' }, m;
  var re = new RegExp(RC_RE_MARCA.source, 'g');
  while ((m = re.exec(out.base))) { if (m[1] === '📍') out.local = m[2]; else if (m[1] === '✋') out.retirada = m[2]; else out.devolvida = m[2]; }
  out.base = out.base.replace(new RegExp(RC_RE_MARCA.source, 'g'), '').trim();
  return out;
}
function rc_comMarcas_(base, mk) {
  var s = String(base || '').trim();
  if (mk.local) s += ' · 📍 ' + mk.local;
  if (mk.retirada) s += ' · ✋ ' + mk.retirada;
  if (mk.devolvida) s += ' · ↩️ ' + mk.devolvida;
  return s;
}
/** Nome do item sem as marcas (para quem lê fornecedor/valor/previsão do nome). */
function rc_semMarcas_(nome) { return rc_marcas_(nome).base; }
function rc_normLocal_(s) { return vd_semAcento_(String(s || '')).replace(/[^A-Z0-9 \-\/]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }
/** Locais já usados (lista para o formulário sugerir): propriedade RC_LOCAIS. */
function rc_locais_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('RC_LOCAIS') || '[]'); } catch (e) { return []; } }
function rc_guardarLocais_(novos) {
  if (!novos.length) return;
  sg_secao_('RC_LOCAIS', function () {
    var l = rc_locais_();
    novos.forEach(function (x) { if (x && l.indexOf(x) < 0) l.push(x); });
    l.sort();
    try { PropertiesService.getScriptProperties().setProperty('RC_LOCAIS', JSON.stringify(l.slice(-RC.LOCAIS_MAX))); } catch (e) {}
  });
}
/** Troca as marcas de um item (licença de checklist pelo vd_api_). */
function rc_gravarMarcas_(cardId, it, mk, token) {
  var m = rc_marcas_(it.nome), novo = {};
  Object.keys(m).forEach(function (k) { novo[k] = m[k]; });
  Object.keys(mk).forEach(function (k) { novo[k] = mk[k]; });
  var nome = rc_comMarcas_(novo.base, novo);
  if (nome === it.nome) return nome;
  vd_api_('/cards/' + cardId + '/checkItem/' + it.id, { method: 'put', payload: { name: nome } }, token);
  it.nome = nome;
  return nome;
}

/**
 * Cancela a compra de uma peça (item PAGAS*): o item sai do checklist, fica o evento e o comentário; a peça volta a aparecer
 * como autorizada (sem compra) e o card volta para AUTORIZADO COMPRA se estava em FALTA CHEGAR (rc_reavaliarColuna_).
 * modo: 'cancelada' (fornecedor cancelou / compra desfeita) ou 'devolvida' (peça chegou errada/avariada e voltou ao fornecedor).
 */
function rc_cancelarCompra_(card, it, motivo, modo, token, me) {
  vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'delete' }, token);
  var partes = rc_semMarcas_(it.nome).split(/\s+-\s+/);
  var e = { peca: partes[0], particular: it.lista === 'PAGAS PARTICULAR', fornecedor: partes.length >= 2 ? partes[1] : '',
    valor: vd_valorNum_(((partes[2] || '').match(/[\d.]+(?:,\d{1,2})?/) || [''])[0]), previsao: it.due || '',
    detalhe: (modo === 'devolvida' ? 'DEVOLVIDA AO FORNECEDOR' : 'COMPRA CANCELADA') + (motivo ? ': ' + motivo : '') + ' · ' + it.lista };
  try { ev_registrar_('COMPRA CANCELADA', card, me.username, [e], { detalhe: modo + (motivo ? ' — ' + motivo : '') }); } catch (x) {}
  try { rc_aposCancelar_(card, it, motivo, modo, token); } catch (x) { console.log('cancelar/ajustes: ' + x); }
  return (modo === 'devolvida' ? '↩️ ' : '❌ ') + partes[0] + (partes[1] ? ' (' + partes[1] + ')' : '') + ' — ' + (modo === 'devolvida' ? 'devolvida ao fornecedor' : 'compra cancelada') + (motivo ? ': ' + motivo : '') + ' · verificar compra do item';
}

/** 19/10/2026 (revisão completa do fluxo, ZZT9C01) — depois de cancelar/devolver uma compra (só com vd_ajustes1910_):
 *  • "⚠️ comprado antes da autorização do complementar" era daquela compra: sai da linha da peça se não sobrou outra compra dela;
 *  • a peça ganha a linha "OBS <peça>: (devolvida dd/MM · FORN) motivo" — o comprador vê na aba Compra por que precisa comprar de novo;
 *  • Data Entrega do card: maior previsão das peças ainda pendentes; sem nenhuma, a regra do robô (2 dias úteis a partir de agora).
 *  A compra já saiu do checklist quando esta função roda. */
function rc_aposCancelar_(card, it, motivo, modo, token) {
  if (!vd_ajustes1910_()) return;
  (card.checklists || []).forEach(function (k) { k.checkItems = (k.checkItems || []).filter(function (i) { return i.id !== it.id; }); });
  var nomeIt = vd_semAcento_(rc_semMarcas_(it.nome)), partes = rc_semMarcas_(it.nome).split(/\s+-\s+/);
  if (card.desc && !vd_ehVitrineSemCompleta_(card.desc)) {   // sem a descrição completa não regrava nada (só a Data Entrega)
    var an = vd_analisar_(card.desc, card.name);
    var peca = (an.pecas || []).filter(function (p) { return vd_casaItem_(nomeIt, vd_chavePeca_(p)); })[0];
    if (peca) {
      var k = vd_chavePeca_(peca), resto = [];
      (card.checklists || []).forEach(function (ck) { if (/^PAGAS/i.test(String(ck.name || '').trim())) (ck.checkItems || []).forEach(function (i) { resto.push(vd_semAcento_(i.name)); }); });
      var reler = function () { try { card.desc = vd_api_('/cards/' + card.id, { query: { fields: 'desc' } }).desc; } catch (x) {} };
      if (peca.compStatus === 'ANTECIPADO' && !resto.some(function (n) { return vd_casaItem_(n, k); })) {
        peca.compStatus = ''; peca.compPor = '';
        if (vdf_regravarLinhasPeca_(card, [peca], token)) reler();
      }
      var nomeP = peca.pneu ? 'PNEU ' + String(peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(peca);
      var quando = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM');
      var linha = 'OBS ' + nomeP + ': (' + (modo === 'devolvida' ? 'devolvida' : 'compra cancelada') + ' ' + quando + (partes[1] ? ' · ' + partes[1] : '') + ') ' + String(motivo || '').replace(/\s*\n\s*/g, ' ').trim();
      var div = vd_dividir_(card.desc);
      vd_gravarDesc_(card.id, div.bloco.replace(/\s+$/, '') + '\n\n' + (div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR) + '\n' + linha, token);
      reler();
    }
  }
  // Data Entrega: a previsão da compra cancelada não vale mais
  var maior = '';
  (card.checklists || []).forEach(function (ck) {
    if (!/^(PAGAS|FORNECIMENTO)/i.test(String(ck.name || '').trim())) return;
    (ck.checkItems || []).forEach(function (i) { if (i.state !== 'complete' && i.due && (!maior || new Date(i.due) > new Date(maior))) maior = i.due; });
  });
  if (!maior) maior = new Date(du_somarUteis_(PZ.DIAS_SEM_PREVISAO, new Date().toISOString())).toISOString();
  vd_api_('/cards/' + card.id, { method: 'put', payload: { due: maior, dueComplete: false } }, token);
}

/**
 * ✔ marcado direto no Trello (trava de checklist, 10/10/2026): se quem marcou pode receber neste card, vira recebimento de hoje —
 * comentário 📦, evento RECEBIMENTO e coluna reavaliada. Devolve os ids dos itens aceitos (os outros a trava desfaz).
 * m = {card:{id,name,shortLink}, quem, nome, itens:[checkItem]}
 */
function ck_aceitarManual_(cardId, m) {
  var card = vd_api_('/cards/' + cardId, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return [];
  var me = { username: String(m.quem || '').toLowerCase(), fullName: m.nome || m.quem };
  if (!vdf_podeReceber_(me, card)) return [];
  var todos = vdf_itensRecebimento_(card), porId = {};
  todos.forEach(function (i) { porId[i.id] = i; });
  var hoje = rc_data_(''), linhas = [], evs = [], aceitos = [];
  (m.itens || []).forEach(function (ci) {
    var it = porId[ci.id];
    if (!it || !it.ok) return;   // já desmarcado de novo / item sumiu
    aceitos.push(it.id);
    if (it.devolvida) { try { rc_gravarMarcas_(card.id, it, { devolvida: '' }, null); } catch (e) {} }
    var atr = rc_atraso_(it.due, hoje);
    var atrTxt = atr === null ? '' : (atr > 0 ? ' · **' + atr + ' d.u. de atraso**' : (atr < 0 ? ' · ' + (-atr) + ' d.u. antes' : ' · no prazo'));
    linhas.push('✔ ' + it.base.split(/\s+-\s+/)[0] + ' — ' + Utilities.formatDate(hoje, 'America/Sao_Paulo', 'dd/MM') + atrTxt);
    var partes = it.base.split(/\s+-\s+/), ehPg = /^PAGAS/.test(it.lista);
    evs.push({ peca: partes[0], particular: it.lista === 'PAGAS PARTICULAR', fornecedor: ehPg && partes.length >= 2 ? partes[1] : (/^FORNECIMENTO/.test(it.lista) ? 'SEGURADORA (FO)' : ''),
      valor: ehPg ? vd_valorNum_(((partes[2] || '').match(/[\d.]+(?:,\d{1,2})?/) || [''])[0]) : '', previsao: it.due || '', dias: atr === null ? '' : atr,
      detalhe: 'chegou ' + Utilities.formatDate(hoje, 'America/Sao_Paulo', 'dd/MM/yyyy') + (atr === null ? '' : ' · atraso ' + atr + ' d.u.') + ' · ✔ marcado no Trello · ' + it.lista });
  });
  if (!aceitos.length) return [];
  var pend = todos.filter(function (i) { return !i.ok; });
  var movido = ''; try { movido = rc_reavaliarColuna_(card.id, null, m.quem); } catch (e) { console.log('✔ manual/coluna: ' + e); }
  try {
    vd_comentar_(card, '📦 **RECEBIMENTO** — ' + (m.nome || m.quem) + ' (✔ marcado no Trello)' + (movido ? ' → **' + movido + '**' : '') + '\n' + linhas.join('\n') +
      '\n_Dica: pela aba 📦 Recebimento dá para informar a data certa, onde guardou (📍) e anexar a nota._' +
      (pend.length ? '\n⏳ Falta chegar: ' + pend.map(function (i) { return i.base.split(/\s+-\s+/)[0]; }).join(', ') : '\n✅ Tudo recebido.'));
  } catch (e) {}
  try { ev_registrar_('RECEBIMENTO', card, m.quem, evs, { detalhe: '✔ marcado no Trello' }); } catch (e) {}
  try { vd_redesenhar_(card.id); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return aceitos;
}

/* ---------- aba ✋ Retirada (10/10/2026, Weslley) ----------
 * Peça recebida que saiu do estoque: quem levou (funileiro, outra unidade, montagem) e quando. Mesma permissão do recebimento.
 * Marca "· ✋ QUEM dd/MM" no item; evento RETIRADA; desfazer com motivo. Card em ENCERRADO com TODAS as peças recebidas e
 * retiradas vai sozinho para ENTREGUES. p = {shortLink, itens:[idItem], quem, data:'aaaa-mm-dd', desfazer:[{id, motivo}]} */
function rc_quemLista_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('RC_QUEM') || '[]'); } catch (e) { return []; } }
function rc_guardarQuem_(q) {
  if (!q) return;
  sg_secao_('RC_QUEM', function () {
    var l = rc_quemLista_(); if (l.indexOf(q) >= 0) return;
    l.push(q); l.sort();
    try { PropertiesService.getScriptProperties().setProperty('RC_QUEM', JSON.stringify(l.slice(-RC.LOCAIS_MAX))); } catch (e) {}
  });
}
function vdf_salvarRetirada(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (!vdf_podeReceber_(me, card)) return { ok: false, faltas: ['Em Toledo, a retirada é registrada pelo setor de compras (ou pela diretoria) — sua conta: ' + me.username + '.'] };
  var todos = vdf_itensRecebimento_(card), porId = {};
  todos.forEach(function (i) { porId[i.id] = i; });
  var ids = (p.itens || []).filter(function (id) { return porId[id] && porId[id].ok && !porId[id].retirada; });
  var desf = (p.desfazer || []).filter(function (x) { return x && porId[x.id] && porId[x.id].retirada; });
  var quem = vd_semAcento_(String(p.quem || '')).replace(/[^A-Z0-9 \-\/]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  var faltas = [];
  if (ids.length && !quem) faltas.push('Informe quem retirou as peças.');
  desf.forEach(function (x) { if (!String(x.motivo || '').trim()) faltas.push(pv_curto_(porId[x.id].base) + ': escreva o motivo para desfazer a retirada.'); });
  if (p.data && new Date(p.data + 'T12:00:00').getTime() > Date.now() + 864e5) faltas.push('Data da retirada no futuro (' + p.data + ') — confira.');
  if (!ids.length && !desf.length && !faltas.length) faltas.push('Marque pelo menos uma peça retirada (só aparecem peças já recebidas).');
  if (faltas.length) return { ok: false, faltas: faltas };
  var quando = rc_data_(p.data), dd = Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM');
  var linhas = [], evs = [], evsD = [];
  ids.forEach(function (id) {
    var it = porId[id];
    rc_gravarMarcas_(card.id, it, { retirada: quem + ' ' + dd }, token);
    it.retirada = quem + ' ' + dd;
    var pt = it.base.split(/\s+-\s+/);
    linhas.push('✋ ' + pt[0] + (it.local ? ' (estava em ' + it.local + ')' : ''));
    evs.push({ peca: pt[0], particular: it.lista === 'PAGAS PARTICULAR', fornecedor: /^PAGAS/.test(it.lista) && pt.length >= 2 ? pt[1] : (/^FORNECIMENTO/.test(it.lista) ? 'SEGURADORA (FO)' : ''),
      detalhe: 'retirada por ' + quem + ' em ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM/yyyy') + (it.local ? ' · estava em ' + it.local : '') + ' · ' + it.lista });
  });
  desf.forEach(function (x) {
    var it = porId[x.id], motivo = String(x.motivo).replace(/\s*\n\s*/g, ' ').trim(), era = it.retirada;
    rc_gravarMarcas_(card.id, it, { retirada: '' }, token);
    it.retirada = '';
    var pt = it.base.split(/\s+-\s+/);
    linhas.push('↩️ retirada desfeita: ' + pt[0] + ' (era ' + era + ') — ' + motivo);
    evsD.push({ peca: pt[0], detalhe: 'RETIRADA DESFEITA (era ' + era + '): ' + motivo + ' · ' + it.lista });
  });
  rc_guardarQuem_(quem);
  // tudo recebido e tudo retirado: ENCERRADO -> ENTREGUES
  var movido = '', lista = vdf_nomeLista_(ctx, card.idList);
  var noEstoque = todos.filter(function (i) { return i.ok && !i.retirada; }), pendRec = todos.filter(function (i) { return !i.ok; });
  var devPend = []; try { devPend = rc_devolucoesPendentes_(card); } catch (e) {}
  if (lista === RC.LISTA_FIM && todos.length && !pendRec.length && !noEstoque.length && ctx.listas['ENTREGUES']) {
    // 21/10/2026 (Weslley): devolução sem NF segura o card em ENCERRADO até o comprador informar a NF (aba Recebimento → Devoluções)
    if (devPend.length) linhas.push('⏳ O card fica em **' + RC.LISTA_FIM + '**: NF de devolução pendente — ' + devPend.map(function (d) { return d.peca; }).join('; '));
    else { try { movido = vdf_moverPara_(card, ctx, 'ENTREGUES', token, me.username); } catch (e) { console.log('retirada/coluna: ' + e); } }
  }
  try {
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '✋ **RETIRADA** — ' + me.fullName + (ids.length ? ' · por **' + quem + '** em ' + dd : '') + (movido ? ' → **' + movido + '**' : '') + '\n' + linhas.join('\n') +
      (noEstoque.length ? '\n📦 Ainda no estoque: ' + noEstoque.map(function (i) { return i.base.split(/\s+-\s+/)[0] + (i.local ? ' (' + i.local + ')' : ''); }).join(', ') : (pendRec.length ? '' : '\n✅ Todas as peças retiradas.')) } }, token);
  } catch (e) {}
  try { if (evs.length) ev_registrar_('RETIRADA', card, me.username, evs, { detalhe: ids.length + ' peça(s) · ' + quem }); } catch (e) {}
  try { if (evsD.length) ev_registrar_('RETIRADA', card, me.username, evsD, { detalhe: 'desfeita' }); } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: ids.length, desfeitas: desf.length, faltam: noEstoque.length, lista: movido || lista };
}

/** Aba Compra: ❌ compra cancelada. p = {shortLink, id (item PAGAS), motivo} */
function vdf_cancelarCompra(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) cancela uma compra — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var it = vdf_itensRecebimento_(card).filter(function (i) { return i.id === p.id; })[0];
  if (!it || !/^PAGAS/.test(it.lista)) return { ok: false, faltas: ['Item de compra não encontrado (atualize a página).'] };
  if (it.ok) return { ok: false, faltas: ['Esta peça já foi recebida — se voltou ao fornecedor, use "↩️ devolvida" na aba 📦 Recebimento.'] };
  var motivo = String(p.motivo || '').replace(/\s*\n\s*/g, ' ').trim();
  if (!motivo) return { ok: false, faltas: ['Escreva o motivo do cancelamento — vai para o card.'] };
  var linha = rc_cancelarCompra_(card, it, motivo, 'cancelada', token, me);
  var movido = ''; try { movido = rc_reavaliarColuna_(card.id, token, me.username, { semCompra: true }); } catch (e) { console.log('cancelar/coluna: ' + e); }
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '❌ **COMPRA CANCELADA** — ' + me.fullName + (movido ? ' → **' + movido + '**' : '') + '\n' + linha } }, token); } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, lista: movido || vdf_nomeLista_(vd_contexto_(), card.idList) };
}

/** 20/10/2026 (Weslley, ATP5105): passa item de compra de card antigo ("AVENIDA - RADIADOR - NOTUS - R$310") para o
 *  padrão novo ("RADIADOR NOTUS - AVENIDA - R$ 310,00") pela escrita oficial (com licença: a trava não desfaz).
 *  Só a diretoria. p = {shortLink, itens:[{id, nome}]}. Mantém ✔, data e as marcas 📍/✋/↩️ do item. */
function vdf_renomearPagas(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria renomeia itens de compra — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,idBoard,shortLink,shortUrl', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var porId = {}; vdf_itensRecebimento_(card).forEach(function (i) { if (/^PAGAS/.test(i.lista)) porId[i.id] = i; });
  var faltas = [], feitos = [];
  (p.itens || []).forEach(function (x) {
    var it = porId[x && x.id], nome = String((x && x.nome) || '').replace(/\s+/g, ' ').trim().toUpperCase();
    if (!it) { faltas.push('item ' + (x && x.id) + ' não está no PAGAS deste card'); return; }
    if (!nome || nome.length > 200) { faltas.push(it.nome + ': nome vazio ou longo demais'); return; }
    var novo = rc_comMarcas_(nome, rc_marcas_(it.nome));
    if (novo === it.nome) return;
    vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'put', payload: { name: novo } }, token);
    feitos.push('• ' + it.base + ' → ' + nome);
  });
  if (faltas.length) return { ok: false, faltas: faltas, feitos: feitos.length };
  if (feitos.length) { try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🔄 **Compras do card antigo no padrão novo** — ' + me.fullName + '\n' + feitos.join('\n') } }, token); } catch (e) {} }
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  return { ok: true, n: feitos.length, url: card.shortUrl };
}

/** 20/10/2026 (Weslley, RHM2H41): orçamento só de mão de obra — card sem peça nenhuma vai para ENCERRADO pela escrita
 *  oficial (a trava não devolve). Só a diretoria; recusa se o card tem peça no pedido ou item de checklist pendente.
 *  p = {shortLink, motivo} */
function vdf_encerrarSemPecas(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria encerra card sem peças — sua conta: ' + me.username + '.'] };
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,idBoard,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var an = vd_analisar_(card.desc, card.name), pend = vdf_itensRecebimento_(card).filter(function (i) { return !i.ok; });
  if ((an.pecas || []).length) return { ok: false, faltas: ['O card tem ' + an.pecas.length + ' peça(s) no pedido — use o fluxo normal (ou marque 🚫 Não comprar).'] };
  if (pend.length) return { ok: false, faltas: ['O card tem ' + pend.length + ' item(ns) de checklist ainda não recebido(s).'] };
  var motivo = String(p.motivo || '').replace(/\s*\n\s*/g, ' ').trim().slice(0, 300);
  if (!motivo) return { ok: false, faltas: ['Escreva o motivo — vai para o card.'] };
  var mv = vdf_moverPara_(card, ctx, RC.LISTA_FIM, token, me.username);
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🔒 **Encerrado sem peças** — ' + me.fullName + (mv ? ' → **' + mv + '**' : '') + '\n📝 ' + motivo } }, token); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, lista: mv || vdf_nomeLista_(ctx, card.idList) };
}

/** Itens recebíveis do card: [{id, nome, ok, due, lista: PAGAS|FORNECIMENTO}] */
function vdf_itensRecebimento_(c) {
  var out = [];
  (c.checklists || []).forEach(function (k) {
    var nm = String(k.name || '').trim();
    var comp = /COMPLEMENTO/i.test(nm);
    var tipo = /^PAGAS/i.test(nm) ? (/PARTICULAR/i.test(nm) ? 'PAGAS PARTICULAR' : (comp ? 'PAGAS COMPLEMENTO' : 'PAGAS')) : (/FORNECIMENTO/i.test(nm) ? (comp ? 'FORNECIMENTO COMPLEMENTO' : 'FORNECIMENTO') : '');
    if (!tipo) return;
    (k.checkItems || []).forEach(function (i) {
      var mk = rc_marcas_(i.name);
      out.push({ id: i.id, nome: i.name, base: mk.base, local: mk.local, retirada: mk.retirada, devolvida: mk.devolvida, ok: i.state === 'complete', due: i.due || '', lista: tipo });
    });
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
  var u = ev_unidade_(card);   // campo "Unidade"; etiqueta só em card antigo
  return !/TOLEDO/i.test(u || '');
}
function vdf_salvarRecebimento(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (!vdf_podeReceber_(me, card)) return { ok: false, faltas: ['Este card está com a Unidade TOLEDO — em Toledo, o recebimento é registrado pelo setor de compras (ou pela diretoria); sua conta: ' + me.username + '. Se o carro é de outra unidade, corrija o campo Unidade do card (ou peça ao consultor) e tente de novo.'] };
  var todos = vdf_itensRecebimento_(card), porId = {};
  todos.forEach(function (i) { porId[i.id] = i; });
  var itens = (p.itens || []).filter(function (x) { return porId[x.id]; });
  var anexos = (p.anexos || []).filter(function (a) { return a && a.fileId; });
  // 10/10/2026: local no estoque de peça já recebida, retirada (quem levou) e devolução ao fornecedor
  var locais = (p.locais || []).filter(function (x) { return porId[x.id] && porId[x.id].ok; });
  var retiradas = (p.retiradas || []).filter(function (x) { return porId[x.id] && porId[x.id].ok; });
  var devolucoes = (p.devolucoes || []).filter(function (x) { return porId[x.id] && porId[x.id].ok; });
  if (!itens.length && !anexos.length && !locais.length && !retiradas.length && !devolucoes.length) return { ok: false, faltas: ['Marque pelo menos uma peça que chegou (ou anexe a nota/foto).'] };
  var faltas = [];
  retiradas.forEach(function (x) { if (!String(x.quem || '').trim()) faltas.push(pv_curto_(porId[x.id].nome) + ': informe quem retirou a peça.'); });
  devolucoes.forEach(function (x) { if (!String(x.motivo || '').trim()) faltas.push(pv_curto_(porId[x.id].nome) + ': escreva o motivo da devolução ao fornecedor.'); });
  if (faltas.length) return { ok: false, faltas: faltas };

  var linhas = [], evs = [], feitos = 0, locaisNovos = [];
  // data futura: antes virava "hoje" sem aviso (10/10/2026) — agora é erro
  var dataFutura = itens.filter(function (x) { return x.data && new Date(x.data + 'T12:00:00').getTime() > Date.now() + 864e5; });
  if (dataFutura.length) return { ok: false, faltas: dataFutura.map(function (x) { return pv_curto_(porId[x.id].nome) + ': data da chegada no futuro (' + x.data + ') — confira.'; }) };
  var marcar = [];   // 17/10/2026: marcar como recebido em paralelo (39 peças = ~20 s uma a uma)
  itens.forEach(function (x) {
    var it = porId[x.id], quando = rc_data_(x.data), obs = String(x.obs || '').replace(/\s*\n\s*/g, ' ').trim(), local = rc_normLocal_(x.local);
    if (!it.ok) {
      marcar.push({ caminho: '/cards/' + card.id + '/checkItem/' + it.id, opts: { method: 'put', payload: { state: 'complete' } } });
      it.ok = true; feitos++;
    }
    if (local) { try { rc_gravarMarcas_(card.id, it, { local: local, devolvida: '' }, token); locaisNovos.push(local); } catch (e) { console.log('local: ' + e); } }
    else if (it.devolvida) { try { rc_gravarMarcas_(card.id, it, { devolvida: '' }, token); } catch (e) {} }
    var atr = rc_atraso_(it.due, quando);
    var atrTxt = atr === null ? '' : (atr > 0 ? ' · **' + atr + ' d.u. de atraso**' : (atr < 0 ? ' · ' + (-atr) + ' d.u. antes' : ' · no prazo'));
    linhas.push('✔ ' + it.base.split(/\s+-\s+/)[0] + ' — ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM') + atrTxt + (local ? ' · 📍 ' + local : '') + (obs ? ' · 📝 ' + obs : ''));
    var partes = it.base.split(/\s+-\s+/);
    var ehPg = /^PAGAS/.test(it.lista);
    evs.push({ peca: partes[0], particular: it.lista === 'PAGAS PARTICULAR', fornecedor: ehPg && partes.length >= 2 ? partes[1] : (/^FORNECIMENTO/.test(it.lista) ? 'SEGURADORA (FO)' : ''),
      valor: ehPg ? vd_valorNum_(((partes[2] || '').match(/[\d.]+(?:,\d{1,2})?/) || [''])[0]) : '',
      previsao: it.due || '', dias: atr === null ? '' : atr,
      detalhe: 'chegou ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM/yyyy') + (atr === null ? '' : ' · atraso ' + atr + ' d.u.') + (local ? ' · local ' + local : '') + (obs ? ' · ' + obs : '') + ' · ' + it.lista });
  });
  if (marcar.length) vd_apiLote_(marcar, token);
  // local de peça já recebida
  locais.forEach(function (x) {
    var it = porId[x.id], local = rc_normLocal_(x.local);
    if (!local || local === it.local) return;
    try { rc_gravarMarcas_(card.id, it, { local: local }, token); locaisNovos.push(local); linhas.push('📍 ' + it.base.split(/\s+-\s+/)[0] + ' → ' + local); } catch (e) { console.log('local: ' + e); }
  });
  // retirada: quem levou a peça (funileiro, unidade, montagem) e quando
  var evsRet = [];
  retiradas.forEach(function (x) {
    var it = porId[x.id], quem = vd_semAcento_(String(x.quem || '')).replace(/[^A-Z0-9 \-\/]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24), quando = rc_data_(x.data);
    var marca = quem + ' ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM');
    try { rc_gravarMarcas_(card.id, it, { retirada: marca }, token); } catch (e) { console.log('retirada: ' + e); return; }
    var partes = it.base.split(/\s+-\s+/);
    linhas.push('✋ ' + partes[0] + ' — retirada por ' + quem + ' em ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM'));
    evsRet.push({ peca: partes[0], particular: it.lista === 'PAGAS PARTICULAR', fornecedor: /^PAGAS/.test(it.lista) && partes.length >= 2 ? partes[1] : (/^FORNECIMENTO/.test(it.lista) ? 'SEGURADORA (FO)' : ''), detalhe: 'retirada por ' + quem + ' em ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM/yyyy') + (it.local ? ' · estava em ' + it.local : '') + ' · ' + it.lista });
  });
  // devolução ao fornecedor: peça PAGAS sai do checklist (compra cancelada, precisa de compra nova); peça FO volta a pendente
  var evsDev = [], devPagas = 0;
  devolucoes.forEach(function (x) {
    var it = porId[x.id], motivo = String(x.motivo || '').replace(/\s*\n\s*/g, ' ').trim();
    try {
      try { rc_registrarDevolucao_(card, it, motivo, !/^PAGAS/.test(it.lista), token); } catch (eD) { console.log('devolução/checklist: ' + eD); }   // 21/10/2026: checklist DEVOLUÇÕES
      if (/^PAGAS/.test(it.lista)) { devPagas++; linhas.push(rc_cancelarCompra_(card, it, motivo, 'devolvida', token, me)); delete porId[x.id]; todos = todos.filter(function (i) { return i.id !== it.id; }); }
      else {
        vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'put', payload: { state: 'incomplete' } }, token);
        it.ok = false;
        rc_gravarMarcas_(card.id, it, { local: '', retirada: '', devolvida: Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM') }, token);
        var partesD = it.base.split(/\s+-\s+/);
        linhas.push('↩️ ' + partesD[0] + ' — devolvida (fornecimento da seguradora): ' + motivo + ' · verificar prazo do item');
        evsDev.push({ peca: partesD[0], fornecedor: 'SEGURADORA (FO)', detalhe: 'DEVOLVIDA: ' + motivo + ' · ' + it.lista });
      }
    } catch (e) { console.log('devolução: ' + e); }
  });
  rc_guardarLocais_(locaisNovos);

  // anexos: nome diz a quais peças se referem
  var nAnexos = 0, nomesAnexos = [];
  var anexosCard = anexos.length ? ax_anexos_(card.id, token) : [], placaCard = ax_placa_(card);
  var foLista = []; try { foLista = fo_lista_(); } catch (e) {}
  anexos.forEach(function (a) {
    try {
      var f = vdf_arquivoTemp_(a.fileId);
      var refs = (a.ids || []).map(function (id) { return porId[id] ? String(porId[id].nome).split(/\s+-\s+/)[0] : ''; }).filter(String);
      // fornecedor das peças marcadas (sufixo " - FORNECEDOR" do item), para o nome do anexo
      var forns = [];
      (a.ids || []).forEach(function (id) {
        if (!porId[id]) return;
        var nm = String(porId[id].nome), fo = nm.slice(pv_baseFo_(nm, foLista).length).replace(/^\s+-\s+/, '').split(/\s+[-—]\s+/)[0].trim();
        if (fo && !/\d{4,}/.test(fo) && forns.indexOf(fo) < 0) forns.push(fo);
      });
      var ehNf = /pdf|xml/i.test(f.getMimeType() || '') || /\.(pdf|xml)$/i.test(f.getName());
      // nome padronizado (05/10/2026): "📦 NF 12345 · PLACA · MARAJO · dd/MM" / "📸 · PLACA · recebimento · dd/MM"
      // nota: padrão das rotinas de NF — "NF <EMITENTE> - <nº> - <dd-mm emissão>.pdf" (13/10/2026, Weslley); sem leitura, o antigo
      var nfR = null;
      if (ehNf) {
        try {
          var txtNf = /xml/i.test(f.getMimeType() || '') || /\.xml$/i.test(f.getName()) ? f.getBlob().getDataAsString()
            : (f.getSize() <= 8 * 1024 * 1024 ? vd_ocr_(f.getBlob(), f.getName()) : '');
          nfR = ax_dadosNf_(txtNf);
        } catch (e) { console.log('nota do recebimento: ' + e); }
      }
      var soFoNf = (a.ids || []).length && (a.ids || []).every(function (id) { return porId[id] && /^FORNECIMENTO/.test(porId[id].lista || ''); });
      if (nfR && !nfR.emitente && forns.length) nfR.emitente = ax_emitente20_(forns[0]);
      var nome = ehNf
        ? (nfR ? ax_nomeNfRotina_(nfR, soFoNf, null, /xml/i.test(f.getMimeType() || '') || /\.xml$/i.test(f.getName()) ? '.xml' : '.pdf') : ax_nome_(AX.NF, placaCard, [forns.join(', ') || refs.slice(0, 2).join(', ')]))
        : ax_nome_(AX.FOTO, placaCard, ['recebimento', forns.join(', ') || refs.slice(0, 2).join(', ')]);
      var at = vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: { file: f.getBlob(), name: nome } }, token);
      if (at && at.id) { nome = ax_batizar_(card.id, at.id, nome, anexosCard, token, { semVersao: !ehNf, nomeAtual: nome }); anexosCard.push({ id: at.id, name: nome, date: new Date().toISOString() }); }
      f.setTrashed(true);
      nAnexos++; nomesAnexos.push(nome);
    } catch (e) { console.log('recebimento/anexo: ' + e); }
  });

  var pend = todos.filter(function (i) { return !i.ok; });
  var movido = '';
  // só fecha o card se ele estiver em FALTA CHEGAR (peça da oficina ainda em cotação/compra não fica para trás)
  try { movido = rc_reavaliarColuna_(card.id, token, me.username, { semCompra: devolucoes.length > 0 }); } catch (e) { console.log('recebimento/coluna: ' + e); }
  try {
    var geral = String(p.geral || '').trim();
    var soMarcas = !itens.length && !anexos.length;   // só local/retirada/devolução: título diferente
    var txt = (soMarcas ? '📦 **PEÇAS — local / devolução** — ' : '📦 **RECEBIMENTO** — ') + me.fullName + (movido ? ' → **' + movido + '**' : '') + '\n' + (linhas.length ? linhas.join('\n') : '_(só anexos)_') +
      (nAnexos ? '\n📎 ' + nAnexos + ' anexo(s)' : '') +
      (geral ? '\n📝 ' + geral : '') +
      (pend.length ? '\n⏳ Falta chegar: ' + pend.map(function (i) { return i.base.split(/\s+-\s+/)[0]; }).join(', ') :
        // 19/10/2026 (revisão): compra devolvida saiu do checklist — "tudo recebido" enganava; a peça precisa de compra nova
        (vd_ajustes1910_() && devPagas ? '\n🔁 Falta comprar de novo a peça devolvida.' : (todos.length ? '\n✅ Tudo recebido.' : '')));
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } }, token);
  } catch (e) {}
  try { if (evs.length || nAnexos || itens.length) ev_registrar_('RECEBIMENTO', card, me.username, evs.length ? evs : null, { detalhe: nAnexos ? nAnexos + ' anexo(s)' : '' }); } catch (e) {}
  try { if (evsRet.length) ev_registrar_('RETIRADA', card, me.username, evsRet, { detalhe: evsRet.length + ' peça(s)' }); } catch (e) {}
  try { if (evsDev.length) ev_registrar_('DEVOLUÇÃO FO', card, me.username, evsDev, { detalhe: evsDev.length + ' peça(s)' }); } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: feitos, anexos: nAnexos, faltam: pend.length, locais: locais.length + locaisNovos.length, retiradas: retiradas.length, devolucoes: devolucoes.length, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

/**
 * Coluna certa pelo estado dos checklists PAGAS e FORNECIMENTO (chamado depois de toda escrita neles):
 *  - tudo recebido e card em FALTA CHEGAR                      -> ENCERRADO COMPRAS/FORNEC.
 *  - item pendente e card em ENCERRADO / ENTREGUES              -> FALTA CHEGAR (complemento / FO nova)
 *  - card sem peça da oficina, só FO, ainda em EM COTAÇÃO      -> FALTA CHEGAR (não tem o que cotar)
 * Card em qualquer outra coluna não é mexido (peça ainda em cotação/autorização/compra).
 * Retorna o nome da coluna para onde foi ('' se ficou).
 */
function rc_reavaliarColuna_(cardOuId, token, usuario, opt) {
  var id = typeof cardOuId === 'string' ? cardOuId : cardOuId.id;
  opt = opt || {};
  var card = vd_api_('/cards/' + id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state' } });
  if (vdf_cardProtegido_(card.name)) return '';
  // item FO com o mesmo código de uma peça da oficina: sai do checklist (a oficina venceu) antes de avaliar a coluna (07/10/2026)
  try {
    var foFora = cp_foNaOficina_(card, token, usuario ? '@' + usuario : '');
    if (foFora.length) card = vd_api_('/cards/' + id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state' } });
  } catch (e) { console.log('FO na oficina: ' + e); }
  // 17/10/2026 (teste das cópias): sem a descrição completa (só a vitrine) a análise não vê peça nenhuma e o card ia para
  // ENCERRADO como "sem peça para a oficina comprar". Sem a completa, as regras que leem as peças não valem (próximo ciclo).
  var semCompleta = vd_ehVitrineSemCompleta_(card.desc);
  if (semCompleta) console.log('coluna: ' + card.shortLink + ' sem descrição completa — só a regra dos checklists vale');
  var ctx = vd_contexto_(), lista = vdf_nomeLista_(ctx, card.idList);
  var itens = vdf_itensRecebimento_(card), pend = itens.filter(function (i) { return !i.ok; });
  var alvo = '', soFo = '';
  // compra cancelada / peça devolvida ao fornecedor (10/10/2026): peça autorizada sem item PAGAS -> volta para AUTORIZADO COMPRA
  // (só quando quem chamou acabou de cancelar/devolver — opt.semCompra — para não mexer em card antigo com PAGAS fora do padrão)
  var semCompra = false;
  if (opt.semCompra && !semCompleta && (lista === VDF_LISTA_CHEGAR || lista === RC.LISTA_FIM || lista === 'ENTREGUES') && ctx.listas[VDF_LISTA_AUTORIZADO] && !vd_legado_(card.id)) {
    try {
      var anC = vd_analisar_(card.desc, card.name), autsC = vd_autorizacoesDaDescricao_(card.desc, anC.pecas), pagasC = vdf_itensPagas_(card);
      var naoC = {}; (anC.pecas || []).forEach(function (p) { if (p.naoComprar) naoC[vd_chavePeca_(p)] = 1; });
      semCompra = autsC.some(function (a) { return !naoC[a.chave] && !pagasC.some(function (n) { return vd_casaItem_(n, a.chave); }); });
    } catch (e) { console.log('coluna/sem compra: ' + e); }
  }
  if (semCompra) alvo = VDF_LISTA_AUTORIZADO;
  else if ((lista === VDF_LISTA_CHEGAR || (lista === RC.LISTA_FIM && opt.reavaliar)) && itens.length && !pend.length) {
    if (lista === VDF_LISTA_CHEGAR) alvo = RC.LISTA_FIM;
    // 27/10/2026 (Weslley, ATP5105 — "encerrado mas não está completo, tem coisa sem autorizar"): peça da oficina cotada que
    // ninguém autorizou nem marcou 🚫 não comprar é "sem decisão" — tudo comprado chegou, mas o card NÃO encerra: volta para
    // quem decide (PENDENTE AUTORIZAR / COTAÇÃO FINALIZADA; EM COTAÇÃO se faltar cotação).
    if (!semCompleta && !vd_legado_(card.id)) {
      try {
        var anP = vd_analisar_(card.desc, card.name), autsP = vd_autorizacoesDaDescricao_(card.desc, anP.pecas), pagasP = vdf_itensPagas_(card);
        var semDec = (anP.pecas || []).filter(function (x) {
          var k = vd_chavePeca_(x);
          return k && !x.naoComprar && !autsP.some(function (a) { return a.chave === k; }) && !pagasP.some(function (n) { return vd_casaItem_(n, k); });
        });
        if (semDec.length) {
          var faltamP = [];
          try { faltamP = vdf_coberturaCotacao_(card.desc, semDec).faltam || []; } catch (e) {}
          var soPartP = semDec.every(function (x) { return vdf_pecaParticular_(x, card, anP); });
          alvo = faltamP.length ? VD.LISTA_COTACAO : (soPartP ? VDF_LISTA_FINALIZADA : VDF_LISTA_PENDENTE);
          soFo = 'tudo que foi comprado chegou, mas ' + semDec.length + ' peça(s) ainda sem decisão: ' + semDec.map(vd_nomePeca_).join('; ') +
            ' — ' + (faltamP.length ? 'falta cotação do comprador' : 'autorizar ou marcar 🚫 não comprar pela aba ✅ Autorizar');
        }
      } catch (e) { console.log('coluna/sem decisão: ' + e); }
    }
  }
  else if (lista === VDF_LISTA_AUTORIZADO && !semCompleta) {
    // toda peça autorizada já está no PAGAS (ex.: a não autorizada foi removida do pedido)
    var anA = vd_analisar_(card.desc, card.name), autsA = vd_autorizacoesDaDescricao_(card.desc, anA.pecas);
    var pagas = vdf_itensPagas_(card);
    if (autsA.length && autsA.every(function (a) { return pagas.some(function (n) { return vd_casaItem_(n, a.chave); }); })) alvo = VDF_LISTA_CHEGAR;
  }
  else if ((lista === RC.LISTA_FIM || lista === 'ENTREGUES') && pend.length) alvo = VDF_LISTA_CHEGAR;
  // sem peça da oficina para comprar (só FO, ou tudo marcado 🚫 não comprar) em qualquer coluna antes da compra:
  // não tem o que cotar/autorizar -> FALTA CHEGAR (FO pendente) ou ENCERRADO (nada a receber). 05/10/2026 (QPG1B84)
  if (!alvo && !semCompleta && [VD.LISTA_COTACAO, VD.LISTA_FALTA, VDF_LISTA_FINALIZADA, VDF_LISTA_PENDENTE, VDF_LISTA_AUTORIZADO].indexOf(lista) >= 0 &&
      itens.every(function (i) { return /^FORNECIMENTO/.test(i.lista) || i.ok; }) && !vd_legado_(card.id)) {   // card antigo (sem descrição do formulário) não é mexido; PAGAS já recebido não impede (13/10/2026, BBG3844: tudo 🚫 e compras antigas ✔)
    var an = vd_analisar_(card.desc, card.name);
    if (!an.pecas.length && (itens.length || (an.naoComprar || []).length)) {
      alvo = pend.length ? VDF_LISTA_CHEGAR : RC.LISTA_FIM;
      soFo = 'sem peça para a oficina comprar' + ((an.naoComprar || []).length ? ' (' + an.naoComprar.length + ' marcada(s) 🚫 não comprar)' : '') +
        (pend.length ? ' · ' + pend.length + ' peça(s) da seguradora para chegar' : (itens.length ? ' · fornecimento todo recebido' : ' · nada a receber'));
    }
  }
  // toda peça da oficina JÁ COMPRADA (está no PAGAS) e o resto 🚫 não comprar, mas o card voltou para antes da compra
  // (ex.: orçamento complementar trouxe peça nova que a diretoria marcou não comprar — RAM9I31, 13/10/2026):
  // não tem o que cotar -> FALTA CHEGAR (falta receber) ou ENCERRADO (tudo recebido)
  if (!alvo && !semCompleta && [VD.LISTA_COTACAO, VD.LISTA_FALTA, VDF_LISTA_FINALIZADA, VDF_LISTA_PENDENTE, VDF_LISTA_AUTORIZADO].indexOf(lista) >= 0 &&
      itens.length && !vd_legado_(card.id)) {
    try {
      var anJ = vd_analisar_(card.desc, card.name), pagasJ = vdf_itensPagas_(card);
      if ((anJ.pecas || []).length && pagasJ.length && !(anJ.faltas || []).length &&
          anJ.pecas.every(function (p) { return pagasJ.some(function (n) { return vd_casaItem_(n, vd_chavePeca_(p)); }); })) {
        alvo = pend.length ? VDF_LISTA_CHEGAR : RC.LISTA_FIM;
        soFo = 'toda peça da oficina já comprada' + ((anJ.naoComprar || []).length ? ', ' + anJ.naoComprar.length + ' marcada(s) 🚫 não comprar' : '') +
          (pend.length ? ' · ' + pend.length + ' peça(s) para chegar' : ' · tudo recebido');
      }
    } catch (e) { console.log('coluna/já comprado: ' + e); }
  }
  /* 26/10/2026 (Weslley, AYT6699: "mudei para seguradora e continua em COTAÇÃO FINALIZADA, deveria ir para PENDENTE AUTORIZAR"):
   * quem paga mudou depois da cotação e ninguém autorizou ainda — COTAÇÃO FINALIZADA (só peça particular: o consultor autoriza)
   * ↔ PENDENTE AUTORIZAR (tem peça da seguradora: a diretoria autoriza), a mesma regra do "Enviar cotação". */
  if (!alvo && !semCompleta && (lista === VDF_LISTA_FINALIZADA || lista === VDF_LISTA_PENDENTE) && !vd_legado_(card.id)) {
    try {
      var anT = vd_analisar_(card.desc, card.name);
      if ((anT.pecas || []).length && !vd_autorizacoesDaDescricao_(card.desc, anT.pecas).length && !vdf_coberturaCotacao_(card.desc, anT.pecas).faltam.length) {
        // 27/10/2026 (FOB8723): quem decide = peças que ainda esperam decisão (fora do PAGAS); se não sobrou nenhuma, todas
        var pendT = vdf_pecasAguardandoDecisao_(card, anT, []), baseT = pendT.length ? pendT : anT.pecas;
        var soPartT = baseT.every(function (x) { return vdf_pecaParticular_(x, card, anT); });
        var certaT = soPartT ? VDF_LISTA_FINALIZADA : VDF_LISTA_PENDENTE;
        if (certaT !== lista) { alvo = certaT; soFo = soPartT ? 'pedido particular: quem autoriza é o consultor' : 'tem peça da seguradora: quem autoriza é a diretoria'; }
      }
    } catch (e) { console.log('coluna/quem paga: ' + e); }
  }
  if (!alvo || !ctx.listas[alvo]) return '';
  var movido = vdf_moverPara_(card, ctx, alvo, token, usuario || 'robô');
  if (movido && (lista !== VDF_LISTA_CHEGAR || alvo !== RC.LISTA_FIM)) {   // FALTA CHEGAR → ENCERRADO já tem o "✅ Tudo recebido" do recebimento
    try {
      vd_comentar_(card, '↪️ Card → **' + movido + '** (' + (semCompra ? 'peça autorizada sem compra — verificar compra do item' : soFo || (alvo === VDF_LISTA_CHEGAR ? pend.length + ' peça(s) para chegar' : 'tudo recebido')) + ').');
    } catch (e) {}
  }
  return movido;
}

/* ===================== Devoluções ao fornecedor — checklist DEVOLUÇÕES (21/10/2026, Weslley) =====================
 * Toda peça devolvida (compra da oficina OU fornecimento da seguradora) vira um item no checklist "DEVOLUÇÕES":
 *   "↩️ PEÇA - FORNECEDOR - R$ valor · devolvida dd/MM · aguardando NF"   (data do item = data da devolução)
 * O COMPRADOR confirma a data, informa o nº da NF de devolução e anexa o PDF (vdf_salvarDevolucao): o item fica ✔ e o nome
 * termina em "· NF nº dd/MM". Enquanto houver devolução sem NF, o card NÃO vai para ENTREGUES (segura em ENCERRADO).
 * Prazo: SLA_DIAS_NF_DEVOLUCAO (3 d.u.) depois da devolução → ⏰ para o setor de compras, uma vez por item. */
var RC_DEV = { LISTA: 'DEVOLUÇÕES', RX: /^DEVOLU[ÇC][ÕO]ES/i, AGUARDA: 'aguardando NF' };

function rc_checklistDev_(card, token) {
  var k = (card.checklists || []).filter(function (c) { return RC_DEV.RX.test(String(c.name || '').trim()); })[0];
  if (k) return k;
  k = vd_api_('/cards/' + card.id + '/checklists', { method: 'post', payload: { name: RC_DEV.LISTA, pos: 'bottom' } }, token);
  k.checkItems = []; card.checklists = (card.checklists || []).concat([k]);
  return k;
}
/** Cria o item da devolução. it = item do PAGAS/FORNECIMENTO (nome com marcas), motivo, fo = fornecimento da seguradora. */
function rc_devLigado_() { try { return vd_board_() === VD.BOARD_PADRAO || vd_prop_('RC_DEV_PRINCIPAL', 'SIM') !== 'NAO'; } catch (e) { return false; } }   // 21/10/2026 21h33: ligado no principal com OK do Weslley (desligar: propriedade RC_DEV_PRINCIPAL=NAO)
function rc_registrarDevolucao_(card, it, motivo, fo, token, quando) {
  if (!rc_devLigado_()) return null;
  var k = rc_checklistDev_(card, token);
  var partes = rc_semMarcas_(it.nome).split(/\s+-\s+/), hoje = quando || new Date();
  var nome = '↩️ ' + partes[0] + ' - ' + (fo ? 'SEGURADORA (FO)' : (partes[1] || '?')) + (partes[2] && !fo ? ' - ' + partes[2] : '') +
    ' · devolvida ' + Utilities.formatDate(hoje, 'America/Sao_Paulo', 'dd/MM') + (motivo ? ' (' + String(motivo).replace(/\s*·\s*/g, ' ').slice(0, 60) + ')' : '') + ' · ' + RC_DEV.AGUARDA;
  var due = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 15).toISOString();
  var novo = vd_api_('/checklists/' + k.id + '/checkItems', { method: 'post', payload: { name: nome.slice(0, 16000), due: due, pos: 'bottom' } }, token);
  k.checkItems.push(novo);
  return novo;
}
/** Itens do checklist DEVOLUÇÕES (pendentes = sem NF). */
function rc_devolucoes_(card) {
  var out = [];
  (card.checklists || []).forEach(function (k) {
    if (!RC_DEV.RX.test(String(k.name || '').trim())) return;
    (k.checkItems || []).forEach(function (i) {
      var m = String(i.name || '').match(/\s*·\s*NF\s+(\S+)\s+(\d{1,2}\/\d{1,2})\s*$/i);
      out.push({ id: i.id, nome: i.name, peca: String(i.name || '').replace(/^↩️\s*/, '').split(/\s+-\s+/)[0], ok: i.state === 'complete', due: i.due || '',
        dueIso: i.due ? Utilities.formatDate(new Date(i.due), 'America/Sao_Paulo', 'yyyy-MM-dd') : '', nf: m ? m[1] : '', nfData: m ? m[2] : '' });
    });
  });
  return out;
}
function rc_devolucoesPendentes_(card) { return rc_devolucoes_(card).filter(function (d) { return !d.ok; }); }

/** p = {shortLink, itens:[{id, data:'aaaa-mm-dd', nf, fileIds:[...]}]} — comprador (quem pode receber). */
function vdf_salvarDevolucao(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due', attachments: 'true', attachment_fields: 'name,date' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (!vdf_podeReceber_(me, card)) return { ok: false, faltas: ['Só quem registra recebimento neste card (comprador / diretoria) informa a NF de devolução.'] };
  var devs = rc_devolucoes_(card), porId = {}; devs.forEach(function (d) { porId[d.id] = d; });
  var itens = (p.itens || []).filter(function (x) { return x && porId[x.id]; });
  if (!itens.length) return { ok: false, faltas: ['Nenhuma devolução marcada.'] };
  var faltas = [];
  itens.forEach(function (x) {
    if (!String(x.nf || '').trim()) faltas.push(porId[x.id].peca + ': informe o nº da NF de devolução.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(x.data || ''))) faltas.push(porId[x.id].peca + ': informe a data da devolução.');
  });
  if (faltas.length) return { ok: false, faltas: faltas };
  var placa = vd_analisar_(card.desc, card.name).dados.placa || vd_placaDoTexto_(card.name) || '';
  var linhas = [], nAnexos = 0, evs = [], anexosCard = (card.attachments || []).slice();
  itens.forEach(function (x) {
    var d = porId[x.id], nf = String(x.nf).trim().replace(/\s+/g, ''), dt = x.data.split('-');
    var ddmm = dt[2] + '/' + dt[1], due = new Date(+dt[0], +dt[1] - 1, +dt[2], 15).toISOString();
    var base = String(d.nome).replace(/\s*·\s*aguardando NF\s*$/i, '').replace(/\s*·\s*NF\s+\S+\s+\d{1,2}\/\d{1,2}\s*$/i, '');
    var nomeNovo = base + ' · NF ' + nf + ' ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM');
    try { vd_api_('/cards/' + card.id + '/checkItem/' + d.id, { method: 'put', payload: { name: nomeNovo.slice(0, 16000), state: 'complete', due: due } }, token); } catch (e) { console.log('devolução/item: ' + e); }
    var forn = String(d.nome).replace(/^↩️\s*/, '').split(/\s+-\s+/)[1] || '';
    (x.fileIds || []).forEach(function (fid) {
      try {
        var f = vdf_arquivoTemp_(fid);
        var ext = /\.xml$/i.test(f.getName()) ? '.xml' : (/\.pdf$/i.test(f.getName()) || /pdf/i.test(f.getMimeType() || '') ? '.pdf' : '');
        var nome = '↩️ NF DEVOLUÇÃO ' + nf + AX.SEP + placa + AX.SEP + forn.split(/\s*\(/)[0].trim() + AX.SEP + ddmm + ext;
        var at = vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: { file: f.getBlob(), name: nome } }, token);
        if (at && at.id) { try { nome = ax_batizar_(card.id, at.id, nome, anexosCard, token, { semVersao: false, nomeAtual: nome }); } catch (e) {} anexosCard.push({ id: at.id, name: nome, date: new Date().toISOString() }); }
        f.setTrashed(true); nAnexos++;
      } catch (e) { console.log('devolução/anexo: ' + e); }
    });
    linhas.push('↩️ ' + d.peca + ' (' + forn + ') — devolvida em ' + ddmm + ' · NF ' + nf + ((x.fileIds || []).length ? ' anexada' : ' (sem anexo)'));
    evs.push({ peca: d.peca, fornecedor: forn, detalhe: 'NF DEVOLUÇÃO ' + nf + ' · devolvida ' + ddmm });
  });
  try { ev_registrar_('DEVOLUÇÃO', card, me.username, evs, { detalhe: 'NF de devolução · ' + itens.length + ' peça(s)' }); } catch (e) {}
  // liberou? tudo recebido e retirado e sem devolução pendente -> ENTREGUES (o que a retirada teria feito)
  var movido = '';
  try {
    var c2 = vd_api_('/cards/' + card.id, { query: { fields: 'name,idList', checklists: 'all', checkItem_fields: 'name,state,due' } });
    var lista = vdf_nomeLista_(ctx, c2.idList), todos = vdf_itensRecebimento_(c2);
    if (lista === RC.LISTA_FIM && todos.length && todos.every(function (i) { return i.ok && i.retirada; }) && !rc_devolucoesPendentes_(c2).length && ctx.listas['ENTREGUES']) {
      movido = vdf_moverPara_(card, ctx, 'ENTREGUES', token, me.username);
    }
  } catch (e) { console.log('devolução/coluna: ' + e); }
  try {
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '↩️ **NF DE DEVOLUÇÃO** — ' + me.fullName + (movido ? ' → **' + movido + '**' : '') + '\n' + linhas.join('\n') + (nAnexos ? '\n📎 ' + nAnexos + ' anexo(s)' : '') } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: itens.length, anexos: nAnexos, pendentes: rc_devolucoesPendentes_(card).length - itens.length, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

/** 21/10/2026 (Weslley: "os que ainda não foram entregues dá pra incluir") — diretoria inclui no checklist DEVOLUÇÕES uma devolução
 *  feita antes do controle existir (ou registrada fora do formulário). p = {shortLink, peca, fornecedor, valor, data:'aaaa-mm-dd', motivo, fo} */
/** 27/10/2026 (diretoria): reavalia a coluna de um card pelo caminho oficial (licença das travas) — inclusive card em ENCERRADO
 *  com peça sem decisão (ATP5105). p = {shortLink}. Devolve {movido, lista}. */
function vdf_reavaliarColuna(token, p) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria reavalia a coluna.'] };
  p = vdf_entrada_(p);
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,idList,shortLink,shortUrl' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var movido = '';
  try { movido = rc_reavaliarColuna_(card.id, token, me.username, { reavaliar: true }); } catch (e) { return { ok: false, faltas: ['Não consegui reavaliar: ' + e] }; }
  var ctx = vd_contexto_();
  return { ok: true, url: card.shortUrl, nome: card.name, movido: movido, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}
function vdf_incluirDevolucao(token, p) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria inclui devolução antiga.'] };
  p = vdf_entrada_(p);
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (!String(p.peca || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(p.data || ''))) return { ok: false, faltas: ['Informe a peça e a data da devolução.'] };
  var dt = p.data.split('-'), quando = new Date(+dt[0], +dt[1] - 1, +dt[2], 12);
  var nomeIt = String(p.peca).trim() + (p.fo ? '' : ' - ' + String(p.fornecedor || '?').trim() + (p.valor ? ' - R$ ' + String(p.valor).trim() : ''));
  var ja = rc_devolucoes_(card).some(function (d) { return d.peca === String(p.peca).trim(); });
  if (ja) return { ok: false, faltas: ['Esta peça já está no checklist DEVOLUÇÕES.'] };
  var novo = rc_registrarDevolucao_(card, { nome: nomeIt }, String(p.motivo || '').trim(), !!p.fo, token, quando);
  if (!novo) return { ok: false, faltas: ['Controle de devoluções desligado neste quadro.'] };
  try { ev_registrar_('DEVOLUÇÃO', card, me.username, [{ peca: String(p.peca).trim(), fornecedor: p.fo ? 'SEGURADORA (FO)' : String(p.fornecedor || ''), detalhe: 'incluída no checklist DEVOLUÇÕES (devolvida ' + dt[2] + '/' + dt[1] + ')' }], { detalhe: 'inclusão pela diretoria' }); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, item: novo.name };
}
