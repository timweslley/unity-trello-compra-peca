/* ============================ COTA DE CHAMADAS EXTERNAS (UrlFetch) ============================
 * O Google limita as chamadas HTTP do script (Trello, download de anexo...) a ~100.000 por dia na
 * conta Workspace, numa janela de 24 h. Em 05/10/2026 (01:51) a cota estourou: cada chamada passou
 * a falhar depois de ~10 s ("Service invoked too many times for one day: premium urlfetch"), o ciclo
 * de 1 min gastava 60 s só tomando "não" e o alarme mandou e-mail a cada 2 falhas.
 *
 * Aqui:
 *  - qt_fetch_ / qt_fetchAll_: ÚNICO ponto de UrlFetchApp do projeto — conta por execução, por parte e por dia.
 *  - estourou → pausa de 30 min (robô e formulário não gastam chamada nem tempo), 1 e-mail a cada 12 h com o consumo.
 *  - qt_registrar_(origem): no fim de cada execução grava o consumo do dia em QT_DIA_<aaaa-mm-dd> {total, partes}.
 *  - qt_verHoje(): mostra o consumo de hoje e de ontem no registro (rodar na mão).
 *  - sd_diario inclui o consumo de ontem e avisa quando passa de QT.ALERTA.
 */
var QT = { LIMITE: 100000, ALERTA: 60000, PAUSA_MS: 30 * 60000, AVISO_MS: 12 * 3600 * 1000, GUARDAR_DIAS: 7 };
var QT_N = 0;            // chamadas nesta execução
var QT_PARTES = {};      // chamadas por parte nesta execução
var QT_PARTE_ATUAL = '';

function qt_parte_(nome) { QT_PARTE_ATUAL = nome || ''; }
function qt_contar_(n) {
  QT_N += n;
  var k = QT_PARTE_ATUAL || 'outros';
  QT_PARTES[k] = (QT_PARTES[k] || 0) + n;
}

/** Chamada HTTP contada. Se a cota estourou há menos de 30 min, nem tenta (lança erro "COTA:"). */
function qt_fetch_(url, params) {
  qt_conferirPausa_();
  qt_contar_(1);
  try { return UrlFetchApp.fetch(url, params); }
  catch (e) { if (qt_ehEstouro_(e)) qt_marcarEstouro_(e); throw e; }
}
function qt_fetchAll_(reqs) {
  qt_conferirPausa_();
  qt_contar_(reqs.length);
  try { return UrlFetchApp.fetchAll(reqs); }
  catch (e) { if (qt_ehEstouro_(e)) qt_marcarEstouro_(e); throw e; }
}

function qt_ehEstouro_(e) { return /too many times.*urlfetch/i.test(String((e && e.message) || e)); }
/** Erro de cota (estouro real ou pausa): não conta como falha de módulo nem gera e-mail de alarme. */
function qt_ehErroDeCota_(e) { var s = String((e && e.message) || e); return /^COTA:/.test(s) || qt_ehEstouro_(e); }

function qt_pausadaAte_() {
  var t = +(PropertiesService.getScriptProperties().getProperty('QT_ESTOURO') || 0);
  return t && Date.now() - t < QT.PAUSA_MS ? t + QT.PAUSA_MS : 0;
}
function qt_pausada_() { return !!qt_pausadaAte_(); }
function qt_conferirPausa_() {
  var ate = qt_pausadaAte_();
  if (ate) throw new Error('COTA: limite diário de chamadas externas do Google estourado — pausado até ' + Utilities.formatDate(new Date(ate), 'America/Sao_Paulo', 'HH:mm') + '.');
}

function qt_marcarEstouro_(e) {
  var p = PropertiesService.getScriptProperties();
  p.setProperty('QT_ESTOURO', String(Date.now()));
  console.log('COTA ESTOURADA: ' + String((e && e.message) || e) + ' — pausa de ' + (QT.PAUSA_MS / 60000) + ' min');
  var av = +(p.getProperty('QT_AVISADO') || 0);
  if (Date.now() - av < QT.AVISO_MS) return;
  p.setProperty('QT_AVISADO', String(Date.now()));
  try {
    MailApp.sendEmail(SD.EMAIL, 'ALERTA Trello: cota diária de chamadas do Google estourada',
      'O robô do Trello (projeto Log de Descricao Trello) estourou o limite diário de chamadas externas do Google ' +
      '(~' + QT.LIMITE.toLocaleString('pt-BR') + ' por dia, janela de 24 h).\n\n' +
      'O que acontece: o robô e o formulário ficam pausados em janelas de ' + (QT.PAUSA_MS / 60000) + ' min e voltam sozinhos quando a cota liberar. ' +
      'Nenhum dado se perde: as travas e o fluxo reprocessam o histórico do quadro ao voltar.\n\n' +
      'Consumo registrado:\n' + qt_resumo_(0) + '\n' + qt_resumo_(1) + '\n\n' +
      'Este aviso sai no máximo a cada 12 h. Execuções: https://script.google.com/home/projects/' + ScriptApp.getScriptId() + '/executions');
  } catch (x) {}
}

/** No fim da execução: soma o consumo desta execução no dia (QT_DIA_<dia> = {total, partes, exec}). */
function qt_registrar_(origem) {
  if (!QT_N) return;
  var p = PropertiesService.getScriptProperties(), dia = qt_dia_(0), k = 'QT_DIA_' + dia;
  var d = {}; try { d = JSON.parse(p.getProperty(k) || '{}'); } catch (e) {}
  d.total = (d.total || 0) + QT_N;
  d.exec = (d.exec || 0) + 1;
  d.partes = d.partes || {};
  Object.keys(QT_PARTES).forEach(function (n) { d.partes[n] = (d.partes[n] || 0) + QT_PARTES[n]; });
  p.setProperty(k, JSON.stringify(d));
  QT_N = 0; QT_PARTES = {};
  // limpa dias antigos (uma vez por dia, na 1ª execução do dia)
  if (!d.limpo) {
    d.limpo = 1; p.setProperty(k, JSON.stringify(d));
    try {
      Object.keys(p.getProperties()).forEach(function (kk) {
        var m = kk.match(/^QT_DIA_(\d{4}-\d{2}-\d{2})$/);
        if (m && (Date.now() - new Date(m[1] + 'T12:00:00Z').getTime()) > QT.GUARDAR_DIAS * 864e5) p.deleteProperty(kk);
      });
    } catch (e) {}
  }
}

function qt_dia_(menos) { return Utilities.formatDate(new Date(Date.now() - (menos || 0) * 864e5), 'America/Sao_Paulo', 'yyyy-MM-dd'); }
function qt_doDia_(menos) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('QT_DIA_' + qt_dia_(menos)) || '{}'); } catch (e) { return {}; }
}
/** Texto: "05/10: 12.345 chamadas em 1.400 execuções — núcleo 4.000 · trava de checklist 1.500 · ..." */
function qt_resumo_(menos) {
  var d = qt_doDia_(menos), dia = qt_dia_(menos).split('-').reverse().slice(0, 2).join('/');
  if (!d.total) return dia + ': sem registro';
  var partes = Object.keys(d.partes || {}).map(function (n) { return [n, d.partes[n]]; }).filter(function (x) { return x[1]; })
    .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10).map(function (x) { return x[0] + ' ' + x[1].toLocaleString('pt-BR'); });
  return dia + ': ' + d.total.toLocaleString('pt-BR') + ' chamadas em ' + (d.exec || 0).toLocaleString('pt-BR') + ' execuções' + (partes.length ? ' — ' + partes.join(' · ') : '');
}

/** Rodar na mão: consumo de hoje e de ontem, por parte. */
function qt_verHoje() {
  Logger.log(qt_resumo_(0) + '\n' + qt_resumo_(1) + '\n' + qt_resumo_(2));
  var ate = qt_pausadaAte_();
  Logger.log(ate ? 'PAUSADO até ' + new Date(ate).toLocaleString('pt-BR') : 'sem pausa');
}

/** Rodar na mão para voltar antes dos 30 min (se a cota já liberou). */
function qt_despausar() { PropertiesService.getScriptProperties().deleteProperty('QT_ESTOURO'); Logger.log('pausa removida'); }

function qt_resumoPausa_() { var ate = qt_pausadaAte_(); return 'cota estourada, pausado até ' + (ate ? Utilities.formatDate(new Date(ate), 'America/Sao_Paulo', 'HH:mm') : '?'); }
