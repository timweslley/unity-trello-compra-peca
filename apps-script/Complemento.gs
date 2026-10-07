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
  var foItens = [];
  (card.checklists || []).forEach(function (k) {
    if (!/^(PAGAS|FORNECIMENTO)/i.test(String(k.name || '').trim())) return;
    (k.checkItems || []).forEach(function (i) {
      textos.push(cp_norm_(i.name));
      if (/^FORNECIMENTO/i.test(String(k.name || '').trim())) foItens.push({ id: i.id, idChecklist: k.id, name: i.name, state: i.state, lista: String(k.name).trim().toUpperCase() });
    });
  });
  // orçamentos anteriores (só os que já estão no cache): peça que o consultor tirou de propósito não volta
  (card.attachments || []).forEach(function (a) {
    if (a.id === excluirAnexo) return;
    var o = cp_orcDoCache_(a.id);
    if (!o) return;
    o.oficina.concat(o.fo).forEach(function (p) { cp_chaves_(p).forEach(function (k) { chaves[k] = 1; }); });
  });
  return { chaves: chaves, textos: textos, an: an, foItens: foItens };
}

function cp_jaTem_(conh, p) {
  var ks = cp_chaves_(p);
  if (!ks.length) return true;   // sem código nem descrição: não dá para comparar, ignora
  return ks.some(function (k) {
    if (conh.chaves[k]) return true;
    return conh.textos.some(function (t) { return t.indexOf(k) >= 0; });
  });
}

/* Peça marcada "➕ COMPLEMENTO" à mão (o orçamentista pede a peça ANTES de a seguradora mandar o
 * complementar — regra de 05/10/2026): quando o PDF chega, a peça dele NÃO pode entrar de novo.
 * Código igual já casa (cp_jaTem_). Sem código igual, casa pela descrição parecida: mesma peça-base
 * (1ª palavra, ex.: RADIADOR) e pelo menos metade das palavras em comum — uma peça do card por peça do PDF. */
var CP_PAL_FRACA = /^(DE|DO|DA|DOS|DAS|COM|SEM|PARA|MOTOR|MANUAL|AUTOMATICO|AUTOMATICA|COMPLETO|COMPLETA|KIT|JOGO|UNIDADE|PCS|PECA)$/;
// posição: lado (D/E), frente/trás (F/T), cima/baixo (S/I) — card e PDF com posição diferente no mesmo eixo = peças diferentes
var CP_POSICAO = { DIR: 'D', DIREITO: 'D', DIREITA: 'D', LD: 'D', ESQ: 'E', ESQUERDO: 'E', ESQUERDA: 'E', LE: 'E', DIANT: 'F', DIANTEIRO: 'F', DIANTEIRA: 'F', FRENTE: 'F', TRAS: 'T', TRASEIRO: 'T', TRASEIRA: 'T', SUP: 'S', SUPERIOR: 'S', INF: 'I', INFERIOR: 'I' };
var CP_EIXO = { D: 1, E: 1, F: 2, T: 2, S: 3, I: 3 };
function cp_palavras_(s) { return vd_semAcento_(s).replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 2; }); }
function cp_posicoes_(pal) { var o = {}; pal.forEach(function (w) { var c = CP_POSICAO[w]; if (c) o[CP_EIXO[c]] = c; }); return o; }
function cp_fortes_(pal) { return pal.filter(function (w) { return w.length >= 3 && !CP_PAL_FRACA.test(w) && !CP_POSICAO[w]; }); }
/** Quão parecidas são duas descrições de peça (0 = peças diferentes; 1 = mesmas palavras fortes).
 *  Mesma peça-base (1ª palavra forte), nenhum eixo de posição conflitante (D/E, F/T, S/I) e ≥ metade das palavras em comum. */
function cp_similar_(descA, descB) {
  var pa = cp_palavras_(descA), fa = cp_fortes_(pa), xa = cp_posicoes_(pa);
  var pb = cp_palavras_(descB), fb = cp_fortes_(pb), xb = cp_posicoes_(pb);
  if (!fa.length || !fb.length || fa[0] !== fb[0]) return 0;   // RADIADOR x CONDENSADOR
  if (Object.keys(xa).some(function (e) { return xb[e] && xb[e] !== xa[e]; })) return 0;   // FAROL ESQ x FAROL DIR
  var comum = fa.filter(function (w) { return fb.indexOf(w) >= 0; }).length;
  var n = comum / (fa.length + fb.length - comum);
  return n >= 0.5 ? n : 0;
}
/** Peça do card (lista `pecas`) mais parecida com `p` pela descrição; uma peça do card por peça do PDF (usadas). */
function cp_maisParecida_(pecas, p, usadas, filtro) {
  if (!p || p.pneu) return -1;
  var melhor = -1, nota = 0;
  (pecas || []).forEach(function (c, i) {
    if (c.pneu || usadas[i] || (filtro && !filtro(c))) return;
    var n = cp_similar_(p.descricao || p.descricaoOrc, c.descricao);
    if (n > nota) { nota = n; melhor = i; }
  });
  if (melhor >= 0) usadas[melhor] = 1;
  return melhor;
}
function cp_casaManual_(conh, p, usadas) {
  var i = cp_maisParecida_(conh.an.pecas, p, usadas, function (c) { return !!c.complemento; });
  return i >= 0 ? conh.an.pecas[i] : null;
}

/** Separa o que é novo no orçamento: {oficina:[], fo:[], jaTinha:n, pareadas:[{card, orc, fo}]}. */
function cp_comparar_(card, orc, excluirAnexo) {
  var conh = cp_conhecidas_(card, excluirAnexo);
  // atualizar: peça que o card já tem e o orçamento novo traz diferente — código novo (Weslley, 05/10/2026: "pode haver
  // mudança de código da peça, atualizar também") e/ou valor líquido novo. {chave, codigo, valorOrc, descricao}
  var out = { oficina: [], fo: [], jaTinha: 0, pareadas: [], atualizar: [], paraOficina: [] }, vistos = {}, usadas = {};
  var pecasCard = conh.an.pecas || [];
  var porCodigo = {}; pecasCard.forEach(function (c, i) { var k = cp_norm_(c.codigo); if (k.length >= 4) porCodigo[k] = i; });
  var porDesc = {}; pecasCard.forEach(function (c, i) { var k = cp_norm_(c.descricao); if (k.length >= 4 && !c.pneu) porDesc[k] = i; });
  var marcaAtualizar = function (i, p, codigoNovo) {
    var c = pecasCard[i], u = { chave: vd_chavePeca_(c), codigoAntigo: c.codigo || '' };
    var vOrc = vd_valorOrcTxt_(p.valorOrc), vCard = vd_valorOrcTxt_(c.valorOrc);
    if (codigoNovo && cp_norm_(codigoNovo) !== cp_norm_(c.codigo)) u.codigo = String(codigoNovo).replace(/\s+/g, '').toUpperCase();
    if (vOrc && vOrc !== vCard) u.valorOrc = vOrc;
    if (p.descricao || p.descricaoOrc) u.descricao = String(p.descricao || p.descricaoOrc).toUpperCase();
    if (u.codigo || u.valorOrc) out.atualizar.push(u);
    usadas[i] = 1;
  };
  var junta = function (lista, destino, ehFo) {
    (lista || []).forEach(function (p) {
      var k = cp_chaves_(p).join('|');
      if (vistos[k]) return; vistos[k] = 1;
      var kc = cp_norm_(p.codigo || p.codigoOrc), kd = cp_norm_(p.descricao || p.descricaoOrc);
      if (!ehFo && !p.pneu) {
        // mesma peça da oficina pelo código: já tem (valor do orçamento pode ter mudado)
        if (kc.length >= 4 && porCodigo[kc] !== undefined) { out.jaTinha++; marcaAtualizar(porCodigo[kc], p, ''); return; }
        // mesma descrição (igual ou parecida) com código diferente: o código mudou no orçamento novo -> atualiza, não repete
        var i = kd.length >= 4 && porDesc[kd] !== undefined && !usadas[porDesc[kd]] ? porDesc[kd] : cp_maisParecida_(pecasCard, p, usadas);
        if (i >= 0) {
          out.jaTinha++;
          if (pecasCard[i].complemento) out.pareadas.push({ card: cp_nome_(pecasCard[i]), orc: cp_nome_(p), fo: false });
          marcaAtualizar(i, p, kc.length >= 4 ? (p.codigo || p.codigoOrc) : '');
          return;
        }
      }
      // peça que ERA fornecida pela seguradora (checklist FORNECIMENTO, ainda não entregue) e o orçamento novo traz como
      // peça da OFICINA (Weslley, 06/10/2026, QPG1B84): entra na lista da oficina (complemento) e sai do checklist FO
      if (!ehFo && !p.pneu) {
        var itFo = cp_foParaOficina_(conh, p);
        if (itFo) { out.paraOficina.push({ item: itFo, peca: p }); destino.push(p); return; }
      }
      if (cp_jaTem_(conh, p)) {
        // FO: já está no checklist pelo código. Com código diferente e descrição conhecida, segue para o checklist,
        // que atualiza o item existente (código/descrição) em vez de repetir — vdf_checklistFornecimento_
        if (ehFo && !(kc.length >= 4 && (conh.chaves[kc] || conh.textos.some(function (t) { return t.indexOf(kc) >= 0; })))) { destino.push(p); return; }
        out.jaTinha++; return;
      }
      var m = ehFo ? cp_casaManual_(conh, p, usadas) : null;
      if (m) { out.jaTinha++; out.pareadas.push({ card: cp_nome_(m), orc: cp_nome_(p), fo: true }); return; }
      destino.push(p);
    });
  };
  junta(orc.oficina, out.oficina, false);
  junta(orc.fo, out.fo, true);
  return out;
}

/**
 * Item do checklist FORNECIMENTO (não entregue) que é a mesma peça de `p` (código igual ou descrição parecida),
 * desde que a peça NÃO esteja na lista da oficina nem marcada 🚫 não comprar (aí o consultor já decidiu). null se não há.
 */
function cp_foParaOficina_(conh, p) {
  var kc = cp_norm_(p.codigo || p.codigoOrc), desc = p.descricao || p.descricaoOrc || '';
  var naLista = (conh.an.pecas || []).concat(conh.an.naoComprar || []).some(function (c) {
    return (kc.length >= 4 && cp_norm_(c.codigo) === kc) || (!c.pneu && cp_similar_(desc, c.descricao) > 0);
  });
  if (naLista) return null;
  var cands = (conh.foItens || []).filter(function (i) { return i.state !== 'complete'; });
  var porCod = kc.length >= 4 ? cands.filter(function (i) { return cp_norm_(i.name).indexOf(kc) >= 0; })[0] : null;
  if (porCod) return porCod;
  var melhor = null, nota = 0;
  cands.forEach(function (i) {
    var base = String(i.name).replace(/^[A-Z0-9][A-Z0-9.\-\/]{3,}\s+/i, '').split(/\s+[-—]\s+/)[0];
    var n = cp_similar_(desc, base);
    if (n > nota) { nota = n; melhor = i; }
  });
  return melhor;
}

/** Troca o código antigo pelo novo no texto abaixo do marcador (cotações, autorizações, compras), palavra inteira. */
function cp_trocarCodigos_(texto, atualizar) {
  var t = String(texto || '');
  (atualizar || []).forEach(function (u) {
    if (!u.codigo || !u.codigoAntigo || u.codigo === u.codigoAntigo) return;
    t = t.replace(new RegExp('(^|[^A-Z0-9])' + String(u.codigoAntigo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Z0-9])', 'gi'), '$1' + u.codigo);
  });
  return t;
}

/** Aplica `atualizar` (código novo / valor novo) nas linhas de peça do bloco; devolve o bloco. */
function cp_atualizarNoBloco_(bloco, atualizar) {
  if (!atualizar || !atualizar.length) return bloco;
  var linhas = String(bloco || '').split('\n'), lp = vd_linhasPecas_(bloco);
  var alvo = {}; atualizar.forEach(function (u) { alvo[u.chave] = u; });
  var idx = {}; (lp.idx || []).forEach(function (ix, k) { idx[k] = ix; });
  lp.linhas.forEach(function (l, k) {
    var p = vd_analisarPeca_(l, k + 1, {});
    var u = alvo[vd_chavePeca_(p)]; if (!u) return;
    if (u.codigo) p.codigo = u.codigo;
    if (u.valorOrc) p.valorOrc = u.valorOrc;
    var ix = idx[k]; if (ix === undefined) return;
    var num = (linhas[ix].match(/^\s*(\d+)\s*[.)]/) || [])[1];
    linhas[ix] = vd_linhaPeca_(p, num ? +num - 1 : k);
  });
  return linhas.join('\n');
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
      medida: p.medida || '', categoria: p.categoria || '', marca: p.marca || '', qtd: p.qtd || '', complemento: true, compData: p.compData || data, valorOrc: p.valorOrc || '' };
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
    : ((String(p.codigo || p.codigoOrc || '').replace(/\s+/g, '') + ' ').trim() + ' ' + String(p.descricao || p.descricaoOrc || '')).trim() + (p.qtd && +p.qtd > 1 ? ' (x' + p.qtd + ')' : '');
}

/** Texto do comentário do complemento. */
function cp_textoComentario_(quem, origem, anexo, novas, foNovas, jaTinha, urlTipos, pareadas, atualizadas, paraOficina) {
  var semTipo = novas.some(function (p) { return !(p.tipos || []).length; });
  var t = '📄 **ORÇAMENTO COMPLEMENTAR**' + (origem ? ' (' + origem + ')' : '') + (quem ? ' — ' + quem : ' — robô') + (jaTinha ? ' · ' + jaTinha + ' já estavam no card' : '');
  if (novas.length) t += '\n➕ **Oficina:** ' + novas.map(cp_nome_).join('; ') + (semTipo ? ' — _marcar o tipo_' : '');
  if (foNovas.length) t += '\n📦 **FO (' + CP.FO + '):** ' + foNovas.map(cp_nome_).join('; ');
  // peça pedida antes (marcada ➕ COMPLEMENTO à mão) que o PDF confirmou: não entra de novo
  (pareadas || []).forEach(function (x) {
    t += '\n🔁 **Já pedida:** ' + x.card + ' = ' + x.orc + ' no complementar' + (x.fo ? ' — ⚠️ a seguradora vai FORNECER esta peça (no card está como peça da oficina): conferir' : '') + ' — não repetida';
  });
  (paraOficina || []).forEach(function (x) {
    t += '\n🔁 **Passou para a oficina:** ' + cp_nome_(x.peca) + ' — era fornecida pela seguradora (' + String(x.item.name).split(/\s+[-—]\s+/)[0] + '), saiu do checklist ' + (x.item.lista || 'FORNECIMENTO') + ' · verificar compra do item';
  });
  (atualizadas || []).forEach(function (u) {
    t += '\n🔄 **Atualizada:** ' + (u.codigoAntigo || u.chave) + (u.codigo ? ' → código ' + u.codigo : '') + (u.valorOrc ? ' · orç. ' + u.valorOrc : '');
  });
  if (urlTipos && semTipo) t += '\n✏️ ' + urlTipos;
  return t;
}

/* ---------- caminho 1: formulário ---------- */

/** Formulário: compara um orçamento lido com o card. o = {oficina, fo}, idAnexo = anexo lido (se já está no card). */
function vdf_compararComplemento(token, shortLink, o, idAnexo) {
  vdf_usuario_(token);
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard', checklists: 'all', checkItem_fields: 'name', attachments: 'true', attachment_fields: 'name' } });
  var r = cp_comparar_(card, { oficina: (o && o.oficina) || [], fo: (o && o.fo) || [] }, idAnexo || '');
  return { oficina: r.oficina, fo: r.fo, jaTinha: r.jaTinha, pareadas: r.pareadas, atualizar: r.atualizar || [], paraOficina: (r.paraOficina || []).map(function (x) { return { itemId: x.item.id, nome: x.item.name, lista: x.item.lista || '', peca: cp_nome_(x.peca) }; }) };
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
  // anexos cuja leitura falhou (OCR do Google fora do ar na hora): tenta de novo nos ciclos seguintes, até 3 vezes (07/10/2026)
  var retry = []; try { retry = JSON.parse(props.getProperty('CP_RETRY') || '[]'); } catch (e) {}
  var retryNovo = [], n = 0, mudou = false;
  retry.forEach(function (x) {
    if (Date.now() > prazo) { retryNovo.push(x); return; }
    var a; try { a = vd_api_('/cards/' + x.c + '/attachments/' + x.a, { cru: true, query: { fields: 'name,mimeType,isUpload,bytes,url,date' } }); } catch (e) { return; }
    var res = false; try { res = cp_doAnexo_({ id: x.c, name: x.nome || '' }, a, ctx); } catch (e) { console.log('complemento (retry) ' + x.nome + ': ' + e); }
    if (res === 'erro' && x.n < 3) retryNovo.push({ c: x.c, a: x.a, nome: x.nome, n: x.n + 1 });
    else if (res === true) n++;
  });
  if (retry.length !== retryNovo.length || retry.length) props.setProperty('CP_RETRY', JSON.stringify(retryNovo.slice(-20)));
  var acts = vd_acoesQuadro_(ctx.board, { filter: 'addAttachmentToCard', since: desde, limit: 100, fields: 'data,date', memberCreator: 'true', memberCreator_fields: 'username' });
  if (!acts.length) return n;
  acts.reverse();   // mais antigo primeiro
  var ultima = desde;
  for (var k = 0; k < acts.length; k++) {
    if (Date.now() > prazo) break;
    var ac = acts[k], d = ac.data || {}, c = d.card || {}, at = d.attachment || {};
    ultima = new Date(new Date(ac.date).getTime() + 1).toISOString();
    if (!c.id || !at.id || vistos.indexOf(at.id) >= 0) continue;
    if (vdf_cardProtegido_(c.name || '') || /^\s*AVISO\b/i.test(c.name || '') || /NOVO PEDIDO DE PE[ÇC]A/i.test(c.name || '')) continue;
    if (vd_legado_(c.id)) continue;
    var a;
    try { a = vd_api_('/cards/' + c.id + '/attachments/' + at.id, { cru: true, query: { fields: 'name,mimeType,isUpload,bytes,url,date' } }); } catch (e) { continue; }
    // mesmo arquivo subido de novo à mão (conteúdo igual, conferido por hash): apaga o repetido e comenta (06/10/2026)
    if (a.isUpload && ax_removerRepetido_(c.id, a, ac.memberCreator ? ac.memberCreator.username : '')) { vistos.push(a.id); mudou = true; continue; }
    if (!vd_anexoLegivel_(a)) continue;
    if (new Date(a.date).getTime() - cp_criadoEm_(c.id) <= CP.ESPERA_CRIACAO_MS) continue;   // orçamento original do card
    vistos.push(a.id); mudou = true;
    try {
      var res2 = cp_doAnexo_(c, a, ctx);
      if (res2 === true) n++;
      else if (res2 === 'erro') { retryNovo.push({ c: c.id, a: a.id, nome: c.name || '', n: 1 }); props.setProperty('CP_RETRY', JSON.stringify(retryNovo.slice(-20))); }
    } catch (e) { console.log('complemento ' + c.name + ': ' + e); }
  }
  vd_marcaSet_('CP_ACT', ultima);
  if (mudou) props.setProperty('CP_VISTOS', JSON.stringify(vistos.slice(-CP.MAX_VISTOS)));
  return n;
}

/** Lê UM anexo novo; se for orçamento da mesma placa com peças novas, aplica o complemento.
 *  Devolve true (complemento aplicado), false (nada a fazer) ou 'erro' (não conseguiu ler — tentar de novo depois). */
function cp_doAnexo_(c, a, ctx) {
  var r = vd_lerAnexoTrello_(a, { orcCompleto: true });
  if (!r || r.erro) return r && r.erro ? 'erro' : false;
  var card = vd_api_('/cards/' + c.id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name', attachments: 'true', attachment_fields: 'name' } });
  var an = vd_analisar_(card.desc || '', card.name);
  var lp = vd_linhasPecas_(an.div.bloco);
  // nome padronizado para o anexo subido à mão (05/10/2026): orçamento (complementar se o card já tem peças) ou Status do Pedido
  ax_batizarLido_(card, a, r, !!(lp.linhas.length || (card.attachments || []).some(function (x) { return String(x.name || '').indexOf(AX.ORC + AX.SEP) === 0; })));
  if (!r.orcamento) return false;
  if (!lp.linhas.length && !lp.semOficina) return false;   // card sem lista: a importação normal cuida
  var placa = an.dados.placa;
  if (!placa || !(r.placas || []).some(function (p) { return vd_mesmaPlaca_(p, placa); })) return false;
  var orc = r.orcFull || (r.orc ? { oficina: vd_orcExpandir_(r.orc.o), fo: vd_orcExpandir_(r.orc.f) } : null);
  if (!orc) return false;
  var cmp = cp_comparar_(card, orc, a.id);
  if (!cmp.oficina.length && !cmp.fo.length && !(cmp.atualizar || []).length) return false;
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
  var blocoAtu = cp_atualizarNoBloco_(div.bloco, cmp.atualizar);
  var resto = cp_trocarCodigos_(div.resto, cmp.atualizar);   // cotações/autorizações/compras abaixo da linha seguem o código novo
  // código trocado não é peça nova: a base de assinaturas passa a ser a lista atualizada (as peças novas de verdade ficam fora dela)
  if ((cmp.atualizar || []).some(function (u) { return u.codigo; })) { try { vd_pkSet_(card.id, vd_linhasConsultor_(blocoAtu).map(vd_sigItem_)); } catch (e) {} }
  var bloco = cp_inserirNoBloco_(blocoAtu, cmp.oficina, nFoTotal);
  vd_backup_(card, 'orçamento complementar (' + (o.origem || '') + ')');
  // peça que passou de FO para oficina: sai do checklist FORNECIMENTO (a linha da oficina já entrou acima)
  (cmp.paraOficina || []).forEach(function (x) {
    try { vd_api_('/cards/' + card.id + '/checkItem/' + x.item.id, { method: 'delete' }, o.token); } catch (e) { console.log('complemento/FO→oficina: ' + e); }
  });
  vd_gravarDesc_(card.id, bloco + (div.temMarcador ? '\n\n' + resto : '\n\n' + VD.MARCADOR), o.token);
  var quem = ''; try { quem = vd_criador_(card.id); } catch (e) {}
  var url = o.ctx && o.ctx.urlForm ? o.ctx.urlForm + '?card=' + card.shortLink + '&so=tipos' : '';
  try { vd_comentar_(card, (quem && cmp.oficina.length ? '@' + quem + ' ' : '') + cp_textoComentario_('', o.origem, o.anexo, cmp.oficina, cmp.fo, cmp.jaTinha, url, cmp.pareadas, cmp.atualizar, cmp.paraOficina)); } catch (e) {}
  try {
    ev_registrar_('COMPLEMENTO', card, o.quem || 'robô', cmp.oficina.map(ev_peca_).concat(cmp.fo.map(function (p) { var e = ev_peca_(p); e.fornecedor = 'SEGURADORA (FO)'; return e; })),
      { detalhe: cmp.oficina.length + ' oficina · ' + cmp.fo.length + ' FO · ' + (o.origem || '') });
  } catch (e) {}
  // só FO nova num card já encerrado: volta para FALTA CHEGAR (peça da oficina nova o robô devolve para cotação)
  if (cmp.fo.length && !cmp.oficina.length) { try { rc_reavaliarColuna_(card.id, o.token, o.quem || 'robô'); } catch (e) { console.log('complemento/coluna: ' + e); } }
}

/* ============================ FO QUE TAMBÉM ESTÁ NA OFICINA ============================
 * 07/10/2026 (RHM1J09): o orçamento dizia que a seguradora fornecia a MOLDURA (checklist FORNECIMENTO), mas a diretoria
 * mandou a oficina comprar e a peça entrou na lista PEÇAS (foi cotada, autorizada e comprada). O item FO pendente ficou
 * sobrando e segurava o card em FALTA CHEGAR. Regra: peça da oficina (lista PEÇAS, não "não comprar") com o MESMO CÓDIGO de
 * um item FORNECIMENTO ainda não entregue -> o item FO sai (a oficina venceu), com comentário. Roda no formulário (salvar
 * pedido, autorização) e no núcleo do robô. Devolve os nomes dos itens removidos. */
function cp_foNaOficina_(card, token, quem) {
  var an;
  try { an = vd_analisar_(card.desc || '', card.name || ''); } catch (e) { return []; }
  var codigos = {};
  (an.pecas || []).forEach(function (p) { var k = cp_norm_(p.codigo); if (k.length >= 4) codigos[k] = p; });
  if (!Object.keys(codigos).length) return [];
  var removidos = [];
  (card.checklists || []).forEach(function (k) {
    if (!/^FORNECIMENTO/i.test(String(k.name || '').trim())) return;
    (k.checkItems || []).forEach(function (i) {
      if (i.state === 'complete') return;
      var m = vd_semAcento_(i.name).match(/^([A-Z0-9][A-Z0-9.\-\/]{3,})\s/);
      var kc = m ? cp_norm_(m[1]) : '';
      if (!kc || !codigos[kc]) return;
      try {
        vd_api_('/cards/' + card.id + '/checkItem/' + i.id, { method: 'delete' }, token);
        removidos.push(i.name);
      } catch (e) { console.log('FO na oficina: ' + e); }
    });
  });
  if (!removidos.length) return [];
  try {
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🔁 **Passou para a oficina** — ' + (quem || 'robô') + ': a peça está na lista da oficina (cotação/compra pela oficina), então saiu do checklist FORNECIMENTO: ' + removidos.map(function (n) { return n.split(/\s+[-—]\s+/)[0]; }).join('; ') } }, token);
  } catch (e) {}
  try { ev_registrar_('COMPLEMENTO', card, quem || 'robô', removidos.map(function (n) { return { peca: n.split(/\s+[-—]\s+/)[0], detalhe: 'FO → OFICINA (mesmo código na lista da oficina)' }; }), { detalhe: 'FO removida: ' + removidos.length }); } catch (e) {}
  return removidos;
}
