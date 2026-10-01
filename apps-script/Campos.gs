/* ============================ CAMPOS PERSONALIZADOS ============================
 * O robô cria (se faltar) e preenche os campos do card a partir do pedido — o título continua
 * PLACA CARRO COR SEGURADORA, só para leitura visual; os campos são o dado organizado
 * (filtros, visão Tabela/Painel do Trello e, no futuro, a migração para o sistema interno).
 *   Unidade (lista) · Seguradora (lista, aprende opção nova) · Tipo (SEGURADORA / PARTICULAR / MISTO)
 *   Placa · Consultor · Total comprado (soma do PAGAS) · Nº Ordem (já usado no quadro; não é preenchido)
 * Atualiza depois de cada ação do formulário e quando o robô confere o card.
 * Preencher tudo de uma vez: cf_sincronizarTodos(). Desligar: CF_LIGADO = NAO.
 */
var CF = {
  CAMPOS: [
    { nome: 'Unidade', tipo: 'list', opcoes: ['TOLEDO', 'MARECHAL C. RONDON', 'CASCAVEL', 'CAMPO MOURÃO'] },
    { nome: 'Seguradora', tipo: 'list', opcoes: ['PARTICULAR'] },
    { nome: 'Tipo', tipo: 'list', opcoes: ['SEGURADORA', 'PARTICULAR', 'MISTO'] },
    { nome: 'Placa', tipo: 'text' },
    { nome: 'Consultor', tipo: 'text' },
    { nome: 'Total comprado', tipo: 'number' },
    { nome: 'Nº Ordem', tipo: 'text', naoPreencher: true }
  ]
};

function cf_ligado_() { return vd_prop_('CF_LIGADO', 'SIM') !== 'NAO'; }

/** Definições do quadro {nome: {id, tipo, opcoes:{TEXTO: idOpcao}}}, criando o que faltar. Cache 6 h. */
function cf_defs_(semCache) {
  var board = vd_board_(), cache = CacheService.getScriptCache(), k = 'cf_defs_' + board;
  if (!semCache) { try { var c = cache.get(k); if (c) return JSON.parse(c); } catch (e) {} }
  var b = vd_api_('/boards/' + board, { cru: true, query: { fields: 'id' } });
  var atuais = vd_api_('/boards/' + board + '/customFields', { cru: true }) || [];
  var defs = {};
  CF.CAMPOS.forEach(function (cfg, i) {
    var f = atuais.filter(function (x) { return String(x.name || '').trim().toUpperCase() === cfg.nome.toUpperCase(); })[0];
    if (!f) {
      var corpo = { idModel: b.id, modelType: 'board', name: cfg.nome, type: cfg.tipo, pos: 'bottom', display_cardFront: false };
      if (cfg.tipo === 'list') corpo.options = cfg.opcoes.map(function (o, j) { return { value: { text: o }, color: 'none', pos: j + 1 }; });
      f = vd_api_('/customFields', { method: 'post', payload: corpo });
    }
    var d = { id: f.id, tipo: f.type, opcoes: {} };
    (f.options || []).forEach(function (o) { d.opcoes[String((o.value && o.value.text) || '').toUpperCase()] = o.id; });
    defs[cfg.nome] = d;
  });
  try { cache.put(k, JSON.stringify(defs), 21600); } catch (e) {}
  return defs;
}

/** Id da opção (cria a opção se a lista ainda não tem). */
function cf_opcao_(defs, campo, texto) {
  var d = defs[campo]; texto = String(texto || '').trim().toUpperCase();
  if (!d || !texto) return '';
  if (d.opcoes[texto]) return d.opcoes[texto];
  var o = vd_api_('/customFields/' + d.id + '/options', { method: 'post', payload: { value: { text: texto }, color: 'none', pos: 'bottom' } });
  d.opcoes[texto] = o.id;
  try { CacheService.getScriptCache().remove('cf_defs_' + vd_board_()); } catch (e) {}
  return o.id;
}

/** Valores calculados do card. */
function cf_valores_(c) {
  var an = vd_analisar_(c.desc || '', c.name || '');
  var tipo = an.dados.tipo === 'PARTICULAR' ? 'PARTICULAR' : (an.pecas.some(function (p) { return p.particular; }) ? 'MISTO' : 'SEGURADORA');
  var seg = an.dados.tipo === 'PARTICULAR' ? 'PARTICULAR' : String(an.dados.seguradora || '').trim().toUpperCase();
  if (!seg) { var mt = (c.name || '').trim().split(/\s+/); var ult = mt[mt.length - 1]; if (VD_SEGURADORAS.some(function (s) { return s[0] === ult; })) seg = ult; }
  var total = 0, tem = false;
  (c.checklists || []).forEach(function (k) {
    if (!/^PAGAS/i.test(String(k.name || '').trim())) return;
    (k.checkItems || []).forEach(function (it) { var m = String(it.name).match(/R\$\s*([\d.]+(?:,\d{1,2})?)/); if (m) { total += vd_valorNum_(m[1]); tem = true; } });
  });
  var consultor = '';
  try { consultor = vd_criador_(c.id); } catch (e) {}
  return {
    'Unidade': ev_unidade_(c), 'Seguradora': seg, 'Tipo': an.pecas.length || an.dados.tipo ? tipo : '',
    'Placa': an.dados.placa || vd_placaDoTexto_(c.name || '') || '', 'Consultor': consultor ? '@' + consultor : '',
    'Total comprado': tem ? Math.round(total * 100) / 100 : ''
  };
}

/** Atualiza os campos de um card (só o que mudou). */
function cf_sincronizar_(cardId) {
  if (!cf_ligado_() || !vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  try {
    var c = vd_api_('/cards/' + cardId, { query: { fields: 'name,desc,labels,idBoard', checklists: 'all', checkItem_fields: 'name,state', customFieldItems: 'true' } });
    if (vdf_cardProtegido_(c.name || '') || /^\s*AVISO\b/i.test(c.name || '')) return 0;
    var defs = cf_defs_(), vals = cf_valores_(c), n = 0;
    var atual = {}; (c.customFieldItems || []).forEach(function (i) { atual[i.idCustomField] = i; });
    CF.CAMPOS.forEach(function (cfg) {
      if (cfg.naoPreencher) return;
      var d = defs[cfg.nome], v = vals[cfg.nome];
      if (!d || v === undefined) return;
      var it = atual[d.id], corpo = null;
      if (d.tipo === 'list') {
        var idO = v ? cf_opcao_(defs, cfg.nome, v) : '';
        if ((it && it.idValue) === (idO || undefined) || (!it && !idO)) return;
        corpo = idO ? { idValue: idO } : { idValue: '' };
      } else if (d.tipo === 'number') {
        var num = v === '' ? '' : String(v);
        if ((it && it.value && it.value.number) === num || (!it && num === '')) return;
        corpo = num === '' ? { value: '' } : { value: { number: num } };
      } else {
        if ((it && it.value && it.value.text) === v || (!it && !v)) return;
        corpo = v ? { value: { text: v } } : { value: '' };
      }
      vd_api_('/cards/' + c.id + '/customField/' + d.id + '/item', { method: 'put', payload: corpo });
      n++;
    });
    return n;
  } catch (e) { console.log('campos: ' + e); return 0; }
}

/** Roda na mão: cria os campos e preenche todos os cards do quadro. */
function cf_sincronizarTodos() {
  cf_defs_(true);
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { cru: true, query: { fields: 'name' } });
  var n = 0, fim = Date.now() + 5 * 60 * 1000;
  cards.forEach(function (c) { if (Date.now() < fim) n += cf_sincronizar_(c.id); });
  Logger.log('campos atualizados: ' + n + ' em ' + cards.length + ' card(s)');
}
