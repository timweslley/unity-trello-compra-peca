// pacote mínimo no formato do robô, para testar a imitação dos serviços do Google
function teste_props() { var p = PropertiesService.getScriptProperties(); p.setProperty('A', '1'); return p.getProperty('A') + '|' + p.getProperty('VD_BOARD') + '|' + (p.getProperty('NADA') === null); }
function teste_planilha() {
  var ss = SpreadsheetApp.openById('x'); var sh = ss.getSheetByName('NOVA') || ss.insertSheet('NOVA');
  sh.appendRow(['a', new Date(Date.UTC(2026, 9, 7, 15))]);
  sh.getRange(2, 1, 1, 2).setValues([['b', 2]]);
  var v = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
  var achou = sh.getRange('A:A').createTextFinder('b').matchEntireCell(true).findNext();
  return JSON.stringify({ v: v.map(function (r) { return r.map(function (x) { return x instanceof Date ? 'DATA ' + x.toISOString() : x; }); }), linhaB: achou && achou.getRow(), ultima: sh.getLastRow() });
}
function teste_fetch(url) { var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true }); return r.getResponseCode() + ':' + r.getContentText(); }
function teste_escrita(card) {
  var r = UrlFetchApp.fetch('https://api.trello.com/1/cards/' + card + '/actions/comments', { method: 'post', payload: JSON.stringify({ text: 'oi' }), contentType: 'application/json', muteHttpExceptions: true });
  return r.getResponseCode() + ':' + r.getContentText();
}
function teste_cache() { CacheService.getScriptCache().put('k', 'v', 60); return CacheService.getScriptCache().get('k'); }
function teste_digest() { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, 'abc', Utilities.Charset.UTF_8)); }
function teste_data() { return Utilities.formatDate(new Date(Date.UTC(2026, 9, 7, 15, 4, 5)), 'America/Sao_Paulo', "dd/MM/yyyy 'às' HH:mm:ss"); }
var MEM_TESTE = null;
function teste_global() { var antes = MEM_TESTE === null ? 'vazio' : MEM_TESTE.n; MEM_TESTE = { n: 'velho' }; return antes; }
function teste_erro() { throw new Error('falhou de propósito'); }
function doPost(e) {
  var out;
  try { var req = JSON.parse(e.postData.contents); out = { ok: true, r: globalThis[req.fn].apply(null, req.args || []) }; }
  catch (err) { out = { ok: false, erro: String(err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
