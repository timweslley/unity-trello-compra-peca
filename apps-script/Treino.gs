/* ============================ TREINO DO LEITOR DE ORÇAMENTO (diretoria, 08/10/2026) ============================
 * Weslley: "usa os orçamentos dos cards do sistema antigo e arquivados pra ensinar o leitor para todos os casos".
 * Este módulo só COLETA: percorre todos os cards do quadro (abertos e arquivados), pega os PDFs que parecem orçamento,
 * extrai o texto (mesmo OCR do robô) e grava lotes JSON numa pasta do Drive compartilhada com a diretoria. O leitor é
 * ajustado fora, com esses textos como casos de teste. Não mexe em card nenhum.
 *
 * Uso pelo formulário (diretoria): chamar('vdf_treinoLeitor', TOKEN, {reiniciar:true}) na 1ª vez, depois
 * chamar('vdf_treinoLeitor', TOKEN, {}) até devolver fim:true. Cada chamada roda ~4,5 min.
 */
var TR = {
  PASTA_NOME: 'Treino do leitor de orçamento',
  LIMITE_MS: 240 * 1000,
  MAX_BYTES: 8 * 1024 * 1024,
  POR_CARD: 3,
  TEXTO_MAX: 24000,
  LOTE: 40,
  COMPARTILHAR: ['weslley.santos@unitycs.com.br']
};

function tr_pasta_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('TR_PASTA');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var p = DriveApp.createFolder(TR.PASTA_NOME);
  TR.COMPARTILHAR.forEach(function (em) { try { p.addViewer(em); } catch (e) { console.log('treino/compartilhar: ' + e); } });
  props.setProperty('TR_PASTA', p.getId());
  return p;
}

/** PDF que parece orçamento (não nota, não comprovante, não Status do Pedido). */
function tr_candidato_(a) {
  if (!a || !a.isUpload) return false;
  var nome = String(a.name || '') + ' ' + String(a.fileName || '');
  if (!/pdf/i.test(a.mimeType || '') && !/\.pdf$/i.test(nome)) return false;
  if ((a.bytes || 0) > TR.MAX_BYTES || !(a.bytes || 0)) return false;
  if (/^(📦|📸|🛒|🚚)/.test(String(a.name || ''))) return false;
  if (/\b(NF|NFE|NF-E|NOTA|DANFE|BOLETO|CUPOM|RECIBO|COMPROVANTE|PIX|STATUS DO PEDIDO|PEDIDO DE COMPRA)\b/i.test(nome)) return false;
  return true;
}

/** Lista todos os cards do quadro (abertos + arquivados) com anexos, em páginas de 1000. */
function tr_listar_(board) {
  var out = [], before = null, pag = 0;
  while (pag < 20) {
    var q = { fields: 'name,closed,idList,shortLink,dateLastActivity', attachments: 'true', attachment_fields: 'name,fileName,mimeType,isUpload,bytes,url,date', limit: 1000 };
    if (before) q.before = before;
    var cards = vd_api_('/boards/' + board + '/cards/all', { cru: true, query: q }) || [];
    if (!cards.length) break;
    cards.forEach(function (c) {
      var ats = (c.attachments || []).filter(tr_candidato_).sort(function (x, y) { return String(x.date || '').localeCompare(String(y.date || '')); }).slice(0, TR.POR_CARD);
      ats.forEach(function (a) { out.push({ card: c.id, nome: c.name, fechado: !!c.closed, lista: c.idList, shortLink: c.shortLink, att: a.id, anexo: a.name, arquivo: a.fileName, bytes: a.bytes, data: a.date, url: a.url }); });
    });
    pag++;
    if (cards.length < 1000) break;
    before = cards[cards.length - 1].id;
  }
  return out;
}

/**
 * p = {reiniciar:true} começa do zero (relista os cards). Devolve {ok, total, pos, feitos, erros, lotes:[ids], fim, pasta}.
 */
function vdf_treinoLeitor(token, p) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria.'] };
  p = p || {};
  var props = PropertiesService.getScriptProperties(), t0 = Date.now();
  var pasta = tr_pasta_();
  var est = null;
  try { est = JSON.parse(props.getProperty('TR_ESTADO') || 'null'); } catch (e) {}
  if (!est || p.reiniciar) {
    var board = vd_board_();
    var lista = tr_listar_(board);
    var arqLista = pasta.createFile('treino_lista.json', JSON.stringify(lista), 'application/json');
    est = { lista: arqLista.getId(), total: lista.length, pos: 0, feitos: 0, erros: 0, lotes: [], loteN: 0 };
    props.setProperty('TR_ESTADO', JSON.stringify(est));
  }
  var lista = JSON.parse(DriveApp.getFileById(est.lista).getBlob().getDataAsString());
  var lote = [], n = 0;
  while (est.pos < lista.length && Date.now() - t0 < TR.LIMITE_MS && lote.length < TR.LOTE) {
    var it = lista[est.pos];
    var reg = { card: it.card, nome: it.nome, fechado: it.fechado, shortLink: it.shortLink, att: it.att, anexo: it.anexo, arquivo: it.arquivo, bytes: it.bytes, data: it.data };
    try {
      var resp = qt_fetch_(it.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
      if (resp.getResponseCode() >= 300) throw new Error('Trello ' + resp.getResponseCode());
      var texto = vd_ocr_(resp.getBlob(), it.arquivo || it.anexo);
      reg.texto = String(texto || '').slice(0, TR.TEXTO_MAX);
      try {
        var orc = vd_lerOrcamento_(texto);
        reg.leitura = { origem: orc.origem, seguradora: orc.seguradora, oficina: orc.oficina.length, fo: orc.fo.length };
      } catch (e2) { reg.leitura = { erro: String(e2 && e2.message || e2) }; }
      est.feitos++;
    } catch (e) {
      reg.erro = String((e && e.message) || e).slice(0, 200);
      est.erros++;
    }
    lote.push(reg);
    est.pos++; n++;
  }
  if (lote.length) {
    est.loteN++;
    var arq = pasta.createFile('treino_lote_' + ('00' + est.loteN).slice(-3) + '.json', JSON.stringify(lote), 'application/json');
    est.lotes.push(arq.getId());
  }
  props.setProperty('TR_ESTADO', JSON.stringify(est));
  return { ok: true, total: est.total, pos: est.pos, feitos: est.feitos, erros: est.erros, nesta: n, lotes: est.lotes, fim: est.pos >= lista.length, pasta: pasta.getUrl(), listaId: est.lista };
}
