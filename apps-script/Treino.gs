/* ============================ TREINO DO LEITOR DE ORÇAMENTO (diretoria, 08/10/2026) ============================
 * Weslley: "usa os orçamentos dos cards do sistema antigo e arquivados pra ensinar o leitor para todos os casos".
 * Este módulo só COLETA: percorre todos os cards do quadro (abertos e arquivados), pega os PDFs que parecem orçamento,
 * extrai o texto (mesmo OCR do robô) e grava lotes JSON numa pasta do Drive compartilhada com a diretoria. O leitor é
 * ajustado fora, com esses textos como casos de teste. Não mexe em card nenhum.
 *
 * Uso pelo formulário (diretoria): chamar('vdf_treinoLeitor', TOKEN, {reiniciar:true}) na 1ª vez, depois
 * chamar('vdf_treinoLeitor', TOKEN, {}) até devolver fim:true. Cada chamada roda ~4,5 min.
 */
var TRN = {
  PASTA_NOME: 'Treino do leitor de orçamento',
  LIMITE_MS: 240 * 1000,
  MAX_BYTES: 8 * 1024 * 1024,
  POR_CARD: 3,
  TEXTO_MAX: 14000,
  LOTE: 40,
  COMPARTILHAR: ['weslley.santos@unitycs.com.br']
};

function tr_pasta_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('TR_PASTA');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var p = DriveApp.createFolder(TRN.PASTA_NOME);
  TRN.COMPARTILHAR.forEach(function (em) { try { p.addViewer(em); } catch (e) { console.log('treino/compartilhar: ' + e); } });
  props.setProperty('TR_PASTA', p.getId());
  return p;
}

/** PDF que parece orçamento (não nota, não comprovante, não Status do Pedido). */
function tr_candidato_(a) {
  if (!a || !a.isUpload) return false;
  var nome = String(a.name || '') + ' ' + String(a.fileName || '');
  if (!/pdf/i.test(a.mimeType || '') && !/\.pdf$/i.test(nome)) return false;
  if ((a.bytes || 0) > TRN.MAX_BYTES || !(a.bytes || 0)) return false;
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
      var ats = (c.attachments || []).filter(tr_candidato_).sort(function (x, y) { return String(x.date || '').localeCompare(String(y.date || '')); }).slice(0, TRN.POR_CARD);
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
  var passo = 'pasta';
  try {
  var pasta = tr_pasta_();
  var est = null;
  try { est = JSON.parse(props.getProperty('TR_ESTADO') || 'null'); } catch (e) {}
  if (!est || p.reiniciar) {
    var board = vd_board_();
    var lista = tr_listar_(board);
    passo = 'gravar lista (' + lista.length + ')';
    var arqLista = pasta.createFile(Utilities.newBlob(JSON.stringify(lista), 'application/json', 'treino_lista.json'));
    est = { lista: arqLista.getId(), total: lista.length, pos: 0, feitos: 0, erros: 0, lotes: [], loteN: 0 };
    props.setProperty('TR_ESTADO', JSON.stringify(est));
  }
  passo = 'ler lista';
  var lista = JSON.parse(DriveApp.getFileById(est.lista).getBlob().getDataAsString());
  var lote = [], n = 0;
  passo = 'anexos';
  while (est.pos < lista.length && Date.now() - t0 < TRN.LIMITE_MS && lote.length < TRN.LOTE) {
    var it = lista[est.pos];
    var reg = { card: it.card, nome: it.nome, fechado: it.fechado, shortLink: it.shortLink, att: it.att, anexo: it.anexo, arquivo: it.arquivo, bytes: it.bytes, data: it.data };
    try {
      var resp = qt_fetch_(it.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
      if (resp.getResponseCode() >= 300) throw new Error('Trello ' + resp.getResponseCode());
      var texto = vd_ocr_(resp.getBlob(), 'treino_' + it.att + '.pdf');
      reg.texto = String(texto || '').slice(0, TRN.TEXTO_MAX);
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
    passo = 'gravar lote ' + est.loteN;
    var arq = pasta.createFile(Utilities.newBlob(JSON.stringify(lote), 'application/json', 'treino_lote_' + ('00' + est.loteN).slice(-3) + '.json'));
    est.lotes.push(arq.getId());
  }
  passo = 'estado';
  props.setProperty('TR_ESTADO', JSON.stringify(est));
  return { ok: true, total: est.total, pos: est.pos, feitos: est.feitos, erros: est.erros, nesta: n, lotes: est.lotes, fim: est.pos >= lista.length, pasta: pasta.getUrl(), listaId: est.lista };
  } catch (e) { console.log('treino/' + passo + ': ' + e); return { ok: false, erro: String((e && e.message) || e), passo: passo }; }
}


/** Classe do anexo pelo nome do arquivo (para amostrar por layout). */
function tr_classe_(it) {
  var n = String(it.anexo || '') + ' ' + String(it.arquivo || '');
  if (/^📄 ORÇ/.test(String(it.anexo || ''))) return 'padronizado';
  if (/relatorio\d+/i.test(n)) return 'cilia-relatorio';
  if (/pdf_report/i.test(n)) return 'soma-pdfreport';
  if (/cilia/i.test(n)) return 'cilia';
  if (/websoma|soma/i.test(n)) return 'soma';
  if (/hdi/i.test(n)) return 'hdi';
  if (/or[çc]amento/i.test(n)) return 'orcamento';
  if (/sinistro|laudo|vistoria/i.test(n)) return 'sinistro';
  return 'outros';
}
function tr_estado_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('TR_ESTADO') || 'null'); } catch (e) { return null; } }
function tr_lista_(est) { return JSON.parse(DriveApp.getFileById(est.lista).getBlob().getDataAsString()); }

/** Resumo da lista de candidatos: quantos por classe × ano, abertos/arquivados, exemplos de nome por classe. */
function vdf_treinoResumo(token) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria.'] };
  var est = tr_estado_(); if (!est) return { ok: false, erro: 'sem lista' };
  var lista = tr_lista_(est), por = {}, fech = 0, ex = {};
  lista.forEach(function (it) {
    var c = tr_classe_(it), ano = String(it.data || '').slice(0, 4) || '?';
    por[c] = por[c] || {}; por[c][ano] = (por[c][ano] || 0) + 1;
    if (it.fechado) fech++;
    ex[c] = ex[c] || []; if (ex[c].length < 6 && ex[c].indexOf(it.arquivo) < 0) ex[c].push(it.arquivo);
  });
  return { ok: true, total: lista.length, fechados: fech, porClasse: por, exemplos: ex, pos: est.pos };
}

/** Troca a lista pela amostra: até p.n por (classe × ano), espalhados no tempo; p.classes limita as classes. Zera o progresso. */
function vdf_treinoAmostrar(token, p) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria.'] };
  p = p || {}; var n = +p.n || 40;
  var est = tr_estado_(); if (!est) return { ok: false, erro: 'sem lista' };
  var lista = tr_lista_(est), grupos = {};
  lista.forEach(function (it) {
    var c = tr_classe_(it); if (p.classes && p.classes.indexOf(c) < 0) return;
    var k = c + '|' + (String(it.data || '').slice(0, 4) || '?');
    (grupos[k] = grupos[k] || []).push(it);
  });
  var fora = [];
  Object.keys(grupos).forEach(function (k) {
    var g = grupos[k].sort(function (a, b) { return String(a.data).localeCompare(String(b.data)); });
    if (g.length <= n) { fora = fora.concat(g); return; }
    var passo = g.length / n;
    for (var i = 0; i < n; i++) fora.push(g[Math.floor(i * passo)]);
  });
  fora.sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });   // mais recentes primeiro
  var pasta = tr_pasta_();
  var arq = pasta.createFile(Utilities.newBlob(JSON.stringify(fora), 'application/json', 'treino_amostra.json'));
  est.lista = arq.getId(); est.total = fora.length; est.pos = 0; est.feitos = 0; est.erros = 0;
  PropertiesService.getScriptProperties().setProperty('TR_ESTADO', JSON.stringify(est));
  return { ok: true, total: fora.length, grupos: Object.keys(grupos).length };
}

/**
 * Avalia o leitor sobre os textos já coletados (sem OCR novo): roda vd_lerOrcamento_ em cada texto dos lotes e devolve
 * placar por classe + os casos suspeitos com um trecho do texto (a parte das peças), para ajustar o leitor fora daqui.
 * p = {lotes:[ids] (padrão: todos), maxCasos (padrão 15), classe (filtra), ano (filtra, ex.: 2026), trecho (chars, padrão 3500), pular (n casos)}
 */
function vdf_treinoAvaliar(token, p) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria.'] };
  p = p || {}; var est = tr_estado_(); if (!est) return { ok: false, erro: 'sem lista' };
  var ids = p.lotes || est.lotes, maxCasos = +p.maxCasos || 15, tam = +p.trecho || 3500, pular = +p.pular || 0;
  var placar = {}, casos = [], vistos = 0, total = 0;
  ids.forEach(function (id) {
    var lote; try { lote = JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString()); } catch (e) { return; }
    lote.forEach(function (reg) {
      if (!reg.texto) return;
      var cl = tr_classe_(reg); if (p.classe && cl !== p.classe) return;
      if (p.ano && String(reg.data || '').slice(0, 4) !== String(p.ano)) return;   // 08/10/2026, Weslley: só os de 2026 bastam
      total++;
      var r; try { r = vd_lerOrcamento_(reg.texto); } catch (e) { r = { origem: 'ERRO:' + e, oficina: [], fo: [] }; }
      var pz = placar[cl] = placar[cl] || { n: 0, origem: {}, semPeca: 0, suspeito: 0 };
      pz.n++; pz.origem[r.origem || '-'] = (pz.origem[r.origem || '-'] || 0) + 1;
      var itens = (r.oficina || []).concat(r.fo || []);
      var motivos = [];
      if (!itens.length) motivos.push('0 peças');
      itens.forEach(function (x) {
        var d = String(x.descricao || ''), c = String(x.codigo || '');
        if (!x.pneu && d.length < 4) motivos.push('desc curta: ' + d);   // CAPO (4) é normal
        if (/^(20\d\d|19\d\d)$/.test(c)) motivos.push('código=ano: ' + c);
        if (/\b(REPOSICAO|GENUIN[OA]|ORIGINAL|PARALEL[OA])\b/.test(d)) motivos.push('tipo na desc: ' + d.slice(0, 30));
        if (/\d{2}\/\d{2}\/\d{2}/.test(d)) motivos.push('data na desc: ' + d.slice(0, 30));
        if (/^(VAL|ATE|PRATA|PRETO|BRANCO)\b/.test(d)) motivos.push('desc estranha: ' + d.slice(0, 30));
      });
      var codigos = itens.map(function (x) { return x.codigo; }).filter(String);
      if (codigos.length !== codigos.filter(function (c, i) { return codigos.indexOf(c) === i; }).length) motivos.push('código repetido');
      if (!itens.length) pz.semPeca++;
      if (motivos.length) {
        pz.suspeito++;
        vistos++;
        if (vistos > pular && casos.length < maxCasos) {
          var U = vd_normTexto_(reg.texto), i = U.search(/PECAS|PEÇAS|FORNECIMENTO|DESCRICAO/);
          casos.push({ card: reg.nome, anexo: reg.anexo, arquivo: reg.arquivo, classe: cl, origem: r.origem, n: itens.length, motivos: motivos.slice(0, 6),
            itens: itens.slice(0, 8).map(function (x) { return (x.codigo || '-') + ' | ' + (x.descricao || '') + ' | ' + (x.dica || '') + ' | ' + (x.valorOrc || ''); }),
            trecho: U.slice(Math.max(0, i - 200), Math.max(0, i - 200) + tam) });
        }
      }
    });
  });
  return { ok: true, total: total, placar: placar, suspeitos: vistos, casos: casos };
}
