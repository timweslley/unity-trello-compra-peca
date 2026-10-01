/* ============================ SAÚDE DO SISTEMA ============================
 * Para nada parar em silêncio:
 *  - sd_parte_(nome, fn): cada parte do ciclo de 1 min (travas, complemento, prazos...) roda isolada;
 *    5 falhas seguidas da mesma parte = e-mail (de novo a cada 6 h enquanto continuar falhando).
 *  - sd_diario (acionador próprio, todo dia ~7h50): confere se o ciclo e o log de descrição do quadro
 *    principal estão rodando, se os acionadores existem e se o token do Trello responde.
 *    Só manda e-mail se achar problema. Rodar na mão: sd_diario().
 */
var SD = { EMAIL: 'weslley.santos@unitycs.com.br', FALHAS: 5, REPETE_MS: 6 * 3600 * 1000 };

function sd_parte_(nome, fn) {
  var p = PropertiesService.getScriptProperties(), k = 'SD_F_' + nome;
  try {
    var r = fn();
    if (p.getProperty(k)) p.deleteProperty(k);
    return r;
  } catch (e) {
    var est = {}; try { est = JSON.parse(p.getProperty(k) || '{}'); } catch (x) {}
    est.n = (est.n || 0) + 1; est.erro = String((e && e.message) || e).slice(0, 300);
    if (est.n >= SD.FALHAS && Date.now() - (est.avisado || 0) > SD.REPETE_MS) {
      try {
        MailApp.sendEmail(SD.EMAIL, 'ALERTA Trello: "' + nome + '" falhando',
          'A parte "' + nome + '" do robô do Trello falhou ' + est.n + ' vez(es) seguida(s).\n\nÚltimo erro:\n' + est.erro +
          '\n\nO resto do robô continua rodando. Execuções: https://script.google.com/home/projects/' + ScriptApp.getScriptId() + '/executions');
        est.avisado = Date.now();
      } catch (x) {}
    }
    p.setProperty(k, JSON.stringify(est));
    console.log(nome + ': ' + est.erro);
  }
}

/** Marca que o ciclo de 1 min rodou (o diário confere). */
function sd_batida_() { PropertiesService.getScriptProperties().setProperty('SD_ULTIMO_CICLO', String(Date.now())); }

function sd_instalarSeFaltar_() {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('SD_DIARIO_OK') === 'SIM') return;
  var tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'sd_diario'; });
  if (!tem) ScriptApp.newTrigger('sd_diario').timeBased().everyDays(1).atHour(7).nearMinute(50).inTimezone('America/Sao_Paulo').create();
  p.setProperty('SD_DIARIO_OK', 'SIM');
}

function sd_diario() {
  var p = PropertiesService.getScriptProperties(), prob = [];
  var acs = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  ['validarDadosPedido', 'verificarAlteracoesDescricao'].forEach(function (f) { if (acs.indexOf(f) < 0) prob.push('acionador "' + f + '" sumiu'); });
  var ciclo = +(p.getProperty('SD_ULTIMO_CICLO') || 0);
  if (Date.now() - ciclo > 30 * 60000) prob.push('o ciclo de 1 min do quadro TESTE não roda desde ' + (ciclo ? new Date(ciclo).toLocaleString('pt-BR') : 'nunca'));
  var ult = p.getProperty('ULTIMA_VERIFICACAO');
  if (!ult || Date.now() - new Date(ult).getTime() > 30 * 60000) prob.push('o log de descrição do QUADRO PRINCIPAL está parado desde ' + ult);
  if (p.getProperty('LOG_RECUPERANDO')) prob.push('LOG_RECUPERANDO ficou marcado (log do quadro principal travado)');
  try { vd_api_('/members/me', { query: { fields: 'username' } }); } catch (e) { prob.push('token do Trello do robô não responde: ' + e.message); }
  Object.keys(p.getProperties()).filter(function (k) { return k.indexOf('SD_F_') === 0; }).forEach(function (k) {
    try { var est = JSON.parse(p.getProperty(k)); if (est.n >= SD.FALHAS) prob.push('"' + k.slice(5) + '" falhando (' + est.n + 'x): ' + est.erro); } catch (e) {}
  });
  Object.keys(p.getProperties()).filter(function (k) { return k.indexOf('FALHAS_') === 0; }).forEach(function (k) { prob.push('"' + k.slice(7) + '" com ' + p.getProperty(k) + ' falha(s) seguida(s)'); });
  Logger.log(prob.length ? prob.join('\n') : 'tudo ok');
  if (prob.length) MailApp.sendEmail(SD.EMAIL, 'ALERTA Trello: conferência diária achou ' + prob.length + ' problema(s)', prob.map(function (x) { return '- ' + x; }).join('\n') +
    '\n\nExecuções: https://script.google.com/home/projects/' + ScriptApp.getScriptId() + '/executions');
  return prob;
}
