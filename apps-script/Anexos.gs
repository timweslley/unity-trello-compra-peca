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
var AX_RE_PADRAO = /^(📄 ORÇ\+?|🚚 FO|📦 NF|📸)( |$)/;

function ax_hoje_() { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM'); }

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

/** Monta o nome: tipo · placa · partes… · dd/MM. */
function ax_nome_(tipo, placa, partes) {
  var p = [tipo].concat(placa ? [placa] : []).concat((partes || []).map(function (s) { return String(s || '').trim(); }).filter(String));
  p.push(ax_hoje_());
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
function ax_batizarLido_(card, a, r, complementar) {
  try {
    if (!card || !a || !r || r.erro || ax_padronizado_(a.name)) return '';
    var placa = ax_placa_(card);
    if (!placa) return '';
    var nome = '';
    if (r.doc === 'FO') nome = ax_nome_(AX.FO, placa, ['Status do Pedido Cilia']);
    else if (r.orcamento && (r.placas || []).some(function (p) { return vd_mesmaPlaca_(p, placa); })) {
      nome = ax_nome_(complementar ? AX.ORC_MAIS : AX.ORC, placa, [r.seguradora || '', ax_origem_(r.orcamento)]);
    }
    if (!nome) return '';
    var fim = ax_batizar_(card.id, a.id, nome, ax_anexos_(card.id), null, { nomeAtual: a.name });
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
