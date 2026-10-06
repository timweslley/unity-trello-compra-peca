/**
 * Nome padronizado dos anexos (Weslley, 05/10/2026): o arquivo que o sistema leu/importou é batizado pelo
 * que ele é, com a placa na frente, para o card ficar limpo e fácil de achar:
 *   📄 ORÇ · RHV1E04 · SURA · Cilia · 05/10        orçamento que abriu o pedido
 *   📄 ORÇ+ · RHV1E04 · SURA · Cilia · 07/10       orçamento complementar
 *   🚚 FO · RHV1E04 · Status do Pedido Cilia · 05/10
 *   📦 NF 12345 · RHV1E04 · MARAJO · 06/10          nota do recebimento (número quando o arquivo deixa ler)
 *   📸 · RHV1E04 · capa · 05/10                     fotos
 * Quando entra outro do MESMO tipo no card, o anterior vira "v1" e o novo "v2" (v3…) — só aparece versão
 * quando há mais de um. A data é a do upload. O robô nunca identifica anexo pelo nome (usa id e conteúdo),
 * então renomear não muda nada no funcionamento. Trello aceita PUT /cards/{id}/attachments/{id} {name}.
 */
var AX = { ORC: '📄 ORÇ', ORC_MAIS: '📄 ORÇ+', FO: '🚚 FO', NF: '📦 NF', FOTO: '📸', SEP: ' · ' };
var AX_RE_PADRAO = /^((📄 ORÇ\+?|🚚 FO|📦 NF( \d+)?) · |📸 )/;

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
    if (r.doc === 'FO') nome = ax_nome_(AX.FO, placa, ['Status do Pedido Cilia'], a.date);
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
