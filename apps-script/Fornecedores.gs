/* ============================ CADASTRO DE FORNECEDORES ============================
 * Aba FORNECEDORES da planilha de backup: Nome (como vai no Trello) | Apelidos (separados por |) |
 * Código Databox | CNPJ | Cadastro (razão social) | Usos | Último uso | Origem.
 * - O formulário de cotação sugere os nomes enquanto se digita (autocompletar) e aceita nome novo.
 * - Nome digitado igual a um nome ou apelido (sem acento/pontuação) vira o nome oficial.
 * - Nome novo entra na lista sozinho (Origem = quem lançou) — a lista aprende.
 * - Para unificar dois nomes: apague a linha repetida e ponha o nome dela em Apelidos da outra.
 * Semente: tabela-mestre de fornecedores do Databox (skill unity-fornecedores-databox, 30/09/2026).
 */
var FO = { ABA: 'FORNECEDORES', CAB: ['Nome', 'Apelidos', 'Código Databox', 'CNPJ', 'Cadastro', 'Usos', 'Último uso', 'Origem'], CACHE: 'fo_lista_v1' };

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

function fo_norm_(s) { return vd_semAcento_(s).replace(/[^A-Z0-9]+/g, ' ').trim(); }

function fo_aba_() {
  var ss = vd_planilhaBackup_().getParent();
  var sh = ss.getSheetByName(FO.ABA);
  if (!sh) {
    sh = ss.insertSheet(FO.ABA);
    sh.getRange(1, 1, 1, FO.CAB.length).setValues([FO.CAB]).setFontWeight('bold');
    sh.setFrozenRows(1);
    var linhas = FO_SEMENTE.map(function (x) { return [x[0], x[1], x[2], x[3], x[4], 0, '', 'tabela Databox']; });
    sh.getRange(2, 1, linhas.length, FO.CAB.length).setValues(linhas);
    sh.getRange('C:C').setNumberFormat('@'); sh.getRange('G:G').setNumberFormat('dd/MM/yyyy');
  }
  return sh;
}

/** [{nome, apelidos[], cod, usos, linha}] — cache de 10 min. */
function fo_lista_(semCache) {
  var cache = CacheService.getScriptCache();
  if (!semCache) { try { var c = cache.get(FO.CACHE); if (c) return JSON.parse(c); } catch (e) {} }
  var sh = fo_aba_(), n = sh.getLastRow();
  var v = n > 1 ? sh.getRange(2, 1, n - 1, 6).getValues() : [];
  var out = [];
  v.forEach(function (r, i) {
    var nome = String(r[0] || '').trim().toUpperCase();
    if (!nome) return;
    out.push({ nome: nome, apelidos: String(r[1] || '').split('|').map(function (s) { return s.trim().toUpperCase(); }).filter(String), cod: String(r[2] || ''), usos: +r[5] || 0, linha: i + 2 });
  });
  try { cache.put(FO.CACHE, JSON.stringify(out), 600); } catch (e) {}
  return out;
}

/** Nome digitado -> {nome oficial, novo?} */
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

/** Conta o uso dos nomes (e cadastra os novos). nomes = lista de nomes oficiais/novos. */
function fo_registrarUso_(nomes, usuario) {
  try {
    var unicos = nomes.filter(function (n, i) { return n && nomes.indexOf(n) === i; });
    if (!unicos.length) return;
    var lista = fo_lista_(true), sh = fo_aba_(), hoje = new Date();
    unicos.forEach(function (n) {
      var r = fo_resolver_(n, lista);
      if (r.novo) { sh.appendRow([r.nome, '', '', '', '', 1, hoje, 'formulário (' + (usuario || '?') + ')']); lista.push({ nome: r.nome, apelidos: [], cod: '', usos: 1, linha: sh.getLastRow() }); }
      else sh.getRange(r.f.linha, 6, 1, 2).setValues([[(r.f.usos || 0) + 1, hoje]]);
    });
    CacheService.getScriptCache().remove(FO.CACHE);
  } catch (e) { console.log('fornecedores: ' + e); }
}

/** Para o formulário: [[nome, "apelidos · cód"], ...] do mais usado para o menos usado. */
function fo_paraFormulario_() {
  try {
    return fo_lista_().slice().sort(function (a, b) { return (b.usos - a.usos) || (a.nome < b.nome ? -1 : 1); })
      .map(function (f) { return [f.nome, [f.apelidos.join(', '), f.cod ? 'Databox ' + f.cod : ''].filter(String).join(' · ')]; });
  } catch (e) { console.log('fornecedores/form: ' + e); return []; }
}

/** Roda na mão: cria a aba (com a semente) e mostra o link. */
function fo_abrirPlanilha() { var sh = fo_aba_(); Logger.log('FORNECEDORES: ' + sh.getParent().getUrl() + '#gid=' + sh.getSheetId() + ' — ' + (sh.getLastRow() - 1) + ' fornecedor(es)'); }
