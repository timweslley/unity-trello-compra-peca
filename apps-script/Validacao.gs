/**
 * VALIDAÇÃO DE DADOS DO PEDIDO DE PEÇA
 * Confere se a descrição do card tem os dados completos:
 *   carro: MODELO, ANO, CHASSI, PLACA (MOTOR/VERSÃO é opcional)
 *   peças: CÓDIGO | DESCRIÇÃO | TIPO (GENUÍNO, ORIGINAL, PARALELO, USADO — máx. 2)
 *   pneu:  PNEU | MEDIDA | CATEGORIA (IMPORTADO / 1ª LINHA) ou MARCA
 * Incompleto  -> move para FALTA DADOS PARA COTAR + comentário marcando quem criou.
 * Completo    -> volta para EM COTAÇÃO.
 * Sem chassi/modelo/ano -> tenta ler dos anexos (PDF/foto) e preencher.
 *
 * Tudo aqui usa o prefixo vd_ para não misturar com as rotinas antigas.
 * Configuração pelas Propriedades do script (com padrão abaixo):
 *   VD_BOARD   quadro alvo           (padrão: quadro de TESTE ZX4gRmnX)
 *   VD_MODO    ATIVO | OBSERVAR       (OBSERVAR = só relatório, não mexe em nada)
 *   VD_LIGADO  SIM | NAO             (chave liga/desliga)
 */

var VD = {
  BOARD_PADRAO: 'ZX4gRmnX',
  LISTA_COTACAO: 'EM COTAÇÃO',
  LISTA_FALTA: 'FALTA DADOS PARA COTAR',
  TIPOS: ['GENUÍNO', 'ORIGINAL', 'PARALELO', 'USADO'],
  CATEG_PNEU: ['IMPORTADO', '1ª LINHA'],
  MARCADOR: '=== COTAÇÃO (compras) ===',
  LIMITE_MS: 4.5 * 60 * 1000,
  MAX_ANEXOS_CARD: 6,
  MAX_BYTES_ANEXO: 15 * 1024 * 1024,
  // formulário estático no GitHub Pages (abre em <1 s; chama o web app por fetch). O link
  // antigo do web app (…/exec) continua funcionando; a propriedade VD_URL_FORM sobrepõe.
  URL_FORM: 'https://timweslley.github.io/unity-trello-compra-peca/powerup/formulario.html',
  URL_FORM_ANTIGA: 'https://script.google.com/macros/s/AKfycbwkTI6PgPTe8OgIcyxzk5oysMvK2BvWwIQEdh5vhOY2n44KlVJvmeHdXTU1HQ3I5BoQew/exec',
  // colunas onde vale a regra de peça nova (todas depois de EM COTAÇÃO)
  LISTAS_FORA: ['ESPERA/NÃO AUTORIZADO', 'EM COTAÇÃO', 'FALTA DADOS PARA COTAR']
};

/* ============================ CONFIG ============================ */

function vd_prop_(k, padrao) {
  var v = PropertiesService.getScriptProperties().getProperty(k);
  return (v === null || v === '') ? padrao : v;
}
function vd_board_() { return vd_prop_('VD_BOARD', VD.BOARD_PADRAO); }
function vd_modo_() { return vd_prop_('VD_MODO', 'ATIVO'); }
function vd_ligado_() { return vd_prop_('VD_LIGADO', 'SIM') !== 'NAO'; }

function vd_ligar() { PropertiesService.getScriptProperties().setProperty('VD_LIGADO', 'SIM'); }
function vd_desligar() { PropertiesService.getScriptProperties().setProperty('VD_LIGADO', 'NAO'); }
function vd_modoObservar() { PropertiesService.getScriptProperties().setProperty('VD_MODO', 'OBSERVAR'); }
function vd_modoAtivo() { PropertiesService.getScriptProperties().setProperty('VD_MODO', 'ATIVO'); }

/* ============================ TRELLO ============================ */

function vd_cred_() {
  var p = PropertiesService.getScriptProperties();
  return { key: p.getProperty('TRELLO_KEY'), token: p.getProperty('TRELLO_TOKEN') };
}

function vd_auth_(tokenUsuario) {
  var c = vd_cred_();
  return 'OAuth oauth_consumer_key="' + c.key + '", oauth_token="' + (tokenUsuario || c.token) + '"';
}

/** Chamada à API do Trello. opts: {method, query, payload, multipart}. tokenUsuario opcional. */
function vd_api_(caminho, opts, tokenUsuario) {
  opts = opts || {};
  var url = 'https://api.trello.com/1' + caminho;
  var q = opts.query || {};
  var qs = Object.keys(q).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(q[k]);
  }).join('&');
  if (qs) url += (url.indexOf('?') < 0 ? '?' : '&') + qs;
  var params = {
    method: opts.method || 'get',
    muteHttpExceptions: true,
    headers: { Authorization: vd_auth_(tokenUsuario) }
  };
  if (opts.multipart) {
    params.payload = opts.multipart;
  } else if (opts.payload) {
    if (params.method === 'post' && /\/actions\/comments/.test(caminho) && opts.payload.text) { try { opts.payload.text = es_filtrarMencoes_(opts.payload.text); } catch (e) {} }
    params.contentType = 'application/json';
    params.payload = JSON.stringify(opts.payload);
  }
  // escrita em checklist: licença ANTES (o ciclo da trava pode ler entre a escrita e a resposta) e de novo depois
  var ehCk = params.method !== 'get' && !opts.semLicenca && /checkItem|checklists/i.test(caminho);
  if (ehCk) { try { ck_licenca_(caminho.split('?')[0], opts.payload); } catch (e) {} }
  var r = qt_fetch_(url, params);
  var code = r.getResponseCode();
  if (code >= 300) {
    var e = new Error('Trello ' + code + ' em ' + caminho.split('?')[0] + ': ' + r.getContentText().slice(0, 200));
    e.codigo = code;
    throw e;
  }
  // escrita oficial em checklist: licença para a trava de checklist não desfazer
  if (params.method !== 'get' && !opts.semLicenca && /checkItem|checklists/i.test(caminho)) { try { ck_licenca_(caminho.split('?')[0], opts.payload); } catch (e) {} }
  var t = r.getContentText();
  var out = t ? JSON.parse(t) : null;
  if (params.method === 'get' && !opts.cru && t && t.indexOf('"desc"') >= 0) {
    try { out = vd_trocarPelaCompleta_(out); } catch (e) { console.log('vitrine/troca: ' + e); }
  }
  return out;
}

function vd_listas_(board) {
  // cache de 10 min: todo módulo do ciclo pedia as listas de novo (12+ chamadas por minuto só nisso)
  var cache = null, k = 'vd_listas_' + board;
  try { cache = CacheService.getScriptCache(); var c = cache.get(k); if (c) return JSON.parse(c); } catch (e) {}
  var ls = vd_api_('/boards/' + board + '/lists', { query: { fields: 'name' } });
  var m = {};
  ls.forEach(function (l) { m[vd_nomeColuna_(l.name)] = l.id; });
  try { if (cache) cache.put(k, JSON.stringify(m), 600); } catch (e) {}
  return m;
}
/** Nome canônico da coluna (o quadro principal usa "FALTA DADOS PARA COTAÇÃO", o TESTE "...COTAR"). */
function vd_nomeColuna_(n) {
  var s = String(n || '').trim().toUpperCase();
  if (/^FALTA DADOS PARA COTA/.test(s)) return 'FALTA DADOS PARA COTAR';
  return s;
}

/* ============================ TEXTO ============================ */

function vd_limpar_(s) {
  return String(s || '')
    .replace(/\\([\\\x60*_{}\[\]()#+\-.!|>~])/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/ /g, ' ')
    .split('\n').map(function (l) { return l.replace(/^[\s*_]+/, '').replace(/[\s*_]+$/, ''); }).join('\n');
}

function vd_semAcento_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

/** Divide a descrição: bloco do consultor (antes do marcador) e resto (cotação). */
function vd_dividir_(desc) {
  var linhas = String(desc || '').split('\n');
  for (var i = 0; i < linhas.length; i++) {
    if (/^\s*[\\*_]*={2,}\s*COTA[ÇC][ÃA]O/i.test(vd_limpar_(linhas[i]))) {
      return { bloco: linhas.slice(0, i).join('\n'), resto: linhas.slice(i).join('\n'), temMarcador: true };
    }
  }
  return { bloco: String(desc || ''), resto: '', temMarcador: false };
}

function vd_campo_(txt, rotulos) {
  var re = new RegExp('^\\s*(?:' + rotulos + ')\\s*[:\\-–]\\s*(.*)$', 'im');
  var m = vd_limpar_(txt).match(re);
  return m ? m[1].trim() : '';
}

var VD_ROT = {
  modelo: 'MODELO|VE[IÍ]CULO',
  ano: 'ANO(?:\\s*FAB(?:RICA[ÇC][ÃA]O)?\\s*/\\s*MOD(?:ELO)?)?|ANO\\s*/\\s*MODELO',
  motor: 'MOTOR\\s*/\\s*VERS[ÃA]O|MOTOR|VERS[ÃA]O',
  chassi: 'CHASSI|CHASSIS',
  placa: 'PLACA'
};

/* ============================ VALIDADORES ============================ */

function vd_normPlaca_(p) {
  return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
/** Placa antiga AAA1234 <-> Mercosul AAA1C34 são o mesmo carro. */
function vd_placaMercosul_(p) {
  p = vd_normPlaca_(p);
  if (/^[A-Z]{3}\d{4}$/.test(p)) return p.slice(0, 4) + 'ABCDEFGHIJ'.charAt(+p.charAt(4)) + p.slice(5);
  return p;
}
function vd_mesmaPlaca_(a, b) {
  return !!a && !!b && vd_placaMercosul_(a) === vd_placaMercosul_(b);
}
function vd_placaValida_(p) {
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(vd_normPlaca_(p));
}
function vd_placaDoTexto_(s) {
  var m = String(s || '').toUpperCase().match(/\b([A-Z]{3})[\s\-]?(\d[A-Z0-9]\d{2})\b/);
  return m ? m[1] + m[2] : '';
}

function vd_normChassi_(c) {
  return String(c || '').toUpperCase().replace(/[\s.\-]/g, '');
}
function vd_chassiValido_(c) {
  c = vd_normChassi_(c);
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(c) && /[A-Z]/.test(c) && /\d{4}$/.test(c);
}

function vd_anoValido_(a) {
  var anos = String(a || '').match(/(19[89]\d|20[0-4]\d)/g);
  return !!anos;
}

function vd_tipoNorm_(t) {
  var s = vd_semAcento_(t).replace(/[^A-Z]/g, '');
  if (!s) return '';
  if (/^GENUIN/.test(s)) return 'GENUÍNO';
  if (/^ORIGINAL/.test(s)) return 'ORIGINAL';
  if (/^PARALEL/.test(s)) return 'PARALELO';
  if (/^USAD/.test(s)) return 'USADO';
  return '?' + String(t).trim();
}

function vd_tipoNormPedido_(t) {
  var s = vd_semAcento_(t).replace(/[^A-Z]/g, '');
  if (/^PART/.test(s)) return 'PARTICULAR';
  if (/^SEG/.test(s)) return 'SEGURADORA';
  return '';
}

function vd_categPneu_(t) {
  var s = vd_semAcento_(t).replace(/\s+/g, ' ').trim();
  if (/^IMPORTAD/.test(s)) return 'IMPORTADO';
  if (/^1\s*[AªºO°]?\.?\s*LINHA|^PRIMEIRA LINHA/.test(s)) return '1ª LINHA';
  return '';
}

function vd_medidaPneu_(m) {
  return /\d{3}\s*\/\s*\d{2}\s*Z?R?\s*\d{2}/i.test(String(m || ''));
}

/* ============================ PARSER ============================ */

var VD_ROT_EXTRA = {
  tipo: 'TIPO(?:\\s*D[OE]\\s*PEDIDO)?',
  cor: 'COR',
  seguradora: 'SEGURADORA',
  sinistro: 'SINISTRO|N[ºO°.]*\\s*SINISTRO'
};

/** Assinatura de uma linha de peça (para saber se é peça nova). */
function vd_sigItem_(linha) {
  return vd_semAcento_(vd_limpar_(linha)).replace(/^\s*(?:\d+\s*[.)\-]|[-•*])\s*/, '').replace(/\s*\|\s*/g, '|').replace(/\s+/g, ' ').trim();
}

/** Impressão curta da assinatura (10 caracteres): VD_PK2_ guarda só isto — com ~650 cards no quadro principal
 *  as assinaturas inteiras estourariam o limite de ~500 KB das Propriedades. Valor antigo (texto inteiro) é convertido. */
function vd_pkH_(sig) {
  sig = String(sig || '');
  if (/^#[A-Za-z0-9+\/]{9}$/.test(sig)) return sig;
  return '#' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, sig, Utilities.Charset.UTF_8)).slice(0, 9);
}
function vd_pkSet_(cardId, sigs) { PropertiesService.getScriptProperties().setProperty('VD_PK2_' + cardId, JSON.stringify((sigs || []).map(vd_pkH_))); }

/** Linhas "do consultor" no bloco (tudo que não é cabeçalho do carro nem linha do robô). */
function vd_linhasConsultor_(bloco) {
  var out = [];
  vd_limpar_(bloco).split('\n').forEach(function (l) {
    var t = l.trim();
    if (!t) return;
    if (/^(MODELO|VE[IÍ]CULO|ANO[^:]*|MOTOR[^:]*|VERS[ÃA]O|CHASSIS?|PLACA|TIPO[^:]*|COR|SEGURADORA|SINISTRO|N[ºO°.]*\s*SINISTRO)\s*[:\-–]/i.test(t)) return;
    if (/^PE[ÇC]AS\s*:?$/i.test(t)) return;
    if (/^(FORNECIMENTO \(seguradora\)|FORNECIMENTO COMPLEMENTO|↳|Pedido enviado por|Pe[çc]as importadas pelo rob[ôo]|Or[çc]amento importado|nenhuma pe[çc]a pela oficina|\(texto que estava)/i.test(t)) return;
    if (/^[-=_]{3,}$/.test(t)) return;
    out.push(t.replace(/^\s*(?:\d+\s*[.)\-]|[-•*])\s*/, ''));
  });
  return out;
}

/** Linhas do bloco "PEÇAS:" (texto cru, sem numeração). */
function vd_linhasPecas_(bloco) {
  var linhas = vd_limpar_(bloco).split('\n');
  var ini = -1;
  for (var i = 0; i < linhas.length; i++) {
    if (/^\s*PE[ÇC]AS\s*:?\s*$/i.test(linhas[i])) { ini = i + 1; break; }
  }
  var out = { achouBloco: ini >= 0, linhas: [], semOficina: false };
  if (ini < 0) return out;
  for (var j = ini; j < linhas.length; j++) {
    var l = linhas[j].trim();
    if (!l) { if (out.linhas.length) break; continue; }
    if (/^(OBS|OBSERVA[ÇC][ÃA]O|PEDIDO ENVIADO|↳|FORNECIMENTO|FO\b|DADOS DO CARRO|-{3,}|={3,})/i.test(l)) break;
    if (/^NENHUMA PE[ÇC]A/i.test(l)) { out.semOficina = true; break; }
    l = l.replace(/^\s*(?:\d+\s*[.)\-]|[-•*])\s*/, '');
    if (l) out.linhas.push(l);
  }
  return out;
}

/**
 * Lê a descrição e devolve {dados, pecas, faltas, div}.
 * opts.base = assinaturas de peças já aceitas (modo peça nova: só o que não está na base é conferido,
 *             e os dados do carro não são exigidos).
 */
function vd_analisar_(desc, nomeCard, opts) {
  opts = opts || {};
  var div = vd_dividir_(desc);
  var bloco = div.bloco;
  var d = {
    modelo: vd_campo_(bloco, VD_ROT.modelo),
    ano: vd_campo_(bloco, VD_ROT.ano),
    motor: vd_campo_(bloco, VD_ROT.motor),
    chassi: vd_normChassi_(vd_campo_(bloco, VD_ROT.chassi).split(/[\s(]/)[0]),
    placa: vd_normPlaca_(vd_campo_(bloco, VD_ROT.placa).split(/[\s(]/)[0]),
    tipo: vd_tipoNormPedido_(vd_campo_(bloco, VD_ROT_EXTRA.tipo)),
    cor: vd_campo_(bloco, VD_ROT_EXTRA.cor),
    seguradora: vd_campo_(bloco, VD_ROT_EXTRA.seguradora),
    sinistro: vd_campo_(bloco, VD_ROT_EXTRA.sinistro)
  };
  if (!d.placa) d.placa = vd_placaDoTexto_(nomeCard);
  if (!d.ano && d.modelo) {
    var anosM = d.modelo.match(/\b(19[89]\d|20[0-4]\d)\b/g);
    if (anosM) d.ano = anosM.slice(0, 2).join('/');
  }
  var doOrcamento = /OR[ÇC]AMENTO IMPORTADO/i.test(vd_limpar_(bloco));
  var modoNova = !!opts.base;
  // tipo do pedido: linha TIPO, título ou etiqueta (PARTICULAR) — padrão SEGURADORA
  if (!d.tipo) d.tipo = vd_tipoNormPedido_(opts.tipo || (/\bPARTICULAR\b/i.test(nomeCard || '') ? 'PARTICULAR' : ''));
  var particular = d.tipo === 'PARTICULAR';

  var faltas = [];
  if (!d.placa) faltas.push('placa');
  else if (!vd_placaValida_(d.placa)) faltas.push('placa inválida (' + d.placa + ')');
  if (!modoNova) {
    if (particular) {
      // particular (carro ainda não entrou): placa, modelo e chassi obrigatórios; ano opcional
      if (!d.modelo) faltas.push('modelo do carro');
      if (!d.chassi) faltas.push('chassi');
    } else if (!doOrcamento) {
      if (!d.modelo) faltas.push('modelo do carro');
      if (!d.ano) faltas.push('ano (fabricação/modelo)');
      if (!d.chassi) faltas.push('chassi');
    }
    if (d.ano && !vd_anoValido_(d.ano)) faltas.push('ano inválido (' + d.ano + ')');
    if (d.chassi && !vd_chassiValido_(d.chassi)) faltas.push('chassi inválido (' + d.chassi + ' — precisa ter 17 caracteres)');
  }

  var lp = vd_linhasPecas_(bloco);
  var base = opts.base || [];
  var pecas = [], novas = [];
  lp.linhas.forEach(function (l) {
    var p = vd_analisarPeca_(l, pecas.length + 1, { codigoOpcional: particular });
    if (particular) p.particular = true;
    p.sig = vd_sigItem_(l);
    pecas.push(p);
    if (base.indexOf(p.sig) < 0) novas.push(p);
  });
  if (!modoNova && !pecas.length && !lp.semOficina) {
    faltas.push('lista de peças no padrão (use o formulário ou escreva "PEÇAS:" e uma peça por linha: CÓDIGO | DESCRIÇÃO | TIPO)');
  }
  (modoNova ? novas : pecas).forEach(function (p) { p.faltas.forEach(function (f) { faltas.push(f); }); });

  return { dados: d, pecas: pecas, novas: novas, faltas: faltas, div: div, doOrcamento: doOrcamento };
}

function vd_analisarPeca_(linha, n, opts) {
  opts = opts || {};
  var partes = linha.split('|').map(function (s) { return s.trim(); });
  var qtd = '', part = false, partPor = '', comp = false, compData = '';
  partes = partes.filter(function (s) {
    var m = s.match(/^QTD\.?\s*:?\s*(\d+)$/i);
    if (m) { qtd = m[1]; return false; }
    // peça de orçamento complementar: "COMPLEMENTO dd/mm"
    var mc = s.match(/^COMPLEMENTO(?:\s+(\d{1,2}\/\d{1,2}))?$/i);
    if (mc) { comp = true; compData = mc[1] || ''; return false; }
    // peça particular dentro de pedido de seguradora (cliente paga): "PARTICULAR @consultor"
    var mp = s.match(/^PARTICULAR(?:\s*@\s*([\w.\-]+))?$/i);
    if (mp) { part = true; partPor = (mp[1] || '').toLowerCase(); return false; }
    return true;
  });
  if (part) opts = { codigoOpcional: true };
  var faltas = [];
  var rot;
  if (/^PNEUS?$/i.test(partes[0] || '')) {
    var medida = partes[1] || '', catMarca = partes[2] || '';
    rot = 'item ' + n + ' (PNEU ' + (medida || '?') + ')';
    if (!medida) faltas.push(rot + ': falta a medida');
    else if (!vd_medidaPneu_(medida)) faltas.push(rot + ': medida fora do padrão (ex.: 195/65R15)');
    if (!catMarca) faltas.push(rot + ': falta categoria (IMPORTADO / 1ª LINHA) ou marca');
    return { pneu: true, medida: medida, categoria: vd_categPneu_(catMarca), marca: vd_categPneu_(catMarca) ? '' : catMarca, qtd: qtd, particular: part, partPor: partPor, complemento: comp, compData: compData, faltas: faltas, texto: linha };
  }
  var codigo = partes[0] || '', descr = partes[1] || '', tiposTxt = partes.slice(2).join('/');
  rot = 'item ' + n + ' (' + (descr || codigo || linha).slice(0, 40) + ')';
  if (partes.length < 2) {
    faltas.push(rot + ': fora do padrão CÓDIGO | DESCRIÇÃO | TIPO');
    return { pneu: false, codigo: '', descricao: linha, tipos: [], qtd: qtd, particular: part, partPor: partPor, complemento: comp, compData: compData, faltas: faltas, texto: linha };
  }
  var semCodigo = !codigo || !/\d/.test(codigo) || codigo.replace(/[^A-Z0-9]/gi, '').length < 4 || /^S\s*\/?\s*C$/i.test(codigo);
  if (semCodigo && !opts.codigoOpcional) faltas.push(rot + ': falta o código da peça (buscar no Cilia)');
  if (semCodigo) codigo = '';
  if (!descr) faltas.push(rot + ': falta a descrição');
  var tipos = tiposTxt.split(/[\/,;+]|\bE\b|\bOU\b/i).map(vd_tipoNorm_).filter(String);
  var invalidos = tipos.filter(function (t) { return t.charAt(0) === '?'; });
  tipos = tipos.filter(function (t) { return t.charAt(0) !== '?'; });
  tipos = tipos.filter(function (t, i) { return tipos.indexOf(t) === i; });
  if (invalidos.length) faltas.push(rot + ': tipo não reconhecido "' + invalidos.map(function (t) { return t.slice(1); }).join(', ') + '" (use GENUÍNO, ORIGINAL, PARALELO ou USADO)');
  else if (!tipos.length) faltas.push(rot + ': falta o tipo de peça (GENUÍNO, ORIGINAL, PARALELO ou USADO)');
  if (tipos.length > 2) faltas.push(rot + ': no máximo 2 tipos por peça');
  return { pneu: false, codigo: codigo, descricao: descr, tipos: tipos, qtd: qtd, particular: part, partPor: partPor, complemento: comp, compData: compData, faltas: faltas, texto: linha };
}

/* ============================ MONTAR DESCRIÇÃO ============================ */

function vd_linhaPeca_(p, i) {
  var q = (p.qtd && +p.qtd > 1 ? ' | QTD ' + p.qtd : '') + (p.complemento && !p.particular ? ' | COMPLEMENTO' + (p.compData ? ' ' + p.compData : '') : '') + (p.particular ? ' | PARTICULAR' + (p.partPor ? ' @' + p.partPor : '') : '');
  if (p.pneu) return (i + 1) + '. PNEU | ' + p.medida + ' | ' + (p.categoria || p.marca) + q;
  return (i + 1) + '. ' + p.codigo + ' | ' + p.descricao + ' | ' + (p.tipos || []).join('/') + q;
}

/** Monta o bloco padrão do consultor (usado pelo formulário). extra = {cor, seguradora, sinistro, fo:[], origemOrc} */
function vd_montarBloco_(d, pecas, obs, rodape, extra) {
  extra = extra || {};
  var L = [];
  if (d.modelo) L.push('**MODELO:** ' + d.modelo);
  if (d.ano) L.push('**ANO:** ' + d.ano);
  if (d.motor) L.push('**MOTOR/VERSÃO:** ' + d.motor);
  if (d.chassi) L.push('**CHASSI:** ' + d.chassi);
  L.push('**PLACA:** ' + (d.placa || ''));
  if (extra.tipo === 'PARTICULAR') L.push('**TIPO:** PARTICULAR');
  if (extra.cor) L.push('**COR:** ' + extra.cor);
  if (extra.seguradora) L.push('**SEGURADORA:** ' + extra.seguradora);
  if (extra.sinistro) L.push('**SINISTRO:** ' + extra.sinistro);
  L.push('');
  L.push('**PEÇAS:**');
  if (pecas.length) pecas.forEach(function (p, i) { L.push(vd_linhaPeca_(p, i)); });
  else L.push('_nenhuma peça pela oficina — somente fornecimento da seguradora_');
  // linhas de fornecimento: a do orçamento importado agora, ou as que o card já tinha (extra.foLinhas)
  var foL = [];
  if (extra.fo && extra.fo.length) foL.push('**FORNECIMENTO (seguradora):** ' + extra.fo.length + ' peça(s) — ver checklist FORNECIMENTO');
  (extra.foLinhas || []).forEach(function (l) {
    var ehBase = /^FORNECIMENTO \(SEGURADORA\)/i.test(vd_limpar_(l).trim());
    if (ehBase && foL.length) return;
    if (foL.indexOf(l) < 0) foL.push(l);
  });
  if (foL.length) { L.push(''); foL.forEach(function (l) { L.push(l); }); }
  if (obs) { L.push(''); L.push('**OBS:** ' + obs); }
  if (rodape) { L.push(''); L.push('_' + rodape + '_'); }
  if (extra.origemOrc) L.push('_Orçamento importado (' + extra.origemOrc + ')_');
  return L.join('\n');
}

/** Coloca/atualiza um campo do cabeçalho (MODELO, ANO...) na descrição, sem apagar nada. */
function vd_definirCampo_(desc, rotuloRegex, rotulo, valor) {
  var linhas = String(desc || '').split('\n');
  var re = new RegExp('^\\s*[*_]*\\s*(?:' + rotuloRegex + ')\\s*[*_]*\\s*[:\\-–]', 'i');
  for (var i = 0; i < linhas.length; i++) {
    if (re.test(vd_limpar_(linhas[i])) || re.test(linhas[i])) {
      linhas[i] = '**' + rotulo + ':** ' + valor;
      return linhas.join('\n');
    }
  }
  return '**' + rotulo + ':** ' + valor + '\n' + desc;
}

/* ============================ LEITURA DE ANEXOS ============================ */

/** OCR de um blob (PDF/imagem) usando o Google Drive. Devolve texto. */
function vd_ocr_(blob, nome) {
  // O Drive às vezes devolve "Internal Error" na conversão (05/10/2026, orçamento Soma de 3 páginas): tenta 3x,
  // a última sem ocrLanguage. Só desiste depois disso.
  var arq, ultimo;
  for (var t = 0; t < 3 && !arq; t++) {
    try {
      arq = Drive.Files.create(
        { name: 'vd_tmp_' + (nome || 'anexo'), mimeType: 'application/vnd.google-apps.document' },
        blob,
        t < 2 ? { ocrLanguage: 'pt' } : {}
      );
    } catch (e) {
      ultimo = e;
      if (!/internal|backend|rate|limit|timeout|try again|503|500/i.test(String((e && e.message) || e))) throw e;
      Utilities.sleep(2000 * (t + 1));
    }
  }
  var bruto = null;
  if (!arq) {
    // caminho 2: sobe o arquivo como está e pede a conversão por cópia (outro endpoint do Drive)
    console.log('OCR: create falhou 3x (' + String((ultimo && ultimo.message) || ultimo) + '); tentando por cópia');
    try {
      bruto = DriveApp.createFile(blob.setName('vd_tmp_src_' + (nome || 'anexo')));
      arq = Drive.Files.copy({ name: 'vd_tmp_' + (nome || 'anexo'), mimeType: 'application/vnd.google-apps.document' }, bruto.getId(), { ocrLanguage: 'pt' });
    } catch (e2) {
      console.log('OCR: cópia também falhou: ' + String((e2 && e2.message) || e2));
      try { if (bruto) bruto.setTrashed(true); } catch (e3) {}
      throw ultimo;
    }
  }
  try {
    return DocumentApp.openById(arq.id).getBody().getText();
  } finally {
    try { DriveApp.getFileById(arq.id).setTrashed(true); } catch (e) {}
    try { if (bruto) bruto.setTrashed(true); } catch (e) {}
  }
}

function vd_motorDoModelo_(m) {
  var s = String(m || '');
  var d = s.match(/\b\d\.\d\b/);
  if (!d) return '';
  var resto = s.slice(d.index + d[0].length);
  var tk = resto.match(/\b(\d{1,2}V|TURBO|DIESEL|FLEX|ECONO\.?\s?FLEX|TSI|TFSI|THP|MPI|HIBRIDO|HYBRID)\b/g) || [];
  return [d[0]].concat(tk.filter(function (t, i) { return tk.indexOf(t) === i; })).join(' ');
}
function vd_extrair_(texto) {
  var T = String(texto || '').replace(/\r/g, '');
  var U = vd_semAcento_(T).replace(/[\s\u00a0]+/g, ' ');
  var r = { chassis: [], placas: [], modelo: '', ano: '', motor: '', origem: '' };
  var m;
  var reRot = /CHASSI[S]?\s*(?:N[ºO°.]*)?\s*[:.\-]?\s*([A-HJ-NPR-Z0-9][A-HJ-NPR-Z0-9 .\-]{15,22})/g;
  while ((m = reRot.exec(U))) { var c = vd_normChassi_(m[1]).slice(0, 17); if (vd_chassiValido_(c) && r.chassis.indexOf(c) < 0) r.chassis.push(c); }
  if (!r.chassis.length) { var reSolto = /\b([A-HJ-NPR-Z0-9]{17})\b/g; while ((m = reSolto.exec(U))) { if (vd_chassiValido_(m[1]) && /^[1-9A-HJ-NPR-Z]/.test(m[1]) && r.chassis.indexOf(m[1]) < 0) r.chassis.push(m[1]); } }
  var reP = /\b([A-Z]{3})[\s\-]?(\d[A-Z0-9]\d{2})\b/g;
  while ((m = reP.exec(U))) { var p = m[1] + m[2]; if (r.placas.indexOf(p) < 0) r.placas.push(p); }
  // placa "com rótulo": logo depois de PLACA (Cilia/HDI/CRLV) ou logo depois do chassi (Websoma "Licença")
  r.placasRot = [];
  var reRotP = /(?:PLACA\s*(?:N[O.]*)?\s*[:.\-]?|\b[A-HJ-NPR-Z0-9]{17}) ?([A-Z]{3})[\s\-]?(\d[A-Z0-9]\d{2})\b/g;
  while ((m = reRotP.exec(U))) { var pr = m[1] + m[2]; if (r.placasRot.indexOf(pr) < 0) r.placasRot.push(pr); }
  var ANO = '(19[89]\\d|20[0-4]\\d)';
  // Cilia: "CASCO - CHEVROLET - CRUZE SEDAN (2017 A 2019) LT 1.4 16V TURBO 2017 Autorizado"
  if ((m = U.match(new RegExp('(?:^|\\s)[A-Z]{3,12} - ([A-Z][A-Z .\\-]{1,20}?) - (.{3,100}?) ' + ANO + ' (?=AUTORIZ|CONSTAT|PLACA|NEGAD|EM |ORCAMENT|VISTORIA|CANCEL|PENDEN|[A-Z]{4,})')))) {
    r.modelo = (m[1] + ' ' + m[2]).replace(/\(\s*\d{4}\s*A\s*\d{4}\s*\)/, '').replace(/\s+/g, ' ').trim();
    r.ano = m[3]; r.origem = 'cilia';
  }
  // HDI: "Veiculo: 0016595 - CHEVROLET COBALT LTZ 1.8 8V ECONO.FLEX 4P AUT. 2015 Placa:"
  else if ((m = U.match(new RegExp('VEICULO: ?\\d* ?-? ?(.{3,100}?) ' + ANO + ' PLACA:')))) {
    r.modelo = m[1].trim(); r.ano = m[2]; r.origem = 'hdi';
  }
  // Websoma: "Veículo: Chassi: Licença: TOYOTA COROLLA ... FLEX 9BRBD48E5C2562143 AUX4331"
  else if ((m = U.match(/LICENCA: (.{3,100}?) ([A-HJ-NPR-Z0-9]{17}) /))) {
    r.modelo = m[1].replace(/^(?:\(\d{2}\)\s*[\d\-]+\s*)+/, '').trim(); r.origem = 'websoma';
    var f = U.match(new RegExp('FABRICACAO: (?:[A-Z]+ )?' + ANO + '(?: ' + ANO + ')?'));
    if (f) r.ano = f[2] ? f[1] + '/' + f[2] : f[1];
  }
  // Databox O.S.: "Marca: FORD Modelo: FIESTA KM: Ano: 2012"
  else if ((m = U.match(/MARCA: ([A-Z0-9 ]{2,20}?) MODELO: (.{2,60}?) (?:KM|ANO|COR):/))) {
    r.modelo = (m[1] + ' ' + m[2]).trim(); r.origem = 'os';
    var a = U.match(new RegExp('ANO: ' + ANO + '(?:\\s*/\\s*' + ANO + ')?'));
    if (a) r.ano = a[2] ? a[1] + '/' + a[2] : a[1];
  }
  // documento do carro (CRLV) / genérico
  if (!r.ano) {
    var g = U.match(new RegExp('ANO (?:DE )?FAB[A-Z.]*\\s*/?\\s*(?:ANO )?MOD[A-Z.]*:? ' + ANO + '\\s*/?\\s*' + ANO));
    if (g) r.ano = g[1] + '/' + g[2];
  }
  if (!r.modelo) {
    var mm = U.match(/MARCA\s*\/\s*MODELO(?:\s*\/\s*VERSAO)?:? ([A-Z0-9][A-Z0-9 .\/\-]{3,60}?)(?= [A-Z]{3,}:| ANO| COR| PLACA| CHASSI|$)/);
    if (mm) r.modelo = mm[1].trim();
  }
  if (r.modelo) r.motor = vd_motorDoModelo_(r.modelo);
  return r;
}

/** Anexo do card que dá para ler (PDF ou foto enviada, até o limite de tamanho). */
function vd_anexoLegivel_(a) {
  return !!a && a.isUpload && (a.bytes || 0) <= VD.MAX_BYTES_ANEXO &&
    (/pdf|image\/(jpe?g|png|webp|gif)/i.test(a.mimeType || '') || /\.(pdf|jpe?g|png)$/i.test(a.name || ''));
}

/**
 * Lê UM anexo do Trello com cache (VD_ANX3_<id>) — usado pelo robô e pelo formulário.
 * opt.orcCompleto: quer as peças do orçamento mesmo quando o cache não as guardou (orçamento grande).
 * Numa leitura nova, r.orcFull traz o orçamento completo (não vai para o cache).
 * Devolve null se o Trello não entregou o arquivo.
 */
/* Versão do leitor de anexos: quando o leitor de orçamento muda (ex.: 05/10/2026, layout Soma), as leituras
 * guardadas com a versão antiga são lidas de novo — senão "ler de novo" e o robô do complemento devolvem a leitura velha. */
var VD_ANX_V = 2;
function vd_lerAnexoTrello_(a, opt) {
  opt = opt || {};
  var props = PropertiesService.getScriptProperties();
  var chave = 'VD_ANX3_' + a.id;
  var cache = props.getProperty(chave);
  var r = null;
  if (cache) {
    r = JSON.parse(cache);
    // erro guardado (ex.: Drive fora do ar na hora) ou leitura de versão antiga do leitor: lê de novo
    if (r.erro || r.v !== VD_ANX_V) r = null;
    // leitura antiga (sem as peças do orçamento): lê de novo só se o anexo era orçamento
    else if (r.orcamento && !r.orc && !r.orcGrande) r = null;
    // cache antigo sem a dica de tipo do orçamento: lê de novo uma vez
    else if (r && r.orc && r.orc.o.some(function (x) { return x[0] !== 'P' && x.length < 4; })) r = null;
    // formulário precisa das peças e o cache não as tem
    else if (r && opt.orcCompleto && r.orcamento && !r.orc) r = null;
    // cache sem a placa "com rótulo" e com placas ambíguas: lê de novo uma vez
    else if (r && !r.placasRot && (r.placas || []).length > 1) r = null;
    if (r) r.doCache = true;
  }
  if (!r) {
    var orcFull = null;
    try {
      var resp = qt_fetch_(a.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
      if (resp.getResponseCode() >= 300) return null;
      var texto = vd_ocr_(resp.getBlob(), a.name);
      r = vd_extrair_(texto);
      var orc = vd_lerOrcamento_(texto);
      r.cor = orc.cor; r.seguradora = orc.seguradora; r.sinistro = orc.sinistro; r.orcamento = orc.origem;
      if (orc.origem) {
        try { if (pv_enriquecerFo_(texto, orc.fo)) r.foi = orc.fo.filter(function (x) { return x.fornecedor || x.previsao; }).map(function (x) { return [x.codigo || '', x.fornecedor || '', x.previsao || '']; }); } catch (e) {}
        r.orc = { o: vd_orcCompacto_(orc.oficina), f: vd_orcCompacto_(orc.fo) }; orcFull = orc;
      }
    } catch (e) {
      // 05/10/2026: o erro ficava guardado no cache e "ler de novo" devolvia o erro antigo mesmo com o Drive já normal
      console.log('leitura do anexo ' + a.name + ': ' + e);
      return { erro: String(e).slice(0, 100), chassis: [], placas: [] };
    }
    r.v = VD_ANX_V;
    var js = JSON.stringify(r);
    if (js.length > 8500 && r.orc) { delete r.orc; r.orcGrande = true; js = JSON.stringify(r); }
    props.setProperty(chave, js.length > 8500 ? JSON.stringify({ v: VD_ANX_V, chassis: r.chassis, placas: r.placas, placasRot: r.placasRot, modelo: r.modelo, ano: r.ano, motor: r.motor }) : js);
    if (orcFull) r.orcFull = orcFull;
  }
  return r;
}

/**
 * Card sem placa (ex.: PDF arrastado direto para o quadro): lê os anexos e, se todos os
 * que citam placa citam a MESMA, devolve {placa, anexo}. Mais de uma placa = não chuta.
 */
function vd_placaDosAnexos_(card, prazo) {
  var anexos = (card.attachments || []).filter(vd_anexoLegivel_).slice(0, VD.MAX_ANEXOS_CARD);
  var achadas = [], rotuladas = [], origem = '', origemRot = '', lidos = 0;
  function junta(lista, p) { if (!vd_placaValida_(p) || lista.some(function (x) { return vd_mesmaPlaca_(x, p); })) return false; lista.push(vd_normPlaca_(p)); return true; }
  for (var i = 0; i < anexos.length; i++) {
    if (Date.now() > prazo) break;
    var r = vd_lerAnexoTrello_(anexos[i]);
    if (!r) continue;
    lidos++;
    (r.placas || []).forEach(function (p) { if (junta(achadas, p) && !origem) origem = anexos[i].name; });
    (r.placasRot || []).forEach(function (p) { if (junta(rotuladas, p) && !origemRot) origemRot = anexos[i].name; });
  }
  // prefere a placa que o documento traz rotulada (PLACA: ...); texto solto tem falso positivo ("VIN 2017", "das 8h00")
  if (rotuladas.length === 1) return { placa: rotuladas[0], anexo: origemRot, lidos: lidos };
  if (rotuladas.length > 1) return { placa: '', varias: rotuladas, anexo: origemRot, lidos: lidos };
  return { placa: achadas.length === 1 ? achadas[0] : '', varias: achadas.length > 1 ? achadas : null, anexo: origem, lidos: lidos };
}

/** Lê os anexos do card (com cache) e devolve os dados achados que batem com a placa. */
function vd_lerAnexosCard_(card, placa, prazo) {
  var anexos = (card.attachments || []).filter(vd_anexoLegivel_).slice(0, VD.MAX_ANEXOS_CARD);

  var achados = [];
  for (var i = 0; i < anexos.length; i++) {
    if (Date.now() > prazo) break;
    var r = vd_lerAnexoTrello_(anexos[i]);
    if (!r) continue;
    r.anexo = anexos[i].name;
    achados.push(r);
  }

  // só vale anexo que cita a placa do card
  var validos = achados.filter(function (r) {
    return (r.placas || []).some(function (p) { return vd_mesmaPlaca_(p, placa); });
  });
  var chassis = [];
  validos.forEach(function (r) { (r.chassis || []).forEach(function (c) { if (chassis.indexOf(c) < 0) chassis.push(c); }); });
  var pega = function (campo) {
    for (var k = 0; k < validos.length; k++) if (validos[k][campo]) return { v: validos[k][campo], anexo: validos[k].anexo };
    return null;
  };
  var origemDe = function (c) {
    for (var k = 0; k < validos.length; k++) if ((validos[k].chassis || []).indexOf(c) >= 0) return validos[k].anexo;
    return '';
  };
  return {
    lidos: achados.length,
    comPlaca: validos.length,
    chassis: chassis.map(function (c) { return { v: c, anexo: origemDe(c) }; }),
    chassi: chassis.length === 1 ? { v: chassis[0], anexo: origemDe(chassis[0]) } : null,
    chassiDivergente: chassis.length > 1 ? chassis : null,
    modelo: pega('modelo'),
    ano: pega('ano'),
    motor: pega('motor'),
    cor: pega('cor'),
    seguradora: pega('seguradora'),
    sinistro: pega('sinistro'),
    orcamento: (function () {
      for (var k = 0; k < validos.length; k++) {
        var o = validos[k].orc;
        if (o && (o.o.length || o.f.length)) {
          var foX = vd_orcExpandir_(o.f);
          (validos[k].foi || []).forEach(function (fi) { foX.forEach(function (x) { if (fi[0] && x.codigo === fi[0]) { x.fornecedor = fi[1]; x.previsao = fi[2]; } }); });
          return { origem: validos[k].orcamento, oficina: vd_orcExpandir_(o.o), fo: foX, anexo: validos[k].anexo };
        }
      }
      return null;
    })(),
    semPlaca: achados.length > 0 && validos.length === 0
  };
}

/** O que o orçamento autorizou para a peça: GENUÍNO, REPOSIÇÃO (paralelo), USADO, ORIGINAL ou ''. */
function vd_dicaNorm_(t) {
  var s = vd_semAcento_(t);
  if (/^GENU/.test(s)) return 'GENUÍNO';
  if (/^ORIGINAL/.test(s)) return 'ORIGINAL';
  if (/REPOSI|^PRO$|^PPG$|^PPC$|^PAR$|OUTRAS FONTES/.test(s)) return 'REPOSIÇÃO';
  if (/^PPO$/.test(s)) return 'ORIGINAL';
  if (/VERDE|USAD|RECOND/.test(s)) return 'USADO';
  return '';
}

/** Avisos quando o tipo marcado contradiz o que o orçamento autorizou (só avisa, não barra). */
function vd_avisosTipo_(pecas, orcamento) {
  if (!orcamento || !orcamento.oficina || !orcamento.oficina.length) return [];
  var porCod = {}, porDesc = {};
  orcamento.oficina.forEach(function (o) {
    if (!o.dica) return;
    if (o.codigo) porCod[vd_semAcento_(o.codigo).replace(/[^A-Z0-9]/g, '')] = o.dica;
    if (o.descricao) porDesc[vd_semAcento_(o.descricao).replace(/[^A-Z0-9]/g, '')] = o.dica;
  });
  var avisos = [];
  pecas.forEach(function (p, i) {
    if (p.pneu || !p.tipos || !p.tipos.length) return;
    var dica = porCod[vd_semAcento_(p.codigo).replace(/[^A-Z0-9]/g, '')] || porDesc[vd_semAcento_(p.descricao).replace(/[^A-Z0-9]/g, '')];
    if (!dica) return;
    var t = p.tipos;
    var temGen = t.indexOf('GENUÍNO') >= 0, temOrig = t.indexOf('ORIGINAL') >= 0, temPar = t.indexOf('PARALELO') >= 0, temUs = t.indexOf('USADO') >= 0;
    var contradiz = false;
    if (dica === 'GENUÍNO' && !temGen && !temOrig) contradiz = true;          // autorizou genuína, pediu paralelo/usado
    if (dica === 'REPOSIÇÃO' && (temGen || temOrig) && !temPar && !temUs) contradiz = true; // autorizou reposição, pediu só genuína
    if (dica === 'USADO' && !temUs) contradiz = true;
    if (contradiz) avisos.push('item ' + (i + 1) + ' (' + (p.descricao || p.codigo).slice(0, 40) + '): marcado ' + t.join('/') + ', mas o orçamento autorizou ' + dica);
  });
  return avisos;
}

/* ---- peças do orçamento em formato curto (cabe no cache de 9 KB) ---- */
function vd_orcCompacto_(lista) {
  return (lista || []).map(function (p) {
    return p.pneu ? ['P', p.medida || '', p.marca || '', p.qtd || '1'] : [p.codigo || '', String(p.descricao || '').slice(0, 60), p.qtd || '1', vd_dicaNorm_(p.dica)];
  });
}
function vd_orcExpandir_(lista) {
  return (lista || []).map(function (x) {
    return x[0] === 'P' && x.length === 4
      ? { pneu: true, medida: x[1], marca: x[2], categoria: '', qtd: x[3] }
      : { pneu: false, codigo: x[0], descricao: vd_limparDescricao_(x[1]), tipos: [], qtd: x[2], dica: x[3] || '' };
  });
}

/* ============================ TRAVA DA DESCRIÇÃO ============================
 * A descrição só muda pelo formulário ou pelo robô. Cada gravação oficial registra uma
 * assinatura (VD_DESC_<id>) e guarda o texto na aba TRAVA da planilha de backup. A cada
 * minuto, descrição diferente da assinatura = edição manual -> restaura e avisa quem editou.
 * Desligar: propriedade VD_TRAVA_DESC = NAO.
 */
var TR = { PREFIXO: 'VD_DESC_', ABA: 'TRAVA', ESPERA_MS: 40 * 1000, AVISO_MS: 60 * 60 * 1000 };

function tr_hash_(desc) {
  var s = String(desc || '').replace(/\s+$/, '');
  var h = 0;
  for (var i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (h >>> 0) + ':' + s.length;
}

function tr_aba_() {
  var sh0 = vd_planilhaBackup_();
  var ss = sh0.getParent();
  var sh = ss.getSheetByName(TR.ABA);
  if (!sh) {
    sh = ss.insertSheet(TR.ABA);
    sh.appendRow(['Card id', 'Assinatura', 'Quando', 'Descrição oficial']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Guarda a versão oficial de vários cards de uma vez: [{id, desc}]. */
function tr_guardarLote_(itens) {
  if (!itens.length) return;
  var sh = tr_aba_();
  var n = sh.getLastRow();
  var ids = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  var props = {}, novos = [], agora = new Date();
  itens.forEach(function (it) {
    var h = tr_hash_(it.desc);
    props[TR.PREFIXO + it.id] = h;
    var linha = [it.id, h, agora, String(it.desc || '')];
    var comCompleta = typeof it.completa === 'string';
    if (comCompleta) linha.push(it.completa);
    var k = ids.indexOf(it.id);
    if (k >= 0) sh.getRange(k + 2, 1, 1, linha.length).setValues([linha]);
    else { novos.push(linha.length === 5 ? linha : linha.concat([''])); ids.push(it.id); }
    if (comCompleta) {
      try { if (it.completa.length < 90000) CacheService.getScriptCache().put('vd_cmp_' + it.id, '#' + it.completa, 21600); else CacheService.getScriptCache().remove('vd_cmp_' + it.id); } catch (e) {}
      if (VD_CMP_MEM) VD_CMP_MEM[it.id] = it.completa;
    }
  });
  if (novos.length) sh.getRange(n + 1, 1, novos.length, 5).setValues(novos);
  PropertiesService.getScriptProperties().setProperties(props);
  // últimas assinaturas GRAVADAS pelo robô/formulário (a linha de base não entra: ela só
  // fotografa o que já estava no card, que pode ser edição de pessoa)
  itens.forEach(function (it) { if (!it.base) tr_marcarRecente_(it.id, props[TR.PREFIXO + it.id]); });
}

/** Guarda (6 h) as últimas assinaturas que o robô/formulário gravou num card. O log de
 *  descrição (Código.gs) usa isto para não tratar essas gravações como edição de pessoa. */
function tr_marcarRecente_(cardId, h) {
  try {
    var cache = CacheService.getScriptCache(), k = 'tr_rec_' + cardId, lista = [];
    try { lista = JSON.parse(cache.get(k) || '[]'); } catch (e) {}
    lista = lista.filter(function (x) { return x !== h; }).concat([h]).slice(-12);
    cache.put(k, JSON.stringify(lista), 21600);
  } catch (e) { console.log('trava/recentes: ' + e); }
}

/** true se esta descrição foi gravada pelo robô/formulário nas últimas 6 h. */
function tr_ehOficial_(cardId, desc) {
  try { return JSON.parse(CacheService.getScriptCache().get('tr_rec_' + cardId) || '[]').indexOf(tr_hash_(desc)) >= 0; } catch (e) { return false; }
}

function tr_guardar_(cardId, desc) { tr_guardarLote_([{ id: cardId, desc: desc }]); }

/** Descrição oficial guardada (ou null). */
function tr_ler_(cardId) {
  var sh = tr_aba_();
  var n = sh.getLastRow();
  if (n < 2) return null;
  var ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === cardId) return String(sh.getRange(i + 2, 4).getValue());
  return null;
}

/** Grava a descrição de um card (PUT) e registra como versão oficial. extra = outros campos do PUT. */
function vd_gravarDesc_(cardId, desc, token, extra) {
  var payload = extra || {};
  var vit = null, jaTinha = '';
  try {
    jaTinha = vd_completa_(cardId);
    var c = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'name', checklists: 'all', checkItem_fields: 'name,state,due' } });
    var itensPg = [];
    (c.checklists || []).filter(function (k) { return /^PAGAS/i.test((k.name || '').trim()); }).forEach(function (k) { itensPg = itensPg.concat(k.checkItems || []); });
    vit = vd_vitrine_(desc, payload.name || c.name, itensPg);
  } catch (e) { console.log('vitrine: ' + e); vit = null; }
  payload.desc = vit === null ? desc : vit;
  vd_api_('/cards/' + cardId, { method: 'put', payload: payload }, token);
  try { tr_guardarLote_([{ id: cardId, desc: payload.desc, completa: vit === null ? '' : desc }]); } catch (e) { console.log('trava: ' + e); }
  // 1ª vez com vitrine: o texto antigo fora do padrão vai para um comentário (não se perde de vista)
  if (vit !== null && !jaTinha) {
    try {
      var leg = vd_textoLegado_(desc);
      if (leg) {
        leg = leg.replace(/^\s*([-=_*~+.]\s*){3,}$/gm, '───');
        if (leg.length > 15000) leg = leg.slice(0, 15000) + '\n(…)';
        vd_api_('/cards/' + cardId + '/actions/comments', { method: 'post', payload: { text: '📄 **Texto antigo do card** (guardado aqui ao organizar a descrição):\n\n' + leg } });
      }
    } catch (e) { console.log('vitrine/legado: ' + e); }
  }
}

/** Redesenha a vitrine de um card a partir da completa guardada (ex.: depois de uma compra). */
function vd_redesenhar_(cardId, token) {
  var desc = vd_completa_(cardId);
  if (!desc) desc = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'desc' } }).desc || '';
  vd_gravarDesc_(cardId, desc, token);
}

/** Ciclo de 1 minuto: desfaz edição manual da descrição. */
function tr_executar_() {
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO' || vd_prop_('VD_TRAVA_DESC', 'SIM') === 'NAO') return 0;
  var board = vd_board_();
  var props = PropertiesService.getScriptProperties();
  var todas = props.getProperties();
  var agora = Date.now();
  // só os cards cuja descrição mudou (histórico do quadro), não o quadro inteiro: no principal são ~650 cards.
  // Edição dos últimos 40 s fica para o próximo ciclo (gravação do formulário em andamento).
  var ate = agora - TR.ESPERA_MS, desde = vd_marca_('TR_ACT');
  if (!desde) { vd_marcaSet_('TR_ACT', new Date(ate).toISOString()); return 0; }
  if (new Date(desde).getTime() >= ate) return 0;
  var acts = vd_api_('/boards/' + board + '/actions', { cru: true, query: { filter: 'updateCard:desc', since: desde, before: new Date(ate).toISOString(), limit: 200, fields: 'data,date' } }) || [];
  vd_marcaSet_('TR_ACT', new Date(ate).toISOString());
  var ids = [];
  acts.forEach(function (a) { var id = a.data && a.data.card && a.data.card.id; if (id && ids.indexOf(id) < 0) ids.push(id); });
  var cards = [];
  ids.forEach(function (id) {
    if (vd_legado_(id)) return;
    try { cards.push(vd_api_('/cards/' + id, { cru: true, query: { fields: 'name,desc,shortLink,shortUrl,dateLastActivity,closed' } })); } catch (e) {}
  });
  var baseline = [], restaurados = 0;
  cards.forEach(function (c) {
    if (c.closed) return;
    if (vd_legado_(c.id)) return;   // card antigo: segue o jeito antigo
    var chave = TR.PREFIXO + c.id;
    var h = tr_hash_(c.desc);
    if (!todas[chave]) { baseline.push({ id: c.id, desc: c.desc, base: true }); return; }
    if (todas[chave] === h) return;
    // mudou: dá um tempo para gravação em andamento (formulário) registrar a assinatura
    var atual = props.getProperty(chave);
    if (atual === h) return;
    var acs = [];
    try { acs = vd_api_('/cards/' + c.id + '/actions', { query: { filter: 'updateCard:desc', limit: 1, memberCreator_fields: 'username' } }) || []; } catch (e) {}
    var ultima = acs[0];
    if (ultima && agora - new Date(ultima.date).getTime() < TR.ESPERA_MS) return;   // gravação recente: o marcador ainda cobre, volta no próximo ciclo
    var oficial = tr_ler_(c.id);
    if (oficial === null) { baseline.push({ id: c.id, desc: c.desc, base: true }); return; }
    if (tr_hash_(oficial) === h) { props.setProperty(chave, h); return; }
    var quem = ultima && ultima.memberCreator ? ultima.memberCreator.username : '';
    vd_backup_(c, 'edição manual desfeita pela trava' + (quem ? ' (' + quem + ')' : ''));
    tr_marcarRecente_(c.id, tr_hash_(oficial));   // o log de descrição não conta a restauração como edição
    vd_api_('/cards/' + c.id, { method: 'put', payload: { desc: oficial } });
    restaurados++;
    var chaveAv = 'VD_DESC_AV_' + c.id;
    if (agora - (+(todas[chaveAv] || 0)) > TR.AVISO_MS) {
      try {
        vd_comentar_(c, (quem ? '@' + quem + ' ' : '') + '🔒 **ALTERAÇÃO NÃO PERMITIDA** — a descrição só muda pelo formulário; o texto voltou ao original. ' +
          'Use **' + VD_LINK.EDITAR + '** (peças/carro) ou **' + VD_LINK.COMPRA + '**.' + (function () { try { return es_autor_(c.id); } catch (e) { return ''; } })());
      } catch (e) {}
      props.setProperty(chaveAv, String(agora));
    }
  });
  if (baseline.length) tr_guardarLote_(baseline);
  if (restaurados) console.log('trava: ' + restaurados + ' descrição(ões) restaurada(s)');
  return restaurados;
}

/* ============================ DIAS ÚTEIS ============================
 * Prazo de peça (cotação e compra) conta só dias úteis: pula sábado, domingo e os feriados
 * nacionais + municipais de TODAS as cidades do grupo (Toledo, Marechal C. Rondon, Cascavel,
 * Campo Mourão). O Paraná não tem feriado estadual (19/12 não é feriado civil).
 * Carnaval (segunda e terça) conta como feriado. Outros pontos facultativos (Cinzas, 24/12,
 * 31/12…) contam como dia útil.
 * Feriado a mais num ano (decreto, transferência): propriedade DU_EXTRAS = "2026-10-19, 2027-02-15".
 * Dia que NÃO é feriado naquele ano: propriedade DU_REMOVER, mesmo formato.
 * Voltar a contar dias corridos: propriedade VD_DIAS_UTEIS = NAO.
 * Conferir a lista de um ano: rodar du_listarFeriados (mostra o ano atual e o seguinte).
 */
var DU = {
  FIXOS: {
    '01-01': 'Confraternização Universal', '04-21': 'Tiradentes', '05-01': 'Dia do Trabalho',
    '09-07': 'Independência', '10-12': 'N. Sra. Aparecida', '11-02': 'Finados',
    '11-15': 'Proclamação da República', '11-20': 'Consciência Negra', '12-25': 'Natal',
    '03-19': 'São José — Campo Mourão', '07-25': 'Aniversário de Marechal C. Rondon',
    '10-10': 'Aniversário de Campo Mourão', '10-31': 'Reforma Luterana — Marechal C. Rondon',
    '11-14': 'Aniversário de Cascavel', '12-14': 'Aniversário de Toledo'
  },
  MOVEIS: [[-48, 'Carnaval (segunda)'], [-47, 'Carnaval (terça)'], [-2, 'Sexta-feira Santa'], [60, 'Corpus Christi']],   // dias a partir da Páscoa
  EXTRAS: { '2026-10-19': 'Aniversário de Campo Mourão (decreto 2026)' }
};
var DU_CACHE = {};

function du_pad_(n) { return (n < 10 ? '0' : '') + n; }
function du_chave_(d) { return d.getFullYear() + '-' + du_pad_(d.getMonth() + 1) + '-' + du_pad_(d.getDate()); }

/** Domingo de Páscoa (algoritmo de Meeus/Butcher). */
function du_pascoa_(a) {
  var b = Math.floor(a / 100), c = a % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  var g = Math.floor((b - f + 1) / 3), h = (19 * (a % 19) + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor(((a % 19) + 11 * h + 22 * l) / 451);
  var mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(a, mes - 1, dia, 12);
}

function du_lerProp_(nome) {
  var out = [];
  String(vd_prop_(nome, '') || '').split(/[,;\s]+/).forEach(function (t) {
    var m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/) || t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return;
    out.push(m[1].length === 4 ? m[1] + '-' + m[2] + '-' + m[3] : m[3] + '-' + du_pad_(+m[2]) + '-' + du_pad_(+m[1]));
  });
  return out;
}

/** Feriados de um ano: { 'aaaa-mm-dd': nome }. */
function du_feriados_(ano) {
  if (DU_CACHE[ano]) return DU_CACHE[ano];
  var f = {};
  Object.keys(DU.FIXOS).forEach(function (md) { f[ano + '-' + md] = DU.FIXOS[md]; });
  var p = du_pascoa_(ano);
  DU.MOVEIS.forEach(function (mv) { var d = new Date(p.getTime()); d.setDate(d.getDate() + mv[0]); f[du_chave_(d)] = mv[1]; });
  Object.keys(DU.EXTRAS).forEach(function (k) { if (k.indexOf(ano + '-') === 0) f[k] = DU.EXTRAS[k]; });
  du_lerProp_('DU_EXTRAS').forEach(function (k) { if (k.indexOf(ano + '-') === 0) f[k] = f[k] || 'feriado extra (DU_EXTRAS)'; });
  du_lerProp_('DU_REMOVER').forEach(function (k) { delete f[k]; });
  DU_CACHE[ano] = f;
  return f;
}

function du_ehUtil_(d) {
  var w = d.getDay();
  if (w === 0 || w === 6) return false;
  return !du_feriados_(d.getFullYear())[du_chave_(d)];
}

/** Data (ISO, meio-dia) = hoje + N dias úteis. 0 = hoje. */
function du_somarUteis_(dias) {
  var n = parseInt(dias, 10) || 0, h = new Date();
  var d = new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12, 0, 0);
  if (vd_prop_('VD_DIAS_UTEIS', 'SIM') === 'NAO') { d.setDate(d.getDate() + n); return d.toISOString(); }
  var guarda = 0;
  while (n > 0 && guarda++ < 400) { d.setDate(d.getDate() + 1); if (du_ehUtil_(d)) n--; }
  return d.toISOString();
}

/** Roda na mão: mostra no log os feriados considerados no ano atual e no próximo. */
function du_listarFeriados() {
  var a = new Date().getFullYear();
  [a, a + 1].forEach(function (ano) {
    var f = du_feriados_(ano);
    Logger.log(ano + ':\n' + Object.keys(f).sort().map(function (k) {
      var d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10), 12);
      return k.slice(8, 10) + '/' + k.slice(5, 7) + ' ' + ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()] + ' — ' + f[k];
    }).join('\n'));
  });
}

/* ============================ BACKUP ============================ */

function vd_planilhaBackup_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('VD_PLANILHA_BACKUP');
  if (id) { try { return SpreadsheetApp.openById(id).getSheets()[0]; } catch (e) {} }
  var ss = SpreadsheetApp.create('Validação Trello — backup de descrições');
  var sh = ss.getSheets()[0];
  sh.appendRow(['Data', 'Quadro', 'Card', 'Link', 'Motivo', 'Descrição ORIGINAL (antes do robô)']);
  sh.setFrozenRows(1);
  props.setProperty('VD_PLANILHA_BACKUP', ss.getId());
  return sh;
}

function vd_backup_(card, motivo) {
  vd_planilhaBackup_().appendRow([new Date(), vd_board_(), card.name, card.shortUrl || card.url, motivo, card.desc]);
}

/** Restaura a última descrição guardada de um card (passar o shortLink, ex.: 'aB12cD34'). */
function vd_restaurarDescricao(shortLink) {
  var sh = vd_planilhaBackup_();
  var v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i > 0; i--) {
    if (String(v[i][3]).indexOf(shortLink) >= 0) {
      var cRest = vd_api_('/cards/' + shortLink, { query: { fields: 'id' } });
      vd_gravarDesc_(cRest.id, v[i][5]);
      Logger.log('Restaurado: ' + v[i][2]);
      return;
    }
  }
  Logger.log('Nenhum backup para ' + shortLink);
}

/* ============================ QUEM CRIOU ============================ */

function vd_criador_(cardId) {
  try {
    var acts = vd_api_('/cards/' + cardId + '/actions', {
      query: { filter: 'createCard,copyCard,moveCardToBoard,emailCard,convertToCardFromCheckItem', limit: 50, memberCreator_fields: 'username,fullName' }
    });
    if (acts && acts.length) {
      var a = acts[acts.length - 1];
      if (a.memberCreator) return a.memberCreator.username;
    }
  } catch (e) {}
  return '';
}

/* ============================ NÚCLEO ============================ */

/** Junta as várias linhas 'item N: falta o tipo de peça' numa só. */
function vd_agruparTipo_(faltas) {
  var nums = [], outras = [];
  faltas.forEach(function (f) {
    var m = f.match(/^item (\d+) \(.*\): falta o tipo de peça/);
    if (m) nums.push(m[1]); else outras.push(f);
  });
  if (nums.length < 2) return faltas;
  return outras.concat(['falta marcar o tipo de peça (GENUÍNO, ORIGINAL, PARALELO ou USADO) nos itens ' + nums.join(', ')]);
}

function vd_anosSeCruzam_(a, b) {
  var x = String(a || '').match(/(19|20)\d\d/g) || [], y = String(b || '').match(/(19|20)\d\d/g) || [];
  if (!x.length || !y.length) return true;
  return x.some(function (v) { return y.indexOf(v) >= 0; });
}

function vd_comentar_(card, txt) {
  vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } });
}

function vd_mover_(card, idLista, pos) {
  var de = card.idList;
  try { st_permitir_(card.id, idLista); } catch (e) {}   // antes do PUT: a trava de colunas não desfaz
  vd_api_('/cards/' + card.id, { method: 'put', payload: { idList: idLista, pos: pos || 'top' } });
  card.idList = idLista;
  try {
    var nomes = {}; var ls = vd_listas_(vd_board_()); Object.keys(ls).forEach(function (k) { nomes[ls[k]] = k; });
    ev_registrar_('COLUNA', card, 'robô', null, { detalhe: (nomes[de] || '?') + ' → ' + (nomes[idLista] || '?') });
  } catch (e) {}
}

/** Confere um card de EM COTAÇÃO / FALTA DADOS. ctx = {board, listas, modoAtivo, prazo, urlForm}. */
function vd_conferirCard_(card, ctx) {
  var props = PropertiesService.getScriptProperties();
  var nome = card.name || '';
  var res = { card: nome, url: card.shortUrl, acao: '', faltas: [], preenchido: [], avisos: [] };

  if (/^\s*AVISO\b/i.test(nome) || /NOVO PEDIDO DE PE[ÇC]A/i.test(nome) || /sem\s+compra\s+de\s+pe[çc]a/i.test(vd_limpar_(card.desc))) {
    res.acao = 'ignorado (aviso / sem compra de peça)';
    return res;
  }

  // link "Editar peças" nos anexos do card (atalho para o formulário)
  if (ctx.modoAtivo && ctx.urlForm && card.attachments) {
    var temLink = card.attachments.some(function (a) { return VD_LINK.RX_EDITAR.test(a.name || '') || (String(a.url || '').indexOf(ctx.urlForm) === 0 && String(a.url).indexOf('modo=') < 0); });
    if (!temLink) {
      try {
        vd_api_('/cards/' + card.id + '/attachments', { method: 'post', payload: { url: ctx.urlForm + '?card=' + card.shortLink, name: VD_LINK.EDITAR, setCover: false } });
        res.linkCriado = true;
      } catch (e) {}
    }
    // link do comprador (cotação / compra)
    if (!card.attachments.some(function (a) { return VD_LINK.RX_COMPRA.test(a.name || ''); })) {
      try {
        vd_api_('/cards/' + card.id + '/attachments', { method: 'post', payload: { url: ctx.urlForm + '?card=' + card.shortLink + '&modo=compras', name: VD_LINK.COMPRA, setCover: false } });
      } catch (e) {}
    }
  }

  var baseTxt = props.getProperty('VD_NOVAS_' + card.id);
  var base = baseTxt ? JSON.parse(baseTxt) : null;
  var tipoEtiq = (card.labels || []).some(function (l) { return /PARTICULAR/i.test(l.name || ''); }) ? 'PARTICULAR' : '';
  var an = vd_analisar_(card.desc, nome, { base: base, tipo: tipoEtiq });
  var d = an.dados;
  var avisoAnexo = '', faltasExtra = [];
  var lido = null;

  // card sem placa (ex.: PDF arrastado direto para o quadro): tenta achar a placa nos anexos
  if (!base && !d.placa && (card.attachments || []).length && Date.now() < ctx.prazo) {
    var pa = vd_placaDosAnexos_(card, ctx.prazo);
    if (pa.placa) {
      var descP = vd_definirCampo_(card.desc || '', VD_ROT.placa, 'PLACA', pa.placa);
      // título sem placa: se era só nome de arquivo vira a placa; senão a placa entra na frente
      var nomeP = vd_placaDoTexto_(nome) ? nome
        : (/\.(pdf|jpe?g|png|webp)\s*$/i.test(nome) || /^\s*(image|img|pdf_report|whatsapp)/i.test(nome) || !nome.trim() ? pa.placa : pa.placa + ' ' + nome.trim());
      res.preenchido.push('placa');
      res.placaDoAnexo = pa.anexo;
      if (ctx.modoAtivo) {
        vd_backup_(card, 'placa lida do anexo ' + pa.anexo);
        vd_gravarDesc_(card.id, descP, null, nomeP !== nome ? { name: nomeP } : null);
        card.desc = descP;
        if (nomeP !== nome) { card.name = nomeP; nome = nomeP; }
      }
      an = vd_analisar_(ctx.modoAtivo ? card.desc : descP, ctx.modoAtivo ? nome : nomeP, { base: base, tipo: tipoEtiq });
      d = an.dados;
    } else if (pa.varias) {
      res.avisos.push('os anexos mostram mais de uma placa (' + pa.varias.join(', ') + ') — coloque a placa certa no título');
    }
  }

  // dados do carro pelos anexos (não mexe em card que voltou só por peça nova)
  if (!base && d.placa && (card.attachments || []).length && Date.now() < ctx.prazo) {
    lido = vd_lerAnexosCard_(card, d.placa, ctx.prazo);
    var novaDesc = card.desc || '';
    var origem = [];
    var poe = function (cond, valor, rotRe, rot, nomeCampo) {
      if (cond && valor) { novaDesc = vd_definirCampo_(novaDesc, rotRe, rot, valor.v); res.preenchido.push(nomeCampo); origem.push(valor.anexo); }
    };
    var algum = (!d.chassi && lido.chassi) || (!d.motor && lido.motor) || (!d.ano && lido.ano) || (!d.modelo && lido.modelo) ||
      (!d.cor && lido.cor) || (!d.seguradora && lido.seguradora) || (!d.sinistro && lido.sinistro);
    if (algum && !/\bPLACA\s*[:\-]/i.test(vd_limpar_(novaDesc))) novaDesc = vd_definirCampo_(novaDesc, VD_ROT.placa, 'PLACA', d.placa);
    poe(!d.sinistro, lido.sinistro, VD_ROT_EXTRA.sinistro, 'SINISTRO', 'sinistro');
    poe(!d.seguradora, lido.seguradora, VD_ROT_EXTRA.seguradora, 'SEGURADORA', 'seguradora');
    poe(!d.cor, lido.cor, VD_ROT_EXTRA.cor, 'COR', 'cor');
    poe(!d.chassi, lido.chassi, VD_ROT.chassi, 'CHASSI', 'chassi');
    poe(!d.motor, lido.motor, VD_ROT.motor, 'MOTOR/VERSÃO', 'motor/versão');
    poe(!d.ano, lido.ano, VD_ROT.ano, 'ANO', 'ano');
    poe(!d.modelo, lido.modelo, VD_ROT.modelo, 'MODELO', 'modelo');
    if (!d.chassi && lido.chassiDivergente) avisoAnexo = 'chassi divergente nos anexos (' + lido.chassiDivergente.join(' / ') + ')';
    else if (!d.chassi && lido.semPlaca) avisoAnexo = 'os anexos lidos não mostram a placa ' + d.placa + ', então o chassi não foi puxado';

    // divergência: chassi da descrição x anexo (barra) / ano (só avisa)
    if (d.chassi && vd_chassiValido_(d.chassi) && lido.chassis.length && !lido.chassis.some(function (c) { return c.v === d.chassi; })) {
      faltasExtra.push('chassi divergente: descrição ' + d.chassi + ' × anexo ' + lido.chassis.map(function (c) { return c.v + ' (' + c.anexo + ')'; }).join(', ') + ' — confira e corrija');
    }
    if (d.ano && lido.ano && !vd_anosSeCruzam_(d.ano, lido.ano.v)) {
      res.avisos.push('ano da descrição (' + d.ano + ') diferente do anexo ' + lido.ano.anexo + ' (' + lido.ano.v + ')');
    }
    res.lidos = lido.lidos;

    if (origem.length) {
      var nomesOrig = origem.filter(function (x, i) { return x && origem.indexOf(x) === i; }).join(', ');
      novaDesc = novaDesc.replace(/\n?_?↳ .*lid[oa]s? do anexo.*_?\n?/g, '\n');
      var linhasN = novaDesc.split('\n'), pos = 0;
      for (var i = 0; i < linhasN.length; i++) if (/^\*\*(MODELO|ANO|MOTOR\/VERSÃO|CHASSI|PLACA|COR|SEGURADORA|SINISTRO):\*\*/.test(linhasN[i])) pos = i + 1;
      linhasN.splice(pos, 0, '_↳ ' + res.preenchido.join(', ') + ' lido(s) do anexo ' + nomesOrig + ' pelo robô_');
      novaDesc = linhasN.join('\n');
      if (ctx.modoAtivo) {
        vd_backup_(card, 'preenchido do anexo: ' + res.preenchido.join(', '));
        vd_gravarDesc_(card.id, novaDesc);
        card.desc = novaDesc;
      }
      an = vd_analisar_(novaDesc, nome, { base: base, tipo: tipoEtiq });
    }

    // orçamento anexado e card sem lista de peças no padrão: importa as peças
    var lp0 = vd_linhasPecas_(an.div.bloco);
    if (lido.orcamento && !an.doOrcamento && !lp0.linhas.length && !lp0.semOficina) {
      res.importado = vd_importarOrcamento_(card, an, lido, ctx);
      if (res.importado && ctx.modoAtivo) { nome = card.name; an = vd_analisar_(card.desc, nome, { base: base, tipo: tipoEtiq }); }
    }
  }

  // mantém a "foto" das linhas do consultor atualizada enquanto o card está em EM COTAÇÃO / FALTA DADOS
  vd_pkSet_(card.id, vd_linhasConsultor_(an.div.bloco).map(vd_sigItem_));

  var faltas = vd_agruparTipo_(an.faltas).concat(faltasExtra);
  // pedido de seguradora: o orçamento autorizado tem de estar no card (o robô importa as peças dele)
  var temOrc = an.doOrcamento || (lido && lido.orcamento);
  if (!base && an.dados.tipo !== 'PARTICULAR' && !temOrc) {
    faltas.unshift('orçamento autorizado da seguradora anexado no card (PDF do Cilia, HDI ou Websoma) — com ele o robô importa as peças sozinho; se for pedido de cliente particular, escreva PARTICULAR no título ou use o formulário');
  }
  if (an.doOrcamento && !base && !vdf_partesTitulo_(nome, an.dados).carro) faltas.unshift('carro (nome do carro no título do card)');
  if (avisoAnexo && faltas.some(function (f) { return /^chassi$/.test(f); })) faltas.push('obs.: ' + avisoAnexo);
  res.faltas = faltas;
  // tipo marcado x o que o orçamento autorizou (só avisa)
  if (lido && lido.orcamento) vd_avisosTipo_(an.pecas, lido.orcamento).forEach(function (a) { res.avisos.push(a); });

  var sigAtual = (faltas.length ? faltas.join('|') : 'OK') + (res.avisos.length ? '#' + res.avisos.join('|') : '');
  var chaveSig = 'VD_SIG_' + card.id;
  var sigAnterior = props.getProperty(chaveSig) || '';
  var idCot = ctx.listas[VD.LISTA_COTACAO], idFalta = ctx.listas[VD.LISTA_FALTA];
  var txtAviso = res.avisos.length ? '\nℹ️ ' + res.avisos.join('; ') : '';

  var soTipo = faltas.length > 0 && faltas.every(function (f) { return /falta (marcar )?o tipo de peça/.test(f); });
  if (faltas.length) {
    res.acao = card.idList === idFalta ? 'continua em FALTA DADOS' : 'vai para FALTA DADOS';
    if (ctx.modoAtivo) {
      if (card.idList !== idFalta) vd_mover_(card, idFalta, 'top');
      if (sigAtual !== sigAnterior) {
        var quem = vd_criador_(card.id);
        vd_comentar_(card, (quem ? '@' + quem + ' ' : '') + '⚠️ **FALTA DADOS' + (base ? ' (PEÇA NOVA)' : '') + '** — corrigir para seguir:\n' +
          faltas.map(function (f) { return '- ' + f; }).join('\n') +
          (res.importado ? '\n' + res.importado.texto : '') +
          (res.preenchido.length ? '\n🤖 Lido dos anexos: ' + res.preenchido.join(', ') : '') + txtAviso +
          (ctx.urlForm ? '\n✏️ ' + ctx.urlForm + '?card=' + card.shortLink + (soTipo ? '&so=tipos' : '') : ''));
        props.setProperty(chaveSig, sigAtual);
      }
    }
  } else {
    res.acao = card.idList === idFalta ? 'volta para EM COTAÇÃO' : 'ok';
    if (ctx.modoAtivo) {
      if (card.idList === idFalta) {
        vd_mover_(card, idCot, 'bottom');
        vd_comentar_(card, '✅ **DADOS COMPLETOS** → **EM COTAÇÃO**' + (res.importado ? '\n' + res.importado.texto : '') + (res.preenchido.length ? '\n🤖 Lido dos anexos: ' + res.preenchido.join(', ') : '') + txtAviso);
      } else if (res.importado) {
        vd_comentar_(card, '✅ **DADOS COMPLETOS**\n' + res.importado.texto + txtAviso);
      } else if (sigAnterior !== sigAtual && (res.preenchido.length || res.avisos.length)) {
        vd_comentar_(card, '✅ **DADOS COMPLETOS**' + (res.preenchido.length ? ' · 🤖 lido dos anexos: ' + res.preenchido.join(', ') : '') + txtAviso);
      }
      props.setProperty(chaveSig, sigAtual);
      // pedido só com peças da seguradora (FO): não tem o que cotar -> FALTA CHEGAR
      if (!an.pecas.length) { try { var mv = rc_reavaliarColuna_(card.id, null, 'robô'); if (mv) res.acao = '→ ' + mv; } catch (e) { console.log('só FO: ' + e); } }
    }
  }
  return res;
}

/**
 * Importa o orçamento anexado para um card criado direto no Trello:
 *  - peças da OFICINA viram a lista PEÇAS (tipo em branco: o consultor marca no formulário);
 *  - peças da SEGURADORA vão para o checklist FORNECIMENTO (CÓDIGO DESCRIÇÃO);
 *  - o texto antigo do card desce para baixo da linha de cotação (nada é apagado; backup na planilha);
 *  - título ajustado para PLACA CARRO COR SEGURADORA.
 */
function vd_importarOrcamento_(card, an, lido, ctx) {
  var o = lido.orcamento;
  var d = an.dados;
  var dados = { modelo: d.modelo, ano: d.ano, motor: d.motor, chassi: d.chassi, placa: d.placa };
  var extra = {
    cor: d.cor || (lido.cor && lido.cor.v) || '',
    seguradora: d.seguradora || (lido.seguradora && lido.seguradora.v) || '',
    sinistro: d.sinistro || (lido.sinistro && lido.sinistro.v) || '',
    fo: o.fo,
    origemOrc: o.origem
  };
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  var bloco = vd_montarBloco_(dados, o.oficina, '', 'Peças importadas pelo robô do anexo ' + o.anexo + ' em ' + agora, extra);
  var div = an.div;
  var antigo = String(div.bloco || '').trim();
  var nota = antigo ? '_(texto que estava no card antes da importação)_\n' + antigo : '';
  var resto;
  if (div.temMarcador) {
    var lr = String(div.resto).split('\n');
    if (nota) lr.splice(1, 0, nota + '\n');
    resto = lr.join('\n');
  } else {
    resto = VD.MARCADOR + (nota ? '\n' + nota : '');
  }
  var partes = vdf_partesTitulo_(card.name, { modelo: d.modelo || (lido.modelo && lido.modelo.v) || '', cor: extra.cor, seguradora: d.tipo === 'PARTICULAR' ? 'PARTICULAR' : extra.seguradora });
  extra.tipo = d.tipo;
  var titulo = partes.carro ? vd_titulo_(d.placa, partes.carro, partes.cor || extra.cor, partes.seguradora || extra.seguradora) : '';
  var texto = '📄 Orçamento ' + o.origem + ' importado: ' + o.oficina.length + ' peça(s) oficina' +
    (o.oficina.length ? ' (marcar o tipo)' : '') + (o.fo.length ? ' · ' + o.fo.length + ' FO no checklist FORNECIMENTO' : '');
  if (!ctx.modoAtivo) return { texto: texto, titulo: titulo };

  vd_backup_(card, 'orçamento importado pelo robô (' + o.origem + ')');
  var upd = { desc: bloco + '\n\n' + resto };
  if (titulo && titulo !== card.name) upd.name = titulo;
  vd_gravarDesc_(card.id, upd.desc, null, upd.name ? { name: upd.name } : null);
  card.desc = upd.desc;
  if (upd.name) card.name = upd.name;
  try { vdf_checklistFornecimento_(card.id, o.fo); } catch (e) {}
  return { texto: texto, titulo: titulo };
}

/**
 * Cards das colunas depois de EM COTAÇÃO: não confere a descrição antiga.
 * Só se aparecer peça NOVA no bloco "PEÇAS:" — confere essa peça e devolve o card
 * para EM COTAÇÃO (completa) ou FALTA DADOS (incompleta).
 */
function vd_conferirPosCotacao_(card, ctx) {
  var props = PropertiesService.getScriptProperties();
  var res = { card: card.name, url: card.shortUrl, acao: '', faltas: [], preenchido: [], avisos: [] };
  if (/^\s*AVISO\b/i.test(card.name || '') || /NOVO PEDIDO DE PE[ÇC]A/i.test(card.name || '')) { res.acao = 'ignorado'; return res; }

  var div = vd_dividir_(card.desc);
  var linhas = vd_linhasConsultor_(div.bloco);
  var sigs = linhas.map(vd_sigItem_);
  var sigsPecas = vd_linhasPecas_(div.bloco).linhas.map(vd_sigItem_);
  var chavePK = 'VD_PK2_' + card.id;
  var baseTxt = props.getProperty(chavePK);

  // card voltou a andar depois de uma peça nova: encerra o "modo peça nova"
  props.deleteProperty('VD_NOVAS_' + card.id);

  // linhas "COMPRADO: FORNECEDOR - CÓDIGO DESCRIÇÃO - R$ valor - dd/mm" -> checklist PAGAS
  var compras = vd_comprasDaDescricao_(card.desc);
  if (compras.length && ctx.modoAtivo) {
    try { res.pagas = vd_checklistPagas_(card.id, compras); } catch (e) { res.avisos.push('PAGAS: ' + e.message); }
  }

  if (baseTxt === null) { vd_pkSet_(card.id, sigs); res.acao = res.pagas ? 'pagas' : 'base registrada'; return res; }
  var base = JSON.parse(baseTxt).map(vd_pkH_), sigsH = sigs.map(vd_pkH_);
  var novas = [];
  linhas.forEach(function (l, i) { if (base.indexOf(sigsH[i]) < 0) novas.push(l); });
  if (!novas.length) {
    if (baseTxt !== JSON.stringify(sigsH)) vd_pkSet_(card.id, sigs);
    res.acao = res.pagas ? 'pagas' : 'sem peça nova';
    return res;
  }

  var faltas = [];
  var nomes = novas.map(function (l, i) {
    if (l.indexOf('|') < 0 && !/^PNEUS?\b/i.test(l)) {
      // texto livre acima da linha de cotação: trata como pedido novo fora do padrão
      faltas.push('linha nova fora do padrão: «' + l.slice(0, 80) + '» — se for peça nova, use o formulário (CÓDIGO | DESCRIÇÃO | TIPO); se for só observação, escreva abaixo da linha "=== COTAÇÃO ==="');
      return l.slice(0, 60);
    }
    var p = vd_analisarPeca_(l, i + 1);
    p.faltas.forEach(function (f) { faltas.push(f.replace(/^item \d+/, 'peça nova')); });
    return p.pneu ? 'PNEU ' + p.medida : (p.descricao + (p.codigo ? ' ' + p.codigo : '') + (p.tipos && p.tipos.length ? ' (' + p.tipos.join('/') + ')' : ''));
  });
  res.faltas = faltas;
  res.acao = faltas.length ? 'peça nova incompleta → FALTA DADOS' : 'peça nova → volta para EM COTAÇÃO';

  // base = as peças que já existiam; a partir de agora só as peças novas são conferidas
  var basePecas = sigsPecas.filter(function (s) { return base.indexOf(s) >= 0; });
  props.setProperty('VD_NOVAS_' + card.id, JSON.stringify(basePecas));
  vd_pkSet_(card.id, sigs);
  if (!ctx.modoAtivo) { props.deleteProperty('VD_NOVAS_' + card.id); return res; }

  var listaDe = card.idList;
  var nomeLista = '';
  Object.keys(ctx.listas).forEach(function (k) { if (ctx.listas[k] === listaDe) nomeLista = k; });
  if (faltas.length) {
    vd_mover_(card, ctx.listas[VD.LISTA_FALTA], 'top');
    var quem = vd_criador_(card.id);
    vd_comentar_(card, (quem ? '@' + quem + ' ' : '') + '🆕 **PEÇA NOVA** (estava em ' + nomeLista + ') → **FALTA DADOS**: ' + nomes.join('; ') +
      '\n' + faltas.map(function (f) { return '- ' + f; }).join('\n') + (ctx.urlForm ? '\n✏️ ' + ctx.urlForm + '?card=' + card.shortLink : ''));
    props.setProperty('VD_SIG_' + card.id, faltas.join('|'));
  } else {
    vd_mover_(card, ctx.listas[VD.LISTA_COTACAO], 'top');
    vd_comentar_(card, '🆕 **PEÇA NOVA** (estava em ' + nomeLista + ') → **EM COTAÇÃO**: ' + nomes.join('; '));
    props.setProperty('VD_SIG_' + card.id, 'OK');
  }
  return res;
}

function vd_contexto_() {
  var board = vd_board_();
  var url = vd_prop_('VD_URL_FORM', VD.URL_FORM);
  return {
    board: board,
    listas: vd_listas_(board),
    modoAtivo: vd_modo_() === 'ATIVO',
    prazo: Date.now() + VD.LIMITE_MS,
    urlForm: url
  };
}

function vd_cardsDasListas_(ids, comAnexos) {
  var cards = [];
  ids.forEach(function (idL) {
    var q = { fields: 'name,desc,idList,shortLink,shortUrl,dateLastActivity,labels' };
    if (comAnexos) { q.attachments = 'true'; q.attachment_fields = 'name,mimeType,isUpload,bytes,url'; }
    cards = cards.concat(vd_api_('/lists/' + idL + '/cards', { query: q }));
  });
  return cards;
}

function vd_cardsParaConferir_(ctx) {
  var ids = [ctx.listas[VD.LISTA_COTACAO], ctx.listas[VD.LISTA_FALTA]].filter(String);
  if (ids.length < 2) throw new Error('Quadro ' + ctx.board + ' sem as colunas "' + VD.LISTA_COTACAO + '" e "' + VD.LISTA_FALTA + '".');
  return vd_cardsDasListas_(ids, true);
}

function vd_listasPosCotacao_(ctx) {
  return Object.keys(ctx.listas).filter(function (n) { return VD.LISTAS_FORA.indexOf(n) < 0; }).map(function (n) { return ctx.listas[n]; });
}

function vd_marcar_(card) {
  try { cf_sincronizar_(card.id); } catch (e) {}   // campos personalizados antes de marcar (a gravação mexe na atividade)
  try {
    var atual = vd_api_('/cards/' + card.id, { query: { fields: 'dateLastActivity,idList' } });
    PropertiesService.getScriptProperties().setProperty('VD_AT_' + card.id, atual.dateLastActivity + '|' + atual.idList);
  } catch (e) {}
}

/* Links do formulário anexados no card (para quem abre o card sem o Power-Up, ex.: celular). */
var VD_LINK = {
  EDITAR: '✏️ EDITAR/INCLUIR PEÇA',
  COMPRA: '💰 COTAÇÃO/COMPRA/RECEBIMENTO',
  RX_EDITAR: /Editar pe[çc]as|EDITAR\/INCLUIR PE[ÇC]A/i,
  RX_COMPRA: /Cota[çc][ãa]o \/ Compra|COTA[ÇC][ÃA]O\/COMPRA/i
};

/**
 * Garante em TODOS os cards abertos do quadro os dois links do formulário
 * ("✏️ Editar peças" e "💰 Cotação / Compra"). Roda no máximo a cada 15 min.
 */
function vd_garantirLinks_(forcar) {
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var props = PropertiesService.getScriptProperties();
  var ultimo = +(props.getProperty('VD_LINKS_EM') || 0);
  if (!forcar && Date.now() - ultimo < 60 * 60 * 1000) return 0;   // o formulário já anexa os links ao criar o card
  props.setProperty('VD_LINKS_EM', String(Date.now()));
  var urlForm = vd_prop_('VD_URL_FORM', VD.URL_FORM);
  if (!urlForm) return 0;
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { query: { fields: 'name,shortLink', attachments: 'true', attachment_fields: 'name,url' } });
  var n = 0;
  cards.forEach(function (c) {
    if (/^\s*AVISO\b/i.test(c.name || '') || /NOVO PEDIDO DE PE[ÇC]A/i.test(c.name || '')) return;
    if (vd_legado_(c.id)) return;   // card antigo: segue o jeito antigo
    var ans = c.attachments || [];
    var temEditar = false, temCompra = false;
    try {
      ans.forEach(function (a) {
        var ed = VD_LINK.RX_EDITAR.test(a.name || ''), co = VD_LINK.RX_COMPRA.test(a.name || '');
        if (!ed && !co) return;
        // nome antigo ("Editar peças (formulário)" / "Cotação / Compra (formulário)"): troca pelo nome novo
        if ((ed && a.name !== VD_LINK.EDITAR) || (co && a.name !== VD_LINK.COMPRA)) { vd_api_('/cards/' + c.id + '/attachments/' + a.id, { method: 'delete' }); return; }
        if (ed) temEditar = true; else temCompra = true;
      });
      if (!temEditar) { vd_api_('/cards/' + c.id + '/attachments', { method: 'post', payload: { url: urlForm + '?card=' + c.shortLink, name: VD_LINK.EDITAR, setCover: false } }); n++; }
      if (!temCompra) { vd_api_('/cards/' + c.id + '/attachments', { method: 'post', payload: { url: urlForm + '?card=' + c.shortLink + '&modo=compras', name: VD_LINK.COMPRA, setCover: false } }); n++; }
    } catch (e) {}
  });
  console.log('links do formulário incluídos: ' + n);
  return n;
}

/** Roda na mão: põe os links em todos os cards agora. */
function vd_garantirLinksAgora() { return vd_garantirLinks_(true); }

/** Roda na mão (uma vez): grava VD_URL_FORM = VD.URL_FORM e troca, em todos os cards do quadro,
 *  os links "Editar peças" / "Cotação / Compra" que ainda apontam para outra URL. */
function vd_trocarLinksFormulario() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('VD_URL_FORM', VD.URL_FORM);
  var urlForm = VD.URL_FORM;
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { query: { fields: 'name,shortLink', attachments: 'true', attachment_fields: 'name,url' } });
  var trocados = 0;
  cards.forEach(function (c) {
    if (/^\s*AVISO\b/i.test(c.name || '') || /NOVO PEDIDO DE PE[ÇC]A/i.test(c.name || '')) return;
    (c.attachments || []).forEach(function (a) {
      var nome = a.name || '', url = String(a.url || '');
      var editar = VD_LINK.RX_EDITAR.test(nome), compra = VD_LINK.RX_COMPRA.test(nome);
      if (!editar && !compra) return;
      if (url.indexOf(urlForm) === 0) return;
      try {
        vd_api_('/cards/' + c.id + '/attachments/' + a.id, { method: 'delete' });
        vd_api_('/cards/' + c.id + '/attachments', { method: 'post', payload: {
          url: urlForm + '?card=' + c.shortLink + (compra ? '&modo=compras' : ''),
          name: compra ? VD_LINK.COMPRA : VD_LINK.EDITAR, setCover: false } });
        trocados++;
      } catch (e) { console.log('falhou em ' + c.name + ': ' + e.message); }
    });
  });
  console.log('VD_URL_FORM = ' + urlForm + ' | links trocados: ' + trocados);
  return trocados;
}

/* Correção única (05/10/2026): entre 02/10 e 05/10 o caminho incremental do núcleo lia os cards com cru e gravava em
 * VD_PK2_ a assinatura das linhas da VITRINE. Com a leitura certa (completa), essas bases acusariam todas as linhas
 * como "peça nova". Regrava a base de todos os cards das colunas pós-cotação a partir da descrição completa. */
function vd_pkRebasear_(posCot, ctx) {
  var props = PropertiesService.getScriptProperties(), k = 'VD_PK2_REBASE';
  if (props.getProperty(k) === '2026-10-05c') return;
  // rodada c: também EM COTAÇÃO / FALTA DADOS (o RAM9I31 estava lá na rodada b e ficou com a base da vitrine)
  var listas = posCot.concat([ctx.listas[VD.LISTA_COTACAO], ctx.listas[VD.LISTA_FALTA]].filter(String));
  var cards = vd_cardsDasListas_(listas, false), n = 0, leg = 0, semCmp = 0, mapa = vd_completasTodas_();
  cards.forEach(function (c) {
    if (!mapa[c.id]) semCmp++;
    if (vd_legado_(c.id)) { leg++; return; }
    var sigs = vd_linhasConsultor_(vd_dividir_(c.desc).bloco).map(vd_sigItem_);
    vd_pkSet_(c.id, sigs);
    props.deleteProperty('VD_NOVAS_' + c.id);
    n++;
  });
  props.setProperty(k, '2026-10-05c');
  console.log('rebase VD_PK2: ' + n + ' card(s) das colunas pós-cotação regravados a partir da descrição completa · ' + cards.length + ' cards em ' + listas.length + ' colunas · ' + leg + ' legado(s) · ' + semCmp + ' sem completa na TRAVA · completas na TRAVA: ' + Object.keys(mapa).length + ' · virada ' + new Date(vd_viradaMs_()).toLocaleString('pt-BR'));
}

/** Execução principal (acionador de 1 em 1 min). */
function vd_executarNucleo_() {
  if (!vd_ligado_()) return [];
  var ctx = vd_contexto_();
  var props = PropertiesService.getScriptProperties();
  var out = [];
  var mudou = function (c) { return props.getProperty('VD_AT_' + c.id) !== c.dateLastActivity + '|' + c.idList; };

  // Quais cards olhar: só os que tiveram atividade desde o último ciclo (histórico do quadro).
  // A cada 30 min (e na 1ª vez) faz a varredura completa das colunas, por segurança.
  var posCot = vd_listasPosCotacao_(ctx), idCot = [ctx.listas[VD.LISTA_COTACAO], ctx.listas[VD.LISTA_FALTA]].filter(String);
  var marca = vd_marca_('NU_ACT'), inicio = new Date().toISOString();
  try { vd_pkRebasear_(posCot, ctx); } catch (e) { console.log('rebase: ' + e); }   // uma vez: bases gravadas da vitrine (02–05/10) voltam a ser da completa
  var completa = !marca || new Date().getMinutes() % 30 === 0 || !ctx.modoAtivo;
  var listaPos = null, listaCot = null;
  if (!completa) {
    try {
      var acts = vd_api_('/boards/' + ctx.board + '/actions', { cru: true, query: { since: new Date(new Date(marca).getTime() - 5000).toISOString(), limit: 1000, fields: 'data' } }) || [];
      var ids = [];
      acts.forEach(function (a) { var id = a.data && a.data.card && a.data.card.id; if (id && ids.indexOf(id) < 0 && !vd_legado_(id)) ids.push(id); });
      listaPos = []; listaCot = [];
      ids.forEach(function (id) {
        if (Date.now() > ctx.prazo) return;
        var c;
        // SEM cru: a desc precisa ser a COMPLETA (a vitrine do Trello não tem o bloco PEÇAS). Com cru (02/10 a 05/10) o robô
        // comparava a vitrine com a base e acusava "PEÇA NOVA fora do padrão" em card que só ganhou cotação (RAM9I31, TST9Z99).
        try { c = vd_api_('/cards/' + id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,dateLastActivity,labels,closed', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url' } }); } catch (e) { return; }
        if (!c || c.closed) return;
        if (posCot.indexOf(c.idList) >= 0) listaPos.push(c);
        else if (idCot.indexOf(c.idList) >= 0) listaCot.push(c);
      });
    } catch (e) { console.log('núcleo/histórico: ' + e); completa = true; listaPos = listaCot = null; }
  }
  if (completa) { listaPos = vd_cardsDasListas_(posCot, false); listaCot = vd_cardsParaConferir_(ctx); }
  vd_marcaSet_('NU_ACT', inicio);

  // 1) colunas depois de EM COTAÇÃO: só peça nova
  listaPos.forEach(function (c) {
    if (Date.now() > ctx.prazo || !mudou(c)) return;
    if (vd_legado_(c.id)) return;   // card antigo: segue o jeito antigo
    var r = vd_conferirPosCotacao_(c, ctx);
    if (r.acao !== 'base registrada' && r.acao !== 'sem peça nova' && r.acao !== 'ignorado') { out.push(r); vd_marcar_(c); }
    else props.setProperty('VD_AT_' + c.id, c.dateLastActivity + '|' + c.idList);
  });

  // 2) EM COTAÇÃO e FALTA DADOS: conferência completa (ou só da peça nova)
  listaCot.forEach(function (c) {
    if (Date.now() > ctx.prazo) return;
    if (!mudou(c) && ctx.modoAtivo) return;
    if (vd_legado_(c.id)) return;   // card antigo: segue o jeito antigo
    out.push(vd_conferirCard_(c, ctx));
    if (ctx.modoAtivo) vd_marcar_(c);
  });
  return out;
}

/** Função do acionador. Usa o alarme de falhas das rotinas antigas, se existir. */
function validarDadosPedido() {
  if (qt_pausada_()) { console.log('ciclo pulado: ' + qt_resumoPausa_()); return; }   // cota estourada: não gasta chamada nem tempo
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    try { qt_retomarSePreciso_(); } catch (e) {}   // voltou de uma pausa por cota: não desfaz o que a equipe fez à mão nesse período
    // migração única: acionadores de 1 em 1 minuto (log de descrição + validação)
    var pp = PropertiesService.getScriptProperties();
    if (pp.getProperty('VD_ACIONADORES_1MIN') !== 'SIM') {
      try { instalarAcionador(); vd_instalarAcionador(); pp.setProperty('VD_ACIONADORES_1MIN', 'SIM'); } catch (e) { console.log('acionadores: ' + e); }
    }
    var rodar = function () {
      sd_parte_('trava de descrição', tr_executar_);   // antes de tudo: desfaz edição manual
      sd_parte_('trava de colunas', st_executar_);     // e movimento manual fora do fluxo
      sd_parte_('trava de checklist', ck_executar_);   // e checklist mexido à mão
      sd_parte_('exclusão', exc_executar_);
      sd_parte_('faturamento', fat_executar_);           // comentário "faturado" arquiva (substitui o Butler)            // card excluído por quem não é admin volta
      var t0n = Date.now(), out = [];
      qt_parte_('núcleo');
      try { out = vd_executarNucleo_(); } finally { qt_parte_(''); }
      if (Date.now() - t0n > 1500) SD_TEMPOS.push('núcleo ' + ((Date.now() - t0n) / 1000).toFixed(1) + 's');
      sd_parte_('complemento', cp_executar_);          // orçamento complementar anexado no card
      if (new Date().getMinutes() % 5 === 0) sd_parte_('prazos', pz_executar_);   // baixa todos os checklists: a cada 5 min basta
      sd_parte_('prazos por etapa', sla_executar_);
      sd_parte_('relatório', rel_instalarSeFaltar_);
      sd_parte_('links', function () { return vd_garantirLinks_(); });
      sd_parte_('alarme diário', sd_instalarSeFaltar_);
      sd_batida_();
      if (QT_N > 60) SD_TEMPOS.push('chamadas ' + QT_N + ' (' + Object.keys(QT_PARTES).map(function (k) { return k + ' ' + QT_PARTES[k]; }).join(', ') + ')');
      if (SD_TEMPOS.length) {
        console.log('tempos: ' + SD_TEMPOS.join(' · '));
        try {
          var lg = JSON.parse(pp.getProperty('SD_TEMPOS_LOG') || '[]');
          lg.push(Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'HH:mm') + ' ' + SD_TEMPOS.join(' · '));
          pp.setProperty('SD_TEMPOS_LOG', JSON.stringify(lg.slice(-40)));
        } catch (e) {}
      }
      return out;
    };
    if (typeof comAlarme_ === 'function') return comAlarme_('validarDadosPedido', rodar);
    return rodar();
  } finally { lock.releaseLock(); try { qt_registrar_('ciclo'); } catch (e) {} }
}

/** Roda uma vez agora e mostra o resultado no registro (para testes). */
function vd_rodarAgora() {
  // mesma trava do acionador automático: nunca rodar duas conferências ao mesmo tempo (duplicava o FORNECIMENTO)
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(60000)) { Logger.log('O robô já está rodando — tente de novo em 1 minuto.'); return; }
  var out;
  try { out = vd_executarNucleo_(); } finally { lock.releaseLock(); }
  out.forEach(function (r) {
    Logger.log(r.card + ' → ' + r.acao +
      (r.preenchido.length ? ' | preenchido: ' + r.preenchido.join(', ') : '') +
      (r.faltas.length ? '\n    faltas: ' + r.faltas.join(' ; ') : '') +
      (r.avisos && r.avisos.length ? '\n    avisos: ' + r.avisos.join(' ; ') : ''));
  });
  Logger.log('Cards conferidos: ' + out.length);
}

/** Relatório SEM mexer em nada no Trello (grava na aba "relatorio" da planilha de backup). */
function vd_relatorioSemAlterar() {
  var ctx = vd_contexto_();
  ctx.modoAtivo = false;
  var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('VD_PLANILHA_BACKUP') || vd_planilhaBackup_().getParent().getId());
  var sh = ss.getSheetByName('relatorio') || ss.insertSheet('relatorio');
  sh.clear();
  sh.appendRow(['Card', 'Ação', 'Leria do anexo', 'Faltas', 'Avisos']);
  vd_cardsParaConferir_(ctx).forEach(function (c) {
    if (Date.now() > ctx.prazo) return;
    var r = vd_conferirCard_(c, ctx);
    sh.appendRow([r.card, r.acao, r.preenchido.join(', '), r.faltas.join(' ; '), (r.avisos || []).join(' ; ')]);
  });
  Logger.log('relatório pronto: ' + ss.getUrl());
}

/** Limpa caches da validação (marcas de conferência, leitura de anexos, assinaturas). Não apaga a base de peças. */
function vd_limparCache() {
  var props = PropertiesService.getScriptProperties();
  Object.keys(props.getProperties()).forEach(function (k) {
    if (/^VD_(AT|SIG|ANX\d*|PK)_/.test(k)) props.deleteProperty(k);
  });
}

function vd_instalarAcionador() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'validarDadosPedido') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('validarDadosPedido').timeBased().everyMinutes(1).create();
}

function vd_removerAcionador() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'validarDadosPedido') ScriptApp.deleteTrigger(t);
  });
}

/** Função de teste usada no editor (roda uma vez e registra o resultado). */
function vd_testeDrive() {
  vd_rodarAgora();
}


/* ============================ PRAZO DO CARD + ATRASADO (a cada minuto) ============================ */

var PZ = {
  LISTAS_FORA: ['ESPERA/NÃO AUTORIZADO', 'FALTA DADOS PARA COTAR', 'EM COTAÇÃO', 'COTAÇÃO FINALIZADA', 'ENTREGUES', 'ENCERRADO COMPRAS/FORNEC.'],
  LBL_ATRASADO: 'ATRASADO',
  COR_ATRASADO: 'orange',
  LIMITE_MS: 40 * 1000
};

function pz_labelId_(board, nome, cor) {
  var cache = CacheService.getScriptCache();
  var k = 'pz_lbl_' + board + '_' + nome;
  var id = cache.get(k);
  if (id) return id;
  var labels = vd_api_('/boards/' + board + '/labels', { query: { fields: 'name,color', limit: 100 } });
  var l = labels.filter(function (x) { return (x.name || '').trim().toUpperCase() === nome; })[0];
  if (!l) l = vd_api_('/boards/' + board + '/labels', { method: 'post', payload: { name: nome, color: cor } });
  cache.put(k, l.id, 21600);
  return l.id;
}

function pz_hoje_() {
  var d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function pz_diaLocal_(iso) {
  var d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function pz_fmt_(iso) { return Utilities.formatDate(new Date(iso), 'America/Sao_Paulo', 'dd/MM'); }

/**
 * Para cada card que mudou desde a última passada (fora das colunas de cotação/entregue):
 *  - prazo do card = maior previsão entre os itens de checklist ainda não marcados
 *    (se nenhum pendente tem data, maior previsão geral);
 *  - etiqueta ATRASADO quando um item do checklist FORNECIMENTO passou da previsão sem estar marcado;
 *    a etiqueta sai sozinha quando o item é marcado ou a data é ajustada.
 */
function pz_executar_() {
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO') return;
  var board = vd_board_();
  var props = PropertiesService.getScriptProperties();
  var fim = Date.now() + PZ.LIMITE_MS;
  var listas = vd_listas_(board);
  var fora = PZ.LISTAS_FORA.map(function (n) { return listas[n]; }).filter(String);
  var idAtrasado = null;
  var cards = vd_api_('/boards/' + board + '/cards', { query: {
    fields: 'name,idList,idLabels,due,dateLastActivity,shortLink',
    checklists: 'all', checklist_fields: 'name', checkItem_fields: 'state,due,name'
  } });
  var hoje = pz_hoje_();
  var n = 0;
  cards.forEach(function (c) {
    if (Date.now() > fim) return;
    if (fora.indexOf(c.idList) >= 0) return;
    if (vd_legado_(c.id)) return;   // card antigo: segue o jeito antigo
    var chave = 'PZ_AT_' + c.id;
    var marca = c.dateLastActivity + '|' + c.idList;
    if (props.getProperty(chave) === marca) return;

    var pend = [], todos = [], vencidosFO = [];
    (c.checklists || []).forEach(function (ck) {
      var ehFO = /FORNECIMENTO/i.test(ck.name || '');
      (ck.checkItems || []).forEach(function (it) {
        if (!it.due) return;
        todos.push(it);
        if (it.state === 'complete') return;
        pend.push(it);
        if (ehFO && pz_diaLocal_(it.due) < hoje) vencidosFO.push(it);
      });
    });
    var melhor = null;
    (pend.length ? pend : todos).forEach(function (it) { var t = new Date(it.due).getTime(); if (melhor === null || t > melhor) melhor = t; });
    var mudou = false;
    if (melhor !== null) {
      var atual = c.due ? new Date(c.due).getTime() : 0;
      if (Math.abs(atual - melhor) > 43200000) {
        vd_api_('/cards/' + c.id, { method: 'put', payload: { due: new Date(melhor).toISOString(), dueComplete: false } });
        mudou = true;
      }
    }
    // etiqueta ATRASADO
    if (vencidosFO.length || (c.idLabels || []).length) {
      if (idAtrasado === null) idAtrasado = pz_labelId_(board, PZ.LBL_ATRASADO, PZ.COR_ATRASADO);
      var tem = (c.idLabels || []).indexOf(idAtrasado) >= 0;
      if (vencidosFO.length && !tem) {
        vd_api_('/cards/' + c.id + '/idLabels', { method: 'post', payload: { value: idAtrasado } });
        vd_comentar_(c, '⏰ Fornecimento atrasado — verificar prazo do item ' +
          vencidosFO.map(function (it) { return it.name + ' (previsão ' + pz_fmt_(it.due) + ')'; }).join(', ') + '.');
        mudou = true;
      } else if (!vencidosFO.length && tem) {
        vd_api_('/cards/' + c.id + '/idLabels/' + idAtrasado, { method: 'delete' });
        mudou = true;
      }
    }
    if (mudou) n++;
    // marca: se mexemos no card, a atividade mudou; pega a nova para não reprocessar
    var nova = marca;
    if (mudou) { try { var c2 = vd_api_('/cards/' + c.id, { query: { fields: 'dateLastActivity,idList' } }); nova = c2.dateLastActivity + '|' + c2.idList; } catch (e) {} }
    props.setProperty(chave, nova);
  });
  return n;
}

/** Roda a passada de prazos uma vez, agora (teste no editor). */
function pz_rodarAgora() { Logger.log('cards ajustados: ' + pz_executar_()); }


/* ============================ RELATÓRIO DIÁRIO DE EXCEÇÕES (e-mail 7h) ============================ */

var REL = {
  EMAILS: 'weslley.santos@unitycs.com.br,christian.farias@unitycs.com.br',
  DIAS_FALTA_DADOS: 1,
  DIAS_PAGAS: 10,
  DIAS_ENTREGUES: 5,
  LISTA_FALTA: 'FALTA DADOS PARA COTAR',
  LISTA_ENTREGUES: 'ENTREGUES',
  LISTAS_ENCERRADAS: ['ENTREGUES', 'ENCERRADO COMPRAS/FORNEC.', 'ESPERA/NÃO AUTORIZADO'],
  UNIDADES: [['TOLEDO', /\bTOL\b|TOLEDO/i], ['MARECHAL RONDON', /\bMCR\b|RONDON/i], ['CASCAVEL', /\bCVEL\b|CASCAVEL/i], ['CAMPO MOURÃO', /\bCMO?\b|MOUR/i]]
};

function rel_unidade_(card) {
  var nomes = (card.labels || []).map(function (l) { return l.name || ''; }).join(' ');
  for (var i = 0; i < REL.UNIDADES.length; i++) if (REL.UNIDADES[i][1].test(nomes)) return REL.UNIDADES[i][0];
  return 'SEM UNIDADE';
}
function rel_dias_(ms) { return Math.floor((Date.now() - ms) / 864e5); }
function rel_criacaoId_(id) { return 1000 * parseInt(String(id).substring(0, 8), 16); }
function rel_esc_(s) { return String(s || '').replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

/** Monta as exceções do quadro: {unidade: {foVencido:[], pagas:[], faltaDados:[], entregues:[]}} */
function rel_coletar_() {
  var board = vd_prop_('REL_BOARD', vd_board_());
  var listas = vd_listas_(board);
  var nomeLista = {}; Object.keys(listas).forEach(function (n) { nomeLista[listas[n]] = n; });
  var cards = vd_api_('/boards/' + board + '/cards', { query: {
    fields: 'name,idList,labels,due,dateLastActivity,shortUrl',
    checklists: 'all', checklist_fields: 'name', checkItem_fields: 'state,due,name'
  } });
  var hoje = pz_hoje_();
  var por = {};
  var add = function (card, tipo, txt) {
    var u = rel_unidade_(card);
    por[u] = por[u] || { foVencido: [], pagas: [], faltaDados: [], entregues: [] };
    por[u][tipo].push({ card: card.name, url: card.shortUrl, txt: txt });
  };
  cards.forEach(function (c) {
    if (/^\s*AVISO\b/i.test(c.name) || /NOVO PEDIDO DE PE[ÇC]A/i.test(c.name)) return;
    var lista = nomeLista[c.idList] || '';
    var diasParado = rel_dias_(new Date(c.dateLastActivity).getTime());
    if (lista === REL.LISTA_FALTA && diasParado >= REL.DIAS_FALTA_DADOS) add(c, 'faltaDados', 'parado há ' + diasParado + ' dia(s)');
    if (lista === REL.LISTA_ENTREGUES && diasParado >= REL.DIAS_ENTREGUES) add(c, 'entregues', 'há ' + diasParado + ' dia(s) sem faturar');
    if (REL.LISTAS_ENCERRADAS.indexOf(lista) >= 0) return;
    (c.checklists || []).forEach(function (ck) {
      var ehFO = /FORNECIMENTO/i.test(ck.name || ''), ehPagas = /^PAGAS/i.test((ck.name || '').trim());
      (ck.checkItems || []).forEach(function (it) {
        if (it.state === 'complete') return;
        if (ehFO && it.due && pz_diaLocal_(it.due) < hoje) {
          add(c, 'foVencido', it.name + ' — previsão ' + pz_fmt_(it.due) + ' (' + rel_dias_(new Date(it.due).getTime()) + ' dia(s) atrás)');
        }
        if (ehPagas) {
          var d = rel_dias_(rel_criacaoId_(it.id));
          if (d >= REL.DIAS_PAGAS) add(c, 'pagas', it.name + ' — comprado há ' + d + ' dia(s), ainda não chegou/sem nota');
        }
      });
    });
  });
  return por;
}

function rel_html_(por) {
  var secoes = [['foVencido', '⏰ Fornecimento vencido (seguradora) — verificar prazo'], ['pagas', '💳 PAGAS há mais de ' + REL.DIAS_PAGAS + ' dias sem chegar / sem nota'],
    ['faltaDados', '⚠️ FALTA DADOS PARA COTAR parado há ' + REL.DIAS_FALTA_DADOS + '+ dia(s)'], ['entregues', '🧾 ENTREGUES há mais de ' + REL.DIAS_ENTREGUES + ' dias sem faturar']];
  var unidades = Object.keys(por).sort();
  if (!unidades.length) return '<p>Nenhuma exceção hoje. 🎉</p>';
  var h = '';
  unidades.forEach(function (u) {
    var g = por[u], total = g.foVencido.length + g.pagas.length + g.faltaDados.length + g.entregues.length;
    if (!total) return;
    h += '<h2 style="margin:18px 0 6px;font-size:16px">' + rel_esc_(u) + ' <span style="color:#888;font-weight:normal">(' + total + ')</span></h2>';
    secoes.forEach(function (sec) {
      var itens = g[sec[0]];
      if (!itens.length) return;
      h += '<div style="margin:6px 0 2px;font-weight:bold">' + sec[1] + ' — ' + itens.length + '</div><ul style="margin:0 0 8px 18px;padding:0">';
      itens.forEach(function (i) { h += '<li><a href="' + i.url + '">' + rel_esc_(i.card) + '</a>: ' + rel_esc_(i.txt) + '</li>'; });
      h += '</ul>';
    });
  });
  return h || '<p>Nenhuma exceção hoje. 🎉</p>';
}

function rel_enviar_() {
  var por = rel_coletar_();
  var total = 0;
  Object.keys(por).forEach(function (u) { var g = por[u]; total += g.foVencido.length + g.pagas.length + g.faltaDados.length + g.entregues.length; });
  var quadro = vd_prop_('REL_BOARD', vd_board_());
  var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">' +
    '<p>Exceções do quadro <b>Compra de Peça' + (quadro === VD.BOARD_PADRAO ? ' – TESTE' : '') + '</b> em ' + hoje + ' — ' + total + ' item(ns).</p>' +
    rel_html_(por) +
    '<p style="color:#888;font-size:12px;margin-top:18px">Regras: fornecimento vencido = item do checklist FORNECIMENTO com previsão passada e não marcado; PAGAS = item criado há ' + REL.DIAS_PAGAS + '+ dias e não marcado; FALTA DADOS = card sem movimento há ' + REL.DIAS_FALTA_DADOS + '+ dia(s); ENTREGUES = card há ' + REL.DIAS_ENTREGUES + '+ dias na coluna. Enviado pelo robô do Trello (Log de Descricao Trello).</p></div>';
  MailApp.sendEmail({
    to: vd_prop_('REL_EMAILS', REL.EMAILS),
    subject: 'Compra de Peça — exceções do dia ' + hoje + ' (' + total + ')',
    htmlBody: html
  });
  return total;
}

/** Função do acionador diário. */
function relatorioDiario() {
  if (typeof comAlarme_ === 'function') return comAlarme_('relatório diário', rel_enviar_);
  return rel_enviar_();
}

function rel_instalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'relatorioDiario') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('relatorioDiario').timeBased().everyDays(1).atHour(7).nearMinute(15).create();
}

/** Instala o acionador uma única vez (chamado pelo ciclo de 1 min) e manda o primeiro relatório na hora. */
function rel_instalarSeFaltar_() {
  var pp = PropertiesService.getScriptProperties();
  if (pp.getProperty('REL_INSTALADO') === 'SIM') return;
  rel_instalar();
  pp.setProperty('REL_INSTALADO', 'SIM');
  rel_enviar_();
}

/** Envia o relatório agora (teste no editor). */
function rel_enviarAgora() { Logger.log('exceções: ' + rel_enviar_()); }

/* ============================ VITRINE (descrição enxuta) ============================
 * A descrição COMPLETA (formato de sempre, que todo o código lê) fica guardada na planilha TRAVA,
 * coluna E. No Trello aparece só a VITRINE: carro em 2 linhas e, por peça, a situação atual
 * (✅ autorizada, 🛒 comprada, cotações da mais barata para a mais cara, ⛔ não cotada, ⏳ aguardando).
 * Histórico (quem cotou/autorizou/devolveu e quando) fica nos comentários.
 *  - vd_api_ troca a desc dos cards lidos pela completa (opts.cru = true lê o que está no Trello).
 *  - vd_gravarDesc_ recebe a completa, grava a vitrine no Trello e guarda as duas.
 *  - Card fora do padrão (sem "PEÇAS:"), AVISO e card fixo: gravados como vieram, sem vitrine.
 *  - Liga/desliga: propriedade VD_VITRINE (padrão SIM; NAO volta a gravar a descrição completa).
 */
var VD_CMP_MEM = null;   // id -> descrição completa (lida uma vez por execução)

function vd_vitrineLigada_() { return vd_prop_('VD_VITRINE', 'SIM') !== 'NAO'; }

/** Descrição completa guardada de um card ('' se o card ainda não foi convertido). */
function vd_completa_(cardId) {
  if (!cardId) return '';
  if (VD_CMP_MEM && Object.prototype.hasOwnProperty.call(VD_CMP_MEM, cardId)) return VD_CMP_MEM[cardId];
  var cache = CacheService.getScriptCache(), k = 'vd_cmp_' + cardId, v = cache.get(k);
  if (v !== null) return v.slice(1);
  var txt = '';
  try {
    var sh = tr_aba_();
    var cel = sh.getRange('A:A').createTextFinder(cardId).matchEntireCell(true).findNext();
    if (cel) txt = String(sh.getRange(cel.getRow(), 5).getValue() || '');
  } catch (e) { console.log('vitrine/ler: ' + e); }
  try { if (txt.length < 90000) cache.put(k, '#' + txt, 21600); } catch (e) {}
  return txt;
}

/** Carrega de uma vez as completas de todos os cards (para leituras em lote do robô). */
function vd_completasTodas_() {
  if (VD_CMP_MEM) return VD_CMP_MEM;
  VD_CMP_MEM = {};
  try {
    var sh = tr_aba_(), n = sh.getLastRow();
    if (n > 1) {
      var ids = sh.getRange(2, 1, n - 1, 1).getValues(), cs = sh.getRange(2, 5, n - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) VD_CMP_MEM[String(ids[i][0])] = String(cs[i][0] || '');
    }
  } catch (e) { console.log('vitrine/lote: ' + e); }
  return VD_CMP_MEM;
}

/** Troca, no que o Trello devolveu, a desc (vitrine) pela descrição completa guardada. */
function vd_trocarPelaCompleta_(r) {
  if (!r) return r;
  if (Array.isArray(r)) {
    if (!r.some(function (c) { return c && typeof c.desc === 'string' && c.id; })) return r;
    var mapa = vd_completasTodas_();
    r.forEach(function (c) { if (c && c.id && typeof c.desc === 'string' && mapa[c.id]) c.desc = mapa[c.id]; });
    return r;
  }
  if (r.id && typeof r.desc === 'string') { var t = vd_completa_(r.id); if (t) r.desc = t; }
  return r;
}

function vd_tit_(s) { s = String(s || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }
function vd_md_(s) { return String(s || '').replace(/([\\`*_\[\]#>|~])/g, '\\$1'); }

/**
 * Vitrine de uma descrição completa, ou null se o card não está no padrão.
 * pagas = itens do checklist PAGAS [{name, state, due}] (opcional).
 */
function vd_vitrine_(desc, nome, pagas) {
  if (!vd_vitrineLigada_()) return null;
  if (/^\s*AVISO\b/i.test(nome || '') || /NOVO PEDIDO DE PE[ÇC]A/i.test(nome || '')) return null;
  var an = vd_analisar_(desc, nome || '');
  var lp = vd_linhasPecas_(an.div.bloco);
  if (!lp.linhas.length && !lp.semOficina) return null;
  var d = an.dados, bloco = vd_limpar_(an.div.bloco);
  var U = function (s) { return String(s || '').toUpperCase(); };

  // carro em 2 linhas
  var l1 = [];
  if (d.modelo) l1.push(U(d.modelo));
  if (d.ano && U(d.modelo).indexOf(U(d.ano).split('/')[0]) < 0) l1.push(d.ano);
  if (d.motor && !U(d.motor).split(/\s+/).every(function (w) { return U(d.modelo).indexOf(w) >= 0; })) l1.push(U(d.motor));
  if (d.cor) l1.push(U(d.cor));
  l1.push(d.tipo === 'PARTICULAR' ? 'PARTICULAR' : U(d.seguradora));
  var l2 = [d.placa, d.chassi, d.sinistro ? 'SINISTRO ' + d.sinistro : ''];
  var L = ['**' + vd_md_(l1.filter(String).join(' · ')) + '**', vd_md_(l2.filter(String).join(' · '))];

  var obsGeral = vd_campo_(an.div.bloco, 'OBS|OBSERVA[ÇC][ÃA]O');
  if (obsGeral) L.push('📝 ' + vd_md_(obsGeral));

  var cot = { cotacoes: [], nt: [], obs: [], semCot: [] }, auts = [], compras = [], dev = null;
  try { cot = vd_cotacoesDaDescricao_(desc, an.pecas); } catch (e) {}
  try { auts = vd_autorizacoesDaDescricao_(desc, an.pecas); } catch (e) {}
  try { compras = vd_comprasDaDescricao_(desc); } catch (e) {}
  try { dev = vd_ultimaDevolucao_(desc); } catch (e) {}
  if (dev) L.push('', '↩️ **Devolvida para cotação**' + (dev.quem ? ' por ' + vd_md_(dev.quem) : '') + (dev.geral ? ': ' + vd_md_(dev.geral) : ''));

  var prazoTxt = function (q) { return q.dias !== '' && q.dias != null ? q.dias + (+q.dias === 1 ? ' dia útil' : ' dias úteis') : (q.data ? 'até ' + q.data : ''); };
  var linkTxt = function (q) { return q && q.link ? ' · [🔗 anúncio](' + q.link + ')' : ''; };   // link do anúncio informado na cotação (Mercado Livre etc.)
  var fornTxt = function (f) { return String(f || '').replace(/[\s\-–:]+$/, ''); };
  var tipoTxt = function (q) { return [q.tipo ? vd_tit_(q.tipo) : '', q.marca || ''].filter(String).join(' '); };

  L.push('');
  if (!an.pecas.length) L.push('_Sem peças pela oficina._');
  // peças da seguradora primeiro, depois as particulares (cada grupo com título quando há os dois)
  var misto = d.tipo !== 'PARTICULAR' && an.pecas.some(function (x) { return x.particular; }) && an.pecas.some(function (x) { return !x.particular; });
  var ordem = an.pecas.map(function (x, i) { return { p: x, n: i }; });
  ordem = ordem.filter(function (o) { return !o.p.particular; }).concat(ordem.filter(function (o) { return o.p.particular; }));
  var grupoAtual = null;
  ordem.forEach(function (o) {
    var p = o.p, i = o.n;
    if (misto && grupoAtual !== !!p.particular) {
      grupoAtual = !!p.particular;
      L.push((L[L.length - 1] === '' ? '' : '\n') + (grupoAtual ? '**👤 PEÇAS PARTICULARES** _(cliente paga — autoriza o consultor)_' : '**🛡️ PEÇAS DA SEGURADORA**'));
    }
    var k = vd_chavePeca_(p);
    var titulo = p.pneu ? 'PNEU ' + String(p.medida || '').replace(/\s+/g, '') + ((p.marca || p.categoria) ? ' ' + (p.marca || p.categoria) : '') : String(p.descricao || '').toUpperCase();
    var cab = (i + 1) + '. **' + vd_md_(titulo) + '**' + (!p.pneu && p.codigo ? ' · ' + vd_md_(p.codigo) : '') + (p.qtd && +p.qtd > 1 ? ' · QTD ' + p.qtd : '') + (p.particular && d.tipo !== 'PARTICULAR' && !misto ? ' · 👤 PARTICULAR' : '') + (p.complemento && !p.particular ? ' · ➕ complemento' + (p.compData ? ' ' + p.compData : '') : '');
    var sub = [];
    // compra: checklist PAGAS ou linha COMPRADO
    var pg = (pagas || []).filter(function (it) { return k && vd_semAcento_(it.name).indexOf(k) >= 0; }).pop();
    var cp = pg ? null : compras.filter(function (c) {
      var ck = vd_semAcento_((c.codigo || '').replace(/\s+/g, '') || c.descricao);
      return ck && (ck === k || (p.codigo && vd_semAcento_(c.codigo) === vd_semAcento_(p.codigo)) || (!p.codigo && vd_semAcento_(c.descricao).indexOf(vd_semAcento_(p.descricao)) >= 0));
    }).pop();
    var aut = auts.filter(function (a) { return a.chave === k; })[0];
    var minhas = cot.cotacoes.filter(function (q) { return q.chave === k; }).sort(function (a, b) { return a.valor - b.valor; });
    if (pg) {
      var partes = String(pg.name).split(/\s+-\s+/);
      var forn = partes.length >= 3 ? partes[partes.length - 2] : (partes[1] || '');
      var fS = vd_semAcento_(forn);
      if (/R\$/.test(forn) || (k && fS.indexOf(k) >= 0) || (p.descricao && fS.indexOf(vd_semAcento_(p.descricao)) >= 0)) forn = '';
      var val = (partes[partes.length - 1] || '').match(/R\$\s*[\d.,]+/);
      sub.push('🛒 ' + vd_md_([forn, val ? val[0] : '', pg.due ? 'previsão ' + vd_dataCurta_(pg.due) : ''].filter(String).join(' · ')) + (pg.state === 'complete' ? ' ✔' : ''));
    } else if (cp) {
      sub.push('🛒 ' + vd_md_([cp.fornecedor, cp.valor ? 'R$ ' + cp.valor : '', cp.previsao ? 'previsão ' + cp.previsao : ''].filter(String).join(' · ')));
    } else if (aut) {
      var qa = minhas.filter(function (q) { return q.fornecedor === aut.fornecedor && Math.abs(q.valor - aut.valor) < 0.005; })[0] || {};
      sub.push('✅ ' + vd_md_([fornTxt(aut.fornecedor), tipoTxt(qa), vd_valorBR_(aut.valor), prazoTxt(qa)].filter(String).join(' · ')) + linkTxt(qa));
    } else {
      if (!p.pneu && (p.tipos || []).length) cab += ' _(' + p.tipos.map(vd_tit_).join('/') + ')_';
      if (minhas.length) minhas.forEach(function (q) { sub.push(vd_md_([fornTxt(q.fornecedor), tipoTxt(q), vd_valorBR_(q.valor), prazoTxt(q)].filter(String).join(' · ')) + linkTxt(q)); });
      else {
        var sc = (cot.semCot || []).filter(function (s) { return s.chave === k; }).pop();
        sub.push(sc ? '⛔ não cotada: ' + vd_md_(sc.texto) : '⏳ aguardando cotação');
      }
    }
    if (!pg && !cp) {
      var vistos = {};
      (cot.obs || []).forEach(function (o) {
        if (o.chave !== k) return;
        var ehDev = /^\(devolu[çc][ãa]o\)/i.test(o.texto);
        if (ehDev && !dev) return;
        var t = o.texto.replace(/^\((autoriza[çc][ãa]o|devolu[çc][ãa]o|cota[çc][ãa]o)\)\s*/i, '');
        if (vistos[t]) return; vistos[t] = 1;
        sub.push('📝 ' + vd_md_(t));
      });
    }
    L.push(cab);
    sub.forEach(function (s) { L.push('    - ' + s); });
  });

  var mFo = bloco.match(/FORNECIMENTO \(SEGURADORA\)\s*:?\s*(\d+)/i);
  if (mFo) L.push('', '📦 Fornecimento da seguradora: ' + mFo[1] + ' peça(s) — checklist FORNECIMENTO');
  var mFoC = bloco.match(/FORNECIMENTO COMPLEMENTO\s*:?\s*(\d+)/i);
  if (mFoC) { var lc = '📦➕ Complemento da seguradora: ' + mFoC[1] + ' peça(s) — checklist FORNECIMENTO COMPLEMENTO'; if (mFo) L.push(lc); else L.push('', lc); }

  // legenda: só dos ícones que aparecem neste card
  var txt = L.join('\n');
  var leg = [['👤', 'peça particular (cliente paga — autoriza o consultor)'], ['➕', 'peça de orçamento complementar'], ['✅', 'autorizada'], ['🛒', 'comprada (✔ marcada no PAGAS)'], ['⏳', 'aguardando cotação'], ['⛔', 'não cotada'], ['📝', 'observação'], ['↩️', 'devolvida para cotação'], ['📦', 'peças da seguradora']]
    .filter(function (x) { return txt.indexOf(x[0]) >= 0; }).map(function (x) { return x[0] + ' ' + x[1]; });
  if (an.pecas.length) leg.push('linhas sem ícone = cotações, da mais barata para a mais cara');
  if (leg.length) txt += '\n\n_' + leg.join(' · ') + ' · histórico nos comentários_';
  return txt;
}

/** Texto antigo (fora do padrão) que estava no card, para guardar num comentário ao converter. */
function vd_textoLegado_(desc) {
  var resto = vd_dividir_(desc).resto;
  if (!resto) return '';
  var out = [];
  var linhas = resto.split('\n').slice(1);
  for (var i = 0; i < linhas.length; i++) {
    var l = vd_limpar_(linhas[i]).trim();
    if (/^COTA[ÇC][ÃA]O\s+\d{1,2}\/|^AUTORIZA[ÇC][ÃA]O\s+\d|^DEVOLVIDA PARA COTA|^COMPRAD[OA]\s*:|^AUTORIZAD[OA]\s*:/i.test(l)) break;
    if (!l || /^\(texto que estava/i.test(l) || /^↳/.test(l)) continue;
    if (/^(MODELO|ANO|MOTOR\/VERS[ÃA]O|CHASSI|PLACA|COR|SEGURADORA|SINISTRO|TIPO)\s*[:\-]/i.test(l)) continue;
    out.push(linhas[i]);
  }
  return out.join('\n').trim();
}

/** Roda na mão (uma vez): converte para vitrine todos os cards do quadro que ainda não foram convertidos. */
function vd_organizarDescricoes() {
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { cru: true, query: { fields: 'name,desc,shortUrl' } });
  var feitos = 0, pulados = 0;
  cards.forEach(function (c) {
    if (vd_completa_(c.id)) { pulados++; return; }
    if (vd_vitrine_(c.desc, c.name, []) === null) { pulados++; return; }
    vd_backup_(c, 'descrição organizada (vitrine)');
    vd_gravarDesc_(c.id, c.desc);
    feitos++;
  });
  Logger.log('vitrine: ' + feitos + ' card(s) organizados, ' + pulados + ' já organizados ou fora do padrão');
  return feitos;
}
