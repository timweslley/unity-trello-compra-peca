/* eslint-disable */
// @ts-nocheck
// GERADO AUTOMATICAMENTE por servidor/scripts/extrair-leitores.mjs a partir de apps-script/ — NÃO EDITAR À MÃO.
// Leitores de documentos do robô (Apps Script), copiados sem alteração para o servidor ler exatamente igual.
// Para mudar um leitor: mude no Apps Script e rode o extrator de novo.

// ---------- adaptadores do Apps Script ----------
const Utilities = {
  /** Utilities.formatDate(data, fuso, padrão) — padrões yyyy, yy, MM, dd, HH, mm, ss */
  formatDate(d, fuso, padrao) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: fuso || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(d)).map((x) => [x.type, x.value]));
    return String(padrao).replace(/yyyy|yy|MM|dd|HH|mm|ss/g, (t) => ({ yyyy: p.year, yy: p.year.slice(2), MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, ss: p.second })[t]);
  },
};
let FO_LISTA_ATUAL = null;
/** Lista de fornecedores no formato do robô: [{nome, apelidos[], cod, usos, linha}] (o servidor injeta a do banco). */
export function definirFornecedores(lista) { FO_LISTA_ATUAL = lista; }
function fo_lista_() {
  if (FO_LISTA_ATUAL) return FO_LISTA_ATUAL;
  return FO_SEMENTE.map(function (x, i) { return { nome: String(x[0]).toUpperCase(), apelidos: String(x[1] || '').split('|').map(function (s) { return s.trim().toUpperCase(); }).filter(String), cod: String(x[2] || ''), usos: 0, linha: i + 2 }; });
}

// ---------- código do robô ----------
// Fornecedores.gs:12
var FO_SEMENTE = [
  ["ACCIOLY", "ACCIOLY GM PARANÁ", "5917", "60.892.858/0003-00", "ACCIOLY GM LONDRINA"],
  ["APS", "", "5737", "01.910.513/0007-98", "APS  DISTRIBUIDORA DE AUTOPECAS E MT"],
  ["ATUAL VEICULOS", "", "7065", "13.337.223/0002-71", "ATUAL VEICULOS LTDA"],
  ["AUTOGLASS", "", "6653", "07.571.746/0063-05", "MG VIDROS AUTOMOTIVOS LTDA"],
  ["AUTOMOVEIS BARIGUI", "", "6113", "09.602.000/0001-36", "AUTOMOVEIS BARIGUI  LTDA"],
  ["AUTOPLUS", "", "5134", "02.446.766/0006-34", "AUTOPLUS COMERCIO DE VEICULOS LTDA"],
  ["AUTOPLUS FORD BLUMENAU", "AUTOPLUS FORD BLUMENAU - SC", "5659", "11.973.800/0006-10", "AUTOPLUS VEICULOS LTDA (era só CLI; Fornecedor acrescentado 21/09/2026)"],
  ["AVENIDA", "AVENIDA DISTRIBUIDORA DE TOLEDO", "629, 5601", "72.477.771/0001-85", "PAULO CESAR NAZARIO ME"],
  ["BARIGUI BYD", "", "6749", "22.303.462/0001-10", "BARIGUI BYD (Bari Imports)"],
  ["BARIGUI FRANCA", "", "2477", "07.764.255/0009-27", "BARIGUI FRANCA  COMERCIO DE AUTOMOVEIS"],
  ["BARIGUI TORRES", "BARIGUI FIAT | BARIGUI TORRES – FIAT", "5739", "79.763.884/0007-81", "BARIGUI VEICULOS LTDA"],
  ["BYD PARK SUL", "", "6763", "10.272.533/0002-67", "BYD PARK SUL  (Saga Shenzhen)"],
  ["CALTABIANO", "", "6840", "09.186.460/0001-20", "CALTABIANO  MOTORS"],
  ["CAR HOUSE", "CAR HOUSE - CHAPECO", "6694", "94.673.480/0017-62", "CAR HOUSE (Chapecó)"],
  ["CARLÃO", "", "7064", "11.931.021/0001-47", "CARLÃO  TAN BATIDOS (ver T)"],
  ["CASA DAS LATAS", "CASA DAS LATAS COLOMBO", "5688, 6862", "18.700.673/0001-10", "CASA DAS LATAS DISTRIBUIDORA DE ACESSORIO"],
  ["CAUNETO", "", "624", "32.114.889/0001-24", "CAUNETO  VEICULOS LTDA"],
  ["CHERY BARIGUI CASCAVEL", "", "4973", "12.348.206/0009-43", "BARIGUI ASIA COMERCIO DE VEICULOS LTDA"],
  ["CHERY PONTA GROSSA", "", "7035", "12.348.206/0008-62", "BARIGUI ASIA COMERCIO DE VEICULOS LTDA, fantasia CHERY PONTA GROSSA"],
  ["CIAVENA", "", "6824", "75.398.875/0001-92", "CIAVENA  (Arapongas/PR)"],
  ["COMERCIAL OESTE", "", "6866", "77.882.587/0001-34", "COMERCIAL OESTE  (Guarapuava)"],
  ["DEMAK", "", "6946", "21.437.818/0001-46", "DEMAK  COMERCIO, IMPORTACAO E EXPORTACAO"],
  ["DIPAUTO", "DIAPUTO", "5619", "76.883.255/0001-01", "DISTRIBUIDORA DE PECAS TOLEDO"],
  ["DUMAS", "", "6863", "07.897.939/0003-01", "DUMAS  (Fco. Beltrão)"],
  ["DUNA", "DUNA FIAT", "5750", "97.752.851/0004-75", "SUL PECAS E VEICULOS LTDA (só aparece por Fantasia = DUNA)"],
  ["EBRUM", "E-BRUN", "6897", "", "E-BRUN MOTORS LTDA"],
  ["EURO IMPORT", "EURO IMPORT PR | EURO IMPORT PR 3312-9800)", "7067", "05.385.004/0001-59", "EURO IMPORT COMERCIO E SERVICOS LTDA (matriz, Rua Tobias de Macedo Jr 217, Santo"],
  ["FANCAR", "FANCAR FORD | FORD FANCAR", "2233", "05.677.629/0007-80", "FANCAR DETROIT LTDA (Ford)"],
  ["FIPAL", "", "6074", "77.396.810/0013-77", "FIPAL CVEL2"],
  ["FLORENCA", "FLORENÇA | FLORENÇA - FIAT - PR", "5740", "77.968.980/0001-45", "FLORENCA VEICULOS SA"],
  ["FORAUTO", "", "6434", "", "FORAUTO  VEICULOS E PECAS LTDA"],
  ["FORMULA", "", "6784", "", "FORMULA"],
  ["GELLY OPEN", "GEELY OPEN", "4021", "04.675.147/0002-13", "OPEN VEICULOS LTDA"],
  ["GERMANO ZENI", "", "35", "", "GERMANO ZENI  VEICULOS LTDA"],
  ["GLASS BRASIL", "", "6468", "62.691.890/0001-82", "GLASS BRASIL  PARABRISAS"],
  ["GLOBO JEEP", "GLOBO - JEEP - CURITIBA | GLOBO JEEP CURITIBA", "1385", "21.687.867/0002-18", "GLOBO LAGES COM. DE VEÍCULOS"],
  ["GLOBO RENAULT", "GLOBO | GLOBO VEICULOS", "6695", "00.379.858/0007-02", "GLOBO COM. DE VEICULOS E PECAS"],
  ["HAI", "ANSAR 2.0", "6782", "05.481.897/0001-36", "HAI AUTOMOVEIS LTDA"],
  ["HYUNDAI BARIGUI", "", "5585", "07.461.763/0006-93", "BARI VEICULOS LTDA, fantasia BARIGUI HYUNDAY"],
  ["HYUNDAI C.MOURAO", "HYUNDAI C.MOURÃO", "", "", "⏳ não identificado"],
  ["HYUNDAI TOLEDO", "", "37", "19.671.772/0001-83", "ZENDAI VEICULOS LTDA"],
  ["IMPERIAL", "", "5630", "10.526.031/0001-34", "T.O BELFIORI & CIA LTDA"],
  ["KAIZEN", "KAIZEN RS", "6745", "01.694.638/0002-13", "KAIZEN RS - VEICULOS E SERVICOS LTDA"],
  ["LOVAT", "", "6864", "08.570.849/0001-02", "LOVAT  VEICULOS S/A"],
  ["LUSON", "LUSON VW PR", "6588", "78.453.669/0004-79", "LUSON VEICULOS LTDA CURITIBA"],
  ["MAJOR", "", "6773", "", "MAJOR"],
  ["MANGONI", "", "6865", "05.915.241/0001-84", "MANGONI  ACESSORIOS E AUTOCENTER (Toledo)"],
  ["MEGA", "", "6318", "28.268.736/0001-64", "MEGA  DISTRIBUIDORA"],
  ["MERCADO LIVRE", "ML", "6488, 5583", "03.007.331/0010-32", "MERCADO LIVRE BRASIL"],
  ["METRONORTE", "METRONORTE FILIAL 0004-20", "5622, 7036, 2586", "05.035.532/0001-88", "METRONORTE GM LONDRINA"],
  ["METROSUL", "", "5671", "05.783.976/0001-00", "METROSUL"],
  ["MONT KOYA", "", "6861", "04.982.217/0001-03", "MONT KOYA  (Ponta Grossa)"],
  ["NORPAVE", "NORPAVE VW PR", "7037", "78.625.993/0001-84", "NORPAVE VEICULOS S/A, fantasia NORPAVE"],
  ["OPEN CASCAVEL", "", "6902", "04.675.147/0001-32", "OPEN VEICULOS CASCAVEL"],
  ["PAOLI", "", "6755", "57.938.586/0001-57", "PAOLI"],
  ["PAULO", "PAULO UMUARAMA", "6938", "27.837.247/0001-13", "PAULO CESAR DE CARVALHO (Umuarama-PR, IE Isento)"],
  ["RBF", "MEDIADORA - ANSAR | MEDIADORA ANSAR", "6948", "64.987.298/0001-58", "RBF COMERCIO E DISTRIBUICAO DE AUTO PECAS, fantasia RBF (Curitiba/PR)"],
  ["RELL", "RELL DISTRIBUIDOR", "6783", "36.174.929/0001-84", "RELL COMERCIO DE PECAS LTDA"],
  ["RUFATO", "RUF", "5639", "04.089.533/0001-42", "RUFATO IMP. E DISTR PCS E ACESS"],
  ["RV AUTO PECAS", "", "7080", "27.499.963/0002-19", "RV AUTO PECAS LTDA, fantasia RV AUTO PECAS"],
  ["SAGA", "SAGA MG - VW | SAGA VW", "6949", "03.267.961/0001-55", "SAGA AUTOMINAS, fantasia SAGA VW (Uberlândia/MG)"],
  ["SAIKON", "", "5656", "10.404.310/0001-25", "SAIKON VEICULOS S/A"],
  ["SANTA FE", "SANTA FÉ", "6696", "11.596.056/0001-77", "SANTA FE COMERCIO DE VEICULOS S/A"],
  ["SCHERER", "", "5551", "", "SCHERER"],
  ["SERVOPA VW CURITIBA", "", "", "", "🚫 sem cadastro e sem CNPJ"],
  ["SEVEC", "SEVEC PR | SEVEC PR 3213-6060)", "7066", "00.568.480/0001-91", "SEVEC VEICULOS LTDA (grupo Servopa; Receita traz fantasia SERVOPA, gravada SEVEC"],
  ["SINOSCAR", "PRISMATEC | PRISMATEC SINOSCAR | SINOSCAR RS GM", "6953", "91.688.234/0001-29", "SINOSCAR SA, fantasia SINOSCAR RS GM (Novo Hamburgo/RS)"],
  ["SULPAR", "", "6175", "36.152.916/0010-03", "SGA VEICULOS E PECAS S.A."],
  ["TAKAI", "TAKAI HONDA | TAKAI HONDA BLUMENAU SC", "6947", "05.608.273/0001-37", "TAKAI VEICULOS LTDA"],
  ["TAN BATIDOS", "CARLÃO", "7064", "11.931.021/0001-47", "I C PRIMON & PRIMON LTDA - ME, fantasia TAN BATIDOS"],
  ["TOLI", "", "6093", "90.136.409/0008-07", "TSD LOGISTICA E DISTRIBUIDORA"],
  ["TSD CHAPECO", "TSD – CHAPECÓ", "6169", "90.136.409/0020-95", "TSD – CHAPECÓ"],
  ["TSD MARINGA", "TSD – MARINGÁ", "6153", "90.136.409/0005-56", "TSD – MARINGÁ"],
  ["VALLCAR CASCAVEL", "VALLCAR – CASCAVEL", "6660", "07.217.538/0001-00", "LIMACAR"],
  ["VALLCAR TOLEDO", "VALLCAR – TOLEDO", "5597", "07.217.538/0002-82", "LIMACAR COM DE PECAS AUTOMOTIVAS"],
  ["VETOR", "", "5521", "21.212.879/0001-05", "VETOR AUTOMOVEIS = HYUNDAI CASCAVEL"],
  ["VIA PORTO", "", "6748", "82.510.280/0001-42", "VIA PORTO"],
  ["VIP CAR", "", "5926", "", "VIP CAR"],
  ["VIPCAR", "", "6423", "", "VIPCAR  SERVICOS AUTOMOTIVOS LTDA"],
  ["VW BARIGUI", "", "2636", "08.540.795/0007-28", "VOX COMERCIO DE AUTOMOVEIS LTDA"],
  ["VW CASCAVEL", "VW CASCA", "1819", "08.540.795/0011-04", "VOX COMERCIO DE AUTOMOVEIS"],
  ["WEV ESTOQUE", "", "661", "48.777.901/0001-10", "WV AUTOMOVEIS LTDA"],
  ["ZACARIAS CAMPO MOURAO", "ZACARIAS – CAMPO MOURÃO", "2231", "79.138.608/0006-41", "ZACARIAS VEICULOS"],
  ["ZACARIAS TOLEDO", "ZACARIAS – TOLEDO", "38", "79.138.608/0008-03", "ZACARIAS VEICULOS"]
];

// Complemento.gs:83
var CP_PAL_FRACA = /^(DE|DO|DA|DOS|DAS|COM|SEM|PARA|MOTOR|MANUAL|AUTOMATICO|AUTOMATICA|COMPLETO|COMPLETA|KIT|JOGO|UNIDADE|PCS|PECA)$/;

// Complemento.gs:85
var CP_POSICAO = { DIR: 'D', DIREITO: 'D', DIREITA: 'D', LD: 'D', ESQ: 'E', ESQUERDO: 'E', ESQUERDA: 'E', LE: 'E', DIANT: 'F', DIANTEIRO: 'F', DIANTEIRA: 'F', FRENTE: 'F', TRAS: 'T', TRASEIRO: 'T', TRASEIRA: 'T', SUP: 'S', SUPERIOR: 'S', INF: 'I', INFERIOR: 'I' };

// Complemento.gs:86
var CP_EIXO = { D: 1, E: 1, F: 2, T: 2, S: 3, I: 3 };

// Orcamento.gs:9
var VD_SEGURADORAS = [
  ['HDI', /\bHDI\b/], ['PORTO', /PORTO SEGURO/], ['AZUL', /\bAZUL\b/], ['ITAU', /\bITAU\b/],
  ['YELUM', /\bYELUM\b/], ['SANCOR', /\bSANCOR\b/], ['BRADESCO', /\bBRADESCO\b/], ['ALLIANZ', /\bALLIANZ\b/],
  ['TOKIO', /\bTOKIO\b/], ['MAPFRE', /\bMAPFRE\b/], ['SURA', /\bSURA\b/], ['ZURICH', /\bZURICH\b/],
  ['SUHAI', /\bSUHAI\b/], ['MITSUI', /\bMITSUI\b/], ['EZZE', /\bEZZE\b/], ['DARWIN', /\bDARWIN\b/],
  ['AMERICAS', /\bAMERICAS\b/], ['SOMPO', /\bSOMPO\b/], ['GENERALI', /\bGENERALI\b/], ['ALFA', /\bALFA SEGURADORA\b/],
  ['JUSTOS', /\bJUSTOS\b/], ['PORTO', /\bPORTO\b/]
];

// Complemento.gs:21
function cp_norm_(s) { return vd_semAcento_(s).replace(/[^A-Z0-9]/g, ''); }

// Complemento.gs:87
function cp_palavras_(s) { return vd_semAcento_(s).replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 2; }); }

// Complemento.gs:88
function cp_posicoes_(pal) { var o = {}; pal.forEach(function (w) { var c = CP_POSICAO[w]; if (c) o[CP_EIXO[c]] = c; }); return o; }

// Complemento.gs:89
function cp_fortes_(pal) { return pal.filter(function (w) { return w.length >= 3 && !CP_PAL_FRACA.test(w) && !CP_POSICAO[w]; }); }

// Complemento.gs:92
function cp_similar_(descA, descB) {
  var pa = cp_palavras_(descA), fa = cp_fortes_(pa), xa = cp_posicoes_(pa);
  var pb = cp_palavras_(descB), fb = cp_fortes_(pb), xb = cp_posicoes_(pb);
  if (!fa.length || !fb.length || fa[0] !== fb[0]) return 0;   // RADIADOR x CONDENSADOR
  if (Object.keys(xa).some(function (e) { return xb[e] && xb[e] !== xa[e]; })) return 0;   // FAROL ESQ x FAROL DIR
  var comum = fa.filter(function (w) { return fb.indexOf(w) >= 0; }).length;
  var n = comum / (fa.length + fb.length - comum);
  return n >= 0.5 ? n : 0;
}

// FormularioServidor.gs:592
function vd_dataCurta_(s) {
  var iso = vd_dataBR_(s);
  return iso ? Utilities.formatDate(new Date(iso), 'America/Sao_Paulo', 'dd/MM') : String(s || '');
}

// FormularioServidor.gs:598
function vd_dataBR_(s) {
  var iso = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], 12, 0, 0).toISOString();
  var m = String(s || '').match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!m) { var d0 = new Date(s); return isNaN(d0.getTime()) ? '' : d0.toISOString(); }
  var ano = m[3] ? +m[3] : new Date().getFullYear();
  if (ano < 100) ano += 2000;
  var d = new Date(ano, +m[2] - 1, +m[1], 12, 0, 0);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

// FormularioServidor.gs:610
function vd_valorNum_(s) {
  s = String(s == null ? '' : s).replace(/R\$/i, '').replace(/\s/g, '');
  if (!s) return NaN;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');
  return parseFloat(s);
}

// FormularioServidor.gs:619
function vd_valorBR_(v) {
  var n = typeof v === 'number' ? v : vd_valorNum_(v);
  if (isNaN(n)) return '';
  var s = n.toFixed(2).split('.');
  return 'R$ ' + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + s[1];
}

// Fornecedores.gs:99
function fo_norm_(s) { return vd_semAcento_(s).replace(/[^A-Z0-9]+/g, ' ').trim(); }

// Fornecedores.gs:132
function fo_resolver_(digitado, lista) {
  var alvo = fo_norm_(digitado);
  if (!alvo) return { nome: '', novo: false };
  lista = lista || fo_lista_();
  for (var i = 0; i < lista.length; i++) {
    var f = lista[i];
    if (fo_norm_(f.nome) === alvo) return { nome: f.nome, novo: false, f: f };
    for (var j = 0; j < f.apelidos.length; j++) if (fo_norm_(f.apelidos[j]) === alvo) return { nome: f.nome, novo: false, f: f };
  }
  return { nome: String(digitado).trim().toUpperCase().replace(/\s+/g, ' '), novo: true };
}

// Orcamento.gs:18
function vd_normTexto_(texto) {
  return vd_semAcento_(String(texto || '').replace(/\r/g, '')).replace(/[\s ]+/g, ' ');
}

// Orcamento.gs:22
function vd_codigoInterno_(c) {
  return /^0{2,}\d+$/.test(c) || /^SOMA\d+$/.test(c);
}

// Orcamento.gs:27
function vd_ehServico_(desc) {
  return /TAXA|ASSESSORIA|BORRACHARIA|GEOMETRIA|ALINHAMENTO|BALANCEAMENTO|PRESILHA|MAO DE OBRA|LAVAGEM|POLIMENTO|HIGIENIZA|GUINCHO|REBOQUE|DIAGNOSTICO|SCANNER|RECARGA|FRETE/.test(desc);
}

// Orcamento.gs:31
function vd_tipoOrcamento_(t) {
  t = String(t || '').toUpperCase();
  if (/^GENU/.test(t)) return 'GENUÍNA';
  if (/^REPOSI/.test(t)) return 'REPOSIÇÃO';
  return t;
}

// Orcamento.gs:39
function vd_pneuDaDescricao_(desc) {
  var d = String(desc || '');
  if (!/\bPNEU/.test(d)) return null;
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

// Orcamento.gs:55
function vd_limparDescricao_(d) {
  return String(d || '')
    .replace(/^\(A\)\s*/, '')
    .replace(/^(?:\d{5,}\s+)+/, '')              // 2º código numérico do Cilia (ex.: 1632439)
    .replace(/^(?:PPG|PPC|PPO|PRO|PAR)\s+/, '')   // sigla de tipo do Cilia (PPG/PPC = paralela; PPO = original)
    .replace(/^\((.*)\)$/, '$1')
    .replace(/\s*-\s*VAL\.\s*[\d\/ ]*$/, '')
    .replace(/[()]/g, ' ')
    .replace(/\s*\*\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70);
}

// Orcamento.gs:70
function vd_numOrc_(s) { var n = parseFloat(String(s || '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? NaN : n; }

// Orcamento.gs:72
function vd_liquidoOrc_(unit, descPct) {
  var u = vd_numOrc_(unit), d = vd_numOrc_(descPct);
  if (isNaN(u)) return NaN;
  return isNaN(d) || d <= 0 || d >= 100 ? u : u * (1 - d / 100);
}

// Orcamento.gs:79
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

// Orcamento.gs:91
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
  if ((m = U.match(/\bCOR:? ([A-Z]{3,15})\b/)) && !/^(SINISTRO|NAO|AUTORIZADO|ENDERECO)$/.test(m[1])) r.cor = m[1];
  else if ((m = U.match(/FABRICACAO: ([A-Z]{3,15}) (?:19|20)\d\d/))) r.cor = m[1];
  else if ((m = U.match(/IMPREGNACAO:? ([A-Z]{3,15})\b/))) r.cor = m[1];   // Soma/Porto chama a cor de "Impregnação"
  // sinistro
  if ((m = U.match(/SINISTRO:? (\d[\d.\-\/]{6,})/))) r.sinistro = m[1];

  // valor líquido unitário da peça no orçamento (o que a seguradora paga) — 05/10/2026, Weslley: aparece ao lado da peça
  // na cotação/autorização e serve de base para a comparação com a cotação (economia < 20% vermelho, 20–30 amarelo, > 30 verde)
  var add = function (lista, codigo, desc, qtd, tipo, valor) {
    codigo = String(codigo || '').replace(/\s+/g, ' ').trim();
    desc = vd_limparDescricao_(desc);
    // OCR do Cilia às vezes gruda o código na descrição ("100260230EMBLEMA DA GRADE"): separa (RHV1E04, 05/10/2026)
    var mg = desc.match(/^(\d{6,})([A-Z].*)$/);
    if (mg && (!codigo || vd_codigoInterno_(codigo.replace(/\s/g, '')))) { codigo = mg[1]; desc = mg[2].trim(); }
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
  if (/PECAS FORNECIDAS PELA (HDI|OFICINA)/.test(U)) {
    r.origem = 'HDI';
    var reHdi = /([A-Z0-9]{3,20})\*? (?:\(A\) )?(.+?) (\d{1,3}) (\d{1,3}(?:\.\d{3})*,\d{2}) (\d{1,3}(?:\.\d{3})*,\d{2}) (\d{1,3},\d{2}|\?)/g;   // qtd, unit, total, desconto %
    var fimHdi = [/PECAS FORNECIDAS PELA/, /OPERACOES/, /RESUMO/, /SERVICOS ADICIONAIS/];
    var secO = vd_secao_(U, /PECAS FORNECIDAS PELA OFICINA/, fimHdi);
    var secF = vd_secao_(U, /PECAS FORNECIDAS PELA HDI/, fimHdi);
    [[secO, r.oficina], [secF, r.fo]].forEach(function (par) {
      var sec = par[0].replace(/^.*?DESCONTO \(%\)/, '');
      while ((m = reHdi.exec(sec))) add(par[1], m[1], m[2], m[3], '', vd_liquidoOrc_(m[4], m[6]));
    });
    return r;
  }

  // ---------- Websoma / Porto ----------
  if (/PECAS - TROCA/.test(U)) {
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
      while ((m = reWs.exec(corpo))) {
        // colunas: Vlr (bruto) · Desc. (%) · Vlr (líquido). Se o 3º número bate com bruto - desconto, é o líquido; senão calcula.
        var bruto = vd_numOrc_(m[5]), liq = vd_numOrc_(m[7]), calc = vd_liquidoOrc_(m[5], m[6]);
        var valorWs = (!isNaN(liq) && !isNaN(calc) && Math.abs(liq - calc) < 0.05) ? liq : (isNaN(calc) ? bruto : calc);
        add(ehFO ? r.fo : r.oficina, m[1], m[2], m[4], m[3], valorWs);
      }
    });
    return r;
  }

  // ---------- Cilia ----------
  if (/FORNECIMENTO/.test(U) && /\bT (?:-|\d+,\d{2})/.test(U)) {
    r.origem = 'CILIA';
    var reCi = /\bT (?:-|\d+,\d{2})(?: P \d+,\d{2})? (\d{1,3}) ([A-Z0-9]{4,20}) (?:\d{5,} )?(?:(GENUINA|ORIGINAL)|(PRO|PPO|PPG|PPC|PAR|OUTRAS FONTES|VERDE|USADA|RECONDICIONADA) )?(.+?) ?(OFICINA|SEGURADORA) (?:R\$(?: ?(\d{1,3}(?:\.\d{3})*,\d{2})(?: ?(?:R\$ ?)?(\d{1,3}(?:\.\d{3})*,\d{2})(?! ?%))?(?: ?(\d{1,3},\d{2}) ?%)?)?|-)/g;   // número seguido de % é desconto, não total (07/10/2026)
    while ((m = reCi.exec(U))) {
      var tipo = m[3] || m[4] || '';
      // Cilia: "OFICINA R$ unit [R$ total] [desc %]" — o valor unitário líquido; formato confirmado no 1º PDF real (05/10/2026)
      add(m[6] === 'SEGURADORA' ? r.fo : r.oficina, m[2], m[5], m[1], tipo, m[7] ? vd_liquidoOrc_(m[7], m[9]) : NaN);
    }
    return r;
  }
  return r;
}

// Previsao.gs:14
function pv_mesmoDia_(a, b) { return !!a && !!b && vd_dataCurta_(a) === vd_dataCurta_(b) && new Date(a).getFullYear() === new Date(b).getFullYear(); }

// Previsao.gs:242
function pv_diaNum_(d) { try { return +Utilities.formatDate(new Date(d), 'America/Sao_Paulo', 'yyyyMMdd'); } catch (e) { return 0; } }

// Previsao.gs:248
function pv_datas_(t, semHora) {
  var out = [], m, re = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b(\s*-?\s*\d{1,2}:\d{2})?/g;
  while ((m = re.exec(t))) {
    if (semHora && m[4]) continue;   // "23/09/26 - 08:35:21" é carimbo de status, não previsão
    var a = +m[3]; if (a < 100) a += 2000;
    var d = new Date(a, +m[2] - 1, +m[1], 12);
    if (!isNaN(d.getTime()) && a >= 2020 && a <= 2035) out.push(d);
  }
  return out;
}

// Previsao.gs:260
function pv_fornecedor_(janela, lista) {
  var U = vd_semAcento_(janela);
  var m = U.match(/FORNECEDOR\s*[:\-]?\s*([A-Z0-9][A-Z0-9 .&\/\-]{2,40}?)(?=\s{2,}|\s+\d{1,2}\/\d|\s+PREV|\s+DATA|\s+R\$|$)/);
  if (m && !/^(DA|DO|NAO|N\/A|-)$/.test(m[1].trim()) && !/^(EM COTACAO|AGUARDANDO|ENTREG|PREVIS|CANCELAD)/.test(m[1].trim())) return fo_resolver_(m[1].trim(), lista).nome;
  var melhor = '';
  (lista || []).forEach(function (f) {
    [f.nome].concat(f.apelidos || []).forEach(function (n) {
      var k = vd_semAcento_(n).trim();
      if (k.length < 3 || k.length <= melhor.length) return;
      if (new RegExp('(^|[^A-Z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Z0-9]|$)').test(U)) melhor = f.nome;
    });
  });
  if (melhor) return melhor;
  // tabela "STATUS DE ENTREGA" do Soma/Porto (05/10/2026): "... 25/09/2026 02/10/2026 ACCIOLY PR (43)33728810" —
  // o nome vem logo depois da última data (e antes do telefone); fornecedor novo entra no cadastro
  var mt = U.match(/\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\s+([A-Z][A-Z .&\/\-]{2,40}?)\s*(?=\(\d{2}\)|\d{2}\s?\d{4,}|\s{2,}|$)/);
  if (mt && /[A-Z]{3}/.test(mt[1]) && !/^(PREV|DATA|ENTREGA|PEDIDO|PRAZO|FORNECEDOR|TOTAL)\b/.test(mt[1].trim())) {
    try { return fo_resolver_(mt[1].trim(), lista).nome || mt[1].trim(); } catch (e) { return mt[1].trim(); }
  }
  return '';
}

// Previsao.gs:284
function pv_fornecedorCurto_(txt, lista) {
  var t = vd_semAcento_(txt).replace(/\s+/g, ' ').trim();
  if (t.indexOf('/') >= 0) t = t.split('/').pop().trim();
  var seg = t.split(/\s+-\s+/)[0].trim().replace(/[^A-Z0-9 .&]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!seg) return '';
  var r = fo_resolver_(seg, lista);
  if (!r.novo) return r.nome;
  var semMarca = seg.replace(/\s+(FIAT|VW|VOLKSWAGEN|GM|CHEVROLET|FORD|JEEP|RENAULT|HYUNDAI|TOYOTA|HONDA|NISSAN|PEUGEOT|CITROEN|BYD|MITSUBISHI|KIA|PR|SC|RS|SP|MG)$/, '');
  if (semMarca !== seg) { var r2 = fo_resolver_(semMarca, lista); if (!r2.novo) return r2.nome; }
  return r.nome;
}

// Previsao.gs:306
function pv_lerStatusCilia_(texto, lista) {
  var U = vd_semAcento_(String(texto || '').replace(/\r/g, ''));
  if (!/STATUS DAS PECAS|PREVISAO DE ENTREGA|STATUS DO PEDIDO/.test(U)) return null;
  var linhas = U.split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(String);
  var STATUS = /^(EM COTACAO|AGUARDANDO (APROVACAO|ENTREGA)|ENTREG|CANCELAD|RECUSAD)/;
  var LABEL = /^(CODIGO|PECA|QTD|FORNECEDOR|PREVIS|STATUS|ULTIMA|RASTREAM|PARECER|SEGURADORA|SINISTRO|ORCAMENTO|OFICINA|CIDADE|E)$|^\d{1,2}\/\d{1,2}\/\d{2,4}\s*-\s*\d/;
  var ehCodigo = function (t) { return /^[A-Z0-9]{6,20}$/.test(t) && (t.match(/\d/g) || []).length >= 4 && !/^\d{11,}$/.test(t) && !/^\d{1,2}\/\d/.test(t); };
  var ehData = function (t) { return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t); };
  var limpaForn = function (t) { return t.replace(/PREVISAO DE ENTREGA.*$/, '').replace(/\s+\d{1,2}\/\d{1,2}\/\d{2,4}.*$/, '').trim(); };
  var ehForn = function (t) {
    if (!/[A-Z]{3}/.test(t) || STATUS.test(t) || LABEL.test(t) || ehCodigo(t.replace(/\s/g, ''))) return false;
    if (/HTTPS?:|WWW\.|\.COM\b|\.BR\b|^PREVISAO|:/.test(t)) return false;   // link do portal, rótulo, parecer ("CONTATO COM FORNECEDOR: …")
    var t2 = t.replace(/PREVISAO DE ENTREGA.*$/, '').trim();
    if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t2) || t2.split(' ').filter(function (w) { return /[A-Z0-9]/.test(w); }).length > 8 || t2.split(' ').some(function (w) { return ehCodigo(w.replace(/[,.;]/g, '')); })) return false;   // texto de parecer
    return t2.indexOf('/') >= 0 && /[A-Z]{2}.*\/.*[A-Z]{2}/.test(t2);
  };
  var pecas = [], forns = [], prevs = [], entregas = [];   // cada um: {i (linha), ...}
  var reCol = /^([A-Z0-9]{6,20}) (.+?) (\d{1,3}) ([A-Z][A-Z0-9 .&\/\-]*?)(?: (\d{1,2}\/\d{1,2}\/\d{2,4}))?$/;
  for (var i = 0; i < linhas.length; i++) {
    var l = linhas[i];
    // a) linha em colunas
    var mc = l.match(reCol);
    if (mc && ehCodigo(mc[1]) && !STATUS.test(mc[4]) && !LABEL.test(mc[4])) {
      var forn = mc[4].trim(), acima = linhas[i - 1] || '';
      // "MEDIADORA - PRISMATEC / DUNA" na linha de cima e "FIAT ..." na linha da peça (layout em colunas do Cilia)
      if (acima.indexOf('/') >= 0 && /[A-Z]{3}/.test(acima) && !STATUS.test(acima) && !LABEL.test(acima) && !ehCodigo(acima.split(' ')[0]) && !/HTTPS?:|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(acima)) forn = (acima + ' ' + forn).replace(/\s+/g, ' ');
      pecas.push({ i: i, codigo: mc[1], descricao: mc[2].trim(), forn: forn, prev: mc[5] || '' });
      continue;
    }
    // b/c) tokens soltos
    if (ehCodigo(l)) {
      var desc = '';
      for (var k = i + 1; k < Math.min(i + 6, linhas.length); k++) {
        var c = linhas[k].replace(/\s*QTD$/, '').trim();
        if (!c || LABEL.test(c) || STATUS.test(c) || ehCodigo(c) || ehData(c) || /^\d{1,3}$/.test(c) || ehForn(c) || /^PREVISAO|HTTPS?:/.test(c)) continue;
        if (/[A-Z]{3}/.test(c)) { desc = c; break; }
      }
      pecas.push({ i: i, codigo: l, descricao: desc, forn: '', prev: '' });
      continue;
    }
    var mq = l.match(/^(.+?)\s*QTD$/);   // "FAROL DIREITOQTD" (Google) — descrição antes do código no bloco
    if (mq && /[A-Z]{3}/.test(mq[1]) && !ehCodigo(mq[1])) { pecas.push({ i: i, codigo: '', descricao: mq[1].trim(), forn: '', prev: '', semCodigo: true }); continue; }
    if (ehForn(l)) {
      var md = l.match(/PREVISAO DE ENTREGA\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      forns.push({ i: i, nome: limpaForn(l) });
      if (md) prevs.push({ i: i, data: md[1] });
      continue;
    }
    if (/^FORNECEDOR$/.test(l)) {   // nome na linha seguinte (quando não tem "/")
      var prox = linhas[i + 1] || '';
      if (/[A-Z]{3}/.test(prox) && !STATUS.test(prox) && !LABEL.test(prox) && !ehCodigo(prox) && !ehForn(prox)) forns.push({ i: i, nome: limpaForn(prox) });
      continue;
    }
    var mp = l.match(/^PREVISAO DE ENTREGA\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/); if (mp) { prevs.push({ i: i, data: mp[1] }); continue; }
    if (ehData(l)) { prevs.push({ i: i, data: l }); continue; }
    var me = l.match(/^ENTREG(?:UE)?(?: EM)?\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)?/) || (/^\d{1,2}\/\d{1,2}\/?$/.test(l) && /^ENTREG/i.test(linhas[i - 1] || '') ? [l, l] : null);
    if (me) { entregas.push({ i: i, data: me[1] || '' }); continue; }
  }
  // bloco "descrição + QTD" sem código na mesma linha (Google): o código é o próximo token de código
  pecas = pecas.filter(function (p, k) {
    if (!p.semCodigo) return true;
    var prox = pecas[k + 1];
    if (prox && !prox.semCodigo && prox.i - p.i <= 6) { prox.descricao = p.descricao; return false; }   // a descrição "…QTD" vale mais que o palpite
    return false;
  });
  if (!pecas.length) return null;
  // valor dominante (o documento costuma ter um fornecedor só; a linha de parecer que escapou não muda a maioria)
  var comum = function (arr, campo) { var s = {}, melhor = '', n = 0; arr.forEach(function (x) { s[x[campo]] = (s[x[campo]] || 0) + 1; if (s[x[campo]] > n) { n = s[x[campo]]; melhor = x[campo]; } }); return n >= 2 && n >= arr.length * 0.6 ? melhor : (arr.length === 1 ? melhor : ''); };
  var fornUnico = comum(forns, 'nome'), prevUnica = comum(prevs, 'data');
  var out = {};
  pecas.forEach(function (p, k) {
    var ini = p.i, fim = k + 1 < pecas.length ? pecas[k + 1].i : linhas.length;
    var noBloco = function (arr) { return arr.filter(function (x) { return x.i > ini && x.i < fim; })[0] || null; };
    var forn = p.forn || (noBloco(forns) || {}).nome || (forns.length === pecas.length ? forns[k].nome : fornUnico) || '';
    var prev = p.prev || (noBloco(prevs) || {}).data || (prevs.length === pecas.length ? prevs[k].data : prevUnica) || '';
    var ent = noBloco(entregas) || (entregas.length === pecas.length ? entregas[k] : null);
    var d = prev ? pv_datas_(prev) : [];
    var dEnt = ent && ent.data ? pv_datas_(/\/\d{2,4}$/.test(ent.data) ? ent.data : ent.data.replace(/\/?$/, '/' + new Date().getFullYear())) : [];
    out[cp_norm_(p.codigo)] = {
      codigo: p.codigo, descricao: p.descricao, fornecedor: forn ? pv_fornecedorCurto_(forn, lista) : '',
      previsao: d.length ? d[0].toISOString() : '', entregue: !!ent, entregueEm: dEnt.length ? dEnt[0].toISOString() : '',
      linha: (p.codigo + ' ' + p.descricao).slice(0, 120)
    };
  });
  return out;
}

// Previsao.gs:406
function pv_lerPareceresCilia_(texto) {
  var U = vd_semAcento_(String(texto || '').replace(/\r/g, ''));
  var reCab = /FLUXO:\s*\d+\s*\|.*?DATA DE CRIACAO:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/g;
  var cabs = [], m;
  while ((m = reCab.exec(U))) cabs.push({ i: m.index, fim: m.index + m[0].length, quando: new Date(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 12, m[5] ? +m[5] : 0) });
  if (!cabs.length) return [];
  var out = [];
  // "123 - FAROL ESQUERDO; 456 - GRADE" -> [{codigo:'123', descricao:'FAROL ESQUERDO'}, …] (código pode faltar)
  var itensDe = function (s) {
    return String(s || '').split(/[;,]/).map(function (x) {
      var mi = x.replace(/\s+/g, ' ').trim().match(/^(?:([A-Z0-9]{5,20})\s*-\s*)?(.+)$/);
      return mi ? { codigo: cp_norm_(mi[1] || ''), descricao: mi[2].trim() } : null;
    }).filter(function (x) { return x && /[A-Z]{3}/.test(x.descricao) && x.descricao.length <= 60 && !/CILIA|^\d|:/.test(x.descricao); });
  };
  var bonito = function (s) { s = String(s || '').replace(/\s*-\s*$/, '').trim().toLowerCase(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; };
  var dataDe = function (s, quando) {   // "12/10/2026" ou "12/10" (ano = do parecer; se cair antes dele, ano seguinte)
    var md = String(s || '').match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/); if (!md) return null;
    var a = md[3] ? +md[3] : quando.getFullYear(); if (a < 100) a += 2000;
    var d = new Date(a, +md[2] - 1, +md[1], 12);
    if (!md[3] && d.getTime() < quando.getTime() - 30 * 864e5) d = new Date(a + 1, +md[2] - 1, +md[1], 12);
    return isNaN(d.getTime()) ? null : d;
  };
  cabs.forEach(function (c, k) {
    var corpo = U.slice(c.fim, k + 1 < cabs.length ? cabs[k + 1].i : U.length).replace(/\s+/g, ' ')
      .replace(/HTTPS?:\/\/\S+/g, ' ').replace(/\s\d{1,2}\/\d{1,2}\s+\d{2}\/\d{2}\/\d{4},\s*\d{2}:\d{2}\s+CILIA - STATUS DO PEDIDO/g, ' ')   // link e rodapé de página do PDF
      .replace(/\s+/g, ' ').trim();
    var p = { quando: c.quando, itens: [], prazo: '', semPrevisao: false, bo: false, motivo: '', resumo: corpo.replace(/^QUERY_BUILDER\s*/, '').slice(0, 160) };
    var mAlt = corpo.match(/DO\(?S?\)? ITE[MN]\(?N?S?\)?\s*:?\s*(.+?)\s+FOI ALTERAD[OA] PARA\s+(SEM PREVISAO|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?:\s+PELO MOTIVO\s+(.+?))?\s*\.?\s*$/);
    var mNovo = corpo.match(/NOVO PRAZO\s*:\s*(SEM PREVISAO|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
    var mBo = corpo.match(/REGISTRADO B\.?O\.? PARA O\(?S?\)? ITE[MN]\(?N?S?\)?\s*:?\s*(.+?)(?:\s*-\s*LAUDO\s*:\s*(.+?))?\s*\.?\s*$/);
    var mPrev = corpo.match(/OS ITENS\s+(.+?)\s+EM PROCESSO DE FORNECIMENTO COM PREVISAO DE ENTREGA PARA O DIA\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (mAlt) {
      p.itens = itensDe(mAlt[1]);
      if (/SEM PREVISAO/.test(mAlt[2])) p.semPrevisao = true; else { var d1 = dataDe(mAlt[2], c.quando); if (d1) p.prazo = d1.toISOString(); }
      p.motivo = bonito((mAlt[3] || '').slice(0, 80));
      if (/^B\.?O\.?$/i.test(p.motivo)) { p.bo = true; p.motivo = 'B.O.'; }
    } else if (mNovo) {
      var mPecas = corpo.match(/PECAS\s*:?\s*(.+?)\s*-?\s*CONTATO COM (?:O )?FORNECEDOR/);
      p.itens = itensDe(mPecas ? mPecas[1] : '');
      if (/SEM PREVISAO/.test(mNovo[1])) p.semPrevisao = true; else { var d2 = dataDe(mNovo[1], c.quando); if (d2) p.prazo = d2.toISOString(); }
      var mMot = corpo.match(/MOTIVO DO ATRASO\s*:\s*(.+?)\s*-?\s*(?:ACAO|SITUACAO|NUMERO|CONTATO|NOVO PRAZO)\b/) || corpo.match(/MOTIVO DO ATRASO\s*:\s*(.+?)\s*-\s*/);
      p.motivo = bonito(mMot ? mMot[1].slice(0, 80) : '');
      if (p.semPrevisao && /OBSOLET|DESCONTINUAD|\bEM B\.?O\b|COTACAO B\.?O/.test(corpo)) { p.bo = true; p.motivo = p.motivo || (/OBSOLET|DESCONTINUAD/.test(corpo) ? 'Peça obsoleta' : 'B.O.'); }
    } else if (mBo) {
      p.itens = itensDe(mBo[1].replace(/,?\s*(AUTOMATICA|DEVIDO).*$/, '')); p.bo = true; p.semPrevisao = true; p.motivo = 'B.O.' + (mBo[2] ? ' — laudo: ' + bonito(mBo[2].slice(0, 60)) : '');
    } else if (mPrev) {
      p.itens = itensDe(mPrev[1]); var d3 = dataDe(mPrev[2], c.quando); if (d3) p.prazo = d3.toISOString();
      p.motivo = '';
    } else return;   // parecer sem prazo (contato, NF, etc.): não muda nada
    if (p.itens.length) out.push(p);
  });
  out.sort(function (a, b) { return b.quando - a.quando; });
  return out;
}

// Previsao.gs:462
function pv_ultimaAtualizacaoCilia_(texto) {
  var m = vd_semAcento_(String(texto || '')).match(/ULTIMA ATUALIZACAO\s*\(?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  var a = +m[3]; if (a < 100) a += 2000;
  var d = new Date(a, +m[2] - 1, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  return isNaN(d.getTime()) ? null : d;
}

// Previsao.gs:474
function pv_aplicarPareceres_(achados, texto, alvos) {
  var pareceres = pv_lerPareceresCilia_(texto);
  if (!pareceres.length) return 0;
  var tabela = pv_ultimaAtualizacaoCilia_(texto), n = 0;
  var acha = function (cod, desc, soNovos) {
    for (var i = 0; i < pareceres.length; i++) {
      var p = pareceres[i];
      if (soNovos && tabela && p.quando <= tabela) return null;   // dali para trás a tabela já reflete (ou é mais nova que) o parecer
      var bate = p.itens.some(function (it) { return (cod.length >= 5 && it.codigo && (it.codigo === cod || it.codigo.indexOf(cod) >= 0 || cod.indexOf(it.codigo) >= 0)) || cp_similar_(desc, it.descricao) > 0; });
      if (bate) return p;
    }
    return null;
  };
  var aplica = function (r, par) {
    var quando = Utilities.formatDate(par.quando, 'America/Sao_Paulo', 'dd/MM');
    if (par.semPrevisao) {
      r.situacao = 'BO'; r.motivo = (par.motivo || 'sem previsão') + ' (parecer Cilia de ' + quando + ')';
    } else if (par.prazo && !(r.previsao && pv_mesmoDia_(par.prazo, r.previsao))) {
      // sem a data da tabela não dá para saber quem é mais novo: só aceita o parecer que ADIA (é o que a mediadora registra)
      if (!tabela && r.previsao && pv_diaNum_(par.prazo) < pv_diaNum_(r.previsao)) return false;
      r.previsaoTabela = r.previsao; r.previsao = par.prazo;
      r.motivo = (par.motivo || 'prazo alterado no parecer') + ' (parecer Cilia de ' + quando + ')';
    } else return false;
    r.parecer = par.resumo; n++;
    return true;
  };
  achados.forEach(function (r) {
    if (r.entregue) return;
    var a = r.alvo || {};
    var par = acha(cp_norm_(r.codigoNovo || a.codigo || a.codigoOrc), r.descNova || a.descricao || a.nome || '', true);
    if (par) aplica(r, par);
  });
  // peça do card que SUMIU da tabela (B.O./obsoleta): o parecer é a única pista — entra só com a situação
  var lidos = achados.map(function (r) { return r.alvo && r.alvo.id; });
  (alvos || []).forEach(function (a) {
    if (lidos.indexOf(a.id) >= 0) return;
    var par = acha(cp_norm_(a.codigo || a.codigoOrc), a.descricao || a.nome || '', false);
    if (par && par.semPrevisao) { var r = { alvo: a, fornecedor: '', previsao: '', linha: par.resumo.slice(0, 120), soParecer: true }; if (aplica(r, par)) achados.push(r); }
  });
  return n;
}

// Previsao.gs:527
function pv_lerHdiPecas_(texto, lista) {
  var U = vd_semAcento_(texto);
  if (!/PE[CG]AS DO (SINISTRO|LAUDO)/.test(U)) return null;   // OCR lê "Peças" como "Pegas"
  var linhas = String(texto || '').replace(/\r/g, '').split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(String);
  var ini = -1, fim = linhas.length;
  linhas.forEach(function (l, i) {
    var u = vd_semAcento_(l);
    if (ini < 0 && /PE[CG]AS DO (LAUDO|SINISTRO)/.test(u)) ini = i;
    if (ini >= 0 && i > ini && /^FECHAR$/.test(u) && fim === linhas.length) fim = i;
  });
  var reTel = /\(\d{2}\)\s*\d{4,5}-?\d{4}/, reMail = /\S+@\S+\.\S+/, reData = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
  var cab = /^(PECA|PECAS|PREV\.?\s*ENTREGA|ENTREGA|FORNECEDOR|TEL\.?|E-?MAIL|PE[CG]AS DO LAUDO.*|PE[CG]AS DO SINISTRO|OLA .*)$|PREV\.?\s*ENTREGA.*FORNECEDOR/;
  var pecas = [], fornecedores = [], datasSoltas = [], entregasSoltas = [], colunaAtual = '';
  var fornDe = function (t) { t = t.replace(reMail, '').replace(reTel, '').replace(/\s+/g, ' ').trim(); return t ? pv_fornecedorCurto_(t, lista) || t : ''; };
  for (var i = ini + 1; i < fim; i++) {
    var l = linhas[i], u = vd_semAcento_(l);
    // cabeçalho de coluna sozinho na linha (layout em colunas): diz de que coluna são as linhas seguintes
    if (/^(ENTREGA|FORNECEDOR|TEL\.?|E-?MAIL)$/.test(u) && pecas.length) { colunaAtual = u.replace(/\W/g, ''); continue; }
    if (cab.test(u)) continue;
    if (/^FORNECIDO PELA OFICINA$/.test(u)) { fornecedores.push({ oficina: true }); continue; }
    var datas = l.match(reData) || [];
    var soDatas = datas.length && l.replace(reData, '').replace(/[\s\-]/g, '') === '';
    if (soDatas) { datas.forEach(function (d) { (colunaAtual === 'ENTREGA' ? entregasSoltas : datasSoltas).push(d); }); continue; }
    var temForn = reTel.test(l) || reMail.test(l), oficinaNaLinha = /FORNECIDO PELA OFICINA/.test(u);
    if (temForn && !datas.length && colunaAtual) { fornecedores.push({ nome: fornDe(l) }); continue; }   // coluna Fornecedor, uma célula por linha
    var desc = l.replace(reMail, '').replace(reTel, '');
    var pos = desc.search(reData); if (pos >= 0) desc = desc.slice(0, pos);
    var fornTxt = '';
    if (temForn) { var m = l.match(reData); var dep = m ? l.slice(l.lastIndexOf(m[m.length - 1]) + m[m.length - 1].length) : ''; fornTxt = dep || ''; }
    if (oficinaNaLinha) desc = desc.replace(/fornecido pela oficina/i, '');
    desc = desc.replace(/\s+/g, ' ').trim();
    if (!desc || desc.length < 4) {
      // só fornecedor na linha (layout em colunas): entra na fila de fornecedores
      if (temForn) fornecedores.push({ nome: fornDe(l) });
      continue;
    }
    if (!/[A-Z]{3,}/.test(vd_semAcento_(desc))) continue;
    var p = { descricao: desc.toUpperCase(), previsao: '', entregueEm: '', entregue: false, fornecedor: '', oficina: oficinaNaLinha, linha: l.slice(0, 120) };
    if (datas[0]) p.previsao = datas[0];
    if (datas[1]) p.entregueEm = datas[1];
    if (temForn) p.fornecedor = fornDe(fornTxt || l.slice(desc.length));
    p._temForn = temForn || oficinaNaLinha;
    pecas.push(p);
  }
  // layout em colunas: datas soltas e fornecedores casam pela ordem com as peças que ficaram sem
  var semData = pecas.filter(function (p) { return !p.previsao; });
  datasSoltas.forEach(function (d, k) { if (semData[k]) semData[k].previsao = d; });
  var comPrev = pecas.filter(function (p) { return p.previsao && !p.entregueEm; });
  entregasSoltas.forEach(function (d, k) { if (comPrev[k]) comPrev[k].entregueEm = d; });
  var semForn = pecas.filter(function (p) { return !p._temForn; });
  fornecedores.forEach(function (f, k) { if (!semForn[k]) return; if (f.oficina) semForn[k].oficina = true; else semForn[k].fornecedor = f.nome; });
  pecas.forEach(function (p) {
    delete p._temForn;
    var dp = p.previsao ? pv_datas_(p.previsao)[0] : null, de = p.entregueEm ? pv_datas_(p.entregueEm)[0] : null;
    p.previsao = dp ? dp.toISOString() : '';
    p.entregueEm = de ? de.toISOString() : '';
    p.entregue = !!de;
  });
  return pecas.length ? pecas : null;
}

// Previsao.gs:588
function pv_lerFornecimento_(texto, alvos, lista) {
  var linhas = String(texto || '').replace(/\r/g, '').split('\n');
  var norm = linhas.map(cp_norm_);
  lista = lista || (function () { try { return fo_lista_(); } catch (e) { return []; } })();
  // "Peças do sinistro" do portal HDI: sem código — casa pela descrição (07/10/2026)
  var hdi = null; try { hdi = pv_lerHdiPecas_(texto, lista); } catch (e) { console.log('peças hdi: ' + e); }
  if (hdi) {
    var outH = [], usadasH = {};
    (alvos || []).forEach(function (a) {
      var melhor = -1, nota = 0;
      hdi.forEach(function (p, i) {
        if (usadasH[i] || p.oficina) return;
        var sim = cp_similar_(a.descricao || a.nome, p.descricao);
        if (sim > nota) { nota = sim; melhor = i; }
      });
      if (melhor < 0) return;
      usadasH[melhor] = 1;
      var r = hdi[melhor];
      outH.push({ alvo: a, fornecedor: r.fornecedor, previsao: r.previsao, linha: r.linha, entregue: r.entregue, entregueEm: r.entregueEm });
    });
    if (outH.length) return outH;
  }
  // layout "Status do Pedido" do Cilia: fornecedor em duas linhas e data na linha da peça — leitor próprio
  var cilia = null; try { cilia = pv_lerStatusCilia_(texto, lista); } catch (e) { console.log('status cilia: ' + e); }
  if (cilia) {
    var outC = [], usadasC = {}, semCodigo = [];
    (alvos || []).forEach(function (a) {
      var k = cp_norm_(a.codigo || a.codigoOrc); if (k.length < 5) { semCodigo.push(a); return; }
      var kd = (k.match(/^\d{5,}/) || [k])[0];   // código grudado na descrição ("100260230EMBLEMA"): só os dígitos
      var r = cilia[k] || cilia[kd];
      if (r) { usadasC[cilia[k] ? k : kd] = 1; outC.push({ alvo: a, fornecedor: r.fornecedor, previsao: r.previsao, linha: r.linha, entregue: r.entregue, entregueEm: r.entregueEm }); }
      else semCodigo.push(a);
    });
    // peça do card cujo código não está no documento: mesma peça pela descrição = código mudou -> devolve o código novo
    semCodigo.forEach(function (a) {
      var melhor = '', nota = 0;
      Object.keys(cilia).forEach(function (kk) {
        if (usadasC[kk]) return;
        var sim = cp_similar_(a.descricao || a.nome, cilia[kk].descricao);
        if (sim > nota) { nota = sim; melhor = kk; }
      });
      if (!melhor) return;
      usadasC[melhor] = 1;
      var r = cilia[melhor];
      outC.push({ alvo: a, fornecedor: r.fornecedor, previsao: r.previsao, linha: r.linha, codigoNovo: r.codigo, descNova: r.descricao, entregue: r.entregue, entregueEm: r.entregueEm });
    });
    if (outC.length) {
      // pareceres mais novos que a tabela mudam a previsão (com motivo) ou marcam B.O. (07/10/2026)
      try { pv_aplicarPareceres_(outC, texto, alvos); } catch (e) { console.log('pareceres cilia: ' + e); }
      return outC;
    }
  }
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  var out = [];
  var recente = function (t) { return pv_datas_(t, true).filter(function (d) { return d >= new Date(hoje.getTime() - 60 * 864e5); }); };
  (alvos || []).forEach(function (a) {
    var k = cp_norm_(a.codigo || a.codigoOrc);
    if (k.length < 5) return;
    // o código pode aparecer mais de uma vez (Soma: na lista de FO e de novo na tabela STATUS DE ENTREGA, que é a
    // que tem fornecedor e prazo): olha todas as ocorrências e fica com a que tem data; senão a que tem fornecedor
    var achado = null;
    for (var i = 0; i < norm.length; i++) {
      if (norm[i].indexOf(k) < 0) continue;
      // a própria linha; se faltar data ou fornecedor, as seguintes (OCR quebra colunas: até 12 linhas) até aparecer outra peça
      var janela = linhas[i];
      for (var j = i + 1; j < Math.min(i + 13, linhas.length); j++) {
        if (/\b(?=[A-Z0-9]*\d{5,})[A-Z0-9]{6,}\b/.test(vd_semAcento_(linhas[j]))) break;
        janela += '  ' + linhas[j];
      }
      var ds = recente(linhas[i]); if (!ds.length) ds = recente(janela);
      var prev = ds.length ? new Date(Math.max.apply(null, ds)) : null;
      var forn = pv_fornecedor_(linhas[i], lista) || pv_fornecedor_(janela, lista);
      var cand = { alvo: a, fornecedor: forn, previsao: prev ? prev.toISOString() : '', linha: linhas[i].trim().slice(0, 120) };
      if (!achado || (!achado.previsao && cand.previsao) || (!achado.previsao && !achado.fornecedor && cand.fornecedor)) achado = cand;
      if (achado.previsao && achado.fornecedor) break;
    }
    if (achado) out.push(achado);
  });
  return out;
}

// Previsao.gs:670
function pv_enriquecerFo_(texto, fo) {
  if (!fo || !fo.length) return 0;
  var n = 0;
  pv_lerFornecimento_(texto, fo).forEach(function (r) {
    if (r.fornecedor) { r.alvo.fornecedor = r.fornecedor; n++; }
    if (r.previsao) r.alvo.previsao = r.previsao;
  });
  return n;
}

// Validacao.gs:183
function vd_semAcento_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

// Validacao.gs:214
function vd_normPlaca_(p) {
  return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Validacao.gs:218
function vd_placaMercosul_(p) {
  p = vd_normPlaca_(p);
  if (/^[A-Z]{3}\d{4}$/.test(p)) return p.slice(0, 4) + 'ABCDEFGHIJ'.charAt(+p.charAt(4)) + p.slice(5);
  return p;
}

// Validacao.gs:223
function vd_mesmaPlaca_(a, b) {
  return !!a && !!b && vd_placaMercosul_(a) === vd_placaMercosul_(b);
}

// Validacao.gs:229
function vd_placaDoTexto_(s) {
  var m = String(s || '').toUpperCase().match(/\b([A-Z]{3})[\s\-]?(\d[A-Z0-9]\d{2})\b/);
  return m ? m[1] + m[2] : '';
}

// Validacao.gs:234
function vd_normChassi_(c) {
  return String(c || '').toUpperCase().replace(/[\s.\-]/g, '');
}

// Validacao.gs:237
function vd_chassiValido_(c) {
  c = vd_normChassi_(c);
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(c) && /[A-Z]/.test(c) && /\d{4}$/.test(c);
}

// Validacao.gs:475
function vd_valorOrcTxt_(v) {
  if (v == null || v === '') return '';
  var n = typeof v === 'number' ? v : vd_valorNum_(v);
  return isNaN(n) || n <= 0 ? '' : vd_valorBR_(n);
}

// Validacao.gs:575
function vd_motorDoModelo_(m) {
  var s = String(m || '');
  var d = s.match(/\b\d\.\d\b/);
  if (!d) return '';
  var resto = s.slice(d.index + d[0].length);
  var tk = resto.match(/\b(\d{1,2}V|TURBO|DIESEL|FLEX|ECONO\.?\s?FLEX|TSI|TFSI|THP|MPI|HIBRIDO|HYBRID)\b/g) || [];
  return [d[0]].concat(tk.filter(function (t, i) { return tk.indexOf(t) === i; })).join(' ');
}

// Validacao.gs:583
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

// Validacao.gs:779
function vd_dicaNorm_(t) {
  var s = vd_semAcento_(t);
  if (/^GENU/.test(s)) return 'GENUÍNO';
  if (/^ORIGINAL/.test(s)) return 'ORIGINAL';
  if (/REPOSI|^PRO$|^PPG$|^PPC$|^PAR$|OUTRAS FONTES/.test(s)) return 'REPOSIÇÃO';
  if (/^PPO$/.test(s)) return 'ORIGINAL';
  if (/VERDE|USAD|RECOND/.test(s)) return 'USADO';
  return '';
}

// Validacao.gs:815
function vd_orcCompacto_(lista) {
  return (lista || []).map(function (p) {
    return p.pneu ? ['P', p.medida || '', p.marca || '', p.qtd || '1'] : [p.codigo || '', String(p.descricao || '').slice(0, 60), p.qtd || '1', vd_dicaNorm_(p.dica), vd_valorOrcTxt_(p.valorOrc)];   // [4] = valor líquido no orçamento (06/10/2026)
  });
}

// Validacao.gs:820
function vd_orcExpandir_(lista) {
  return (lista || []).map(function (x) {
    return x[0] === 'P' && x.length === 4
      ? { pneu: true, medida: x[1], marca: x[2], categoria: '', qtd: x[3] }
      : { pneu: false, codigo: x[0], descricao: vd_limparDescricao_(x[1]), tipos: [], qtd: x[2], dica: x[3] || '', valorOrc: x[4] || '' };
  });
}

export { CP_EIXO, CP_PAL_FRACA, CP_POSICAO, VD_SEGURADORAS, cp_fortes_, cp_norm_, cp_palavras_, cp_posicoes_, cp_similar_, fo_norm_, fo_resolver_, pv_aplicarPareceres_, pv_datas_, pv_diaNum_, pv_enriquecerFo_, pv_fornecedorCurto_, pv_fornecedor_, pv_lerFornecimento_, pv_lerHdiPecas_, pv_lerPareceresCilia_, pv_lerStatusCilia_, pv_mesmoDia_, pv_ultimaAtualizacaoCilia_, vd_chassiValido_, vd_codigoInterno_, vd_dataBR_, vd_dataCurta_, vd_dicaNorm_, vd_ehServico_, vd_extrair_, vd_lerOrcamento_, vd_limparDescricao_, vd_liquidoOrc_, vd_mesmaPlaca_, vd_motorDoModelo_, vd_normChassi_, vd_normPlaca_, vd_normTexto_, vd_numOrc_, vd_orcCompacto_, vd_orcExpandir_, vd_placaDoTexto_, vd_placaMercosul_, vd_pneuDaDescricao_, vd_secao_, vd_semAcento_, vd_tipoOrcamento_, vd_valorBR_, vd_valorNum_, vd_valorOrcTxt_ };
