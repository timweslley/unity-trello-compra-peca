/**
 * Nome padronizado dos anexos (Weslley, 05/10/2026): o arquivo que o sistema leu/importou é batizado pelo
 * que ele é, com a placa na frente, para o card ficar limpo e fácil de achar:
 *   📄 ORÇ · RHV1E04 · SURA · Cilia · 05/10        orçamento que abriu o pedido
 *   📄 ORÇ+ · RHV1E04 · SURA · Cilia · 07/10       orçamento complementar
 *   🚚 FO · RHV1E04 · Status do Pedido Cilia · 05/10
 *   📦 NF 12345 · RHV1E04 · MARAJO · 06/10          nota do recebimento (número quando o arquivo deixa ler)
 *   📸 · RHV1E04 · capa · 05/10                     fotos
 *   🛒 COMPRA · RHV1E04 · AVENIDA · PARA-CHOQUE · 08/10   print/arquivo da negociação e pagamento (aba Compra, 08/10/2026)
 * Quando entra outro do MESMO tipo no card, o anterior vira "v1" e o novo "v2" (v3…) — só aparece versão
 * quando há mais de um. A data é a do upload. O robô nunca identifica anexo pelo nome (usa id e conteúdo),
 * então renomear não muda nada no funcionamento. Trello aceita PUT /cards/{id}/attachments/{id} {name}.
 */
var AX = { ORC: '📄 ORÇ', ORC_MAIS: '📄 ORÇ+', FO: '🚚 FO', NF: '📦 NF', FOTO: '📸', COMPRA: '🛒 COMPRA', SEP: ' · ' };
var AX_RE_PADRAO = /^((📄 ORÇ\+?|🚚 FO|📦 NF( \d+)?|🛒 COMPRA) · |📸 )/;
/** Anexo que o próprio sistema batizou sabendo o que é (nota, foto, comprovante de compra): o robô não gasta OCR lendo-o
 *  à procura de orçamento (08/10/2026). ORÇ/FO ficam de fora de propósito — podem ser orçamento complementar. */
function ax_semLeituraRobo_(nome) { return ax_ehNota_(nome) || /^((📦 NF( \d+)?|🛒 COMPRA) · |📸 )/.test(String(nome || '')); }
/** Nota fiscal pelo nome: a do sistema (📦 NF …) e as que as rotinas de NF anexam em lote — "NF <EMITENTE> - <nº> - dd-mm.pdf",
 *  "NF FORNECIMENTO - …", "NF ML + resumo - …" / "NF ML - …", "NFS-e <nº> - …" (10/10/2026, Weslley): o robô não gasta OCR nelas procurando
 *  orçamento (um lote de 200 notas eram 200 leituras) nem comenta "não reconheci" em card de FALTA DADOS. */
function ax_ehNota_(nome) { return /^(📦 NF( \d+)? · |NF(S-e|-e|e)?\s*(\d+\s*)?[-–](?!\S)|NF(S-e|-e|e)? (FORNECIMENTO|ML\b|\d+|[A-Z0-9][^·]*? - \d+ - \d{2}-\d{2}))/i.test(String(nome || '')); }

function ax_hoje_(d) { var dt = d ? new Date(d) : new Date(); if (isNaN(dt.getTime())) dt = new Date(); return Utilities.formatDate(dt, 'America/Sao_Paulo', 'dd/MM'); }

/** "CILIA" → "Cilia", "WEBSOMA" → "Websoma", "HDI" → "HDI". */
function ax_origem_(o) {
  o = String(o || '').trim().toUpperCase();
  if (!o) return '';
  return o === 'HDI' ? 'HDI' : o.charAt(0) + o.slice(1).toLowerCase();
}

/** Placa do card: o título começa com ela. */
function ax_placa_(card) {
  var nome = String((card && card.name) || '');
  return vd_placaDoTexto_(nome.split(/\s+/)[0]) || vd_placaDoTexto_(nome) || '';
}

/** Nome de arquivo gerado pelo aparelho/sistema (sem informação): uuid, image.png, IMG_1234, WhatsApp Image, Screenshot… */
function ax_nomeAutomatico_(nome) {
  var n = String(nome || '').replace(/\.[a-z0-9]{2,5}$/i, '').trim();
  return !n || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(n) || /^(image|img|imagem|foto|photo|picture|pic|screenshot|captura|print|scan|pdf_report|document|documento|file|arquivo|whatsapp image|whatsapp|dsc|pxl|vid|video)[\s_\-\d().]*(at[\s_\-\d().]*)?$/i.test(n) || /^[\d_\-\s().]+$/.test(n);
}

/** Já está no padrão (não mexe de novo). */
function ax_padronizado_(nome) { return AX_RE_PADRAO.test(String(nome || '')); }

/** Monta o nome: tipo · placa · partes… · dd/MM (data = a do upload; anexo antigo usa a própria data). */
function ax_nome_(tipo, placa, partes, data) {
  var p = [tipo].concat(placa ? [placa] : []).concat((partes || []).map(function (s) { return String(s || '').trim(); }).filter(String));
  p.push(ax_hoje_(data));
  var nome = p.join(AX.SEP);
  return /[A-Z]/i.test(tipo) ? nome : nome.replace(AX.SEP, ' ');   // "📸 RHV1E04 · capa · 05/10" (tipo só com o ícone)
}

/** Renomeia um anexo no Trello (endpoint que a própria tela do Trello usa). */
function ax_renomear_(cardId, idAnexo, nome, token) {
  try { vd_api_('/cards/' + cardId + '/attachments/' + idAnexo, { method: 'put', payload: { name: nome } }, token); return true; }
  catch (e) { console.log('renomear anexo ' + idAnexo + ': ' + e); return false; }
}

/**
 * Dá ao anexo (já no card) o nome padronizado, cuidando das versões: se o card já tem anexo do mesmo tipo
 * para a mesma placa ("📄 ORÇ · RHV1E04 · …"), os antigos ganham v1, v2… na ordem em que chegaram e o novo
 * recebe o próximo número. anexos = lista atual do card ({id, name, date}); opt.semVersao = fotos.
 * Devolve o nome final.
 */
function ax_batizar_(cardId, idAnexo, nomeNovo, anexos, token, opt) {
  opt = opt || {};
  var nome = nomeNovo;
  if (!opt.semVersao) {
    var pref = nomeNovo.split(AX.SEP).slice(0, 2).join(AX.SEP) + AX.SEP;   // "📄 ORÇ · RHV1E04 · "
    var irmaos = (anexos || []).filter(function (a) { return a.id !== idAnexo && String(a.name || '').indexOf(pref) === 0; });
    if (irmaos.length) {
      var maior = 0;
      irmaos.forEach(function (a) { var m = String(a.name).match(/ v(\d+)$/); if (m) maior = Math.max(maior, +m[1]); });
      irmaos.filter(function (a) { return !/ v\d+$/.test(a.name); })
        .sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id)); })
        .forEach(function (a) { maior++; ax_renomear_(cardId, a.id, a.name + ' v' + maior, token); });
      nome = nomeNovo + ' v' + (maior + 1);
    }
  }
  if (nome !== (opt.nomeAtual || '')) ax_renomear_(cardId, idAnexo, nome, token);
  return nome;
}

/** Lista {id, name, date} dos anexos do card (para o controle de versão). */
function ax_anexos_(cardId, token) {
  try { return vd_api_('/cards/' + cardId + '/attachments', { query: { fields: 'name,date,isUpload' } }, token) || []; } catch (e) { return []; }
}

/**
 * Anexo que o ROBÔ leu (subido à mão no Trello): batiza pelo que a leitura achou.
 * r = retorno de vd_lerAnexoTrello_ (r.doc = 'FO' para Status do Pedido; r.orcamento = origem do orçamento).
 * complementar = o card já tinha a lista de peças quando esse anexo entrou.
 */
function ax_batizarLido_(card, a, r, complementar, token) {
  try {
    if (!card || !a || !r || r.erro || ax_padronizado_(a.name)) return '';
    var placa = ax_placa_(card);
    if (!placa) return '';
    var nome = '';
    if (r.doc === 'FO') nome = ax_nome_(AX.FO, placa, [r.docNome || 'Status do Pedido Cilia'], a.date);
    else if (r.orcamento && (r.placas || []).some(function (p) { return vd_mesmaPlaca_(p, placa); })) {
      nome = ax_nome_(complementar ? AX.ORC_MAIS : AX.ORC, placa, [r.seguradora || '', ax_origem_(r.orcamento)], a.date);
    }
    if (!nome) return '';
    var fim = ax_batizar_(card.id, a.id, nome, ax_anexos_(card.id, token), token, { nomeAtual: a.name });
    a.name = fim;
    return fim;
  } catch (e) { console.log('ax_batizarLido_: ' + e); return ''; }
}

/** Número da NF a partir do XML (nNF) ou do texto do DANFE; '' se não achar. */
function ax_numeroNf_(f) {
  try {
    var nomeArq = f.getName(), mime = f.getMimeType() || '';
    if (/xml/i.test(mime) || /\.xml$/i.test(nomeArq)) {
      var m = f.getBlob().getDataAsString().match(/<nNF>\s*0*(\d{1,9})\s*<\/nNF>/);
      return m ? m[1] : '';
    }
    if ((/pdf/i.test(mime) || /\.pdf$/i.test(nomeArq)) && f.getSize() <= 8 * 1024 * 1024) {
      var U = vd_normTexto_(vd_ocr_(f.getBlob(), nomeArq));
      var m2 = U.match(/\bN[ºO°]?\.?\s*0*(\d{1,3}(?:\.\d{3}){1,2})\b/) || U.match(/\b(?:NF-?E?|NOTA FISCAL|DANFE)\b[^0-9]{0,40}?N[ºO°]?\.?\s*0*(\d{3,9})\b/);
      return m2 ? m2[1].replace(/\./g, '').replace(/^0+/, '') : '';
    }
  } catch (e) { console.log('ax_numeroNf_: ' + e); }
  return '';
}

/* ---------- nome das notas: padrão das rotinas de NF (13/10/2026, Weslley: "já temos um padrão que adotamos antes para nf
 * anexas via rotina… aplique às notas que foram anexadas pelos usuários") ----------
 *   NF <EMITENTE 20> - <número sem zeros> - <dd-mm da emissão>.pdf      (skill nf-qive-trello-lote)
 *   NF FORNECIMENTO - <EMITENTE 20> - <número> - <dd-mm>.pdf           (nota de peça fornecida pela seguradora) */
function ax_emitente20_(s) { return vd_semAcento_(String(s || '')).toUpperCase().replace(/[^A-Z0-9 &.\-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20).trim(); }
/** Dados da NF pelo texto (XML da NF-e ou DANFE lida por OCR): {numero, emitente, emissao 'dd-mm'} ou null se não é nota. */
function ax_dadosNf_(texto) {
  var bruto = String(texto || ''), m;
  if (/<nfeProc|<infNFe/i.test(bruto)) {
    var nx = (bruto.match(/<nNF>\s*0*(\d{1,9})\s*<\/nNF>/) || [])[1];
    if (!nx) return null;
    var ex = (bruto.match(/<emit>[\s\S]*?<xNome>([^<]+)<\/xNome>/) || [])[1];
    var dx = bruto.match(/<dhEmi>(\d{4})-(\d{2})-(\d{2})/) || bruto.match(/<dEmi>(\d{4})-(\d{2})-(\d{2})/);
    return { numero: nx, emitente: ax_emitente20_(ex), emissao: dx ? dx[3] + '-' + dx[2] : '' };
  }
  var U = vd_normTexto_(bruto).toUpperCase();
  if (!/\bDANFE\b|DOCUMENTO AUXILIAR DA NOTA FISCAL/.test(U)) return null;
  // nº da DANFE vem como 000.123.456; o genérico ("Nº 1.234") por último — "NO 1.500,00" (valor) não é número de nota
  m = U.match(/\bN[ºO°]?\.?\s*(\d{3}\.\d{3}\.\d{3})\b/) || U.match(/\b(?:NF-?E?|NOTA FISCAL|DANFE)\b[^0-9]{0,40}?N[ºO°]?\.?\s*0*(\d{3,9})\b/) ||
    U.match(/\bN[ºO°]\.?\s*0*(\d{1,3}(?:\.\d{3}){1,2})(?![,\d])/);
  if (!m) return null;
  var numero = m[1].replace(/\./g, '').replace(/^0+/, '');
  var em = (U.match(/RECEBEMOS DE (.{3,90}?) OS PRODUTOS/) || [])[1] || '';
  var d = U.match(/DATA (?:DA |DE )?EMISSAO:? ?(\d{2})\/(\d{2})\/\d{2,4}/) || U.match(/\b(\d{2})\/(\d{2})\/20\d\d\b/);
  return { numero: numero, emitente: ax_emitente20_(em), emissao: d ? d[1] + '-' + d[2] : '' };
}
/** Nome no padrão das rotinas. dataUpload = quando a emissão não foi lida. */
function ax_nomeNfRotina_(nf, fornecimento, dataUpload, ext) {
  var dt = nf.emissao || Utilities.formatDate(dataUpload ? new Date(dataUpload) : new Date(), 'America/Sao_Paulo', 'dd-MM');
  return 'NF ' + (fornecimento ? 'FORNECIMENTO - ' : '') + (nf.emitente || 'EMITENTE') + ' - ' + nf.numero + ' - ' + dt + (ext || '.pdf');
}
/** A nota é de fornecimento (seguradora)? Fornecedor da nota aparece só nos itens FORNECIMENTO do card, não nos PAGAS. */
function ax_nfDeFornecimento_(card, emitente) {
  var w = String(emitente || '').split(' ')[0];
  if (!w || w.length < 3) return false;
  var noFo = false, noPagas = false;
  (card.checklists || []).forEach(function (k) {
    var nm = String(k.name || '').trim(), tem = (k.checkItems || []).some(function (i) { return vd_semAcento_(String(i.name || '')).toUpperCase().indexOf(w) >= 0; });
    if (!tem) return;
    if (/^FORNECIMENTO/i.test(nm)) noFo = true; else if (/^PAGAS/i.test(nm)) noPagas = true;
  });
  return noFo && !noPagas;
}

/**
 * Padroniza os anexos antigos de UM card (diretoria, pelo formulário): lê cada PDF/foto (com cache) e batiza
 * pelo conteúdo. Devolve {ok, renomeados:[{de, para}], pulados:[nome]}.
 */
function vdf_padronizarAnexos(token, shortLink) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria padroniza os anexos antigos.'] };
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,id', attachments: 'true', attachment_fields: 'name,fileName,mimeType,isUpload,bytes,url,date' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var out = { ok: true, renomeados: [], pulados: [] }, temOrc = false;
  (card.attachments || []).sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); }).forEach(function (a) {
    if (!a.isUpload || ax_padronizado_(a.name)) { if (a.isUpload) { out.pulados.push(a.name); if (a.name.indexOf(AX.ORC + AX.SEP) === 0) temOrc = true; } return; }
    var de = a.name;
    var r = vd_anexoLegivel_(a) ? vd_lerAnexoTrello_(a) : null;
    if (r && !r.erro && !r.doc && !r.orcamento && /\bFO\b|status/i.test(de)) r.doc = 'FO';   // leitura antiga (cache sem o tipo) de um "Status do Pedido"
    var para = r ? ax_batizarLido_(card, a, r, temOrc) : '';
    if (!para && /^image\//i.test(a.mimeType || '')) { para = ax_batizar_(card.id, a.id, ax_nome_(AX.FOTO, ax_placa_(card), [], a.date), [], token, { semVersao: true }); a.name = para; }
    if (para) { out.renomeados.push({ de: de, para: para }); if (para.indexOf(AX.ORC + AX.SEP) === 0) temOrc = true; }
    else out.pulados.push(de);
  });
  return out;
}

/**
 * Sob demanda (05/10/2026): quando um card antigo mexe ou é aberto no formulário, os anexos que o robô JÁ LEU
 * (cache) ganham o nome padronizado — sem OCR, só renomeia. Anexo nunca lido fica como está. Devolve quantos renomeou.
 * card precisa vir com attachments (name, mimeType, isUpload, bytes, url, date).
 */
function ax_padronizarCard_(card, token) {
  try {
    var ans = (card && card.attachments || []).filter(function (a) { return a.isUpload && !ax_padronizado_(a.name); });
    if (!ans.length || !ax_placa_(card) || vdf_cardProtegido_(card.name || '')) return 0;
    var props = PropertiesService.getScriptProperties(), n = 0;
    var temOrc = (card.attachments || []).some(function (a) { return String(a.name || '').indexOf(AX.ORC + AX.SEP) === 0; });
    ans.sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); }).forEach(function (a) {
      // foto com nome automático (uuid, image.png, IMG_1234, WhatsApp Image…, Screenshot…): vira "📸 PLACA · dd/MM";
      // foto com nome que alguém escreveu fica como está
      if (/^image\//i.test(a.mimeType || '') && ax_nomeAutomatico_(a.name)) {
        var nf = ax_nome_(AX.FOTO, ax_placa_(card), [], a.date);
        if (ax_renomear_(card.id, a.id, nf, token)) { a.name = nf; n++; }
        return;
      }
      var js = props.getProperty('VD_ANX3_' + a.id);
      if (!js) return;   // nunca lido: não gasta OCR aqui
      var r; try { r = JSON.parse(js); } catch (e) { return; }
      if (!r || r.erro) return;
      if (!r.doc && !r.orcamento && /\bFO\b|status/i.test(a.name)) r.doc = 'FO';
      var para = ax_batizarLido_(card, a, r, temOrc, token);
      if (para) { n++; if (para.indexOf(AX.ORC + AX.SEP) === 0) temOrc = true; }
    });
    return n;
  } catch (e) { console.log('ax_padronizarCard_: ' + e); return 0; }
}

/** Passada única pelo quadro (cards abertos, só anexos já lidos), em lotes de ~4,5 min com gatilho até acabar. */
function axPadronizarQuadro() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('AX_PASSO')) return;   // nada agendado
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { query: { fields: 'name,shortLink', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url,date' } }) || [];
  var pos = +(String(props.getProperty('AX_PASSO')).split('|')[0] || 0), feitos = +(String(props.getProperty('AX_PASSO')).split('|')[1] || 0);
  var ini = Date.now();
  for (; pos < cards.length && Date.now() - ini < 4.5 * 60 * 1000; pos++) {
    try { feitos += ax_padronizarCard_(cards[pos], null); } catch (e) {}
  }
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'axPadronizarQuadro') ScriptApp.deleteTrigger(t); });
  if (pos >= cards.length) {
    props.deleteProperty('AX_PASSO');
    console.log('padronização dos anexos concluída: ' + feitos + ' anexo(s) em ' + cards.length + ' card(s)');
  } else {
    props.setProperty('AX_PASSO', pos + '|' + feitos);
    ScriptApp.newTrigger('axPadronizarQuadro').timeBased().after(2 * 60 * 1000).create();
  }
}

/** Diretoria, pelo formulário: agenda a passada pelo quadro. Devolve {ok, cards}. */
function vdf_padronizarQuadro(token) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria roda a padronização do quadro.'] };
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('AX_PASSO')) return { ok: true, jaRodando: true, passo: props.getProperty('AX_PASSO') };
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { query: { fields: 'id' } }) || [];
  props.setProperty('AX_PASSO', '0|0');
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'axPadronizarQuadro') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('axPadronizarQuadro').timeBased().after(5 * 1000).create();
  return { ok: true, cards: cards.length };
}

/** Diretoria: situação da passada ({rodando, passo}). */
function vdf_padronizarQuadroStatus(token) {
  vdf_usuario_(token);
  var p = PropertiesService.getScriptProperties().getProperty('AX_PASSO');
  return { rodando: !!p, passo: p || '' };
}

/* ---------- anexo repetido subido à mão (06/10/2026) ---------- */

function ax_md5_(blob) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, blob.getBytes()).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function ax_hashAnexo_(a) {
  try {
    var r = qt_fetch_(a.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
    return r.getResponseCode() < 300 ? ax_md5_(r.getBlob()) : '';
  } catch (e) { console.log('hash do anexo ' + a.id + ': ' + e); return ''; }
}

/**
 * Anexo subido à mão igual a outro que já está no card: a suspeita é tamanho igual; a confirmação é baixar os dois e
 * comparar o conteúdo (MD5). Só então apaga o mais novo e comenta. Devolve true se apagou.
 */
function ax_removerRepetido_(cardId, a, quem) {
  try {
    if (!a || !a.isUpload || !a.bytes) return false;
    var lista = vd_api_('/cards/' + cardId + '/attachments', { query: { fields: 'name,fileName,bytes,date,isUpload,url' } }) || [];
    var cands = lista.filter(function (x) { return x.id !== a.id && x.isUpload && +x.bytes === +a.bytes && String(x.date || '') <= String(a.date || ''); });
    if (!cands.length) return false;
    var h = ax_hashAnexo_(a); if (!h) return false;
    var igual = null;
    for (var i = 0; i < cands.length && !igual; i++) if (ax_hashAnexo_(cands[i]) === h) igual = cands[i];
    if (!igual) return false;
    vd_api_('/cards/' + cardId + '/attachments/' + a.id, { method: 'delete' });
    // a série ficou com um só "… v1": volta ao nome sem versão
    var pref = String(igual.name || '').split(AX.SEP).slice(0, 2).join(AX.SEP) + AX.SEP;
    var serie = lista.filter(function (x) { return x.id !== a.id && String(x.name || '').indexOf(pref) === 0 && ax_padronizado_(x.name); });
    if (serie.length === 1 && / v1$/.test(serie[0].name)) { var nv = serie[0].name.replace(/ v1$/, ''); if (ax_renomear_(cardId, serie[0].id, nv)) { if (igual.id === serie[0].id) igual.name = nv; } }
    var card = { id: cardId };
    vd_comentar_(card, (quem ? '@' + quem + ' ' : '') + '🗑️ Anexo repetido removido: «' + a.name + '» é o mesmo arquivo que já está no card («' + igual.name + '»).');
    return true;
  } catch (e) { console.log('ax_removerRepetido_: ' + e); return false; }
}

/** Diretoria, pelo formulário: confere os anexos de um card e remove os repetidos (conteúdo igual). */
function vdf_removerRepetidos(token, shortLink) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria.'] };
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,id', attachments: 'true', attachment_fields: 'name,fileName,bytes,date,isUpload,url' } });
  var ans = (card.attachments || []).filter(function (a) { return a.isUpload; }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });   // mais novo primeiro
  var removidos = [];
  ans.forEach(function (a) { if (ax_removerRepetido_(card.id, a, '')) removidos.push(a.name); });
  return { ok: true, removidos: removidos };
}

/* ---------- madrugada: anexos antigos nunca lidos (13/10/2026, Weslley: "dá pra ler na madrugada sim, pra ajustar os cards
 * ainda não encerrados/entregues") ----------
 * Roda dentro do ciclo de 1 min, só das 1h às 5h59. Na primeira rodada da noite guarda a fila de cards abertos fora de
 * ENCERRADO/ENTREGUES; a cada ciclo lê (OCR) os PDFs/fotos sem nome padrão e ainda nunca lidos e batiza pelo que são.
 * Orçamento mais velho que outro 📄 ORÇ do card (foi substituído) vira "📄 ORÇ · … (antigo)". O que não for reconhecido
 * fica com o nome que tem — e, como a leitura fica guardada, não é lido de novo nas noites seguintes. */
var AX_MAD_MAX_LEITURAS = 150;   // OCR por noite (cota do Google); o resto fica para a noite seguinte

/** Registro de/para de cada renomeação da madrugada (desfazer se precisar): AX_MAD_REN = [[cardId, anexoId, de, para], …] (últimas 400). */
function ax_madRegistrar_(cardId, anexoId, de, para) {
  try {
    var props = PropertiesService.getScriptProperties(), l = JSON.parse(props.getProperty('AX_MAD_REN') || '[]');
    l.push([cardId, anexoId, String(de || '').slice(0, 60), String(para || '').slice(0, 70)]);
    while (JSON.stringify(l).length > 8500) l.shift();
    props.setProperty('AX_MAD_REN', JSON.stringify(l));
  } catch (e) {}
}

function ax_madrugada_(teste) {
  var h = +Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'H');
  if (!teste && (h < 3 || h > 5)) return 'fora do horário';   // 3h–5h59: depois da Rotina Unity (1h59), que precisa do robô livre para ler os PDFs que anexa
  var props = PropertiesService.getScriptProperties();
  var dia = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  var st = {}; try { st = JSON.parse(props.getProperty('AX_MAD') || '{}'); } catch (e) {}
  if (teste) st = { dia: 'teste', fila: [teste], pos: 0, lidos: 0, renomeados: 0, antigos: 0 };
  else if (st.dia !== dia) {
    var listas = vd_api_('/boards/' + vd_board_() + '/lists', { query: { fields: 'name', filter: 'open' } }) || [];
    var pular = {}; listas.forEach(function (l) { if (/ENCERRAD|ENTREGUE/i.test(l.name || '')) pular[l.id] = 1; });
    var cards = vd_api_('/boards/' + vd_board_() + '/cards', { query: { fields: 'shortLink,idList,name', filter: 'open' } }) || [];
    st = { dia: dia, fila: cards.filter(function (c) { return !pular[c.idList] && !vdf_cardProtegido_(c.name || '') && ax_placa_(c); }).map(function (c) { return c.shortLink; }), pos: 0, lidos: 0, renomeados: 0, antigos: 0 };
  }
  if (st.pos >= st.fila.length) return 'noite concluída';
  if (!teste && st.lidos >= AX_MAD_MAX_LEITURAS) return 'teto da noite (' + AX_MAD_MAX_LEITURAS + ' leituras) — continua amanhã';
  var ini = Date.now(), limite = Math.min(45 * 1000, (vd_restante_() === Infinity ? 45 * 1000 : vd_restante_() - 20 * 1000));
  for (; st.pos < st.fila.length && Date.now() - ini < limite; st.pos++) {
    try {
      var card = vd_api_('/cards/' + st.fila[st.pos], { query: { fields: 'name,idList', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url,date', checklists: 'all', checkItem_fields: 'name' } });
      st.renomeados += ax_padronizarCard_(card, null);   // fotos e anexos já lidos (sem OCR)
      var anexos = (card.attachments || []).filter(function (a) {
        var nomeVelhoNf = String(a.name || '').indexOf(AX.NF) === 0;   // "📦 NF 123 · PLACA · …" (recebimento antigo) vira o padrão das rotinas
        return a.isUpload && ((!ax_padronizado_(a.name) && !ax_ehNota_(a.name)) || nomeVelhoNf) && vd_anexoLegivel_(a) && !/^image\//i.test(a.mimeType || '') &&
          !props.getProperty('VD_ANX3_' + a.id);
      }).sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); });
      for (var i = 0; i < anexos.length && Date.now() - ini < limite && (teste || st.lidos < AX_MAD_MAX_LEITURAS); i++) {
        var a = anexos[i], r = vd_lerAnexoTrello_(a);
        st.lidos++;
        if (!r || r.erro) continue;
        if (r.nf && !r.orcamento) {   // nota fiscal anexada à mão: padrão das rotinas de NF
          var nmNf = ax_nomeNfRotina_(r.nf, ax_nfDeFornecimento_(card, r.nf.emitente), a.date);
          var deNf = a.name;
          if (nmNf !== a.name && ax_renomear_(card.id, a.id, nmNf, null)) { ax_madRegistrar_(card.id, a.id, deNf, nmNf); a.name = nmNf; st.renomeados++; st.notas = (st.notas || 0) + 1; }
          continue;
        }
        var placa = ax_placa_(card);
        var orcNovo = (card.attachments || []).filter(function (x) { return x.id !== a.id && String(x.name || '').indexOf(AX.ORC + AX.SEP) === 0 && String(x.date || '') > String(a.date || ''); })[0];
        if (r.orcamento && orcNovo && (r.placas || []).some(function (p) { return vd_mesmaPlaca_(p, placa); })) {
          var nm = ax_nome_(AX.ORC, placa, [r.seguradora || '', ax_origem_(r.orcamento)], a.date) + ' (antigo)';
          var deA = a.name;
          if (ax_renomear_(card.id, a.id, nm, null)) { ax_madRegistrar_(card.id, a.id, deA, nm); a.name = nm; st.renomeados++; st.antigos++; }
          continue;
        }
        var temOrc = (card.attachments || []).some(function (x) { return x.id !== a.id && String(x.name || '').indexOf(AX.ORC + AX.SEP) === 0; });
        var deB = a.name, paraB = ax_batizarLido_(card, a, r, temOrc, null);
        if (paraB) { ax_madRegistrar_(card.id, a.id, deB, paraB); st.renomeados++; }
      }
      if (i < anexos.length) break;   // acabou o tempo no meio do card: continua dele no próximo ciclo
    } catch (e) { console.log('madrugada anexos ' + st.fila[st.pos] + ': ' + e); }
  }
  if (teste) return st;
  props.setProperty('AX_MAD', JSON.stringify(st));
  if (st.pos >= st.fila.length) {
    try {
      var lg = JSON.parse(props.getProperty('AX_MAD_LOG') || '[]');
      lg.push(dia + ': ' + st.fila.length + ' cards, ' + st.lidos + ' anexos lidos, ' + st.renomeados + ' renomeados (' + st.antigos + ' antigos, ' + (st.notas || 0) + ' notas)');
      props.setProperty('AX_MAD_LOG', JSON.stringify(lg.slice(-15)));
    } catch (e) {}
  }
  return st.pos + '/' + st.fila.length + ' cards · ' + st.lidos + ' lidos · ' + st.renomeados + ' renomeados';
}

/** Diretoria: roda a passada da madrugada num card só, agora (teste). */
function vdf_anexosAntigosCard(token, shortLink) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) throw new Error('Só a diretoria.');
  return ax_madrugada_(shortLink);
}
