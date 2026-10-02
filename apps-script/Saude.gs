// publicado: revisão do fluxo (02/10)
/* ============================ SAÚDE DO SISTEMA ============================
 * Para nada parar em silêncio:
 *  - sd_parte_(nome, fn): cada parte do ciclo de 1 min (travas, complemento, prazos...) roda isolada;
 *    5 falhas seguidas da mesma parte = e-mail (de novo a cada 6 h enquanto continuar falhando).
 *  - sd_diario (acionador próprio, todo dia ~7h50): confere se o ciclo e o log de descrição do quadro
 *    principal estão rodando, se os acionadores existem e se o token do Trello responde.
 *    Só manda e-mail se achar problema. Rodar na mão: sd_diario().
 *  - sd_backupSemanal_ (dentro do diário, toda segunda): cópia da planilha (TRAVA, EVENTOS,
 *    FORNECEDORES, CHECKLISTS) na pasta "Backups" ao lado dela; guarda as 8 últimas. Na mão: sd_backupAgora().
 */
var SD = { EMAIL: 'weslley.santos@unitycs.com.br', FALHAS: 5, REPETE_MS: 6 * 3600 * 1000, BACKUPS: 8, PASTA: 'Backups' };

var SD_TEMPOS = [];
function sd_parte_(nome, fn) {
  var p = PropertiesService.getScriptProperties(), k = 'SD_F_' + nome, t0 = Date.now();
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
  } finally {
    var dt = Date.now() - t0;
    if (dt > 1500) SD_TEMPOS.push(nome + ' ' + (dt / 1000).toFixed(1) + 's');
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
  try { sd_backupSemanal_(); } catch (e) { prob.push('backup semanal da planilha falhou: ' + e.message); }
  try { pn_atualizar(); } catch (e) { prob.push('painel de indicadores não atualizou: ' + e.message); }
  try { sd_limparPropriedades_(); } catch (e) { prob.push('limpeza das propriedades falhou: ' + e.message); }
  try { var tamP = sd_propriedades(); if (tamP > 380 * 1024) prob.push('Propriedades do script em ' + Math.round(tamP / 1024) + ' KB (limite ~500 KB)'); } catch (e) {}
  Logger.log(prob.length ? prob.join('\n') : 'tudo ok');
  if (prob.length) MailApp.sendEmail(SD.EMAIL, 'ALERTA Trello: conferência diária achou ' + prob.length + ' problema(s)', prob.map(function (x) { return '- ' + x; }).join('\n') +
    '\n\nExecuções: https://script.google.com/home/projects/' + ScriptApp.getScriptId() + '/executions');
  return prob;
}

/* ---------- backup semanal da planilha ---------- */
function sd_backupSemanal_() {
  var p = PropertiesService.getScriptProperties();
  var hoje = new Date(), semana = Utilities.formatDate(hoje, 'America/Sao_Paulo', 'YYYY-ww');
  if (Utilities.formatDate(hoje, 'America/Sao_Paulo', 'u') !== '1' && p.getProperty('SD_BACKUP_SEMANA')) return '';   // só segunda (o 1º roda já)
  if (p.getProperty('SD_BACKUP_SEMANA') === semana) return '';
  var nome = sd_backupAgora();
  p.setProperty('SD_BACKUP_SEMANA', semana);
  return nome;
}

function sd_backupAgora() {
  var ss = vd_planilhaBackup_().getParent();
  var arq = DriveApp.getFileById(ss.getId());
  var pai = arq.getParents().hasNext() ? arq.getParents().next() : DriveApp.getRootFolder();
  var it = pai.getFoldersByName(SD.PASTA), pasta = it.hasNext() ? it.next() : pai.createFolder(SD.PASTA);
  var nome = ss.getName() + ' — backup ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  arq.makeCopy(nome, pasta);
  // guarda só as últimas
  var copias = [], fs = pasta.getFiles();
  while (fs.hasNext()) { var f = fs.next(); if (f.getName().indexOf(ss.getName() + ' — backup ') === 0) copias.push(f); }
  copias.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  copias.slice(SD.BACKUPS).forEach(function (f) { f.setTrashed(true); });
  Logger.log('backup: ' + nome + ' (pasta ' + pasta.getName() + ', ' + Math.min(copias.length, SD.BACKUPS) + ' guardado(s))');
  return nome;
}

/** Uso das Propriedades do script (limite do Google: ~500 KB no total, 9 KB por valor). Rodar na mão. */
function sd_propriedades() {
  var all = PropertiesService.getScriptProperties().getProperties(), tot = 0, por = {}, maior = ['', 0];
  Object.keys(all).forEach(function (k) {
    var t = k.length + String(all[k]).length; tot += t;
    var pre = (k.match(/^[A-Z]+_[A-Z0-9]*_?/) || [k])[0];
    por[pre] = (por[pre] || 0) + t;
    if (t > maior[1]) maior = [k, t];
  });
  var top = Object.keys(por).sort(function (a, b) { return por[b] - por[a]; }).slice(0, 12).map(function (k) { return k + ' ' + Math.round(por[k] / 1024) + ' KB'; });
  Logger.log('propriedades: ' + Object.keys(all).length + ' chaves · ' + Math.round(tot / 1024) + ' KB de ~500 KB · maior: ' + maior[0] + ' (' + Math.round(maior[1] / 1024) + ' KB)\n' + top.join('\n'));
  return tot;
}

/** Limpeza diária: apaga as propriedades por card (VD_PK2_, VD_AT_, VD_SIG_, PZ_AT_, SLA_, ...) de cards que
 *  não estão mais abertos no quadro em uso (arquivados, apagados, ou de outro quadro depois da virada)
 *  e de cards antigos (anteriores à virada), que o robô não acompanha. */
var SD_PREF_CARD = /^(?:VD_PK2_|VD_AT_|VD_SIG_|VD_NOVAS_|VD_DESC_AV_|PZ_AT_|ST_ESP_)([0-9a-f]{24})$|^SLA_([0-9a-f]{24})_/;
function sd_limparPropriedades_() {
  var p = PropertiesService.getScriptProperties(), all = p.getKeys(), abertos = {};
  vd_api_('/boards/' + vd_board_() + '/cards', { cru: true, query: { fields: 'id' } }).forEach(function (c) { abertos[c.id] = 1; });
  if (Object.keys(abertos).length < 5) return 0;   // leitura estranha: não apaga nada
  var n = 0;
  all.forEach(function (k) { var m = k.match(SD_PREF_CARD), id = m && (m[1] || m[2]); if (id && (!abertos[id] || vd_legado_(id))) { p.deleteProperty(k); n++; } });
  if (n) console.log('propriedades: ' + n + ' de cards fechados apagadas');
  return n;
}

/** Últimas medições do ciclo de 1 min (partes acima de 1,5 s). Rodar na mão. */
function sd_verTempos() { Logger.log(JSON.parse(PropertiesService.getScriptProperties().getProperty('SD_TEMPOS_LOG') || '[]').join('\n')); }

/** Erros guardados de cada parte do ciclo (SD_F_*) e uma rodada da trava de descrição. Rodar na mão. */
function sd_verErros() {
  var all = PropertiesService.getScriptProperties().getProperties();
  Object.keys(all).filter(function (k) { return /^SD_F_/.test(k); }).forEach(function (k) { Logger.log(k + ' = ' + all[k]); });
  Logger.log('TR_ACT = ' + vd_marca_('TR_ACT') + ' · CP_ACT = ' + vd_marca_('CP_ACT'));
  try { Logger.log('trava de descrição: ' + tr_executar_()); } catch (e) { Logger.log('trava de descrição ERRO: ' + e.stack); }
}
