/* ============================ PROTEÇÕES DAS GRAVAÇÕES DO FORMULÁRIO ============================
 * Chamado no começo de toda função vdf_* que grava (formulário estático, link antigo e API):
 *  - texto do usuário vira UMA linha (quebra de linha não forja linha AUTORIZADO:/COMPRADO: na descrição);
 *  - shortLink só no formato do Trello e o card precisa ser do quadro em uso;
 *  - uma gravação por vez (trava do usuário do script: o formulário roda como o dono) —
 *    duas pessoas salvando o mesmo card ao mesmo tempo não apagam a linha uma da outra;
 *  - anexos: só arquivos que o próprio formulário subiu na pasta temporária.
 */
var SG = { LOCK_MS: 25000 };
var SG_TRAVADO = false;   // já segura a trava nesta execução (testes chamam várias vdf_ seguidas)

function vdf_limparTexto_(s) {
  return String(s).replace(/[\r\n\u2028\u2029]+/g, ' / ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\s{2,}/g, ' ');
}
function vdf_limparObj_(o, prof) {
  if (prof > 6 || o === null || o === undefined) return o;
  if (typeof o === 'string') return vdf_limparTexto_(o);
  if (Array.isArray(o)) return o.map(function (x) { return vdf_limparObj_(x, prof + 1); });
  if (typeof o === 'object') { Object.keys(o).forEach(function (k) { if (k !== 'base64') o[k] = vdf_limparObj_(o[k], prof + 1); }); }
  return o;
}

/** Retorna p limpo; erro se o card não for do quadro. Segura a trava até o fim da execução. */
function vdf_entrada_(p) {
  p = vdf_limparObj_(p || {}, 0);
  if (p.shortLink) {
    if (!/^[A-Za-z0-9]{6,24}$/.test(String(p.shortLink))) throw new Error('Card inválido.');
    var c = vd_api_('/cards/' + p.shortLink, { cru: true, query: { fields: 'idBoard' } });
    var b = vd_api_('/boards/' + vd_board_(), { cru: true, query: { fields: 'id' } });
    if (c.idBoard !== b.id) throw new Error('Este card não é do quadro do formulário.');
  }
  if (!SG_TRAVADO) {
    try { LockService.getUserLock().waitLock(SG.LOCK_MS); SG_TRAVADO = true; }
    catch (e) { throw new Error('Outra gravação ainda está em andamento. Espere alguns segundos e envie de novo.'); }
  }
  return p;
}

/** Só arquivo da pasta temporária do formulário (subido por vdf_subirArquivo). */
function vdf_arquivoTemp_(fid) {
  var f = DriveApp.getFileById(String(fid || ''));
  var pasta = vdf_pastaTemp_().getId(), it = f.getParents();
  while (it.hasNext()) if (it.next().getId() === pasta) return f;
  throw new Error('arquivo fora da pasta do formulário: ' + fid);
}

/** Planilha: texto que começa com = + - @ não vira fórmula. */
function sg_celula_(v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }

/* ---------- marcadores por quadro (CK_DESDE, CP_DESDE, ST_ULTIMA, EXC_ULTIMA) ----------
 * Na virada para o quadro principal cada quadro começa do zero, sem herdar a posição do outro.
 * O TESTE aproveita o valor antigo (sem sufixo) na primeira leitura. */
function vd_marca_(nome) {
  var p = PropertiesService.getScriptProperties(), b = vd_board_(), k = nome + '_' + b, v = p.getProperty(k);
  if (v === null && b === VD.BOARD_PADRAO) { v = p.getProperty(nome); if (v !== null) p.setProperty(k, v); }
  return v;
}
function vd_marcaSet_(nome, v) { PropertiesService.getScriptProperties().setProperty(nome + '_' + vd_board_(), String(v)); }

/* ---------- cards antigos (anteriores à virada) ----------
 * Card criado antes da virada e nunca salvo pelo formulário termina do jeito antigo: o robô não organiza,
 * não trava coluna/checklist/descrição, não cobra SLA nem põe ATRASADO/links. Salvou pelo formulário uma vez
 * (tem a descrição oficial na aba TRAVA) -> passa a seguir o fluxo novo.
 * A data da virada é por quadro (VD_VIRADA_EM_<quadro>), gravada na primeira vez que o robô roda nele. */
function vd_viradaMs_() {
  var p = PropertiesService.getScriptProperties(), k = 'VD_VIRADA_EM_' + vd_board_(), v = p.getProperty(k);
  if (!v) { v = String(Date.now()); p.setProperty(k, v); }
  return +v;
}
function vd_legado_(cardId) {
  cardId = String(cardId || '');
  if (!/^[0-9a-f]{24}$/.test(cardId)) return false;
  if (parseInt(cardId.slice(0, 8), 16) * 1000 >= vd_viradaMs_()) return false;
  var cmp = vd_completasTodas_()[cardId];
  return !cmp;
}

/** VIRADA: sistema passa do quadro TESTE para o principal (oH4TbTqb). Rodar na mão, uma vez.
 *  Espera o ciclo em andamento, troca VD_BOARD, desliga o espelho e marca a data da virada
 *  (cards do principal criados antes disso seguem o jeito antigo). Voltar ao TESTE: apagar VD_BOARD. */
function vd_virarParaPrincipal() {
  var lock = LockService.getScriptLock();
  lock.waitLock(5 * 60 * 1000);
  try {
    var p = PropertiesService.getScriptProperties();
    p.setProperty('VD_BOARD', 'oH4TbTqb');
    try { es_desligar(); } catch (e) { Logger.log('espelho: ' + e); }
    Logger.log('quadro em uso: ' + vd_board_() + ' · virada em ' + new Date(vd_viradaMs_()));
  } finally { lock.releaseLock(); }
}
