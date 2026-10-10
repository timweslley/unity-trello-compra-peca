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
var RC_RE_MARCA = /\s*·\s*(📍|✋|↩️)\s*([^·]*?)\s*(?=\s*·\s*(?:📍|✋|↩️)|$)/g;
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
  var l = rc_locais_();
  novos.forEach(function (x) { if (x && l.indexOf(x) < 0) l.push(x); });
  l.sort();
  try { PropertiesService.getScriptProperties().setProperty('RC_LOCAIS', JSON.stringify(l.slice(-RC.LOCAIS_MAX))); } catch (e) {}
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
  return (modo === 'devolvida' ? '↩️ ' : '❌ ') + partes[0] + (partes[1] ? ' (' + partes[1] + ')' : '') + ' — ' + (modo === 'devolvida' ? 'devolvida ao fornecedor' : 'compra cancelada') + (motivo ? ': ' + motivo : '') + ' · verificar compra do item';
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
  if (!vdf_podeReceber_(me, card)) return { ok: false, faltas: ['Em Toledo, o recebimento é registrado pelo setor de compras (ou pela diretoria) — sua conta: ' + me.username + '.'] };
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
  itens.forEach(function (x) {
    var it = porId[x.id], quando = rc_data_(x.data), obs = String(x.obs || '').replace(/\s*\n\s*/g, ' ').trim(), local = rc_normLocal_(x.local);
    if (!it.ok) {
      vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'put', payload: { state: 'complete' } }, token);
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
  var evsDev = [];
  devolucoes.forEach(function (x) {
    var it = porId[x.id], motivo = String(x.motivo || '').replace(/\s*\n\s*/g, ' ').trim();
    try {
      if (/^PAGAS/.test(it.lista)) { linhas.push(rc_cancelarCompra_(card, it, motivo, 'devolvida', token, me)); delete porId[x.id]; todos = todos.filter(function (i) { return i.id !== it.id; }); }
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
      var nome = ehNf
        ? ax_nome_(AX.NF + (function () { var n = ax_numeroNf_(f); return n ? ' ' + n : ''; })(), placaCard, [forns.join(', ') || refs.slice(0, 2).join(', ')])
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
    var txt = (soMarcas ? '📦 **PEÇAS — local / retirada / devolução** — ' : '📦 **RECEBIMENTO** — ') + me.fullName + (movido ? ' → **' + movido + '**' : '') + '\n' + (linhas.length ? linhas.join('\n') : '_(só anexos)_') +
      (nAnexos ? '\n📎 ' + nAnexos + ' anexo(s)' : '') +
      (geral ? '\n📝 ' + geral : '') +
      (pend.length ? '\n⏳ Falta chegar: ' + pend.map(function (i) { return i.base.split(/\s+-\s+/)[0]; }).join(', ') : (todos.length ? '\n✅ Tudo recebido.' : ''));
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
  var ctx = vd_contexto_(), lista = vdf_nomeLista_(ctx, card.idList);
  var itens = vdf_itensRecebimento_(card), pend = itens.filter(function (i) { return !i.ok; });
  var alvo = '';
  // compra cancelada / peça devolvida ao fornecedor (10/10/2026): peça autorizada sem item PAGAS -> volta para AUTORIZADO COMPRA
  // (só quando quem chamou acabou de cancelar/devolver — opt.semCompra — para não mexer em card antigo com PAGAS fora do padrão)
  var semCompra = false;
  if (opt.semCompra && lista === VDF_LISTA_CHEGAR && ctx.listas[VDF_LISTA_AUTORIZADO] && !vd_legado_(card.id)) {
    try {
      var anC = vd_analisar_(card.desc, card.name), autsC = vd_autorizacoesDaDescricao_(card.desc, anC.pecas), pagasC = vdf_itensPagas_(card);
      var naoC = {}; (anC.pecas || []).forEach(function (p) { if (p.naoComprar) naoC[vd_chavePeca_(p)] = 1; });
      semCompra = autsC.some(function (a) { return !naoC[a.chave] && !pagasC.some(function (n) { return vd_casaItem_(n, a.chave); }); });
    } catch (e) { console.log('coluna/sem compra: ' + e); }
  }
  if (semCompra) alvo = VDF_LISTA_AUTORIZADO;
  else if (lista === VDF_LISTA_CHEGAR && itens.length && !pend.length) alvo = RC.LISTA_FIM;
  else if (lista === VDF_LISTA_AUTORIZADO) {
    // toda peça autorizada já está no PAGAS (ex.: a não autorizada foi removida do pedido)
    var anA = vd_analisar_(card.desc, card.name), autsA = vd_autorizacoesDaDescricao_(card.desc, anA.pecas);
    var pagas = vdf_itensPagas_(card);
    if (autsA.length && autsA.every(function (a) { return pagas.some(function (n) { return vd_casaItem_(n, a.chave); }); })) alvo = VDF_LISTA_CHEGAR;
  }
  else if ((lista === RC.LISTA_FIM || lista === 'ENTREGUES') && pend.length) alvo = VDF_LISTA_CHEGAR;
  // sem peça da oficina para comprar (só FO, ou tudo marcado 🚫 não comprar) em qualquer coluna antes da compra:
  // não tem o que cotar/autorizar -> FALTA CHEGAR (FO pendente) ou ENCERRADO (nada a receber). 05/10/2026 (QPG1B84)
  var soFo = '';
  if (!alvo && [VD.LISTA_COTACAO, VD.LISTA_FALTA, VDF_LISTA_FINALIZADA, VDF_LISTA_PENDENTE, VDF_LISTA_AUTORIZADO].indexOf(lista) >= 0 &&
      itens.every(function (i) { return /^FORNECIMENTO/.test(i.lista); }) && !vd_legado_(card.id)) {   // card antigo (sem descrição do formulário) não é mexido
    var an = vd_analisar_(card.desc, card.name);
    if (!an.pecas.length && (itens.length || (an.naoComprar || []).length)) {
      alvo = pend.length ? VDF_LISTA_CHEGAR : RC.LISTA_FIM;
      soFo = 'sem peça para a oficina comprar' + ((an.naoComprar || []).length ? ' (' + an.naoComprar.length + ' marcada(s) 🚫 não comprar)' : '') +
        (pend.length ? ' · ' + pend.length + ' peça(s) da seguradora para chegar' : (itens.length ? ' · fornecimento todo recebido' : ' · nada a receber'));
    }
  }
  if (!alvo || !ctx.listas[alvo]) return '';
  var movido = vdf_moverPara_(card, ctx, alvo, token, usuario || 'robô');
  if (movido && lista !== VDF_LISTA_CHEGAR) {
    try {
      vd_comentar_(card, '↪️ Card → **' + movido + '** (' + (soFo || (alvo === VDF_LISTA_CHEGAR ? pend.length + ' peça(s) para chegar' : 'tudo recebido')) + ').');
    } catch (e) {}
  }
  return movido;
}
