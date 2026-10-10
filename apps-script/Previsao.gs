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
    var c = vd_api_('/cards/' + cardId, { query: { fields: 'due,dueComplete', checklists: 'all', checkItem_fields: 'state,due' } });
    var maior = '';
    (c.checklists || []).forEach(function (k) {
      if (!/^(PAGAS|FORNECIMENTO)/i.test(String(k.name || '').trim())) return;
      (k.checkItems || []).forEach(function (i) { if (i.state !== 'complete' && i.due && (!maior || new Date(i.due) > new Date(maior))) maior = i.due; });
    });
    if (maior && (!pv_mesmoDia_(maior, c.due) || c.dueComplete)) vd_api_('/cards/' + cardId, { method: 'put', payload: { due: maior, dueComplete: false } }, token);
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
  var b = rc_semMarcas_(nome).replace(/\s+[-—]\s+(EM COTA[ÇC][ÃA]O.*|B\.?O\.?\b.*)$/i, '').trim();   // sem 📍/✋ (10/10/2026)
  b = b.replace(/^(\d{5,})(?=[A-Z])/i, '$1 ');   // código grudado na descrição (OCR do Cilia, 05/10/2026: "100260230EMBLEMA ...")
  // sufixo " - FORNECEDOR": testa do pedaço mais comprido para o mais curto, porque o fornecedor lido do
  // portal pode ter " - " e "/" dentro ("MEDIADORA - PRISMATEC / DUNA FIAT", 05/10/2026)
  var partes = b.split(/\s+-\s+/);
  for (var k = 1; k < partes.length; k++) {
    var suf = partes.slice(k).join(' - ').trim();
    if (/\d{4,}/.test(suf)) continue;
    var conhecido = /^(SEGURADORA|FO|MEDIADORA)\b/i.test(suf) || !fo_resolver_(suf, lista).novo
      || VD_SEGURADORAS.some(function (sg) { return sg[0] === vd_semAcento_(suf); })
      || (function () { var c = pv_fornecedorCurto_(suf, lista); return !!c && !fo_resolver_(c, lista).novo; })();
    if (conhecido) { b = partes.slice(0, k).join(' - ').trim(); break; }
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
  var faltas = [], ops = [], linhas = [], evs = [], forns = [], avisos = [];
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
      var marcasIt = rc_marcas_(it.name);   // 📍 local / ✋ retirada no fim do nome ficam (10/10/2026)
      var antigoForn = (marcasIt.base.slice(baseOrig.length).match(/^\s+-\s+([^-—]+?)(?:\s+[-—]|$)/) || [])[1] || '';
      var nm = rc_comMarcas_(nomeNovo(base, { fornecedor: x.fornecedor !== undefined ? x.fornecedor : antigoForn, situacao: x.situacao }), marcasIt);
      if (nm !== it.name) { mud.name = nm; txt.push(rc_semMarcas_(nm).slice(base.length).replace(/^\s+[-—]\s+/, '') || 'sem fornecedor'); }
    }
    if (x.previsao) {
      var nova = pv_data_(x.previsao), velha = it.due || '';
      if (!nova) return faltas.push(pv_curto_(it.name) + ': data inválida');
      if (it.state === 'complete' && velha) {
        // peça já recebida com data: a previsão fica como está (fornecedor/código ainda atualizam) — 06/10/2026
        if (!pv_mesmoDia_(nova, velha)) avisos.push(pv_curto_(it.name) + ': já recebida — previsão ' + vd_dataCurta_(velha) + ' mantida (o documento traz ' + vd_dataCurta_(nova) + ')');
      } else if (!pv_mesmoDia_(nova, velha)) {
        var motivo = String(x.motivo || '').trim() || (rotina ? 'portal da seguradora' : '');
        var adiou = !!velha && pv_diaNum_(nova) > pv_diaNum_(velha);   // só previsão que fica para DEPOIS pede motivo
        if (adiou && !motivo) return faltas.push(pv_curto_(it.name) + ': a previsão ficou para depois (' + vd_dataCurta_(velha) + ' → ' + vd_dataCurta_(nova) + ') — escreva o motivo');
        mud.due = nova;
        txt.push('prev. ' + (velha ? vd_dataCurta_(velha) + ' → ' : '') + '**' + vd_dataCurta_(nova) + '**' + (velha && motivo ? ' (' + motivo + ')' : ''));
      }
    }
    if (x.entregue && it.state !== 'complete') { mud.state = 'complete'; txt.push('✔ entregue'); }
    // B.O. / em cotação = sem previsão: a data sai do item (revisão 07/10/2026 — ficava "atrasada" para sempre)
    if (x.situacao !== undefined && /^(B\.?O|EM COTA)/.test(vd_semAcento_(x.situacao || '')) && it.due && !mud.due && it.state !== 'complete') { mud.due = null; txt.push('sem previsão'); }
    if (!Object.keys(mud).length) return;
    ops.push({ it: it, mud: mud });
    linhas.push('- ' + pv_curto_(base) + ': ' + txt.join(' · '));
    evs.push({ peca: base, fornecedor: mud.name ? (mud.name.slice(base.length).match(/^\s+-\s+([^-—]+)/) || [])[1] || '' : '', previsao: mud.due || it.due || '', detalhe: (it._lista + ': ' + txt.join(' · ')).replace(/\*\*/g, '') });
  });
  var novos = (p.novos || []).filter(function (x) { return x && (x.codigo || x.descricao); });
  var jaTem = itensFo.map(function (i) { return cp_norm_(i.name); });
  novos = novos.filter(function (x) { var k = cp_norm_(x.codigo) || cp_norm_(x.descricao); return k && !jaTem.some(function (n) { return n.indexOf(k) >= 0; }); });
  if (faltas.length) return { ok: false, faltas: faltas };
  if (!ops.length && !novos.length && !(p.fileIds || []).length) return { ok: true, nada: true, url: card.shortUrl, nome: card.name, n: 0, avisos: avisos };

  ops.forEach(function (o) {
    var mud = o.mud;
    if (mud.due === null) {   // tirar a data: o Trello aceita null (JSON); se recusar, tenta vazio — e nunca derruba o resto
      var resto = {}; Object.keys(mud).forEach(function (k) { if (k !== 'due') resto[k] = mud[k]; });
      if (Object.keys(resto).length) vd_api_('/cards/' + card.id + '/checkItem/' + o.it.id, { method: 'put', payload: resto }, token);
      try { vd_api_('/cards/' + card.id + '/checkItem/' + o.it.id, { method: 'put', payload: { due: null } }, token); }
      catch (e) { try { vd_api_('/cards/' + card.id + '/checkItem/' + o.it.id, { method: 'put', payload: { due: '' } }, token); } catch (e2) { console.log('tirar previsão: ' + e2); } }
      return;
    }
    vd_api_('/cards/' + card.id + '/checkItem/' + o.it.id, { method: 'put', payload: mud }, token);
  });
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
  var anexosCard = (p.fileIds || []).length ? ax_anexos_(card.id, token) : [];
  (p.fileIds || []).forEach(function (fid) {
    try {
      var f = vdf_arquivoTemp_(fid);
      var at = vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: { file: f.getBlob(), name: '🚚 FO — ' + f.getName() } }, token);
      // nome padronizado "🚚 FO · PLACA · Status do Pedido Cilia · dd/MM" (v2, v3… quando entra outro) — 05/10/2026
      if (at && at.id) {
        var nm = f.getName(), doc = /status/i.test(nm) ? 'Status do Pedido Cilia' : /hdi/i.test(nm) ? 'Peças HDI' : /soma/i.test(nm) ? 'Websoma' : '';
        at.name = ax_batizar_(card.id, at.id, ax_nome_(AX.FO, ax_placa_(card), [doc]), anexosCard, token);
        anexosCard.push({ id: at.id, name: at.name, date: new Date().toISOString() });
      }
      f.setTrashed(true);
    } catch (e) { console.log('anexo FO: ' + e); }
  });
  pv_dueCard_(card.id, token);
  try { fo_registrarUso_(forns, me.username); } catch (e) {}
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🚚 **FORNECIMENTO** — ' + me.fullName + (rotina ? ' (rotina)' : '') + '\n' + linhas.join('\n') } }, token); } catch (e) {}
  try { ev_registrar_('FORNECIMENTO', card, me.username, evs.map(function (e) { e.fornecedor = e.fornecedor || 'SEGURADORA (FO)'; return e; })); } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  var movidoF = '';
  try { movidoF = rc_reavaliarColuna_(card.id, token, me.username); } catch (e) { console.log('fornecimento/coluna: ' + e); }   // FO entregue fecha; FO nova reabre
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: ops.length + novos.length, lista: movidoF || undefined, avisos: avisos };
}

/** Dia como número aaaammdd (fuso de São Paulo), para saber se uma previsão ficou para antes ou para depois. */
function pv_diaNum_(d) { try { return +Utilities.formatDate(new Date(d), 'America/Sao_Paulo', 'yyyyMMdd'); } catch (e) { return 0; } }


/* ---------- leitura de documento de fornecimento (print/PDF do portal ou orçamento com fornecedor e prazo) ---------- */

/** Datas dd/mm/aaaa (ou dd/mm/aa) num texto -> [Date]. */
function pv_datas_(t, semHora) {
  var out = [], m, re = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b(\s*-?\s*\d{1,2}:\d{2})?/g;
  while ((m = re.exec(t))) {
    if (semHora && m[4]) continue;   // "23/09/26 - 08:35:21" é carimbo de status, não previsão
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
  if (m && !/^(DA|DO|NAO|N\/A|-)$/.test(m[1].trim()) && !/^(EM COTACAO|AGUARDANDO|ENTREG|PREVIS|CANCELAD)/.test(m[1].trim())) return fo_resolver_(m[1].trim(), lista).nome;
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
 * "Status do Pedido" do Cilia — leitor por tokens (06/10/2026, AUP2482), porque o texto chega de três jeitos:
 *   a) colunas numa linha:  CÓDIGO  PEÇA  QTD  FORNECEDOR  PREVISÃO     (PDF com texto, OCR que preserva colunas)
 *   b) linhas soltas em blocos a partir de "CÓDIGO" (OCR do Google, RHV1E04)
 *   c) linhas soltas com os fornecedores TODOS depois das peças (PDF cortado à direita, AUP2482)
 * Regras: código = 6–20 letras/dígitos com 4+ dígitos (VW: 5U1857508N9B9); fornecedor = linha "MEDIADORA / FORNECEDOR" ou a
 * que vem logo depois de "FORNECEDOR" (nunca EM COTAÇÃO / AGUARDANDO… — isso é status); previsão = data SEM hora (as datas
 * com " - hh:mm" são carimbos de status). Quando o bloco da peça não traz fornecedor/previsão, casa pela ordem (n peças = n
 * fornecedores) ou, se o documento só tem um fornecedor, usa ele. Devolve {codigo: {codigo, descricao, fornecedor, previsao, entregue}}.
 */
function pv_lerStatusCilia_(texto, lista) {
  var U = vd_semAcento_(String(texto || '').replace(/\r/g, ''));
  if (!/STATUS DAS PECAS|PREVISAO DE ENTREGA|STATUS DO PEDIDO/.test(U)) return null;
  var linhas = U.split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(String);
  var STATUS = /^(EM COTACAO|AGUARDANDO (APROVACAO|ENTREGA)|ENTREG|CANCELAD|RECUSAD)/;
  var LABEL = /^(CODIGO|PECA|QTD|FORNECEDOR|PREVIS|STATUS|ULTIMA|RASTREAM|PARECER|SEGURADORA|SINISTRO|ORCAMENTO|OFICINA|CIDADE|E)$|^\d{1,2}\/\d{1,2}\/\d{2,4}\s*-\s*\d/;
  var ehCodigo = function (t) { return /^[A-Z0-9]{6,20}$/.test(t) && (t.match(/\d/g) || []).length >= 4 && !/^\d{11,}$/.test(t) && !/^\d{1,2}\/\d/.test(t); };
  var ehData = function (t) { return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t); };
  var limpaForn = function (t) { return t.replace(/PREVISAO DE ENTREGA.*$/, '').replace(/\s+\d{1,2}\/\d{1,2}\/\d{2,4}.*$/, '').trim(); };
  var ehForn = function (t) {
    if (!/[A-Z]{3}/.test(t) || STATUS.test(t) || LABEL.test(t) || ehCodigo(t.replace(/\s/g, ''))) return false;
    if (/HTTPS?:|WWW\.|\.COM\b|\.BR\b|^PREVISAO|:/.test(t)) return false;   // link do portal, rótulo, parecer ("CONTATO COM FORNECEDOR: …")
    var t2 = t.replace(/PREVISAO DE ENTREGA.*$/, '').trim();
    if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t2) || t2.split(' ').filter(function (w) { return /[A-Z0-9]/.test(w); }).length > 8 || t2.split(' ').some(function (w) { return ehCodigo(w.replace(/[,.;]/g, '')); })) return false;   // texto de parecer
    return t2.indexOf('/') >= 0 && /[A-Z]{2}.*\/.*[A-Z]{2}/.test(t2);
  };
  var pecas = [], forns = [], prevs = [], entregas = [];   // cada um: {i (linha), ...}
  var reCol = /^([A-Z0-9]{6,20}) (.+?) (\d{1,3}) ([A-Z][A-Z0-9 .&\/\-]*?)(?: (\d{1,2}\/\d{1,2}\/\d{2,4}))?$/;
  for (var i = 0; i < linhas.length; i++) {
    var l = linhas[i];
    // a) linha em colunas
    var mc = l.match(reCol);
    if (mc && ehCodigo(mc[1]) && !STATUS.test(mc[4]) && !LABEL.test(mc[4])) {
      var forn = mc[4].trim(), acima = linhas[i - 1] || '';
      // "MEDIADORA - PRISMATEC / DUNA" na linha de cima e "FIAT ..." na linha da peça (layout em colunas do Cilia)
      if (acima.indexOf('/') >= 0 && /[A-Z]{3}/.test(acima) && !STATUS.test(acima) && !LABEL.test(acima) && !ehCodigo(acima.split(' ')[0]) && !/HTTPS?:|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(acima)) forn = (acima + ' ' + forn).replace(/\s+/g, ' ');
      pecas.push({ i: i, codigo: mc[1], descricao: mc[2].trim(), forn: forn, prev: mc[5] || '' });
      continue;
    }
    // b/c) tokens soltos
    if (ehCodigo(l)) {
      var desc = '';
      for (var k = i + 1; k < Math.min(i + 6, linhas.length); k++) {
        var c = linhas[k].replace(/\s*QTD$/, '').trim();
        if (!c || LABEL.test(c) || STATUS.test(c) || ehCodigo(c) || ehData(c) || /^\d{1,3}$/.test(c) || ehForn(c) || /^PREVISAO|HTTPS?:/.test(c)) continue;
        if (/[A-Z]{3}/.test(c)) { desc = c; break; }
      }
      pecas.push({ i: i, codigo: l, descricao: desc, forn: '', prev: '' });
      continue;
    }
    var mq = l.match(/^(.+?)\s*QTD$/);   // "FAROL DIREITOQTD" (Google) — descrição antes do código no bloco
    if (mq && /[A-Z]{3}/.test(mq[1]) && !ehCodigo(mq[1])) { pecas.push({ i: i, codigo: '', descricao: mq[1].trim(), forn: '', prev: '', semCodigo: true }); continue; }
    if (ehForn(l)) {
      var md = l.match(/PREVISAO DE ENTREGA\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      forns.push({ i: i, nome: limpaForn(l) });
      if (md) prevs.push({ i: i, data: md[1] });
      continue;
    }
    if (/^FORNECEDOR$/.test(l)) {   // nome na linha seguinte (quando não tem "/")
      var prox = linhas[i + 1] || '';
      if (/[A-Z]{3}/.test(prox) && !STATUS.test(prox) && !LABEL.test(prox) && !ehCodigo(prox) && !ehForn(prox)) forns.push({ i: i, nome: limpaForn(prox) });
      continue;
    }
    var mp = l.match(/^PREVISAO DE ENTREGA\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/); if (mp) { prevs.push({ i: i, data: mp[1] }); continue; }
    if (ehData(l)) { prevs.push({ i: i, data: l }); continue; }
    var me = l.match(/^ENTREG(?:UE)?(?: EM)?\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)?/) || (/^\d{1,2}\/\d{1,2}\/?$/.test(l) && /^ENTREG/i.test(linhas[i - 1] || '') ? [l, l] : null);
    if (me) { entregas.push({ i: i, data: me[1] || '' }); continue; }
  }
  // bloco "descrição + QTD" sem código na mesma linha (Google): o código é o próximo token de código
  pecas = pecas.filter(function (p, k) {
    if (!p.semCodigo) return true;
    var prox = pecas[k + 1];
    if (prox && !prox.semCodigo && prox.i - p.i <= 6) { prox.descricao = p.descricao; return false; }   // a descrição "…QTD" vale mais que o palpite
    return false;
  });
  if (!pecas.length) return null;
  // valor dominante (o documento costuma ter um fornecedor só; a linha de parecer que escapou não muda a maioria)
  var comum = function (arr, campo) { var s = {}, melhor = '', n = 0; arr.forEach(function (x) { s[x[campo]] = (s[x[campo]] || 0) + 1; if (s[x[campo]] > n) { n = s[x[campo]]; melhor = x[campo]; } }); return n >= 2 && n >= arr.length * 0.6 ? melhor : (arr.length === 1 ? melhor : ''); };
  var fornUnico = comum(forns, 'nome'), prevUnica = comum(prevs, 'data');
  var out = {};
  pecas.forEach(function (p, k) {
    var ini = p.i, fim = k + 1 < pecas.length ? pecas[k + 1].i : linhas.length;
    var noBloco = function (arr) { return arr.filter(function (x) { return x.i > ini && x.i < fim; })[0] || null; };
    var forn = p.forn || (noBloco(forns) || {}).nome || (forns.length === pecas.length ? forns[k].nome : fornUnico) || '';
    var prev = p.prev || (noBloco(prevs) || {}).data || (prevs.length === pecas.length ? prevs[k].data : prevUnica) || '';
    var ent = noBloco(entregas) || (entregas.length === pecas.length ? entregas[k] : null);
    var d = prev ? pv_datas_(prev) : [];
    var dEnt = ent && ent.data ? pv_datas_(/\/\d{2,4}$/.test(ent.data) ? ent.data : ent.data.replace(/\/?$/, '/' + new Date().getFullYear())) : [];
    out[cp_norm_(p.codigo)] = {
      codigo: p.codigo, descricao: p.descricao, fornecedor: forn ? pv_fornecedorCurto_(forn, lista) : '',
      previsao: d.length ? d[0].toISOString() : '', entregue: !!ent, entregueEm: dEnt.length ? dEnt[0].toISOString() : '',
      linha: (p.codigo + ' ' + p.descricao).slice(0, 120)
    };
  });
  return out;
}

/**
 * PARECERES do "Status do Pedido" do Cilia (07/10/2026, ATX2884): a tabela de peças pode ficar parada (previsão 28/09)
 * enquanto a mediadora registra nos pareceres "prazo alterado para 12/10 pelo motivo Atraso de fábrica" ou "Novo Prazo:
 * 12/10". Lê cada parecer (cabeçalho "Fluxo: N | Criado por: … | Data de Criação: dd/mm/aaaa - hh:mm:ss") e extrai o que
 * muda o fornecimento. Frases conhecidas:
 *   - "O prazo de entrega do(s) item(ns) A; B foi alterado para 12/10/2026 pelo motivo Atraso de fábrica."
 *   - "O prazo … foi alterado para sem previsão pelo motivo B.O."
 *   - "Peças: 123 - A, 456 - B - … Novo Prazo: 12/10 - Motivo do atraso: … -"   (Novo Prazo: sem previsão)
 *   - "Registrado B.O para o(s) item(ns): 123 - A - Laudo: Obsoleto"
 *   - "Os Itens A,B em processo de fornecimento com previsão de entrega para o dia 28/09/2026."
 * Devolve [{quando (Date), itens:[texto], prazo (ISO)|'', semPrevisao, bo, motivo, resumo}] do mais novo para o mais velho,
 * ou [] quando não há pareceres. Texto livre fora dessas frases é ignorado (não vira regra).
 */
function pv_lerPareceresCilia_(texto) {
  var U = vd_semAcento_(String(texto || '').replace(/\r/g, ''));
  var reCab = /FLUXO:\s*\d+\s*\|.*?DATA DE CRIACAO:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/g;
  var cabs = [], m;
  while ((m = reCab.exec(U))) cabs.push({ i: m.index, fim: m.index + m[0].length, quando: new Date(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 12, m[5] ? +m[5] : 0) });
  if (!cabs.length) return [];
  var out = [];
  // "123 - FAROL ESQUERDO; 456 - GRADE" -> [{codigo:'123', descricao:'FAROL ESQUERDO'}, …] (código pode faltar)
  var itensDe = function (s) {
    return String(s || '').split(/[;,]/).map(function (x) {
      var mi = x.replace(/\s+/g, ' ').trim().match(/^(?:([A-Z0-9]{5,20})\s*-\s*)?(.+)$/);
      return mi ? { codigo: cp_norm_(mi[1] || ''), descricao: mi[2].trim() } : null;
    }).filter(function (x) { return x && /[A-Z]{3}/.test(x.descricao) && x.descricao.length <= 60 && !/CILIA|^\d|:/.test(x.descricao); });
  };
  var bonito = function (s) { s = String(s || '').replace(/\s*-\s*$/, '').trim().toLowerCase(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; };
  var dataDe = function (s, quando) {   // "12/10/2026" ou "12/10" (ano = do parecer; se cair antes dele, ano seguinte)
    var md = String(s || '').match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/); if (!md) return null;
    var a = md[3] ? +md[3] : quando.getFullYear(); if (a < 100) a += 2000;
    var d = new Date(a, +md[2] - 1, +md[1], 12);
    if (!md[3] && d.getTime() < quando.getTime() - 30 * 864e5) d = new Date(a + 1, +md[2] - 1, +md[1], 12);
    return isNaN(d.getTime()) ? null : d;
  };
  cabs.forEach(function (c, k) {
    var corpo = U.slice(c.fim, k + 1 < cabs.length ? cabs[k + 1].i : U.length).replace(/\s+/g, ' ')
      .replace(/HTTPS?:\/\/\S+/g, ' ').replace(/\s\d{1,2}\/\d{1,2}\s+\d{2}\/\d{2}\/\d{4},\s*\d{2}:\d{2}\s+CILIA - STATUS DO PEDIDO/g, ' ')   // link e rodapé de página do PDF
      .replace(/\s+/g, ' ').trim();
    var p = { quando: c.quando, itens: [], prazo: '', semPrevisao: false, bo: false, motivo: '', resumo: corpo.replace(/^QUERY_BUILDER\s*/, '').slice(0, 160) };
    var mAlt = corpo.match(/DO\(?S?\)? ITE[MN]\(?N?S?\)?\s*:?\s*(.+?)\s+FOI ALTERAD[OA] PARA\s+(SEM PREVISAO|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?:\s+PELO MOTIVO\s+(.+?))?\s*\.?\s*$/);
    var mNovo = corpo.match(/NOVO PRAZO\s*:\s*(SEM PREVISAO|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
    var mBo = corpo.match(/REGISTRADO B\.?O\.? PARA O\(?S?\)? ITE[MN]\(?N?S?\)?\s*:?\s*(.+?)(?:\s*-\s*LAUDO\s*:\s*(.+?))?\s*\.?\s*$/);
    var mPrev = corpo.match(/OS ITENS\s+(.+?)\s+EM PROCESSO DE FORNECIMENTO COM PREVISAO DE ENTREGA PARA O DIA\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (mAlt) {
      p.itens = itensDe(mAlt[1]);
      if (/SEM PREVISAO/.test(mAlt[2])) p.semPrevisao = true; else { var d1 = dataDe(mAlt[2], c.quando); if (d1) p.prazo = d1.toISOString(); }
      p.motivo = bonito((mAlt[3] || '').slice(0, 80));
      if (/^B\.?O\.?$/i.test(p.motivo)) { p.bo = true; p.motivo = 'B.O.'; }
    } else if (mNovo) {
      var mPecas = corpo.match(/PECAS\s*:?\s*(.+?)\s*-?\s*CONTATO COM (?:O )?FORNECEDOR/);
      p.itens = itensDe(mPecas ? mPecas[1] : '');
      if (/SEM PREVISAO/.test(mNovo[1])) p.semPrevisao = true; else { var d2 = dataDe(mNovo[1], c.quando); if (d2) p.prazo = d2.toISOString(); }
      var mMot = corpo.match(/MOTIVO DO ATRASO\s*:\s*(.+?)\s*-?\s*(?:ACAO|SITUACAO|NUMERO|CONTATO|NOVO PRAZO)\b/) || corpo.match(/MOTIVO DO ATRASO\s*:\s*(.+?)\s*-\s*/);
      p.motivo = bonito(mMot ? mMot[1].slice(0, 80) : '');
      if (p.semPrevisao && /OBSOLET|DESCONTINUAD|\bEM B\.?O\b|COTACAO B\.?O/.test(corpo)) { p.bo = true; p.motivo = p.motivo || (/OBSOLET|DESCONTINUAD/.test(corpo) ? 'Peça obsoleta' : 'B.O.'); }
    } else if (mBo) {
      p.itens = itensDe(mBo[1].replace(/,?\s*(AUTOMATICA|DEVIDO).*$/, '')); p.bo = true; p.semPrevisao = true; p.motivo = 'B.O.' + (mBo[2] ? ' — laudo: ' + bonito(mBo[2].slice(0, 60)) : '');
    } else if (mPrev) {
      p.itens = itensDe(mPrev[1]); var d3 = dataDe(mPrev[2], c.quando); if (d3) p.prazo = d3.toISOString();
      p.motivo = '';
    } else return;   // parecer sem prazo (contato, NF, etc.): não muda nada
    if (p.itens.length) out.push(p);
  });
  out.sort(function (a, b) { return b.quando - a.quando; });
  return out;
}

/** "Última Atualização (17/09/26 - 15:22:11)" da tabela do Cilia — para saber se o parecer é mais novo que a tabela. */
function pv_ultimaAtualizacaoCilia_(texto) {
  var m = vd_semAcento_(String(texto || '')).match(/ULTIMA ATUALIZACAO\s*\(?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  var a = +m[3]; if (a < 100) a += 2000;
  var d = new Date(a, +m[2] - 1, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Aplica aos achados do Cilia o parecer mais novo de cada peça (quando é mais novo que a tabela): previsão passa a ser
 * a do parecer, com o motivo; "sem previsão"/B.O. vira situação BO. Peça já entregue não muda.
 */
function pv_aplicarPareceres_(achados, texto, alvos) {
  var pareceres = pv_lerPareceresCilia_(texto);
  if (!pareceres.length) return 0;
  var tabela = pv_ultimaAtualizacaoCilia_(texto), n = 0;
  var acha = function (cod, desc, soNovos) {
    for (var i = 0; i < pareceres.length; i++) {
      var p = pareceres[i];
      if (soNovos && tabela && p.quando <= tabela) return null;   // dali para trás a tabela já reflete (ou é mais nova que) o parecer
      var bate = p.itens.some(function (it) { return (cod.length >= 5 && it.codigo && (it.codigo === cod || it.codigo.indexOf(cod) >= 0 || cod.indexOf(it.codigo) >= 0)) || cp_similar_(desc, it.descricao) > 0; });
      if (bate) return p;
    }
    return null;
  };
  var aplica = function (r, par) {
    var quando = Utilities.formatDate(par.quando, 'America/Sao_Paulo', 'dd/MM');
    if (par.semPrevisao) {
      r.situacao = 'BO'; r.motivo = (par.motivo || 'sem previsão') + ' (parecer Cilia de ' + quando + ')';
    } else if (par.prazo && !(r.previsao && pv_mesmoDia_(par.prazo, r.previsao))) {
      // sem a data da tabela não dá para saber quem é mais novo: só aceita o parecer que ADIA (é o que a mediadora registra)
      if (!tabela && r.previsao && pv_diaNum_(par.prazo) < pv_diaNum_(r.previsao)) return false;
      r.previsaoTabela = r.previsao; r.previsao = par.prazo;
      r.motivo = (par.motivo || 'prazo alterado no parecer') + ' (parecer Cilia de ' + quando + ')';
    } else return false;
    r.parecer = par.resumo; n++;
    return true;
  };
  achados.forEach(function (r) {
    if (r.entregue) return;
    var a = r.alvo || {};
    var par = acha(cp_norm_(r.codigoNovo || a.codigo || a.codigoOrc), r.descNova || a.descricao || a.nome || '', true);
    if (par) aplica(r, par);
  });
  // peça do card que SUMIU da tabela (B.O./obsoleta): o parecer é a única pista — entra só com a situação
  var lidos = achados.map(function (r) { return r.alvo && r.alvo.id; });
  (alvos || []).forEach(function (a) {
    if (lidos.indexOf(a.id) >= 0) return;
    var par = acha(cp_norm_(a.codigo || a.codigoOrc), a.descricao || a.nome || '', false);
    if (par && par.semPrevisao) { var r = { alvo: a, fornecedor: '', previsao: '', linha: par.resumo.slice(0, 120), soParecer: true }; if (aplica(r, par)) achados.push(r); }
  });
  return n;
}

/**
 * Procura no texto as peças alvo (por código) e, perto de cada uma, fornecedor e previsão.
 * alvos = [{codigo, descricao, ...}] -> [{alvo, fornecedor, previsao(ISO), linha}]
 */
/**
 * "Peças do sinistro" do portal HDI (07/10/2026, BXZ4J84): tabela sem código de peça —
 *   PEÇA | Prev.Entrega | Entrega | Fornecedor | Tel. | E-mail   (e "Fornecido pela Oficina" nas peças da oficina)
 * O texto chega em linha (PDF com texto/OCR que preserva colunas) ou em colunas (uma célula por linha: descrições,
 * depois as datas soltas, depois os fornecedores na mesma ordem). Devolve [{descricao, previsao, entregueEm, entregue,
 * fornecedor, oficina, linha}] ou null quando não é esse documento.
 */
function pv_lerHdiPecas_(texto, lista) {
  var U = vd_semAcento_(texto);
  if (!/PE[CG]AS DO (SINISTRO|LAUDO)/.test(U)) return null;   // OCR lê "Peças" como "Pegas"
  var linhas = String(texto || '').replace(/\r/g, '').split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(String);
  var ini = -1, fim = linhas.length;
  linhas.forEach(function (l, i) {
    var u = vd_semAcento_(l);
    if (ini < 0 && /PE[CG]AS DO (LAUDO|SINISTRO)/.test(u)) ini = i;
    if (ini >= 0 && i > ini && /^FECHAR$/.test(u) && fim === linhas.length) fim = i;
  });
  var reTel = /\(\d{2}\)\s*\d{4,5}-?\d{4}/, reMail = /\S+@\S+\.\S+/, reData = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
  var cab = /^(PECA|PECAS|PREV\.?\s*ENTREGA|ENTREGA|FORNECEDOR|TEL\.?|E-?MAIL|PE[CG]AS DO LAUDO.*|PE[CG]AS DO SINISTRO|OLA .*|SAIR|FECHAR|INTRANET|HDI SEGUROS?)$|PREV\.?\s*ENTREGA.*FORNECEDOR/;
  var pecas = [], fornecedores = [], datasSoltas = [], entregasSoltas = [], colunaAtual = '', linhaUltimaPeca = -1;
  var fornDe = function (t) { t = t.replace(reMail, '').replace(reTel, '').replace(/\s+/g, ' ').trim(); return t ? pv_fornecedorCurto_(t, lista) || t : ''; };
  // vários fornecedores numa linha só (OCR do print junta a coluna: "CAR HOUSE (49)… mail CAR HOUSE (49)… mail"): um por contato
  var fornsDe = function (t) {
    var sep = reMail.test(t) ? new RegExp(reMail.source, 'g') : (reTel.test(t) ? new RegExp(reTel.source, 'g') : null);
    var partes = sep ? t.split(sep) : [t];
    if (sep) partes = partes.slice(0, -1);   // o último pedaço é o que sobra depois do último contato
    var out = partes.map(fornDe).filter(String);
    return out.length ? out : [fornDe(t)].filter(String);
  };
  for (var i = ini + 1; i < fim; i++) {
    // ícones de ordenação do portal viram "☐ □ ▸" no OCR do print: fora, antes de reconhecer a linha (07/10/2026, BXZ4J84)
    var l = linhas[i].replace(/^[^A-Za-z0-9(À-ÿ]+/, '').trim(), u = vd_semAcento_(l);
    if (!l) continue;
    // cabeçalho de coluna sozinho na linha (layout em colunas): diz de que coluna são as linhas seguintes
    if (/^(ENTREGA|FORNECEDOR|TEL\.?|E-?MAIL)$/.test(u) && pecas.length) { colunaAtual = u.replace(/\W/g, ''); continue; }
    if (cab.test(u)) continue;
    if (/^FORNECIDO PELA OFICINA$/.test(u)) { fornecedores.push({ oficina: true }); continue; }
    var datas = l.match(reData) || [];
    var soDatas = datas.length && l.replace(reData, '').replace(/[\s\-]/g, '') === '';
    if (soDatas) {
      // a data da peça caiu na linha de baixo (OCR quebrou a célula): é dela, não da fila
      var ult = pecas[pecas.length - 1];
      if (!colunaAtual && ult && !ult.previsao && linhaUltimaPeca === i - 1 && datas.length === 1) { ult.previsao = datas[0]; linhaUltimaPeca = i; continue; }
      datas.forEach(function (d) { (colunaAtual === 'ENTREGA' ? entregasSoltas : datasSoltas).push(d); }); continue;
    }
    var temForn = reTel.test(l) || reMail.test(l), oficinaNaLinha = /FORNECIDO PELA OFICINA/.test(u);
    if (temForn && !datas.length && colunaAtual) { fornsDe(l).forEach(function (nm) { fornecedores.push({ nome: nm }); }); continue; }   // coluna Fornecedor, uma célula (ou várias) por linha
    var desc = l.replace(reMail, '').replace(reTel, '');
    var pos = desc.search(reData); if (pos >= 0) desc = desc.slice(0, pos);
    var fornTxt = '';
    if (temForn) { var m = l.match(reData); var dep = m ? l.slice(l.lastIndexOf(m[m.length - 1]) + m[m.length - 1].length) : ''; fornTxt = dep || ''; }
    if (oficinaNaLinha) desc = desc.replace(/fornecido pela oficina/i, '');
    desc = desc.replace(/\s+/g, ' ').trim();
    if (!desc || desc.length < 4) {
      // só fornecedor na linha (layout em colunas): entra na fila de fornecedores
      if (temForn) fornsDe(l).forEach(function (nm) { fornecedores.push({ nome: nm }); });
      continue;
    }
    if (!/[A-Z]{3,}/.test(vd_semAcento_(desc))) continue;
    var p = { descricao: desc.toUpperCase(), previsao: '', entregueEm: '', entregue: false, fornecedor: '', oficina: oficinaNaLinha, linha: l.slice(0, 120) };
    if (datas[0]) p.previsao = datas[0];
    if (datas[1]) p.entregueEm = datas[1];
    if (temForn) p.fornecedor = fornDe(fornTxt || l.slice(desc.length));
    p._temForn = temForn || oficinaNaLinha;
    pecas.push(p); linhaUltimaPeca = i;
  }
  // layout em colunas: datas soltas e fornecedores casam pela ordem com as peças que ficaram sem
  var semData = pecas.filter(function (p) { return !p.previsao; });
  datasSoltas.forEach(function (d, k) { if (semData[k]) semData[k].previsao = d; });
  var comPrev = pecas.filter(function (p) { return p.previsao && !p.entregueEm; });
  entregasSoltas.forEach(function (d, k) { if (comPrev[k]) comPrev[k].entregueEm = d; });
  var semForn = pecas.filter(function (p) { return !p._temForn; });
  fornecedores.forEach(function (f, k) { if (!semForn[k]) return; if (f.oficina) semForn[k].oficina = true; else semForn[k].fornecedor = f.nome; });
  pecas.forEach(function (p) {
    delete p._temForn;
    var dp = p.previsao ? pv_datas_(p.previsao)[0] : null, de = p.entregueEm ? pv_datas_(p.entregueEm)[0] : null;
    p.previsao = dp ? dp.toISOString() : '';
    p.entregueEm = de ? de.toISOString() : '';
    p.entregue = !!de;
  });
  return pecas.length ? pecas : null;
}

function pv_lerFornecimento_(texto, alvos, lista) {
  var linhas = String(texto || '').replace(/\r/g, '').split('\n');
  var norm = linhas.map(cp_norm_);
  lista = lista || (function () { try { return fo_lista_(); } catch (e) { return []; } })();
  // "Peças do sinistro" do portal HDI: sem código — casa pela descrição (07/10/2026)
  var hdi = null; try { hdi = pv_lerHdiPecas_(texto, lista); } catch (e) { console.log('peças hdi: ' + e); }
  if (hdi) {
    var outH = [], usadasH = {};
    (alvos || []).forEach(function (a) {
      var melhor = -1, nota = 0;
      hdi.forEach(function (p, i) {
        if (usadasH[i] || p.oficina) return;
        var sim = cp_similar_(a.descricao || a.nome, p.descricao);
        if (sim > nota) { nota = sim; melhor = i; }
      });
      if (melhor < 0) return;
      usadasH[melhor] = 1;
      var r = hdi[melhor];
      outH.push({ alvo: a, fornecedor: r.fornecedor, previsao: r.previsao, linha: r.linha, entregue: r.entregue, entregueEm: r.entregueEm });
    });
    if (outH.length) return outH;
  }
  // layout "Status do Pedido" do Cilia: fornecedor em duas linhas e data na linha da peça — leitor próprio
  var cilia = null; try { cilia = pv_lerStatusCilia_(texto, lista); } catch (e) { console.log('status cilia: ' + e); }
  if (cilia) {
    var outC = [], usadasC = {}, semCodigo = [];
    (alvos || []).forEach(function (a) {
      var k = cp_norm_(a.codigo || a.codigoOrc); if (k.length < 5) { semCodigo.push(a); return; }
      var kd = (k.match(/^\d{5,}/) || [k])[0];   // código grudado na descrição ("100260230EMBLEMA"): só os dígitos
      var r = cilia[k] || cilia[kd];
      if (r) { usadasC[cilia[k] ? k : kd] = 1; outC.push({ alvo: a, fornecedor: r.fornecedor, previsao: r.previsao, linha: r.linha, entregue: r.entregue, entregueEm: r.entregueEm }); }
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
      outC.push({ alvo: a, fornecedor: r.fornecedor, previsao: r.previsao, linha: r.linha, codigoNovo: r.codigo, descNova: r.descricao, entregue: r.entregue, entregueEm: r.entregueEm });
    });
    if (outC.length) {
      // pareceres mais novos que a tabela mudam a previsão (com motivo) ou marcam B.O. (07/10/2026)
      try { pv_aplicarPareceres_(outC, texto, alvos); } catch (e) { console.log('pareceres cilia: ' + e); }
      return outC;
    }
  }
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  var out = [];
  var recente = function (t) { return pv_datas_(t, true).filter(function (d) { return d >= new Date(hoje.getTime() - 60 * 864e5); }); };
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
  out.trecho = String(texto || '').slice(0, 4000);   // diagnóstico do OCR (o formulário não mostra)
  return out;
}

/** Aba 🚚 FORNECIMENTO: lê um anexo que JÁ está no card (05/10/2026, Weslley: "já está anexo, não se exige nova importação").
 *  Mesmo retorno de vdf_lerFornecimento, com anexoId no lugar de fileId (nada é anexado de novo). */
function vdf_lerFornecimentoAnexo(token, shortLink, idAnexo) {
  vdf_usuario_(token);
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard', checklists: 'all', checkItem_fields: 'name,state,due', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url,date' } });
  var a = (card.attachments || []).filter(function (x) { return x.id === idAnexo; })[0];
  if (!a) throw new Error('Esse anexo não está mais no card.');
  if (!vd_anexoLegivel_(a)) throw new Error('Esse anexo não dá para ler (só PDF ou foto até 15 MB).');
  var resp = qt_fetch_(a.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
  if (resp.getResponseCode() >= 300) throw new Error('O Trello não entregou o arquivo "' + a.name + '". Tente de novo.');
  var texto;
  try { texto = vd_ocr_(resp.getBlob(), a.name); } catch (e) { return { anexoId: a.id, erro: 'Não consegui ler "' + a.name + '" (' + String(e.message || e).slice(0, 80) + ').' }; }
  var out = pv_lerFornecimentoTexto_(card, texto);
  out.anexoId = a.id;
  out.trecho = String(texto || '').slice(0, 4000);   // diagnóstico do OCR (o formulário não mostra)
  // anexo subido à mão e lido por aqui ganha o nome padronizado "🚚 FO · PLACA · doc · dd/MM" (07/10/2026, ATX2884)
  try {
    var docNome = pv_docFornecimento_(texto);
    if (docNome && a.isUpload && !ax_padronizado_(a.name) && ax_placa_(card) && out.lidos) {
      out.renomeado = ax_batizar_(card.id, a.id, ax_nome_(AX.FO, ax_placa_(card), [docNome], a.date), ax_anexos_(card.id, token), token, { nomeAtual: a.name });
    }
  } catch (e) { console.log('batizar anexo lido: ' + e); }
  return out;
}

/** Tipo do documento de fornecimento pelo texto: 'Status do Pedido Cilia' | 'Peças HDI' | ''. */
function pv_docFornecimento_(texto) {
  var nt = vd_normTexto_(texto);
  if (/STATUS DO PEDIDO|PREVISAO DE ENTREGA|STATUS DAS PECAS/.test(nt)) return 'Status do Pedido Cilia';
  if (/PE[CG]AS DO (SINISTRO|LAUDO)/.test(nt)) return 'Peças HDI';
  return '';
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
  var hdiL = null; try { hdiL = pv_lerHdiPecas_(texto, foLista); } catch (e) {}
  if (orc.origem) {
    orc.fo.forEach(function (p) { var k = cp_norm_(p.codigo); if (k.length >= 4 && !ja(k)) extras.push(cp_nome_(p)); });
  } else if (hdiL) {
    // "Peças do sinistro" da HDI: FO do documento que não bate com nenhuma peça do card (pela descrição)
    var descsCard = alvos.map(function (a) { return a.descricao || a.nome; }).concat(vd_analisar_(card.desc, card.name).pecas.map(function (p) { return p.descricao || ''; }));
    hdiL.forEach(function (p) { if (p.oficina) return; if (!descsCard.some(function (d) { return cp_similar_(d, p.descricao) > 0; })) extras.push(p.descricao + (p.fornecedor ? ' (' + p.fornecedor + ')' : '')); });
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
    achados: achados.map(function (r) { return { id: r.alvo.id, nome: r.alvo.nome, fornecedor: r.fornecedor, previsao: r.previsao ? Utilities.formatDate(new Date(r.previsao), 'America/Sao_Paulo', 'yyyy-MM-dd') : '', codigoNovo: r.codigoNovo || '', descNova: r.descNova || '', entregue: !!r.entregue, entregueEm: r.entregueEm ? Utilities.formatDate(new Date(r.entregueEm), 'America/Sao_Paulo', 'yyyy-MM-dd') : '',
      // vindo do parecer do Cilia (07/10/2026): motivo da nova previsão, situação BO, previsão que a tabela mostrava
      motivo: r.motivo || '', situacao: r.situacao || '', parecer: r.parecer || '', previsaoTabela: r.previsaoTabela ? Utilities.formatDate(new Date(r.previsaoTabela), 'America/Sao_Paulo', 'yyyy-MM-dd') : '' }; }),
    faltando: faltando, extras: extras.slice(0, 20)
  };
}
