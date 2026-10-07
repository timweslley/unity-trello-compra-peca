/**
 * FORMULÁRIO DE PEDIDO DE PEÇA (web app)
 * O consultor entra com a própria conta do Trello; o card é criado/alterado
 * no nome dele. Usa as funções vd_ de Validacao.gs e Orcamento.gs.
 * Funções chamadas pela página começam com vdf_ (sem "_" no fim).
 */

function doGet(e) {
  var t = HtmlService.createTemplateFromFile('Formulario');
  t.cfg = {
    chave: vd_cred_().key,
    urlApp: vd_prop_('VD_URL_FORM', VD.URL_FORM),
    teste: vd_board_() === VD.BOARD_PADRAO,
    tipos: VD.TIPOS,
    categPneu: VD.CATEG_PNEU
  };
  return t.evaluate()
    .setTitle('Pedido de Peça — Unity')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------- API JSON para o formulário hospedado no GitHub Pages (powerup/formulario.html) ----------
 * POST com corpo text/plain {fn, args}; responde {ok:true, r} ou {ok:false, erro}.
 * Só as funções vdf_ públicas passam. Sem OPTIONS/preflight: por isso text/plain. */
var VDF_API = ['vdf_abrir', 'vdf_iniciar', 'vdf_buscarPlaca', 'vdf_carregarCard', 'vdf_lerDocumento',
  'vdf_salvarCotacao', 'vdf_salvarCompra', 'vdf_salvar', 'vdf_subirArquivo', 'vdf_lerAnexoCard', 'vdf_autorizar', 'vdf_devolverCotacao', 'vdf_salvarRecebimento', 'vdf_cotacaoIndisponivel', 'vdf_compararComplemento', 'vdf_alterarPrevisao', 'vdf_atualizarFornecimento', 'vdf_lerFornecimento', 'vdf_lerFornecimentoAnexo', 'vdf_avisarSolicitante', 'vdf_marcarOrdemAutorizada', 'vdf_padronizarAnexos', 'vdf_padronizarQuadro', 'vdf_padronizarQuadroStatus', 'vdf_textoAnexo', 'vdf_removerRepetidos', 'vdf_consumo', 'vdf_valoresOrcamento'];

function doPost(e) {
  var out, rid = '', cache = null;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var fn = String(req.fn || '');
    if (VDF_API.indexOf(fn) < 0) throw new Error('Função não permitida: ' + fn);
    if (qt_pausada_()) throw new Error('⏸️ O Google limitou as chamadas do sistema por hoje (cota diária). Nada se perdeu — tente de novo em ' + Utilities.formatDate(new Date(qt_pausadaAte_()), 'America/Sao_Paulo', 'HH:mm') + '; o sistema volta sozinho.');
    qt_parte_('formulário ' + fn);
    /* rid = número do pedido que grava. Às vezes o Google trava uma chamada ~2 min
     * (DEADLINE_EXCEEDED ao carregar o projeto) e o formulário tenta de novo com o mesmo rid:
     * se a primeira chegou a rodar, devolve o mesmo resultado em vez de gravar duas vezes. */
    rid = /^[\w-]{8,64}$/.test(String(req.rid || '')) ? 'vdf_rid_' + req.rid : '';
    if (rid) {
      cache = CacheService.getScriptCache();
      var prev = cache.get(rid);
      for (var k = 0; prev === 'RODANDO' && k < 20; k++) { Utilities.sleep(1500); prev = cache.get(rid); }
      if (prev === 'RODANDO') throw new Error('O pedido anterior ainda está sendo gravado. Aguarde um minuto e confira o card antes de repetir.');
      if (prev) return ContentService.createTextOutput(prev).setMimeType(ContentService.MimeType.JSON);
      cache.put(rid, 'RODANDO', 300);
    }
    var r = globalThis[fn].apply(null, req.args || []);
    out = { ok: true, r: r === undefined ? null : r };
  } catch (err) {
    out = { ok: false, erro: String((err && err.message) || err) };
  }
  try { qt_registrar_('formulário'); } catch (e2) {}
  var txt = JSON.stringify(out);
  if (rid && cache) {
    try { if (out.ok && txt.length < 90000) cache.put(rid, txt, 600); else cache.remove(rid); } catch (e2) {}
  }
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- segurança: token do consultor precisa ser membro do quadro ---------- */

function vdf_usuario_(token) {
  if (!token) throw new Error('LOGIN: entre com sua conta do Trello.');
  var me;
  try {
    me = vd_api_('/members/me', { query: { fields: 'fullName,username' } }, token);
  } catch (e) {
    throw new Error('LOGIN: seu acesso ao Trello expirou. Entre de novo.');
  }
  var cache = CacheService.getScriptCache();
  var chave = 'vdf_membros_' + vd_board_();
  var membros = cache.get(chave);
  if (!membros) {
    membros = JSON.stringify(vd_api_('/boards/' + vd_board_() + '/members', { query: { fields: 'username' } }).map(function (m) { return m.id; }));
    cache.put(chave, membros, 600);
  }
  if (JSON.parse(membros).indexOf(me.id) < 0) {
    throw new Error('Sua conta do Trello (' + me.username + ') não participa do quadro. Peça para ser adicionado.');
  }
  return me;
}

/** Quem pode registrar COMPRA (aba Compra): propriedade VD_COMPRADORES = usernames do Trello separados por vírgula. */
var VDF_COMPRADORES_PADRAO = 'comprasunity,timweslley,christianfarias23';
function vdf_ehComprador_(me) {
  var lista = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).toLowerCase().split(/[,;\s]+/).filter(String);
  return lista.indexOf(String(me.username || '').toLowerCase()) >= 0;
}

/** Quem autoriza compra: propriedade VD_AUTORIZADORES = usernames separados por vírgula. Pedido PARTICULAR: também o consultor que criou o card. */
var VDF_AUTORIZADORES_PADRAO = 'timweslley,comercialunity,christianfarias23';   // Weslley, Vilson (Comercial Unity) e Cris
function vdf_ehAutorizador_(me) {
  var lista = String(vd_prop_('VD_AUTORIZADORES', VDF_AUTORIZADORES_PADRAO)).toLowerCase().split(/[,;\s]+/).filter(String);
  return lista.indexOf(String(me.username || '').toLowerCase()) >= 0;
}
/** Cotação, compra, cotação indisponível, previsão e fornecimento: setor de compras OU diretoria (diretoria faz tudo). */
function vdf_podeComprar_(me) { return !!me && (vdf_ehComprador_(me) || vdf_ehAutorizador_(me)); }
function vdf_ehParticular_(card, an) {
  return (an.dados.tipo === 'PARTICULAR') || /PARTICULAR/i.test((card.labels || []).map(function (l) { return l.name; }).join(' ')) || /\bPARTICULAR\b/i.test(card.name || '');
}
/** Peça particular? (pedido todo particular, ou peça marcada PARTICULAR dentro do pedido de seguradora) */
function vdf_pecaParticular_(peca, card, an) { return !!(peca && peca.particular) || vdf_ehParticular_(card, an); }

/** Pode autorizar ESTA peça? Diretoria sempre. Peça particular: também o consultor que a lançou
 *  (ou quem criou o card). Peça da seguradora: só a diretoria. criador = username (opcional, evita nova leitura). */
function vdf_podeAutorizarPeca_(me, card, an, peca, criador) {
  if (!me) return false;
  if (vdf_ehAutorizador_(me)) return true;
  if (!vdf_pecaParticular_(peca, card, an)) return false;
  var u = String(me.username || '').toLowerCase();
  if (peca && peca.partPor && peca.partPor === u) return true;
  if (criador === undefined) { try { criador = vd_criador_(card.id); } catch (e) { criador = ''; } }
  return String(criador || '').toLowerCase() === u;
}

/** Pode abrir a aba Autorizar? (pode autorizar pelo menos uma peça) */
function vdf_podeAutorizar_(me, card, an) {
  if (!me) return false;
  if (vdf_ehAutorizador_(me)) return true;
  var criador; try { criador = vd_criador_(card.id); } catch (e) { criador = ''; }
  if (!an.pecas.length) return vdf_ehParticular_(card, an) && String(criador || '').toLowerCase() === String(me.username || '').toLowerCase();
  return an.pecas.some(function (x) { return vdf_podeAutorizarPeca_(me, card, an, x, criador); });
}

/** Pode devolver a cotação? Diretoria; ou o consultor, só se TODAS as peças forem particulares e dele. */
function vdf_podeDevolver_(me, card, an) {
  if (!me) return false;
  if (vdf_ehAutorizador_(me)) return true;
  var criador; try { criador = vd_criador_(card.id); } catch (e) { criador = ''; }
  return an.pecas.length > 0 && an.pecas.every(function (x) { return vdf_podeAutorizarPeca_(me, card, an, x, criador); });
}

function vdf_iniciar(token) {
  var me = vdf_usuario_(token);
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'name,shortUrl' } });
  var labels = cf_opcoesUnidade_();   // opções do campo personalizado "Unidade"
  return {
    nome: me.fullName, usuario: me.username, quadro: board.name, urlQuadro: board.shortUrl, unidades: labels, comprador: vdf_podeComprar_(me), diretoria: vdf_ehAutorizador_(me),
    cfg: { teste: vd_board_() === VD.BOARD_PADRAO, tipos: VD.TIPOS, categPneu: VD.CATEG_PNEU }
  };
}

/* abre o formulário numa chamada só: dados do usuário + card (quando é edição).
 * Todas as leituras do Trello vão em paralelo (fetchAll) — ~5 chamadas viram 1 rodada. */
function vdf_abrir(token, shortLink) {
  if (!token) throw new Error('LOGIN: entre com sua conta do Trello.');
  var base = 'https://api.trello.com/1', b = vd_board_();
  function req(url, tk) { return { url: base + url, method: 'get', muteHttpExceptions: true, headers: { Authorization: vd_auth_(tk) } }; }
  // quadro e listas quase não mudam: cache de 10 min (06/10/2026 — abrir o formulário era a maior fatia do consumo diário)
  var cacheB = CacheService.getScriptCache(), kB = 'vdf_abrir_base_' + b, baseTxt = null;
  try { baseTxt = cacheB.get(kB); } catch (e) {}
  var reqs = [req('/members/me?fields=fullName,username', token)];
  if (!baseTxt) reqs.push(req('/boards/' + b + '?fields=id,name,shortUrl'), req('/boards/' + b + '/lists?fields=name&filter=all'));
  var iCard = reqs.length;
  if (shortLink) reqs.push(req('/cards/' + encodeURIComponent(shortLink) + '?fields=name,desc,idBoard,idList,shortLink,shortUrl,idLabels,labels&checklists=all&checkItem_fields=name,state,due&attachments=true&attachment_fields=name,fileName,mimeType,isUpload,bytes,url,date&customFieldItems=true'));
  var rs = qt_fetchAll_(reqs);
  if (rs[0].getResponseCode() >= 300) throw new Error('LOGIN: seu acesso ao Trello expirou. Entre de novo.');
  for (var i = 1; i < rs.length; i++) {
    if (rs[i].getResponseCode() >= 300) throw new Error('Trello ' + rs[i].getResponseCode() + ': ' + rs[i].getContentText().slice(0, 120));
  }
  var me = JSON.parse(rs[0].getContentText());
  var board, listas;
  if (baseTxt) { var bs = JSON.parse(baseTxt); board = bs.board; listas = bs.listas; }
  else {
    board = JSON.parse(rs[1].getContentText()); listas = JSON.parse(rs[2].getContentText());
    try { cacheB.put(kB, JSON.stringify({ board: board, listas: listas }), 600); } catch (e) {}
  }
  var labels = cf_opcoesUnidade_();   // opções do campo personalizado "Unidade" (cache próprio)
  // membro do quadro? (mesma regra de vdf_usuario_, com o cache)
  var cache = CacheService.getScriptCache(), chave = 'vdf_membros_' + b, membros = cache.get(chave);
  if (!membros) {
    membros = JSON.stringify(vd_api_('/boards/' + b + '/members', { query: { fields: 'username' } }).map(function (m) { return m.id; }));
    cache.put(chave, membros, 600);
  }
  if (JSON.parse(membros).indexOf(me.id) < 0) throw new Error('Sua conta do Trello (' + me.username + ') não participa do quadro. Peça para ser adicionado.');
  var info = {
    nome: me.fullName, usuario: me.username, quadro: board.name, urlQuadro: board.shortUrl, unidades: labels, comprador: vdf_podeComprar_(me), diretoria: vdf_ehAutorizador_(me),
    cfg: { teste: b === VD.BOARD_PADRAO, tipos: VD.TIPOS, categPneu: VD.CATEG_PNEU }
  };
  var card = null;
  if (shortLink) {
    var c = JSON.parse(rs[iCard].getContentText());
    if (c.idBoard !== board.id) throw new Error('Este card não é do quadro do formulário.');
    var lst = listas.filter(function (l) { return l.id === c.idList; })[0];
    ax_padronizarCard_(c, token);   // card antigo aberto no formulário: anexos já lidos ganham o nome padronizado (05/10/2026)
    card = vdf_montarCard_(c, lst ? lst.name : '', me);
  }
  return { info: info, card: card };
}

/* ---------- peça travada: já autorizada ou comprada (só a diretoria altera/remove) ---------- */
function vdf_itensPagas_(c) {
  var out = [];
  (c.checklists || []).forEach(function (k) { if (/^PAGAS/i.test(String(k.name || '').trim())) (k.checkItems || []).forEach(function (i) { out.push(vd_semAcento_(i.name)); }); });
  return out;
}
/** '' (livre) | 'AUTORIZADA' | 'COMPRADA' */
function vdf_travaPeca_(p, auts, c) {
  var k = vd_chavePeca_(p);
  if (!k) return '';
  if (vdf_itensPagas_(c).some(function (n) { return vd_casaItem_(n, k); })) return 'COMPRADA';
  if ((auts || []).some(function (a) { return a.chave === k; })) return 'AUTORIZADA';
  return '';
}
/** Assinatura dos dados que não podem mudar numa peça travada. */
function vdf_sigTrava_(p) {
  return [p.pneu ? 'P' : '', String(p.codigo || '').replace(/\s+/g, '').toUpperCase(),
    p.pneu ? vd_semAcento_(p.medida).replace(/\s+/g, '') : vd_semAcento_(p.descricao).replace(/\s+/g, ' ').trim(),
    p.pneu ? '' : (p.tipos || []).join('/'), String(+(p.qtd || 1) || 1)].join('|');
}

/* ---------- título padrão: PLACA CARRO COR SEGURADORA ---------- */

var VD_MARCAS = ['CHEVROLET', 'CHEV', 'GM', 'VOLKSWAGEN', 'VW', 'FORD', 'FIAT', 'TOYOTA', 'HONDA', 'HYUNDAI', 'RENAULT', 'NISSAN',
  'JEEP', 'PEUGEOT', 'CITROEN', 'MITSUBISHI', 'KIA', 'BMW', 'AUDI', 'MERCEDES-BENZ', 'MERCEDES', 'BENZ', 'M.BENZ', 'LAND', 'ROVER',
  'VOLVO', 'CAOA', 'CHERY', 'BYD', 'GWM', 'RAM', 'DODGE', 'SUZUKI', 'SUBARU', 'JAC', 'LIFAN', 'PORSCHE', 'MINI', 'IVECO', 'SCANIA', 'I', 'IMP'];

function vd_carroCurto_(modelo) {
  var ps = vd_semAcento_(modelo).replace(/[\/]/g, ' ').split(/\s+/).filter(String);
  for (var i = 0; i < ps.length; i++) if (VD_MARCAS.indexOf(ps[i]) < 0 && !/^\d/.test(ps[i])) return ps[i];
  return '';
}

function vd_titulo_(placa, carro, cor, seguradora) {
  return [placa, carro, cor, seguradora].map(function (s) { return String(s || '').trim().toUpperCase(); }).filter(String).join(' ');
}

/* ---------- busca e carga de card ---------- */

/** Cards ABERTOS do quadro com a mesma placa (antiga ou Mercosul) ou, se informado, o mesmo chassi na descrição. */
function vdf_buscarPlaca(token, placa, chassi) {
  vdf_usuario_(token);
  chassi = vd_normChassi_(chassi || '');
  if (!vd_chassiValido_(chassi)) chassi = '';
  if (!vd_placaValida_(placa) && !chassi) return [];
  var listas = vd_api_('/boards/' + vd_board_() + '/lists', { query: { fields: 'name' } });
  var nomeLista = {};
  listas.forEach(function (l) { nomeLista[l.id] = l.name; });
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { query: { fields: 'name,idList,shortLink,desc' } });
  return cards.filter(function (c) {
    if (vdf_cardProtegido_(c.name)) return false;
    var an = null;
    var p = vd_placaDoTexto_(c.name);
    if (!p) { an = vd_analisar_(c.desc, c.name); p = an.dados.placa; }
    if (vd_placaValida_(placa) && vd_mesmaPlaca_(p, placa)) return true;
    if (!chassi) return false;
    if (!an) an = vd_analisar_(c.desc, c.name);
    var ch = an.dados.chassi || (String(vd_limpar_(c.desc || '')).toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/) || [''])[0];
    return !!ch && vd_normChassi_(ch) === chassi;
  }).map(function (c) {
    var pc = vd_placaDoTexto_(c.name) || '';
    return { shortLink: c.shortLink, nome: c.name, lista: nomeLista[c.idList] || '', porChassi: !(vd_placaValida_(placa) && vd_mesmaPlaca_(pc || vd_analisar_(c.desc, c.name).dados.placa, placa)) };
  });
}

/** Compra só com a etiqueta ORDEM AUTORIZADA no card (ordem de serviço liberada). */
var VDF_ETIQ_ORDEM = 'ORDEM AUTORIZADA';
function vdf_temOrdemAut_(card) {
  return (card.labels || []).some(function (l) { return vd_semAcento_(String(l.name || '')).toUpperCase().indexOf(VDF_ETIQ_ORDEM) >= 0; });
}

function vdf_ehPosCotacao_(nomeLista) {
  return VD.LISTAS_FORA.indexOf(vd_nomeColuna_(nomeLista)) < 0;
}

/** Card fixo do quadro ("➕ NOVO PEDIDO DE PEÇA") e cards de AVISO nunca são editados pelo formulário. */
function vdf_cardProtegido_(nome) {
  return /NOVO PEDIDO DE PE[ÇC]A/i.test(nome || '') || /^\s*AVISO\b/i.test(nome || '');
}

/** Nº da ordem de serviço (Databox) gravado no campo personalizado "Nº Ordem" do card. */
var VDF_CAMPO_ORDEM = 'Nº Ordem';
function vdf_ordemDoCard_(c) {
  try {
    var d = cf_defs_()[VDF_CAMPO_ORDEM]; if (!d) return '';
    var it = (c.customFieldItems || []).filter(function (i) { return i.idCustomField === d.id; })[0];
    return it && it.value ? String(it.value.number || it.value.text || '') : '';
  } catch (e) { return ''; }
}
/** Grava o Nº da ordem no campo personalizado (vazio não apaga o que já está no card). */
function vdf_gravarOrdem_(cardId, ordem) {
  ordem = String(ordem || '').replace(/\D/g, '');
  if (!ordem) return false;
  var d = cf_defs_()[VDF_CAMPO_ORDEM]; if (!d) return false;
  var corpo = d.tipo === 'number' ? { value: { number: ordem } } : { value: { text: ordem } };
  vd_api_('/cards/' + cardId + '/customField/' + d.id + '/item', { method: 'put', payload: corpo });
  return true;
}
/** Id da opção do campo "Unidade" do card ('' se não tem). */
function vdf_unidadeDoCard_(c) {
  try {
    var d = cf_defs_()['Unidade']; if (!d) return '';
    var it = (c.customFieldItems || []).filter(function (i) { return i.idCustomField === d.id; })[0];
    return it && it.idValue ? it.idValue : '';
  } catch (e) { return ''; }
}
/** Grava a unidade escolhida no campo "Unidade" (só se mudou). */
function vdf_gravarUnidade_(card, idOpcao) {
  if (!idOpcao || vdf_unidadeDoCard_(card) === idOpcao) return false;
  return cf_gravarUnidade_(card.id, idOpcao);
}

function vdf_carregarCard(token, shortLink) {
  var me = vdf_usuario_(token);
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  var c = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard,idList,shortLink,shortUrl,idLabels,labels', checklists: 'all', checkItem_fields: 'name,state,due', attachments: 'true', attachment_fields: 'name,fileName,mimeType,isUpload,bytes,url,date', customFieldItems: 'true' } });
  if (c.idBoard !== board.id) throw new Error('Este card não é do quadro do formulário.');
  var lista = vd_api_('/lists/' + c.idList, { query: { fields: 'name' } }).name;
  ax_padronizarCard_(c, token);   // card antigo aberto no formulário: anexos já lidos ganham o nome padronizado (05/10/2026)
  return vdf_montarCard_(c, lista, me);
}

/* monta a resposta do card a partir do card já lido (com checklists=all) */
function vdf_montarCard_(c, lista, me) {
  if (vdf_cardProtegido_(c.name)) throw new Error('Este é o card fixo do quadro — não pode ser usado como pedido. Faça um pedido novo.');
  try { var cmp = vd_completa_(c.id); if (cmp) c.desc = cmp; } catch (e) {}   // vitrine -> descrição completa
  var an = vd_analisar_(c.desc, c.name);
  var autorizadas = [];
  try { autorizadas = vd_autorizacoesDaDescricao_(c.desc, an.pecas); } catch (e) {}
  var obs = vd_campo_(an.div.bloco, 'OBS|OBSERVA[ÇC][ÃA]O');
  var criador; try { criador = vd_criador_(c.id); } catch (e) { criador = ''; }
  return {
    shortLink: c.shortLink, url: c.shortUrl, nome: c.name, lista: lista, posCotacao: vdf_ehPosCotacao_(lista),
    dados: an.dados, obs: obs,
    pecas: (function () {
      return an.pecas.map(function (p) { return { pneu: p.pneu, codigo: p.codigo, descricao: p.descricao, tipos: p.tipos, medida: p.medida, categoria: p.categoria, marca: p.marca, qtd: p.qtd, particular: vdf_pecaParticular_(p, c, an), partPor: p.partPor || '', complemento: !!p.complemento, compData: p.compData || '', valorOrc: vd_valorOrcTxt_(p.valorOrc), obs: p.obs || '', travada: vdf_travaPeca_(p, autorizadas, c), podeAut: vdf_podeAutorizarPeca_(me, c, an, p, criador), chave: vd_chavePeca_(p), nome: vd_nomePeca_(p) }; })
        // peças "não comprar": o formulário de edição mostra (chip marcado); cotação/autorização/compra não (sem chave)
        .concat((an.naoComprar || []).map(function (p) { return { pneu: p.pneu, codigo: p.codigo, descricao: p.descricao, tipos: p.tipos, medida: p.medida, categoria: p.categoria, marca: p.marca, qtd: p.qtd, particular: false, partPor: '', complemento: !!p.complemento, compData: p.compData || '', naoComprar: true, naoMotivo: p.naoMotivo || '', valorOrc: vd_valorOrcTxt_(p.valorOrc), obs: p.obs || '', travada: '', podeAut: false, chave: '', nome: vd_nomePeca_(p) }; }));
    })(),
    padrao: an.pecas.length > 0 || (an.naoComprar || []).length > 0,
    cotacoes: (function () { try { return vd_cotacoesDaDescricao_(c.desc, an.pecas); } catch (e) { return { cotacoes: [], nt: [] }; } })(),
    doOrcamento: an.doOrcamento,
    tipo: an.dados.tipo || (/PARTICULAR/i.test((c.labels || []).map(function (l) { return l.name; }).join(' ')) ? 'PARTICULAR' : 'SEGURADORA'),
    origemOrc: (vd_limpar_(an.div.bloco).match(/OR[ÇC]AMENTO IMPORTADO \(([^)]*)\)/i) || [])[1] || '',
    titulo: vdf_partesTitulo_(c.name, an.dados),
    anexos: vdf_anexosDoCard_(c.attachments),
    todosAnexos: vdf_todosAnexos_(c.attachments, vd_prop_('VD_URL_FORM', VD.URL_FORM)),
    autorizadas: autorizadas,
    devolucao: (function () { try { return vd_ultimaDevolucao_(c.desc); } catch (e) { return null; } })(),
    podeAutorizar: vdf_podeAutorizar_(me, c, an),
    podeDevolver: vdf_podeDevolver_(me, c, an),
    fornecedores: fo_paraFormulario_(),
    recebiveis: (function () { try { return vdf_itensRecebimento_(c).map(function (i) { i.dueTxt = i.due ? vd_dataCurta_(i.due) : ''; i.dueIso = i.due ? Utilities.formatDate(new Date(i.due), 'America/Sao_Paulo', 'yyyy-MM-dd') : ''; return i; }); } catch (e) { return []; } })(),
    particular: vdf_ehParticular_(c, an),
    diretoria: vdf_ehAutorizador_(me), podeComprar: vdf_podeComprar_(me), podeReceber: vdf_podeReceber_(me, c), ordemAut: vdf_temOrdemAut_(c), solicitante: criador || '',
    ordem: vdf_ordemDoCard_(c), unidadeId: vdf_unidadeDoCard_(c),
    totais: (function () { try { return vd_totais_(c); } catch (e) { return null; } })(),
    pagas: (function () {
      try {
        var out = [];
        (c.checklists || []).filter(function (k) { return /^PAGAS/i.test((k.name || '').trim()); }).forEach(function (pg) {
          (pg.checkItems || []).forEach(function (i) { out.push({ nome: i.name, ok: i.state === 'complete', due: i.due ? vd_dataCurta_(i.due) : '' }); });
        });
        return out;
      } catch (e) { return []; }
    })()
  };
}

var VD_CORES = ['BRANCO', 'BRANCA', 'PRETO', 'PRETA', 'PRATA', 'CINZA', 'VERMELHO', 'VERMELHA', 'AZUL', 'VERDE', 'AMARELO', 'AMARELA',
  'BEGE', 'MARROM', 'DOURADO', 'DOURADA', 'LARANJA', 'VINHO', 'GRAFITE', 'ROXO', 'ROXA', 'BRONZE', 'CHAMPAGNE'];

/** Separa o título "PLACA CARRO COR SEGURADORA" em partes (para editar no formulário). */
var VD_LIXO_TITULO = ['TOL', 'TOLEDO', 'MCR', 'RONDON', 'MARECHAL', 'CVEL', 'CASCAVEL', 'CM', 'CMO', 'MOURAO', 'CAMPO', 'IMAGE', 'PNG', 'JPG', 'JPEG', 'PDF'];

function vdf_partesTitulo_(nome, dados) {
  dados = dados || {};
  if (!vd_placaDoTexto_(nome)) nome = '';   // título fora do padrão (ex.: "image.png"): monta do zero
  var ps0 = vd_semAcento_(nome).replace(/\b[A-Z]{3}[\s\-]?\d[A-Z0-9]\d{2}\b/, ' ').replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(String);
  var ps = ps0.filter(function (t) { return VD_LIXO_TITULO.indexOf(t) < 0; });
  var r = { carro: '', cor: dados.cor || '', seguradora: dados.seguradora || '' };
  if (ps.length && !r.seguradora && (ps[ps.length - 1] === 'PARTICULAR' || VD_SEGURADORAS.some(function (s) { return s[0] === ps[ps.length - 1]; }))) r.seguradora = ps.pop();
  else if (ps.length && r.seguradora && ps[ps.length - 1] === vd_semAcento_(r.seguradora)) ps.pop();
  for (var k = ps.length - 1; k > 0; k--) {
    if (VD_CORES.indexOf(ps[k]) >= 0) { var c = ps.splice(k, 1)[0]; if (!r.cor) r.cor = c; break; }
  }
  r.carro = ps.join(' ') || vd_carroCurto_(dados.modelo || '');
  return r;
}

/* ---------- anexos que já estão no card (evita subir o mesmo orçamento de novo) ---------- */

/** PDFs/fotos já anexados no card: {id, nome, bytes, pdf, lido} (lido = o robô já leu, abre na hora). */
function vdf_anexosDoCard_(attachments) {
  var props = PropertiesService.getScriptProperties();
  return (attachments || []).filter(vd_anexoLegivel_).map(function (a) {
    return { id: a.id, nome: a.name, arquivo: a.fileName || a.name, bytes: a.bytes || 0, pdf: /pdf/i.test(a.mimeType || '') || /\.pdf$/i.test(a.name || ''), lido: !!props.getProperty('VD_ANX3_' + a.id), url: a.url || '' };
  });
}
/** TODOS os anexos do card para abrir o original sem voltar ao Trello (06/10/2026): uploads de qualquer tipo e links,
 *  menos os links fixos do formulário. {id, nome, url, tipo: 'pdf'|'img'|'arq'|'link'} */
function vdf_todosAnexos_(attachments, urlForm) {
  return (attachments || []).filter(function (a) {
    if (VD_LINK.RX_EDITAR.test(a.name || '') || VD_LINK.RX_COMPRA.test(a.name || '')) return false;
    if (!a.isUpload && urlForm && String(a.url || '').indexOf(urlForm) === 0) return false;
    return !!a.url;
  }).map(function (a) {
    var m = a.mimeType || '', n = a.name || '';
    var tipo = !a.isUpload ? 'link' : (/pdf/i.test(m) || /\.pdf$/i.test(n) ? 'pdf' : (/^image\//i.test(m) || /\.(jpe?g|png|webp|gif)$/i.test(n) ? 'img' : 'arq'));
    return { id: a.id, nome: n, url: a.url, tipo: tipo, data: a.date || '' };
  });
}

/** Lê um anexo que JÁ está no card (sem novo upload). Mesmo retorno de vdf_lerDocumento, com anexoId no lugar de fileId. */
function vdf_lerAnexoCard(token, shortLink, idAnexo, placa) {
  vdf_usuario_(token);
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  var c = vd_api_('/cards/' + shortLink, { query: { fields: 'idBoard', attachments: 'true', attachment_fields: 'name,fileName,mimeType,isUpload,bytes,url,date' } });
  if (c.idBoard !== board.id) throw new Error('Este card não é do quadro do formulário.');
  var a = (c.attachments || []).filter(function (x) { return x.id === idAnexo; })[0];
  if (!a) throw new Error('Esse anexo não está mais no card.');
  if (!vd_anexoLegivel_(a)) throw new Error('Esse anexo não dá para ler (só PDF ou foto até 15 MB).');
  var r = vd_lerAnexoTrello_(a, { orcCompleto: true });
  if (!r) throw new Error('O Trello não entregou o arquivo "' + a.name + '". Tente de novo.');
  if (r.erro) return { anexoId: a.id, jaNoCard: true, erro: 'Não consegui ler "' + a.name + '" (' + r.erro + ').' };
  var orc = r.orcFull || (r.orc ? { origem: r.orcamento, oficina: vd_orcExpandir_(r.orc.o), fo: vd_orcExpandir_(r.orc.f) } : { origem: '' });
  if (!r.orcFull && orc.fo) (r.foi || []).forEach(function (fi) { orc.fo.forEach(function (x) { if (fi[0] && x.codigo === fi[0]) { x.fornecedor = fi[1]; x.previsao = fi[2]; } }); });
  orc.cor = r.cor; orc.seguradora = r.seguradora; orc.sinistro = r.sinistro;
  var out = vdf_respostaLeitura_(r, orc, placa);
  out.anexoId = a.id; out.jaNoCard = true; out.doCache = !!r.doCache;
  return out;
}

/** Diretoria: texto (OCR) de um anexo do card, para conferir como o leitor está enxergando o documento (06/10/2026). */
function vdf_textoAnexo(token, shortLink, idAnexo) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) throw new Error('Só a diretoria.');
  var c = vd_api_('/cards/' + shortLink, { query: { fields: 'idBoard', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url' } });
  var a = (c.attachments || []).filter(function (x) { return x.id === idAnexo; })[0];
  if (!a) throw new Error('Esse anexo não está mais no card.');
  var resp = qt_fetch_(a.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
  if (resp.getResponseCode() >= 300) throw new Error('O Trello não entregou o arquivo.');
  var texto = vd_ocr_(resp.getBlob(), a.name);
  var orc = vd_lerOrcamento_(texto);
  return { nome: a.name, texto: String(texto).slice(0, 30000), normalizado: vd_normTexto_(texto).slice(0, 30000), orcamento: { origem: orc.origem, oficina: orc.oficina, fo: orc.fo } };
}

/**
 * Card criado antes de 05/10/2026 (ou lido sem valores): busca nos orçamentos anexados o valor líquido de cada peça
 * que ainda não tem "ORÇ R$" e grava nas linhas da descrição. Quem autoriza enxerga a economia (06/10/2026, MVU1552).
 * {ok, preenchidas, nada}
 */
function vdf_valoresOrcamento(token, shortLink) {
  var me = vdf_usuario_(token);
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard,shortLink', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url,date' } });
  var an = vd_analisar_(card.desc, card.name);
  var todas = (an.pecas || []).concat(an.naoComprar || []);
  var faltam = todas.filter(function (p) { return !p.pneu && !vd_valorOrcTxt_(p.valorOrc); });
  if (!faltam.length) return { ok: true, preenchidas: 0, nada: true };
  var ans = (card.attachments || []).filter(vd_anexoLegivel_).filter(function (a) { return /pdf/i.test(a.mimeType || '') || /\.pdf$/i.test(a.name || ''); })
    .sort(function (a, b) { var oa = /^📄/.test(a.name) ? 0 : 1, ob = /^📄/.test(b.name) ? 0 : 1; return oa - ob || String(b.date || '').localeCompare(String(a.date || '')); }).slice(0, 3);
  var feitas = {}, atual = [];
  for (var i = 0; i < ans.length && Object.keys(feitas).length < faltam.length; i++) {
    var r = null; try { r = vd_lerAnexoTrello_(ans[i], { orcCompleto: true }); } catch (e) { continue; }
    if (!r || r.erro || !r.orcamento) continue;
    var orc = r.orcFull || cp_orcDoCache_(ans[i].id); if (!orc) continue;
    var itens = (orc.oficina || []).concat(orc.fo || []).filter(function (x) { return !x.pneu && vd_valorOrcTxt_(x.valorOrc); });
    faltam.forEach(function (p) {
      var k = vd_chavePeca_(p); if (feitas[k]) return;
      var kc = cp_norm_(p.codigo);
      var it = (kc.length >= 4 ? itens.filter(function (x) { return cp_norm_(x.codigo) === kc; })[0] : null)
        || itens.filter(function (x) { return cp_similar_(p.descricao, x.descricao) > 0; })[0];
      if (!it) return;
      feitas[k] = 1; atual.push({ chave: k, codigoAntigo: p.codigo || '', valorOrc: vd_valorOrcTxt_(it.valorOrc) });
    });
  }
  if (!atual.length) return { ok: true, preenchidas: 0 };
  var div = vd_dividir_(card.desc);
  var bloco = cp_atualizarNoBloco_(div.bloco, atual);
  vd_backup_(card, 'valores do orçamento preenchidos (' + me.username + ')');
  vd_gravarDesc_(card.id, bloco + (div.temMarcador ? '\n\n' + div.resto : ''), token);
  return { ok: true, preenchidas: atual.length };
}

/* ---------- leitura de documento enviado no formulário ---------- */

function vdf_lerDocumento(token, base64, mime, nome, placa) {
  vdf_usuario_(token);
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, nome);
  var arq = vdf_pastaTemp_().createFile(blob);
  var texto;
  try {
    texto = vd_ocr_(blob, nome);
  } catch (e) {
    return { fileId: arq.getId(), erro: 'Não consegui ler o documento (' + String(e.message || e).slice(0, 80) + '). Ele será anexado mesmo assim.' };
  }
  var orcL = vd_lerOrcamento_(texto);
  try { pv_enriquecerFo_(texto, orcL.fo); } catch (e) {}
  var out = vdf_respostaLeitura_(vd_extrair_(texto), orcL, placa);
  out.fileId = arq.getId();
  return out;
}

/** Monta a resposta de leitura (documento enviado ou anexo do card) para o formulário. */
function vdf_respostaLeitura_(r, orc, placa) {
  var placasDoc = (r.placas || []).slice(0, 5);
  var confere = !placa || placasDoc.some(function (p) { return vd_mesmaPlaca_(p, placa); });
  r.chassis = r.chassis || [];
  return {
    confere: confere,
    placasDoc: placasDoc,
    chassi: confere && r.chassis.length === 1 ? r.chassis[0] : '',
    chassiDivergente: r.chassis.length > 1 ? r.chassis : null,
    modelo: r.modelo || '', ano: r.ano || '', motor: r.motor || '',
    carro: vd_carroCurto_(r.modelo || ''),
    cor: orc.cor || '', seguradora: orc.seguradora || '', sinistro: orc.sinistro || '',
    orcamento: orc.origem ? { origem: orc.origem, oficina: orc.oficina, fo: orc.fo } : null
  };
}

function vdf_pastaTemp_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('VD_PASTA_TEMP');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var p = DriveApp.createFolder('Validação Trello — anexos temporários do formulário');
  props.setProperty('VD_PASTA_TEMP', p.getId());
  return p;
}

/* ---------- checklist FORNECIMENTO (peças FO) ---------- */

/** nomeLista: 'FORNECIMENTO' (padrão) ou 'FORNECIMENTO COMPLEMENTO'. Não repete peça que já está em qualquer FORNECIMENTO:
 *  peça que já tem item (mesmo código) só tem a descrição/previsão atualizada no item que existe (05/10/2026, Weslley:
 *  "já tinha registro de fornecimento — atualizar apenas as descrições"). Devolve quantos itens NOVOS entraram. */
function vdf_checklistFornecimento_(cardId, fo, token, nomeLista) {
  if (!fo || !fo.length) return 0;
  nomeLista = nomeLista || 'FORNECIMENTO';
  var lists = vd_api_('/cards/' + cardId + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name,due,state' } }, token);
  var todas = lists.filter(function (c) { return /FORNECIMENTO/i.test(c.name); });
  var cl = nomeLista === 'FORNECIMENTO'
    ? todas.filter(function (c) { return !/COMPLEMENTO/i.test(c.name); })[0]
    : todas.filter(function (c) { return String(c.name || '').trim().toUpperCase() === nomeLista; })[0];
  if (!cl) cl = vd_api_('/checklists', { method: 'post', payload: { idCard: cardId, name: nomeLista, pos: 'bottom' } }, token);
  var existentes = [];
  todas.forEach(function (c) { (c.checkItems || []).forEach(function (i) { existentes.push({ item: i, norm: vd_semAcento_(i.name), base: pv_baseFo_(i.name) }); }); });
  // 1ª passada: quem casa pelo código (esses itens não podem ser "roubados" pelo casamento por descrição)
  var porCodigo = {};
  fo.forEach(function (p, k) {
    var cod0 = String(p.codigo || p.codigoOrc || '').trim().replace(/\*+$/, '').replace(/\s+/g, '');
    if (!cod0) return;
    existentes.forEach(function (e, j) { if (porCodigo[j] === undefined && vd_casaItem_(e.norm, vd_semAcento_(cod0))) porCodigo[j] = k; });
  });
  var n = 0, usados = {};
  fo.forEach(function (p, k) {
    var cod = String(p.codigo || p.codigoOrc || '').trim();
    var desc = p.pneu ? ('PNEU ' + (p.medida || '') + ' ' + (p.marca || '')).trim() : String(p.descricao || '').trim();
    // padrão do quadro: CÓDIGO DESCRIÇÃO (o fornecedor e a previsão entram depois pela rotina de fornecimento)
    cod = cod.replace(/\*+$/, '').replace(/\s+/g, '');
    // orçamento que já traz fornecedor/prazo da FO (ex.: grupo Porto): entra no item
    var nome = (cod ? cod + ' ' : '') + desc + (p.qtd && +p.qtd > 1 ? ' (x' + p.qtd + ')' : '') + (p.fornecedor ? ' - ' + String(p.fornecedor).toUpperCase() : '');
    var chave = vd_semAcento_(cod || desc);
    var ja = existentes.filter(function (e, j) { return !usados[j] && vd_casaItem_(e.norm, chave); })[0];
    // sem código igual: mesma peça pela descrição (igual ou parecida) = o código mudou no orçamento novo -> atualiza o item,
    // não repete (Weslley, 05/10/2026: "cuidar pra não duplicar e atualizar; pode haver mudança de código da peça")
    if (!ja && !p.pneu && desc) {
      var melhor = -1, nota = 0;
      existentes.forEach(function (e, j) {
        if (usados[j] || porCodigo[j] !== undefined) return;
        var dEx = e.base.replace(/^[A-Z0-9][A-Z0-9.\-\/]{3,}\s+/i, '');
        var sim = cp_similar_(desc, dEx);
        if (sim > nota) { nota = sim; melhor = j; }
      });
      if (melhor >= 0) ja = existentes[melhor];
    }
    if (ja) {
      usados[existentes.indexOf(ja)] = 1;
      // item já existe: só atualiza a descrição (e a previsão, se o item ainda não tem) — nunca duplica
      try {
        var atual = String(ja.item.name || '').trim(), novo = nome;
        // fornecedor que alguém já anotou no item ("... - AVENIDA") fica, se o orçamento não trouxe outro
        var sufixo = atual.match(/\s-\s[^-]+$/);
        if (!p.fornecedor && sufixo && !/\s-\s[^-]+$/.test(novo)) novo += sufixo[0];
        var upd = {};
        if (novo && novo !== atual) upd.name = novo;
        if (p.previsao && !ja.item.due) upd.due = p.previsao;
        if (Object.keys(upd).length) vd_api_('/cards/' + cardId + '/checkItem/' + ja.item.id, { method: 'put', payload: upd }, token);
      } catch (e) { console.log('FO item existente: ' + e); }
      return;
    }
    var corpoFo = { name: nome, pos: 'bottom' };
    if (p.previsao) corpoFo.due = p.previsao;
    vd_api_('/checklists/' + cl.id + '/checkItems', { method: 'post', payload: corpoFo }, token);
    n++;
  });
  return n;
}

/* ---------- checklist PAGAS (peças compradas pela oficina) ---------- */

function vd_dataCurta_(s) {
  var iso = vd_dataBR_(s);
  return iso ? Utilities.formatDate(new Date(iso), 'America/Sao_Paulo', 'dd/MM') : String(s || '');
}

/** Data "dd/mm" ou "dd/mm/aaaa" -> ISO (meio-dia local). */
function vd_dataBR_(s) {
  var iso = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], 12, 0, 0).toISOString();
  var m = String(s || '').match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!m) { var d0 = new Date(s); return isNaN(d0.getTime()) ? '' : d0.toISOString(); }
  var ano = m[3] ? +m[3] : new Date().getFullYear();
  if (ano < 100) ano += 2000;
  var d = new Date(ano, +m[2] - 1, +m[1], 12, 0, 0);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

/** "1.647,50" / "1647.5" / "R$ 200" -> número (ou NaN). */
function vd_valorNum_(s) {
  s = String(s == null ? '' : s).replace(/R\$/i, '').replace(/\s/g, '');
  if (!s) return NaN;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');
  return parseFloat(s);
}

/** número -> "R$ 1.647,50" (padrão do quadro). */
function vd_valorBR_(v) {
  var n = typeof v === 'number' ? v : vd_valorNum_(v);
  if (isNaN(n)) return '';
  var s = n.toFixed(2).split('.');
  return 'R$ ' + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + s[1];
}

/** Data ISO de hoje + N dias (meio-dia local). */
/** Hoje + N dias ÚTEIS (sem sáb/dom/feriados das cidades do grupo — ver DIAS ÚTEIS em Validacao.gs). */
function vd_dataMaisDias_(dias) {
  return du_somarUteis_(dias);
}

/** Chave para casar peça do pedido x cotação x item de checklist. */
function vd_chavePeca_(p) {
  if (p.pneu) return vd_semAcento_('PNEU ' + String(p.medida || '').replace(/\s+/g, ''));
  var cod = String(p.codigo || '').replace(/\s+/g, '');
  return vd_semAcento_(cod || p.descricao || '').replace(/\s+/g, ' ').trim();
}

/** O item de checklist ("CÓD DESC - FORN - R$" ou "DESC - FORN") é desta peça? Comparação exata, não por pedaço:
 *  "FAROL" não casa com "FAROL AUXILIAR - ...". Código (sem espaço e com número) casa pela 1ª palavra. */
function vd_casaItem_(nomeItem, k) {
  k = String(k || '').replace(/\s+/g, ' ').trim();
  if (!k) return false;
  var n = vd_semAcento_(nomeItem).replace(/\s+/g, ' ').trim();
  if (n === k) return true;
  if (/^\S+$/.test(k) && /\d/.test(k)) return n.indexOf(k + ' ') === 0;
  if (/^PNEU /.test(k)) return n.indexOf(k + ' ') === 0;
  return n.indexOf(k + ' - ') === 0 || n.indexOf(k + ' (X') === 0;
}

/** Nome "CÓDIGO DESCRIÇÃO" de uma peça do pedido (como vai para os checklists). */
function vd_nomePeca_(p) {
  if (p.pneu) return ('PNEU ' + String(p.medida || '').replace(/\s+/g, '') + ' ' + (p.marca || p.categoria || '')).trim();
  var cod = String(p.codigo || '').replace(/\s+/g, '');
  return ((cod ? cod + ' ' : '') + String(p.descricao || '').trim()).toUpperCase();
}

/**
 * compras = [{codigo, descricao, fornecedor, valor, previsao | dias}]
 * Item no padrão do quadro: "CÓDIGO DESCRIÇÃO - FORNECEDOR - R$ valor", previsão como data do item. Não duplica.
 */
function vd_checklistPagas_(cardId, compras, token) {
  compras = (compras || []).filter(function (c) { return String(c.fornecedor || '').trim(); });
  if (!compras.length) return 0;
  var lists = vd_api_('/cards/' + cardId + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name,due' } }, token);
  // PAGAS = peças da seguradora; PAGAS PARTICULAR = peças que o cliente paga (checklists separados)
  var pagasTodas = lists.filter(function (c) { return /^PAGAS/i.test((c.name || '').trim()); });
  var existentes = [];
  pagasTodas.forEach(function (c) { (c.checkItems || []).forEach(function (i) { existentes.push(vd_semAcento_(i.name)); }); });
  var porNome = {};
  // PAGAS COMPLEMENTO = peças da seguradora que vieram de orçamento complementar
  var lista = function (part, comp) {
    var nome = part ? 'PAGAS PARTICULAR' : (comp ? 'PAGAS COMPLEMENTO' : 'PAGAS');
    if (porNome[nome]) return porNome[nome];
    var cl = pagasTodas.filter(function (c) { return String(c.name || '').trim().toUpperCase() === nome; })[0];
    if (!cl) cl = vd_api_('/checklists', { method: 'post', payload: { idCard: cardId, name: nome, pos: nome === 'PAGAS' ? 'top' : 'bottom' } }, token);
    porNome[nome] = cl;
    return cl;
  };
  var n = 0;
  compras.forEach(function (c) {
    var cl = lista(!!c.particular, !!c.complemento);
    var cod = String(c.codigo || '').replace(/\s+/g, '').toUpperCase();
    var desc = String(c.descricao || '').trim().toUpperCase();
    var forn = String(c.fornecedor || '').trim().toUpperCase();
    var valor = vd_valorBR_(c.valor);
    var nome = (cod ? cod + ' ' : '') + desc + ' - ' + forn + (valor ? ' - ' + valor : '');
    var chave = vd_semAcento_(cod || desc);
    if (chave && existentes.some(function (e) { return vd_casaItem_(e, chave); })) return;
    var payload = { name: nome, pos: 'bottom' };
    var due = c.previsao ? vd_dataBR_(c.previsao) : (c.dias !== undefined && c.dias !== '' ? vd_dataMaisDias_(c.dias) : '');
    if (due) payload.due = due;
    vd_api_('/checklists/' + cl.id + '/checkItems', { method: 'post', payload: payload }, token);
    existentes.push(vd_semAcento_(nome));
    n++;
  });
  return n;
}

/* ---------- cotações do comprador (abaixo da linha de cotação) ---------- */

var VDF_LISTA_PENDENTE = 'PENDENTE AUTORIZAR';
var VDF_LISTA_FINALIZADA = 'COTAÇÃO FINALIZADA';
var VDF_LISTA_CHEGAR = 'FALTA CHEGAR';

/**
 * Lê as cotações escritas abaixo do marcador, no padrão:
 *   **FORNECEDOR**            (ou **FORNECEDOR - NT** / **FORNECEDOR - obs**)
 *   CÓDIGO DESCRIÇÃO - TIPO MARCA - R$ 200,00 - 3 dias
 * Casa cada linha com uma peça do pedido pela chave (código, ou descrição / medida).
 * Linha "OBS NOME DA PEÇA: texto" = observação do comprador para a peça.
 * Devolve {cotacoes:[{chave, fornecedor, obs, tipo, marca, valor, dias, data}], nt:[fornecedor], obs:[{chave, texto}]}
 */
/** Peça do pedido citada num texto (código, ou descrição/medida). chaves = [{chave, desc, cod}] */
function vdf_pecaDoTexto_(texto, chaves) {
  var alvo = vd_semAcento_(texto).replace(/\s+/g, ' ').trim();
  for (var i = 0; i < chaves.length; i++) {
    var k = chaves[i];
    if (k.cod && k.cod.length >= 4 && alvo.indexOf(k.cod) >= 0) return k;
    if (!k.cod && k.desc && (alvo === k.desc || alvo.indexOf(k.desc) >= 0)) return k;
  }
  return null;
}
function vdf_chavesPecas_(pecas) {
  return (pecas || []).map(function (p) { return { chave: vd_chavePeca_(p), desc: vd_semAcento_(p.pneu ? 'PNEU ' + p.medida : p.descricao).replace(/\s+/g, ' ').trim(), cod: vd_semAcento_(String(p.codigo || '').replace(/\s+/g, '')) }; });
}
/** Linha "REMOVIDA: FORN - PEÇA - R$ 140,00" / "INDISPONÍVEL: FORN - PEÇA - R$ 140,00 - motivo" -> {tipo, forn, chave, valor, motivo} */
var VDF_RX_REMOVE = /^(REMOVIDA|INDISPON[IÍ]VEL)\s*:\s*(.+?)\s+-\s+(.+)\s+-\s+R?\$?\s*([\d.]+(?:,\d{1,2})?)(?:\s+-\s+(.*))?\s*$/i;
function vdf_lerRemocao_(l, chaves) {
  var m = l.match(VDF_RX_REMOVE);
  if (!m) return null;
  var k = vdf_pecaDoTexto_(m[3], chaves);
  return { tipo: /^REM/i.test(m[1]) ? 'REMOVIDA' : 'INDISPONIVEL', forn: m[2].trim().toUpperCase(), chave: k ? k.chave : '', valor: vd_valorNum_(m[4]), motivo: (m[5] || '').trim() };
}

/** Link do anúncio informado na cotação: '' se vazio, a URL se válida (http/https), null se inválido. */
function vdf_linkCot_(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (!/^https?:\/\/\S+$/i.test(s) || /[()\s<>]/.test(s)) return null;
  return s.length > 500 ? null : s;
}
/** Tira o link do fim da linha de cotação ("- [🔗 link](url)" ou "- url") e devolve {linha, link}. */
function vdf_tirarLinkCot_(l) {
  var m = l.match(/^(.*?)\s+-\s+(?:\[[^\]]*\]\()?(https?:\/\/[^\s)]+)\)?\s*$/i);
  return m ? { linha: m[1], link: m[2] } : { linha: l, link: '' };
}

function vd_cotacoesDaDescricao_(desc, pecas) {
  var out = { cotacoes: [], nt: [], obs: [], semCot: [] };
  var resto = vd_dividir_(desc).resto;
  if (!resto) return out;
  var chaves = (pecas || []).map(function (p) { return { chave: vd_chavePeca_(p), desc: vd_semAcento_(p.pneu ? 'PNEU ' + p.medida : p.descricao).replace(/\s+/g, ' ').trim(), cod: vd_semAcento_(String(p.codigo || '').replace(/\s+/g, '')) }; });
  var forn = '', obs = '';
  resto.split('\n').slice(1).forEach(function (raw) {
    var l = vd_limpar_(raw).trim();
    if (!l) return;
    // cotação removida pelo cotador / indisponível na hora da compra: sai da lista (a mais recente igual)
    var rm = vdf_lerRemocao_(l, chaves);
    if (rm) {
      if (rm.chave) {
        for (var ir = out.cotacoes.length - 1; ir >= 0; ir--) {
          var q0 = out.cotacoes[ir];
          if (q0.chave === rm.chave && q0.fornecedor === rm.forn && Math.abs(q0.valor - rm.valor) < 0.005) { out.cotacoes.splice(ir, 1); break; }
        }
        if (rm.tipo === 'INDISPONIVEL') out.obs.push({ chave: rm.chave, texto: '(indisponível) ' + rm.forn + ' ' + vd_valorBR_(rm.valor) + (rm.motivo ? ': ' + rm.motivo : '') });
      }
      forn = '';
      return;
    }
    if (/^COMPRAD[OA]\s*:/i.test(l) || /^AUTORIZAD[OA]\s*:/i.test(l) || /^(RE)?COTA[ÇC][ÃA]O\s+\d{1,2}\/\d{1,2}/i.test(l) || /^AUTORIZA[ÇC][ÃA]O\s+\d{1,2}\/\d{1,2}/i.test(l) || /^DEVOLVIDA PARA COTA/i.test(l) || /^OBS GERAL\s*:/i.test(l) || /^\(texto que estava/i.test(l)) { if (/^(AUTORIZA|DEVOLVIDA)/i.test(l)) forn = ''; return; }
    /* SEM COTAÇÃO <peça>: motivo — comprador justificou por que não cotou a peça */
    var ms = l.match(/^SEM COTA[ÇC][ÃA]O\s+(.+?)\s*:\s*(.+)$/i);
    if (ms) {
      var alvoS = vd_semAcento_(ms[1]).replace(/\s+/g, ' ').trim();
      for (var is = 0; is < chaves.length; is++) {
        var ks = chaves[is];
        if ((ks.cod && ks.cod.length >= 4 && alvoS.indexOf(ks.cod) >= 0) || (!ks.cod && ks.desc && alvoS.indexOf(ks.desc) >= 0)) { out.semCot.push({ chave: ks.chave, texto: ms[2].trim() }); break; }
      }
      return;
    }
    var mo = l.match(/^OBS\s+(.+?)\s*:\s*(.+)$/i);
    if (mo) {
      var alvoO = vd_semAcento_(mo[1]).replace(/\s+/g, ' ').trim(), pecaO = null;
      for (var io = 0; io < chaves.length && !pecaO; io++) {
        var ko = chaves[io];
        if (ko.cod && ko.cod.length >= 4 && alvoO.indexOf(ko.cod) >= 0) pecaO = ko;
        else if (!ko.cod && ko.desc && alvoO.indexOf(ko.desc) >= 0) pecaO = ko;
      }
      if (pecaO) out.obs.push({ chave: pecaO.chave, texto: mo[2].trim() });
      return;
    }
    var temValor = /R\$\s*[\d.]+|\s-\s*[\d.]+(?:,\d{1,2})?\s*(?:-|$)/i.test(l);
    if (!temValor && /^\*\*[^*]+\*\*\s*$/.test(raw.trim()) && l.length <= 60 && l.indexOf('|') < 0) {
      // cabeçalho de fornecedor
      var h = l.split(/\s+-\s+/);
      // "**IMPERIAL -**" (cabeçalho antigo, digitado à mão) = IMPERIAL: tira traço/dois-pontos do fim
      forn = h[0].replace(/[\s\-–:]+$/, '').trim().toUpperCase(); obs = h.slice(1).join(' - ').trim();
      if (/^NT\b|N[ÃA]O\s+TEM/i.test(obs) && out.nt.indexOf(forn) < 0) out.nt.push(forn);
      return;
    }
    if (!forn || !temValor) return;
    var tl = vdf_tirarLinkCot_(l);   // "- [🔗 link](url)" no fim: link do anúncio (Mercado Livre etc.)
    // peça sem código cuja descrição tem " - " dentro ("… (MACANETA INTERNA) - FOTOS EM ANEXO", BAD8318 06/10/2026): a linha
    // começa com a descrição inteira; reconhece antes de separar os campos, senão o traço da descrição vira separador
    var linha = tl.linha, LN = vd_semAcento_(tl.linha).replace(/\s+/g, ' ').trim(), pre = null;
    chaves.slice().sort(function (a, b) { return b.desc.length - a.desc.length; }).forEach(function (k) {
      if (!pre && !k.cod && k.desc && k.desc.indexOf(' - ') >= 0 && LN.indexOf(k.desc + ' - ') === 0) pre = k;
    });
    if (pre) linha = 'PECA' + LN.slice(pre.desc.length);
    var m = linha.match(/^(.+?)\s+-\s+(?:(.+?)\s+-\s+)?R?\$?\s*([\d.]+(?:,\d{1,2})?)(?:\s+-\s+(?:(\d+)\s*DIAS?(?:\s+[ÚU]T(?:EIS|IL))?|(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)|(.*?)))?\s*$/i);
    if (!m) return;
    var alvo = vd_semAcento_(m[1]).replace(/\s+/g, ' ').trim();
    var peca = pre;
    for (var i = 0; i < chaves.length && !peca; i++) {
      var k = chaves[i];
      if (k.cod && k.cod.length >= 4 && alvo.indexOf(k.cod) >= 0) peca = k;
      else if (!k.cod && k.desc && (alvo === k.desc || alvo.indexOf(k.desc) >= 0)) peca = k;
    }
    if (!peca) return;
    var tm = String(m[2] || '').trim().toUpperCase();
    var tipo = '', marca = tm;
    var mt = tm.match(/^(GENU[IÍ]NO|ORIGINAL|PARALEL[OA]|USAD[OA])\b\s*(.*)$/i);
    if (mt) { tipo = vd_tipoNorm_(mt[1]); marca = mt[2].trim(); }
    out.cotacoes.push({ chave: peca.chave, fornecedor: forn, obs: obs, tipo: tipo, marca: marca, valor: vd_valorNum_(m[3]), dias: m[4] !== undefined ? +m[4] : '', data: m[5] || '', link: tl.link });
  });
  return out;
}

function vdf_nomeLista_(ctx, id) {
  var n = '';
  Object.keys(ctx.listas).forEach(function (k) { if (ctx.listas[k] === id) n = k; });
  return n;
}

function vdf_moverPara_(card, ctx, nomeLista, token, usuario) {
  var id = ctx.listas[nomeLista];
  if (!id) return '';
  try { st_permitir_(card.id, id); } catch (e) {}   // antes do PUT (e mesmo se alguém já arrastou para lá): a trava não desfaz
  if (id === card.idList) return '';
  var de = vdf_nomeLista_(ctx, card.idList);
  vd_api_('/cards/' + card.id, { method: 'put', payload: { idList: id, pos: 'top' } }, token);
  card.idList = id;
  try { ev_registrar_('COLUNA', card, usuario || 'formulário', null, { detalhe: (de || '?') + ' → ' + nomeLista }); } catch (e) {}
  return nomeLista;
}

/** Card já existe: garante o link do comprador nos anexos. */
function vdf_linkComprador_(card, ctx, token) {
  try {
    var ans = vd_api_('/cards/' + card.id + '/attachments', { query: { fields: 'name,url' } });
    if (ans.some(function (a) { return VD_LINK.RX_COMPRA.test(a.name || ''); })) return;
    vd_api_('/cards/' + card.id + '/attachments', { method: 'post', payload: { url: ctx.urlForm + '?card=' + card.shortLink + '&modo=compras', name: VD_LINK.COMPRA, setCover: false } }, token);
  } catch (e) {}
}

/**
 * p = {shortLink, cotacoes:[{chave, fornecedor, tipo, marca, valor, dias}], nt:['FORN'], obs:[{chave, texto}]}
 * Grava o bloco de cotação abaixo do marcador e move o card:
 * seguradora -> PENDENTE AUTORIZAR, particular -> COTAÇÃO FINALIZADA.
 */
function vdf_salvarCotacao(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) lança cotação — sua conta: ' + me.username + '.'] };
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro — não recebe cotação nem compra.'] };
  var an = vd_analisar_(card.desc, card.name);
  var porChave = {};
  an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var faltas = [];
  var foLista = []; try { foLista = fo_lista_(); } catch (e) {}
  var foNome = function (x) { try { return fo_resolver_(x, foLista).nome || String(x || '').trim().toUpperCase(); } catch (e) { return String(x || '').trim().toUpperCase(); } };
  var cots = (p.cotacoes || []).map(function (c, i) {
    var peca = porChave[c.chave];
    var r = { peca: peca, fornecedor: foNome(c.fornecedor), tipo: vd_tipoNorm_(c.tipo || '') || '', marca: String(c.marca || '').trim().toUpperCase(), valor: vd_valorNum_(c.valor), dias: String(c.dias == null ? '' : c.dias).trim(), link: vdf_linkCot_(c.link) };
    var rot = 'cotação ' + (i + 1) + (peca ? ' (' + vd_nomePeca_(peca) + ')' : '');
    if (!peca) faltas.push(rot + ': peça não encontrada no pedido');
    if (!r.fornecedor) faltas.push(rot + ': falta o fornecedor');
    if (isNaN(r.valor) || r.valor <= 0) faltas.push(rot + ': valor inválido');
    if (r.dias !== '' && !/^\d+$/.test(r.dias)) faltas.push(rot + ': prazo em dias úteis (número)');
    if (r.tipo && r.tipo.charAt(0) === '?') faltas.push(rot + ': tipo inválido');
    if (r.link === null) faltas.push(rot + ': link inválido — cole o endereço completo, começando com http (ou deixe vazio)');
    return r;
  });
  var nt = (p.nt || []).map(foNome).filter(String);
  var obs = (p.obs || []).map(function (o) { return { peca: porChave[o.chave], texto: String(o.texto || '').replace(/\s*\n\s*/g, ' ').trim() }; }).filter(function (o) { return o.peca && o.texto; });
  var semCot = (p.semCot || []).map(function (o) { return { peca: porChave[o.chave], chave: o.chave, texto: String(o.texto || '').replace(/\s*\n\s*/g, ' ').trim() }; }).filter(function (o) { return o.peca && o.texto; });
  semCot.forEach(function (s) { if (cots.some(function (c) { return c.peca === s.peca; })) faltas.push(vd_nomePeca_(s.peca) + ': tem cotação e justificativa de não cotar ao mesmo tempo — deixe só uma'); });
  // remover / editar cotação já lançada: só antes da autorização (e da compra) daquela peça
  var lidasAntes = vd_cotacoesDaDescricao_(card.desc, an.pecas).cotacoes;
  var autsAntes = []; try { autsAntes = vd_autorizacoesDaDescricao_(card.desc, an.pecas); } catch (e) {}
  var rem = [];
  (p.remover || []).forEach(function (r) {
    var peca = porChave[r.chave], forn = String(r.fornecedor || '').trim().toUpperCase(), valor = vd_valorNum_(r.valor);
    if (!peca) return;
    if (!lidasAntes.some(function (q) { return q.chave === r.chave && q.fornecedor === forn && Math.abs(q.valor - valor) < 0.005; })) return;
    if (autsAntes.some(function (a) { return a.chave === r.chave; })) { faltas.push(vd_nomePeca_(peca) + ': já autorizada — a cotação não pode mais ser alterada (na compra, use "cotação indisponível")'); return; }
    rem.push({ peca: peca, fornecedor: forn, valor: valor });
  });
  /* 07/10/2026 (Weslley): o comprador salva a cotação aos poucos, conforme recebe.
   *  parcial = true  -> grava o que veio, card fica em EM COTAÇÃO (etiqueta COTAÇÃO PARCIAL), sem exigir cobertura, sem mencionar ninguém.
   *  parcial = false -> "enviar": exige toda peça com cotação ou motivo; sem novidade também vale (fecha o que foi salvo parcialmente). */
  var parcial = !!p.parcial;
  var nada = !cots.length && !nt.length && !obs.length && !semCot.length && !rem.length;
  if (nada && parcial) faltas.push('Nada novo para salvar.');
  if (faltas.length) return { ok: false, faltas: faltas };
  var novaDesc = card.desc;
  if (!nada) novaDesc = vdf_descComCotacao_(card, an, me, cots, nt, obs, semCot, rem);
  // enviar: toda peça precisa de cotação OU de justificativa para não cotar (salvar parcial não exige)
  var cobPrev = vdf_coberturaCotacao_(novaDesc, an.pecas);
  if (!parcial && cobPrev.faltam.length) return { ok: false, faltas: cobPrev.faltam.map(function (n) { return n + ': sem cotação — lance a cotação, escreva o motivo de não cotar, ou use "Salvar parcial"'; }) };
  if (!nada) {
    vd_backup_(card, 'cotação ' + (parcial ? 'parcial ' : '') + 'lançada pelo formulário por ' + me.username);
    vd_gravarDesc_(card.id, novaDesc, token);
    try { fo_registrarUso_(cots.map(function (c) { return c.fornecedor; }).concat(nt), me.username); } catch (e) {}
    try {
      ev_registrar_('COTAÇÃO', card, me.username,
        cots.map(function (c) { var e = ev_peca_(c.peca); e.fornecedor = c.fornecedor; e.valor = c.valor; e.dias = c.dias; e.detalhe = [c.tipo, c.marca].filter(String).join(' ') + (parcial ? ' (parcial)' : ''); return e; })
          .concat(semCot.map(function (x) { var e = ev_peca_(x.peca); e.detalhe = 'SEM COTAÇÃO: ' + x.texto; return e; }))
          .concat(nt.map(function (f) { return { fornecedor: f, detalhe: 'NT (não tem)' }; }))
          .concat(rem.map(function (r) { var e = ev_peca_(r.peca); e.fornecedor = r.fornecedor; e.valor = r.valor; e.detalhe = 'COTAÇÃO REMOVIDA'; return e; })));
    } catch (e) {}
  }

  /* Cobertura (somando as cotações que já estavam no card): cada peça da oficina precisa de
   * cotação OU de justificativa (SEM COTAÇÃO). Parcial (botão "Salvar parcial" ou cobertura incompleta) -> card fica
   * em EM COTAÇÃO com a etiqueta COTAÇÃO PARCIAL. Completa e enviada -> anda (seguradora: PENDENTE AUTORIZAR;
   * particular: COTAÇÃO FINALIZADA), avisando as peças não cotadas e o motivo. */
  var cob = cobPrev;
  // só peças particulares -> COTAÇÃO FINALIZADA (o consultor autoriza); havendo peça da seguradora -> PENDENTE AUTORIZAR
  var particular = an.pecas.length ? an.pecas.every(function (x) { return vdf_pecaParticular_(x, card, an); }) : vdf_ehParticular_(card, an);
  var misto = !particular && an.pecas.some(function (x) { return x.particular; });
  var movido = '';
  try { movido = vdf_moverPara_(card, ctx, parcial || cob.faltam.length ? VD.LISTA_COTACAO : (particular ? VDF_LISTA_FINALIZADA : VDF_LISTA_PENDENTE), token, me.username); } catch (e) {}
  try { vdf_etiquetaParcial_(card, parcial || cob.faltam.length > 0, token); } catch (e) {}
  var nPc = Object.keys(cots.reduce(function (a, c) { a[c.chave || vd_chavePeca_(c.peca)] = 1; return a; }, {})).length;
  if (parcial) {
    // salva aos poucos: comentário curto, sem mencionar ninguém (o card não anda)
    try {
      var txtP = '💾 **COTAÇÃO PARCIAL salva** — ' + me.fullName + ' · ' + cots.length + ' cotação(ões) em ' + nPc + ' peça(s)' + (nt.length ? ' · ' + nt.length + ' NT' : '') + (movido ? ' → **' + movido + '**' : '')
        + (cob.faltam.length ? '\n⏳ falta cotar ou justificar: ' + cob.faltam.join(', ') : '\n✅ todas as peças cobertas — falta só **Enviar cotação** pela aba Cotação.');
      vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txtP } }, token);
    } catch (e) {}
    try { vd_marcar_(card); } catch (e) {}
    return { ok: true, parcial: true, url: card.shortUrl, nome: card.name, lista: movido || vdf_nomeLista_(ctx, card.idList), n: cots.length, obs: obs.length, faltam: cob.faltam, semCot: cob.semCot.length };
  }
  try {
    // menciona o setor de compras (quem cuida do card daqui em diante), não o consultor (05/10/2026, Weslley);
    // o consultor só é mencionado quando é ele quem autoriza (pedido particular / peças particulares dele)
    var compr = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).toLowerCase().split(/[,;\s]+/).filter(function (u) { return u && u !== String(me.username).toLowerCase(); })[0] || '';   // 1º da lista (comprasunity), como no AUTORIZADO
    var quem = particular ? vd_criador_(card.id) : '';
    var mencoes = [compr, quem].concat(an.pecas.map(function (x) { return x.partPor; })).filter(function (u, i, a) { return u && u !== String(me.username).toLowerCase() && a.indexOf(u) === i; });
    var txt = mencoes.map(function (u) { return '@' + u + ' '; }).join('') + '💰 **COTAÇÃO** — ' + me.fullName + ' · ' + (nada ? 'enviada (salva antes aos poucos)' : cots.length + ' cotação(ões) em ' + nPc + ' peça(s)' + (nt.length ? ' · ' + nt.length + ' NT' : '')) + (movido ? ' → **' + movido + '**' : '');
    if (cob.faltam.length) txt += '\n⏳ **PARCIAL** — falta cotar ou justificar: ' + cob.faltam.join(', ');
    else if (cob.semCot.length) txt += '\n⛔ **NÃO COTADAS:** ' + cob.semCot.map(function (s) { return s.nome + ' (' + s.texto + ')'; }).join('; ');
    if (misto && !cob.faltam.length) txt += '\n👤 Particulares: autoriza o consultor pela aba Autorizar.';
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, lista: movido || vdf_nomeLista_(ctx, card.idList), n: cots.length, obs: obs.length, faltam: cob.faltam, semCot: cob.semCot.length };
}

/** Monta a descrição nova com o bloco de cotação deste envio (abaixo do marcador). */
function vdf_descComCotacao_(card, an, me, cots, nt, obs, semCot, rem) {
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  var ordem = [], grupos = {};
  cots.forEach(function (c) {
    if (!grupos[c.fornecedor]) { grupos[c.fornecedor] = []; ordem.push(c.fornecedor); }
    var nomeP = c.peca.pneu ? 'PNEU ' + String(c.peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(c.peca);
    grupos[c.fornecedor].push(nomeP + (c.tipo || c.marca ? ' - ' + [c.tipo, c.marca].filter(String).join(' ') : '') + ' - ' + vd_valorBR_(c.valor) + (c.dias !== '' ? ' - ' + c.dias + (c.dias === '1' ? ' dia útil' : ' dias úteis') : '')
      + (c.link ? ' - [🔗 link](' + c.link + ')' : ''));   // link do anúncio (Mercado Livre etc.): vira link clicável na descrição
  });
  var L = ['**COTAÇÃO ' + agora + ' - ' + me.fullName + '**'];
  rem.forEach(function (r) { L.push('REMOVIDA: ' + r.fornecedor + ' - ' + (r.peca.pneu ? 'PNEU ' + String(r.peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(r.peca)) + ' - ' + vd_valorBR_(r.valor)); });
  ordem.forEach(function (f) { L.push('**' + f + '**'); L = L.concat(grupos[f]); });
  nt.forEach(function (f) { if (!grupos[f]) L.push('**' + f + ' - NT**'); });
  obs.forEach(function (o) { L.push('OBS ' + vd_nomePeca_(o.peca) + ': ' + o.texto); });
  semCot.forEach(function (s) { L.push('SEM COTAÇÃO ' + (s.peca.pneu ? 'PNEU ' + String(s.peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(s.peca)) + ': ' + s.texto); });

  var div = vd_dividir_(card.desc);
  var resto = div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR;
  return div.bloco.replace(/\s+$/, '') + '\n\n' + resto + '\n\n' + L.join('\n');
}

/** Quais peças da oficina ainda não têm cotação nem justificativa de não cotar. */
function vdf_coberturaCotacao_(desc, pecas) {
  var lidas = vd_cotacoesDaDescricao_(desc, pecas);
  var faltam = [], sem = [];
  (pecas || []).forEach(function (p) {
    var k = vd_chavePeca_(p), nome = p.pneu ? 'PNEU ' + String(p.medida || '').replace(/\s+/g, '') : vd_nomePeca_(p);
    if (lidas.cotacoes.some(function (q) { return q.chave === k; })) return;
    var j = lidas.semCot.filter(function (s) { return s.chave === k; }).pop();
    if (j) sem.push({ nome: nome, texto: j.texto }); else faltam.push(nome);
  });
  return { faltam: faltam, semCot: sem };
}

var VDF_ETIQUETA_PARCIAL = 'COTAÇÃO PARCIAL';
/** Põe ou tira a etiqueta COTAÇÃO PARCIAL (laranja) do card. */
function vdf_etiquetaParcial_(card, por, token) {
  var id = pz_labelId_(card.idBoard, VDF_ETIQUETA_PARCIAL, 'orange');
  var tem = (card.labels || []).some(function (l) { return l.id === id; });
  if (por && !tem) vd_api_('/cards/' + card.id + '/idLabels', { method: 'post', payload: { value: id } }, token);
  if (!por && tem) vd_api_('/cards/' + card.id + '/idLabels/' + id, { method: 'delete' }, token);
}

/**
 * Linhas de autorização abaixo do marcador:
 *   **AUTORIZAÇÃO 28/09/2026 09:40 - Nome**
 *   AUTORIZADO: FORNECEDOR - CÓDIGO DESCRIÇÃO - R$ 95,50
 * Devolve [{chave, fornecedor, valor, quem, quando}] — a autorização mais recente de cada peça vale.
 */
function vd_autorizacoesDaDescricao_(desc, pecas) {
  var resto = vd_dividir_(desc).resto;
  if (!resto) return [];
  var chaves = (pecas || []).map(function (p) { return { chave: vd_chavePeca_(p), desc: vd_semAcento_(p.pneu ? 'PNEU ' + p.medida : p.descricao).replace(/\s+/g, ' ').trim(), cod: vd_semAcento_(String(p.codigo || '').replace(/\s+/g, '')) }; });
  var porChave = {}, quem = '', quando = '';
  resto.split('\n').forEach(function (raw) {
    var l = vd_limpar_(raw).trim();
    var h = l.match(/^AUTORIZA[ÇC][ÃA]O\s+(\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+\d{1,2}:\d{2})?)\s+-\s+(.+)$/i);
    if (h) { quando = h[1]; quem = h[2].trim(); return; }
    if (/^DEVOLVIDA PARA COTA/i.test(l)) { porChave = {}; return; }   // devolução anula autorizações anteriores
    var rmA = vdf_lerRemocao_(l, chaves);
    if (rmA) { if (rmA.tipo === 'INDISPONIVEL' && rmA.chave && porChave[rmA.chave] && porChave[rmA.chave].fornecedor === rmA.forn) delete porChave[rmA.chave]; return; }
    var m = l.match(/^AUTORIZAD[OA]\s*:\s*(.+?)\s+-\s+(.+)\s+-\s+R?\$?\s*([\d.]+(?:,\d{1,2})?)\s*$/i);
    if (!m) return;
    var alvo = vd_semAcento_(m[2]).replace(/\s+/g, ' ').trim(), peca = null;
    for (var i = 0; i < chaves.length && !peca; i++) {
      var k = chaves[i];
      if (k.cod && k.cod.length >= 4 && alvo.indexOf(k.cod) >= 0) peca = k;
      else if (!k.cod && k.desc && alvo.indexOf(k.desc) >= 0) peca = k;
    }
    if (peca) porChave[peca.chave] = { chave: peca.chave, fornecedor: m[1].trim().toUpperCase(), valor: vd_valorNum_(m[3]), quem: quem, quando: quando };
  });
  return Object.keys(porChave).map(function (k) { return porChave[k]; });
}

var VDF_LISTA_AUTORIZADO = 'AUTORIZADO COMPRA';

/**
 * p = {shortLink, escolhas:[{chave, fornecedor, valor}]}
 * Autorizador (ou, no particular, o consultor que criou) escolhe UMA cotação por peça.
 * Grava as linhas AUTORIZADO abaixo do marcador e move o card para AUTORIZADO COMPRA.
 */
function vdf_autorizar(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro — não recebe autorização.'] };
  var an = vd_analisar_(card.desc, card.name);
  if (!vdf_podeAutorizar_(me, card, an)) {
    return { ok: false, faltas: [vdf_ehParticular_(card, an) ? 'Pedido particular: quem autoriza é o consultor que fez o pedido (ou a diretoria).' : 'Só a diretoria autoriza as peças da seguradora; as peças particulares, o consultor que as lançou (sua conta: ' + me.username + ').'] };
  }
  var criador; try { criador = vd_criador_(card.id); } catch (e) { criador = ''; }
  var porChave = {};
  an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var lidas = vd_cotacoesDaDescricao_(card.desc, an.pecas).cotacoes;
  var faltas = [], linhas = [], total = 0, evAut = [];
  (p.escolhas || []).forEach(function (e, i) {
    var peca = porChave[e.chave];
    if (!peca) { faltas.push('escolha ' + (i + 1) + ': peça não encontrada no pedido'); return; }
    if (!vdf_podeAutorizarPeca_(me, card, an, peca, criador)) { faltas.push(vd_nomePeca_(peca) + ': ' + (vdf_pecaParticular_(peca, card, an) ? 'peça particular — quem autoriza é o consultor que a lançou' : 'peça da seguradora — quem autoriza é a diretoria')); return; }
    var forn = String(e.fornecedor || '').trim().toUpperCase(), valor = vd_valorNum_(e.valor);
    var q = lidas.filter(function (x) { return x.chave === e.chave && x.fornecedor === forn && Math.abs(x.valor - valor) < 0.005; })[0];
    if (!q) { faltas.push(vd_nomePeca_(peca) + ': essa cotação (' + forn + ' ' + vd_valorBR_(valor) + ') não está no card'); return; }
    linhas.push('AUTORIZADO: ' + forn + ' - ' + (peca.pneu ? 'PNEU ' + String(peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(peca)) + ' - ' + vd_valorBR_(valor));
    total += valor;
    var doPeca = lidas.filter(function (x) { return x.chave === e.chave; }).map(function (x) { return x.valor; });
    var ea = ev_peca_(peca); ea.fornecedor = forn; ea.valor = valor; ea.dias = q.dias;
    ea.detalhe = doPeca.length > 1 ? 'menor ' + vd_valorBR_(Math.min.apply(null, doPeca)) + ' · maior ' + vd_valorBR_(Math.max.apply(null, doPeca)) + ' · ' + doPeca.length + ' cotações' : '1 cotação';
    evAut.push(ea);
  });
  if (!linhas.length && !faltas.length) faltas.push('Escolha a cotação de pelo menos uma peça.');
  if (faltas.length) return { ok: false, faltas: faltas };
  var obsL = vdf_linhasObs_(p, porChave, 'autorização');

  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  var div = vd_dividir_(card.desc);
  var resto = div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR;
  vd_backup_(card, 'compra autorizada pelo formulário por ' + me.username);
  var novaDesc = div.bloco.replace(/\s+$/, '') + '\n\n' + resto + '\n\n**AUTORIZAÇÃO ' + agora + ' - ' + me.fullName + '**\n' + linhas.concat(obsL.linhas).join('\n');
  vd_gravarDesc_(card.id, novaDesc, token);
  // card com peças da seguradora E particulares: só vai para AUTORIZADO COMPRA quando as duas partes
  // tiverem autorização (diretoria + consultor). Enquanto isso fica onde está, avisando quem falta.
  var autsAgora = vd_autorizacoesDaDescricao_(novaDesc, an.pecas);
  var temAut = function (x) { return autsAgora.some(function (a) { return a.chave === vd_chavePeca_(x); }); };
  var grupoSeg = an.pecas.filter(function (x) { return !vdf_pecaParticular_(x, card, an); }), grupoPart = an.pecas.filter(function (x) { return vdf_pecaParticular_(x, card, an); });
  var aguarda = [];
  if (grupoSeg.length && grupoPart.length) {
    if (!grupoSeg.some(temAut)) aguarda.push('peças da seguradora — diretoria');
    if (!grupoPart.some(temAut)) {
      var donos = grupoPart.map(function (x) { return x.partPor || criador; }).filter(function (u, i, a) { return u && a.indexOf(u) === i; });
      aguarda.push('peças particulares — ' + (donos.length ? donos.map(function (u) { return '@' + u; }).join(' ') : 'consultor'));
    }
  }
  var movido = '';
  try { ev_registrar_('AUTORIZAÇÃO', card, me.username, evAut, { detalhe: aguarda.length ? 'aguardando: ' + aguarda.join('; ') : '' }); } catch (e) {}
  if (!aguarda.length) { try { movido = vdf_moverPara_(card, ctx, VDF_LISTA_AUTORIZADO, token, me.username); } catch (e) {} }
  // "sem autorização" só conta as peças que ESTA pessoa podia autorizar
  var semAut = an.pecas.filter(function (x) { return vdf_podeAutorizarPeca_(me, card, an, x, criador) && !temAut(x); }).length;   // autorizada antes (ex.: complemento) não conta
  try {
    var compr = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).split(/[,;\s]+/).filter(function (u) { return u && u.toLowerCase() !== String(me.username).toLowerCase(); })[0];
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: (compr ? '@' + compr + ' ' : '') + '✅ **AUTORIZADO** — ' + me.fullName + ' · ' + linhas.length + ' peça(s) · ' + vd_valorBR_(total) + (movido ? ' → **' + movido + '**' : '') +
      (semAut ? '\n⛔ Sem autorização (não comprar): ' + semAut + ' peça(s)' : '') + obsL.texto + (aguarda.length ? '\n⏳ Aguarda: ' + aguarda.join('; ') : '') } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: linhas.length, total: total, semAut: semAut, aguarda: aguarda, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

/** Observações por peça ({chave, texto}) e geral do autorizador -> linhas "OBS PEÇA: texto" + "OBS GERAL: texto" e texto para o comentário. */
function vdf_linhasObs_(p, porChave, rotulo) {
  var linhas = [], txt = [];
  (p.obs || []).forEach(function (o) {
    var peca = porChave[o.chave], t = String(o.texto || '').replace(/\s*\n\s*/g, ' ').trim();
    if (!peca || !t) return;
    var nome = peca.pneu ? 'PNEU ' + String(peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(peca);
    linhas.push('OBS ' + nome + ': (' + rotulo + ') ' + t);
    txt.push('- ' + nome + ': ' + t);
  });
  var geral = String(p.geral || '').replace(/\s*\n\s*/g, ' ').trim();
  if (geral) { linhas.push('OBS GERAL: (' + rotulo + ') ' + geral); txt.unshift(geral); }
  return { linhas: linhas, n: linhas.length, texto: txt.length ? '\n📝 ' + txt.map(function (t) { return t.replace(/^- /, ''); }).join(' · ') : '' };
}

/**
 * p = {shortLink, obs:[{chave, texto}], geral}
 * Quem autoriza devolve a cotação ao comprador (incompleta / precisa de mais opções).
 * Grava o bloco DEVOLVIDA PARA COTAÇÃO (anula autorizações anteriores) e volta o card para EM COTAÇÃO.
 */
function vdf_devolverCotacao(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var an = vd_analisar_(card.desc, card.name);
  if (!vdf_podeDevolver_(me, card, an)) return { ok: false, faltas: ['Só a diretoria pode devolver a cotação' + (an.pecas.some(function (x) { return x.particular; }) ? ' deste card (tem peças da seguradora junto com as particulares)' : '') + ' — sua conta: ' + me.username + '. Escreva a observação na peça e autorize só o que estiver certo.'] };
  // depois da compra não volta para cotação (anularia a autorização de peça já comprada)
  try {
    var cCk = vd_api_('/cards/' + card.id, { query: { fields: 'name', checklists: 'all', checkItem_fields: 'name' } });
    if (vdf_itensPagas_(cCk).length) return { ok: false, faltas: ['Este card já tem peça comprada — não volta para cotação. Para trocar uma peça, use "cotação autorizada indisponível" na aba Compra, ou inclua a peça nova pelo ✏️ EDITAR/INCLUIR PEÇA.'] };
  } catch (e) { return { ok: false, faltas: ['Não consegui conferir as compras do card agora. Tente de novo em alguns segundos.'] }; }
  var porChave = {};
  an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var obsL = vdf_linhasObs_(p, porChave, 'devolução');
  if (!obsL.n) return { ok: false, faltas: ['Escreva o motivo da devolução (geral ou em alguma peça) — é o que o comprador vai ler.'] };
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  var div = vd_dividir_(card.desc);
  var resto = div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR;
  vd_backup_(card, 'cotação devolvida pelo formulário por ' + me.username);
  vd_gravarDesc_(card.id, div.bloco.replace(/\s+$/, '') + '\n\n' + resto + '\n\n**DEVOLVIDA PARA COTAÇÃO ' + agora + ' - ' + me.fullName + '**\n' + obsL.linhas.join('\n'), token);
  try { ev_registrar_('DEVOLUÇÃO', card, me.username, null, { detalhe: [String(p.geral || '').trim()].concat((p.obs || []).map(function (o) { return o.texto; })).filter(String).join(' | ').slice(0, 500) }); } catch (e) {}
  var movido = '';
  try { movido = vdf_moverPara_(card, ctx, VD.LISTA_COTACAO, token, me.username); } catch (e) {}
  try {
    var compr = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).split(/[,;\s]+/).filter(function (u) { return u && u.toLowerCase() !== String(me.username).toLowerCase(); })[0];
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: (compr ? '@' + compr + ' ' : '') + '↩️ **COTAÇÃO DEVOLVIDA** — ' + me.fullName + (movido ? ' → **' + movido + '**' : '') + obsL.texto } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: obsL.n, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

/** Última devolução ainda valendo (sem cotação nova depois): {quem, quando, geral} ou null. */
function vd_ultimaDevolucao_(desc) {
  var resto = vd_dividir_(desc).resto || '', dev = null;
  resto.split('\n').forEach(function (raw) {
    var l = vd_limpar_(raw).trim(), m;
    if ((m = l.match(/^DEVOLVIDA PARA COTA[ÇC][ÃA]O\s+(\S+(?:\s+\d{1,2}:\d{2})?)\s+-\s+(.+)$/i))) dev = { quando: m[1], quem: m[2].trim(), geral: '' };
    else if (dev && (m = l.match(/^OBS GERAL\s*:\s*(?:\(devolu[çc][ãa]o\)\s*)?(.+)$/i))) dev.geral = m[1].trim();
    else if (/^COTA[ÇC][ÃA]O\s+\d{1,2}\/\d{1,2}/i.test(l) || /^AUTORIZA[ÇC][ÃA]O\s+\d/i.test(l)) dev = null;
  });
  return dev;
}

/**
 * Comprador conferiu no Databox (ordem autorizada + orçamento importado) e marca a etiqueta ORDEM AUTORIZADA pelo formulário.
 * p = {shortLink}
 */
function vdf_marcarOrdemAutorizada(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) marca a ordem autorizada — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,idBoard,shortLink,shortUrl,labels' } });
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  if (card.idBoard !== board.id) return { ok: false, faltas: ['Este card não é do quadro do formulário.'] };
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (vdf_temOrdemAut_(card)) return { ok: true, ja: true, nome: card.name, url: card.shortUrl };
  var labels = vd_api_('/boards/' + vd_board_() + '/labels', { query: { fields: 'name', limit: 100 } });
  var etq = labels.filter(function (l) { return vd_semAcento_(String(l.name || '')).toUpperCase().indexOf(VDF_ETIQ_ORDEM) >= 0 && !/NAO/.test(vd_semAcento_(String(l.name || '')).toUpperCase()); })[0];
  if (!etq) return { ok: false, faltas: ['O quadro não tem a etiqueta ORDEM AUTORIZADA.'] };
  vd_api_('/cards/' + card.id + '/idLabels', { method: 'post', payload: { value: etq.id } }, token);
  (card.labels || []).forEach(function (l) {   // tira "ORDEM NAO AUTORIZADA", se tinha
    if (/ORDEM NAO AUTORIZADA/.test(vd_semAcento_(String(l.name || '')).toUpperCase())) { try { vd_api_('/cards/' + card.id + '/idLabels/' + l.id, { method: 'delete' }, token); } catch (e) {} }
  });
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🏷️ **ORDEM AUTORIZADA** marcada por ' + me.fullName + ' pelo formulário (conferido no Databox).' } }, token); } catch (e) {}
  return { ok: true, nome: card.name, url: card.shortUrl };
}

/**
 * Card sem etiqueta ORDEM AUTORIZADA: o comprador conferiu no Databox e avisa quem fez o pedido.
 * p = {shortLink, naoAutorizada:bool, naoImportado:bool, obs}
 */
function vdf_avisarSolicitante(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) faz este aviso — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,idBoard,shortLink,shortUrl,labels' } });
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  if (card.idBoard !== board.id) return { ok: false, faltas: ['Este card não é do quadro do formulário.'] };
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (vdf_temOrdemAut_(card)) return { ok: false, faltas: ['O card já tem a etiqueta ORDEM AUTORIZADA — pode registrar a compra.'] };
  var falta = [];
  if (p.naoAutorizada) falta.push('ordem de serviço **não autorizada** no Databox');
  if (p.naoImportado) falta.push('orçamento **não importado** no Databox');
  var obs = String(p.obs || '').trim().slice(0, 500);
  if (!falta.length && !obs) return { ok: false, faltas: ['Marque o que falta no Databox ou escreva uma observação.'] };
  var cache = CacheService.getScriptCache(), ch = 'avsol_' + card.shortLink;
  if (cache.get(ch)) return { ok: false, faltas: ['Este aviso já foi enviado há poucos minutos. Aguarde a resposta no card.'] };
  var quem = ''; try { quem = vd_criador_(card.id); } catch (e) {}
  var txt = (quem ? '@' + quem + ' ' : '') + '🏷️ **ORDEM AUTORIZADA PENDENTE** — ' + me.fullName + ' conferiu no Databox antes da compra:' +
    falta.map(function (f) { return '\n• ' + f; }).join('') +
    (obs ? '\n• Obs.: ' + obs : '') +
    '\nA compra fica parada até resolver. Depois de acertar no Databox, coloque a etiqueta **ORDEM AUTORIZADA** no card.';
  vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } }, token);
  cache.put(ch, '1', 600);
  return { ok: true, nome: card.name, url: card.shortUrl, quem: quem };
}

/**
 * p = {shortLink, compras:[{chave, fornecedor, tipo, marca, valor, dias}]}
 * Cria/atualiza o checklist PAGAS direto (nada vai para a descrição). Tudo comprado -> FALTA CHEGAR.
 */
function vdf_salvarCompra(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) registra compra — sua conta: ' + me.username + '.'] };
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro — não recebe cotação nem compra.'] };
  if (!vdf_temOrdemAut_(card)) return { ok: false, faltas: ['🏷️ FALTA A ETIQUETA ORDEM AUTORIZADA — confira no Databox se a ordem está autorizada e o orçamento importado. Se estiver tudo certo, coloque a etiqueta no card e envie de novo; se não, avise o solicitante no card.'] };
  var an = vd_analisar_(card.desc, card.name);
  var porChave = {};
  an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var cotLidas = vd_cotacoesDaDescricao_(card.desc, an.pecas), lidas = cotLidas.cotacoes;
  var naoCotadas = (cotLidas.semCot || []).map(function (x) { return x.chave; });   // justificadas: não ficam esperando compra
  var faltas = [], compras = [];
  (p.compras || []).forEach(function (c, i) {
    var peca = porChave[c.chave];
    var rot = 'compra ' + (i + 1) + (peca ? ' (' + vd_nomePeca_(peca) + ')' : '');
    if (!peca) { faltas.push(rot + ': peça não encontrada no pedido'); return; }
    var forn = String(c.fornecedor || '').trim().toUpperCase();
    var valor = vd_valorNum_(c.valor);
    // só cotação que está no card
    var qc = lidas.filter(function (q) { return q.chave === c.chave && q.fornecedor === forn && Math.abs(q.valor - valor) < 0.005; })[0];
    var ok = !!qc;
    // prazo diferente do cotado = previsão mudada na compra: exige motivo (vai para o card como fora da autorização)
    if (qc && String(qc.dias == null ? '' : qc.dias) !== '' && String(c.dias == null ? '' : c.dias).trim() !== '' && +c.dias !== +qc.dias && !String(c.just || '').trim())
      { faltas.push(rot + ': prazo ' + c.dias + ' d.u. diferente do cotado (' + qc.dias + ' d.u.) — escreva o motivo.'); return; }
    if (!ok) { faltas.push(rot + ': escolha uma cotação lançada no card (' + forn + ' ' + vd_valorBR_(valor) + ' não está na descrição)'); return; }
    compras.push({ chave: c.chave, codigo: peca.pneu ? '' : peca.codigo, descricao: peca.pneu ? vd_nomePeca_(peca) : peca.descricao, fornecedor: forn, valor: valor, dias: String(c.dias == null ? '' : c.dias).trim(), particular: vdf_pecaParticular_(peca, card, an) && !vdf_ehParticular_(card, an), complemento: !!peca.complemento, just: String(c.just || '').replace(/\s*\n\s*/g, ' ').trim() });
  });
  if (!compras.length && !faltas.length) faltas.push('Escolha o fornecedor de pelo menos uma peça.');
  if (faltas.length) return { ok: false, faltas: faltas };

  // fora da autorização: não bloqueia, mas exige justificativa por peça e fica registrado no card
  var auts = vd_autorizacoesDaDescricao_(card.desc, an.pecas), foraAut = [], semJust = [];
  compras.forEach(function (c) {
    var ch = c.chave, nome = vd_nomePeca_(porChave[ch]);
    var a = auts.filter(function (x) { return x.chave === ch; })[0];
    var txt = '';
    if (!a) txt = nome + ' (sem autorização)';
    else if (a.fornecedor !== c.fornecedor || Math.abs(a.valor - c.valor) >= 0.005) txt = nome + ' (aut. ' + a.fornecedor + ' ' + vd_valorBR_(a.valor) + ' → ' + c.fornecedor + ' ' + vd_valorBR_(c.valor) + ')';
    else {
      var qd = lidas.filter(function (q) { return q.chave === ch && q.fornecedor === c.fornecedor && Math.abs(q.valor - c.valor) < 0.005; })[0];
      if (qd && String(qd.dias == null ? '' : qd.dias) !== '' && c.dias !== '' && +c.dias !== +qd.dias) txt = nome + ' (prazo ' + qd.dias + ' → ' + c.dias + ' d.u.)';
    }
    if (!txt) return;
    if (!c.just) semJust.push(nome);
    foraAut.push(txt + (c.just ? ' — ' + c.just : ''));
  });
  if (semJust.length) return { ok: false, faltas: semJust.map(function (n) { return n + ': compra fora da autorização — escreva o motivo.'; }) };

  var n = vd_checklistPagas_(card.id, compras, token);
  try {
    ev_registrar_('COMPRA', card, me.username, compras.map(function (c) {
      var e = ev_peca_(porChave[c.chave]); e.fornecedor = c.fornecedor; e.valor = c.valor; e.dias = c.dias;
      e.previsao = c.dias !== '' ? vd_dataMaisDias_(c.dias) : '';
      var fa = foraAut.filter(function (f) { return f.indexOf(vd_nomePeca_(porChave[c.chave])) === 0; })[0];
      e.detalhe = fa ? 'FORA DA AUTORIZAÇÃO: ' + fa : '';
      return e;
    }));
  } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) { console.log('vitrine/compra: ' + e); }   // mostra 🛒 na descrição

  // tudo comprado? -> FALTA CHEGAR
  var movido = '', pendentes = 0;
  try {
    var ls = vd_api_('/cards/' + card.id, { query: { fields: 'id', checklists: 'all', checkItem_fields: 'name' } }).checklists || [];
    var nomes = [];
    ls.filter(function (k) { return /^PAGAS/i.test((k.name || '').trim()); }).forEach(function (k) { (k.checkItems || []).forEach(function (i) { nomes.push(vd_semAcento_(i.name)); }); });
    // pendente = peça autorizada (ou, sem nenhuma autorização no card, qualquer peça) ainda sem PAGAS;
    // peça não autorizada não prende o card em AUTORIZADO COMPRA
    var autCh = auts.map(function (a) { return a.chave; });
    an.pecas.forEach(function (x) {
      var k = vd_chavePeca_(x);
      if (naoCotadas.indexOf(k) >= 0) return;
      if (autCh.length && autCh.indexOf(k) < 0) return;
      if (!nomes.some(function (nm) { return vd_casaItem_(nm, k); })) pendentes++;
    });
    if (!pendentes) movido = vdf_moverPara_(card, ctx, VDF_LISTA_CHEGAR, token, me.username);
  } catch (e) {}
  try {
    var dirs = foraAut.length ? sla_users_('SLA_AUTORIZAR', 'timweslley,comercialunity').filter(function (u) { return u !== me.username; }) : [];
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: dirs.map(function (u) { return '@' + u + ' '; }).join('') +
      '🛒 **COMPRA** — ' + me.fullName + ' · ' + n + ' item(ns)' + (movido ? ' → **' + movido + '**' : '') +
      (pendentes ? '\n⏳ Falta comprar: ' + pendentes + ' peça(s)' : '') +
      (foraAut.length ? '\n⚠️ **FORA DA AUTORIZAÇÃO:**\n' + foraAut.map(function (f) { return '- ' + f; }).join('\n') : '') } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, pagas: n, pendentes: pendentes, foraAut: foraAut, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

/** Linhas "COMPRADO: FORNECEDOR - CÓDIGO DESCRIÇÃO - R$ valor - dd/mm" em qualquer parte da descrição. */
/** Peças da oficina do card que ainda não têm cotação, "não cotada", autorização nem compra — nomes curtos (06/10/2026). */
function vd_pecasSemCotacao_(card) {
  var desc = card.desc || '', an = vd_analisar_(desc, card.name || '');
  var cot = { cotacoes: [], semCot: [] }, auts = [], compras = [];
  try { cot = vd_cotacoesDaDescricao_(desc, an.pecas); } catch (e) {}
  try { auts = vd_autorizacoesDaDescricao_(desc, an.pecas); } catch (e) {}
  try { compras = vd_comprasDaDescricao_(desc); } catch (e) {}
  return (an.pecas || []).filter(function (p) {
    var k = vd_chavePeca_(p);
    if ((cot.cotacoes || []).some(function (q) { return q.chave === k; })) return false;
    if ((cot.semCot || []).some(function (q) { return q.chave === k; })) return false;
    if (auts.some(function (q) { return q.chave === k; })) return false;
    if (compras.some(function (c) { var ck = vd_semAcento_((c.codigo || '').replace(/\s+/g, '') || c.descricao); return ck && (ck === k || (p.codigo && vd_semAcento_(c.codigo) === vd_semAcento_(p.codigo))); })) return false;
    return true;
  }).map(vd_nomePeca_);
}

function vd_comprasDaDescricao_(desc) {
  var out = [];
  vd_limpar_(desc).split('\n').forEach(function (l) {
    l = l.replace(/\s*_?\([^()]*\)_?\s*$/, '');   // tira a nota "(quem, quando)" do fim
    var m = l.match(/^\s*COMPRAD[OA]\s*:\s*(.+?)\s+-\s+(.+?)(?:\s+-\s+R?\$?\s*([\d.]+,?\d*))?(?:\s+-\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?))?\s*$/i);
    if (!m) return;
    var peca = m[2].trim();
    var mc = peca.match(/^([A-Z0-9][A-Z0-9\/.\-]{3,})\s+(.+)$/i);
    if (mc && !/\d/.test(mc[1])) mc = null;   // código tem de ter número
    out.push({ fornecedor: m[1].trim(), codigo: mc ? mc[1] : '', descricao: mc ? mc[2] : peca, valor: m[3] || '', previsao: m[4] || '' });
  });
  return out;
}

/* ---------- salvar ---------- */

/**
 * p = {shortLink, dados:{modelo,ano,motor,chassi,placa}, pecas:[...], obs,
 *      novo:{carro,cor,seguradora,sinistro,unidade}, fileIds:[], orcamento:{origem, fo:[]},
 *      rotina:true (só diretoria, card novo: aceita peça sem tipo/código; com peça da oficina nasce em FALTA DADOS PARA COTAR), aviso:'texto p/ equipe',
 *      criarMesmoAssim:true (card novo com placa que já tem card aberto: sem isso devolve {ok:false, duplicado:[{shortLink,nome,lista}]})}
 */
function vdf_salvar(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var cardCampos = false;
  var ctx = vd_contexto_();
  var d = {
    modelo: String(p.dados.modelo || '').trim().toUpperCase(),
    ano: String(p.dados.ano || '').trim(),
    motor: String(p.dados.motor || '').trim().toUpperCase(),
    chassi: vd_normChassi_(p.dados.chassi),
    placa: vd_normPlaca_(p.dados.placa)
  };
  var pecas = (p.pecas || []).map(function (x) {
    return x.pneu
      ? { pneu: true, medida: String(x.medida || '').trim().toUpperCase().replace(/\s+/g, ''), categoria: x.categoria || '', marca: String(x.marca || '').trim().toUpperCase(), qtd: x.qtd || '' }
      : { pneu: false, codigo: String(x.codigo || '').trim().toUpperCase(), descricao: String(x.descricao || '').trim().toUpperCase(), tipos: (x.tipos || []).slice(0, 3), qtd: x.qtd || '' };
  });
  var n = p.novo || {};
  // peça de orçamento complementar (só peça da seguradora): marca "COMPLEMENTO dd/mm"
  (p.pecas || []).forEach(function (x, i) {
    if (x.complemento && !x.particular) { pecas[i].complemento = true; pecas[i].compData = String(x.compData || '').match(/^\d{1,2}\/\d{1,2}$/) ? x.compData : cp_hoje_(); }
    // "não comprar" (05/10/2026): peça do orçamento que a oficina não vai comprar — fica só de registro no card
    // 🚫 não comprar e ➕ complemento não convivem: marcar complemento é pedir a compra (QPG1B84, 06/10/2026)
    if (x.naoComprar && !(x.complemento && !x.particular)) { pecas[i].naoComprar = true; pecas[i].naoMotivo = String(x.naoMotivo || '').replace(/\s*\n\s*/g, ' ').trim().slice(0, 80); }
    // valor líquido da peça no orçamento (lido do PDF ou digitado): informativo, livre para editar, não trava (05/10/2026)
    pecas[i].valorOrc = vd_valorOrcTxt_(x.valorOrc);
    // observação do consultor sobre a peça (06/10/2026): vai na linha da peça ("| OBS: …") e aparece para o comprador
    pecas[i].obs = String(x.obs || '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '/').trim().slice(0, 120);
  });
  // peça particular dentro do pedido de seguradora: guarda quem lançou (é quem autoriza)
  if (vd_tipoNormPedido_(n.tipo) !== 'PARTICULAR') {
    (p.pecas || []).forEach(function (x, i) {
      if (!x.particular) return;
      pecas[i].particular = true;
      // quem lançou a peça particular é quem autoriza: fora da diretoria, sempre a própria pessoa
      pecas[i].partPor = String((vdf_ehAutorizador_(me) && x.partPor) || me.username || '').toLowerCase().replace(/[^\w.\-]/g, '');
    });
    // na descrição: primeiro as peças da seguradora, depois as particulares
    pecas = pecas.filter(function (x) { return !x.particular; }).concat(pecas.filter(function (x) { return x.particular; }));
  }
  var orc = p.orcamento || null;
  var fo = orc && orc.fo ? orc.fo : [];
  var tipo = vd_tipoNormPedido_(n.tipo) || 'SEGURADORA';
  var particular = tipo === 'PARTICULAR';
  var extra = {
    tipo: tipo,
    cor: String(n.cor || '').trim().toUpperCase(),
    seguradora: particular ? 'PARTICULAR' : String(n.seguradora || '').trim().toUpperCase(),
    sinistro: String(n.sinistro || '').trim(),
    fo: fo,
    origemOrc: orc && orc.origem ? orc.origem : ''
  };
  if (!extra.origemOrc && p.shortLink) {
    try {
      var cAnt = vd_api_('/cards/' + p.shortLink, { query: { fields: 'desc' } });
      var mOrc = vd_limpar_(cAnt.desc || '').match(/OR[ÇC]AMENTO IMPORTADO \(([^)]*)\)/i);
      if (mOrc) extra.origemOrc = mOrc[1];
    } catch (e) {}
  }
  var obs = String(p.obs || '').replace(/\s*\n\s*/g, ' ').trim();
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');

  // card existente: descobre coluna e peças que já existiam
  var card = null, lista = '', posCot = false, baseSigs = null, baseTodas = null;
  if (p.shortLink) {
    card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard' } });
    if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro — não pode ser usado como pedido. Clique em "Fazer pedido novo em vez disso".'] };
    lista = vd_api_('/lists/' + card.idList, { query: { fields: 'name' } }).name;
    posCot = vdf_ehPosCotacao_(lista);
    // peça já autorizada ou comprada: não muda nem sai do pedido (só a diretoria)
    if (!vdf_ehAutorizador_(me)) {
      try {
        var cTr = vd_api_('/cards/' + card.id, { query: { fields: 'name', checklists: 'all', checkItem_fields: 'name' } });
        var anTr = vd_analisar_(card.desc, card.name), autsTr = vd_autorizacoesDaDescricao_(card.desc, anTr.pecas);
        var novasSig = pecas.map(function (x) { return vdf_sigTrava_(x); });
        var travaErr = [];
        anTr.pecas.forEach(function (x) {
          var tr = vdf_travaPeca_(x, autsTr, cTr);
          if (tr && novasSig.indexOf(vdf_sigTrava_(x)) < 0) travaErr.push(vd_nomePeca_(x) + ': peça ' + tr.toLowerCase() + ' — não pode ser alterada nem removida (só a diretoria).');
        });
        if (travaErr.length) return { ok: false, faltas: travaErr };
      } catch (e) { console.log('trava de peça: ' + e); return { ok: false, faltas: ['Não consegui conferir as peças travadas agora (Trello lento). Envie de novo em alguns segundos.'] }; }
    }
    // fora da diretoria: não muda o tipo do pedido nem passa peça de seguradora para particular (e vice-versa)
    if (!vdf_ehAutorizador_(me)) {
      var anOr = vd_analisar_(card.desc, card.name), cardOr = { name: card.name, labels: [] };
      var eraPart = vdf_ehParticular_(cardOr, anOr);
      var tNovo = vd_tipoNormPedido_(n.tipo);
      if (anOr.pecas.length && tNovo && eraPart !== (tNovo === 'PARTICULAR'))
        return { ok: false, faltas: ['Só a diretoria muda o tipo do pedido (seguradora / particular).'] };
      var orPor = {};
      anOr.pecas.forEach(function (x) { orPor[vd_chavePeca_(x)] = x; });
      var trocou = [];
      pecas.forEach(function (x) {
        var o = orPor[vd_chavePeca_(x)];
        if (!o) return;
        if (!!o.particular !== !!x.particular) trocou.push(vd_nomePeca_(x));
        if (o.partPor) x.partPor = o.partPor;
      });
      if (trocou.length) return { ok: false, faltas: trocou.map(function (t) { return t + ': só a diretoria passa a peça entre seguradora e particular.'; }) };
    }
    if (posCot) baseSigs = vd_analisar_(card.desc, card.name).pecas.map(function (x) { return x.sig; });
    if (posCot) baseTodas = vd_linhasConsultor_(vd_dividir_(card.desc).bloco).map(vd_sigItem_);
    // orçamento novo trocou o código de peça que já existia (05/10/2026): não é peça nova — a base acompanha o código novo
    var trocas = ((p.complemento && p.complemento.atualizar) || []).filter(function (u) { return u && u.codigo && u.codigoAntigo; });
    if (posCot && trocas.length) {
      var troca = function (sig) { trocas.forEach(function (u) { sig = sig.replace(new RegExp('(^|[^A-Z0-9])' + vd_semAcento_(u.codigoAntigo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Z0-9])'), '$1' + vd_semAcento_(u.codigo)); }); return sig; };
      baseSigs = baseSigs.map(troca); baseTodas = baseTodas.map(troca);
    }
  }

  var comp = card && p.complemento ? p.complemento : null;
  var compFo = comp ? (comp.fo || []) : [];
  // card que já tem FORNECIMENTO no checklist pode ficar sem peça da oficina (só FO -> robô leva a FALTA CHEGAR)
  var temFoNoCard = false;
  if (card && !pecas.length && !fo.length && !compFo.length) {
    try { temFoNoCard = /^FORNECIMENTO/i.test(vd_limpar_(vd_dividir_(card.desc).bloco).split('\n').filter(function (l) { return /^FORNECIMENTO\b/i.test(l.trim()); }).join('\n')); } catch (e) {}
  }
  if (!pecas.length && !fo.length && !compFo.length && !temFoNoCard) return { ok: false, faltas: ['Adicione pelo menos uma peça (ou importe um orçamento com peças da seguradora). Se a peça não vai ser comprada, marque 🚫 Não comprar em vez de remover.'] };
  var temOrcNoCard = !!(card && vd_analisar_(card.desc, card.name).doOrcamento);
  var soAcrescentaParticular = !!card && (p.pecas || []).some(function (x) { return x.particular; });
  if (!particular && !posCot && !(orc && orc.origem) && !temOrcNoCard && !soAcrescentaParticular && !comp) {
    return { ok: false, faltas: ['Pedido de seguradora: anexe o orçamento autorizado (PDF do Cilia, HDI ou Websoma) na seção Documento — o formulário importa as peças dele. Se for cliente particular, marque "Particular" no tipo do pedido.'] };
  }
  // card existente: mantém as linhas de FORNECIMENTO que já estavam no bloco
  if (card) extra.foLinhas = vd_dividir_(card.desc).bloco.split('\n').filter(function (l) { return /^FORNECIMENTO\b/i.test(vd_limpar_(l).trim()); });
  // orçamento complementar: peças novas da seguradora -> checklist FORNECIMENTO COMPLEMENTO (antes de montar o bloco, para a contagem)
  var nFoComp = 0;
  if (compFo.length) {
    try {
      nFoComp = vdf_checklistFornecimento_(card.id, compFo, token, CP.FO);
      var totFoC = cp_contarChecklist_(card.id, CP.FO, token);
      extra.foLinhas = (extra.foLinhas || []).filter(function (l) { return !/^FORNECIMENTO COMPLEMENTO/i.test(vd_limpar_(l).trim()); });
      if (totFoC) extra.foLinhas.push(cp_linhaFo_(totFoC));
    } catch (e) { console.log('FO complemento: ' + e); }
  }
  var bloco = vd_montarBloco_(d, pecas, obs, 'Pedido enviado por ' + me.fullName + ' pelo formulário em ' + agora, extra);
  var an = vd_analisar_(bloco, d.placa, posCot ? { base: baseSigs, tipo: tipo } : { tipo: tipo });
  var faltas = an.faltas.slice();
  if (!String(n.carro || '').trim()) faltas.unshift('carro (nome curto para o título)');
  // ROTINA (diretoria): card aberto a partir do Cilia/portal pela Rotina Unity. Peça sem tipo/código é aceita;
  // com peça da oficina o card nasce em FALTA DADOS PARA COTAR para o consultor completar; só FO -> o robô leva a FALTA CHEGAR.
  var rotina = !!p.rotina && vdf_ehAutorizador_(me) && !p.shortLink;
  var faltasRotina = [];
  if (rotina) { faltasRotina = faltas.filter(function (f) { return /falta o tipo de pe|falta o c[óo]digo|fora do padr/i.test(f); }); faltas = faltas.filter(function (f) { return faltasRotina.indexOf(f) < 0; }); }
  if (faltas.length) return { ok: false, faltas: faltas };

  var titulo = String(n.carro || '').trim() ? vd_titulo_(d.placa, n.carro, extra.cor, extra.seguradora) : '';
  var novasPecas = posCot ? an.novas : [];
  // card NOVO com placa que já tem card aberto no quadro: só cria com confirmação explícita (criarMesmoAssim)
  if (!p.shortLink && !p.criarMesmoAssim) {
    var jaTem = [];
    try { jaTem = vdf_buscarPlaca(token, d.placa, d.chassi); } catch (e) { jaTem = []; }
    if (jaTem.length) return { ok: false, duplicado: jaTem, placa: d.placa, faltas: ['Já existe card aberto com esta placa/chassi: ' + jaTem.map(function (c) { return c.nome + ' (' + c.lista + (c.porChassi ? ', mesmo chassi' : '') + ')'; }).join('; ') + '. Atualize esse card ou confirme que quer criar outro.'] };
  }

  if (card) {
    var div = vd_dividir_(card.desc);
    var resto = div.temMarcador ? div.resto
      : VD.MARCADOR + (String(card.desc || '').trim() ? '\n_(texto que estava no card antes do formulário)_\n' + card.desc : '');
    if (typeof trocas !== 'undefined' && trocas.length) { try { resto = cp_trocarCodigos_(resto, trocas); } catch (e) {} }   // cotações/autorizações seguem o código novo
    vd_backup_(card, 'editado pelo formulário por ' + me.username);
    var upd = { desc: bloco + '\n\n' + resto };
    if (titulo && titulo !== card.name) upd.name = titulo;
    vd_gravarDesc_(card.id, upd.desc, token, upd.name ? { name: upd.name } : null);
    if (upd.name) card.name = upd.name;
  } else {
    var corpo = { idList: ctx.listas[rotina && pecas.length ? VD.LISTA_FALTA : VD.LISTA_COTACAO] || ctx.listas[VD.LISTA_COTACAO], name: titulo, desc: bloco + '\n\n' + VD.MARCADOR, pos: 'top' };
    card = vd_api_('/cards', { method: 'post', payload: corpo }, token);
    if (rotina) {
      try {
        var avisoR = String(p.aviso || '').trim();
        vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🤖 **Card aberto pela Rotina Unity** a partir de ' + (extra.origemOrc || 'portal/Cilia') + ' — a equipe ainda não tinha feito o pedido.' +
          (pecas.length ? '\nPeças da oficina sem tipo/código: complete pelo ✏️ **EDITAR/INCLUIR PEÇA** — o card sai de FALTA DADOS sozinho.' : '\nSó fornecimento da seguradora: ver checklist FORNECIMENTO.') +
          (faltasRotina.length ? '\n' + faltasRotina.slice(0, 8).map(function (f) { return '- ' + f; }).join('\n') : '') + (avisoR ? '\n' + avisoR : '') } }, token);
      } catch (e) {}
    }
    try { vd_gravarDesc_(card.id, corpo.desc, token); } catch (e) { try { tr_guardar_(card.id, corpo.desc); } catch (e2) {} }
    try {
      vd_api_('/cards/' + card.id + '/attachments', { method: 'post', payload: { url: ctx.urlForm + '?card=' + card.shortLink, name: VD_LINK.EDITAR, setCover: false } }, token);
    } catch (e) {}
  }
  // nº da ordem (Databox) e unidade: campo personalizado + etiqueta, no pedido novo e na edição
  try { if (vdf_gravarOrdem_(card.id, p.dados.ordem)) cardCampos = true; } catch (e) { console.log('ordem: ' + e); }
  try { if (vdf_gravarUnidade_(card, n.unidade)) cardCampos = true; } catch (e) { console.log('unidade: ' + e); }
  if (cardCampos) { try { cf_sincronizar_(card.id); } catch (e) {} }
  vdf_linkComprador_(card, ctx, token);

  var nFo = 0;
  try { nFo = vdf_checklistFornecimento_(card.id, fo, token); } catch (e) {}
  var nPagas = 0;
  // compra só pela aba Compra (vdf_salvarCompra: permissão, etiqueta, autorização); o pedido não grava compra
  var compras = [];
  if (compras.length) {
    try { nPagas = vd_checklistPagas_(card.id, compras, token); } catch (e) {}
    // registra a compra na descrição, abaixo da linha de cotação
    try {
      var cAtual = vd_api_('/cards/' + card.id, { query: { fields: 'desc' } });
      var dv = vd_dividir_(cAtual.desc);
      var linhas = compras.map(function (c) {
        return 'COMPRADO: ' + String(c.fornecedor).trim().toUpperCase() + ' - ' + (c.codigo ? String(c.codigo).replace(/\s+/g, '').toUpperCase() + ' ' : '') + String(c.descricao || '').trim().toUpperCase() +
          (c.valor ? ' - R$ ' + String(c.valor).trim() : '') + (c.previsao ? ' - ' + vd_dataCurta_(c.previsao) : '') + ' _(' + me.username + ' ' + agora + ')_';
      }).filter(function (l) { return (cAtual.desc || '').indexOf(l.split(' _(')[0]) < 0; });
      if (linhas.length) {
        var lr = String(dv.resto || VD.MARCADOR).split('\n');
        lr.splice(1, 0, linhas.join('\n'));
        vd_gravarDesc_(card.id, dv.bloco + '\n\n' + lr.join('\n'), token);
      }
    } catch (e) {}
  }

  var anexados = 0, capaOk = false, repetidos = [], idsSubidos = [];
  // anexos que já estão no card (mesmo nome e tamanho) não sobem de novo
  var jaNoCard = [];
  if (p.shortLink && (p.fileIds || []).length) {
    try { jaNoCard = vd_api_('/cards/' + card.id + '/attachments', { query: { fields: 'name,fileName,bytes,date,isUpload' } }, token); } catch (e) {}
  }
  // o que o formulário sabe de cada arquivo (tipo: 'orc' | 'orc+' | 'capa' | ''; origem: Cilia/HDI/Websoma) — nome padronizado (05/10/2026)
  var infoArq = {};
  (p.arquivos || []).forEach(function (x) { if (x && x.fileId) infoArq[x.fileId] = x; });
  (p.fileIds || []).forEach(function (fid) {
    try {
      var f = vdf_arquivoTemp_(fid);
      var ehCapa = p.capaId && fid === p.capaId;
      // o nome do anexo no Trello pode ter sido padronizado: compara pelo nome ORIGINAL do arquivo (fileName) e tamanho
      if (!ehCapa && jaNoCard.some(function (a) { return (a.fileName || a.name) === f.getName() && +a.bytes === f.getSize(); })) {
        repetidos.push(f.getName()); f.setTrashed(true); return;
      }
      var mp = { file: f.getBlob(), name: f.getName() };
      if (ehCapa) mp.setCover = 'true';
      var at = vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: mp }, token);
      if (at && at.id) idsSubidos.push(at.id);
      if (ehCapa && at && at.id) { try { vd_api_('/cards/' + card.id, { method: 'put', payload: { idAttachmentCover: at.id } }, token); capaOk = true; } catch (e2) {} }
      if (at && at.id) {
        try {
          var inf = infoArq[fid] || {}, ehImg = /^image\//i.test(f.getMimeType() || '') || /\.(jpe?g|png|webp|gif)$/i.test(f.getName());
          var nomeAx = ehCapa ? ax_nome_(AX.FOTO, d.placa, ['capa'])
            : inf.tipo === 'orc' || inf.tipo === 'orc+' ? ax_nome_(inf.tipo === 'orc+' ? AX.ORC_MAIS : AX.ORC, d.placa, [extra.seguradora !== 'PARTICULAR' ? extra.seguradora : '', ax_origem_(inf.origem || extra.origemOrc)])
            : ehImg ? ax_nome_(AX.FOTO, d.placa, []) : '';
          if (nomeAx) { at.name = ax_batizar_(card.id, at.id, nomeAx, jaNoCard, token, { semVersao: ehCapa || ehImg }); jaNoCard.push({ id: at.id, name: at.name, date: new Date().toISOString() }); }
        } catch (e3) { console.log('nome do anexo: ' + e3); }
      }
      f.setTrashed(true);
      anexados++;
    } catch (e) {}
  });

  // orçamento complementar: o robô não precisa ler de novo o PDF que subiu agora; comentário no card
  var compOf = pecas.filter(function (x) { return x.complemento && x.compData === cp_hoje_() && (!posCot || an.novas.some(function (nv) { return vd_chavePeca_(nv) === vd_chavePeca_(x); })); });
  if (comp) {
    try { cp_marcarVistos_(idsSubidos); } catch (e) {}
    // peça que passou de FO para oficina (06/10/2026): sai do checklist FORNECIMENTO (a linha da oficina já está no bloco)
    var paraOf = (comp.paraOficina || []).filter(function (x) { return x && x.itemId; });
    paraOf.forEach(function (x) { try { vd_api_('/cards/' + card.id + '/checkItem/' + x.itemId, { method: 'delete' }, token); } catch (e) { console.log('FO→oficina: ' + e); } });
    if (compOf.length || nFoComp || (comp.pareadas || []).length || paraOf.length) {
      try {
        vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: cp_textoComentario_(me.fullName, comp.origem || '', '', compOf, compFo.slice(0, nFoComp ? compFo.length : 0), 0, '', comp.pareadas || [], [], paraOf.map(function (x) { return { item: { name: x.nome || '', lista: x.lista || '' }, peca: { descricao: x.peca || '' } }; })) } }, token);
      } catch (e) {}
      try { ev_registrar_('COMPLEMENTO', card, me.username, compOf.map(ev_peca_).concat(compFo.map(function (x) { var e = ev_peca_(x); e.fornecedor = 'SEGURADORA (FO)'; return e; })), { detalhe: compOf.length + ' oficina · ' + nFoComp + ' FO · ' + (comp.origem || '') }); } catch (e) {}
    }
  } else if (card && pecas.some(function (x) { return x.complemento; })) {
    // marcado à mão no formulário (sem PDF): só as peças que NÃO eram complemento antes
    try {
      var eramComp = {};
      vd_analisar_(card.desc, card.name).pecas.forEach(function (x) { if (x.complemento) eramComp[vd_chavePeca_(x)] = 1; });
      var novasComp = pecas.filter(function (x) { return x.complemento && !eramComp[vd_chavePeca_(x)]; });
      if (novasComp.length) {
        vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '➕ **COMPLEMENTO** marcado por ' + me.fullName + ' — fora do orçamento autorizado, vai no orçamento complementar da seguradora: ' + novasComp.map(cp_nome_).join('; ') + '\n_(na compra entra em PAGAS COMPLEMENTO)_' } }, token);
        ev_registrar_('COMPLEMENTO', card, me.username, novasComp.map(ev_peca_), { detalhe: novasComp.length + ' oficina · marcado à mão' });
      }
    } catch (e) { console.log('complemento à mão: ' + e); }
  }

  // confere na hora
  var acao = '';
  try {
    var c2 = vd_api_('/cards/' + card.id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,dateLastActivity,labels', attachments: 'true', attachment_fields: 'name,fileName,mimeType,isUpload,bytes,url,date' } });
    var props = PropertiesService.getScriptProperties();
    if (posCot) {
      if (novasPecas.length) {
        // peça nova em card que já andou: devolve para EM COTAÇÃO
        vd_pkSet_(card.id, baseTodas);
        acao = vd_conferirPosCotacao_(c2, ctx).acao;
      } else {
        vd_pkSet_(card.id, vd_linhasConsultor_(an.div.bloco).map(vd_sigItem_));
        acao = 'card continua em ' + lista;
        // peça removida / FO complementar: a coluna pode ter mudado (tudo comprado, ou card encerrado reaberto)
        try { var mvS = rc_reavaliarColuna_(card.id, token, me.username); if (mvS) acao = 'card → ' + mvS; } catch (e) { console.log('salvar/coluna: ' + e); }
      }
    } else if (c2.idList === ctx.listas[VD.LISTA_COTACAO] || c2.idList === ctx.listas[VD.LISTA_FALTA]) {
      acao = vd_conferirCard_(c2, ctx).acao;
    }
    vd_marcar_(c2);
  } catch (e) {}
  try {
    var evPecas = (posCot ? novasPecas : an.pecas).map(ev_peca_);
    ev_registrar_(!p.shortLink ? 'PEDIDO' : (posCot && novasPecas.length ? 'PEÇA NOVA' : 'PEDIDO EDITADO'), { name: card.name, shortLink: card.shortLink, shortUrl: card.shortUrl, labels: (typeof c2 !== 'undefined' && c2 && c2.labels) || [] },
      me.username, evPecas, { tipo: tipo, detalhe: (nFo ? nFo + ' peça(s) FO' : '') });
  } catch (e) {}

  return { ok: true, url: card.shortUrl, shortLink: card.shortLink, nome: card.name, acao: acao, novo: !p.shortLink, fo: nFo, foComp: nFoComp, comp: compOf.length, pagas: nPagas, anexos: anexados, capa: capaOk, repetidos: repetidos };
}

/** Sobe um arquivo do formulário para a pasta temporária (sem ler) — fotos, capa etc. */
function vdf_subirArquivo(token, base64, mime, nome) {
  vdf_usuario_(token);
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, nome);
  return { fileId: vdf_pastaTemp_().createFile(blob).getId() };
}

/**
 * Cotação autorizada que não está mais disponível na hora da compra.
 * p = {shortLink, itens:[{chave, fornecedor, valor, motivo, nova:{fornecedor, tipo, marca, valor, dias} | null}]}
 * Grava "INDISPONÍVEL: FORN - PEÇA - R$ - motivo" (anula a autorização e tira a cotação) e a cotação nova,
 * e devolve o card para autorização (com cotação nova) ou para EM COTAÇÃO (sem cotação nova).
 */
function vdf_cotacaoIndisponivel(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) registra cotação indisponível — sua conta: ' + me.username + '.'] };
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var an = vd_analisar_(card.desc, card.name);
  var porChave = {}; an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var lidas = vd_cotacoesDaDescricao_(card.desc, an.pecas).cotacoes;
  var pagos = []; (card.checklists || []).forEach(function (k) { if (/^PAGAS/i.test(String(k.name || '').trim())) (k.checkItems || []).forEach(function (i) { pagos.push(vd_semAcento_(i.name)); }); });
  var foNome = function (x) { try { return fo_resolver_(x).nome || String(x || '').trim().toUpperCase(); } catch (e) { return String(x || '').trim().toUpperCase(); } };
  var faltas = [], linhas = [], novas = {}, ordem = [], afetadas = [], evs = [];
  (p.itens || []).forEach(function (it, i) {
    var peca = porChave[it.chave];
    if (!peca) { faltas.push('item ' + (i + 1) + ': peça não encontrada'); return; }
    var nomeP = peca.pneu ? 'PNEU ' + String(peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(peca);
    var forn = String(it.fornecedor || '').trim().toUpperCase(), valor = vd_valorNum_(it.valor), motivo = String(it.motivo || '').replace(/\s*\n\s*/g, ' ').replace(/\s+-\s+/g, ' – ').replace(/R\$/gi, 'R$ ').trim();
    if (!motivo) { faltas.push(nomeP + ': escreva o motivo (por que a cotação não está disponível)'); return; }
    if (pagos.some(function (n) { return n.indexOf(vd_chavePeca_(peca)) >= 0; })) { faltas.push(nomeP + ': já está comprada'); return; }
    if (!lidas.some(function (q) { return q.chave === it.chave && q.fornecedor === forn && Math.abs(q.valor - valor) < 0.005; })) { faltas.push(nomeP + ': cotação ' + forn + ' ' + vd_valorBR_(valor) + ' não está no card'); return; }
    linhas.push('INDISPONÍVEL: ' + forn + ' - ' + nomeP + ' - ' + vd_valorBR_(valor) + ' - ' + motivo);
    var e = ev_peca_(peca); e.fornecedor = forn; e.valor = valor; e.detalhe = 'indisponível: ' + motivo; evs.push(e);
    afetadas.push(peca);
    var n = it.nova;
    if (n && String(n.fornecedor || '').trim()) {
      var nf = foNome(n.fornecedor), nv = vd_valorNum_(n.valor), nd = String(n.dias == null ? '' : n.dias).trim(), nt = vd_tipoNorm_(n.tipo || '') || '', nm = String(n.marca || '').trim().toUpperCase();
      if (isNaN(nv) || nv <= 0) { faltas.push(nomeP + ': valor da cotação nova inválido'); return; }
      if (nd !== '' && !/^\d+$/.test(nd)) { faltas.push(nomeP + ': prazo da cotação nova em dias úteis (número)'); return; }
      if (!novas[nf]) { novas[nf] = []; ordem.push(nf); }
      novas[nf].push(nomeP + (nt || nm ? ' - ' + [nt, nm].filter(String).join(' ') : '') + ' - ' + vd_valorBR_(nv) + (nd !== '' ? ' - ' + nd + (nd === '1' ? ' dia útil' : ' dias úteis') : ''));
      var e2 = ev_peca_(peca); e2.fornecedor = nf; e2.valor = nv; e2.dias = nd; e2.detalhe = 'cotação nova (no lugar da indisponível)'; evs.push(e2);
    }
  });
  if (!linhas.length && !faltas.length) faltas.push('Marque a peça com cotação indisponível e escreva o motivo.');
  if (faltas.length) return { ok: false, faltas: faltas };

  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  var L = ['**RECOTAÇÃO ' + agora + ' - ' + me.fullName + '**'].concat(linhas);
  ordem.forEach(function (f) { L.push('**' + f + '**'); L = L.concat(novas[f]); });
  var div = vd_dividir_(card.desc);
  var resto = div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR;
  vd_backup_(card, 'cotação indisponível registrada por ' + me.username);
  vd_gravarDesc_(card.id, div.bloco.replace(/\s+$/, '') + '\n\n' + resto + '\n\n' + L.join('\n'), token);
  try { fo_registrarUso_(ordem, me.username); } catch (e) {}
  try { ev_registrar_('COTAÇÃO INDISPONÍVEL', card, me.username, evs); } catch (e) {}

  // para onde vai: com cotação nova -> autorização de novo; sem -> volta para EM COTAÇÃO
  var criador = ''; try { criador = vd_criador_(card.id); } catch (e) {}
  var temNova = ordem.length > 0, soPart = afetadas.every(function (x) { return vdf_pecaParticular_(x, card, an); });
  var destino = !temNova ? VD.LISTA_COTACAO : (soPart ? VDF_LISTA_FINALIZADA : VDF_LISTA_PENDENTE);
  var movido = '';
  try { movido = vdf_moverPara_(card, ctx, destino, token, me.username); } catch (e) {}
  try {
    var us = [];
    if (temNova) afetadas.forEach(function (x) { if (vdf_pecaParticular_(x, card, an)) us.push(x.partPor || criador); else us = us.concat(sla_users_('SLA_AUTORIZAR', 'timweslley,comercialunity')); });
    us = us.filter(function (u, i) { return u && u !== me.username && us.indexOf(u) === i; });
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: us.map(function (u) { return '@' + u + ' '; }).join('') + '⚠️ **COTAÇÃO INDISPONÍVEL** — ' + me.fullName + (movido ? ' → **' + movido + '**' : '') + '\n' +
      linhas.map(function (l) { return '- ' + l.replace(/^INDISPON[IÍ]VEL:\s*/i, ''); }).join('\n') +
      (temNova ? '\n↪️ Cotação nova: autorizar de novo.' : '\n↪️ Sem cotação nova: volta para cotação.') } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: linhas.length, nova: temNova, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}
