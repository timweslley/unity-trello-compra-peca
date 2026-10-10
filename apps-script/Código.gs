/**
 * LOG DE ALTERAÇÃO DE DESCRIÇÃO - TRELLO
 * Quadro: Compra de Peça (oH4TbTqb)
 *
 * A cada execução, procura descrições de cards alteradas desde a última
 * verificação e posta um comentário no próprio card dizendo quem alterou,
 * quando, e o que mudou (linhas removidas / adicionadas).
 */

// ————————————————————————————— CONFIGURAÇÃO —————————————————————————————

var BOARD_ID = 'oH4TbTqb';        // Quadro Compra de Peça
var JANELA_MINUTOS = 60;          // Na 1a execução, olha esta janela para trás
var MAX_LINHAS = 12;              // Máx. de linhas mostradas por bloco (de/para)
var MAX_CHARS_LINHA = 160;        // Corta linhas muito longas
var AGRUPAR_MINUTOS = 10;         // Edições da mesma pessoa no mesmo card dentro
                                  // deste intervalo viram um comentário só
var ATRASO_SEGUNDOS = 180;        // Só olha edições com mais de 3 min: dá tempo ao
                                  // formulário/robô registrar a gravação e à trava desfazer edição manual

// ———————————————————————————————————————————————————————————————————————

function props_() {
  return PropertiesService.getScriptProperties();
}

function cred_() {
  var p = props_();
  var key = p.getProperty('TRELLO_KEY');
  var token = p.getProperty('TRELLO_TOKEN');
  if (!key || !token) {
    throw new Error('Faltam TRELLO_KEY / TRELLO_TOKEN nas propriedades do script.');
  }
  return { key: key, token: token };
}

function api_(caminho, params, metodo, payload) {
  var c = cred_();
  params = params || {};
  params.key = c.key;
  params.token = c.token;
  var qs = Object.keys(params)
    .map(function (k) { return k + '=' + encodeURIComponent(params[k]); })
    .join('&');
  var url = 'https://api.trello.com/1' + caminho + '?' + qs;
  var opt = {
    method: metodo || 'get',
    muteHttpExceptions: true,
    contentType: 'application/json'
  };
  if (payload) opt.payload = JSON.stringify(payload);
  var r = qt_fetch_(url, opt);
  var code = r.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Trello ' + code + ': ' + r.getContentText().slice(0, 300));
  }
  var txt = r.getContentText();
  return txt ? JSON.parse(txt) : null;
}

var LOG_ATE_MS = 0;   // só a recuperação usa: processa até este instante

/**
 * Roda na mão: refaz o log a partir de uma data (ex.: período em que ficou sem comentar),
 * em janelas de 1 h para não perder nada (a API devolve no máximo 100 ações por vez).
 */
function logDescRecuperar() {
  var inicio = new Date('2026-10-01T03:10:00Z').getTime(), fim = Date.now() - ATRASO_SEGUNDOS * 1000;
  var p = props_();
  p.setProperty('LOG_RECUPERANDO', String(Date.now()));   // o acionador espera enquanto isso
  try {
  for (var t = inicio; t < fim; t += 3600000) {
    p.setProperty('ULTIMA_VERIFICACAO', new Date(t).toISOString());
    LOG_ATE_MS = Math.min(t + 3600000, fim);
    verificarAlteracoesDescricaoNucleo_();
  }
  } finally { p.deleteProperty('LOG_RECUPERANDO'); }
  LOG_ATE_MS = 0;
  p.setProperty('ULTIMA_VERIFICACAO', new Date(fim).toISOString());
  Logger.log('log de descrição recuperado de ' + new Date(inicio).toISOString() + ' até agora');
}

/** Função principal - é esta que o acionador chama. */
function verificarAlteracoesDescricaoNucleo_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;

  try {
    var p = props_();
    var rec = +(p.getProperty('LOG_RECUPERANDO') || 0);
    if (!LOG_ATE_MS && rec && Date.now() - rec < 10 * 60000) return;   // recuperação rodando
    var desde = p.getProperty('ULTIMA_VERIFICACAO');
    if (!desde) {
      desde = new Date(Date.now() - JANELA_MINUTOS * 60000).toISOString();
    }
    // edições dos últimos 3 min ficam para a próxima rodada (ver ATRASO_SEGUNDOS)
    var limite = LOG_ATE_MS || (Date.now() - ATRASO_SEGUNDOS * 1000);
    if (new Date(desde).getTime() >= limite) return;
    var agora = new Date(limite).toISOString();

    var acoes = api_('/boards/' + BOARD_ID + '/actions', {
      filter: 'updateCard:desc',
      since: desde,
      limit: 100,
      memberCreator_fields: 'fullName,username'
    });

    if (!acoes || !acoes.length) {
      p.setProperty('ULTIMA_VERIFICACAO', agora);
      return;
    }

    acoes = acoes.filter(function (a) { return new Date(a.date).getTime() < limite; });
    acoes.reverse();

    var grupos = [], ignoradas = 0;
    acoes.forEach(function (a) {
      if (!a.data || !a.data.card) return;
      var cardId = a.data.card.id;
      // gravação do formulário/robô (vitrine, trava) não é edição de pessoa: não entra no log
      // e fecha os grupos abertos desse card, para não misturar antes/depois da gravação
      if (ehGravacaoDoRobo_(cardId, a.data.card.desc)) {
        ignoradas++;
        var sigRobo = sigTexto_(a.data.card.desc);
        grupos.forEach(function (x) {
          if (x.cardId !== cardId || x.fechado) return;
          x.fechado = true;
          // o robô voltou o texto ao que era antes da edição = a trava desfez (ela já avisou no card)
          if (sigTexto_(x.antigo) === sigRobo) x.desfeita = true;
        });
        return;
      }
      var autor = (a.memberCreator && a.memberCreator.fullName) || 'Alguem';
      var t = new Date(a.date).getTime();

      var g = grupos.filter(function (x) {
        return x.cardId === cardId && x.autor === autor && !x.fechado &&
               (t - x.fim) <= AGRUPAR_MINUTOS * 60000;
      })[0];

      if (g) {
        g.fim = t;
        g.novo = a.data.card.desc || '';
        g.dataFim = a.date;
      } else {
        grupos.push({
          cardId: cardId,
          cardNome: a.data.card.name || '',
          autor: autor,
          antigo: (a.data.old && typeof a.data.old.desc === 'string') ? a.data.old.desc : '',
          novo: a.data.card.desc || '',
          fim: t,
          dataFim: a.date
        });
      }
    });

    // quadro principal (oH4TbTqb): o log de descrição SEMPRE comenta (lá não há trava de descrição).
    // Só um quadro com trava (o de TESTE do formulário) dispensa o comentário — e este log não vigia ele.
    grupos.forEach(function (g) {
      if (g.desfeita || sigTexto_(g.antigo) === sigTexto_(g.novo)) return;
      var texto = montarComentario_(g);
      if (!texto) return;
      try {
        api_('/cards/' + g.cardId + '/actions/comments', { text: texto }, 'post');
      } catch (e) {
        console.error('Falha ao comentar no card ' + g.cardNome + ': ' + e.message);
      }
    });

    if (ignoradas) console.log('log: ' + ignoradas + ' gravação(ões) do formulário/robô ignorada(s)');
    p.setProperty('ULTIMA_VERIFICACAO', agora);
  } finally {
    lock.releaseLock();
  }
}

/** A trava (Validacao.gs) guarda as assinaturas que o robô/formulário gravou. */
function ehGravacaoDoRobo_(cardId, desc) {
  if (typeof desc !== 'string') return false;
  try { return typeof tr_ehOficial_ === 'function' && tr_ehOficial_(cardId, desc); } catch (e) { return false; }
}

function normalizar_(s) {
  return (s || '').replace(/\r/g, '').replace(/[ \t]+$/gm, '').trim();
}

/** Assinatura de conteúdo: ignora formatação, pontuação de marcação,
 *  espaços repetidos, caixa alta/baixa e caracteres invisíveis. */
function sigLinha_(l) {
  l = (l || '').replace(/[\u200B-\u200D\uFEFF\u2060\u00A0]/g, ' ');
  if (/^[\s\-=_*~+.\u2013\u2014\u2022]*$/.test(l)) return '';
  return l
    .replace(/[*_~`#>|]/g, '')
    .replace(/^\s*(?:[-\u2013\u2014+\u2022]\s+|\d+[.)]\s+)/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sigTexto_(s) {
  return normalizar_(s).split('\n').map(sigLinha_)
    .filter(function (x) { return x; }).join('\n');
}

function montarComentario_(g) {
  var antigas = normalizar_(g.antigo).split('\n');
  var novas = normalizar_(g.novo).split('\n');

  var contaAntigas = {}, contaNovas = {};
  antigas.forEach(function (l) {
    var s = sigLinha_(l); if (!s) return;
    contaAntigas[s] = (contaAntigas[s] || 0) + 1;
  });
  novas.forEach(function (l) {
    var s = sigLinha_(l); if (!s) return;
    contaNovas[s] = (contaNovas[s] || 0) + 1;
  });

  var restaNovas = JSON.parse(JSON.stringify(contaNovas));
  var removidas = antigas.filter(function (l) {
    var s = sigLinha_(l); if (!s) return false;
    if (restaNovas[s]) { restaNovas[s]--; return false; }
    return true;
  });

  var restaAntigas = JSON.parse(JSON.stringify(contaAntigas));
  var adicionadas = novas.filter(function (l) {
    var s = sigLinha_(l); if (!s) return false;
    if (restaAntigas[s]) { restaAntigas[s]--; return false; }
    return true;
  });

  if (!removidas.length && !adicionadas.length) return null;

  var quando = Utilities.formatDate(
    new Date(g.dataFim), 'America/Sao_Paulo', "dd/MM/yyyy 'às' HH:mm"
  );

  var txt = '✏️ **' + g.autor + '** alterou a descrição em ' + quando + '\n';
  if (!sigTexto_(g.antigo)) txt += '\n_(descrição estava vazia)_\n';

  txt += bloco_('❌ Removido', removidas);
  txt += bloco_('✅ Adicionado', adicionadas);

  return txt.slice(0, 4000);
}

function seguro_(l) {
  l = (l || '').replace(/[\u200B-\u200D\uFEFF\u2060]/g, '');
  if (/^\s*([-=_*~+.]\s*){3,}$/.test(l)) return '───';
  return l;
}

function bloco_(titulo, linhas) {
  var uteis = linhas.map(seguro_).filter(function (l) { return l.trim(); });
  if (!uteis.length) return '';
  var mostradas = uteis.slice(0, MAX_LINHAS).map(function (l) {
    l = l.length > MAX_CHARS_LINHA ? l.slice(0, MAX_CHARS_LINHA) + '…' : l;
    return '> ' + l;
  });
  var extra = uteis.length > MAX_LINHAS
    ? '\n> _(+ ' + (uteis.length - MAX_LINHAS) + ' linha(s))_'
    : '';
  return '\n**' + titulo + ':**\n' + mostradas.join('\n') + extra + '\n';
}

// ————————————————————— UTILITARIOS DE INSTALACAO —————————————————————

/** Roda UMA vez para criar o acionador de 1 em 1 minuto. */
function instalarAcionador() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'verificarAlteracoesDescricao') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('verificarAlteracoesDescricao')
    .timeBased().everyMinutes(1).create();
  console.log('Acionador criado: a cada 1 minuto.');
}

/** Testa a conexão sem postar nada. */
function testarConexao() {
  var b = api_('/boards/' + BOARD_ID, { fields: 'name' });
  console.log('Conectado ao quadro: ' + b.name);
  var a = api_('/boards/' + BOARD_ID + '/actions', {
    filter: 'updateCard:desc', limit: 3, memberCreator_fields: 'fullName'
  });
  a.forEach(function (x) {
    console.log(x.date + ' - ' + (x.memberCreator ? x.memberCreator.fullName : '?') +
                ' - ' + (x.data.card ? x.data.card.name : '?'));
  });
}

/** Zera o marcador (a proxima execução volta a olhar JANELA_MINUTOS atras). */
function zerarMarcador() {
  props_().deleteProperty('ULTIMA_VERIFICACAO');
  console.log('Marcador zerado.');
}

// ————————————— ROTINA DIÁRIA DE COBRANÇA (parados / faturamento / prazos) —————————————

var LISTAS_PARADO = ['PENDÊNCIA DE FATURAMENTO', 'PENDÊNCIA TRATADA - FATURAR'];
var DIAS_PARADO = 7;
var LISTA_ENTREGUES = 'ENTREGUES';
var DIAS_ENTREGUES = 5;
var LISTA_FALTA_CHEGAR = 'FALTA CHEGAR';
var LISTA_ENCERRADO = 'ENCERRADO COMPRAS/FORNEC.';
var DIAS_ENCERRADO = 15;
var LBL_PARADO = 'PARADO';
var LBL_CONFERIR = 'CONFERIR FATURAMENTO';
var MENCAO = '@financeirounity @christianfarias23';   // só reserva: a menção vem de FAT_USUARIOS (mencaoFat_, 10/10/2026)
function mencaoFat_() { try { return fat_usuarios_().filter(function (u) { return u !== 'timweslley' || vd_board_() === VD.BOARD_PADRAO; }).map(function (u) { return '@' + u; }).join(' ') || MENCAO; } catch (e) { return MENCAO; } }

function rotinaDiariaNucleo_() {
  var listas = api_('/boards/' + BOARD_ID + '/lists', { fields: 'name' });
  var porNome = {}; listas.forEach(function (l) { porNome[l.name] = l.id; });
  var labels = api_('/boards/' + BOARD_ID + '/labels', { fields: 'name,color', limit: 100 });
  function labelId(nome, cor) {
    var l = labels.filter(function (x) { return x.name === nome; })[0];
    if (l) return l.id;
    var criado = api_('/boards/' + BOARD_ID + '/labels', { name: nome, color: cor }, 'post');
    labels.push(criado); return criado.id;
  }
  var idParado = labelId(LBL_PARADO, 'red');
  var idConferir = labelId(LBL_CONFERIR, 'yellow');

  var cards = api_('/boards/' + BOARD_ID + '/cards', { fields: 'name,idList,dateLastActivity,idLabels,due' });
  var agora = Date.now();
  var alvo1 = LISTAS_PARADO.map(function (n) { return porNome[n]; });
  var idEnt = porNome[LISTA_ENTREGUES];
  var nParado = 0, nConf = 0, nLimpa = 0;

  cards.forEach(function (c) {
    var dias = (agora - new Date(c.dateLastActivity).getTime()) / 864e5;
    var temParado = c.idLabels.indexOf(idParado) > -1;
    var temConferir = c.idLabels.indexOf(idConferir) > -1;

    if (alvo1.indexOf(c.idList) > -1) {
      if (dias > DIAS_PARADO && !temParado) {
        api_('/cards/' + c.id + '/idLabels', { value: idParado }, 'post');
        api_('/cards/' + c.id + '/actions/comments', { text: '🔴 ' + mencaoFat_() + ' card parado há mais de ' + DIAS_PARADO + ' dias nesta coluna — verificar faturamento.' }, 'post');
        nParado++;
      }
    } else if (temParado) {
      api_('/cards/' + c.id + '/idLabels/' + idParado, {}, 'delete'); nLimpa++;
    }

    // 10/10/2026 (revisão): só a etiqueta CONFERIR FATURAMENTO; o comentário de cobrança saía em dobro com o SLA de
    // ENTREGUES (Fluxo.gs), que agora tem o resumo diário — este bloco não comenta mais
    if (c.idList === idEnt) {
      if (dias > DIAS_ENTREGUES && !temConferir) {
        api_('/cards/' + c.id + '/idLabels', { value: idConferir }, 'post');
        nConf++;
      }
    } else if (temConferir) {
      api_('/cards/' + c.id + '/idLabels/' + idConferir, {}, 'delete'); nLimpa++;
    }
  });

  // 10/10/2026: o prazo do card é do pz_executar_ (Validacao.gs); esta rotina antiga calculava com outra regra (lia datas de
  // comentários) e brigava com ela — desligada (ligar de novo: propriedade ROT_PRAZOS_ANTIGOS = SIM)
  var nPrazo = vd_prop_('ROT_PRAZOS_ANTIGOS', 'NAO') === 'SIM' ? atualizarPrazos_(porNome[LISTA_FALTA_CHEGAR]) : 0;
  var nMov = moverEncerrados_(porNome[LISTA_ENCERRADO], idEnt, porNome[LISTA_FALTA_CHEGAR]);
  console.log('parado: ' + nParado + ' | conferir faturamento: ' + nConf + ' | etiquetas removidas: ' + nLimpa + ' | prazos definidos: ' + nPrazo + ' | movidos de encerrado: ' + nMov);
}

/** Define o prazo do card como a maior previsão das peças.
 *  Fonte principal: data de entrega dos itens do checklist (peças pendentes).
 *  Reserva: datas de previsão citadas na descrição/comentários. */
function atualizarPrazos_(idLista) {
  if (!idLista) return 0;
  var cards = api_('/lists/' + idLista + '/cards', { fields: 'name,desc,due', checklists: 'all', checkItem_fields: 'state,due' });
  var n = 0;
  cards.forEach(function (c) {
    var melhor = null;
    var todosItens = [];
    (c.checklists || []).forEach(function (ck) {
      (ck.checkItems || []).forEach(function (it) { if (it.due) todosItens.push(it); });
    });
    // 1) maior previsão entre as peças que AINDA NÃO chegaram
    todosItens.forEach(function (it) {
      if (it.state === 'complete') return;
      var dt = new Date(it.due);
      if (!melhor || dt > melhor) melhor = dt;
    });
    // 2) se todas chegaram (ou nenhuma pendente tem data), maior previsão geral
    if (!melhor) todosItens.forEach(function (it) {
      var dt = new Date(it.due);
      if (!melhor || dt > melhor) melhor = dt;
    });
    // 3) reserva: previsão citada em texto
    if (!melhor) {
      var acs = api_('/cards/' + c.id + '/actions', { filter: 'commentCard', limit: 20 });
      var texto = (c.desc || '') + '\n' + acs.map(function (a) { return (a.data && a.data.text) || ''; }).join('\n');
      var rx = /(previs|prazo|chega|entreg)[^\n]{0,40}?([0-3]?\d)\/([01]?\d)(?:\/(\d{2,4}))?/gi;
      var mm;
      while ((mm = rx.exec(texto)) !== null) {
        var d = +mm[2], mes = +mm[3], ano = mm[4] ? +mm[4] : new Date().getFullYear();
        if (ano < 100) ano += 2000;
        var dt2 = new Date(ano, mes - 1, d, 12, 0, 0);
        if (isNaN(dt2.getTime())) continue;
        if (dt2.getTime() < new Date(2026, 0, 1).getTime()) continue;
        if (dt2.getTime() > Date.now() + 120 * 864e5) continue;
        if (!melhor || dt2 > melhor) melhor = dt2;
      }
    }
    if (melhor) {
      var atual = c.due ? new Date(c.due).getTime() : 0;
      if (Math.abs(atual - melhor.getTime()) > 43200000) {
        api_('/cards/' + c.id, { due: melhor.toISOString() }, 'put');
        n++;
      }
    }
  });
  return n;
}

/** Roda UMA vez para criar o acionador diário (de manhã). */
function instalarRotinaDiaria() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'rotinaDiaria') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('rotinaDiaria').timeBased().everyDays(1).atHour(7).create();
  console.log('Rotina diária instalada.');
}


/** Card há mais de DIAS_ENCERRADO dias em ENCERRADO:
 *  checklists completos -> ENTREGUES; item pendente -> volta para FALTA CHEGAR. */
function moverEncerrados_(idEnc, idEntregues, idFaltaChegar) {
  if (!idEnc || !idEntregues || !idFaltaChegar) return 0;
  var cards = api_('/lists/' + idEnc + '/cards', { fields: 'name', checklists: 'all', checkItem_fields: 'state' });
  var n = 0;
  cards.forEach(function (c) {
    var acs = api_('/cards/' + c.id + '/actions', { filter: 'updateCard:idList', limit: 50 });
    var entrada = null;
    for (var i = 0; i < acs.length; i++) {
      var a = acs[i];
      if (a.data && a.data.listAfter && a.data.listAfter.id === idEnc) { entrada = new Date(a.date).getTime(); break; }
    }
    if (!entrada) entrada = 1000 * parseInt(c.id.substring(0, 8), 16);
    var dias = (Date.now() - entrada) / 864e5;
    if (dias <= DIAS_ENCERRADO) return;
    var pendentes = 0;
    (c.checklists || []).forEach(function (ck) {
      (ck.checkItems || []).forEach(function (it) { if (it.state !== 'complete') pendentes++; });
    });
    if (pendentes > 0) {
      try { if (typeof st_permitir_ === 'function') st_permitir_(c.id, idFaltaChegar); } catch (e) {}
      api_('/cards/' + c.id, { idList: idFaltaChegar, pos: 'top' }, 'put');
      api_('/cards/' + c.id + '/actions/comments', { text: 'Movido automaticamente para FALTA CHEGAR: mais de ' + DIAS_ENCERRADO + ' dias em ENCERRADO com ' + pendentes + ' item(ns) de checklist pendente(s).' }, 'post');
    } else {
      try { if (typeof st_permitir_ === 'function') st_permitir_(c.id, idEntregues); } catch (e) {}
      api_('/cards/' + c.id, { idList: idEntregues, pos: 'top' }, 'put');
    }
    n++;
  });
  return n;
}

// ————————————————————— ALARME DE FALHA —————————————————————

var EMAIL_ALERTA = 'weslley.santos@unitycs.com.br';
var LIMITE_FALHAS = 2;

function comAlarme_(nome, fn) {
  var p = props_();
  var chave = 'FALHAS_' + nome;
  if (nome !== 'validarDadosPedido' && qt_pausada_()) { console.log(nome + ' pulado: ' + qt_resumoPausa_()); return; }   // cota estourada
  try {
    qt_parte_(nome);
    fn();
    if (p.getProperty(chave)) { p.deleteProperty(chave); p.deleteProperty('FALHAS_T_' + nome); }
  } catch (e) {
    if (qt_ehErroDeCota_(e)) { console.log(nome + ': ' + String((e && e.message) || e).slice(0, 120)); return; }   // o aviso de cota já cobre
    var n = Number(p.getProperty(chave) || 0) + 1;
    p.setProperty(chave, String(n));
    p.setProperty('FALHAS_T_' + nome, String(Date.now()));   // quando foi a última falha (o relatório diário só cita as das últimas 24 h)
    // 1 e-mail na 2ª falha seguida (no máximo um a cada 6 h por rotina) e de novo a cada 200
    var kAv = 'FALHAS_AV_' + nome, av = +(p.getProperty(kAv) || 0);
    var avisar = (n >= LIMITE_FALHAS && Date.now() - av > 6 * 3600 * 1000) || n % 200 === 0;
    if (avisar) {
      p.setProperty(kAv, String(Date.now()));
      MailApp.sendEmail(EMAIL_ALERTA,
        'ALERTA: automação do Trello com falha (' + nome + ')',
        'A rotina "' + nome + '" do projeto Log de Descricao Trello falhou ' + n +
        ' vez(es) seguida(s) e pode ter parado de funcionar.\n\n' +
        'Último erro:\n' + (e && e.message ? e.message : e) + '\n\n' +
        'Causas comuns: token do Trello revogado, chave removida das propriedades, ou instabilidade do Trello.\n' +
        'Ver execuções: https://script.google.com/home/projects/1sV_VMM5fUPxBmaExaWHAYdaw4Xda9-ebtKr2BD2iwabG4hxLodE50W6c/executions');
    }
    throw e;
  } finally { qt_parte_(''); try { qt_registrar_(nome); } catch (x) {} }
}

function verificarAlteracoesDescricao() {
  comAlarme_('log de descrição', verificarAlteracoesDescricaoNucleo_);
}

function rotinaDiaria() {
  comAlarme_('rotina diária', rotinaDiariaNucleo_);
}

/** Envia um e-mail de teste para conferir o alarme. */
function testarAlarme() {
  MailApp.sendEmail(EMAIL_ALERTA, 'Teste do alarme - automação Trello',
    'Este é um teste do alarme de falha das automações do quadro Compra de Peça. Se você recebeu este e-mail, o alarme está funcionando.');
  console.log('E-mail de teste enviado para ' + EMAIL_ALERTA);
}
