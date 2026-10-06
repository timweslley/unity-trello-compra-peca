/* ============================ PREVISÃO E FORNECIMENTO ============================
 * vdf_alterarPrevisao — muda a previsão DEPOIS da autorização ou da compra (justificativa obrigatória):
 *   tipo 'PAGAS' / 'FO' -> data do item do checklist; tipo 'COT' -> prazo (dias úteis) da cotação autorizada.
 *   Antes da autorização a cotação se edita normalmente (aba Cotação, ✏️).
 * vdf_atualizarFornecimento — peças da seguradora (FO): fornecedor, previsão, situação (em cotação / B.O.),
 *   entregue e FO nova que o portal tem e o card não. Usado pela aba 🚚 FORNECIMENTO do formulário e pela
 *   ROTINA UNITY (mesma API do formulário: POST {fn:'vdf_atualizarFornecimento', args:[token, p]}).
 * Tudo grava com licença (trava de checklist não desfaz), comenta curto no card e registra evento.
 */
var PV = { EM_COTACAO: 'EM COTAÇÃO, AINDA SEM PRAZO', BO: 'B.O. NO PORTAL' };

/** 'aaaa-mm-dd' | 'dd/mm[/aaaa]' | ISO -> ISO (meio-dia) ou ''. */
function pv_data_(s) { return s ? vd_dataBR_(String(s).trim()) : ''; }
function pv_mesmoDia_(a, b) { return !!a && !!b && vd_dataCurta_(a) === vd_dataCurta_(b) && new Date(a).getFullYear() === new Date(b).getFullYear(); }
function pv_curto_(nome) { return String(nome || '').split(/\s+[-—]\s+/)[0]; }

/** Item do checklist pelo id (PAGAS* ou FORNECIMENTO*). */
function pv_item_(card, id) {
  var achado = null;
  (card.checklists || []).forEach(function (k) {
    (k.checkItems || []).forEach(function (i) { if (i.id === id) achado = { item: i, lista: String(k.name || '').trim().toUpperCase(), idLista: k.id }; });
  });
  return achado;
}

/** Prazo do card = maior previsão entre os itens ainda não recebidos (PAGAS* e FORNECIMENTO*). */
function pv_dueCard_(cardId, token) {
  try {
    var c = vd_api_('/cards/' + cardId, { query: { fields: 'due', checklists: 'all', checkItem_fields: 'state,due' } });
    var maior = '';
    (c.checklists || []).forEach(function (k) {
      if (!/^(PAGAS|FORNECIMENTO)/i.test(String(k.name || '').trim())) return;
      (k.checkItems || []).forEach(function (i) { if (i.state !== 'complete' && i.due && (!maior || new Date(i.due) > new Date(maior))) maior = i.due; });
    });
    if (maior && !pv_mesmoDia_(maior, c.due)) vd_api_('/cards/' + cardId, { method: 'put', payload: { due: maior } }, token);
  } catch (e) { console.log('prazo do card: ' + e); }
}

/**
 * p = {shortLink, itens:[{tipo:'PAGAS'|'FO', id, previsao, motivo} | {tipo:'COT', chave, dias, motivo}]}
 */
function vdf_alterarPrevisao(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) altera previsão — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var an = vd_analisar_(card.desc, card.name);
  var porChave = {}; an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var auts = vd_autorizacoesDaDescricao_(card.desc, an.pecas), lidas = vd_cotacoesDaDescricao_(card.desc, an.pecas).cotacoes;
  var faltas = [], mudar = [], cots = [], linhas = [], evs = [];
  (p.itens || []).forEach(function (x) {
    var motivo = String(x.motivo || '').replace(/\s*\n\s*/g, ' ').trim();
    if (x.tipo === 'COT') {
      var peca = porChave[x.chave], a = auts.filter(function (q) { return q.chave === x.chave; })[0];
      if (!peca) return faltas.push('peça não encontrada no pedido');
      var nome = vd_nomePeca_(peca);
      if (!a) return faltas.push(nome + ': ainda não autorizada — altere a cotação normalmente pela aba Cotação.');
      var q = lidas.filter(function (c) { return c.chave === x.chave && c.fornecedor === a.fornecedor && Math.abs(c.valor - a.valor) < 0.005; }).pop();
      var dias = String(x.dias == null ? '' : x.dias).trim();
      if (!/^\d+$/.test(dias)) return faltas.push(nome + ': prazo em dias úteis (número).');
      if (!motivo) return faltas.push(nome + ': escreva o motivo da mudança de prazo.');
      cots.push({ peca: peca, a: a, q: q || {}, dias: dias, motivo: motivo });
      linhas.push('- ' + nome + ' (' + a.fornecedor + '): ' + (q && q.dias !== '' && q.dias != null ? q.dias + ' → ' : '') + dias + ' d.u. — ' + motivo);
      var e = ev_peca_(peca); e.fornecedor = a.fornecedor; e.valor = a.valor; e.dias = dias; e.detalhe = 'PRAZO AUTORIZADO ALTERADO: ' + motivo; evs.push(e);
      return;
    }
    var it = pv_item_(card, x.id);
    if (!it) return faltas.push('item do checklist não encontrado (atualize a página)');
    var nova = pv_data_(x.previsao), velha = it.item.due || '';
    if (!nova) return faltas.push(pv_curto_(it.item.name) + ': data inválida.');
    if (pv_mesmoDia_(nova, velha)) return;
    if (velha && !motivo) return faltas.push(pv_curto_(it.item.name) + ': escreva o motivo da mudança de previsão.');
    mudar.push({ it: it, nova: nova });
    linhas.push('- ' + pv_curto_(it.item.name) + ': ' + (velha ? vd_dataCurta_(velha) : 'sem previsão') + ' → **' + vd_dataCurta_(nova) + '**' + (motivo ? ' — ' + motivo : ''));
    evs.push({ peca: pv_curto_(it.item.name), previsao: nova, detalhe: 'PREVISÃO ' + (velha ? vd_dataCurta_(velha) + ' → ' : '') + vd_dataCurta_(nova) + ' (' + it.lista + ')' + (motivo ? ': ' + motivo : '') });
  });
  if (faltas.length) return { ok: false, faltas: faltas };
  if (!mudar.length && !cots.length) return { ok: false, faltas: ['Nenhuma previsão mudou.'] };

  mudar.forEach(function (m) { vd_api_('/cards/' + card.id + '/checkItem/' + m.it.item.id, { method: 'put', payload: { due: m.nova } }, token); });
  if (cots.length) {
    var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
    var L = ['**COTAÇÃO ' + agora + ' - ' + me.fullName + '**'];
    cots.forEach(function (c) {
      var nomeP = c.peca.pneu ? 'PNEU ' + String(c.peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(c.peca);
      var tm = [c.q.tipo, c.q.marca].filter(String).join(' ');
      L.push('REMOVIDA: ' + c.a.fornecedor + ' - ' + nomeP + ' - ' + vd_valorBR_(c.a.valor));
      L.push('**' + c.a.fornecedor + '**');
      L.push(nomeP + (tm ? ' - ' + tm : '') + ' - ' + vd_valorBR_(c.a.valor) + ' - ' + c.dias + (c.dias === '1' ? ' dia útil' : ' dias úteis'));
      L.push('OBS ' + nomeP + ': (prazo alterado) ' + c.motivo);
    });
    var div = vd_dividir_(card.desc);
    vd_backup_(card, 'prazo autorizado alterado por ' + me.username);
    vd_gravarDesc_(card.id, div.bloco.replace(/\s+$/, '') + '\n\n' + (div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR) + '\n\n' + L.join('\n'), token);
  } else {
    try { vd_redesenhar_(card.id, token); } catch (e) {}
  }
  pv_dueCard_(card.id, token);
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '📅 **PREVISÃO ALTERADA** — ' + me.fullName + '\n' + linhas.join('\n') } }, token); } catch (e) {}
  try { ev_registrar_('PREVISÃO', card, me.username, evs); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: mudar.length + cots.length };
}

/* ---------- fornecimento (FO) ---------- */

/** "CÓDIGO DESCRIÇÃO" de um item do FORNECIMENTO (tira fornecedor e situação do fim). */
function pv_baseFo_(nome, lista) {
  var b = String(nome || '').replace(/\s+[-—]\s+(EM COTA[ÇC][ÃA]O.*|B\.?O\.?\b.*)$/i, '').trim();
  b = b.replace(/^(\d{5,})(?=[A-Z])/i, '$1 ');   // código grudado na descrição (OCR do Cilia, 05/10/2026: "100260230EMBLEMA ...")
  var m = b.match(/^(.*\S)\s+-\s+([^-]+)$/);
  if (m) {
    var ult = m[2].trim();
    var conhecido = /^(SEGURADORA|FO)\b/i.test(ult) || !fo_resolver_(ult, lista).novo || VD_SEGURADORAS.some(function (sg) { return sg[0] === vd_semAcento_(ult); });
    if (conhecido && !/\d{4,}/.test(ult)) b = m[1];
  }
  return b;
}

/** Acha o item FO pelo id, pelo código ou pela descrição. */
function pv_achaFo_(itensFo, x) {
  if (x.id) { var porId = itensFo.filter(function (i) { return i.id === x.id; })[0]; if (porId) return porId; }
  var cod = cp_norm_(x.codigo), desc = cp_norm_(x.descricao);
  if (cod.length >= 4) { var pc = itensFo.filter(function (i) { return cp_norm_(i.name).indexOf(cod) >= 0; })[0]; if (pc) return pc; }
  if (desc.length >= 4) return itensFo.filter(function (i) { return cp_norm_(i.name).indexOf(desc) >= 0; })[0] || null;
  return null;
}

/**
 * p = {shortLink, origem:'rotina'|'formulário',
 *      itens:[{id | codigo | descricao, fornecedor, previsao, situacao:''|'EM COTAÇÃO'|'BO', entregue:true, motivo}],
 *      novos:[{codigo, descricao, fornecedor, previsao, situacao, entregue}]}
 * Previsão que já existia e muda: precisa de motivo (rotina sem motivo = "portal da seguradora").
 */
function vdf_atualizarFornecimento(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) atualiza o fornecimento — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  // "rotina" (motivo automático = portal da seguradora) só vale para a diretoria, que é quem roda a ROTINA UNITY
  var rotina = /rotina/i.test(String(p.origem || '')) && vdf_ehAutorizador_(me);
  var foLista = []; try { foLista = fo_lista_(); } catch (e) {}
  var itensFo = [];
  (card.checklists || []).forEach(function (k) { if (/FORNECIMENTO/i.test(k.name || '')) (k.checkItems || []).forEach(function (i) { i._lista = String(k.name).trim().toUpperCase(); itensFo.push(i); }); });
  var faltas = [], ops = [], linhas = [], evs = [], forns = [];
  var nomeNovo = function (base, x) {
    var forn = x.fornecedor ? fo_resolver_(x.fornecedor, foLista).nome : '';
    if (forn) forns.push(forn);
    var sit = vd_semAcento_(x.situacao || '');
    return base + (forn ? ' - ' + forn : '') + (/^EM COTA/.test(sit) ? ' - ' + PV.EM_COTACAO : (/^B\.?O/.test(sit) ? ' — ' + PV.BO + ' (' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM') + ')' : ''));
  };
  (p.itens || []).forEach(function (x) {
    var it = pv_achaFo_(itensFo, x);
    if (!it) return faltas.push('FO não encontrada no card: ' + (x.codigo || x.descricao || x.id || '?') + ' (use "novos" para incluir)');
    var base = pv_baseFo_(it.name, foLista), baseOrig = base, mud = {}, txt = [];
    var querNome = x.fornecedor !== undefined || x.situacao !== undefined;
    // o documento novo trouxe outro código (e/ou descrição) para a mesma peça: atualiza no item, sem duplicar (05/10/2026)
    if (x.codigoNovo) {
      var codNovo = String(x.codigoNovo).replace(/\s+/g, '').toUpperCase();
      var descBase = base.replace(/^[A-Z0-9][A-Z0-9.\-\/]{3,}\s+/i, '');
      base = codNovo + ' ' + (x.descNova ? String(x.descNova).toUpperCase() : descBase);
      querNome = true; txt.push('código → ' + codNovo);
    }
    if (querNome) {
      var antigoForn = (String(it.name).slice(baseOrig.length).match(/^\s+-\s+([^-—]+?)(?:\s+[-—]|$)/) || [])[1] || '';
      var nm = nomeNovo(base, { fornecedor: x.fornecedor !== undefined ? x.fornecedor : antigoForn, situacao: x.situacao });
      if (nm !== it.name) { mud.name = nm; txt.push(nm.slice(base.length).replace(/^\s+[-—]\s+/, '') || 'sem fornecedor'); }
    }
    if (x.previsao) {
      var nova = pv_data_(x.previsao), velha = it.due || '';
      if (!nova) return faltas.push(pv_curto_(it.name) + ': data inválida');
      if (!pv_mesmoDia_(nova, velha)) {
        var motivo = String(x.motivo || '').trim() || (rotina ? 'portal da seguradora' : '');
        if (velha && !motivo) return faltas.push(pv_curto_(it.name) + ': escreva o motivo da mudança de previsão');
        mud.due = nova;
        txt.push('prev. ' + (velha ? vd_dataCurta_(velha) + ' → ' : '') + '**' + vd_dataCurta_(nova) + '**' + (velha && motivo ? ' (' + motivo + ')' : ''));
      }
    }
    if (x.entregue && it.state !== 'complete') { mud.state = 'complete'; txt.push('✔ entregue'); }
    if (!Object.keys(mud).length) return;
    ops.push({ it: it, mud: mud });
    linhas.push('- ' + pv_curto_(base) + ': ' + txt.join(' · '));
    evs.push({ peca: base, fornecedor: mud.name ? (mud.name.slice(base.length).match(/^\s+-\s+([^-—]+)/) || [])[1] || '' : '', previsao: mud.due || it.due || '', detalhe: (it._lista + ': ' + txt.join(' · ')).replace(/\*\*/g, '') });
  });
  var novos = (p.novos || []).filter(function (x) { return x && (x.codigo || x.descricao); });
  var jaTem = itensFo.map(function (i) { return cp_norm_(i.name); });
  novos = novos.filter(function (x) { var k = cp_norm_(x.codigo) || cp_norm_(x.descricao); return k && !jaTem.some(function (n) { return n.indexOf(k) >= 0; }); });
  if (faltas.length) return { ok: false, faltas: faltas };
  if (!ops.length && !novos.length && !(p.fileIds || []).length) return { ok: true, nada: true, url: card.shortUrl, nome: card.name, n: 0 };

  ops.forEach(function (o) { vd_api_('/cards/' + card.id + '/checkItem/' + o.it.id, { method: 'put', payload: o.mud }, token); });
  if (novos.length) {
    var cl = (card.checklists || []).filter(function (k) { return /FORNECIMENTO/i.test(k.name || '') && !/COMPLEMENTO/i.test(k.name || ''); })[0];
    if (!cl) cl = vd_api_('/checklists', { method: 'post', payload: { idCard: card.id, name: 'FORNECIMENTO', pos: 'bottom' } }, token);
    novos.forEach(function (x) {
      var base = ((String(x.codigo || '').replace(/\s+/g, '').toUpperCase() + ' ').trim() + ' ' + String(x.descricao || '').trim().toUpperCase()).trim();
      var corpo = { name: nomeNovo(base, x), pos: 'bottom' };
      var d = pv_data_(x.previsao); if (d) corpo.due = d;
      if (x.entregue) corpo.checked = 'true';
      vd_api_('/checklists/' + cl.id + '/checkItems', { method: 'post', payload: corpo }, token);
      linhas.push('- ➕ ' + corpo.name + (d ? ' · prev. ' + vd_dataCurta_(d) : '') + (x.entregue ? ' · ✔' : ''));
      evs.push({ peca: base, previsao: d, detalhe: 'FO NOVA (portal)' });
    });
  }
  (p.fileIds || []).forEach(function (fid) {
    try { var f = vdf_arquivoTemp_(fid); vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: { file: f.getBlob(), name: '🚚 FO — ' + f.getName() } }, token); f.setTrashed(true); } catch (e) {}
  });
  pv_dueCard_(card.id, token);
  try { fo_registrarUso_(forns, me.username); } catch (e) {}
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🚚 **FORNECIMENTO** — ' + me.fullName + (rotina ? ' (rotina)' : '') + '\n' + linhas.join('\n') } }, token); } catch (e) {}
  try { ev_registrar_('FORNECIMENTO', card, me.username, evs.map(function (e) { e.fornecedor = e.fornecedor || 'SEGURADORA (FO)'; return e; })); } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  var movidoF = '';
  try { movidoF = rc_reavaliarColuna_(card.id, token, me.username); } catch (e) { console.log('fornecimento/coluna: ' + e); }   // FO entregue fecha; FO nova reabre
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: ops.length + novos.length, lista: movidoF || undefined };
}


/* ---------- leitura de documento de fornecimento (print/PDF do portal ou orçamento com fornecedor e prazo) ---------- */

/** Datas dd/mm/aaaa (ou dd/mm/aa) num texto -> [Date]. */
function pv_datas_(t) {
  var out = [], m, re = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g;
  while ((m = re.exec(t))) {
    var a = +m[3]; if (a < 100) a += 2000;
    var d = new Date(a, +m[2] - 1, +m[1], 12);
    if (!isNaN(d.getTime()) && a >= 2020 && a <= 2035) out.push(d);
  }
  return out;
}

/** Fornecedor numa janela de texto: "FORNECEDOR: X" ou nome/apelido do cadastro. */
function pv_fornecedor_(janela, lista) {
  var U = vd_semAcento_(janela);
  var m = U.match(/FORNECEDOR\s*[:\-]?\s*([A-Z0-9][A-Z0-9 .&\/\-]{2,40}?)(?=\s{2,}|\s+\d{1,2}\/\d|\s+PREV|\s+DATA|\s+R\$|$)/);
  if (m && !/^(DA|DO|NAO|N\/A|-)$/.test(m[1].trim())) return fo_resolver_(m[1].trim(), lista).nome;
  var melhor = '';
  (lista || []).forEach(function (f) {
    [f.nome].concat(f.apelidos || []).forEach(function (n) {
      var k = vd_semAcento_(n).trim();
      if (k.length < 3 || k.length <= melhor.length) return;
      if (new RegExp('(^|[^A-Z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Z0-9]|$)').test(U)) melhor = f.nome;
    });
  });
  if (melhor) return melhor;
  // tabela "STATUS DE ENTREGA" do Soma/Porto (05/10/2026): "... 25/09/2026 02/10/2026 ACCIOLY PR (43)33728810" —
  // o nome vem logo depois da última data (e antes do telefone); fornecedor novo entra no cadastro
  var mt = U.match(/\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\s+([A-Z][A-Z .&\/\-]{2,40}?)\s*(?=\(\d{2}\)|\d{2}\s?\d{4,}|\s{2,}|$)/);
  if (mt && /[A-Z]{3}/.test(mt[1]) && !/^(PREV|DATA|ENTREGA|PEDIDO|PRAZO|FORNECEDOR|TOTAL)\b/.test(mt[1].trim())) {
    try { return fo_resolver_(mt[1].trim(), lista).nome || mt[1].trim(); } catch (e) { return mt[1].trim(); }
  }
  return '';
}

/** Nome do fornecedor como a equipe escreve: com "/" fica só o que vem depois (antes é mediadora: INPART, PRISMATEC,
 *  PLANETUN…); depois, o 1º trecho antes de " - " (MARAJO - FIAT - PR -> MARAJO; DUNA FIAT -> DUNA se o cadastro conhecer). */
function pv_fornecedorCurto_(txt, lista) {
  var t = vd_semAcento_(txt).replace(/\s+/g, ' ').trim();
  if (t.indexOf('/') >= 0) t = t.split('/').pop().trim();
  var seg = t.split(/\s+-\s+/)[0].trim().replace(/[^A-Z0-9 .&]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!seg) return '';
  var r = fo_resolver_(seg, lista);
  if (!r.novo) return r.nome;
  var semMarca = seg.replace(/\s+(FIAT|VW|VOLKSWAGEN|GM|CHEVROLET|FORD|JEEP|RENAULT|HYUNDAI|TOYOTA|HONDA|NISSAN|PEUGEOT|CITROEN|BYD|MITSUBISHI|KIA|PR|SC|RS|SP|MG)$/, '');
  if (semMarca !== seg) { var r2 = fo_resolver_(semMarca, lista); if (!r2.novo) return r2.nome; }
  return r.nome;
}

/**
 * "Status do Pedido" do Cilia (05/10/2026, RHV1E04): uma peça por bloco —
 *   CÓDIGO   PEÇA   QTD   <2ª linha do fornecedor>   PREVISÃO (dd/mm/aa)
 * com a 1ª linha do fornecedor ("MEDIADORA - PRISMATEC /") logo ACIMA da linha da peça. Devolve {codigo: {fornecedor, previsao}}.
 */
function pv_lerStatusCilia_(texto, lista) {
  var U = vd_semAcento_(String(texto || '').replace(/\r/g, ''));
  if (!/STATUS DAS PECAS|PREVISAO DE ENTREGA/.test(U)) return null;
  var linhas = U.split('\n'), out = {}, re = /^\s*(\d{5,})\s+(.+?)\s+(\d{1,3})\s+(.*?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s*$/;   // colunas com 1+ espaços (o OCR do Drive pode juntar)
  var cab = /^(CODIGO|PECA|QTD|FORNECEDOR|PREVISAO|STATUS|EM COTACAO|AGUARDANDO|ENTREGUE|ULTIMA|RASTREAM|\d{1,2}\/\d{1,2}\/\d{2}\s*-)/;
  for (var i = 0; i < linhas.length; i++) {
    var m = linhas[i].match(re);
    if (!m) continue;
    var forn = m[4].trim(), acima = '';
    for (var j = i - 1; j >= Math.max(0, i - 2); j--) {
      var l = linhas[j].trim();
      if (!l) continue;
      if (/[A-Z]{3}/.test(l) && !cab.test(l) && !/\d{5,}/.test(l)) { acima = l; }
      break;
    }
    if (acima) forn = (acima + ' ' + forn).replace(/\s+/g, ' ').trim();
    var d = pv_datas_(m[5]);
    out[cp_norm_(m[1])] = { codigo: m[1], descricao: m[2].trim(), fornecedor: forn ? pv_fornecedorCurto_(forn, lista) : '', previsao: d.length ? d[0].toISOString() : '', linha: linhas[i].trim().slice(0, 120) };
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Procura no texto as peças alvo (por código) e, perto de cada uma, fornecedor e previsão.
 * alvos = [{codigo, descricao, ...}] -> [{alvo, fornecedor, previsao(ISO), linha}]
 */
function pv_lerFornecimento_(texto, alvos, lista) {
  var linhas = String(texto || '').replace(/\r/g, '').split('\n');
  var norm = linhas.map(cp_norm_);
  lista = lista || (function () { try { return fo_lista_(); } catch (e) { return []; } })();
  // layout "Status do Pedido" do Cilia: fornecedor em duas linhas e data na linha da peça — leitor próprio
  var cilia = null; try { cilia = pv_lerStatusCilia_(texto, lista); } catch (e) { console.log('status cilia: ' + e); }
  if (cilia) {
    var outC = [], usadasC = {}, semCodigo = [];
    (alvos || []).forEach(function (a) {
      var k = cp_norm_(a.codigo || a.codigoOrc); if (k.length < 5) { semCodigo.push(a); return; }
      var kd = (k.match(/^\d{5,}/) || [k])[0];   // código grudado na descrição ("100260230EMBLEMA"): só os dígitos
      var r = cilia[k] || cilia[kd];
      if (r) { usadasC[cilia[k] ? k : kd] = 1; outC.push({ alvo: a, fornecedor: r.fornecedor, previsao: r.previsao, linha: r.linha }); }
      else semCodigo.push(a);
    });
    // peça do card cujo código não está no documento: mesma peça pela descrição = código mudou -> devolve o código novo
    semCodigo.forEach(function (a) {
      var melhor = '', nota = 0;
      Object.keys(cilia).forEach(function (kk) {
        if (usadasC[kk]) return;
        var sim = cp_similar_(a.descricao || a.nome, cilia[kk].descricao);
        if (sim > nota) { nota = sim; melhor = kk; }
      });
      if (!melhor) return;
      usadasC[melhor] = 1;
      var r = cilia[melhor];
      outC.push({ alvo: a, fornecedor: r.fornecedor, previsao: r.previsao, linha: r.linha, codigoNovo: r.codigo, descNova: r.descricao });
    });
    if (outC.length) return outC;
  }
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  var out = [];
  var recente = function (t) { return pv_datas_(t).filter(function (d) { return d >= new Date(hoje.getTime() - 60 * 864e5); }); };
  (alvos || []).forEach(function (a) {
    var k = cp_norm_(a.codigo || a.codigoOrc);
    if (k.length < 5) return;
    // o código pode aparecer mais de uma vez (Soma: na lista de FO e de novo na tabela STATUS DE ENTREGA, que é a
    // que tem fornecedor e prazo): olha todas as ocorrências e fica com a que tem data; senão a que tem fornecedor
    var achado = null;
    for (var i = 0; i < norm.length; i++) {
      if (norm[i].indexOf(k) < 0) continue;
      // a própria linha; se faltar data ou fornecedor, as seguintes (OCR quebra colunas: até 12 linhas) até aparecer outra peça
      var janela = linhas[i];
      for (var j = i + 1; j < Math.min(i + 13, linhas.length); j++) {
        if (/\b(?=[A-Z0-9]*\d{5,})[A-Z0-9]{6,}\b/.test(vd_semAcento_(linhas[j]))) break;
        janela += '  ' + linhas[j];
      }
      var ds = recente(linhas[i]); if (!ds.length) ds = recente(janela);
      var prev = ds.length ? new Date(Math.max.apply(null, ds)) : null;
      var forn = pv_fornecedor_(linhas[i], lista) || pv_fornecedor_(janela, lista);
      var cand = { alvo: a, fornecedor: forn, previsao: prev ? prev.toISOString() : '', linha: linhas[i].trim().slice(0, 120) };
      if (!achado || (!achado.previsao && cand.previsao) || (!achado.previsao && !achado.fornecedor && cand.fornecedor)) achado = cand;
      if (achado.previsao && achado.fornecedor) break;
    }
    if (achado) out.push(achado);
  });
  return out;
}

/** Orçamento com fornecedor/prazo das FO (ex.: grupo Porto): completa fornecedor e previsão em cada FO. */
function pv_enriquecerFo_(texto, fo) {
  if (!fo || !fo.length) return 0;
  var n = 0;
  pv_lerFornecimento_(texto, fo).forEach(function (r) {
    if (r.fornecedor) { r.alvo.fornecedor = r.fornecedor; n++; }
    if (r.previsao) r.alvo.previsao = r.previsao;
  });
  return n;
}

/**
 * Aba 🚚 FORNECIMENTO: lê um print/PDF do fornecimento e devolve o que preencher.
 * {achados:[{id, nome, fornecedor, previsao}], faltando:[nome], extras:[nome], orcamento:bool, fileId}
 */
function vdf_lerFornecimento(token, shortLink, base64, mime, nome) {
  var me = vdf_usuario_(token);
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc', checklists: 'all', checkItem_fields: 'name,state,due' } });
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, nome);
  var arq = vdf_pastaTemp_().createFile(blob);
  var texto;
  try { texto = vd_ocr_(blob, nome); } catch (e) { return { fileId: arq.getId(), erro: 'Não consegui ler o arquivo (' + String(e.message || e).slice(0, 80) + ').' }; }
  var out = pv_lerFornecimentoTexto_(card, texto);
  out.fileId = arq.getId();
  return out;
}

/** Aba 🚚 FORNECIMENTO: lê um anexo que JÁ está no card (05/10/2026, Weslley: "já está anexo, não se exige nova importação").
 *  Mesmo retorno de vdf_lerFornecimento, com anexoId no lugar de fileId (nada é anexado de novo). */
function vdf_lerFornecimentoAnexo(token, shortLink, idAnexo) {
  vdf_usuario_(token);
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard', checklists: 'all', checkItem_fields: 'name,state,due', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url' } });
  var a = (card.attachments || []).filter(function (x) { return x.id === idAnexo; })[0];
  if (!a) throw new Error('Esse anexo não está mais no card.');
  if (!vd_anexoLegivel_(a)) throw new Error('Esse anexo não dá para ler (só PDF ou foto até 15 MB).');
  var resp = qt_fetch_(a.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
  if (resp.getResponseCode() >= 300) throw new Error('O Trello não entregou o arquivo "' + a.name + '". Tente de novo.');
  var texto;
  try { texto = vd_ocr_(resp.getBlob(), a.name); } catch (e) { return { anexoId: a.id, erro: 'Não consegui ler "' + a.name + '" (' + String(e.message || e).slice(0, 80) + ').' }; }
  var out = pv_lerFornecimentoTexto_(card, texto);
  out.anexoId = a.id;
  return out;
}

/** Núcleo: texto do documento × itens FO do card -> {achados, faltando, extras, orcamento, lidos}. */
function pv_lerFornecimentoTexto_(card, texto) {
  var itensFo = [];
  (card.checklists || []).forEach(function (k) { if (/FORNECIMENTO/i.test(k.name || '')) (k.checkItems || []).forEach(function (i) { itensFo.push(i); }); });
  var foLista = []; try { foLista = fo_lista_(); } catch (e) {}
  var alvos = itensFo.map(function (i) { var b = pv_baseFo_(i.name, foLista); var m = b.match(/^([A-Z0-9][A-Z0-9.\-\/]{3,})\s+(.+)$/i); return { id: i.id, nome: b, codigo: m && /\d/.test(m[1]) ? m[1] : '', descricao: m ? m[2] : b }; });
  var achados = pv_lerFornecimento_(texto, alvos, foLista);
  var achIds = achados.map(function (r) { return r.alvo.id; });
  var faltando = alvos.filter(function (a) { return a.codigo && achIds.indexOf(a.id) < 0; }).map(function (a) { return a.nome; });
  // peças a mais no documento: se for orçamento, pela lista dele; se for print do portal, códigos com data na mesma linha
  var orc = vd_lerOrcamento_(texto), extras = [];
  var conhecidas = alvos.map(function (a) { return cp_norm_(a.codigo); }).concat(vd_analisar_(card.desc, card.name).pecas.map(function (p) { return cp_norm_(p.codigo); })).filter(function (k) { return k.length >= 4; });
  var ja = function (k) { return conhecidas.some(function (c) { return c === k || c.indexOf(k) >= 0 || k.indexOf(c) >= 0; }); };
  if (orc.origem) {
    orc.fo.forEach(function (p) { var k = cp_norm_(p.codigo); if (k.length >= 4 && !ja(k)) extras.push(cp_nome_(p)); });
  } else {
    String(texto).split('\n').forEach(function (l) {
      if (!pv_datas_(l).length) return;
      var toks = vd_semAcento_(l).match(/\b(?=[A-Z0-9]*\d{5,})[A-Z0-9]{6,15}\b/g) || [];
      toks.forEach(function (t) {
        if (/^\d{11,}$/.test(t) || ja(t) || cp_norm_(card.desc).indexOf(t) >= 0) return;   // CNPJ/telefone/sinistro/chassi
        var nm = (t + ' ' + l.slice(l.toUpperCase().indexOf(t) + t.length).replace(/\d{1,2}\/\d{1,2}\/\d{2,4}.*/, '').trim()).slice(0, 60).trim();
        if (extras.indexOf(nm) < 0) extras.push(nm);
      });
    });
  }
  return {
    orcamento: !!orc.origem, lidos: achados.length,
    achados: achados.map(function (r) { return { id: r.alvo.id, nome: r.alvo.nome, fornecedor: r.fornecedor, previsao: r.previsao ? Utilities.formatDate(new Date(r.previsao), 'America/Sao_Paulo', 'yyyy-MM-dd') : '', codigoNovo: r.codigoNovo || '', descNova: r.descNova || '' }; }),
    faltando: faltando, extras: extras.slice(0, 20)
  };
}
