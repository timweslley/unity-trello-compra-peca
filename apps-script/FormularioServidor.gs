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
  'vdf_salvarCotacao', 'vdf_salvarCompra', 'vdf_salvar', 'vdf_subirArquivo', 'vdf_lerAnexoCard', 'vdf_autorizar', 'vdf_devolverCotacao', 'vdf_salvarRecebimento', 'vdf_cotacaoIndisponivel', 'vdf_compararComplemento'];

function doPost(e) {
  var out, rid = '', cache = null;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var fn = String(req.fn || '');
    if (VDF_API.indexOf(fn) < 0) throw new Error('Função não permitida: ' + fn);
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
  var labels = vd_api_('/boards/' + vd_board_() + '/labels', { query: { fields: 'name,color', limit: 100 } })
    .filter(function (l) { return /TOLEDO|RONDON|CASCAVEL|MOUR/i.test(l.name || ''); })
    .map(function (l) { return { id: l.id, name: l.name }; });
  return {
    nome: me.fullName, usuario: me.username, quadro: board.name, urlQuadro: board.shortUrl, unidades: labels, comprador: vdf_ehComprador_(me),
    cfg: { teste: vd_board_() === VD.BOARD_PADRAO, tipos: VD.TIPOS, categPneu: VD.CATEG_PNEU }
  };
}

/* abre o formulário numa chamada só: dados do usuário + card (quando é edição).
 * Todas as leituras do Trello vão em paralelo (fetchAll) — ~5 chamadas viram 1 rodada. */
function vdf_abrir(token, shortLink) {
  if (!token) throw new Error('LOGIN: entre com sua conta do Trello.');
  var base = 'https://api.trello.com/1', b = vd_board_();
  function req(url, tk) { return { url: base + url, method: 'get', muteHttpExceptions: true, headers: { Authorization: vd_auth_(tk) } }; }
  var reqs = [
    req('/members/me?fields=fullName,username', token),
    req('/boards/' + b + '?fields=id,name,shortUrl'),
    req('/boards/' + b + '/labels?fields=name,color&limit=100'),
    req('/boards/' + b + '/lists?fields=name&filter=all')
  ];
  if (shortLink) reqs.push(req('/cards/' + encodeURIComponent(shortLink) + '?fields=name,desc,idBoard,idList,shortLink,shortUrl,idLabels,labels&checklists=all&checkItem_fields=name,state,due&attachments=true&attachment_fields=name,mimeType,isUpload,bytes,url'));
  var rs = UrlFetchApp.fetchAll(reqs);
  if (rs[0].getResponseCode() >= 300) throw new Error('LOGIN: seu acesso ao Trello expirou. Entre de novo.');
  for (var i = 1; i < rs.length; i++) {
    if (rs[i].getResponseCode() >= 300) throw new Error('Trello ' + rs[i].getResponseCode() + ': ' + rs[i].getContentText().slice(0, 120));
  }
  var me = JSON.parse(rs[0].getContentText());
  var board = JSON.parse(rs[1].getContentText());
  var labels = JSON.parse(rs[2].getContentText())
    .filter(function (l) { return /TOLEDO|RONDON|CASCAVEL|MOUR/i.test(l.name || ''); })
    .map(function (l) { return { id: l.id, name: l.name }; });
  var listas = JSON.parse(rs[3].getContentText());
  // membro do quadro? (mesma regra de vdf_usuario_, com o cache)
  var cache = CacheService.getScriptCache(), chave = 'vdf_membros_' + b, membros = cache.get(chave);
  if (!membros) {
    membros = JSON.stringify(vd_api_('/boards/' + b + '/members', { query: { fields: 'username' } }).map(function (m) { return m.id; }));
    cache.put(chave, membros, 600);
  }
  if (JSON.parse(membros).indexOf(me.id) < 0) throw new Error('Sua conta do Trello (' + me.username + ') não participa do quadro. Peça para ser adicionado.');
  var info = {
    nome: me.fullName, usuario: me.username, quadro: board.name, urlQuadro: board.shortUrl, unidades: labels, comprador: vdf_ehComprador_(me),
    cfg: { teste: b === VD.BOARD_PADRAO, tipos: VD.TIPOS, categPneu: VD.CATEG_PNEU }
  };
  var card = null;
  if (shortLink) {
    var c = JSON.parse(rs[4].getContentText());
    if (c.idBoard !== board.id) throw new Error('Este card não é do quadro do formulário.');
    var lst = listas.filter(function (l) { return l.id === c.idList; })[0];
    card = vdf_montarCard_(c, lst ? lst.name : '', me);
  }
  return { info: info, card: card };
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

function vdf_buscarPlaca(token, placa) {
  vdf_usuario_(token);
  if (!vd_placaValida_(placa)) return [];
  var listas = vd_api_('/boards/' + vd_board_() + '/lists', { query: { fields: 'name' } });
  var nomeLista = {};
  listas.forEach(function (l) { nomeLista[l.id] = l.name; });
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { query: { fields: 'name,idList,shortLink,desc' } });
  return cards.filter(function (c) {
    if (vdf_cardProtegido_(c.name)) return false;
    var p = vd_placaDoTexto_(c.name) || vd_analisar_(c.desc, c.name).dados.placa;
    return vd_mesmaPlaca_(p, placa);
  }).map(function (c) { return { shortLink: c.shortLink, nome: c.name, lista: nomeLista[c.idList] || '' }; });
}

function vdf_ehPosCotacao_(nomeLista) {
  return VD.LISTAS_FORA.indexOf(String(nomeLista || '').trim().toUpperCase()) < 0;
}

/** Card fixo do quadro ("➕ NOVO PEDIDO DE PEÇA") e cards de AVISO nunca são editados pelo formulário. */
function vdf_cardProtegido_(nome) {
  return /NOVO PEDIDO DE PE[ÇC]A/i.test(nome || '') || /^\s*AVISO\b/i.test(nome || '');
}

function vdf_carregarCard(token, shortLink) {
  var me = vdf_usuario_(token);
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  var c = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard,idList,shortLink,shortUrl,idLabels,labels', checklists: 'all', checkItem_fields: 'name,state,due', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url' } });
  if (c.idBoard !== board.id) throw new Error('Este card não é do quadro do formulário.');
  var lista = vd_api_('/lists/' + c.idList, { query: { fields: 'name' } }).name;
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
  return {
    shortLink: c.shortLink, url: c.shortUrl, nome: c.name, lista: lista, posCotacao: vdf_ehPosCotacao_(lista),
    dados: an.dados, obs: obs,
    pecas: (function () {
      var criador; try { criador = vd_criador_(c.id); } catch (e) { criador = ''; }
      return an.pecas.map(function (p) { return { pneu: p.pneu, codigo: p.codigo, descricao: p.descricao, tipos: p.tipos, medida: p.medida, categoria: p.categoria, marca: p.marca, qtd: p.qtd, particular: vdf_pecaParticular_(p, c, an), partPor: p.partPor || '', complemento: !!p.complemento, compData: p.compData || '', podeAut: vdf_podeAutorizarPeca_(me, c, an, p, criador), chave: vd_chavePeca_(p), nome: vd_nomePeca_(p) }; });
    })(),
    padrao: an.pecas.length > 0,
    cotacoes: (function () { try { return vd_cotacoesDaDescricao_(c.desc, an.pecas); } catch (e) { return { cotacoes: [], nt: [] }; } })(),
    doOrcamento: an.doOrcamento,
    tipo: an.dados.tipo || (/PARTICULAR/i.test((c.labels || []).map(function (l) { return l.name; }).join(' ')) ? 'PARTICULAR' : 'SEGURADORA'),
    origemOrc: (vd_limpar_(an.div.bloco).match(/OR[ÇC]AMENTO IMPORTADO \(([^)]*)\)/i) || [])[1] || '',
    titulo: vdf_partesTitulo_(c.name, an.dados),
    anexos: vdf_anexosDoCard_(c.attachments),
    autorizadas: autorizadas,
    devolucao: (function () { try { return vd_ultimaDevolucao_(c.desc); } catch (e) { return null; } })(),
    podeAutorizar: vdf_podeAutorizar_(me, c, an),
    podeDevolver: vdf_podeDevolver_(me, c, an),
    fornecedores: fo_paraFormulario_(),
    recebiveis: (function () { try { return vdf_itensRecebimento_(c).map(function (i) { i.dueTxt = i.due ? vd_dataCurta_(i.due) : ''; return i; }); } catch (e) { return []; } })(),
    particular: vdf_ehParticular_(c, an),
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
    return { id: a.id, nome: a.name, bytes: a.bytes || 0, pdf: /pdf/i.test(a.mimeType || '') || /\.pdf$/i.test(a.name || ''), lido: !!props.getProperty('VD_ANX3_' + a.id) };
  });
}

/** Lê um anexo que JÁ está no card (sem novo upload). Mesmo retorno de vdf_lerDocumento, com anexoId no lugar de fileId. */
function vdf_lerAnexoCard(token, shortLink, idAnexo, placa) {
  vdf_usuario_(token);
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  var c = vd_api_('/cards/' + shortLink, { query: { fields: 'idBoard', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url' } });
  if (c.idBoard !== board.id) throw new Error('Este card não é do quadro do formulário.');
  var a = (c.attachments || []).filter(function (x) { return x.id === idAnexo; })[0];
  if (!a) throw new Error('Esse anexo não está mais no card.');
  if (!vd_anexoLegivel_(a)) throw new Error('Esse anexo não dá para ler (só PDF ou foto até 15 MB).');
  var r = vd_lerAnexoTrello_(a, { orcCompleto: true });
  if (!r) throw new Error('O Trello não entregou o arquivo "' + a.name + '". Tente de novo.');
  if (r.erro) return { anexoId: a.id, jaNoCard: true, erro: 'Não consegui ler "' + a.name + '" (' + r.erro + ').' };
  var orc = r.orcFull || (r.orc ? { origem: r.orcamento, oficina: vd_orcExpandir_(r.orc.o), fo: vd_orcExpandir_(r.orc.f) } : { origem: '' });
  orc.cor = r.cor; orc.seguradora = r.seguradora; orc.sinistro = r.sinistro;
  var out = vdf_respostaLeitura_(r, orc, placa);
  out.anexoId = a.id; out.jaNoCard = true; out.doCache = !!r.doCache;
  return out;
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
  var out = vdf_respostaLeitura_(vd_extrair_(texto), vd_lerOrcamento_(texto), placa);
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

/** nomeLista: 'FORNECIMENTO' (padrão) ou 'FORNECIMENTO COMPLEMENTO'. Não repete peça que já está em qualquer FORNECIMENTO. */
function vdf_checklistFornecimento_(cardId, fo, token, nomeLista) {
  if (!fo || !fo.length) return 0;
  nomeLista = nomeLista || 'FORNECIMENTO';
  var lists = vd_api_('/cards/' + cardId + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name' } }, token);
  var todas = lists.filter(function (c) { return /FORNECIMENTO/i.test(c.name); });
  var cl = nomeLista === 'FORNECIMENTO'
    ? todas.filter(function (c) { return !/COMPLEMENTO/i.test(c.name); })[0]
    : todas.filter(function (c) { return String(c.name || '').trim().toUpperCase() === nomeLista; })[0];
  if (!cl) cl = vd_api_('/checklists', { method: 'post', payload: { idCard: cardId, name: nomeLista, pos: 'bottom' } }, token);
  var existentes = [];
  todas.forEach(function (c) { (c.checkItems || []).forEach(function (i) { existentes.push(vd_semAcento_(i.name)); }); });
  var n = 0;
  fo.forEach(function (p) {
    var cod = String(p.codigo || p.codigoOrc || '').trim();
    var desc = p.pneu ? ('PNEU ' + (p.medida || '') + ' ' + (p.marca || '')).trim() : String(p.descricao || '').trim();
    // padrão do quadro: CÓDIGO DESCRIÇÃO (o fornecedor e a previsão entram depois pela rotina de fornecimento)
    cod = cod.replace(/\*+$/, '').replace(/\s+/g, '');
    var nome = (cod ? cod + ' ' : '') + desc + (p.qtd && +p.qtd > 1 ? ' (x' + p.qtd + ')' : '');
    var chave = vd_semAcento_(cod || desc);
    if (existentes.some(function (e) { return e.indexOf(chave) >= 0; })) return;
    vd_api_('/checklists/' + cl.id + '/checkItems', { method: 'post', payload: { name: nome, pos: 'bottom' } }, token);
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
    if (chave && existentes.some(function (e) { return e.indexOf(chave) >= 0; })) return;
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
    var m = l.match(/^(.+?)\s+-\s+(?:(.+?)\s+-\s+)?R?\$?\s*([\d.]+(?:,\d{1,2})?)(?:\s+-\s+(?:(\d+)\s*DIAS?(?:\s+[ÚU]T(?:EIS|IL))?|(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)|(.*?)))?\s*$/i);
    if (!m) return;
    var alvo = vd_semAcento_(m[1]).replace(/\s+/g, ' ').trim();
    var peca = null;
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
    out.cotacoes.push({ chave: peca.chave, fornecedor: forn, obs: obs, tipo: tipo, marca: marca, valor: vd_valorNum_(m[3]), dias: m[4] !== undefined ? +m[4] : '', data: m[5] || '' });
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
  if (!id || id === card.idList) return '';
  var de = vdf_nomeLista_(ctx, card.idList);
  try { st_permitir_(card.id, id); } catch (e) {}   // antes do PUT: a trava de colunas não desfaz
  vd_api_('/cards/' + card.id, { method: 'put', payload: { idList: id, pos: 'top' } }, token);
  card.idList = id;
  try { ev_registrar_('COLUNA', card, usuario || 'formulário', null, { detalhe: (de || '?') + ' → ' + nomeLista }); } catch (e) {}
  return nomeLista;
}

/** Card já existe: garante o link do comprador nos anexos. */
function vdf_linkComprador_(card, ctx, token) {
  try {
    var ans = vd_api_('/cards/' + card.id + '/attachments', { query: { fields: 'name,url' } });
    if (ans.some(function (a) { return /Cota[çc][ãa]o \/ Compra/i.test(a.name || ''); })) return;
    vd_api_('/cards/' + card.id + '/attachments', { method: 'post', payload: { url: ctx.urlForm + '?card=' + card.shortLink + '&modo=compras', name: '💰 Cotação / Compra (formulário)', setCover: false } }, token);
  } catch (e) {}
}

/**
 * p = {shortLink, cotacoes:[{chave, fornecedor, tipo, marca, valor, dias}], nt:['FORN'], obs:[{chave, texto}]}
 * Grava o bloco de cotação abaixo do marcador e move o card:
 * seguradora -> PENDENTE AUTORIZAR, particular -> COTAÇÃO FINALIZADA.
 */
function vdf_salvarCotacao(token, p) {
  var me = vdf_usuario_(token);
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
    var r = { peca: peca, fornecedor: foNome(c.fornecedor), tipo: vd_tipoNorm_(c.tipo || '') || '', marca: String(c.marca || '').trim().toUpperCase(), valor: vd_valorNum_(c.valor), dias: String(c.dias == null ? '' : c.dias).trim() };
    var rot = 'cotação ' + (i + 1) + (peca ? ' (' + vd_nomePeca_(peca) + ')' : '');
    if (!peca) faltas.push(rot + ': peça não encontrada no pedido');
    if (!r.fornecedor) faltas.push(rot + ': falta o fornecedor');
    if (isNaN(r.valor) || r.valor <= 0) faltas.push(rot + ': valor inválido');
    if (r.dias !== '' && !/^\d+$/.test(r.dias)) faltas.push(rot + ': prazo em dias úteis (número)');
    if (r.tipo && r.tipo.charAt(0) === '?') faltas.push(rot + ': tipo inválido');
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
  if (!cots.length && !nt.length && !obs.length && !semCot.length && !rem.length) faltas.push('Lance pelo menos uma cotação, um fornecedor NT, uma observação ou a justificativa de uma peça não cotada.');
  if (faltas.length) return { ok: false, faltas: faltas };

  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  var ordem = [], grupos = {};
  cots.forEach(function (c) {
    if (!grupos[c.fornecedor]) { grupos[c.fornecedor] = []; ordem.push(c.fornecedor); }
    var nomeP = c.peca.pneu ? 'PNEU ' + String(c.peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(c.peca);
    grupos[c.fornecedor].push(nomeP + (c.tipo || c.marca ? ' - ' + [c.tipo, c.marca].filter(String).join(' ') : '') + ' - ' + vd_valorBR_(c.valor) + (c.dias !== '' ? ' - ' + c.dias + (c.dias === '1' ? ' dia útil' : ' dias úteis') : ''));
  });
  var L = ['**COTAÇÃO ' + agora + ' - ' + me.fullName + '**'];
  rem.forEach(function (r) { L.push('REMOVIDA: ' + r.fornecedor + ' - ' + (r.peca.pneu ? 'PNEU ' + String(r.peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(r.peca)) + ' - ' + vd_valorBR_(r.valor)); });
  ordem.forEach(function (f) { L.push('**' + f + '**'); L = L.concat(grupos[f]); });
  nt.forEach(function (f) { if (!grupos[f]) L.push('**' + f + ' - NT**'); });
  obs.forEach(function (o) { L.push('OBS ' + vd_nomePeca_(o.peca) + ': ' + o.texto); });
  semCot.forEach(function (s) { L.push('SEM COTAÇÃO ' + (s.peca.pneu ? 'PNEU ' + String(s.peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(s.peca)) + ': ' + s.texto); });

  var div = vd_dividir_(card.desc);
  var resto = div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR;
  var novaDesc = div.bloco.replace(/\s+$/, '') + '\n\n' + resto + '\n\n' + L.join('\n');
  // toda peça precisa de cotação OU de justificativa para não cotar (exigido para enviar)
  var cobPrev = vdf_coberturaCotacao_(novaDesc, an.pecas);
  if (cobPrev.faltam.length) return { ok: false, faltas: cobPrev.faltam.map(function (n) { return n + ': sem cotação — lance a cotação ou escreva o motivo de não cotar'; }) };
  vd_backup_(card, 'cotação lançada pelo formulário por ' + me.username);
  vd_gravarDesc_(card.id, novaDesc, token);
  try { fo_registrarUso_(cots.map(function (c) { return c.fornecedor; }).concat(nt), me.username); } catch (e) {}
  try {
    ev_registrar_('COTAÇÃO', card, me.username,
      cots.map(function (c) { var e = ev_peca_(c.peca); e.fornecedor = c.fornecedor; e.valor = c.valor; e.dias = c.dias; e.detalhe = [c.tipo, c.marca].filter(String).join(' '); return e; })
        .concat(semCot.map(function (x) { var e = ev_peca_(x.peca); e.detalhe = 'SEM COTAÇÃO: ' + x.texto; return e; }))
        .concat(nt.map(function (f) { return { fornecedor: f, detalhe: 'NT (não tem)' }; }))
        .concat(rem.map(function (r) { var e = ev_peca_(r.peca); e.fornecedor = r.fornecedor; e.valor = r.valor; e.detalhe = 'COTAÇÃO REMOVIDA'; return e; })));
  } catch (e) {}

  /* Cobertura (somando as cotações que já estavam no card): cada peça da oficina precisa de
   * cotação OU de justificativa (SEM COTAÇÃO). Parcial -> card fica em EM COTAÇÃO com a etiqueta
   * COTAÇÃO PARCIAL. Completa -> anda (seguradora: PENDENTE AUTORIZAR; particular: COTAÇÃO FINALIZADA),
   * avisando as peças não cotadas e o motivo. */
  var cob = vdf_coberturaCotacao_(novaDesc, an.pecas);
  // só peças particulares -> COTAÇÃO FINALIZADA (o consultor autoriza); havendo peça da seguradora -> PENDENTE AUTORIZAR
  var particular = an.pecas.length ? an.pecas.every(function (x) { return vdf_pecaParticular_(x, card, an); }) : vdf_ehParticular_(card, an);
  var misto = !particular && an.pecas.some(function (x) { return x.particular; });
  var movido = '';
  try { movido = vdf_moverPara_(card, ctx, cob.faltam.length ? VD.LISTA_COTACAO : (particular ? VDF_LISTA_FINALIZADA : VDF_LISTA_PENDENTE), token, me.username); } catch (e) {}
  try { vdf_etiquetaParcial_(card, cob.faltam.length > 0, token); } catch (e) {}
  try {
    var quem = vd_criador_(card.id);
    var mencoes = [quem].concat(an.pecas.map(function (x) { return x.partPor; })).filter(function (u, i, a) { return u && u !== me.username && a.indexOf(u) === i; });
    var txt = mencoes.map(function (u) { return '@' + u + ' '; }).join('') + '💰 **Cotação lançada** por ' + me.fullName + ': ' + cots.length + ' cotação(ões) em ' + Object.keys(cots.reduce(function (a, c) { a[c.chave || vd_chavePeca_(c.peca)] = 1; return a; }, {})).length + ' peça(s)' + (nt.length ? ', ' + nt.length + ' fornecedor(es) sem a peça' : '') + (obs.length ? ', ' + obs.length + ' observação(ões)' : '') + '.';
    if (cob.faltam.length) txt += '\n\n⏳ **Cotação parcial** — falta cotar (ou justificar): ' + cob.faltam.join(', ') + '.\nO card fica em **' + VD.LISTA_COTACAO + '** até todas as peças estarem cotadas ou justificadas.';
    else if (cob.semCot.length) txt += '\n\n⚠️ **Peças não cotadas:**\n' + cob.semCot.map(function (s) { return '- ' + s.nome + ': ' + s.texto; }).join('\n');
    if (movido) txt += '\nCard movido para **' + movido + '**.';
    if (misto && !cob.faltam.length) txt += '\n👤 Peças particulares (' + an.pecas.filter(function (x) { return x.particular; }).map(vd_nomePeca_).join(', ') + '): quem autoriza é o consultor que as lançou, pela aba **Autorizar** do formulário.';
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, lista: movido || vdf_nomeLista_(ctx, card.idList), n: cots.length, obs: obs.length, faltam: cob.faltam, semCot: cob.semCot.length };
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
  var semAut = an.pecas.filter(function (x) { return vdf_podeAutorizarPeca_(me, card, an, x, criador) && !(p.escolhas || []).some(function (e) { return e.chave === vd_chavePeca_(x); }); }).length;
  try {
    var compr = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).split(/[,;\s]+/).filter(function (u) { return u && u.toLowerCase() !== String(me.username).toLowerCase(); })[0];
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: (compr ? '@' + compr + ' ' : '') + '✅ **Compra autorizada** por ' + me.fullName + ': ' + linhas.length + ' peça(s), total ' + vd_valorBR_(total) + '.' + (semAut ? '\n' + semAut + ' peça(s) sem autorização (não comprar).' : '') + obsL.texto + (movido ? '\nCard movido para **' + movido + '**.' : '') + (aguarda.length ? '\n⏳ Aguardando autorização: ' + aguarda.join('; ') + '. O card segue para AUTORIZADO COMPRA quando as duas partes estiverem autorizadas.' : '') } }, token);
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
  return { linhas: linhas, n: linhas.length, texto: txt.length ? '\n\n📝 **Observações:**\n' + txt.join('\n') : '' };
}

/**
 * p = {shortLink, obs:[{chave, texto}], geral}
 * Quem autoriza devolve a cotação ao comprador (incompleta / precisa de mais opções).
 * Grava o bloco DEVOLVIDA PARA COTAÇÃO (anula autorizações anteriores) e volta o card para EM COTAÇÃO.
 */
function vdf_devolverCotacao(token, p) {
  var me = vdf_usuario_(token);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var an = vd_analisar_(card.desc, card.name);
  if (!vdf_podeDevolver_(me, card, an)) return { ok: false, faltas: ['Só a diretoria pode devolver a cotação' + (an.pecas.some(function (x) { return x.particular; }) ? ' deste card (tem peças da seguradora junto com as particulares)' : '') + ' — sua conta: ' + me.username + '. Escreva a observação na peça e autorize só o que estiver certo.'] };
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
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: (compr ? '@' + compr + ' ' : '') + '↩️ **Cotação devolvida** por ' + me.fullName + ' — completar e lançar de novo.' + obsL.texto + (movido ? '\nCard movido para **' + movido + '**.' : '') } }, token);
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
 * p = {shortLink, compras:[{chave, fornecedor, tipo, marca, valor, dias}]}
 * Cria/atualiza o checklist PAGAS direto (nada vai para a descrição). Tudo comprado -> FALTA CHEGAR.
 */
function vdf_salvarCompra(token, p) {
  var me = vdf_usuario_(token);
  if (!vdf_ehComprador_(me)) return { ok: false, faltas: ['Só o setor de compras pode registrar compra (sua conta: ' + me.username + '). A cotação continua liberada.'] };
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro — não recebe cotação nem compra.'] };
  var an = vd_analisar_(card.desc, card.name);
  var porChave = {};
  an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var lidas = vd_cotacoesDaDescricao_(card.desc, an.pecas).cotacoes;
  var faltas = [], compras = [];
  (p.compras || []).forEach(function (c, i) {
    var peca = porChave[c.chave];
    var rot = 'compra ' + (i + 1) + (peca ? ' (' + vd_nomePeca_(peca) + ')' : '');
    if (!peca) { faltas.push(rot + ': peça não encontrada no pedido'); return; }
    var forn = String(c.fornecedor || '').trim().toUpperCase();
    var valor = vd_valorNum_(c.valor);
    // só cotação que está no card
    var ok = lidas.some(function (q) { return q.chave === c.chave && q.fornecedor === forn && Math.abs(q.valor - valor) < 0.005; });
    if (!ok) { faltas.push(rot + ': escolha uma cotação lançada no card (' + forn + ' ' + vd_valorBR_(valor) + ' não está na descrição)'); return; }
    compras.push({ chave: c.chave, codigo: peca.pneu ? '' : peca.codigo, descricao: peca.pneu ? vd_nomePeca_(peca) : peca.descricao, fornecedor: forn, valor: valor, dias: String(c.dias == null ? '' : c.dias).trim(), particular: vdf_pecaParticular_(peca, card, an) && !vdf_ehParticular_(card, an), complemento: !!peca.complemento });
  });
  if (!compras.length && !faltas.length) faltas.push('Escolha o fornecedor de pelo menos uma peça.');
  if (faltas.length) return { ok: false, faltas: faltas };

  // fora da autorização: não bloqueia, só avisa no card (regra da diretoria)
  var auts = vd_autorizacoesDaDescricao_(card.desc, an.pecas), foraAut = [];
  compras.forEach(function (c) {
    var ch = c.chave;
    var a = auts.filter(function (x) { return x.chave === ch; })[0];
    if (!a) foraAut.push(vd_nomePeca_(porChave[ch]) + ' (sem autorização)');
    else if (a.fornecedor !== c.fornecedor || Math.abs(a.valor - c.valor) >= 0.005) foraAut.push(vd_nomePeca_(porChave[ch]) + ' (autorizado ' + a.fornecedor + ' ' + vd_valorBR_(a.valor) + ', comprado ' + c.fornecedor + ' ' + vd_valorBR_(c.valor) + ')');
  });

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
    an.pecas.forEach(function (x) {
      var k = vd_chavePeca_(x);
      if (!nomes.some(function (nm) { return k && nm.indexOf(k) >= 0; })) pendentes++;
    });
    if (!pendentes) movido = vdf_moverPara_(card, ctx, VDF_LISTA_CHEGAR, token, me.username);
  } catch (e) {}
  try {
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🛒 **Compra registrada** por ' + me.fullName + ': ' + n + ' item(ns) no checklist PAGAS' + (pendentes ? ' — ' + pendentes + ' peça(s) da oficina ainda sem compra' : ' — todas as peças da oficina compradas') + '.' + (movido ? '\nCard movido para **' + movido + '**.' : '') + (foraAut.length ? '\n\n⚠️ **Compra fora da autorização:** ' + foraAut.join('; ') + '.' : '') } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, pagas: n, pendentes: pendentes, foraAut: foraAut, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

/** Linhas "COMPRADO: FORNECEDOR - CÓDIGO DESCRIÇÃO - R$ valor - dd/mm" em qualquer parte da descrição. */
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
 *      novo:{carro,cor,seguradora,sinistro,unidade}, fileIds:[], orcamento:{origem, fo:[]}}
 */
function vdf_salvar(token, p) {
  var me = vdf_usuario_(token);
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
  });
  // peça particular dentro do pedido de seguradora: guarda quem lançou (é quem autoriza)
  if (vd_tipoNormPedido_(n.tipo) !== 'PARTICULAR') {
    (p.pecas || []).forEach(function (x, i) {
      if (!x.particular) return;
      pecas[i].particular = true;
      pecas[i].partPor = String(x.partPor || me.username || '').toLowerCase().replace(/[^\w.\-]/g, '');
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
    if (posCot) baseSigs = vd_analisar_(card.desc, card.name).pecas.map(function (x) { return x.sig; });
    if (posCot) baseTodas = vd_linhasConsultor_(vd_dividir_(card.desc).bloco).map(vd_sigItem_);
  }

  var comp = card && p.complemento ? p.complemento : null;
  var compFo = comp ? (comp.fo || []) : [];
  if (!pecas.length && !fo.length && !compFo.length) return { ok: false, faltas: ['Adicione pelo menos uma peça (ou importe um orçamento com peças da seguradora).'] };
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
  if (faltas.length) return { ok: false, faltas: faltas };

  var titulo = String(n.carro || '').trim() ? vd_titulo_(d.placa, n.carro, extra.cor, extra.seguradora) : '';
  var novasPecas = posCot ? an.novas : [];

  if (card) {
    var div = vd_dividir_(card.desc);
    var resto = div.temMarcador ? div.resto
      : VD.MARCADOR + (String(card.desc || '').trim() ? '\n_(texto que estava no card antes do formulário)_\n' + card.desc : '');
    vd_backup_(card, 'editado pelo formulário por ' + me.username);
    var upd = { desc: bloco + '\n\n' + resto };
    if (titulo && titulo !== card.name) upd.name = titulo;
    vd_gravarDesc_(card.id, upd.desc, token, upd.name ? { name: upd.name } : null);
    if (upd.name) card.name = upd.name;
  } else {
    var corpo = { idList: ctx.listas[VD.LISTA_COTACAO], name: titulo, desc: bloco + '\n\n' + VD.MARCADOR, pos: 'top' };
    if (n.unidade) corpo.idLabels = n.unidade;
    card = vd_api_('/cards', { method: 'post', payload: corpo }, token);
    try { vd_gravarDesc_(card.id, corpo.desc, token); } catch (e) { try { tr_guardar_(card.id, corpo.desc); } catch (e2) {} }
    try {
      vd_api_('/cards/' + card.id + '/attachments', { method: 'post', payload: { url: ctx.urlForm + '?card=' + card.shortLink, name: '✏️ Editar peças (formulário)', setCover: false } }, token);
    } catch (e) {}
  }
  vdf_linkComprador_(card, ctx, token);

  var nFo = 0;
  try { nFo = vdf_checklistFornecimento_(card.id, fo, token); } catch (e) {}
  var nPagas = 0;
  var compras = (p.compras || []).filter(function (c) { return String(c.fornecedor || '').trim(); });
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
    try { jaNoCard = vd_api_('/cards/' + card.id + '/attachments', { query: { fields: 'name,bytes' } }, token); } catch (e) {}
  }
  (p.fileIds || []).forEach(function (fid) {
    try {
      var f = DriveApp.getFileById(fid);
      var ehCapa = p.capaId && fid === p.capaId;
      if (!ehCapa && jaNoCard.some(function (a) { return a.name === f.getName() && +a.bytes === f.getSize(); })) {
        repetidos.push(f.getName()); f.setTrashed(true); return;
      }
      var mp = { file: f.getBlob(), name: f.getName() };
      if (ehCapa) mp.setCover = 'true';
      var at = vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: mp }, token);
      if (at && at.id) idsSubidos.push(at.id);
      if (ehCapa && at && at.id) { try { vd_api_('/cards/' + card.id, { method: 'put', payload: { idAttachmentCover: at.id } }, token); capaOk = true; } catch (e2) {} }
      f.setTrashed(true);
      anexados++;
    } catch (e) {}
  });

  // orçamento complementar: o robô não precisa ler de novo o PDF que subiu agora; comentário no card
  var compOf = pecas.filter(function (x) { return x.complemento && x.compData === cp_hoje_() && (!posCot || an.novas.some(function (nv) { return vd_chavePeca_(nv) === vd_chavePeca_(x); })); });
  if (comp) {
    try { cp_marcarVistos_(idsSubidos); } catch (e) {}
    if (compOf.length || nFoComp) {
      try {
        vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: cp_textoComentario_(me.fullName, comp.origem || '', '', compOf, compFo.slice(0, nFoComp ? compFo.length : 0), 0, '') } }, token);
      } catch (e) {}
      try { ev_registrar_('COMPLEMENTO', card, me.username, compOf.map(ev_peca_).concat(compFo.map(function (x) { var e = ev_peca_(x); e.fornecedor = 'SEGURADORA (FO)'; return e; })), { detalhe: compOf.length + ' oficina · ' + nFoComp + ' FO · ' + (comp.origem || '') }); } catch (e) {}
    }
  }

  // confere na hora
  var acao = '';
  try {
    var c2 = vd_api_('/cards/' + card.id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,dateLastActivity,labels', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url' } });
    var props = PropertiesService.getScriptProperties();
    if (posCot) {
      if (novasPecas.length) {
        // peça nova em card que já andou: devolve para EM COTAÇÃO
        props.setProperty('VD_PK2_' + card.id, JSON.stringify(baseTodas));
        acao = vd_conferirPosCotacao_(c2, ctx).acao;
      } else {
        props.setProperty('VD_PK2_' + card.id, JSON.stringify(vd_linhasConsultor_(an.div.bloco).map(vd_sigItem_)));
        acao = 'card continua em ' + lista;
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
  if (!vdf_ehComprador_(me)) return { ok: false, faltas: ['Só o setor de compras registra cotação indisponível (sua conta: ' + me.username + ').'] };
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
    var forn = String(it.fornecedor || '').trim().toUpperCase(), valor = vd_valorNum_(it.valor), motivo = String(it.motivo || '').replace(/\s*\n\s*/g, ' ').trim();
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
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: us.map(function (u) { return '@' + u + ' '; }).join('') + '⚠️ **Cotação indisponível na compra** (' + me.fullName + '):\n' +
      linhas.map(function (l) { return '- ' + l.replace(/^INDISPON[IÍ]VEL:\s*/i, ''); }).join('\n') +
      (temNova ? '\n\nCotação nova lançada — **autorizar de novo** pela aba ✅ Autorizar.' : '\n\nSem cotação nova — o card voltou para cotação.') + (movido ? '\nCard movido para **' + movido + '**.' : '') } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: linhas.length, nova: temNova, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}
