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
  qt_parte_(nome);
  try {
    var r = fn();
    if (p.getProperty(k)) p.deleteProperty(k);
    return r;
  } catch (e) {
    if (qt_ehErroDeCota_(e)) { console.log(nome + ': ' + String((e && e.message) || e).slice(0, 120)); return; }   // cota: não é falha do módulo
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
    qt_parte_('');
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
  if (qt_pausada_()) prob.push('robô PAUSADO pela cota diária de chamadas do Google (estourou ' + new Date(+p.getProperty('QT_ESTOURO')).toLocaleString('pt-BR') + ')');
  else if (Date.now() - ciclo > 30 * 60000) prob.push('o ciclo de 1 min do quadro não roda desde ' + (ciclo ? new Date(ciclo).toLocaleString('pt-BR') : 'nunca'));
  var ontem = qt_doDia_(1);
  if ((ontem.total || 0) > QT.ALERTA) prob.push('consumo de chamadas externas ontem perto do limite: ' + qt_resumo_(1));
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
    '\n\nChamadas externas (limite ~' + QT.LIMITE.toLocaleString('pt-BR') + '/dia):\n' + qt_resumo_(1) + '\n' + qt_resumo_(2) +
    '\n\nExecuções: https://script.google.com/home/projects/' + ScriptApp.getScriptId() + '/executions');
  try { qt_registrar_('conferência diária'); } catch (e) {}
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

/* ---------- migração do robô para outra conta (05/10/2026: cota de UrlFetch é por conta) ----------
 * Rodar UMA vez, logado na conta nova (ex.: sistema@unitycs.com.br), com o projeto compartilhado como editor:
 * autoriza os escopos e instala os 5 acionadores em nome dessa conta. Depois, na conta antiga, apagar os
 * acionadores dela (Meus acionadores) e republicar o web app pela conta nova (Implantar > Gerenciar implantações
 * > editar > Nova versão), para o formulário também rodar na cota da conta nova. */
function migrar_instalarAcionadores() {
  var eu = 'esta conta';
  var meus = ScriptApp.getProjectTriggers();   // só os acionadores DESTA conta
  var tem = {}; meus.forEach(function (t) { tem[t.getHandlerFunction()] = true; });
  var feitos = [];
  if (!tem.verificarAlteracoesDescricao) { ScriptApp.newTrigger('verificarAlteracoesDescricao').timeBased().everyMinutes(1).create(); feitos.push('log de descrição (1 min)'); }
  if (!tem.validarDadosPedido) { ScriptApp.newTrigger('validarDadosPedido').timeBased().everyMinutes(1).create(); feitos.push('validarDadosPedido (1 min)'); }
  if (!tem.rotinaDiaria) { ScriptApp.newTrigger('rotinaDiaria').timeBased().everyDays(1).atHour(7).create(); feitos.push('rotina diária (7h)'); }
  if (!tem.relatorioDiario) { ScriptApp.newTrigger('relatorioDiario').timeBased().everyDays(1).atHour(7).nearMinute(15).create(); feitos.push('relatório diário (7h15)'); }
  if (!tem.sd_diario) { ScriptApp.newTrigger('sd_diario').timeBased().everyDays(1).atHour(7).nearMinute(50).inTimezone('America/Sao_Paulo').create(); feitos.push('conferência diária (7h50)'); }
  // confere o que a conta nova precisa enxergar
  var prob = [];
  try { vd_planilhaBackup_().getParent().getName(); } catch (e) { prob.push('planilha "Validação Trello — backup de descrições" não acessível: compartilhar com esta conta'); }
  try { vd_api_('/members/me', { query: { fields: 'username' } }); } catch (e) { prob.push('Trello não respondeu (cota ou token): ' + e.message); }
  qt_despausar();
  Logger.log('Acionadores criados: ' + (feitos.join(', ') || 'nenhum (já existiam)') + '\nTotal nesta conta: ' + ScriptApp.getProjectTriggers().length +
    (prob.length ? '\nPENDÊNCIAS:\n- ' + prob.join('\n- ') : '\nTudo acessível.') +
    '\nFalta: (1) na conta antiga, apagar os acionadores dela em script.google.com/home/triggers; (2) nesta conta, Implantar > Gerenciar implantações > editar > Nova versão > Implantar.');
}

/** Diagnóstico (05/10/2026): conversão para Google Docs pelo Drive falha com "Internal Error" na conta sistema@. Rodar no editor. */
function diag_ocr() {
  var blob = Utilities.newBlob('OCR teste 123 ' + new Date(), 'text/plain', 'vd_tmp_teste.txt');
  var det = function (e) { return String(e) + (e && e.details ? ' | ' + JSON.stringify(e.details).slice(0, 400) : ''); };
  try { var a = Drive.Files.create({ name: 'vd_tmp_teste', mimeType: 'application/vnd.google-apps.document' }, blob, {}); Logger.log('1 create+converter: OK ' + a.id); DriveApp.getFileById(a.id).setTrashed(true); }
  catch (e) { Logger.log('1 create+converter: ERRO ' + det(e)); }
  try { var b = Drive.Files.create({ name: 'vd_tmp_teste.txt' }, blob, {}); Logger.log('2 create sem converter: OK ' + b.id); DriveApp.getFileById(b.id).setTrashed(true); }
  catch (e) { Logger.log('2 create sem converter: ERRO ' + det(e)); }
  try { var f = DriveApp.createFile(blob); var c = Drive.Files.copy({ name: 'vd_tmp_copia', mimeType: 'application/vnd.google-apps.document' }, f.getId(), {}); Logger.log('3 copy+converter: OK ' + c.id); DriveApp.getFileById(c.id).setTrashed(true); f.setTrashed(true); }
  catch (e) { Logger.log('3 copy+converter: ERRO ' + det(e)); }
  try { var d = DocumentApp.create('vd_tmp_doc'); Logger.log('4 DocumentApp.create: OK ' + d.getId()); DriveApp.getFileById(d.getId()).setTrashed(true); }
  catch (e) { Logger.log('4 DocumentApp.create: ERRO ' + det(e)); }
  try { var m = Drive.About.get({ fields: 'user,storageQuota' }); Logger.log('5 about: ' + JSON.stringify(m).slice(0, 300)); }
  catch (e) { Logger.log('5 about: ERRO ' + det(e)); }
}
