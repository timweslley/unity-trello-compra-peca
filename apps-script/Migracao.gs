/* ============================ MIGRAÇÃO DOS CARDS ANTIGOS PARA O FLUXO NOVO ============================
 * Card "antigo" = criado antes da virada e sem cópia completa na aba TRAVA (vd_legado_). A conversão monta a
 * descrição no padrão (dados do carro + PEÇAS: + fornecimento) a partir do que o card já tem — texto livre,
 * checklists PAGAS/FORNECIMENTO, título — e grava com vd_gravarDesc_ (vitrine + cópia completa). Nada muda de coluna.
 *
 *   mg_simularNoTeste(n)  : SIMULAÇÃO — só lê o principal; copia até n cards ativos antigos para o TESTE (mesma
 *                           coluna, anexos e checklists) e converte a CÓPIA. Relatório na aba MIGRACAO + Logger.
 *                           Pode rodar várias vezes: pula o que já foi simulado.
 *   mg_limparSimulacao()  : arquiva as cópias simuladas no TESTE e limpa a aba.
 *   mg_converter_(card)   : a conversão em si (reaproveitada pela migração real, quando/se for aprovada).
 *
 * Fora da conversão (fica para a migração real, não para a simulação): campos personalizados (Unidade, Nº Ordem),
 * bases de peça/prazo para o 1º ciclo não avisar. O texto original fica abaixo do marcador e também vai para um
 * comentário "Texto antigo do card"; menções (@) são neutralizadas para ninguém ser notificado.
 */
var MG = {
  ORIGEM: 'oH4TbTqb',
  DESTINO: 'ZX4gRmnX',
  FORA: ['ESPERA/NÃO AUTORIZADO', 'ENTREGUES', 'ENCERRADO COMPRAS/FORNEC.'],
  ABA: 'MIGRACAO',
  LIMITE_MS: 5 * 60 * 1000
};

function mg_aba_() {
  var ss = vd_planilhaBackup_().getParent(), sh = ss.getSheetByName(MG.ABA);
  if (!sh) {
    sh = ss.insertSheet(MG.ABA);
    sh.appendRow(['Card principal (id)', 'Card TESTE (id)', 'Link TESTE', 'Nome', 'Coluna', 'Fonte das peças', 'Peças oficina', 'Compras (forn/valor)', 'FO', 'Modelo', 'Ano', 'Chassi', 'Tipo', 'Nº ordem (comentários)', 'Avisos do parser', 'Quando']);
    sh.setFrozenRows(1);
  }
  return sh;
}
function mg_jaSimulados_() {
  var sh = mg_aba_(), n = sh.getLastRow(), m = {};
  if (n < 2) return m;
  sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r) { if (r[0]) m[r[0]] = r[1]; });
  return m;
}

/** Cards ativos do principal que ainda são "antigos" (ordem: colunas de cotação primeiro, depois as demais). */
function mg_candidatos_() {
  var listas = {};
  vd_api_('/boards/' + MG.ORIGEM + '/lists', { cru: true, query: { fields: 'name' } }).forEach(function (l) { listas[l.id] = vd_nomeColuna_(l.name); });
  var cards = vd_api_('/boards/' + MG.ORIGEM + '/cards', { cru: true, query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state,due' } }) || [];
  var out = cards.filter(function (c) {
    var col = listas[c.idList] || '';
    if (MG.FORA.indexOf(col) >= 0) return false;
    if (vdf_cardProtegido_(c.name || '') || /^\s*AVISO\b/i.test(c.name || '')) return false;
    if (!vd_placaDoTexto_(c.name || '') && !vd_placaDoTexto_(vd_campo_(vd_limpar_(c.desc || ''), VD_ROT.placa))) return false;   // sem placa: não é pedido de peça (ex.: cards de notas do Qive)
    return vd_legado_(c.id);
  }).map(function (c) { c.coluna = listas[c.idList] || ''; return c; });
  var ordem = ['FALTA DADOS PARA COTAR', 'EM COTAÇÃO', 'COTAÇÃO FINALIZADA', 'PENDENTE AUTORIZAR', 'AUTORIZADO COMPRA', 'FALTA CHEGAR'];
  out.sort(function (a, b) { var ia = ordem.indexOf(a.coluna), ib = ordem.indexOf(b.coluna); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  return out;
}

/* ---------- conversão ---------- */

/** "87610R1530 ESPELHO RETROVISOR ESQ - IMPERIAL - R$ 420" -> {codigo, descricao}. */
function mg_item_(txt) {
  var s = vd_limpar_(String(txt || '')).trim();
  s = s.replace(/^\s*(?:\d{1,3}\s*[.)]|[-•*✔✓☐☑])\s*/, '').trim();   // numeração/bullet (não um código numérico seguido de " - ")
  var partes = s.split(/\s+-\s+|\s+[–—]\s+/);
  if (partes.length > 1 && /R\$|\d+[.,]\d{2}\b|\bDIAS?\b|PREVIS/i.test(partes.slice(1).join(' '))) s = partes[0].trim();
  var qtd = '';
  var mq = s.match(/\b(?:QTD\.?\s*:?\s*(\d+)|(\d+)\s*(?:X|UN|PÇ|PC)S?\.?)\s*$/i);
  if (mq) { qtd = mq[1] || mq[2]; s = s.slice(0, mq.index).trim(); }
  var pneu = s.match(/\bPNEUS?\b.*?(\d{3}\/\d{2}\s*Z?R\s*\d{2}(?:[.,]5)?)/i) || s.match(/^(\d{3}\/\d{2}\s*Z?R\s*\d{2})/i);
  if (pneu) {
    var medida = pneu[1].replace(/\s+/g, '').toUpperCase();
    var marca = s.replace(/\bPNEUS?\b/i, '').replace(pneu[1], '').replace(/^\s*[A-Z0-9]*\d[A-Z0-9]*\s+/i, '').replace(/\s+/g, ' ').trim();   // tira só um código numérico na frente
    return { pneu: true, medida: medida, categoria: vd_categPneu_(marca), marca: vd_categPneu_(marca) ? '' : marca, qtd: qtd };
  }
  var toks = s.split(/\s+/), codigo = '', descricao = s;
  var ehCod = function (t) { t = String(t || '').replace(/[^A-Z0-9\-.\/]/gi, ''); return /\d/.test(t) && t.replace(/[^A-Z0-9]/gi, '').length >= 4 && !/^\d{1,3}$/.test(t) && !/^\d{2,4}\/\d{2,4}$/.test(t); };
  if (toks.length > 1 && ehCod(toks[0])) { codigo = toks[0].replace(/[^A-Z0-9\-.\/]/gi, '').toUpperCase(); descricao = toks.slice(1).join(' '); }
  else if (toks.length > 1 && ehCod(toks[toks.length - 1]) && toks[toks.length - 1].replace(/[^A-Z0-9]/gi, '').length >= 6) { codigo = toks[toks.length - 1].replace(/[^A-Z0-9\-.\/]/gi, '').toUpperCase(); descricao = toks.slice(0, -1).join(' '); }
  descricao = descricao.replace(/^[\s:\-–]+/, '').trim().toUpperCase();
  return { pneu: false, codigo: codigo, descricao: descricao, tipos: [], qtd: qtd };
}

/** Item do checklist PAGAS no formato antigo "FORNECEDOR - [CÓDIGO] PEÇA [CÓDIGO] - R$valor" (ou já no novo
 *  "CÓDIGO PEÇA - FORNECEDOR - R$ valor"). Devolve {codigo, descricao, fornecedor, valor, pneu...} e o nome no formato novo. */
function mg_itemPagas_(nome) {
  var s = vd_limpar_(String(nome || '')).trim(), valor = '';
  if (/^(NOTA FISCAL|NF\b|NFE?\b|FRETE|BOLETO)/i.test(s)) return null;   // não é peça
  var mv = s.match(/\s*-?\s*R\$\s*([\d.]+(?:,\d{1,2})?)\s*$/i);
  if (mv) { valor = mv[1]; s = s.slice(0, mv.index).trim(); }
  var partes = s.split(/\s*-\s*/).map(function (x) { return x.trim(); }).filter(String), fornecedor = '', resto = s;
  if (partes.length >= 2) {
    var ehCodigoOuPeca = function (t) { return /\d{4,}/.test(t.split(/\s+/)[0]) || /\d{4,}/.test(t.split(/\s+/).pop()); };
    if (ehCodigoOuPeca(partes[0]) && !ehCodigoOuPeca(partes[partes.length - 1])) { fornecedor = partes[partes.length - 1]; resto = partes.slice(0, -1).join(' - '); }   // formato novo
    else { fornecedor = partes[0]; resto = partes.slice(1).join(' - '); }   // formato antigo
    if (/^\d/.test(fornecedor) && !mg_ehFornecedor_(fornecedor)) { fornecedor = ''; resto = s; }
  }
  var it = mg_item_(resto);
  it.fornecedor = fornecedor.toUpperCase();
  it.valor = valor;
  var cab = it.pneu ? 'PNEU ' + it.medida + (it.marca || it.categoria ? ' ' + (it.marca || it.categoria) : '') : ((it.codigo ? it.codigo + ' ' : '') + it.descricao);
  it.nomeNovo = cab + (it.fornecedor ? ' - ' + it.fornecedor : '') + (valor ? ' - ' + vd_valorBR_(valor) : '');
  return it;
}

/** Linha que parece um item de peça (curta, sem rótulo, sem preço/prazo). */
var MG_FORN = null;
function mg_ehFornecedor_(l) {
  if (MG_FORN === null) { MG_FORN = {}; try { fo_lista_().forEach(function (f) { MG_FORN[fo_norm_(f.nome)] = 1; (f.apelidos || []).forEach(function (a) { MG_FORN[fo_norm_(a)] = 1; }); }); } catch (e) {} }
  var n = fo_norm_(l).replace(/\s+(NT|ND|PE|LINK|GENUINO|USADA|USADO)$/, '').trim();
  return !!MG_FORN[n] || /^(MERCADO LIVRE|ML|SHOPEE|AMAZON)\b/i.test(n);
}
function mg_ehItem_(l) {
  if (!l || l.length > 90 || /:/.test(l) || !/[A-Za-zÀ-ú]{3,}/.test(l)) return false;
  if (l.split(/\s+/).length > 7 || /\b(PRECISO|GENTILEZA|CONSIDERAR|PODE SER|SE N[ÃA]O|FAVOR|OBRIGAD|APRESENTAR|SOMENTE|APENAS)\b/i.test(l)) return false;
  if (/^[A-Z]{3}[\s-]?\d[A-Z0-9]\d{2}\b/.test(l) || /\b[A-HJ-NPR-Z0-9]{17}\b/.test(l)) return false;   // placa / chassi
  if (mg_ehFornecedor_(l) || /(\s-?\s*(NT|ND|N\/T|N[ÃA]O TEM)|\s[-–])\s*$/i.test(l)) return false;   // "FORNECEDOR - NT" é consulta, não peça
  if (/R\$|\d+[.,]\d{2}\b|\b(DIAS?|PRAZO|PREVIS|ENTREG|CHEG|PAGO|PAGA|NOTA|NF|ORÇAMENTO|FATUR)\b/i.test(l)) return false;
  if (/^(FOTOS?|SEGUE|EM ANEXO|OBS|AGUARD|CONFORME|VERIFICAR|FOI |SER[ÁA] |COMPRAR|COTAR|PE[ÇC]AS|PEDIDO|N[ÃA]O |JA |J[ÁA] |CLIENTE|LIBERADO|AUTORIZAD)/i.test(l)) return false;
  return true;
}
function mg_ehRotulo_(l) { return /^\s*(MODELO|VE[IÍ]CULO|ANO|MOTOR|CHASSI|PLACA|COR|SEGURADORA|SINISTRO|TIPO|OBS|OBSERVA[ÇC][ÃA]O|UNIDADE|CONSULTOR)\b/i.test(l) || /^\s*COMPRAR\b.*\d{1,2}\/\d{1,2}/i.test(l); }
function mg_ehSeparador_(l) { return /^[\\\-=_ .~]{3,}$/.test(l); }

/** Linhas de peça no texto livre: bloco depois de PEÇAS:/COTAR:/PEDIDO: ou, sem cabeçalho, o primeiro bloco de linhas "de item". */
function mg_pecasDoTexto_(desc, modeloLinha) {
  modeloLinha = String(modeloLinha || '').trim();
  var linhas = vd_limpar_(desc).split('\n').map(function (l) { return l.trim(); }), ini = -1, i;
  for (i = 0; i < linhas.length; i++) {
    if (/^(PE[ÇC]AS|COTAR|PEDIDO|COMPRAR|ITENS)\s*(PE[ÇC]AS)?\s*:?\s*$/i.test(linhas[i]) || /^(PE[ÇC]AS|COTAR)\s*:\s*\S/i.test(linhas[i])) { ini = i; break; }
  }
  var out = [], vazias = 0, comecou = false;
  if (ini >= 0) {
    var primeiro = linhas[ini].replace(/^(PE[ÇC]AS|COTAR|PEDIDO|COMPRAR|ITENS)\s*(PE[ÇC]AS)?\s*:?\s*/i, '').trim();
    if (primeiro) { out.push(primeiro); comecou = true; }
    for (i = ini + 1; i < linhas.length; i++) {
      var l = linhas[i];
      if (!l) { if (comecou && ++vazias > 1) break; continue; }
      if (mg_ehSeparador_(l) || /^(FORNECIMENTO|FO\b)/i.test(l)) break;
      if (/R\$\s*\d|\d{2,}[.,]\d{1,2}\s*$/.test(l) && comecou) break;
      if (!mg_ehItem_(l) && !/^\d/.test(l) && !/\s-\s/.test(l)) { if (comecou) break; else continue; }
      out.push(l); comecou = true; vazias = 0;
    }
    return out;
  }
  // sem cabeçalho: primeiro bloco de linhas que parecem itens (depois dos rótulos MODELO/CHASSI/PLACA)
  for (i = 0; i < linhas.length; i++) {
    var l2 = linhas[i];
    if (!l2) { if (comecou && ++vazias > 1) break; continue; }
    if (mg_ehRotulo_(l2) || mg_ehSeparador_(l2)) { if (comecou) break; else continue; }
    if (!comecou && (/\b(19[89]\d|20[0-4]\d)(\s*\/\s*(19[89]\d|20[0-4]\d))?\s*$/.test(l2) || l2 === modeloLinha)) continue;   // linha do modelo
    if (/R\$\s*\d|\d{2,}[.,]\d{1,2}\s*$/.test(l2)) { if (comecou) break; else continue; }
    var item = mg_ehItem_(l2) || (/^[A-Z0-9][A-Z0-9\-.\/]{3,}\s*[-–:]\s*\S/i.test(l2) && !/R\$/.test(l2));
    if (item) { out.push(l2); comecou = true; vazias = 0; }
    else if (comecou) break;
  }
  return out.filter(function (l) { return l.length > 2; });
}

/** Modelo quando não há linha "MODELO:": primeira linha "de carro" do texto (maiúscula, sem rótulo, sem preço). */
function mg_modeloDoTexto_(desc) {
  var linhas = vd_limpar_(desc).split('\n');
  for (var i = 0; i < Math.min(linhas.length, 6); i++) {
    var l = linhas[i].trim();
    if (!l || /:/.test(l) || /R\$|COTAR|PE[ÇC]AS|FOTO/i.test(l)) continue;
    if (l.length < 8 || l.length > 90 || !/[A-Z]{3,}/.test(l) || l !== l.toUpperCase()) continue;
    var carro = /\b(19[89]\d|20[0-4]\d)\b/.test(l) || /\b(FIAT|VW|VOLKS|CHEVROLET|GM|FORD|HONDA|TOYOTA|HYUNDAI|RENAULT|NISSAN|JEEP|BMW|AUDI|MERCEDES|PEUGEOT|CITRO|KIA|MITSUBISHI|BYD|GWM|CAOA|CHERY|RAM|DODGE|VOLVO|LAND ROVER|JAC|SUZUKI|YAMAHA|IVECO|SCANIA|PORSCHE|MINI|LEXUS|SUBARU|TROLLER|HAVAL|OMODA|JAECOO)\b/.test(l);
    if (carro) return l;
  }
  return '';
}

/** Nº da O.S. citado nos comentários ("lançados na O.S. 2002", "OS 2105", "ordem 1987"). */
function mg_ordemDosComentarios_(comentarios) {
  var ns = {};
  (comentarios || []).forEach(function (t) {
    var re = /\b(?:O\.?\s*S\.?|ORDEM(?:\s+DE\s+SERVI[ÇC]O)?)\s*(?:N[ºo°.]*\s*)?:?\s*(\d{3,6})\b/gi, m;
    while ((m = re.exec(String(t || '')))) ns[m[1]] = (ns[m[1]] || 0) + 1;
  });
  var melhor = '', q = 0;
  Object.keys(ns).forEach(function (k) { if (ns[k] > q) { q = ns[k]; melhor = k; } });
  return melhor;
}

function mg_neutralizar_(txt) { return String(txt || '').replace(/(^|[^A-Za-z0-9_.])@(?=[A-Za-z0-9_]{3,})/g, '$1👤'); }

/**
 * Converte um card antigo: devolve {desc, info}. card = {name, desc, checklists, labels}, comentarios = [texto].
 * Não grava nada.
 */
function mg_converter_(card, comentarios) {
  var desc = String(card.desc || ''), limpo = vd_limpar_(desc);
  var nome = card.name || '';
  var placa = vd_normPlaca_((vd_campo_(limpo, VD_ROT.placa).split(/[\s(]/)[0]) || '') || vd_placaDoTexto_(nome) || '';
  var d = {
    modelo: vd_campo_(limpo, VD_ROT.modelo) || mg_modeloDoTexto_(desc),
    ano: vd_campo_(limpo, VD_ROT.ano),
    motor: vd_campo_(limpo, VD_ROT.motor),
    chassi: vd_normChassi_(vd_campo_(limpo, VD_ROT.chassi).split(/[\s(]/)[0]),
    placa: placa
  };
  if (!d.ano && d.modelo) { var am = d.modelo.match(/\b(19[89]\d|20[0-4]\d)\b/g); if (am) { d.ano = am.slice(0, 2).join('/'); d.modelo = d.modelo.replace(/\s*\b(19[89]\d|20[0-4]\d)(\s*\/\s*(19[89]\d|20[0-4]\d))?\b\s*$/, '').trim(); } }
  var t = vdf_partesTitulo_(nome, { modelo: d.modelo });
  var tipo = vd_tipoNormPedido_(vd_campo_(limpo, VD_ROT_EXTRA.tipo)) || (/\bPARTICULAR\b/i.test(nome) || /PARTICULAR/i.test((card.labels || []).map(function (l) { return l.name; }).join(' ')) ? 'PARTICULAR' : 'SEGURADORA');
  var seguradora = vd_campo_(limpo, VD_ROT_EXTRA.seguradora) || (tipo === 'PARTICULAR' ? '' : t.seguradora);
  var sinistro = vd_campo_(limpo, VD_ROT_EXTRA.sinistro);

  // peças da oficina: checklist PAGAS* > bloco no texto
  var fonte = 'nenhuma', pecas = [], fo = [], renomear = [], compras = 0;
  (card.checklists || []).forEach(function (k) {
    var n = String(k.name || '').trim();
    if (/^PAGAS/i.test(n)) (k.checkItems || []).forEach(function (i) {
      var it = mg_itemPagas_(i.name); if (!it) return;
      pecas.push(it); if (it.fornecedor || it.valor) compras++;
      if (it.nomeNovo && it.nomeNovo !== String(i.name).trim()) renomear.push({ de: String(i.name).trim(), para: it.nomeNovo });
    });
    else if (/^FORNECIMENTO/i.test(n)) (k.checkItems || []).forEach(function (i) { fo.push(mg_item_(i.name)); });
  });
  if (pecas.length) fonte = 'checklist PAGAS';
  else {
    var lp = mg_pecasDoTexto_(desc, vd_campo_(limpo, VD_ROT.modelo) ? '' : mg_modeloDoTexto_(desc));
    if (lp.length) { pecas = lp.map(mg_item_); fonte = 'texto da descrição'; }
    else if (fo.length) fonte = 'só fornecimento (checklist FORNECIMENTO)';
  }
  pecas = pecas.filter(function (p) { return p.pneu ? p.medida : p.descricao; });
  if (tipo === 'PARTICULAR') pecas.forEach(function (p) { p.particular = false; });   // pedido particular: o TIPO: PARTICULAR já marca tudo

  var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  var extra = { tipo: tipo, cor: t.cor, seguradora: seguradora, sinistro: sinistro, fo: fo };
  var bloco = vd_montarBloco_(d, pecas, '', 'Convertido do fluxo antigo pelo robô em ' + hoje + ' — tipo de peça e cotações antigas: ver o texto original abaixo', extra);
  var original = mg_neutralizar_(desc).trim();
  var descNova = bloco + '\n\n' + VD.MARCADOR + (original ? '\n_(texto que estava no card antes da conversão)_\n' + original : '');
  var an = vd_analisar_(descNova, nome);
  return {
    desc: descNova, renomear: renomear,
    info: { fonte: fonte, pecas: pecas.length, fo: fo.length, compras: compras, modelo: d.modelo, ano: d.ano, chassi: d.chassi, tipo: tipo,
            ordem: mg_ordemDosComentarios_(comentarios), avisos: an.faltas.slice(0, 6).join(' | ') + (an.faltas.length > 6 ? ' (+' + (an.faltas.length - 6) + ')' : '') }
  };
}

/* ---------- simulação no TESTE ---------- */

function mg_guardaSimulacao_() {
  if (MG.ORIGEM === MG.DESTINO) throw new Error('origem = destino');
  if (vd_board_() === MG.DESTINO) throw new Error('O sistema está apontado para o TESTE — a simulação copia do principal para o TESTE, não faz sentido agora.');
}

function mg_simularNoTeste(n) {
  mg_guardaSimulacao_();
  n = +n || 10;
  var fim = Date.now() + MG.LIMITE_MS, feitos = 0, rel = [];
  var ja = mg_jaSimulados_(), espelho = {};
  try { espelho = es_mapa_(); } catch (e) {}
  var listasDest = vd_listas_(MG.DESTINO);
  var sh = mg_aba_();
  var cands = mg_candidatos_().filter(function (c) { return !ja[c.id]; });
  Logger.log('candidatos antigos ativos: ' + (cands.length + Object.keys(ja).length) + ' · já simulados: ' + Object.keys(ja).length + ' · nesta rodada: até ' + n);
  for (var i = 0; i < cands.length && feitos < n && Date.now() < fim; i++) {
    var c = cands[i];
    try {
      var idL = listasDest[c.coluna];
      if (!idL) { var nl = vd_api_('/lists', { method: 'post', payload: { name: c.coluna, idBoard: MG.DESTINO, pos: 'bottom' } }); idL = listasDest[c.coluna] = nl.id; }
      // cópia antiga do espelho (pré-virada) do mesmo card: arquiva, para não ficar em dobro no TESTE
      if (espelho[c.id]) { try { vd_api_('/cards/' + espelho[c.id], { method: 'put', payload: { closed: true } }); } catch (e) {} }
      var comentarios = [];
      try { comentarios = (vd_api_('/cards/' + c.id + '/actions', { cru: true, query: { filter: 'commentCard', limit: 50, fields: 'data' } }) || []).map(function (a) { return a.data && a.data.text; }); } catch (e) {}
      var novo = vd_api_('/cards', { method: 'post', query: { idList: idL, idCardSource: c.id, keepFromSource: 'attachments,checklists,due,start,labels', pos: 'top' } });
      try { ck_licenca_('/cards/' + novo.id + '/checklists'); } catch (e) {}
      var r = mg_converter_(c, comentarios);
      var ren = 0; try { ren = mg_renomearPagas_(novo.id, r.renomear); } catch (e) { console.log('renomear: ' + e); }
      vd_gravarDesc_(novo.id, r.desc);
      sh.appendRow([c.id, novo.id, novo.shortUrl || '', c.name, c.coluna, r.info.fonte, r.info.pecas, r.info.compras, r.info.fo, r.info.modelo, r.info.ano, r.info.chassi, r.info.tipo, r.info.ordem, r.info.avisos, new Date()]);
      rel.push('✅ ' + c.coluna + ' · ' + c.name + ' → ' + (novo.shortUrl || novo.id) + ' · peças ' + r.info.pecas + ' (' + r.info.fonte + (r.info.compras ? ', ' + r.info.compras + ' com fornecedor/valor, ' + ren + ' item(ns) renomeado(s)' : '') + ') · FO ' + r.info.fo + (r.info.ordem ? ' · O.S. ' + r.info.ordem : '') + (r.info.avisos ? ' · ⚠ ' + r.info.avisos : ''));
      feitos++;
    } catch (e) {
      rel.push('❌ ' + c.coluna + ' · ' + c.name + ' — ' + e.message);
      sh.appendRow([c.id, '', '', c.name, c.coluna, 'ERRO: ' + e.message, '', '', '', '', '', '', '', '', '', new Date()]);
    }
  }
  rel.unshift('simulados nesta rodada: ' + feitos + ' · restantes: ' + Math.max(0, cands.length - feitos));
  Logger.log(rel.join('\n'));
  PropertiesService.getScriptProperties().setProperty('MG_REL', rel.join('\n').slice(0, 8000));
  return rel;
}

/** Renomeia na cópia os itens do PAGAS para o formato novo (CÓDIGO PEÇA - FORNECEDOR - R$ valor); estado e previsão ficam. */
function mg_renomearPagas_(cardId, renomear) {
  if (!renomear || !renomear.length) return 0;
  var lists = vd_api_('/cards/' + cardId + '/checklists', { cru: true, query: { checkItems: 'all', checkItem_fields: 'name' } }) || [], n = 0;
  lists.filter(function (k) { return /^PAGAS/i.test(String(k.name || '').trim()); }).forEach(function (k) {
    (k.checkItems || []).forEach(function (i) {
      var r = renomear.filter(function (x) { return x.de === String(i.name).trim(); })[0];
      if (!r) return;
      vd_api_('/cards/' + cardId + '/checkItem/' + i.id, { method: 'put', payload: { name: r.para }, semLicenca: true });
      n++;
    });
  });
  return n;
}

/** Arquiva as cópias simuladas no TESTE e limpa a aba MIGRACAO. */
function mg_limparSimulacao() {
  mg_guardaSimulacao_();
  var sh = mg_aba_(), n = sh.getLastRow(), arq = 0;
  if (n > 1) {
    sh.getRange(2, 2, n - 1, 1).getValues().forEach(function (r) {
      if (!r[0]) return;
      try { vd_api_('/cards/' + r[0], { method: 'put', payload: { closed: true } }); arq++; } catch (e) {}
    });
    sh.deleteRows(2, n - 1);
  }
  Logger.log('cópias arquivadas: ' + arq);
  return arq;
}

/** Só olha: quantos cards antigos ativos existem por coluna e por fonte de peças (sem copiar nada). */
function mg_levantar() {
  var cands = mg_candidatos_(), porCol = {}, porFonte = {};
  cands.forEach(function (c) {
    porCol[c.coluna] = (porCol[c.coluna] || 0) + 1;
    var r = mg_converter_(c, []);
    porFonte[r.info.fonte] = (porFonte[r.info.fonte] || 0) + 1;
  });
  Logger.log('antigos ativos: ' + cands.length + '\npor coluna: ' + JSON.stringify(porCol) + '\npor fonte de peças: ' + JSON.stringify(porFonte));
  return { total: cands.length, porColuna: porCol, porFonte: porFonte };
}
