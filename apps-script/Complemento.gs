/* ============================ ORÇAMENTO COMPLEMENTAR ============================
 * Card que já está andando e recebe um orçamento novo (complemento da seguradora, com peças a mais):
 *  - compara o orçamento novo com o que o card já tem (lista de peças, checklists FORNECIMENTO/PAGAS
 *    e orçamentos anteriores já lidos) — por código e, sem código, por descrição;
 *  - peças NOVAS da oficina entram na lista de peças marcadas "| COMPLEMENTO dd/mm"
 *    (depois das peças da seguradora, antes das particulares) — o consultor marca o tipo;
 *    na compra vão para o checklist PAGAS COMPLEMENTO;
 *  - peças NOVAS da seguradora (FO) vão para o checklist FORNECIMENTO COMPLEMENTO.
 * Dois caminhos:
 *  1) formulário (✏️ Editar peças): o consultor envia/lê o PDF novo e as peças novas já aparecem;
 *  2) robô (ciclo de 1 min): PDF de orçamento anexado direto no card (30+ min depois de criado)
 *     -> lê, compara e inclui sozinho. Desligar: propriedade CP_LIGADO = NAO.
 */
var CP = {
  FO: 'FORNECIMENTO COMPLEMENTO',
  PAGAS: 'PAGAS COMPLEMENTO',
  ESPERA_CRIACAO_MS: 30 * 60 * 1000,   // anexo nos primeiros 30 min do card = orçamento original
  MAX_VISTOS: 400
};

function cp_norm_(s) { return vd_semAcento_(s).replace(/[^A-Z0-9]/g, ''); }

/** Chaves de uma peça para comparar: código (4+ caracteres) e descrição. */
function cp_chaves_(p) {
  if (!p) return [];
  if (p.pneu) return ['PNEU' + cp_norm_(p.medida)];
  var out = [], c = cp_norm_(p.codigo || p.codigoOrc), d = cp_norm_(p.descricao || p.descricaoOrc);
  if (c.length >= 4) out.push(c);
  if (d.length >= 4) out.push(d);
  return out;
}

/** Orçamento guardado no cache de leitura de um anexo (sem ler de novo). */
function cp_orcDoCache_(idAnexo) {
  try {
    var v = PropertiesService.getScriptProperties().getProperty('VD_ANX3_' + idAnexo);
    if (!v) return null;
    var r = JSON.parse(v);
    if (!r.orc) return null;
    return { oficina: vd_orcExpandir_(r.orc.o), fo: vd_orcExpandir_(r.orc.f) };
  } catch (e) { return null; }
}

/**
 * O que o card já conhece: {chaves:{}, textos:[]}.
 * card precisa de desc (completa), checklists e attachments. excluirAnexo = id do anexo que está sendo comparado.
 */
function cp_conhecidas_(card, excluirAnexo) {
  var chaves = {}, textos = [];
  var an = vd_analisar_(card.desc || '', card.name || '');
  an.pecas.forEach(function (p) { cp_chaves_(p).forEach(function (k) { chaves[k] = 1; }); });
  (card.checklists || []).forEach(function (k) {
    if (!/^(PAGAS|FORNECIMENTO)/i.test(String(k.name || '').trim())) return;
    (k.checkItems || []).forEach(function (i) { textos.push(cp_norm_(i.name)); });
  });
  // orçamentos anteriores (só os que já estão no cache): peça que o consultor tirou de propósito não volta
  (card.attachments || []).forEach(function (a) {
    if (a.id === excluirAnexo) return;
    var o = cp_orcDoCache_(a.id);
    if (!o) return;
    o.oficina.concat(o.fo).forEach(function (p) { cp_chaves_(p).forEach(function (k) { chaves[k] = 1; }); });
  });
  return { chaves: chaves, textos: textos, an: an };
}

function cp_jaTem_(conh, p) {
  var ks = cp_chaves_(p);
  if (!ks.length) return true;   // sem código nem descrição: não dá para comparar, ignora
  return ks.some(function (k) {
    if (conh.chaves[k]) return true;
    return conh.textos.some(function (t) { return t.indexOf(k) >= 0; });
  });
}

/** Separa o que é novo no orçamento: {oficina:[], fo:[], jaTinha:n}. */
function cp_comparar_(card, orc, excluirAnexo) {
  var conh = cp_conhecidas_(card, excluirAnexo);
  var out = { oficina: [], fo: [], jaTinha: 0 }, vistos = {};
  var junta = function (lista, destino) {
    (lista || []).forEach(function (p) {
      var k = cp_chaves_(p).join('|');
      if (vistos[k]) return; vistos[k] = 1;
      if (cp_jaTem_(conh, p)) { out.jaTinha++; return; }
      destino.push(p);
    });
  };
  junta(orc.oficina, out.oficina);
  junta(orc.fo, out.fo);
  return out;
}

/** Hoje "dd/MM". */
function cp_hoje_() { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM'); }

/** Linha do bloco com a contagem do checklist FORNECIMENTO COMPLEMENTO. */
function cp_linhaFo_(n) { return '**' + CP.FO + ':** ' + n + ' peça(s) — ver checklist ' + CP.FO; }

/** Quantos itens o checklist tem no card. */
function cp_contarChecklist_(cardId, nome, token) {
  var ls = vd_api_('/cards/' + cardId + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name' } }, token);
  var n = 0;
  ls.forEach(function (k) { if (String(k.name || '').trim().toUpperCase() === nome) n += (k.checkItems || []).length; });
  return n;
}

/**
 * Coloca as peças novas da oficina e a linha do FO complementar no bloco do consultor.
 * Peças novas entram depois da última peça da seguradora (antes das particulares) e a lista é renumerada.
 */
function cp_inserirNoBloco_(bloco, novas, nFo) {
  var linhas = String(bloco || '').split('\n');
  var ini = -1;
  for (var i = 0; i < linhas.length; i++) if (/^\s*PE[ÇC]AS\s*:?\s*$/i.test(vd_limpar_(linhas[i]))) { ini = i; break; }
  var data = cp_hoje_();
  var novasTxt = novas.map(function (p) {
    var q = { pneu: !!p.pneu, codigo: String(p.codigo || '').replace(/\s+/g, '').toUpperCase(), descricao: String(p.descricao || '').toUpperCase(), tipos: p.tipos || [],
      medida: p.medida || '', categoria: p.categoria || '', marca: p.marca || '', qtd: p.qtd || '', complemento: true, compData: p.compData || data };
    return vd_linhaPeca_(q, 0).replace(/^\d+\.\s*/, '');
  });
  var idxPecas = [], semOf = -1, fim = -1;
  if (ini >= 0) {
    for (var j = ini + 1; j < linhas.length; j++) {
      var l = vd_limpar_(linhas[j]).trim();
      if (!l) { if (idxPecas.length || semOf >= 0) break; continue; }
      if (/^(OBS|OBSERVA[ÇC][ÃA]O|PEDIDO ENVIADO|↳|FORNECIMENTO|FO\b|DADOS DO CARRO|-{3,}|={3,})/i.test(l)) break;
      if (/^NENHUMA PE[ÇC]A/i.test(l)) { semOf = j; break; }
      idxPecas.push(j);
    }
  }
  if (novasTxt.length) {
    if (ini < 0) {
      linhas.push('', '**PEÇAS:**');
      novasTxt.forEach(function (t) { linhas.push(t); });
      ini = linhas.length - novasTxt.length - 1;
      idxPecas = novasTxt.map(function (t, k) { return ini + 1 + k; });
    } else if (semOf >= 0) {
      linhas.splice.apply(linhas, [semOf, 1].concat(novasTxt));
      idxPecas = novasTxt.map(function (t, k) { return semOf + k; });
    } else {
      // depois da última peça que não é particular
      var primeiro = idxPecas.length ? idxPecas[0] : ini + 1;
      var depois = primeiro - 1;
      idxPecas.forEach(function (ix) { if (!vd_analisarPeca_(vd_limpar_(linhas[ix]).replace(/^\s*(?:\d+\s*[.)\-]|[-•*])\s*/, ''), 1).particular) depois = ix; });
      linhas.splice.apply(linhas, [depois + 1, 0].concat(novasTxt));
      var total = idxPecas.length + novasTxt.length;
      idxPecas = []; for (var t = 0; t < total; t++) idxPecas.push(primeiro + t);
    }
    idxPecas.forEach(function (ix, k) { linhas[ix] = (k + 1) + '. ' + linhas[ix].replace(/^\s*(?:\d+\s*[.)\-]|[-•*])\s*/, ''); });
  }
  if (nFo) {
    var achou = false;
    for (var a = 0; a < linhas.length; a++) {
      if (/^FORNECIMENTO COMPLEMENTO/i.test(vd_limpar_(linhas[a]).trim())) { linhas[a] = cp_linhaFo_(nFo); achou = true; break; }
    }
    if (!achou) {
      var pos = -1;
      for (var b = 0; b < linhas.length; b++) if (/^FORNECIMENTO \(SEGURADORA\)/i.test(vd_limpar_(linhas[b]).trim())) pos = b;
      if (pos < 0) {
        // logo depois da lista de peças
        pos = ini;
        for (var c2 = ini + 1; ini >= 0 && c2 < linhas.length; c2++) { var lc = vd_limpar_(linhas[c2]).trim(); if (!lc) break; pos = c2; }
        if (pos < 0) pos = linhas.length - 1;
        linhas.splice(pos + 1, 0, '', cp_linhaFo_(nFo));
      } else {
        linhas.splice(pos + 1, 0, cp_linhaFo_(nFo));
      }
    }
  }
  return linhas.join('\n');
}

/** Nome curto da peça para comentário. */
function cp_nome_(p) {
  return p.pneu ? 'PNEU ' + String(p.medida || '').replace(/\s+/g, '') + (p.marca ? ' ' + p.marca : '')
    : ((String(p.codigo || p.codigoOrc || '').replace(/\s+/g, '') + ' ').trim() + ' ' + String(p.descricao || '')).trim() + (p.qtd && +p.qtd > 1 ? ' (x' + p.qtd + ')' : '');
}

/** Texto do comentário do complemento. */
function cp_textoComentario_(quem, origem, anexo, novas, foNovas, jaTinha, urlTipos) {
  var semTipo = novas.some(function (p) { return !(p.tipos || []).length; });
  var t = '📄 **ORÇAMENTO COMPLEMENTAR**' + (origem ? ' (' + origem + ')' : '') + (quem ? ' — ' + quem : ' — robô') + (jaTinha ? ' · ' + jaTinha + ' já estavam no card' : '');
  if (novas.length) t += '\n➕ **Oficina:** ' + novas.map(cp_nome_).join('; ') + (semTipo ? ' — _marcar o tipo_' : '');
  if (foNovas.length) t += '\n📦 **FO (' + CP.FO + '):** ' + foNovas.map(cp_nome_).join('; ');
  if (urlTipos && semTipo) t += '\n✏️ ' + urlTipos;
  return t;
}

/* ---------- caminho 1: formulário ---------- */

/** Formulário: compara um orçamento lido com o card. o = {oficina, fo}, idAnexo = anexo lido (se já está no card). */
function vdf_compararComplemento(token, shortLink, o, idAnexo) {
  vdf_usuario_(token);
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard', checklists: 'all', checkItem_fields: 'name', attachments: 'true', attachment_fields: 'name' } });
  var r = cp_comparar_(card, { oficina: (o && o.oficina) || [], fo: (o && o.fo) || [] }, idAnexo || '');
  return { oficina: r.oficina, fo: r.fo, jaTinha: r.jaTinha };
}

/** Anexos que o formulário subiu num complemento: o robô não precisa ler de novo. */
function cp_marcarVistos_(ids) {
  if (!ids || !ids.length) return;
  var props = PropertiesService.getScriptProperties();
  var l = []; try { l = JSON.parse(props.getProperty('CP_VISTOS') || '[]'); } catch (e) {}
  ids.forEach(function (id) { if (l.indexOf(id) < 0) l.push(id); });
  props.setProperty('CP_VISTOS', JSON.stringify(l.slice(-CP.MAX_VISTOS)));
}

/* ---------- caminho 2: robô (orçamento anexado direto no card) ---------- */

function cp_ligado_() { return vd_prop_('CP_LIGADO', 'SIM') !== 'NAO'; }

/** Data de criação do card (pelo id do Trello). */
function cp_criadoEm_(id) { return parseInt(String(id).slice(0, 8), 16) * 1000; }

function cp_executar_() {
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO' || !cp_ligado_()) return 0;
  var props = PropertiesService.getScriptProperties();
  // histórico do quadro: só os anexos novos desde a última rodada (antes baixava os anexos de todos os cards)
  var desde = vd_marca_('CP_ACT');
  if (!desde) {
    var antigo = +(vd_marca_('CP_DESDE') || 0);   // marcador antigo (ms) continua valendo na troca
    desde = new Date(antigo || Date.now()).toISOString();
    vd_marcaSet_('CP_ACT', desde);
    if (!antigo) return 0;
  }
  var vistos = []; try { vistos = JSON.parse(props.getProperty('CP_VISTOS') || '[]'); } catch (e) {}
  var prazo = Date.now() + 60 * 1000;
  var ctx = vd_contexto_();
  var acts = vd_api_('/boards/' + ctx.board + '/actions', { cru: true, query: { filter: 'addAttachmentToCard', since: desde, limit: 100, fields: 'data,date' } }) || [];
  if (!acts.length) return 0;
  acts.reverse();   // mais antigo primeiro
  var n = 0, mudou = false, ultima = desde;
  for (var k = 0; k < acts.length; k++) {
    if (Date.now() > prazo) break;
    var ac = acts[k], d = ac.data || {}, c = d.card || {}, at = d.attachment || {};
    ultima = new Date(new Date(ac.date).getTime() + 1).toISOString();
    if (!c.id || !at.id || vistos.indexOf(at.id) >= 0) continue;
    if (vdf_cardProtegido_(c.name || '') || /^\s*AVISO\b/i.test(c.name || '') || /NOVO PEDIDO DE PE[ÇC]A/i.test(c.name || '')) continue;
    if (vd_legado_(c.id)) continue;
    var a;
    try { a = vd_api_('/cards/' + c.id + '/attachments/' + at.id, { cru: true, query: { fields: 'name,mimeType,isUpload,bytes,url,date' } }); } catch (e) { continue; }
    if (!vd_anexoLegivel_(a)) continue;
    if (new Date(a.date).getTime() - cp_criadoEm_(c.id) <= CP.ESPERA_CRIACAO_MS) continue;   // orçamento original do card
    vistos.push(a.id); mudou = true;
    try { if (cp_doAnexo_(c, a, ctx)) n++; } catch (e) { console.log('complemento ' + c.name + ': ' + e); }
  }
  vd_marcaSet_('CP_ACT', ultima);
  if (mudou) props.setProperty('CP_VISTOS', JSON.stringify(vistos.slice(-CP.MAX_VISTOS)));
  return n;
}

/** Lê UM anexo novo; se for orçamento da mesma placa com peças novas, aplica o complemento. */
function cp_doAnexo_(c, a, ctx) {
  var r = vd_lerAnexoTrello_(a, { orcCompleto: true });
  if (!r || r.erro || !r.orcamento) return false;
  var card = vd_api_('/cards/' + c.id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name', attachments: 'true', attachment_fields: 'name' } });
  var an = vd_analisar_(card.desc || '', card.name);
  var lp = vd_linhasPecas_(an.div.bloco);
  if (!lp.linhas.length && !lp.semOficina) return false;   // card sem lista: a importação normal cuida
  var placa = an.dados.placa;
  if (!placa || !(r.placas || []).some(function (p) { return vd_mesmaPlaca_(p, placa); })) return false;
  var orc = r.orcFull || (r.orc ? { oficina: vd_orcExpandir_(r.orc.o), fo: vd_orcExpandir_(r.orc.f) } : null);
  if (!orc) return false;
  var cmp = cp_comparar_(card, orc, a.id);
  if (!cmp.oficina.length && !cmp.fo.length) return false;
  cp_aplicar_(card, cmp, { origem: r.orcamento, anexo: a.name, quem: 'robô', token: null, ctx: ctx });
  return true;
}

/** Aplica o complemento num card (robô). cmp = {oficina, fo, jaTinha}. */
function cp_aplicar_(card, cmp, o) {
  var nFoTotal = 0;
  if (cmp.fo.length) {
    vdf_checklistFornecimento_(card.id, cmp.fo, o.token, CP.FO);
    nFoTotal = cp_contarChecklist_(card.id, CP.FO, o.token);
  }
  var div = vd_dividir_(card.desc);
  var bloco = cp_inserirNoBloco_(div.bloco, cmp.oficina, nFoTotal);
  vd_backup_(card, 'orçamento complementar (' + (o.origem || '') + ')');
  vd_gravarDesc_(card.id, bloco + (div.temMarcador ? '\n\n' + div.resto : '\n\n' + VD.MARCADOR), o.token);
  var quem = ''; try { quem = vd_criador_(card.id); } catch (e) {}
  var url = o.ctx && o.ctx.urlForm ? o.ctx.urlForm + '?card=' + card.shortLink + '&so=tipos' : '';
  try { vd_comentar_(card, (quem && cmp.oficina.length ? '@' + quem + ' ' : '') + cp_textoComentario_('', o.origem, o.anexo, cmp.oficina, cmp.fo, cmp.jaTinha, url)); } catch (e) {}
  try {
    ev_registrar_('COMPLEMENTO', card, o.quem || 'robô', cmp.oficina.map(ev_peca_).concat(cmp.fo.map(function (p) { var e = ev_peca_(p); e.fornecedor = 'SEGURADORA (FO)'; return e; })),
      { detalhe: cmp.oficina.length + ' oficina · ' + cmp.fo.length + ' FO · ' + (o.origem || '') });
  } catch (e) {}
  // só FO nova num card já encerrado: volta para FALTA CHEGAR (peça da oficina nova o robô devolve para cotação)
  if (cmp.fo.length && !cmp.oficina.length) { try { rc_reavaliarColuna_(card.id, o.token, o.quem || 'robô'); } catch (e) { console.log('complemento/coluna: ' + e); } }
}
