/**
 * LEITURA DE ORÇAMENTO (Cilia, HDI, Websoma/Porto)
 * Devolve as peças de TROCA separadas em:
 *   oficina  -> vão para o formulário (consultor só escolhe o tipo)
 *   fo       -> fornecidas pela seguradora -> checklist FORNECIMENTO
 * Serviços com código interno (000000x, SOMA00x) e itens de recuperar/pintar/R&I ficam de fora.
 */

var VD_SEGURADORAS = [
  ['HDI', /\bHDI\b/], ['PORTO', /PORTO SEGURO/], ['AZUL', /\bAZUL\b/], ['ITAU', /\bITAU\b/],
  ['YELUM', /\bYELUM\b/], ['SANCOR', /\bSANCOR\b/], ['BRADESCO', /\bBRADESCO\b/], ['ALLIANZ', /\bALLIANZ\b/],
  ['TOKIO', /\bTOKIO\b/], ['MAPFRE', /\bMAPFRE\b/], ['SURA', /\bSURA\b/], ['ZURICH', /\bZURICH\b/],
  ['SUHAI', /\bSUHAI\b/], ['MITSUI', /\bMITSUI\b/], ['EZZE', /\bEZZE\b/], ['DARWIN', /\bDARWIN\b/],
  ['AMERICAS', /\bAMERICAS\b/], ['SOMPO', /\bSOMPO\b/], ['GENERALI', /\bGENERALI\b/], ['ALFA', /\bALFA SEGURADORA\b/],
  ['JUSTOS', /\bJUSTOS\b/], ['PORTO', /\bPORTO\b/]
];

function vd_normTexto_(texto) {
  return vd_semAcento_(String(texto || '').replace(/\r/g, '')).replace(/[\s ]+/g, ' ');
}

function vd_codigoInterno_(c) {
  return /^0{2,}\d+$/.test(c) || /^SOMA\d+$/.test(c);
}

/** Serviços e itens que não são peça (ficam fora do formulário). */
function vd_ehServico_(desc) {
  return /TAXA|ASSESSORIA|BORRACHARIA|GEOMETRIA|ALINHAMENTO|BALANCEAMENTO|PRESILHA|MAO DE OBRA|LAVAGEM|POLIMENTO|HIGIENIZA|GUINCHO|REBOQUE|DIAGNOSTICO|SCANNER|RECARGA|FRETE/.test(desc);
}

function vd_tipoOrcamento_(t) {
  t = String(t || '').toUpperCase();
  if (/^GENU|^GE$/.test(t)) return 'GENUÍNA';   // Cilia abrevia: GE = genuína, OR = original (AYI7869, 08/10/2026)
  if (/^REPOSI/.test(t)) return 'REPOSIÇÃO';
  if (t === 'OR') return 'ORIGINAL';
  return t;
}

/** Item de pneu a partir da descrição (ex.: "PNEU LANVIGATOR 195/ 55 R15"). */
function vd_pneuDaDescricao_(desc) {
  var d = String(desc || '');
  if (!/\bPNEU/.test(d)) return null;
  // 08/10/2026 (treino): "VALVULA DE AR DO PNEU", "SENSOR DE PRESSAO DO PNEU" não são pneu — só quando começa com PNEU ou tem medida
  if (!/^\s*(JOGO DE |KIT )?PNEUS?\b/.test(d) && !/\d{3}\s*[\/ ]\s*\d{2}\s*Z?R\s*\d{2}/.test(d)) return null;
  // "195/65R15", "195/ 55 R15" e também "185 70 R14" (Soma/Porto escreve sem a barra)
  var m = d.match(/(\d{3})\s*[\/ ]\s*(\d{2})\s*Z?R\s*(\d{2})/);
  var medida = m ? m[1] + '/' + m[2] + 'R' + m[3] : '';
  var categoria = /IMPORTAD/.test(d) ? 'IMPORTADO' : (/1\s*[ªA]?\s*LINHA|PRIMEIRA LINHA/.test(d) ? '1ª LINHA' : '');
  var marca = '';
  if (!categoria) {
    var resto = d.replace(/\bPNEUS?\b/, '').replace(/\d{3}\s*[\/ ]\s*\d{2}\s*Z?R\s*\d{2}.*/, '').replace(/[^A-Z0-9 ]/g, ' ').trim().split(/\s+/);
    // pula siglas (D.D., DD, DT) e palavras genéricas: a marca é a 1ª palavra "de verdade"
    marca = resto.filter(function (w) { return w.length >= 3 && !/^(DD|DT|DE|DO|DA|NACIONAL|RADIAL|ARO|NOVO|NOVA|TROCA|JOGO|KIT)$/.test(w); })[0] || '';
  }
  return { pneu: true, medida: medida, marca: marca, categoria: categoria };
}

function vd_limparDescricao_(d) {
  return String(d || '')
    .replace(/^\(A\)\s*/, '')
    .replace(/^(?:\d{3,}\s+)+/, '')              // 2º código numérico do Cilia (ex.: 1632439, 4310)
    .replace(/^\d{5,}(?=[A-Z]{3})/, '')           // 2º código colado na descrição ("951450JOGO DE FAROIS")
    .replace(/^(?:PPG|PPC|PPO|PRO|PAR|PG|PO|OR|GE)\s+/, '')   // sigla de tipo do Cilia (PPG/PPC = paralela; PPO = original)
    .replace(/^(?:PPG|PPC|PPO|GENUINA|ORIGINAL)(?=[A-Z])/, '')   // sigla/tipo colado na descrição pelo OCR ("PPOFAROL", "GENUINAFAROL") — 08/10/2026
    .replace(/([A-Z]{4,})(DIANT|TRAS|DIR|ESQ|SUP|INF)\b/g, '$1 $2')   // OCR da HDI cola palavras ("PARALAMADIANT DIR", "RODADIANT")
    .replace(/^\((.*)\)$/, '$1')
    .replace(/\s*-\s*VAL\.\s*[\d\/ ]*$/, '')
    .replace(/[()]/g, ' ')
    .replace(/\s*\*\s*$/, '')
    .replace(/\s+/g, ' ')
    .replace(/\b([A-ZÀ-Ü0-9][A-ZÀ-Ü0-9\-]{2,})(?: \1\b)+/g, '$1')   // "PORTA PORTA PORTA DIANTEIRA" (Websoma repete a palavra, 08/10/2026)
    .trim()
    .replace(/^.{8,}$/, vd_tirarRepeticao_)
    .slice(0, 70);
}

// Websoma imprime a descrição em duas colunas e o OCR junta as duas: "PORTA DIANTEIRA LE PORTA DIANT",
// "LAT. EXT. COMPLETO LE LAT. EXT. COMPLETO LE". Se o fim repete o começo (mesmo cortado), fica só o começo.
function vd_tirarRepeticao_(d) {
  var ws = String(d).split(' ');
  for (var i = Math.ceil(ws.length / 2); i < ws.length; i++) {
    var a = ws.slice(0, i).join(' '), b = ws.slice(i).join(' ');
    if (b.length >= 4 && a.indexOf(b) === 0) return a;
  }
  return d;
}

/** "1.234,56" -> 1234.56 */
function vd_numOrc_(s) { var n = parseFloat(String(s || '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? NaN : n; }
/** unitário líquido = unitário bruto - desconto (%) */
function vd_liquidoOrc_(unit, descPct) {
  var u = vd_numOrc_(unit), d = vd_numOrc_(descPct);
  if (isNaN(u)) return NaN;
  return isNaN(d) || d <= 0 || d >= 100 ? u : u * (1 - d / 100);
}

/**
 * Websoma/Porto "ORÇAMENTO DETALHADO" com códigos espaçados (08/10/2026, ATP5105). Sequência no texto:
 *   CÓDIGO (um ou vários seguidos) ... DESCRIÇÃO [- VAL. aaaa/aaaa] [complemento] TIPO QDE VLR DESC% VLR M.O. PINT.
 * Os códigos entram numa fila e cada descrição que aparece consome o próximo código da fila.
 */
function vd_websomaDetalhado_(corpo, lista, add) {
  var txt = vd_compactarCodigos_(corpo, '\u0001');
  // 08/10/2026 (treino 2025, "Orcamento_Detalhado.pdf" da Porto): mesmo relatório impresso com número no formato inglês
  // ("1 1,528.39 14.00 1,314.42 0.50 4.00", "PAGE 1 OF 3"), sem coluna TIPO e com sub-itens de R&I por baixo da peça
  // ("37417 FORRO DA PORTA DT LE 0.50 0.00 ... TOTAL: 0.50 0.00") que não são peças.
  var en = /\d+\.\d{2} \d+\.\d{2} \d+\.\d{2}/.test(txt) && !/\d,\d{2} \d/.test(txt);
  if (en) txt = txt.replace(/(?:(?:\d{5} [A-Z][A-Z0-9 .\/\-]*?|\([^()]*\)) \d+\.\d{2} \d+\.\d{2} )+TOTAL: \d+\.\d{2} \d+\.\d{2}/g, ' ');
  var NUM = en ? '(\\d{1,3}(?:,\\d{3})*\\.\\d{2})' : '(\\d{1,3}(?:\\.\\d{3})*,\\d{2})';
  var num = en ? function (x) { var n = parseFloat(String(x || '').replace(/,/g, '')); return isNaN(n) ? NaN : n; } : vd_numOrc_;
  // 08/10/2026 (treino, relatórios da Porto): o PDF imprime em colunas e o OCR às vezes traz 2–3 itens seguidos e só
  // depois os preços ("…(GRADE) - VAL. 2020/ C/ FRISO 26364110 (COB.INF…) GENUINO 1 355,73 … GENUINO 1 118,66 …").
  // Por isso o texto é cortado em BLOCOS entre os preços; cada bloco vira um ou mais itens (fila) e cada preço sai
  // para o item mais antigo. Dentro do bloco um item começa num código (solto, "93286309//", Toyota "64780 0A120 C0")
  // ou em "NOME (DESCRIÇÃO" (nome curto + parêntese); códigos VW compactados (\u0001) entram na fila de códigos.
  var rePreco = en
    ? new RegExp('(?:\\b(GENUIN[OA]|REPOSICAO|ORIGINAL|PARALEL[OA]|USAD[OA]|RECONDICIONAD[OA]) )?\\b(\\d{1,3}) ' + NUM + ' ' + NUM + ' ' + NUM + ' ' + NUM + ' ' + NUM, 'g')
    : new RegExp('\\b(GENUIN[OA]|REPOSICAO|ORIGINAL|PARALEL[OA]|USAD[OA]|RECONDICIONAD[OA]) (\\d{1,3}) ' + NUM + ' ' + NUM + ' ' + NUM, 'g');
  var COD = '(?:[A-Z]{0,4}\\d[A-Z0-9\\-]{4,18}\\/{0,2}|[A-Z]{1,2}\\d{3,8}|SOMA\\d+|0{2,}\\d+|\\d{5} [A-Z0-9]{5}(?: [A-Z0-9]{2}(?= \\())?)';   // "15X6" (medida) não é código
  var reIni = new RegExp('\\u0001([^\\u0001]+)\\u0001|(?:^|\\s)(' + COD + ')(?=\\s[A-Z(])|(?:^|\\s)(?=(?:[A-Z][A-Z.\\-\\/]* ){0,2}\\()', 'g');
  var filaCod = [], filaItem = [], m, pos = 0;
  var fechar = function (it) {
    if (!it) return;
    var t = it.txt.replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ').trim();
    if (!/[A-Z]{3}/.test(t)) return;
    if (/%|DEVOLU|DESC\. ?PECAS|DESCONTO/.test(t)) { filaItem.push({ pular: true }); return; }   // linha de ajuste de desconto: consome o preço e some
    var p = t.match(/^(.*?)(?: - VAL\. \d{2,4}\/(?:\d{2,4})?(.*))?$/), desc = p[1], extra = (p[2] || '').replace(/\s*\*\s*$/, '').trim();
    if (extra && (/^\(?PNEU/.test(desc) || !/\d/.test(extra)) && desc.indexOf(extra) < 0) desc += ' ' + extra;   // cor/acabamento ("PRETO SATIN", "C/ASSIST.EST.") e medida do pneu; "ATE 27/11/11" não
    filaItem.push({ codigo: it.codigo || (filaCod.length ? filaCod.shift() : ''), desc: desc });
  };
  var bloco = function (s) {
    s = s.replace(/^(?:\s*\d{1,3}(?:\.\d{3})*,\d{2})+/, '');   // sobras das colunas M.O./pintura do preço anterior ("0,50 0,00")
    var atual = null, ult = 0, k;
    reIni.lastIndex = 0;
    while ((k = reIni.exec(s))) {
      if (!k[0].length) reIni.lastIndex++;   // casamento vazio (início do bloco): avança para não travar
      var antes = s.slice(ult, k.index);
      if (atual) atual.txt += antes; else if (/[A-Z]{4}/.test(antes) && !k[1]) atual = { codigo: '', txt: antes };   // item sem código nem parêntese
      ult = k.index + k[0].length;
      if (k[1]) { filaCod.push(k[1]); continue; }
      if (k[2]) { fechar(atual); atual = { codigo: k[2].replace(/\/+$/, '').replace(/\s+/g, ''), txt: '' }; continue; }
      if (atual && !/- VAL\./.test(atual.txt)) { atual.txt += k[0]; continue; }   // "código (DESCRIÇÃO", "ESPELHO P (B) (ESPELHO EXT)": parêntese do mesmo item; só depois do "- VAL." um "NOME (" é item novo
      fechar(atual); atual = { codigo: '', txt: '' };
    }
    var resto = s.slice(ult);
    if (atual) atual.txt += resto; else if (/[A-Z]{4}/.test(resto)) atual = { codigo: '', txt: resto };
    fechar(atual);
  };
  while ((m = rePreco.exec(txt))) {
    bloco(txt.slice(pos, m.index));
    pos = m.index + m[0].length;
    var it = filaItem.shift();
    if (!it || it.pular) continue;
    var bruto = num(m[3]), liq = num(m[5]), pct = num(m[4]);
    var calc = isNaN(bruto) ? NaN : (isNaN(pct) || pct <= 0 || pct >= 100 ? bruto : bruto * (1 - pct / 100));
    var valor = (!isNaN(liq) && !isNaN(calc) && Math.abs(liq - calc) < 0.05) ? liq : (isNaN(calc) ? bruto : calc);
    add(lista, it.codigo, it.desc, m[2], m[1] || '', valor);
  }
}

/** "5U4/ 831055/D /CTR" -> "5U4/831055/D/CTR" (partes vazias somem); com marca, envolve o código em \u0001 para o leitor em fila. */
function vd_compactarCodigos_(txt, marca) {
  return String(txt || '').replace(/\b([A-Z0-9]{2,4})\/ ?([A-Z0-9]{3,8})\/ ?([A-Z0-9]{0,3}) ?\/ ?([A-Z0-9]{0,4})(?=\s|$)/g, function (_, a, b, c, d) {
    var cod = [a, b, c, d].filter(String).join('/');
    return marca ? ' ' + marca + cod + marca + ' ' : cod;
  });
}

/** Recorta o texto entre um início e o primeiro dos finais. */
function vd_secao_(U, inicio, finais) {
  var i = U.search(inicio);
  if (i < 0) return '';
  var resto = U.slice(i);
  var fim = resto.length;
  finais.forEach(function (f) {
    var j = resto.slice(10).search(f);
    if (j >= 0 && j + 10 < fim) fim = j + 10;
  });
  return resto.slice(0, fim);
}

function vd_lerOrcamento_(texto) {
  var U = vd_normTexto_(texto);
  var r = { origem: '', oficina: [], fo: [], seguradora: '', cor: '', sinistro: '' };
  var m;

  // seguradora: primeiro o nome colado em "SEGURADORA/SEGUROS" (cabeçalho do Cilia: "Yelum Seguradora"); só depois qualquer
  // menção solta — o e-mail do regulador (@hdi-yelum.com.br) fazia a Yelum virar HDI (07/10/2026, RHM1J09)
  for (var s = 0; s < VD_SEGURADORAS.length && !r.seguradora; s++) {
    if (new RegExp('\\b' + VD_SEGURADORAS[s][0] + ' SEGUR(ADORA|OS)\\b').test(U)) r.seguradora = VD_SEGURADORAS[s][0];
  }
  for (var s2 = 0; s2 < VD_SEGURADORAS.length && !r.seguradora; s2++) {
    if (VD_SEGURADORAS[s2][1].test(U)) r.seguradora = VD_SEGURADORAS[s2][0];
  }
  // cor
  // 07/10/2026 (TAJ0E65): orçamento com cabeçalho em tabela ("Placa  Cor  Chassi  Quilometragem") dava cor = CHASSI —
  // nome de outro campo logo depois de "Cor" não é cor
  if ((m = U.match(/\bCOR:? ([A-Z]{3,15})\b/)) && !/^(SINISTRO|NAO|AUTORIZADO|ENDERECO|CHASSI|PLACA|KM|QUILOMETRAGEM|COMBUSTIVEL|MODELO|MARCA|ANO|FABRICACAO|MOTOR|RENAVAM|CLIENTE|OFICINA|VERSAO)$/.test(m[1])) r.cor = m[1];
  else if ((m = U.match(/FABRICACAO: ([A-Z]{3,15}) (?:19|20)\d\d/))) r.cor = m[1];
  else if ((m = U.match(/IMPREGNACAO:? ([A-Z]{3,15})\b/))) r.cor = m[1];   // Soma/Porto chama a cor de "Impregnação"
  // sinistro
  if ((m = U.match(/SINISTRO:? (\d[\d.\-\/]{6,})/))) r.sinistro = m[1];

  // valor líquido unitário da peça no orçamento (o que a seguradora paga) — 05/10/2026, Weslley: aparece ao lado da peça
  // na cotação/autorização e serve de base para a comparação com a cotação (economia < 20% vermelho, 20–30 amarelo, > 30 verde)
  var add = function (lista, codigo, desc, qtd, tipo, valor) {
    codigo = String(codigo || '').replace(/\s+/g, ' ').trim();
    // OCR do Cilia às vezes gruda (ou põe antes) o código na descrição ("100260230EMBLEMA DA GRADE", "1632439 FAROL"):
    // se o código da coluna é interno (0000001) ou vazio, esse número é o código (RHV1E04, 05/10/2026) — antes da limpeza,
    // que apaga esses dígitos (08/10/2026)
    var mg = String(desc || '').trim().match(/^(\d{6,}) ?([A-Z(].*)$/);
    if (mg && (!codigo || vd_codigoInterno_(codigo.replace(/\s/g, '')))) { codigo = mg[1]; desc = mg[2]; }
    desc = vd_limparDescricao_(desc);
    var mc = codigo.match(/^(\d{6,})([A-Z][A-Z\-]{2,})$/);   // "52181025PARACHOQUE" veio como código (08/10/2026)
    if (mc) { codigo = mc[1]; desc = vd_limparDescricao_(mc[2] + ' ' + desc); }
    var pneu = vd_pneuDaDescricao_(desc);
    if (!desc || vd_ehServico_(desc)) return;
    // código interno (000000x / SOMA00x) = peça sem código de fábrica: consultor completa pelo Cilia
    if (vd_codigoInterno_(codigo.replace(/\s/g, ''))) codigo = '';
    var item = pneu ? pneu : { pneu: false, codigo: codigo, descricao: desc, tipos: [] };
    item.qtd = String(qtd || '1');
    item.dica = vd_tipoOrcamento_(tipo);
    item.descricaoOrc = desc;
    item.codigoOrc = codigo;
    if (valor != null && !isNaN(valor) && valor > 0) item.valorOrc = Math.round(valor * 100) / 100;
    lista.push(item);
  };

  // ---------- HDI ----------
  // 08/10/2026 (treino, BDG4H83 Sprinter): PDF do Cilia também pode citar "PEÇAS FORNECIDAS PELA OFICINA" no resumo —
  // se tem o cabeçalho de tabela do Cilia (TITULO FORNECIMENTO PRECO), não é HDI
  if (/PECAS FORNECIDAS PELA (HDI|OFICINA)/.test(U) && !/TITULO FORNECIMENTO PRECO|FORNECIMENTO PRECO DESCONTO PRECO LIQUIDO/.test(U)) {
    r.origem = 'HDI';
    // 08/10/2026 (treino): código Ford espaçado ("E3B5/ 17757/AG/XWA") compactado antes; página cortada no OCR
    // ("1 1.020,00 1.020,0", sem total/desconto) ainda lê a peça com o valor unitário
    var reHdi = /([A-Z0-9][A-Z0-9\/\-]{2,24})\*? (?:\(A\) )?(.+?) (\d{1,3}) (\d{1,3}(?:\.\d{3})*,\d{2})(?: (\d{1,3}(?:\.\d{3})*,\d{1,2}))?(?: (\d{1,3},\d{2}|\?))?/g;
    var fimHdi = [/PECAS FORNECIDAS PELA/, /OPERACOES/, /RESUMO/, /SERVICOS ADICIONAIS/];
    var secO = vd_secao_(U, /PECAS FORNECIDAS PELA OFICINA/, fimHdi);
    var secF = vd_secao_(U, /PECAS FORNECIDAS PELA HDI/, fimHdi);
    [[secO, r.oficina], [secF, r.fo]].forEach(function (par) {
      var sec = par[0];
      sec = /DESCONTO \(%\)/.test(sec) ? sec.replace(/^.*?DESCONTO \(%\)/, '') : sec.replace(/^.*?(?:TOTAL \(R\$?\)?|\bTOTA\b)/, '');   // cabeçalho (às vezes cortado no OCR)
      sec = vd_compactarCodigos_(sec);
      while ((m = reHdi.exec(sec))) add(par[1], m[1], m[2], m[3], '', m[6] ? vd_liquidoOrc_(m[4], m[6]) : vd_numOrc_(m[4]));
    });
    return r;
  }

  // ---------- Websoma / Porto ----------
  if (/PECAS - TROCA|LISTA DAS PECAS FORNECIDAS PELA SEGURADORA/.test(U)) {   // só FO (sem "PECAS - TROCA") também é Websoma (08/10/2026)
    r.origem = 'WEBSOMA';
    // Dois layouts: Websoma clássico ("PECAS - TROCA (FORNECIDAS PELA SEGURADORA)") e o ORÇAMENTO DETALHADO do
    // Soma/Porto/Azul (05/10/2026): "PECAS - TROCA (COMPRA PELA OFICINA)", "LISTA DAS PECAS FORNECIDAS PELA SEGURADORA"
    // e "STATUS DE ENTREGA DAS PECAS FORNECIDAS PELA SEGURADORA (SOMA PECAS)" — esta última traz fornecedor e prazo
    // (pv_enriquecerFo_ lê) e NÃO pode entrar como peça.
    var fimWs = [/PECAS - /, /MONTAGEM - /, /SERVICOS DE TERCEIROS/, /RESUMO/, /LISTA DAS PECAS FORNECIDAS/, /STATUS DE ENTREGA/, /TOTAL PECAS/];
    var reWs = /(\d{5} \d{5}|[A-Z]{0,4}\d[A-Z0-9]{2,18}) (\(.+?\)(?: - VAL\. [\d\/ ]*)?|.+?)(?: \*)? (?:(REPOSICAO|GENUINO|ORIGINAL|PARALELO|USADO) )?(\d{1,3}) ([\d.,]+) ([\d.,]+) ([\d.,]+)/g;   // qde, vlr bruto, desc %, vlr líquido
    var secs = U.split(/(?=PECAS - TROCA|LISTA DAS PECAS FORNECIDAS PELA SEGURADORA)/).filter(function (x) { return /^(PECAS - TROCA|LISTA DAS PECAS FORNECIDAS)/.test(x); });
    secs.forEach(function (sec) {
      var ehFO = /^PECAS - TROCA \(FORNECIDAS PELA SEGURADORA\)|^LISTA DAS PECAS FORNECIDAS PELA SEGURADORA/.test(sec);
      var corpo = vd_secao_(sec, /PECAS - TROCA|LISTA DAS PECAS FORNECIDAS/, fimWs).replace(/^.*?PINTURA /, '');
      // 08/10/2026 (ATP5105 + treino com cards antigos): leitor sequencial — código VW espaçado ("5U4/ 831055/D /CTR"),
      // descrição entre parênteses, "- Val. aaaa/aaaa" (ou "00/"), complemento (cor), "*" antes do tipo e vários códigos
      // seguidos das descrições (casados em fila). Se não achar nada, volta ao leitor antigo (layout clássico).
      var lista = ehFO ? r.fo : r.oficina, antes = lista.length;
      vd_websomaDetalhado_(corpo, lista, add);
      if (lista.length > antes) return;
      while ((m = reWs.exec(corpo))) {
        // colunas: Vlr (bruto) · Desc. (%) · Vlr (líquido). Se o 3º número bate com bruto - desconto, é o líquido; senão calcula.
        var bruto = vd_numOrc_(m[5]), liq = vd_numOrc_(m[7]), calc = vd_liquidoOrc_(m[5], m[6]);
        var valorWs = (!isNaN(liq) && !isNaN(calc) && Math.abs(liq - calc) < 0.05) ? liq : (isNaN(calc) ? bruto : calc);
        add(ehFO ? r.fo : r.oficina, m[1], m[2], m[4], m[3], valorWs);
      }
    });
    return r;
  }

  // ---------- "Orçamento - N" com coluna DESCRICAO/CODIGO (08/10/2026, treino — MVU1552 F250 Tokio) ----------
  // "T R&I 0,50 1.00 ESPELHO RETROVISOR INTERNO COD: XC3A17700AA OFICINA R$ 194,00 % 13,00 R$ 168,78"; "CLIENTE - - -" = o
  // cliente fornece (não entra); "SEGURADORA" = FO. Linhas só R&I/R/P (sem T) não são troca.
  if (/DESCRICAO\/CODIGO FORNECIMENTO/.test(U) && /\bCOD: /.test(U)) {
    r.origem = /TOKIO/.test(U) ? 'TOKIO' : (/CILIA/.test(U) ? 'CILIA' : 'ORCAMENTO');
    var reDc = /\bT (?:R&I \d+,\d{2} )?(?:R \d+,\d{2} )?(?:P \d+,\d{2} )?(\d+(?:[.,]\d+)?) (.+?) COD: ?([A-Z0-9][A-Z0-9\-.\/]*)? ?(OFICINA|CLIENTE|SEGURADORA) (?:R\$ ?(\d{1,3}(?:\.\d{3})*,\d{2}) (?:% (\d{1,3},\d{2})|-) R\$ ?(\d{1,3}(?:\.\d{3})*,\d{2})|- - -)/g;
    while ((m = reDc.exec(U))) {
      if (m[4] === 'CLIENTE') continue;
      var qtdDc = String(m[1]).replace(/[.,]00$/, '');
      add(m[4] === 'SEGURADORA' ? r.fo : r.oficina, m[3] || '', m[2], qtdDc, '', m[7] ? vd_numOrc_(m[7]) : (m[5] ? vd_numOrc_(m[5]) : NaN));   // preço líquido (último R$)
    }
    return r;
  }

  // ---------- Cilia ----------
  if (/FORNECIMENTO/.test(U) && /\bT (?:-|\d+,\d{2})/.test(U)) {
    r.origem = 'CILIA';
    // 08/10/2026 (treino com cards antigos): no PDF do Cilia dois itens podem vir seguidos e só depois os dois preços
    // ("…FAROL DIREITO (…) T 0,50 1 8117098010 GENUINAFAROL ESQUERDO (…) SEGURADORA R$ 804,47 - - SEGURADORA R$ 761,13 - -").
    // Por isso o leitor anda em fila: cada ITEM entra numa fila e cada PREÇO (OFICINA/SEGURADORA …) sai para o item mais
    // antigo sem preço. O tipo pode vir colado ("GENUINAFAROL", "PPOJOGO") — vd_limparDescricao_ tira.
    var PROX = '\\bT (?:-|\\d+,\\d{2})(?: P \\d+,\\d{2})? \\d{1,3} [A-Z0-9]{4,20}\\b';
    var reCi = new RegExp('\\bT (?:-|\\d+,\\d{2})(?: P \\d+,\\d{2})? (\\d{1,3}) ([A-Z0-9]{4,20}) (?:\\d{5,} )?(?:(GENUINA|ORIGINAL)|(PRO|PPO|PPG|PPC|PAR|OR|GE|PG|PO|OUTRAS FONTES|VERDE|USADA|RECONDICIONADA) )?((?:(?!' + PROX + '| ?(?:OFICINA|SEGURADORA) (?:R\\$|-)).)+?)(?= ?(?:OFICINA|SEGURADORA) (?:R\\$|-)|' + PROX + '|$)' +
      '|(OFICINA|SEGURADORA) (?:R\\$(?: ?(\\d{1,3}(?:\\.\\d{3})*,\\d{2})(?: ?(?:R\\$ ?)?(\\d{1,3}(?:\\.\\d{3})*,\\d{2})(?! ?%))?(?: ?(\\d{1,3},\\d{2}) ?%)?)?|-)', 'g');   // número seguido de % é desconto, não total (07/10/2026)
    var filaCi = [];
    while ((m = reCi.exec(U))) {
      if (m[2]) { filaCi.push({ qtd: m[1], codigo: m[2], tipo: m[3] || m[4] || '', desc: m[5] }); continue; }
      var it = filaCi.shift();
      if (!it) continue;   // preço sem item antes (cabeçalho, serviços): ignora
      // Cilia: "OFICINA R$ unit [R$ total] [desc %]" — o valor unitário líquido; formato confirmado no 1º PDF real (05/10/2026)
      add(m[6] === 'SEGURADORA' ? r.fo : r.oficina, it.codigo, it.desc, it.qtd, it.tipo, m[7] ? vd_liquidoOrc_(m[7], m[9]) : NaN);
    }
    // item que ficou sem preço (fim do texto cortado): entra como da oficina, sem valor
    filaCi.forEach(function (it) { add(r.oficina, it.codigo, it.desc, it.qtd, it.tipo, NaN); });
    return r;
  }
  return r;
}
