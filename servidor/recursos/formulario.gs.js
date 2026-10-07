// GERADO AUTOMATICAMENTE por servidor/scripts/extrair-leitores.mjs formulario — NÃO EDITAR À MÃO.
// Código do robô (Apps Script) usado pelo formulário: roda no servidor dentro de um contexto vm com os
// serviços do Google imitados (src/gas/servicos.ts). Raízes: doPost + vdf_*.

// Anexos.gs:13
var AX = { ORC: '📄 ORÇ', ORC_MAIS: '📄 ORÇ+', FO: '🚚 FO', NF: '📦 NF', FOTO: '📸', SEP: ' · ' };

// Anexos.gs:14
var AX_RE_PADRAO = /^((📄 ORÇ\+?|🚚 FO|📦 NF( \d+)?) · |📸 )/;

// Campos.gs:12
var CF = {
  CAMPOS: [
    // mesmos nomes do quadro principal (as regras do Butler que põem os membros da unidade esperam estes)
    { nome: 'Unidade', tipo: 'list', opcoes: ['TOLEDO', 'RONDON', 'CASCAVEL', 'MOURÃO'] },
    { nome: 'Seguradora', tipo: 'list', opcoes: ['PARTICULAR'] },
    { nome: 'Tipo', tipo: 'list', opcoes: ['SEGURADORA', 'PARTICULAR', 'MISTO'] },
    { nome: 'Placa', tipo: 'text' },
    { nome: 'Consultor', tipo: 'text' },
    { nome: 'Total seguradora', tipo: 'number' },
    { nome: 'Total particular', tipo: 'number' },
    { nome: 'Total seg+part', tipo: 'number', antigo: 'Total comprado' },
    { nome: 'Nº Ordem', tipo: 'text', naoPreencher: true }
  ]
};

// Complemento.gs:14
var CP = {
  FO: 'FORNECIMENTO COMPLEMENTO',
  PAGAS: 'PAGAS COMPLEMENTO',
  ESPERA_CRIACAO_MS: 30 * 60 * 1000,   // anexo nos primeiros 30 min do card = orçamento original
  MAX_VISTOS: 400
};

// Complemento.gs:83
var CP_PAL_FRACA = /^(DE|DO|DA|DOS|DAS|COM|SEM|PARA|MOTOR|MANUAL|AUTOMATICO|AUTOMATICA|COMPLETO|COMPLETA|KIT|JOGO|UNIDADE|PCS|PECA)$/;

// Complemento.gs:85
var CP_POSICAO = { DIR: 'D', DIREITO: 'D', DIREITA: 'D', LD: 'D', ESQ: 'E', ESQUERDO: 'E', ESQUERDA: 'E', LE: 'E', DIANT: 'F', DIANTEIRO: 'F', DIANTEIRA: 'F', FRENTE: 'F', TRAS: 'T', TRASEIRO: 'T', TRASEIRA: 'T', SUP: 'S', SUPERIOR: 'S', INF: 'I', INFERIOR: 'I' };

// Complemento.gs:86
var CP_EIXO = { D: 1, E: 1, F: 2, T: 2, S: 3, I: 3 };

// Cota.gs:14
var QT = { LIMITE: 100000, ALERTA: 60000, PAUSA_MS: 10 * 60000, AVISO_MS: 12 * 3600 * 1000, GUARDAR_DIAS: 7 };

// Cota.gs:15
var QT_N = 0;

// Cota.gs:16
var QT_PARTES = {};

// Cota.gs:17
var QT_PARTE_ATUAL = '';

// Espelho.gs:14
var ES = {
  ORIGEM: 'oH4TbTqb',                       // quadro principal (só leitura)
  DESTINO: 'ZX4gRmnX',                      // quadro TESTE
  FLUXO: ['ESPERA/NÃO AUTORIZADO', 'FALTA DADOS PARA COTAR', 'EM COTAÇÃO', 'COTAÇÃO FINALIZADA', 'PENDENTE AUTORIZAR',
          'AUTORIZADO COMPRA', 'FALTA CHEGAR', 'ENCERRADO COMPRAS/FORNEC.'],
  FORA: 'ENTREGUES',                        // card que sai do fluxo no principal vai para cá no TESTE
  ABA: 'ESPELHO',
  MENCOES_OK: ['timweslley'],
  LIMITE_MS: 4.5 * 60 * 1000,
  TIPOS: 'createCard,copyCard,moveCardToBoard,convertToCardFromCheckItem,emailCard,updateCard,commentCard,' +
         'addAttachmentToCard,deleteAttachmentFromCard,addLabelToCard,removeLabelFromCard,addChecklistToCard,' +
         'removeChecklistFromCard,updateChecklist,createCheckItem,deleteCheckItem,updateCheckItem,updateCheckItemStateOnCard'
};

// Eventos.gs:8
var EV = {
  ABA: 'EVENTOS',
  CAB: ['Data/hora', 'Evento', 'Card', 'Link', 'Placa', 'Unidade', 'Tipo do pedido', 'Peça', 'Particular',
        'Fornecedor', 'Valor', 'Prazo (dias úteis)', 'Previsão', 'Usuário', 'Detalhe', 'Quadro']
};

// Fluxo.gs:14
var ST = {
  TRAVADAS: {
    'COTAÇÃO FINALIZADA': 'quando o comprador envia a cotação (anexo **💰 Cotação / Compra** → aba Cotação)',
    'PENDENTE AUTORIZAR': 'quando o comprador envia a cotação (anexo **💰 Cotação / Compra** → aba Cotação)',
    'AUTORIZADO COMPRA': 'quando a compra é autorizada (anexo **💰 Cotação / Compra** → aba ✅ Autorizar)',
    'FALTA CHEGAR': 'quando todas as peças são compradas (anexo **💰 Cotação / Compra** → aba 🛒 Compra)',
    'ENCERRADO COMPRAS/FORNEC.': 'quando todas as peças são recebidas (anexo **💰 Cotação / Compra** → aba 📦 Recebimento)'
  },
  INICIO: ['EM COTAÇÃO', 'FALTA DADOS PARA COTAR'],
  PREFIXO_OK: 'st_ok_',
  LIMITE_MS: 30 * 1000
};

// FormularioServidor.gs:26
var VDF_API = ['vdf_abrir', 'vdf_iniciar', 'vdf_buscarPlaca', 'vdf_carregarCard', 'vdf_lerDocumento',
  'vdf_salvarCotacao', 'vdf_salvarCompra', 'vdf_salvar', 'vdf_subirArquivo', 'vdf_lerAnexoCard', 'vdf_autorizar', 'vdf_devolverCotacao', 'vdf_salvarRecebimento', 'vdf_cotacaoIndisponivel', 'vdf_compararComplemento', 'vdf_alterarPrevisao', 'vdf_atualizarFornecimento', 'vdf_lerFornecimento', 'vdf_lerFornecimentoAnexo', 'vdf_avisarSolicitante', 'vdf_marcarOrdemAutorizada', 'vdf_padronizarAnexos', 'vdf_padronizarQuadro', 'vdf_padronizarQuadroStatus', 'vdf_textoAnexo', 'vdf_removerRepetidos', 'vdf_consumo', 'vdf_valoresOrcamento'];

// FormularioServidor.gs:86
var VDF_COMPRADORES_PADRAO = 'comprasunity,timweslley,christianfarias23';

// FormularioServidor.gs:93
var VDF_AUTORIZADORES_PADRAO = 'timweslley,comercialunity,christianfarias23';

// FormularioServidor.gs:216
var VD_MARCAS = ['CHEVROLET', 'CHEV', 'GM', 'VOLKSWAGEN', 'VW', 'FORD', 'FIAT', 'TOYOTA', 'HONDA', 'HYUNDAI', 'RENAULT', 'NISSAN',
  'JEEP', 'PEUGEOT', 'CITROEN', 'MITSUBISHI', 'KIA', 'BMW', 'AUDI', 'MERCEDES-BENZ', 'MERCEDES', 'BENZ', 'M.BENZ', 'LAND', 'ROVER',
  'VOLVO', 'CAOA', 'CHERY', 'BYD', 'GWM', 'RAM', 'DODGE', 'SUZUKI', 'SUBARU', 'JAC', 'LIFAN', 'PORSCHE', 'MINI', 'IVECO', 'SCANIA', 'I', 'IMP'];

// FormularioServidor.gs:259
var VDF_ETIQ_ORDEM = 'ORDEM AUTORIZADA';

// FormularioServidor.gs:274
var VDF_CAMPO_ORDEM = 'Nº Ordem';

// FormularioServidor.gs:362
var VD_CORES = ['BRANCO', 'BRANCA', 'PRETO', 'PRETA', 'PRATA', 'CINZA', 'VERMELHO', 'VERMELHA', 'AZUL', 'VERDE', 'AMARELO', 'AMARELA',
  'BEGE', 'MARROM', 'DOURADO', 'DOURADA', 'LARANJA', 'VINHO', 'GRAFITE', 'ROXO', 'ROXA', 'BRONZE', 'CHAMPAGNE'];

// FormularioServidor.gs:366
var VD_LIXO_TITULO = ['TOL', 'TOLEDO', 'MCR', 'RONDON', 'MARECHAL', 'CVEL', 'CASCAVEL', 'CM', 'CMO', 'MOURAO', 'CAMPO', 'IMAGE', 'PNG', 'JPG', 'JPEG', 'PDF'];

// FormularioServidor.gs:702
var VDF_LISTA_PENDENTE = 'PENDENTE AUTORIZAR';

// FormularioServidor.gs:703
var VDF_LISTA_FINALIZADA = 'COTAÇÃO FINALIZADA';

// FormularioServidor.gs:704
var VDF_LISTA_CHEGAR = 'FALTA CHEGAR';

// FormularioServidor.gs:728
var VDF_RX_REMOVE = /^(REMOVIDA|INDISPON[IÍ]VEL)\s*:\s*(.+?)\s+-\s+(.+)\s+-\s+R?\$?\s*([\d.]+(?:,\d{1,2})?)(?:\s+-\s+(.*))?\s*$/i;

// FormularioServidor.gs:1033
var VDF_ETIQUETA_PARCIAL = 'COTAÇÃO PARCIAL';

// FormularioServidor.gs:1073
var VDF_LISTA_AUTORIZADO = 'AUTORIZADO COMPRA';

// Fornecedores.gs:10
var FO = { ABA: 'FORNECEDORES', CAB: ['Nome', 'Apelidos', 'Código Databox', 'CNPJ', 'Cadastro', 'Usos', 'Último uso', 'Origem'], CACHE: 'fo_lista_v1' };

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

// Orcamento.gs:9
var VD_SEGURADORAS = [
  ['HDI', /\bHDI\b/], ['PORTO', /PORTO SEGURO/], ['AZUL', /\bAZUL\b/], ['ITAU', /\bITAU\b/],
  ['YELUM', /\bYELUM\b/], ['SANCOR', /\bSANCOR\b/], ['BRADESCO', /\bBRADESCO\b/], ['ALLIANZ', /\bALLIANZ\b/],
  ['TOKIO', /\bTOKIO\b/], ['MAPFRE', /\bMAPFRE\b/], ['SURA', /\bSURA\b/], ['ZURICH', /\bZURICH\b/],
  ['SUHAI', /\bSUHAI\b/], ['MITSUI', /\bMITSUI\b/], ['EZZE', /\bEZZE\b/], ['DARWIN', /\bDARWIN\b/],
  ['AMERICAS', /\bAMERICAS\b/], ['SOMPO', /\bSOMPO\b/], ['GENERALI', /\bGENERALI\b/], ['ALFA', /\bALFA SEGURADORA\b/],
  ['JUSTOS', /\bJUSTOS\b/], ['PORTO', /\bPORTO\b/]
];

// Previsao.gs:10
var PV = { EM_COTACAO: 'EM COTAÇÃO, AINDA SEM PRAZO', BO: 'B.O. NO PORTAL' };

// Recebimento.gs:10
var RC = { LISTA_FIM: 'ENCERRADO COMPRAS/FORNEC.' };

// Saude.gs:12
var SD = { EMAIL: 'weslley.santos@unitycs.com.br', FALHAS: 5, REPETE_MS: 6 * 3600 * 1000, BACKUPS: 8, PASTA: 'Backups' };

// Seguranca.gs:9
var SG = { LOCK_MS: 25000 };

// Seguranca.gs:10
var SG_TRAVADO = false;

// Validacao.gs:18
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

// Validacao.gs:204
var VD_ROT = {
  modelo: 'MODELO|VE[IÍ]CULO',
  ano: 'ANO(?:\\s*FAB(?:RICA[ÇC][ÃA]O)?\\s*/\\s*MOD(?:ELO)?)?|ANO\\s*/\\s*MODELO',
  motor: 'MOTOR\\s*/\\s*VERS[ÃA]O|MOTOR|VERS[ÃA]O',
  chassi: 'CHASSI|CHASSIS',
  placa: 'PLACA'
};

// Validacao.gs:277
var VD_ROT_EXTRA = {
  tipo: 'TIPO(?:\\s*D[OE]\\s*PEDIDO)?',
  cor: 'COR',
  seguradora: 'SEGURADORA',
  sinistro: 'SINISTRO|N[ºO°.]*\\s*SINISTRO'
};

// Validacao.gs:646
var VD_ANX_V = 3;

// Validacao.gs:834
var TR = { PREFIXO: 'VD_DESC_', ABA: 'TRAVA', ESPERA_MS: 40 * 1000, AVISO_MS: 60 * 60 * 1000 };

// Validacao.gs:1014
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

// Validacao.gs:1026
var DU_CACHE = {};

// Validacao.gs:1533
var VD_LINK = {
  EDITAR: '✏️ EDITAR/INCLUIR PEÇA',
  COMPRA: '💰 COTAÇÃO/COMPRA/RECEBIMENTO',
  RX_EDITAR: /Editar pe[çc]as|EDITAR\/INCLUIR PE[ÇC]A/i,
  RX_COMPRA: /Cota[çc][ãa]o \/ Compra|COTA[ÇC][ÃA]O\/COMPRA/i
};

// Validacao.gs:2095
var VD_CMP_MEM = null;

// Anexos.gs:16
function ax_hoje_(d) { var dt = d ? new Date(d) : new Date(); if (isNaN(dt.getTime())) dt = new Date(); return Utilities.formatDate(dt, 'America/Sao_Paulo', 'dd/MM'); }

// Anexos.gs:19
function ax_origem_(o) {
  o = String(o || '').trim().toUpperCase();
  if (!o) return '';
  return o === 'HDI' ? 'HDI' : o.charAt(0) + o.slice(1).toLowerCase();
}

// Anexos.gs:26
function ax_placa_(card) {
  var nome = String((card && card.name) || '');
  return vd_placaDoTexto_(nome.split(/\s+/)[0]) || vd_placaDoTexto_(nome) || '';
}

// Anexos.gs:32
function ax_nomeAutomatico_(nome) {
  var n = String(nome || '').replace(/\.[a-z0-9]{2,5}$/i, '').trim();
  return !n || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(n) || /^(image|img|imagem|foto|photo|picture|pic|screenshot|captura|print|scan|pdf_report|document|documento|file|arquivo|whatsapp image|whatsapp|dsc|pxl|vid|video)[\s_\-\d().]*(at[\s_\-\d().]*)?$/i.test(n) || /^[\d_\-\s().]+$/.test(n);
}

// Anexos.gs:38
function ax_padronizado_(nome) { return AX_RE_PADRAO.test(String(nome || '')); }

// Anexos.gs:41
function ax_nome_(tipo, placa, partes, data) {
  var p = [tipo].concat(placa ? [placa] : []).concat((partes || []).map(function (s) { return String(s || '').trim(); }).filter(String));
  p.push(ax_hoje_(data));
  var nome = p.join(AX.SEP);
  return /[A-Z]/i.test(tipo) ? nome : nome.replace(AX.SEP, ' ');   // "📸 RHV1E04 · capa · 05/10" (tipo só com o ícone)
}

// Anexos.gs:49
function ax_renomear_(cardId, idAnexo, nome, token) {
  try { vd_api_('/cards/' + cardId + '/attachments/' + idAnexo, { method: 'put', payload: { name: nome } }, token); return true; }
  catch (e) { console.log('renomear anexo ' + idAnexo + ': ' + e); return false; }
}

// Anexos.gs:60
function ax_batizar_(cardId, idAnexo, nomeNovo, anexos, token, opt) {
  opt = opt || {};
  var nome = nomeNovo;
  if (!opt.semVersao) {
    var pref = nomeNovo.split(AX.SEP).slice(0, 2).join(AX.SEP) + AX.SEP;   // "📄 ORÇ · RHV1E04 · "
    var irmaos = (anexos || []).filter(function (a) { return a.id !== idAnexo && String(a.name || '').indexOf(pref) === 0; });
    if (irmaos.length) {
      var maior = 0;
      irmaos.forEach(function (a) { var m = String(a.name).match(/ v(\d+)$/); if (m) maior = Math.max(maior, +m[1]); });
      irmaos.filter(function (a) { return !/ v\d+$/.test(a.name); })
        .sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id)); })
        .forEach(function (a) { maior++; ax_renomear_(cardId, a.id, a.name + ' v' + maior, token); });
      nome = nomeNovo + ' v' + (maior + 1);
    }
  }
  if (nome !== (opt.nomeAtual || '')) ax_renomear_(cardId, idAnexo, nome, token);
  return nome;
}

// Anexos.gs:80
function ax_anexos_(cardId, token) {
  try { return vd_api_('/cards/' + cardId + '/attachments', { query: { fields: 'name,date,isUpload' } }, token) || []; } catch (e) { return []; }
}

// Anexos.gs:89
function ax_batizarLido_(card, a, r, complementar, token) {
  try {
    if (!card || !a || !r || r.erro || ax_padronizado_(a.name)) return '';
    var placa = ax_placa_(card);
    if (!placa) return '';
    var nome = '';
    if (r.doc === 'FO') nome = ax_nome_(AX.FO, placa, [r.docNome || 'Status do Pedido Cilia'], a.date);
    else if (r.orcamento && (r.placas || []).some(function (p) { return vd_mesmaPlaca_(p, placa); })) {
      nome = ax_nome_(complementar ? AX.ORC_MAIS : AX.ORC, placa, [r.seguradora || '', ax_origem_(r.orcamento)], a.date);
    }
    if (!nome) return '';
    var fim = ax_batizar_(card.id, a.id, nome, ax_anexos_(card.id, token), token, { nomeAtual: a.name });
    a.name = fim;
    return fim;
  } catch (e) { console.log('ax_batizarLido_: ' + e); return ''; }
}

// Anexos.gs:107
function ax_numeroNf_(f) {
  try {
    var nomeArq = f.getName(), mime = f.getMimeType() || '';
    if (/xml/i.test(mime) || /\.xml$/i.test(nomeArq)) {
      var m = f.getBlob().getDataAsString().match(/<nNF>\s*0*(\d{1,9})\s*<\/nNF>/);
      return m ? m[1] : '';
    }
    if ((/pdf/i.test(mime) || /\.pdf$/i.test(nomeArq)) && f.getSize() <= 8 * 1024 * 1024) {
      var U = vd_normTexto_(vd_ocr_(f.getBlob(), nomeArq));
      var m2 = U.match(/\bN[ºO°]?\.?\s*0*(\d{1,3}(?:\.\d{3}){1,2})\b/) || U.match(/\b(?:NF-?E?|NOTA FISCAL|DANFE)\b[^0-9]{0,40}?N[ºO°]?\.?\s*0*(\d{3,9})\b/);
      return m2 ? m2[1].replace(/\./g, '').replace(/^0+/, '') : '';
    }
  } catch (e) { console.log('ax_numeroNf_: ' + e); }
  return '';
}

// Anexos.gs:127
function vdf_padronizarAnexos(token, shortLink) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria padroniza os anexos antigos.'] };
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,id', attachments: 'true', attachment_fields: 'name,fileName,mimeType,isUpload,bytes,url,date' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var out = { ok: true, renomeados: [], pulados: [] }, temOrc = false;
  (card.attachments || []).sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); }).forEach(function (a) {
    if (!a.isUpload || ax_padronizado_(a.name)) { if (a.isUpload) { out.pulados.push(a.name); if (a.name.indexOf(AX.ORC + AX.SEP) === 0) temOrc = true; } return; }
    var de = a.name;
    var r = vd_anexoLegivel_(a) ? vd_lerAnexoTrello_(a) : null;
    if (r && !r.erro && !r.doc && !r.orcamento && /\bFO\b|status/i.test(de)) r.doc = 'FO';   // leitura antiga (cache sem o tipo) de um "Status do Pedido"
    var para = r ? ax_batizarLido_(card, a, r, temOrc) : '';
    if (!para && /^image\//i.test(a.mimeType || '')) { para = ax_batizar_(card.id, a.id, ax_nome_(AX.FOTO, ax_placa_(card), [], a.date), [], token, { semVersao: true }); a.name = para; }
    if (para) { out.renomeados.push({ de: de, para: para }); if (para.indexOf(AX.ORC + AX.SEP) === 0) temOrc = true; }
    else out.pulados.push(de);
  });
  return out;
}

// Anexos.gs:151
function ax_padronizarCard_(card, token) {
  try {
    var ans = (card && card.attachments || []).filter(function (a) { return a.isUpload && !ax_padronizado_(a.name); });
    if (!ans.length || !ax_placa_(card) || vdf_cardProtegido_(card.name || '')) return 0;
    var props = PropertiesService.getScriptProperties(), n = 0;
    var temOrc = (card.attachments || []).some(function (a) { return String(a.name || '').indexOf(AX.ORC + AX.SEP) === 0; });
    ans.sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); }).forEach(function (a) {
      // foto com nome automático (uuid, image.png, IMG_1234, WhatsApp Image…, Screenshot…): vira "📸 PLACA · dd/MM";
      // foto com nome que alguém escreveu fica como está
      if (/^image\//i.test(a.mimeType || '') && ax_nomeAutomatico_(a.name)) {
        var nf = ax_nome_(AX.FOTO, ax_placa_(card), [], a.date);
        if (ax_renomear_(card.id, a.id, nf, token)) { a.name = nf; n++; }
        return;
      }
      var js = props.getProperty('VD_ANX3_' + a.id);
      if (!js) return;   // nunca lido: não gasta OCR aqui
      var r; try { r = JSON.parse(js); } catch (e) { return; }
      if (!r || r.erro) return;
      if (!r.doc && !r.orcamento && /\bFO\b|status/i.test(a.name)) r.doc = 'FO';
      var para = ax_batizarLido_(card, a, r, temOrc, token);
      if (para) { n++; if (para.indexOf(AX.ORC + AX.SEP) === 0) temOrc = true; }
    });
    return n;
  } catch (e) { console.log('ax_padronizarCard_: ' + e); return 0; }
}

// Anexos.gs:198
function vdf_padronizarQuadro(token) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria roda a padronização do quadro.'] };
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('AX_PASSO')) return { ok: true, jaRodando: true, passo: props.getProperty('AX_PASSO') };
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { query: { fields: 'id' } }) || [];
  props.setProperty('AX_PASSO', '0|0');
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'axPadronizarQuadro') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('axPadronizarQuadro').timeBased().after(5 * 1000).create();
  return { ok: true, cards: cards.length };
}

// Anexos.gs:211
function vdf_padronizarQuadroStatus(token) {
  vdf_usuario_(token);
  var p = PropertiesService.getScriptProperties().getProperty('AX_PASSO');
  return { rodando: !!p, passo: p || '' };
}

// Anexos.gs:219
function ax_md5_(blob) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, blob.getBytes()).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

// Anexos.gs:222
function ax_hashAnexo_(a) {
  try {
    var r = qt_fetch_(a.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
    return r.getResponseCode() < 300 ? ax_md5_(r.getBlob()) : '';
  } catch (e) { console.log('hash do anexo ' + a.id + ': ' + e); return ''; }
}

// Anexos.gs:233
function ax_removerRepetido_(cardId, a, quem) {
  try {
    if (!a || !a.isUpload || !a.bytes) return false;
    var lista = vd_api_('/cards/' + cardId + '/attachments', { query: { fields: 'name,fileName,bytes,date,isUpload,url' } }) || [];
    var cands = lista.filter(function (x) { return x.id !== a.id && x.isUpload && +x.bytes === +a.bytes && String(x.date || '') <= String(a.date || ''); });
    if (!cands.length) return false;
    var h = ax_hashAnexo_(a); if (!h) return false;
    var igual = null;
    for (var i = 0; i < cands.length && !igual; i++) if (ax_hashAnexo_(cands[i]) === h) igual = cands[i];
    if (!igual) return false;
    vd_api_('/cards/' + cardId + '/attachments/' + a.id, { method: 'delete' });
    // a série ficou com um só "… v1": volta ao nome sem versão
    var pref = String(igual.name || '').split(AX.SEP).slice(0, 2).join(AX.SEP) + AX.SEP;
    var serie = lista.filter(function (x) { return x.id !== a.id && String(x.name || '').indexOf(pref) === 0 && ax_padronizado_(x.name); });
    if (serie.length === 1 && / v1$/.test(serie[0].name)) { var nv = serie[0].name.replace(/ v1$/, ''); if (ax_renomear_(cardId, serie[0].id, nv)) { if (igual.id === serie[0].id) igual.name = nv; } }
    var card = { id: cardId };
    vd_comentar_(card, (quem ? '@' + quem + ' ' : '') + '🗑️ Anexo repetido removido: «' + a.name + '» é o mesmo arquivo que já está no card («' + igual.name + '»).');
    return true;
  } catch (e) { console.log('ax_removerRepetido_: ' + e); return false; }
}

// Anexos.gs:255
function vdf_removerRepetidos(token, shortLink) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria.'] };
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,id', attachments: 'true', attachment_fields: 'name,fileName,bytes,date,isUpload,url' } });
  var ans = (card.attachments || []).filter(function (a) { return a.isUpload; }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });   // mais novo primeiro
  var removidos = [];
  ans.forEach(function (a) { if (ax_removerRepetido_(card.id, a, '')) removidos.push(a.name); });
  return { ok: true, removidos: removidos };
}

// Campos.gs:27
function cf_ligado_() { return vd_prop_('CF_LIGADO', 'SIM') !== 'NAO'; }

// Campos.gs:30
function cf_defs_(semCache) {
  var board = vd_board_(), cache = CacheService.getScriptCache(), k = 'cf_defs2_' + board;
  if (!semCache) { try { var c = cache.get(k); if (c) return JSON.parse(c); } catch (e) {} }
  var b = vd_api_('/boards/' + board, { cru: true, query: { fields: 'id' } });
  var atuais = vd_api_('/boards/' + board + '/customFields', { cru: true }) || [];
  var defs = {};
  CF.CAMPOS.forEach(function (cfg, i) {
    var f = atuais.filter(function (x) { return String(x.name || '').trim().toUpperCase() === cfg.nome.toUpperCase(); })[0];
    // campo com nome antigo (ex.: "Total comprado"): renomeia em vez de criar outro
    if (!f && cfg.antigo) {
      var velho = atuais.filter(function (x) { return String(x.name || '').trim().toUpperCase() === cfg.antigo.toUpperCase(); })[0];
      if (velho) { try { f = vd_api_('/customFields/' + velho.id, { method: 'put', payload: { name: cfg.nome } }); } catch (e) { f = velho; } }
    }
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

// Campos.gs:57
function cf_opcao_(defs, campo, texto) {
  var d = defs[campo]; texto = String(texto || '').trim().toUpperCase();
  if (!d || !texto) return '';
  if (d.opcoes[texto]) return d.opcoes[texto];
  // unidade: usa a opção que o quadro já tem (RONDON / MARECHAL C. RONDON, MOURÃO / CAMPO MOURÃO) em vez de criar outra
  if (campo === 'Unidade') {
    var chaveU = /RONDON/.test(texto) ? 'RONDON' : /MOUR/.test(texto) ? 'MOUR' : texto;
    var achou = Object.keys(d.opcoes).filter(function (k) { return k.indexOf(chaveU) >= 0; })[0];
    if (achou) return d.opcoes[achou];
    texto = chaveU === 'MOUR' ? 'MOURÃO' : chaveU;
    if (d.opcoes[texto]) return d.opcoes[texto];
  }
  var o = vd_api_('/customFields/' + d.id + '/options', { method: 'post', payload: { value: { text: texto }, color: 'none', pos: 'bottom' } });
  d.opcoes[texto] = o.id;
  try { CacheService.getScriptCache().remove('cf_defs2_' + vd_board_()); } catch (e) {}
  return o.id;
}

// Campos.gs:81
function vd_totais_(c) {
  var an = vd_analisar_(c.desc || '', c.name || '');
  var cardPart = an.dados.tipo === 'PARTICULAR' || (/\bPARTICULAR\b/i.test(c.name || '') && !an.pecas.some(function (p) { return !p.particular; }));
  var z = function () { return { cot: 0, aut: 0, comp: 0, valor: 0, nAut: 0, nComp: 0 }; };
  var T = { seg: z(), part: z() };
  var grupo = function (p) { return cardPart || p.particular ? 'part' : 'seg'; };
  var cots = [], auts = [];
  try { cots = vd_cotacoesDaDescricao_(c.desc || '', an.pecas).cotacoes; } catch (e) {}
  try { auts = vd_autorizacoesDaDescricao_(c.desc || '', an.pecas); } catch (e) {}
  // itens comprados (PAGAS, PAGAS PARTICULAR, PAGAS COMPLEMENTO)
  var itens = [];
  (c.checklists || []).forEach(function (k) {
    var nm = String(k.name || '').trim();
    if (!/^PAGAS/i.test(nm)) return;
    (k.checkItems || []).forEach(function (it) {
      var m = String(it.name).match(/R\$\s*([\d.]+(?:,\d{1,2})?)/);
      itens.push({ nome: vd_semAcento_(it.name), valor: m ? vd_valorNum_(m[1]) : 0, part: /PARTICULAR/i.test(nm), usado: false });
    });
  });
  an.pecas.forEach(function (p) {
    var g = T[grupo(p)], k = vd_chavePeca_(p);
    var minhas = cots.filter(function (q) { return q.chave === k && !isNaN(q.valor); }).map(function (q) { return q.valor; });
    if (minhas.length) g.cot += Math.min.apply(null, minhas);
    var a = auts.filter(function (x) { return x.chave === k; })[0];
    if (a && !isNaN(a.valor)) { g.aut += a.valor; g.nAut++; }
    var it = itens.filter(function (x) { return !x.usado && k && vd_casaItem_(x.nome, k); })[0];
    if (it) { it.usado = true; g.comp += it.valor; g.nComp++; g.valor += it.valor; }
    else if (a && !isNaN(a.valor)) g.valor += a.valor;
  });
  // compra que não casou com peça da lista (card antigo): entra pelo nome do checklist
  itens.forEach(function (it) { if (it.usado) return; var g = T[cardPart || it.part ? 'part' : 'seg']; g.comp += it.valor; g.valor += it.valor; g.nComp++; });
  var r2 = function (v) { return Math.round(v * 100) / 100; };
  ['seg', 'part'].forEach(function (k) { ['cot', 'aut', 'comp', 'valor'].forEach(function (f) { T[k][f] = r2(T[k][f]); }); });
  T.tot = {}; ['cot', 'aut', 'comp', 'valor', 'nAut', 'nComp'].forEach(function (f) { T.tot[f] = r2(T.seg[f] + T.part[f]); });
  T.temPart = cardPart || an.pecas.some(function (p) { return p.particular; });
  T.temSeg = !cardPart && an.pecas.some(function (p) { return !p.particular; });
  return T;
}

// Campos.gs:121
function cf_unidadeDoCard_(c) {
  if (!c || !c.id) return '';
  var d = cf_defs_()['Unidade']; if (!d) return '';
  var itens = c.customFieldItems;
  if (!itens) { try { itens = vd_api_('/cards/' + c.id + '/customFieldItems', { cru: true }) || []; } catch (e) { return ''; } }
  var it = itens.filter(function (x) { return x.idCustomField === d.id; })[0];
  if (!it || !it.idValue) return '';
  var nome = ''; Object.keys(d.opcoes).forEach(function (k) { if (d.opcoes[k] === it.idValue) nome = k; });
  return nome;
}

// Campos.gs:132
function cf_opcoesUnidade_() {
  var d = cf_defs_()['Unidade']; if (!d) return [];
  var ordem = ['TOLEDO', 'RONDON', 'CASCAVEL', 'MOURÃO'];
  return Object.keys(d.opcoes).map(function (k) { return { id: d.opcoes[k], name: k }; })
    .sort(function (a, b) { var ia = ordem.indexOf(a.name), ib = ordem.indexOf(b.name); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name); });
}

// Campos.gs:139
function cf_gravarUnidade_(cardId, idOpcao) {
  var d = cf_defs_()['Unidade']; if (!d || !idOpcao) return false;
  vd_api_('/cards/' + cardId + '/customField/' + d.id + '/item', { method: 'put', payload: { idValue: idOpcao } });
  return true;
}

// Campos.gs:146
function cf_valores_(c) {
  var an = vd_analisar_(c.desc || '', c.name || '');
  var tipo = an.dados.tipo === 'PARTICULAR' ? 'PARTICULAR' : (an.pecas.some(function (p) { return p.particular; }) ? 'MISTO' : 'SEGURADORA');
  var seg = an.dados.tipo === 'PARTICULAR' ? 'PARTICULAR' : String(an.dados.seguradora || '').trim().toUpperCase();
  if (!seg) { var mt = (c.name || '').trim().split(/\s+/); var ult = mt[mt.length - 1]; if (VD_SEGURADORAS.some(function (s) { return s[0] === ult; })) seg = ult; }
  var T = null; try { T = vd_totais_(c); } catch (e) { console.log('totais: ' + e); }
  var num = function (v) { return T && v ? v : ''; };
  var consultor = '';
  try { consultor = vd_criador_(c.id); } catch (e) {}
  return {
    'Unidade': cf_unidadeDoCard_(c) ? undefined : (ev_unidadeEtiqueta_(c) || undefined),   // o campo é a fonte; só preenche de etiqueta (card antigo) quando está vazio
    'Seguradora': seg,
    'Tipo': an.pecas.length || an.dados.tipo ? tipo : '',   // 06/10/2026: a chave estava dentro de um comentário e o campo nunca era preenchido
    'Placa': an.dados.placa || vd_placaDoTexto_(c.name || '') || '', 'Consultor': consultor ? '@' + consultor : '',
    'Total seguradora': T ? num(T.seg.valor) : undefined,
    'Total particular': T ? num(T.part.valor) : undefined,
    'Total seg+part': T ? num(T.tot.valor) : undefined
  };
}

// Campos.gs:167
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

// Complemento.gs:21
function cp_norm_(s) { return vd_semAcento_(s).replace(/[^A-Z0-9]/g, ''); }

// Complemento.gs:24
function cp_chaves_(p) {
  if (!p) return [];
  if (p.pneu) return ['PNEU' + cp_norm_(p.medida)];
  var out = [], c = cp_norm_(p.codigo || p.codigoOrc), d = cp_norm_(p.descricao || p.descricaoOrc);
  if (c.length >= 4) out.push(c);
  if (d.length >= 4) out.push(d);
  return out;
}

// Complemento.gs:34
function cp_orcDoCache_(idAnexo) {
  try {
    var v = PropertiesService.getScriptProperties().getProperty('VD_ANX3_' + idAnexo);
    if (!v) return null;
    var r = JSON.parse(v);
    if (!r.orc) return null;
    return { oficina: vd_orcExpandir_(r.orc.o), fo: vd_orcExpandir_(r.orc.f) };
  } catch (e) { return null; }
}

// Complemento.gs:48
function cp_conhecidas_(card, excluirAnexo) {
  var chaves = {}, textos = [];
  var an = vd_analisar_(card.desc || '', card.name || '');
  an.pecas.forEach(function (p) { cp_chaves_(p).forEach(function (k) { chaves[k] = 1; }); });
  var foItens = [];
  (card.checklists || []).forEach(function (k) {
    if (!/^(PAGAS|FORNECIMENTO)/i.test(String(k.name || '').trim())) return;
    (k.checkItems || []).forEach(function (i) {
      textos.push(cp_norm_(i.name));
      if (/^FORNECIMENTO/i.test(String(k.name || '').trim())) foItens.push({ id: i.id, idChecklist: k.id, name: i.name, state: i.state, lista: String(k.name).trim().toUpperCase() });
    });
  });
  // orçamentos anteriores (só os que já estão no cache): peça que o consultor tirou de propósito não volta
  (card.attachments || []).forEach(function (a) {
    if (a.id === excluirAnexo) return;
    var o = cp_orcDoCache_(a.id);
    if (!o) return;
    o.oficina.concat(o.fo).forEach(function (p) { cp_chaves_(p).forEach(function (k) { chaves[k] = 1; }); });
  });
  return { chaves: chaves, textos: textos, an: an, foItens: foItens };
}

// Complemento.gs:70
function cp_jaTem_(conh, p) {
  var ks = cp_chaves_(p);
  if (!ks.length) return true;   // sem código nem descrição: não dá para comparar, ignora
  return ks.some(function (k) {
    if (conh.chaves[k]) return true;
    return conh.textos.some(function (t) { return t.indexOf(k) >= 0; });
  });
}

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

// Complemento.gs:102
function cp_maisParecida_(pecas, p, usadas, filtro) {
  if (!p || p.pneu) return -1;
  var melhor = -1, nota = 0;
  (pecas || []).forEach(function (c, i) {
    if (c.pneu || usadas[i] || (filtro && !filtro(c))) return;
    var n = cp_similar_(p.descricao || p.descricaoOrc, c.descricao);
    if (n > nota) { nota = n; melhor = i; }
  });
  if (melhor >= 0) usadas[melhor] = 1;
  return melhor;
}

// Complemento.gs:113
function cp_casaManual_(conh, p, usadas) {
  var i = cp_maisParecida_(conh.an.pecas, p, usadas, function (c) { return !!c.complemento; });
  return i >= 0 ? conh.an.pecas[i] : null;
}

// Complemento.gs:119
function cp_comparar_(card, orc, excluirAnexo) {
  var conh = cp_conhecidas_(card, excluirAnexo);
  // atualizar: peça que o card já tem e o orçamento novo traz diferente — código novo (Weslley, 05/10/2026: "pode haver
  // mudança de código da peça, atualizar também") e/ou valor líquido novo. {chave, codigo, valorOrc, descricao}
  var out = { oficina: [], fo: [], jaTinha: 0, pareadas: [], atualizar: [], paraOficina: [] }, vistos = {}, usadas = {};
  var pecasCard = conh.an.pecas || [];
  var porCodigo = {}; pecasCard.forEach(function (c, i) { var k = cp_norm_(c.codigo); if (k.length >= 4) porCodigo[k] = i; });
  var porDesc = {}; pecasCard.forEach(function (c, i) { var k = cp_norm_(c.descricao); if (k.length >= 4 && !c.pneu) porDesc[k] = i; });
  var marcaAtualizar = function (i, p, codigoNovo) {
    var c = pecasCard[i], u = { chave: vd_chavePeca_(c), codigoAntigo: c.codigo || '' };
    var vOrc = vd_valorOrcTxt_(p.valorOrc), vCard = vd_valorOrcTxt_(c.valorOrc);
    if (codigoNovo && cp_norm_(codigoNovo) !== cp_norm_(c.codigo)) u.codigo = String(codigoNovo).replace(/\s+/g, '').toUpperCase();
    if (vOrc && vOrc !== vCard) u.valorOrc = vOrc;
    if (p.descricao || p.descricaoOrc) u.descricao = String(p.descricao || p.descricaoOrc).toUpperCase();
    if (u.codigo || u.valorOrc) out.atualizar.push(u);
    usadas[i] = 1;
  };
  var junta = function (lista, destino, ehFo) {
    (lista || []).forEach(function (p) {
      var k = cp_chaves_(p).join('|');
      if (vistos[k]) return; vistos[k] = 1;
      var kc = cp_norm_(p.codigo || p.codigoOrc), kd = cp_norm_(p.descricao || p.descricaoOrc);
      if (!ehFo && !p.pneu) {
        // mesma peça da oficina pelo código: já tem (valor do orçamento pode ter mudado)
        if (kc.length >= 4 && porCodigo[kc] !== undefined) { out.jaTinha++; marcaAtualizar(porCodigo[kc], p, ''); return; }
        // mesma descrição (igual ou parecida) com código diferente: o código mudou no orçamento novo -> atualiza, não repete
        var i = kd.length >= 4 && porDesc[kd] !== undefined && !usadas[porDesc[kd]] ? porDesc[kd] : cp_maisParecida_(pecasCard, p, usadas);
        if (i >= 0) {
          out.jaTinha++;
          if (pecasCard[i].complemento) out.pareadas.push({ card: cp_nome_(pecasCard[i]), orc: cp_nome_(p), fo: false });
          marcaAtualizar(i, p, kc.length >= 4 ? (p.codigo || p.codigoOrc) : '');
          return;
        }
      }
      // peça que ERA fornecida pela seguradora (checklist FORNECIMENTO, ainda não entregue) e o orçamento novo traz como
      // peça da OFICINA (Weslley, 06/10/2026, QPG1B84): entra na lista da oficina (complemento) e sai do checklist FO
      if (!ehFo && !p.pneu) {
        var itFo = cp_foParaOficina_(conh, p);
        if (itFo) { out.paraOficina.push({ item: itFo, peca: p }); destino.push(p); return; }
      }
      if (cp_jaTem_(conh, p)) {
        // FO: já está no checklist pelo código. Com código diferente e descrição conhecida, segue para o checklist,
        // que atualiza o item existente (código/descrição) em vez de repetir — vdf_checklistFornecimento_
        if (ehFo && !(kc.length >= 4 && (conh.chaves[kc] || conh.textos.some(function (t) { return t.indexOf(kc) >= 0; })))) { destino.push(p); return; }
        out.jaTinha++; return;
      }
      var m = ehFo ? cp_casaManual_(conh, p, usadas) : null;
      if (m) { out.jaTinha++; out.pareadas.push({ card: cp_nome_(m), orc: cp_nome_(p), fo: true }); return; }
      destino.push(p);
    });
  };
  junta(orc.oficina, out.oficina, false);
  junta(orc.fo, out.fo, true);
  return out;
}

// Complemento.gs:179
function cp_foParaOficina_(conh, p) {
  var kc = cp_norm_(p.codigo || p.codigoOrc), desc = p.descricao || p.descricaoOrc || '';
  var naLista = (conh.an.pecas || []).concat(conh.an.naoComprar || []).some(function (c) {
    return (kc.length >= 4 && cp_norm_(c.codigo) === kc) || (!c.pneu && cp_similar_(desc, c.descricao) > 0);
  });
  if (naLista) return null;
  var cands = (conh.foItens || []).filter(function (i) { return i.state !== 'complete'; });
  var porCod = kc.length >= 4 ? cands.filter(function (i) { return cp_norm_(i.name).indexOf(kc) >= 0; })[0] : null;
  if (porCod) return porCod;
  var melhor = null, nota = 0;
  cands.forEach(function (i) {
    var base = String(i.name).replace(/^[A-Z0-9][A-Z0-9.\-\/]{3,}\s+/i, '').split(/\s+[-—]\s+/)[0];
    var n = cp_similar_(desc, base);
    if (n > nota) { nota = n; melhor = i; }
  });
  return melhor;
}

// Complemento.gs:198
function cp_trocarCodigos_(texto, atualizar) {
  var t = String(texto || '');
  (atualizar || []).forEach(function (u) {
    if (!u.codigo || !u.codigoAntigo || u.codigo === u.codigoAntigo) return;
    t = t.replace(new RegExp('(^|[^A-Z0-9])' + String(u.codigoAntigo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Z0-9])', 'gi'), '$1' + u.codigo);
  });
  return t;
}

// Complemento.gs:208
function cp_atualizarNoBloco_(bloco, atualizar) {
  if (!atualizar || !atualizar.length) return bloco;
  var linhas = String(bloco || '').split('\n'), lp = vd_linhasPecas_(bloco);
  var alvo = {}; atualizar.forEach(function (u) { alvo[u.chave] = u; });
  var idx = {}; (lp.idx || []).forEach(function (ix, k) { idx[k] = ix; });
  lp.linhas.forEach(function (l, k) {
    var p = vd_analisarPeca_(l, k + 1, {});
    var u = alvo[vd_chavePeca_(p)]; if (!u) return;
    if (u.codigo) p.codigo = u.codigo;
    if (u.valorOrc) p.valorOrc = u.valorOrc;
    var ix = idx[k]; if (ix === undefined) return;
    var num = (linhas[ix].match(/^\s*(\d+)\s*[.)]/) || [])[1];
    linhas[ix] = vd_linhaPeca_(p, num ? +num - 1 : k);
  });
  return linhas.join('\n');
}

// Complemento.gs:226
function cp_hoje_() { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM'); }

// Complemento.gs:229
function cp_linhaFo_(n) { return '**' + CP.FO + ':** ' + n + ' peça(s) — ver checklist ' + CP.FO; }

// Complemento.gs:232
function cp_contarChecklist_(cardId, nome, token) {
  var ls = vd_api_('/cards/' + cardId + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name' } }, token);
  var n = 0;
  ls.forEach(function (k) { if (String(k.name || '').trim().toUpperCase() === nome) n += (k.checkItems || []).length; });
  return n;
}

// Complemento.gs:306
function cp_nome_(p) {
  return p.pneu ? 'PNEU ' + String(p.medida || '').replace(/\s+/g, '') + (p.marca ? ' ' + p.marca : '')
    : ((String(p.codigo || p.codigoOrc || '').replace(/\s+/g, '') + ' ').trim() + ' ' + String(p.descricao || p.descricaoOrc || '')).trim() + (p.qtd && +p.qtd > 1 ? ' (x' + p.qtd + ')' : '');
}

// Complemento.gs:312
function cp_textoComentario_(quem, origem, anexo, novas, foNovas, jaTinha, urlTipos, pareadas, atualizadas, paraOficina) {
  var semTipo = novas.some(function (p) { return !(p.tipos || []).length; });
  var t = '📄 **ORÇAMENTO COMPLEMENTAR**' + (origem ? ' (' + origem + ')' : '') + (quem ? ' — ' + quem : ' — robô') + (jaTinha ? ' · ' + jaTinha + ' já estavam no card' : '');
  if (novas.length) t += '\n➕ **Oficina:** ' + novas.map(cp_nome_).join('; ') + (semTipo ? ' — _marcar o tipo_' : '');
  if (foNovas.length) t += '\n📦 **FO (' + CP.FO + '):** ' + foNovas.map(cp_nome_).join('; ');
  // peça pedida antes (marcada ➕ COMPLEMENTO à mão) que o PDF confirmou: não entra de novo
  (pareadas || []).forEach(function (x) {
    t += '\n🔁 **Já pedida:** ' + x.card + ' = ' + x.orc + ' no complementar' + (x.fo ? ' — ⚠️ a seguradora vai FORNECER esta peça (no card está como peça da oficina): conferir' : '') + ' — não repetida';
  });
  (paraOficina || []).forEach(function (x) {
    t += '\n🔁 **Passou para a oficina:** ' + cp_nome_(x.peca) + ' — era fornecida pela seguradora (' + String(x.item.name).split(/\s+[-—]\s+/)[0] + '), saiu do checklist ' + (x.item.lista || 'FORNECIMENTO') + ' · verificar compra do item';
  });
  (atualizadas || []).forEach(function (u) {
    t += '\n🔄 **Atualizada:** ' + (u.codigoAntigo || u.chave) + (u.codigo ? ' → código ' + u.codigo : '') + (u.valorOrc ? ' · orç. ' + u.valorOrc : '');
  });
  if (urlTipos && semTipo) t += '\n✏️ ' + urlTipos;
  return t;
}

// Complemento.gs:334
function vdf_compararComplemento(token, shortLink, o, idAnexo) {
  vdf_usuario_(token);
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard', checklists: 'all', checkItem_fields: 'name', attachments: 'true', attachment_fields: 'name' } });
  var r = cp_comparar_(card, { oficina: (o && o.oficina) || [], fo: (o && o.fo) || [] }, idAnexo || '');
  return { oficina: r.oficina, fo: r.fo, jaTinha: r.jaTinha, pareadas: r.pareadas, atualizar: r.atualizar || [], paraOficina: (r.paraOficina || []).map(function (x) { return { itemId: x.item.id, nome: x.item.name, lista: x.item.lista || '', peca: cp_nome_(x.peca) }; }) };
}

// Complemento.gs:342
function cp_marcarVistos_(ids) {
  if (!ids || !ids.length) return;
  var props = PropertiesService.getScriptProperties();
  var l = []; try { l = JSON.parse(props.getProperty('CP_VISTOS') || '[]'); } catch (e) {}
  ids.forEach(function (id) { if (l.indexOf(id) < 0) l.push(id); });
  props.setProperty('CP_VISTOS', JSON.stringify(l.slice(-CP.MAX_VISTOS)));
}

// Complemento.gs:469
function cp_foNaOficina_(card, token, quem) {
  var an;
  try { an = vd_analisar_(card.desc || '', card.name || ''); } catch (e) { return []; }
  var codigos = {}, complementos = [];
  (an.pecas || []).forEach(function (p) { var k = cp_norm_(p.codigo); if (k.length >= 4) codigos[k] = p; if (p.complemento && !p.naoComprar) complementos.push(p); });
  if (!Object.keys(codigos).length && !complementos.length) return [];
  var removidos = [];
  (card.checklists || []).forEach(function (k) {
    if (!/^FORNECIMENTO/i.test(String(k.name || '').trim())) return;
    (k.checkItems || []).forEach(function (i) {
      if (i.state === 'complete') return;
      var base = String(i.name).split(/\s+[-—]\s+/)[0];
      var m = vd_semAcento_(base).match(/^([A-Z0-9][A-Z0-9.\-\/]{3,})\s+(.*)$/);
      var kc = m ? cp_norm_(m[1]) : '', descFo = m ? m[2] : base;
      // mesmo código na lista da oficina — ou, sem o código bater, peça ➕ complemento da oficina com a mesma descrição
      // (07/10/2026, QPG1B84: orçamento complementar trocou a CALOTA de FO para oficina com código novo)
      var bate = !!(kc && codigos[kc]) || complementos.some(function (p) { return cp_similar_(p.descricao || '', descFo) > 0; });
      if (!bate) return;
      try {
        vd_api_('/cards/' + card.id + '/checkItem/' + i.id, { method: 'delete' }, token);
        removidos.push(i.name);
      } catch (e) { console.log('FO na oficina: ' + e); }
    });
  });
  if (!removidos.length) return [];
  try {
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🔁 **Passou para a oficina** — ' + (quem || 'robô') + ': a peça está na lista da oficina (cotação/compra pela oficina), então saiu do checklist FORNECIMENTO: ' + removidos.map(function (n) { return n.split(/\s+[-—]\s+/)[0]; }).join('; ') } }, token);
  } catch (e) {}
  try { ev_registrar_('COMPLEMENTO', card, quem || 'robô', removidos.map(function (n) { return { peca: n.split(/\s+[-—]\s+/)[0], detalhe: 'FO → OFICINA (mesmo código ou mesma peça ➕ complemento na lista da oficina)' }; }), { detalhe: 'FO removida: ' + removidos.length }); } catch (e) {}
  return removidos;
}

// Cota.gs:19
function qt_parte_(nome) { QT_PARTE_ATUAL = nome || ''; }

// Cota.gs:20
function qt_contar_(n) {
  QT_N += n;
  var k = QT_PARTE_ATUAL || 'outros';
  QT_PARTES[k] = (QT_PARTES[k] || 0) + n;
}

// Cota.gs:27
function qt_fetch_(url, params) {
  qt_conferirPausa_();
  qt_contar_(1);
  try { return UrlFetchApp.fetch(url, params); }
  catch (e) { if (qt_ehEstouro_(e)) qt_marcarEstouro_(e); throw e; }
}

// Cota.gs:33
function qt_fetchAll_(reqs) {
  qt_conferirPausa_();
  qt_contar_(reqs.length);
  try { return UrlFetchApp.fetchAll(reqs); }
  catch (e) { if (qt_ehEstouro_(e)) qt_marcarEstouro_(e); throw e; }
}

// Cota.gs:40
function qt_ehEstouro_(e) { return /too many times.*urlfetch/i.test(String((e && e.message) || e)); }

// Cota.gs:44
function qt_pausadaAte_() {
  var t = +(PropertiesService.getScriptProperties().getProperty('QT_ESTOURO') || 0);
  return t && Date.now() - t < QT.PAUSA_MS ? t + QT.PAUSA_MS : 0;
}

// Cota.gs:48
function qt_pausada_() { return !!qt_pausadaAte_(); }

// Cota.gs:49
function qt_conferirPausa_() {
  var ate = qt_pausadaAte_();
  if (ate) throw new Error('COTA: limite diário de chamadas externas do Google estourado — pausado até ' + Utilities.formatDate(new Date(ate), 'America/Sao_Paulo', 'HH:mm') + '.');
}

// Cota.gs:54
function qt_marcarEstouro_(e) {
  var p = PropertiesService.getScriptProperties();
  p.setProperty('QT_ESTOURO', String(Date.now()));
  if (!p.getProperty('QT_PAUSA_DESDE')) p.setProperty('QT_PAUSA_DESDE', String(Date.now()));   // início da indisponibilidade (contingência)
  console.log('COTA ESTOURADA: ' + String((e && e.message) || e) + ' — pausa de ' + (QT.PAUSA_MS / 60000) + ' min');
  var av = +(p.getProperty('QT_AVISADO') || 0);
  if (Date.now() - av < QT.AVISO_MS) return;
  p.setProperty('QT_AVISADO', String(Date.now()));
  try {
    MailApp.sendEmail(SD.EMAIL, 'ALERTA Trello: cota diária de chamadas do Google estourada',
      'O robô do Trello (projeto Log de Descricao Trello) estourou o limite diário de chamadas externas do Google ' +
      '(~' + QT.LIMITE.toLocaleString('pt-BR') + ' por dia, janela de 24 h).\n\n' +
      'O que acontece: o robô e o formulário ficam pausados em janelas de ' + (QT.PAUSA_MS / 60000) + ' min e voltam sozinhos quando a cota liberar. ' +
      'Nenhum dado se perde: as travas e o fluxo reprocessam o histórico do quadro ao voltar.\n\n' +
      'Consumo registrado:\n' + qt_resumo_(0) + '\n' + qt_resumo_(1) + '\n\n' +
      'Este aviso sai no máximo a cada 12 h. Execuções: https://script.google.com/home/projects/' + ScriptApp.getScriptId() + '/executions');
  } catch (x) {}
}

// Cota.gs:74
function qt_registrar_(origem) {
  if (!QT_N) return;
  var p = PropertiesService.getScriptProperties(), dia = qt_dia_(0), k = 'QT_DIA_' + dia;
  var d = {}; try { d = JSON.parse(p.getProperty(k) || '{}'); } catch (e) {}
  d.total = (d.total || 0) + QT_N;
  d.exec = (d.exec || 0) + 1;
  d.partes = d.partes || {};
  Object.keys(QT_PARTES).forEach(function (n) { d.partes[n] = (d.partes[n] || 0) + QT_PARTES[n]; });
  p.setProperty(k, JSON.stringify(d));
  QT_N = 0; QT_PARTES = {};
  // limpa dias antigos (uma vez por dia, na 1ª execução do dia)
  if (!d.limpo) {
    d.limpo = 1; p.setProperty(k, JSON.stringify(d));
    try {
      Object.keys(p.getProperties()).forEach(function (kk) {
        var m = kk.match(/^QT_DIA_(\d{4}-\d{2}-\d{2})$/);
        if (m && (Date.now() - new Date(m[1] + 'T12:00:00Z').getTime()) > QT.GUARDAR_DIAS * 864e5) p.deleteProperty(kk);
      });
    } catch (e) {}
  }
}

// Cota.gs:96
function qt_dia_(menos) { return Utilities.formatDate(new Date(Date.now() - (menos || 0) * 864e5), 'America/Sao_Paulo', 'yyyy-MM-dd'); }

// Cota.gs:97
function qt_doDia_(menos) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('QT_DIA_' + qt_dia_(menos)) || '{}'); } catch (e) { return {}; }
}

// Cota.gs:101
function qt_resumo_(menos) {
  var d = qt_doDia_(menos), dia = qt_dia_(menos).split('-').reverse().slice(0, 2).join('/');
  if (!d.total) return dia + ': sem registro';
  var partes = Object.keys(d.partes || {}).map(function (n) { return [n, d.partes[n]]; }).filter(function (x) { return x[1]; })
    .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10).map(function (x) { return x[0] + ' ' + x[1].toLocaleString('pt-BR'); });
  return dia + ': ' + d.total.toLocaleString('pt-BR') + ' chamadas em ' + (d.exec || 0).toLocaleString('pt-BR') + ' execuções' + (partes.length ? ' — ' + partes.join(' · ') : '');
}

// Cota.gs:136
function vdf_consumo(token) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria.'] };
  var ate = qt_pausadaAte_();
  var p = PropertiesService.getScriptProperties(), falhas = {}, tempos = [];
  try { Object.keys(p.getProperties()).forEach(function (k) { if (/^FALHAS_(?!AV_|T_)/.test(k)) falhas[k.slice(7)] = +p.getProperty(k); }); } catch (e) {}
  try { tempos = JSON.parse(p.getProperty('SD_TEMPOS_LOG') || '[]').slice(-8); } catch (e) {}
  return { ok: true, hoje: qt_doDia_(0), ontem: qt_doDia_(1), anteontem: qt_doDia_(2), resumo: [qt_resumo_(0), qt_resumo_(1), qt_resumo_(2)], pausadaAte: ate ? new Date(ate).toISOString() : '', limite: QT.LIMITE, falhas: falhas, tempos: tempos };
}

// Espelho.gs:29
function es_ligado_() { return vd_prop_('ES_LIGADO', 'NAO') === 'SIM' && vd_board_() === ES.DESTINO; }

// Espelho.gs:38
function es_filtrarMencoes_(txt) {
  if (!es_ligado_()) return txt;
  return String(txt).replace(/(^|[^A-Za-z0-9_.])@([A-Za-z0-9_]{3,})/g, function (m, pre, u) {
    return ES.MENCOES_OK.indexOf(u.toLowerCase()) >= 0 ? m : pre + '👤' + u;
  });
}

// Eventos.gs:14
function ev_ligado_() { return vd_prop_('EV_LIGADO', 'SIM') !== 'NAO'; }

// Eventos.gs:16
function ev_aba_() {
  var ss = vd_planilhaBackup_().getParent();
  var sh = ss.getSheetByName(EV.ABA);
  if (!sh) {
    sh = ss.insertSheet(EV.ABA);
    sh.getRange(1, 1, 1, EV.CAB.length).setValues([EV.CAB]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sh.getRange('K:K').setNumberFormat('R$ #,##0.00');
    sh.getRange('M:M').setNumberFormat('dd/MM/yyyy');
  }
  return sh;
}

// Eventos.gs:31
function ev_unidade_(card) {
  var u = '';
  try { u = cf_unidadeDoCard_(card); } catch (e) {}
  if (u) return u;
  return ev_unidadeEtiqueta_(card);
}

// Eventos.gs:37
function ev_unidadeEtiqueta_(card) {
  var nomes = ((card && card.labels) || []).map(function (l) { return String(l.name || '').toUpperCase(); }).join(' ');
  if (/TOLEDO|\bTOL\b/.test(nomes)) return 'TOLEDO';
  if (/RONDON|\bMCR\b/.test(nomes)) return 'RONDON';
  if (/CASCAVEL|\bCVEL\b/.test(nomes)) return 'CASCAVEL';
  if (/MOUR/.test(nomes)) return 'MOURÃO';
  return '';
}

// Eventos.gs:51
function ev_registrar_(evento, card, usuario, itens, extra) {
  if (!ev_ligado_()) return;
  try {
    extra = extra || {};
    card = card || {};
    var agora = new Date();
    var placa = vd_placaDoTexto_(card.name || '') || '';
    var tipo = extra.tipo || (/\bPARTICULAR\b/i.test(card.name || '') ? 'PARTICULAR' : 'SEGURADORA');
    var base = function (it) {
      it = it || {};
      var prev = it.previsao ? new Date(it.previsao) : '';
      return [agora, evento, card.name || '', card.shortUrl || (card.shortLink ? 'https://trello.com/c/' + card.shortLink : ''),
        placa, ev_unidade_(card), tipo, it.peca || '', it.particular ? 'SIM' : '',
        it.fornecedor || '', (it.valor === 0 || it.valor) && !isNaN(+it.valor) ? +it.valor : '',
        it.dias === 0 || it.dias ? it.dias : '', prev && !isNaN(prev) ? prev : '',
        usuario || '', it.detalhe || extra.detalhe || '', vd_board_()];
    };
    var linhas = (itens && itens.length ? itens : [null]).map(base).map(function (l) { return l.map(sg_celula_); });
    // appendRow é atômico por linha: robô e formulário podem gravar ao mesmo tempo sem se atropelar
    // (não usa a trava do script — o robô a segura durante a rodada inteira)
    var sh = ev_aba_();
    linhas.forEach(function (l) { sh.appendRow(l); });
  } catch (e) { console.log('eventos: ' + e); }
}

// Eventos.gs:77
function ev_peca_(p) {
  if (!p) return { peca: '' };
  return { peca: p.pneu ? 'PNEU ' + String(p.medida || '').replace(/\s+/g, '') + (p.marca ? ' ' + p.marca : '') : vd_nomePeca_(p), particular: !!p.particular };
}

// Fluxo.gs:30
function st_permitir_(cardId, idLista) {
  if (!cardId || !idLista) return;
  try { CacheService.getScriptCache().put(ST.PREFIXO_OK + cardId + '_' + idLista, '1', 240); } catch (e) {}   // 4 min: o ciclo é de 1 min
}

// Fluxo.gs:130
function sla_users_(prop, padrao) { if (vd_board_() === VD.BOARD_PADRAO) padrao = 'timweslley'; return String(vd_prop_(prop, padrao)).split(/[,;\s]+/).filter(String); }

// FormularioServidor.gs:29
function doPost(e) {
  var out, rid = '', cache = null;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var fn = String(req.fn || '');
    if (VDF_API.indexOf(fn) < 0) throw new Error('Função não permitida: ' + fn);
    if (qt_pausada_()) throw new Error('⏸️ O Google limitou as chamadas do sistema por hoje (cota diária). Nada se perdeu — tente de novo em ' + Utilities.formatDate(new Date(qt_pausadaAte_()), 'America/Sao_Paulo', 'HH:mm') + '; o sistema volta sozinho.');
    qt_parte_('formulário ' + fn);
    /* rid = número do pedido que grava. Às vezes o Google trava uma chamada ~2 min
     * (DEADLINE_EXCEEDED ao carregar o projeto) e o formulário tenta de novo com o mesmo rid:
     * se a primeira chegou a rodar, devolve o mesmo resultado em vez de gravar duas vezes. */
    rid = /^[\w-]{8,64}$/.test(String(req.rid || '')) ? 'vdf_rid_' + req.rid : '';
    if (rid) {
      cache = CacheService.getScriptCache();
      var prev = cache.get(rid);
      for (var k = 0; prev === 'RODANDO' && k < 20; k++) { Utilities.sleep(1500); prev = cache.get(rid); }
      if (prev === 'RODANDO') throw new Error('O pedido anterior ainda está sendo gravado. Aguarde um minuto e confira o card antes de repetir.');
      if (prev) return ContentService.createTextOutput(prev).setMimeType(ContentService.MimeType.JSON);
      cache.put(rid, 'RODANDO', 300);
    }
    var r = globalThis[fn].apply(null, req.args || []);
    out = { ok: true, r: r === undefined ? null : r };
  } catch (err) {
    out = { ok: false, erro: String((err && err.message) || err) };
  }
  try { qt_registrar_('formulário'); } catch (e2) {}
  var txt = JSON.stringify(out);
  if (rid && cache) {
    try { if (out.ok && txt.length < 90000) cache.put(rid, txt, 600); else cache.remove(rid); } catch (e2) {}
  }
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}

// FormularioServidor.gs:64
function vdf_usuario_(token) {
  if (!token) throw new Error('LOGIN: entre com sua conta do Trello.');
  var me;
  try {
    me = vd_api_('/members/me', { query: { fields: 'fullName,username' } }, token);
  } catch (e) {
    throw new Error('LOGIN: seu acesso ao Trello expirou. Entre de novo.');
  }
  var cache = CacheService.getScriptCache();
  var chave = 'vdf_membros_' + vd_board_();
  var membros = cache.get(chave);
  if (!membros) {
    membros = JSON.stringify(vd_api_('/boards/' + vd_board_() + '/members', { query: { fields: 'username' } }).map(function (m) { return m.id; }));
    cache.put(chave, membros, 600);
  }
  if (JSON.parse(membros).indexOf(me.id) < 0) {
    throw new Error('Sua conta do Trello (' + me.username + ') não participa do quadro. Peça para ser adicionado.');
  }
  return me;
}

// FormularioServidor.gs:87
function vdf_ehComprador_(me) {
  var lista = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).toLowerCase().split(/[,;\s]+/).filter(String);
  return lista.indexOf(String(me.username || '').toLowerCase()) >= 0;
}

// FormularioServidor.gs:94
function vdf_ehAutorizador_(me) {
  var lista = String(vd_prop_('VD_AUTORIZADORES', VDF_AUTORIZADORES_PADRAO)).toLowerCase().split(/[,;\s]+/).filter(String);
  return lista.indexOf(String(me.username || '').toLowerCase()) >= 0;
}

// FormularioServidor.gs:99
function vdf_podeComprar_(me) { return !!me && (vdf_ehComprador_(me) || vdf_ehAutorizador_(me)); }

// FormularioServidor.gs:100
function vdf_ehParticular_(card, an) {
  return (an.dados.tipo === 'PARTICULAR') || /PARTICULAR/i.test((card.labels || []).map(function (l) { return l.name; }).join(' ')) || /\bPARTICULAR\b/i.test(card.name || '');
}

// FormularioServidor.gs:104
function vdf_pecaParticular_(peca, card, an) { return !!(peca && peca.particular) || vdf_ehParticular_(card, an); }

// FormularioServidor.gs:108
function vdf_podeAutorizarPeca_(me, card, an, peca, criador) {
  if (!me) return false;
  if (vdf_ehAutorizador_(me)) return true;
  if (!vdf_pecaParticular_(peca, card, an)) return false;
  var u = String(me.username || '').toLowerCase();
  if (peca && peca.partPor && peca.partPor === u) return true;
  if (criador === undefined) { try { criador = vd_criador_(card.id); } catch (e) { criador = ''; } }
  return String(criador || '').toLowerCase() === u;
}

// FormularioServidor.gs:119
function vdf_podeAutorizar_(me, card, an) {
  if (!me) return false;
  if (vdf_ehAutorizador_(me)) return true;
  var criador; try { criador = vd_criador_(card.id); } catch (e) { criador = ''; }
  if (!an.pecas.length) return vdf_ehParticular_(card, an) && String(criador || '').toLowerCase() === String(me.username || '').toLowerCase();
  return an.pecas.some(function (x) { return vdf_podeAutorizarPeca_(me, card, an, x, criador); });
}

// FormularioServidor.gs:128
function vdf_podeDevolver_(me, card, an) {
  if (!me) return false;
  if (vdf_ehAutorizador_(me)) return true;
  var criador; try { criador = vd_criador_(card.id); } catch (e) { criador = ''; }
  return an.pecas.length > 0 && an.pecas.every(function (x) { return vdf_podeAutorizarPeca_(me, card, an, x, criador); });
}

// FormularioServidor.gs:135
function vdf_iniciar(token) {
  var me = vdf_usuario_(token);
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'name,shortUrl' } });
  var labels = cf_opcoesUnidade_();   // opções do campo personalizado "Unidade"
  return {
    nome: me.fullName, usuario: me.username, quadro: board.name, urlQuadro: board.shortUrl, unidades: labels, comprador: vdf_podeComprar_(me), diretoria: vdf_ehAutorizador_(me),
    cfg: { teste: vd_board_() === VD.BOARD_PADRAO, tipos: VD.TIPOS, categPneu: VD.CATEG_PNEU }
  };
}

// FormularioServidor.gs:147
function vdf_abrir(token, shortLink) {
  if (!token) throw new Error('LOGIN: entre com sua conta do Trello.');
  var base = 'https://api.trello.com/1', b = vd_board_();
  function req(url, tk) { return { url: base + url, method: 'get', muteHttpExceptions: true, headers: { Authorization: vd_auth_(tk) } }; }
  // quadro e listas quase não mudam: cache de 10 min (06/10/2026 — abrir o formulário era a maior fatia do consumo diário)
  var cacheB = CacheService.getScriptCache(), kB = 'vdf_abrir_base_' + b, baseTxt = null;
  try { baseTxt = cacheB.get(kB); } catch (e) {}
  var reqs = [req('/members/me?fields=fullName,username', token)];
  if (!baseTxt) reqs.push(req('/boards/' + b + '?fields=id,name,shortUrl'), req('/boards/' + b + '/lists?fields=name&filter=all'));
  var iCard = reqs.length;
  if (shortLink) reqs.push(req('/cards/' + encodeURIComponent(shortLink) + '?fields=name,desc,idBoard,idList,shortLink,shortUrl,idLabels,labels&checklists=all&checkItem_fields=name,state,due&attachments=true&attachment_fields=name,fileName,mimeType,isUpload,bytes,url,date&customFieldItems=true'));
  var rs = qt_fetchAll_(reqs);
  if (rs[0].getResponseCode() >= 300) throw new Error('LOGIN: seu acesso ao Trello expirou. Entre de novo.');
  for (var i = 1; i < rs.length; i++) {
    if (rs[i].getResponseCode() >= 300) throw new Error('Trello ' + rs[i].getResponseCode() + ': ' + rs[i].getContentText().slice(0, 120));
  }
  var me = JSON.parse(rs[0].getContentText());
  var board, listas;
  if (baseTxt) { var bs = JSON.parse(baseTxt); board = bs.board; listas = bs.listas; }
  else {
    board = JSON.parse(rs[1].getContentText()); listas = JSON.parse(rs[2].getContentText());
    try { cacheB.put(kB, JSON.stringify({ board: board, listas: listas }), 600); } catch (e) {}
  }
  var labels = cf_opcoesUnidade_();   // opções do campo personalizado "Unidade" (cache próprio)
  // membro do quadro? (mesma regra de vdf_usuario_, com o cache)
  var cache = CacheService.getScriptCache(), chave = 'vdf_membros_' + b, membros = cache.get(chave);
  if (!membros) {
    membros = JSON.stringify(vd_api_('/boards/' + b + '/members', { query: { fields: 'username' } }).map(function (m) { return m.id; }));
    cache.put(chave, membros, 600);
  }
  if (JSON.parse(membros).indexOf(me.id) < 0) throw new Error('Sua conta do Trello (' + me.username + ') não participa do quadro. Peça para ser adicionado.');
  var info = {
    nome: me.fullName, usuario: me.username, quadro: board.name, urlQuadro: board.shortUrl, unidades: labels, comprador: vdf_podeComprar_(me), diretoria: vdf_ehAutorizador_(me),
    cfg: { teste: b === VD.BOARD_PADRAO, tipos: VD.TIPOS, categPneu: VD.CATEG_PNEU }
  };
  var card = null;
  if (shortLink) {
    var c = JSON.parse(rs[iCard].getContentText());
    if (c.idBoard !== board.id) throw new Error('Este card não é do quadro do formulário.');
    var lst = listas.filter(function (l) { return l.id === c.idList; })[0];
    ax_padronizarCard_(c, token);   // card antigo aberto no formulário: anexos já lidos ganham o nome padronizado (05/10/2026)
    card = vdf_montarCard_(c, lst ? lst.name : '', me);
  }
  return { info: info, card: card };
}

// FormularioServidor.gs:194
function vdf_itensPagas_(c) {
  var out = [];
  (c.checklists || []).forEach(function (k) { if (/^PAGAS/i.test(String(k.name || '').trim())) (k.checkItems || []).forEach(function (i) { out.push(vd_semAcento_(i.name)); }); });
  return out;
}

// FormularioServidor.gs:200
function vdf_travaPeca_(p, auts, c) {
  var k = vd_chavePeca_(p);
  if (!k) return '';
  if (vdf_itensPagas_(c).some(function (n) { return vd_casaItem_(n, k); })) return 'COMPRADA';
  if ((auts || []).some(function (a) { return a.chave === k; })) return 'AUTORIZADA';
  return '';
}

// FormularioServidor.gs:208
function vdf_sigTrava_(p) {
  return [p.pneu ? 'P' : '', String(p.codigo || '').replace(/\s+/g, '').toUpperCase(),
    p.pneu ? vd_semAcento_(p.medida).replace(/\s+/g, '') : vd_semAcento_(p.descricao).replace(/\s+/g, ' ').trim(),
    p.pneu ? '' : (p.tipos || []).join('/'), String(+(p.qtd || 1) || 1)].join('|');
}

// FormularioServidor.gs:220
function vd_carroCurto_(modelo) {
  var ps = vd_semAcento_(modelo).replace(/[\/]/g, ' ').split(/\s+/).filter(String);
  for (var i = 0; i < ps.length; i++) if (VD_MARCAS.indexOf(ps[i]) < 0 && !/^\d/.test(ps[i])) return ps[i];
  return '';
}

// FormularioServidor.gs:226
function vd_titulo_(placa, carro, cor, seguradora) {
  return [placa, carro, cor, seguradora].map(function (s) { return String(s || '').trim().toUpperCase(); }).filter(String).join(' ');
}

// FormularioServidor.gs:233
function vdf_buscarPlaca(token, placa, chassi) {
  vdf_usuario_(token);
  chassi = vd_normChassi_(chassi || '');
  if (!vd_chassiValido_(chassi)) chassi = '';
  if (!vd_placaValida_(placa) && !chassi) return [];
  var listas = vd_api_('/boards/' + vd_board_() + '/lists', { query: { fields: 'name' } });
  var nomeLista = {};
  listas.forEach(function (l) { nomeLista[l.id] = l.name; });
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { query: { fields: 'name,idList,shortLink,desc' } });
  return cards.filter(function (c) {
    if (vdf_cardProtegido_(c.name)) return false;
    var an = null;
    var p = vd_placaDoTexto_(c.name);
    if (!p) { an = vd_analisar_(c.desc, c.name); p = an.dados.placa; }
    if (vd_placaValida_(placa) && vd_mesmaPlaca_(p, placa)) return true;
    if (!chassi) return false;
    if (!an) an = vd_analisar_(c.desc, c.name);
    var ch = an.dados.chassi || (String(vd_limpar_(c.desc || '')).toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/) || [''])[0];
    return !!ch && vd_normChassi_(ch) === chassi;
  }).map(function (c) {
    var pc = vd_placaDoTexto_(c.name) || '';
    return { shortLink: c.shortLink, nome: c.name, lista: nomeLista[c.idList] || '', porChassi: !(vd_placaValida_(placa) && vd_mesmaPlaca_(pc || vd_analisar_(c.desc, c.name).dados.placa, placa)) };
  });
}

// FormularioServidor.gs:260
function vdf_temOrdemAut_(card) {
  return (card.labels || []).some(function (l) { return vd_semAcento_(String(l.name || '')).toUpperCase().indexOf(VDF_ETIQ_ORDEM) >= 0; });
}

// FormularioServidor.gs:264
function vdf_ehPosCotacao_(nomeLista) {
  return VD.LISTAS_FORA.indexOf(vd_nomeColuna_(nomeLista)) < 0;
}

// FormularioServidor.gs:269
function vdf_cardProtegido_(nome) {
  return /NOVO PEDIDO DE PE[ÇC]A/i.test(nome || '') || /^\s*AVISO\b/i.test(nome || '');
}

// FormularioServidor.gs:275
function vdf_ordemDoCard_(c) {
  try {
    var d = cf_defs_()[VDF_CAMPO_ORDEM]; if (!d) return '';
    var it = (c.customFieldItems || []).filter(function (i) { return i.idCustomField === d.id; })[0];
    return it && it.value ? String(it.value.number || it.value.text || '') : '';
  } catch (e) { return ''; }
}

// FormularioServidor.gs:283
function vdf_gravarOrdem_(cardId, ordem) {
  ordem = String(ordem || '').replace(/\D/g, '');
  if (!ordem) return false;
  var d = cf_defs_()[VDF_CAMPO_ORDEM]; if (!d) return false;
  var corpo = d.tipo === 'number' ? { value: { number: ordem } } : { value: { text: ordem } };
  vd_api_('/cards/' + cardId + '/customField/' + d.id + '/item', { method: 'put', payload: corpo });
  return true;
}

// FormularioServidor.gs:292
function vdf_unidadeDoCard_(c) {
  try {
    var d = cf_defs_()['Unidade']; if (!d) return '';
    var it = (c.customFieldItems || []).filter(function (i) { return i.idCustomField === d.id; })[0];
    return it && it.idValue ? it.idValue : '';
  } catch (e) { return ''; }
}

// FormularioServidor.gs:300
function vdf_gravarUnidade_(card, idOpcao) {
  if (!idOpcao || vdf_unidadeDoCard_(card) === idOpcao) return false;
  return cf_gravarUnidade_(card.id, idOpcao);
}

// FormularioServidor.gs:305
function vdf_carregarCard(token, shortLink) {
  var me = vdf_usuario_(token);
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  var c = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard,idList,shortLink,shortUrl,idLabels,labels', checklists: 'all', checkItem_fields: 'name,state,due', attachments: 'true', attachment_fields: 'name,fileName,mimeType,isUpload,bytes,url,date', customFieldItems: 'true' } });
  if (c.idBoard !== board.id) throw new Error('Este card não é do quadro do formulário.');
  var lista = vd_api_('/lists/' + c.idList, { query: { fields: 'name' } }).name;
  ax_padronizarCard_(c, token);   // card antigo aberto no formulário: anexos já lidos ganham o nome padronizado (05/10/2026)
  return vdf_montarCard_(c, lista, me);
}

// FormularioServidor.gs:316
function vdf_montarCard_(c, lista, me) {
  if (vdf_cardProtegido_(c.name)) throw new Error('Este é o card fixo do quadro — não pode ser usado como pedido. Faça um pedido novo.');
  try { var cmp = vd_completa_(c.id); if (cmp) c.desc = cmp; } catch (e) {}   // vitrine -> descrição completa
  var an = vd_analisar_(c.desc, c.name);
  var autorizadas = [];
  try { autorizadas = vd_autorizacoesDaDescricao_(c.desc, an.pecas); } catch (e) {}
  var obs = vd_campo_(an.div.bloco, 'OBS|OBSERVA[ÇC][ÃA]O');
  var criador; try { criador = vd_criador_(c.id); } catch (e) { criador = ''; }
  return {
    shortLink: c.shortLink, url: c.shortUrl, nome: c.name, lista: lista, posCotacao: vdf_ehPosCotacao_(lista),
    dados: an.dados, obs: obs,
    pecas: (function () {
      return an.pecas.map(function (p) { return { pneu: p.pneu, codigo: p.codigo, descricao: p.descricao, tipos: p.tipos, medida: p.medida, categoria: p.categoria, marca: p.marca, qtd: p.qtd, particular: vdf_pecaParticular_(p, c, an), partPor: p.partPor || '', complemento: !!p.complemento, compData: p.compData || '', valorOrc: vd_valorOrcTxt_(p.valorOrc), obs: p.obs || '', travada: vdf_travaPeca_(p, autorizadas, c), podeAut: vdf_podeAutorizarPeca_(me, c, an, p, criador), chave: vd_chavePeca_(p), nome: vd_nomePeca_(p) }; })
        // peças "não comprar": o formulário de edição mostra (chip marcado); cotação/autorização/compra não (sem chave)
        .concat((an.naoComprar || []).map(function (p) { return { pneu: p.pneu, codigo: p.codigo, descricao: p.descricao, tipos: p.tipos, medida: p.medida, categoria: p.categoria, marca: p.marca, qtd: p.qtd, particular: false, partPor: '', complemento: !!p.complemento, compData: p.compData || '', naoComprar: true, naoMotivo: p.naoMotivo || '', valorOrc: vd_valorOrcTxt_(p.valorOrc), obs: p.obs || '', travada: '', podeAut: false, chave: '', nome: vd_nomePeca_(p) }; }));
    })(),
    padrao: an.pecas.length > 0 || (an.naoComprar || []).length > 0,
    cotacoes: (function () { try { return vd_cotacoesDaDescricao_(c.desc, an.pecas); } catch (e) { return { cotacoes: [], nt: [] }; } })(),
    doOrcamento: an.doOrcamento,
    tipo: an.dados.tipo || (/PARTICULAR/i.test((c.labels || []).map(function (l) { return l.name; }).join(' ')) ? 'PARTICULAR' : 'SEGURADORA'),
    origemOrc: (vd_limpar_(an.div.bloco).match(/OR[ÇC]AMENTO IMPORTADO \(([^)]*)\)/i) || [])[1] || '',
    titulo: vdf_partesTitulo_(c.name, an.dados),
    anexos: vdf_anexosDoCard_(c.attachments),
    todosAnexos: vdf_todosAnexos_(c.attachments, vd_prop_('VD_URL_FORM', VD.URL_FORM)),
    autorizadas: autorizadas,
    devolucao: (function () { try { return vd_ultimaDevolucao_(c.desc); } catch (e) { return null; } })(),
    podeAutorizar: vdf_podeAutorizar_(me, c, an),
    podeDevolver: vdf_podeDevolver_(me, c, an),
    fornecedores: fo_paraFormulario_(),
    recebiveis: (function () { try { return vdf_itensRecebimento_(c).map(function (i) { i.dueTxt = i.due ? vd_dataCurta_(i.due) : ''; i.dueIso = i.due ? Utilities.formatDate(new Date(i.due), 'America/Sao_Paulo', 'yyyy-MM-dd') : ''; return i; }); } catch (e) { return []; } })(),
    particular: vdf_ehParticular_(c, an),
    diretoria: vdf_ehAutorizador_(me), podeComprar: vdf_podeComprar_(me), podeReceber: vdf_podeReceber_(me, c), ordemAut: vdf_temOrdemAut_(c), solicitante: criador || '',
    ordem: vdf_ordemDoCard_(c), unidadeId: vdf_unidadeDoCard_(c),
    totais: (function () { try { return vd_totais_(c); } catch (e) { return null; } })(),
    pagas: (function () {
      try {
        var out = [];
        (c.checklists || []).filter(function (k) { return /^PAGAS/i.test((k.name || '').trim()); }).forEach(function (pg) {
          (pg.checkItems || []).forEach(function (i) { out.push({ nome: i.name, ok: i.state === 'complete', due: i.due ? vd_dataCurta_(i.due) : '' }); });
        });
        return out;
      } catch (e) { return []; }
    })()
  };
}

// FormularioServidor.gs:368
function vdf_partesTitulo_(nome, dados) {
  dados = dados || {};
  if (!vd_placaDoTexto_(nome)) nome = '';   // título fora do padrão (ex.: "image.png"): monta do zero
  var ps0 = vd_semAcento_(nome).replace(/\b[A-Z]{3}[\s\-]?\d[A-Z0-9]\d{2}\b/, ' ').replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(String);
  var ps = ps0.filter(function (t) { return VD_LIXO_TITULO.indexOf(t) < 0; });
  var r = { carro: '', cor: dados.cor || '', seguradora: dados.seguradora || '' };
  if (ps.length && !r.seguradora && (ps[ps.length - 1] === 'PARTICULAR' || VD_SEGURADORAS.some(function (s) { return s[0] === ps[ps.length - 1]; }))) r.seguradora = ps.pop();
  else if (ps.length && r.seguradora && ps[ps.length - 1] === vd_semAcento_(r.seguradora)) ps.pop();
  for (var k = ps.length - 1; k > 0; k--) {
    if (VD_CORES.indexOf(ps[k]) >= 0) { var c = ps.splice(k, 1)[0]; if (!r.cor) r.cor = c; break; }
  }
  r.carro = ps.join(' ') || vd_carroCurto_(dados.modelo || '');
  return r;
}

// FormularioServidor.gs:386
function vdf_anexosDoCard_(attachments) {
  var props = PropertiesService.getScriptProperties();
  return (attachments || []).filter(vd_anexoLegivel_).map(function (a) {
    return { id: a.id, nome: a.name, arquivo: a.fileName || a.name, bytes: a.bytes || 0, pdf: /pdf/i.test(a.mimeType || '') || /\.pdf$/i.test(a.name || ''), lido: !!props.getProperty('VD_ANX3_' + a.id), url: a.url || '' };
  });
}

// FormularioServidor.gs:394
function vdf_todosAnexos_(attachments, urlForm) {
  return (attachments || []).filter(function (a) {
    if (VD_LINK.RX_EDITAR.test(a.name || '') || VD_LINK.RX_COMPRA.test(a.name || '')) return false;
    if (!a.isUpload && urlForm && String(a.url || '').indexOf(urlForm) === 0) return false;
    return !!a.url;
  }).map(function (a) {
    var m = a.mimeType || '', n = a.name || '';
    var tipo = !a.isUpload ? 'link' : (/pdf/i.test(m) || /\.pdf$/i.test(n) ? 'pdf' : (/^image\//i.test(m) || /\.(jpe?g|png|webp|gif)$/i.test(n) ? 'img' : 'arq'));
    return { id: a.id, nome: n, url: a.url, tipo: tipo, data: a.date || '' };
  });
}

// FormularioServidor.gs:407
function vdf_lerAnexoCard(token, shortLink, idAnexo, placa) {
  vdf_usuario_(token);
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  var c = vd_api_('/cards/' + shortLink, { query: { fields: 'idBoard', attachments: 'true', attachment_fields: 'name,fileName,mimeType,isUpload,bytes,url,date' } });
  if (c.idBoard !== board.id) throw new Error('Este card não é do quadro do formulário.');
  var a = (c.attachments || []).filter(function (x) { return x.id === idAnexo; })[0];
  if (!a) throw new Error('Esse anexo não está mais no card.');
  if (!vd_anexoLegivel_(a)) throw new Error('Esse anexo não dá para ler (só PDF ou foto até 15 MB).');
  var r = vd_lerAnexoTrello_(a, { orcCompleto: true });
  if (!r) throw new Error('O Trello não entregou o arquivo "' + a.name + '". Tente de novo.');
  if (r.erro) return { anexoId: a.id, jaNoCard: true, erro: 'Não consegui ler "' + a.name + '" (' + r.erro + ').' };
  var orc = r.orcFull || (r.orc ? { origem: r.orcamento, oficina: vd_orcExpandir_(r.orc.o), fo: vd_orcExpandir_(r.orc.f) } : { origem: '' });
  if (!r.orcFull && orc.fo) (r.foi || []).forEach(function (fi) { orc.fo.forEach(function (x) { if (fi[0] && x.codigo === fi[0]) { x.fornecedor = fi[1]; x.previsao = fi[2]; } }); });
  orc.cor = r.cor; orc.seguradora = r.seguradora; orc.sinistro = r.sinistro;
  var out = vdf_respostaLeitura_(r, orc, placa);
  out.anexoId = a.id; out.jaNoCard = true; out.doCache = !!r.doCache;
  return out;
}

// FormularioServidor.gs:427
function vdf_textoAnexo(token, shortLink, idAnexo) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) throw new Error('Só a diretoria.');
  var c = vd_api_('/cards/' + shortLink, { query: { fields: 'idBoard', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url' } });
  var a = (c.attachments || []).filter(function (x) { return x.id === idAnexo; })[0];
  if (!a) throw new Error('Esse anexo não está mais no card.');
  var resp = qt_fetch_(a.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
  if (resp.getResponseCode() >= 300) throw new Error('O Trello não entregou o arquivo.');
  var texto = vd_ocr_(resp.getBlob(), a.name);
  var orc = vd_lerOrcamento_(texto);
  return { nome: a.name, texto: String(texto).slice(0, 30000), normalizado: vd_normTexto_(texto).slice(0, 30000), orcamento: { origem: orc.origem, oficina: orc.oficina, fo: orc.fo } };
}

// FormularioServidor.gs:445
function vdf_valoresOrcamento(token, shortLink) {
  var me = vdf_usuario_(token);
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard,shortLink', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url,date' } });
  var an = vd_analisar_(card.desc, card.name);
  var todas = (an.pecas || []).concat(an.naoComprar || []);
  var faltam = todas.filter(function (p) { return !p.pneu && !vd_valorOrcTxt_(p.valorOrc); });
  if (!faltam.length) return { ok: true, preenchidas: 0, nada: true };
  var ans = (card.attachments || []).filter(vd_anexoLegivel_).filter(function (a) { return /pdf/i.test(a.mimeType || '') || /\.pdf$/i.test(a.name || ''); })
    .sort(function (a, b) { var oa = /^📄/.test(a.name) ? 0 : 1, ob = /^📄/.test(b.name) ? 0 : 1; return oa - ob || String(b.date || '').localeCompare(String(a.date || '')); }).slice(0, 3);
  var feitas = {}, atual = [];
  for (var i = 0; i < ans.length && Object.keys(feitas).length < faltam.length; i++) {
    var r = null; try { r = vd_lerAnexoTrello_(ans[i], { orcCompleto: true }); } catch (e) { continue; }
    if (!r || r.erro || !r.orcamento) continue;
    var orc = r.orcFull || cp_orcDoCache_(ans[i].id); if (!orc) continue;
    var itens = (orc.oficina || []).concat(orc.fo || []).filter(function (x) { return !x.pneu && vd_valorOrcTxt_(x.valorOrc); });
    faltam.forEach(function (p) {
      var k = vd_chavePeca_(p); if (feitas[k]) return;
      var kc = cp_norm_(p.codigo);
      var it = (kc.length >= 4 ? itens.filter(function (x) { return cp_norm_(x.codigo) === kc; })[0] : null)
        || itens.filter(function (x) { return cp_similar_(p.descricao, x.descricao) > 0; })[0];
      if (!it) return;
      feitas[k] = 1; atual.push({ chave: k, codigoAntigo: p.codigo || '', valorOrc: vd_valorOrcTxt_(it.valorOrc) });
    });
  }
  if (!atual.length) return { ok: true, preenchidas: 0 };
  var div = vd_dividir_(card.desc);
  var bloco = cp_atualizarNoBloco_(div.bloco, atual);
  vd_backup_(card, 'valores do orçamento preenchidos (' + me.username + ')');
  vd_gravarDesc_(card.id, bloco + (div.temMarcador ? '\n\n' + div.resto : ''), token);
  return { ok: true, preenchidas: atual.length };
}

// FormularioServidor.gs:479
function vdf_lerDocumento(token, base64, mime, nome, placa) {
  vdf_usuario_(token);
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, nome);
  var arq = vdf_pastaTemp_().createFile(blob);
  var texto;
  try {
    texto = vd_ocr_(blob, nome);
  } catch (e) {
    return { fileId: arq.getId(), erro: 'Não consegui ler o documento (' + String(e.message || e).slice(0, 80) + '). Ele será anexado mesmo assim.' };
  }
  var orcL = vd_lerOrcamento_(texto);
  try { pv_enriquecerFo_(texto, orcL.fo); } catch (e) {}
  var out = vdf_respostaLeitura_(vd_extrair_(texto), orcL, placa);
  out.fileId = arq.getId();
  return out;
}

// FormularioServidor.gs:497
function vdf_respostaLeitura_(r, orc, placa) {
  var placasDoc = (r.placas || []).slice(0, 5);
  var confere = !placa || placasDoc.some(function (p) { return vd_mesmaPlaca_(p, placa); });
  r.chassis = r.chassis || [];
  return {
    confere: confere,
    placasDoc: placasDoc,
    chassi: confere && r.chassis.length === 1 ? r.chassis[0] : '',
    chassiDivergente: r.chassis.length > 1 ? r.chassis : null,
    modelo: r.modelo || '', ano: r.ano || '', motor: r.motor || '',
    carro: vd_carroCurto_(r.modelo || ''),
    cor: orc.cor || '', seguradora: orc.seguradora || '', sinistro: orc.sinistro || '',
    orcamento: orc.origem ? { origem: orc.origem, oficina: orc.oficina, fo: orc.fo } : null
  };
}

// FormularioServidor.gs:513
function vdf_pastaTemp_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('VD_PASTA_TEMP');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var p = DriveApp.createFolder('Validação Trello — anexos temporários do formulário');
  props.setProperty('VD_PASTA_TEMP', p.getId());
  return p;
}

// FormularioServidor.gs:527
function vdf_checklistFornecimento_(cardId, fo, token, nomeLista) {
  if (!fo || !fo.length) return 0;
  nomeLista = nomeLista || 'FORNECIMENTO';
  var lists = vd_api_('/cards/' + cardId + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name,due,state' } }, token);
  var todas = lists.filter(function (c) { return /FORNECIMENTO/i.test(c.name); });
  var cl = nomeLista === 'FORNECIMENTO'
    ? todas.filter(function (c) { return !/COMPLEMENTO/i.test(c.name); })[0]
    : todas.filter(function (c) { return String(c.name || '').trim().toUpperCase() === nomeLista; })[0];
  if (!cl) cl = vd_api_('/checklists', { method: 'post', payload: { idCard: cardId, name: nomeLista, pos: 'bottom' } }, token);
  var existentes = [];
  todas.forEach(function (c) { (c.checkItems || []).forEach(function (i) { existentes.push({ item: i, norm: vd_semAcento_(i.name), base: pv_baseFo_(i.name) }); }); });
  // 1ª passada: quem casa pelo código (esses itens não podem ser "roubados" pelo casamento por descrição)
  var porCodigo = {};
  fo.forEach(function (p, k) {
    var cod0 = String(p.codigo || p.codigoOrc || '').trim().replace(/\*+$/, '').replace(/\s+/g, '');
    if (!cod0) return;
    existentes.forEach(function (e, j) { if (porCodigo[j] === undefined && vd_casaItem_(e.norm, vd_semAcento_(cod0))) porCodigo[j] = k; });
  });
  var n = 0, usados = {};
  fo.forEach(function (p, k) {
    var cod = String(p.codigo || p.codigoOrc || '').trim();
    var desc = p.pneu ? ('PNEU ' + (p.medida || '') + ' ' + (p.marca || '')).trim() : String(p.descricao || '').trim();
    // padrão do quadro: CÓDIGO DESCRIÇÃO (o fornecedor e a previsão entram depois pela rotina de fornecimento)
    cod = cod.replace(/\*+$/, '').replace(/\s+/g, '');
    // orçamento que já traz fornecedor/prazo da FO (ex.: grupo Porto): entra no item
    var nome = (cod ? cod + ' ' : '') + desc + (p.qtd && +p.qtd > 1 ? ' (x' + p.qtd + ')' : '') + (p.fornecedor ? ' - ' + String(p.fornecedor).toUpperCase() : '');
    var chave = vd_semAcento_(cod || desc);
    var ja = existentes.filter(function (e, j) { return !usados[j] && vd_casaItem_(e.norm, chave); })[0];
    // sem código igual: mesma peça pela descrição (igual ou parecida) = o código mudou no orçamento novo -> atualiza o item,
    // não repete (Weslley, 05/10/2026: "cuidar pra não duplicar e atualizar; pode haver mudança de código da peça")
    if (!ja && !p.pneu && desc) {
      var melhor = -1, nota = 0;
      existentes.forEach(function (e, j) {
        if (usados[j] || porCodigo[j] !== undefined) return;
        var dEx = e.base.replace(/^[A-Z0-9][A-Z0-9.\-\/]{3,}\s+/i, '');
        var sim = cp_similar_(desc, dEx);
        if (sim > nota) { nota = sim; melhor = j; }
      });
      if (melhor >= 0) ja = existentes[melhor];
    }
    if (ja) {
      usados[existentes.indexOf(ja)] = 1;
      // item já existe: só atualiza a descrição (e a previsão, se o item ainda não tem) — nunca duplica
      try {
        var atual = String(ja.item.name || '').trim(), novo = nome;
        // fornecedor que alguém já anotou no item ("... - AVENIDA") fica, se o orçamento não trouxe outro
        var sufixo = atual.match(/\s-\s[^-]+$/);
        if (!p.fornecedor && sufixo && !/\s-\s[^-]+$/.test(novo)) novo += sufixo[0];
        var upd = {};
        if (novo && novo !== atual) upd.name = novo;
        if (p.previsao && !ja.item.due) upd.due = p.previsao;
        if (Object.keys(upd).length) vd_api_('/cards/' + cardId + '/checkItem/' + ja.item.id, { method: 'put', payload: upd }, token);
      } catch (e) { console.log('FO item existente: ' + e); }
      return;
    }
    var corpoFo = { name: nome, pos: 'bottom' };
    if (p.previsao) corpoFo.due = p.previsao;
    vd_api_('/checklists/' + cl.id + '/checkItems', { method: 'post', payload: corpoFo }, token);
    n++;
  });
  return n;
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

// FormularioServidor.gs:628
function vd_dataMaisDias_(dias) {
  return du_somarUteis_(dias);
}

// FormularioServidor.gs:633
function vd_chavePeca_(p) {
  if (p.pneu) return vd_semAcento_('PNEU ' + String(p.medida || '').replace(/\s+/g, ''));
  var cod = String(p.codigo || '').replace(/\s+/g, '');
  return vd_semAcento_(cod || p.descricao || '').replace(/\s+/g, ' ').trim();
}

// FormularioServidor.gs:641
function vd_casaItem_(nomeItem, k) {
  k = String(k || '').replace(/\s+/g, ' ').trim();
  if (!k) return false;
  var n = vd_semAcento_(nomeItem).replace(/\s+/g, ' ').trim();
  if (n === k) return true;
  if (/^\S+$/.test(k) && /\d/.test(k)) return n.indexOf(k + ' ') === 0;
  if (/^PNEU /.test(k)) return n.indexOf(k + ' ') === 0;
  return n.indexOf(k + ' - ') === 0 || n.indexOf(k + ' (X') === 0;
}

// FormularioServidor.gs:652
function vd_nomePeca_(p) {
  if (p.pneu) return ('PNEU ' + String(p.medida || '').replace(/\s+/g, '') + ' ' + (p.marca || p.categoria || '')).trim();
  var cod = String(p.codigo || '').replace(/\s+/g, '');
  return ((cod ? cod + ' ' : '') + String(p.descricao || '').trim()).toUpperCase();
}

// FormularioServidor.gs:662
function vd_checklistPagas_(cardId, compras, token) {
  compras = (compras || []).filter(function (c) { return String(c.fornecedor || '').trim(); });
  if (!compras.length) return 0;
  var lists = vd_api_('/cards/' + cardId + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name,due' } }, token);
  // PAGAS = peças da seguradora; PAGAS PARTICULAR = peças que o cliente paga (checklists separados)
  var pagasTodas = lists.filter(function (c) { return /^PAGAS/i.test((c.name || '').trim()); });
  var existentes = [];
  pagasTodas.forEach(function (c) { (c.checkItems || []).forEach(function (i) { existentes.push(vd_semAcento_(i.name)); }); });
  var porNome = {};
  // PAGAS COMPLEMENTO = peças da seguradora que vieram de orçamento complementar
  var lista = function (part, comp) {
    var nome = part ? 'PAGAS PARTICULAR' : (comp ? 'PAGAS COMPLEMENTO' : 'PAGAS');
    if (porNome[nome]) return porNome[nome];
    var cl = pagasTodas.filter(function (c) { return String(c.name || '').trim().toUpperCase() === nome; })[0];
    if (!cl) cl = vd_api_('/checklists', { method: 'post', payload: { idCard: cardId, name: nome, pos: nome === 'PAGAS' ? 'top' : 'bottom' } }, token);
    porNome[nome] = cl;
    return cl;
  };
  var n = 0;
  compras.forEach(function (c) {
    var cl = lista(!!c.particular, !!c.complemento);
    var cod = String(c.codigo || '').replace(/\s+/g, '').toUpperCase();
    var desc = String(c.descricao || '').trim().toUpperCase();
    var forn = String(c.fornecedor || '').trim().toUpperCase();
    var valor = vd_valorBR_(c.valor);
    var nome = (cod ? cod + ' ' : '') + desc + ' - ' + forn + (valor ? ' - ' + valor : '');
    var chave = vd_semAcento_(cod || desc);
    if (chave && existentes.some(function (e) { return vd_casaItem_(e, chave); })) return;
    var payload = { name: nome, pos: 'bottom' };
    var due = c.previsao ? vd_dataBR_(c.previsao) : (c.dias !== undefined && c.dias !== '' ? vd_dataMaisDias_(c.dias) : '');
    if (due) payload.due = due;
    vd_api_('/checklists/' + cl.id + '/checkItems', { method: 'post', payload: payload }, token);
    existentes.push(vd_semAcento_(nome));
    n++;
  });
  return n;
}

// FormularioServidor.gs:715
function vdf_pecaDoTexto_(texto, chaves) {
  var alvo = vd_semAcento_(texto).replace(/\s+/g, ' ').trim();
  for (var i = 0; i < chaves.length; i++) {
    var k = chaves[i];
    if (k.cod && k.cod.length >= 4 && alvo.indexOf(k.cod) >= 0) return k;
    if (!k.cod && k.desc && (alvo === k.desc || alvo.indexOf(k.desc) >= 0)) return k;
  }
  return null;
}

// FormularioServidor.gs:729
function vdf_lerRemocao_(l, chaves) {
  var m = l.match(VDF_RX_REMOVE);
  if (!m) return null;
  var k = vdf_pecaDoTexto_(m[3], chaves);
  return { tipo: /^REM/i.test(m[1]) ? 'REMOVIDA' : 'INDISPONIVEL', forn: m[2].trim().toUpperCase(), chave: k ? k.chave : '', valor: vd_valorNum_(m[4]), motivo: (m[5] || '').trim() };
}

// FormularioServidor.gs:737
function vdf_linkCot_(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (!/^https?:\/\/\S+$/i.test(s) || /[\s<>]/.test(s)) return null;
  s = vdf_encurtarLink_(s).replace(/\(/g, '%28').replace(/\)/g, '%29');   // parênteses quebrariam o [🔗 link](url) da descrição
  return s.length > 1500 ? null : s;
}

// FormularioServidor.gs:748
function vdf_encurtarLink_(u) {
  try {
    var m;
    if ((m = u.match(/^(https?:\/\/[^\/?#]*aliexpress\.[^\/?#]+\/item\/\d+\.html)/i))) return m[1];
    if ((m = u.match(/^(https?:\/\/[^\/?#]*(?:mercadolivre\.com\.br|mercadolibre\.com|shopee\.com\.br)\/[^?#]+)/i))) return m[1].replace(/\/+$/, '');
    if ((m = u.match(/^(https?:\/\/[^\/?#]*amazon\.[^\/?#]+\/(?:.*?\/)?dp\/[A-Z0-9]{10})/i))) return m[1];
    var semHash = u.split('#')[0], partes = semHash.split('?');
    if (partes.length < 2) return semHash;
    var q = partes.slice(1).join('?').split('&').filter(function (kv) { return kv && !/^(utm_|spm=|gatewayAdapt=|fbclid=|gclid=|srsltid=|_gl=|ref=|ref_=|tag=|tracking_id=|aff_|afSmartRedirect=|scm=|pvid=|algo_|sk=|curPageLogUid=|pdp_|_t=|srcSns=|spreadType=|bizType=|social_params=|terminal_id=|shareScene=|_randl_|_rsc=|mc=|igsh=)/i.test(kv); });
    return partes[0] + (q.length ? '?' + q.join('&') : '');
  } catch (e) { return u; }
}

// FormularioServidor.gs:761
function vdf_tirarLinkCot_(l) {
  var m = l.match(/^(.*?)\s+-\s+(?:\[[^\]]*\]\()?(https?:\/\/[^\s)]+)\)?\s*$/i);
  return m ? { linha: m[1], link: m[2] } : { linha: l, link: '' };
}

// FormularioServidor.gs:766
function vd_cotacoesDaDescricao_(desc, pecas) {
  var out = { cotacoes: [], nt: [], obs: [], semCot: [] };
  var resto = vd_dividir_(desc).resto;
  if (!resto) return out;
  var chaves = (pecas || []).map(function (p) { return { chave: vd_chavePeca_(p), desc: vd_semAcento_(p.pneu ? 'PNEU ' + p.medida : p.descricao).replace(/\s+/g, ' ').trim(), cod: vd_semAcento_(String(p.codigo || '').replace(/\s+/g, '')) }; });
  var forn = '', obs = '';
  resto.split('\n').slice(1).forEach(function (raw) {
    var l = vd_limpar_(raw).trim();
    if (!l) return;
    // cotação removida pelo cotador / indisponível na hora da compra: sai da lista (a mais recente igual)
    var rm = vdf_lerRemocao_(l, chaves);
    if (rm) {
      if (rm.chave) {
        for (var ir = out.cotacoes.length - 1; ir >= 0; ir--) {
          var q0 = out.cotacoes[ir];
          if (q0.chave === rm.chave && q0.fornecedor === rm.forn && Math.abs(q0.valor - rm.valor) < 0.005) { out.cotacoes.splice(ir, 1); break; }
        }
        if (rm.tipo === 'INDISPONIVEL') out.obs.push({ chave: rm.chave, texto: '(indisponível) ' + rm.forn + ' ' + vd_valorBR_(rm.valor) + (rm.motivo ? ': ' + rm.motivo : '') });
      }
      forn = '';
      return;
    }
    if (/^COMPRAD[OA]\s*:/i.test(l) || /^AUTORIZAD[OA]\s*:/i.test(l) || /^(RE)?COTA[ÇC][ÃA]O\s+\d{1,2}\/\d{1,2}/i.test(l) || /^AUTORIZA[ÇC][ÃA]O\s+\d{1,2}\/\d{1,2}/i.test(l) || /^DEVOLVIDA PARA COTA/i.test(l) || /^OBS GERAL\s*:/i.test(l) || /^\(texto que estava/i.test(l)) { if (/^(AUTORIZA|DEVOLVIDA)/i.test(l)) forn = ''; return; }
    /* SEM COTAÇÃO <peça>: motivo — comprador justificou por que não cotou a peça */
    var ms = l.match(/^SEM COTA[ÇC][ÃA]O\s+(.+?)\s*:\s*(.+)$/i);
    if (ms) {
      var alvoS = vd_semAcento_(ms[1]).replace(/\s+/g, ' ').trim();
      for (var is = 0; is < chaves.length; is++) {
        var ks = chaves[is];
        if ((ks.cod && ks.cod.length >= 4 && alvoS.indexOf(ks.cod) >= 0) || (!ks.cod && ks.desc && alvoS.indexOf(ks.desc) >= 0)) { out.semCot.push({ chave: ks.chave, texto: ms[2].trim() }); break; }
      }
      return;
    }
    var mo = l.match(/^OBS\s+(.+?)\s*:\s*(.+)$/i);
    if (mo) {
      var alvoO = vd_semAcento_(mo[1]).replace(/\s+/g, ' ').trim(), pecaO = null;
      for (var io = 0; io < chaves.length && !pecaO; io++) {
        var ko = chaves[io];
        if (ko.cod && ko.cod.length >= 4 && alvoO.indexOf(ko.cod) >= 0) pecaO = ko;
        else if (!ko.cod && ko.desc && alvoO.indexOf(ko.desc) >= 0) pecaO = ko;
      }
      if (pecaO) out.obs.push({ chave: pecaO.chave, texto: mo[2].trim() });
      return;
    }
    var temValor = /R\$\s*[\d.]+|\s-\s*[\d.]+(?:,\d{1,2})?\s*(?:-|$)/i.test(l);
    if (!temValor && /^\*\*[^*]+\*\*\s*$/.test(raw.trim()) && l.length <= 60 && l.indexOf('|') < 0) {
      // cabeçalho de fornecedor
      var h = l.split(/\s+-\s+/);
      // "**IMPERIAL -**" (cabeçalho antigo, digitado à mão) = IMPERIAL: tira traço/dois-pontos do fim
      forn = h[0].replace(/[\s\-–:]+$/, '').trim().toUpperCase(); obs = h.slice(1).join(' - ').trim();
      if (/^NT\b|N[ÃA]O\s+TEM/i.test(obs) && out.nt.indexOf(forn) < 0) out.nt.push(forn);
      return;
    }
    if (!forn || !temValor) return;
    var tl = vdf_tirarLinkCot_(l);   // "- [🔗 link](url)" no fim: link do anúncio (Mercado Livre etc.)
    // peça sem código cuja descrição tem " - " dentro ("… (MACANETA INTERNA) - FOTOS EM ANEXO", BAD8318 06/10/2026): a linha
    // começa com a descrição inteira; reconhece antes de separar os campos, senão o traço da descrição vira separador
    var linha = tl.linha, LN = vd_semAcento_(tl.linha).replace(/\s+/g, ' ').trim(), pre = null;
    chaves.slice().sort(function (a, b) { return b.desc.length - a.desc.length; }).forEach(function (k) {
      if (!pre && !k.cod && k.desc && k.desc.indexOf(' - ') >= 0 && LN.indexOf(k.desc + ' - ') === 0) pre = k;
    });
    if (pre) linha = 'PECA' + LN.slice(pre.desc.length);
    var m = linha.match(/^(.+?)\s+-\s+(?:(.+?)\s+-\s+)?R?\$?\s*([\d.]+(?:,\d{1,2})?)(?:\s+-\s+(?:(\d+)\s*DIAS?(?:\s+[ÚU]T(?:EIS|IL))?|(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)|(.*?)))?\s*$/i);
    if (!m) return;
    var alvo = vd_semAcento_(m[1]).replace(/\s+/g, ' ').trim();
    var peca = pre;
    for (var i = 0; i < chaves.length && !peca; i++) {
      var k = chaves[i];
      if (k.cod && k.cod.length >= 4 && alvo.indexOf(k.cod) >= 0) peca = k;
      else if (!k.cod && k.desc && (alvo === k.desc || alvo.indexOf(k.desc) >= 0)) peca = k;
    }
    if (!peca) return;
    var tm = String(m[2] || '').trim().toUpperCase();
    var tipo = '', marca = tm;
    var mt = tm.match(/^(GENU[IÍ]NO|ORIGINAL|PARALEL[OA]|USAD[OA])\b\s*(.*)$/i);
    if (mt) { tipo = vd_tipoNorm_(mt[1]); marca = mt[2].trim(); }
    out.cotacoes.push({ chave: peca.chave, fornecedor: forn, obs: obs, tipo: tipo, marca: marca, valor: vd_valorNum_(m[3]), dias: m[4] !== undefined ? +m[4] : '', data: m[5] || '', link: tl.link });
  });
  return out;
}

// FormularioServidor.gs:847
function vdf_nomeLista_(ctx, id) {
  var n = '';
  Object.keys(ctx.listas).forEach(function (k) { if (ctx.listas[k] === id) n = k; });
  return n;
}

// FormularioServidor.gs:853
function vdf_moverPara_(card, ctx, nomeLista, token, usuario) {
  var id = ctx.listas[nomeLista];
  if (!id) return '';
  try { st_permitir_(card.id, id); } catch (e) {}   // antes do PUT (e mesmo se alguém já arrastou para lá): a trava não desfaz
  if (id === card.idList) return '';
  var de = vdf_nomeLista_(ctx, card.idList);
  vd_api_('/cards/' + card.id, { method: 'put', payload: { idList: id, pos: 'top' } }, token);
  card.idList = id;
  vd_fixarTopo_(id, token);   // card fixo "NOVO PEDIDO" continua em primeiro (07/10/2026)
  try { ev_registrar_('COLUNA', card, usuario || 'formulário', null, { detalhe: (de || '?') + ' → ' + nomeLista }); } catch (e) {}
  return nomeLista;
}

// FormularioServidor.gs:867
function vdf_linkComprador_(card, ctx, token) {
  try {
    var ans = vd_api_('/cards/' + card.id + '/attachments', { query: { fields: 'name,url' } });
    if (ans.some(function (a) { return VD_LINK.RX_COMPRA.test(a.name || ''); })) return;
    vd_api_('/cards/' + card.id + '/attachments', { method: 'post', payload: { url: ctx.urlForm + '?card=' + card.shortLink + '&modo=compras', name: VD_LINK.COMPRA, setCover: false } }, token);
  } catch (e) {}
}

// FormularioServidor.gs:880
function vdf_salvarCotacao(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) lança cotação — sua conta: ' + me.username + '.'] };
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro — não recebe cotação nem compra.'] };
  var an = vd_analisar_(card.desc, card.name);
  var porChave = {};
  an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var faltas = [];
  var foLista = []; try { foLista = fo_lista_(); } catch (e) {}
  var foNome = function (x) { try { return fo_resolver_(x, foLista).nome || String(x || '').trim().toUpperCase(); } catch (e) { return String(x || '').trim().toUpperCase(); } };
  var cots = (p.cotacoes || []).map(function (c, i) {
    var peca = porChave[c.chave];
    var r = { peca: peca, fornecedor: foNome(c.fornecedor), tipo: vd_tipoNorm_(c.tipo || '') || '', marca: String(c.marca || '').trim().toUpperCase(), valor: vd_valorNum_(c.valor), dias: String(c.dias == null ? '' : c.dias).trim(), link: vdf_linkCot_(c.link) };
    var rot = 'cotação ' + (i + 1) + (peca ? ' (' + vd_nomePeca_(peca) + ')' : '');
    if (!peca) faltas.push(rot + ': peça não encontrada no pedido');
    if (!r.fornecedor) faltas.push(rot + ': falta o fornecedor');
    if (isNaN(r.valor) || r.valor <= 0) faltas.push(rot + ': valor inválido');
    if (r.dias !== '' && !/^\d+$/.test(r.dias)) faltas.push(rot + ': prazo em dias úteis (número)');
    if (r.tipo && r.tipo.charAt(0) === '?') faltas.push(rot + ': tipo inválido');
    if (r.link === null) faltas.push(rot + ': link inválido — cole o endereço completo, começando com http (ou deixe vazio)');
    return r;
  });
  var nt = (p.nt || []).map(foNome).filter(String);
  var obs = (p.obs || []).map(function (o) { return { peca: porChave[o.chave], texto: String(o.texto || '').replace(/\s*\n\s*/g, ' ').trim() }; }).filter(function (o) { return o.peca && o.texto; });
  var semCot = (p.semCot || []).map(function (o) { return { peca: porChave[o.chave], chave: o.chave, texto: String(o.texto || '').replace(/\s*\n\s*/g, ' ').trim() }; }).filter(function (o) { return o.peca && o.texto; });
  semCot.forEach(function (s) { if (cots.some(function (c) { return c.peca === s.peca; })) faltas.push(vd_nomePeca_(s.peca) + ': tem cotação e justificativa de não cotar ao mesmo tempo — deixe só uma'); });
  // remover / editar cotação já lançada: só antes da autorização (e da compra) daquela peça
  var lidasAntes = vd_cotacoesDaDescricao_(card.desc, an.pecas).cotacoes;
  var autsAntes = []; try { autsAntes = vd_autorizacoesDaDescricao_(card.desc, an.pecas); } catch (e) {}
  var rem = [];
  (p.remover || []).forEach(function (r) {
    var peca = porChave[r.chave], forn = String(r.fornecedor || '').trim().toUpperCase(), valor = vd_valorNum_(r.valor);
    if (!peca) return;
    if (!lidasAntes.some(function (q) { return q.chave === r.chave && q.fornecedor === forn && Math.abs(q.valor - valor) < 0.005; })) return;
    if (autsAntes.some(function (a) { return a.chave === r.chave; })) { faltas.push(vd_nomePeca_(peca) + ': já autorizada — a cotação não pode mais ser alterada (na compra, use "cotação indisponível")'); return; }
    rem.push({ peca: peca, fornecedor: forn, valor: valor });
  });
  /* 07/10/2026 (Weslley): o comprador salva a cotação aos poucos, conforme recebe.
   *  parcial = true  -> grava o que veio, card fica em EM COTAÇÃO (etiqueta COTAÇÃO PARCIAL), sem exigir cobertura, sem mencionar ninguém.
   *  parcial = false -> "enviar": exige toda peça com cotação ou motivo; sem novidade também vale (fecha o que foi salvo parcialmente). */
  var parcial = !!p.parcial;
  var nada = !cots.length && !nt.length && !obs.length && !semCot.length && !rem.length;
  if (nada && parcial) faltas.push('Nada novo para salvar.');
  if (faltas.length) return { ok: false, faltas: faltas };
  /* 07/10/2026 (Weslley): cotação lançada em peça JÁ AUTORIZADA (ou comprada) é só de registro — fica na descrição e na
   * vitrine ("📝 também cotado"), mas não mexe na autorização, não move o card e não menciona ninguém. Vale quando toda
   * cotação deste envio é de peça autorizada e não há peça nova sem cotação / remoção junto. Para trocar o fornecedor
   * autorizado, o caminho continua sendo "cotação indisponível" na aba Compra. */
  var registro = !parcial && cots.length > 0 && !rem.length && !semCot.length
    && cots.every(function (c) { return autsAntes.some(function (a) { return a.chave === vd_chavePeca_(c.peca); }); });
  var novaDesc = card.desc;
  if (!nada) novaDesc = vdf_descComCotacao_(card, an, me, cots, nt, obs, semCot, rem);
  // enviar: toda peça precisa de cotação OU de justificativa para não cotar (salvar parcial não exige)
  var cobPrev = vdf_coberturaCotacao_(novaDesc, an.pecas);
  if (!parcial && !registro && cobPrev.faltam.length) return { ok: false, faltas: cobPrev.faltam.map(function (n) { return n + ': sem cotação — lance a cotação, escreva o motivo de não cotar, ou use "Salvar parcial"'; }) };
  if (!nada) {
    vd_backup_(card, 'cotação ' + (parcial ? 'parcial ' : registro ? 'de registro ' : '') + 'lançada pelo formulário por ' + me.username);
    vd_gravarDesc_(card.id, novaDesc, token);
    try { fo_registrarUso_(cots.map(function (c) { return c.fornecedor; }).concat(nt), me.username); } catch (e) {}
    try {
      ev_registrar_('COTAÇÃO', card, me.username,
        cots.map(function (c) { var e = ev_peca_(c.peca); e.fornecedor = c.fornecedor; e.valor = c.valor; e.dias = c.dias; e.detalhe = [c.tipo, c.marca].filter(String).join(' ') + (parcial ? ' (parcial)' : registro ? ' (registro, peça já autorizada)' : ''); return e; })
          .concat(semCot.map(function (x) { var e = ev_peca_(x.peca); e.detalhe = 'SEM COTAÇÃO: ' + x.texto; return e; }))
          .concat(nt.map(function (f) { return { fornecedor: f, detalhe: 'NT (não tem)' }; }))
          .concat(rem.map(function (r) { var e = ev_peca_(r.peca); e.fornecedor = r.fornecedor; e.valor = r.valor; e.detalhe = 'COTAÇÃO REMOVIDA'; return e; })));
    } catch (e) {}
  }

  /* Cobertura (somando as cotações que já estavam no card): cada peça da oficina precisa de
   * cotação OU de justificativa (SEM COTAÇÃO). Parcial (botão "Salvar parcial" ou cobertura incompleta) -> card fica
   * em EM COTAÇÃO com a etiqueta COTAÇÃO PARCIAL. Completa e enviada -> anda (seguradora: PENDENTE AUTORIZAR;
   * particular: COTAÇÃO FINALIZADA), avisando as peças não cotadas e o motivo. */
  var cob = cobPrev;
  // só peças particulares -> COTAÇÃO FINALIZADA (o consultor autoriza); havendo peça da seguradora -> PENDENTE AUTORIZAR
  var particular = an.pecas.length ? an.pecas.every(function (x) { return vdf_pecaParticular_(x, card, an); }) : vdf_ehParticular_(card, an);
  var misto = !particular && an.pecas.some(function (x) { return x.particular; });
  var movido = '';
  if (!registro) {
    try { movido = vdf_moverPara_(card, ctx, parcial || cob.faltam.length ? VD.LISTA_COTACAO : (particular ? VDF_LISTA_FINALIZADA : VDF_LISTA_PENDENTE), token, me.username); } catch (e) {}
    try { vdf_etiquetaParcial_(card, parcial || cob.faltam.length > 0, token); } catch (e) {}
  }
  var nPc = Object.keys(cots.reduce(function (a, c) { a[c.chave || vd_chavePeca_(c.peca)] = 1; return a; }, {})).length;
  if (registro) {
    try {
      vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '📝 **COTAÇÃO DE REGISTRO** — ' + me.fullName + ' · ' + cots.length + ' cotação(ões) em ' + nPc + ' peça(s) já autorizada(s): a autorização e a coluna não mudam. Para trocar o fornecedor autorizado, use "cotação indisponível" na aba Compra.' } }, token);
    } catch (e) {}
    try { vd_marcar_(card); } catch (e) {}
    return { ok: true, registro: true, url: card.shortUrl, nome: card.name, lista: vdf_nomeLista_(ctx, card.idList), n: cots.length, obs: obs.length, faltam: [], semCot: 0 };
  }
  if (parcial) {
    // salva aos poucos: comentário curto, sem mencionar ninguém (o card não anda)
    try {
      var txtP = '💾 **COTAÇÃO PARCIAL salva** — ' + me.fullName + ' · ' + cots.length + ' cotação(ões) em ' + nPc + ' peça(s)' + (nt.length ? ' · ' + nt.length + ' NT' : '') + (movido ? ' → **' + movido + '**' : '')
        + (cob.faltam.length ? '\n⏳ falta cotar ou justificar: ' + cob.faltam.join(', ') : '\n✅ todas as peças cobertas — falta só **Enviar cotação** pela aba Cotação.');
      vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txtP } }, token);
    } catch (e) {}
    try { vd_marcar_(card); } catch (e) {}
    return { ok: true, parcial: true, url: card.shortUrl, nome: card.name, lista: movido || vdf_nomeLista_(ctx, card.idList), n: cots.length, obs: obs.length, faltam: cob.faltam, semCot: cob.semCot.length };
  }
  try {
    // menciona o setor de compras (quem cuida do card daqui em diante), não o consultor (05/10/2026, Weslley);
    // o consultor só é mencionado quando é ele quem autoriza (pedido particular / peças particulares dele)
    var compr = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).toLowerCase().split(/[,;\s]+/).filter(function (u) { return u && u !== String(me.username).toLowerCase(); })[0] || '';   // 1º da lista (comprasunity), como no AUTORIZADO
    var quem = particular ? vd_criador_(card.id) : '';
    var mencoes = [compr, quem].concat(an.pecas.map(function (x) { return x.partPor; })).filter(function (u, i, a) { return u && u !== String(me.username).toLowerCase() && a.indexOf(u) === i; });
    var txt = mencoes.map(function (u) { return '@' + u + ' '; }).join('') + '💰 **COTAÇÃO** — ' + me.fullName + ' · ' + (nada ? 'enviada (salva antes aos poucos)' : cots.length + ' cotação(ões) em ' + nPc + ' peça(s)' + (nt.length ? ' · ' + nt.length + ' NT' : '')) + (movido ? ' → **' + movido + '**' : '');
    if (cob.faltam.length) txt += '\n⏳ **PARCIAL** — falta cotar ou justificar: ' + cob.faltam.join(', ');
    else if (cob.semCot.length) txt += '\n⛔ **NÃO COTADAS:** ' + cob.semCot.map(function (s) { return s.nome + ' (' + s.texto + ')'; }).join('; ');
    if (misto && !cob.faltam.length) txt += '\n👤 Particulares: autoriza o consultor pela aba Autorizar.';
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, lista: movido || vdf_nomeLista_(ctx, card.idList), n: cots.length, obs: obs.length, faltam: cob.faltam, semCot: cob.semCot.length };
}

// FormularioServidor.gs:999
function vdf_descComCotacao_(card, an, me, cots, nt, obs, semCot, rem) {
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  var ordem = [], grupos = {};
  cots.forEach(function (c) {
    if (!grupos[c.fornecedor]) { grupos[c.fornecedor] = []; ordem.push(c.fornecedor); }
    var nomeP = c.peca.pneu ? 'PNEU ' + String(c.peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(c.peca);
    grupos[c.fornecedor].push(nomeP + (c.tipo || c.marca ? ' - ' + [c.tipo, c.marca].filter(String).join(' ') : '') + ' - ' + vd_valorBR_(c.valor) + (c.dias !== '' ? ' - ' + c.dias + (c.dias === '1' ? ' dia útil' : ' dias úteis') : '')
      + (c.link ? ' - [🔗 link](' + c.link + ')' : ''));   // link do anúncio (Mercado Livre etc.): vira link clicável na descrição
  });
  var L = ['**COTAÇÃO ' + agora + ' - ' + me.fullName + '**'];
  rem.forEach(function (r) { L.push('REMOVIDA: ' + r.fornecedor + ' - ' + (r.peca.pneu ? 'PNEU ' + String(r.peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(r.peca)) + ' - ' + vd_valorBR_(r.valor)); });
  ordem.forEach(function (f) { L.push('**' + f + '**'); L = L.concat(grupos[f]); });
  nt.forEach(function (f) { if (!grupos[f]) L.push('**' + f + ' - NT**'); });
  obs.forEach(function (o) { L.push('OBS ' + vd_nomePeca_(o.peca) + ': ' + o.texto); });
  semCot.forEach(function (s) { L.push('SEM COTAÇÃO ' + (s.peca.pneu ? 'PNEU ' + String(s.peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(s.peca)) + ': ' + s.texto); });

  var div = vd_dividir_(card.desc);
  var resto = div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR;
  return div.bloco.replace(/\s+$/, '') + '\n\n' + resto + '\n\n' + L.join('\n');
}

// FormularioServidor.gs:1021
function vdf_coberturaCotacao_(desc, pecas) {
  var lidas = vd_cotacoesDaDescricao_(desc, pecas);
  var faltam = [], sem = [];
  (pecas || []).forEach(function (p) {
    var k = vd_chavePeca_(p), nome = p.pneu ? 'PNEU ' + String(p.medida || '').replace(/\s+/g, '') : vd_nomePeca_(p);
    if (lidas.cotacoes.some(function (q) { return q.chave === k; })) return;
    var j = lidas.semCot.filter(function (s) { return s.chave === k; }).pop();
    if (j) sem.push({ nome: nome, texto: j.texto }); else faltam.push(nome);
  });
  return { faltam: faltam, semCot: sem };
}

// FormularioServidor.gs:1035
function vdf_etiquetaParcial_(card, por, token) {
  var id = pz_labelId_(card.idBoard, VDF_ETIQUETA_PARCIAL, 'orange');
  var tem = (card.labels || []).some(function (l) { return l.id === id; });
  if (por && !tem) vd_api_('/cards/' + card.id + '/idLabels', { method: 'post', payload: { value: id } }, token);
  if (!por && tem) vd_api_('/cards/' + card.id + '/idLabels/' + id, { method: 'delete' }, token);
}

// FormularioServidor.gs:1048
function vd_autorizacoesDaDescricao_(desc, pecas) {
  var resto = vd_dividir_(desc).resto;
  if (!resto) return [];
  var chaves = (pecas || []).map(function (p) { return { chave: vd_chavePeca_(p), desc: vd_semAcento_(p.pneu ? 'PNEU ' + p.medida : p.descricao).replace(/\s+/g, ' ').trim(), cod: vd_semAcento_(String(p.codigo || '').replace(/\s+/g, '')) }; });
  var porChave = {}, quem = '', quando = '';
  resto.split('\n').forEach(function (raw) {
    var l = vd_limpar_(raw).trim();
    var h = l.match(/^AUTORIZA[ÇC][ÃA]O\s+(\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+\d{1,2}:\d{2})?)\s+-\s+(.+)$/i);
    if (h) { quando = h[1]; quem = h[2].trim(); return; }
    if (/^DEVOLVIDA PARA COTA/i.test(l)) { porChave = {}; return; }   // devolução anula autorizações anteriores
    var rmA = vdf_lerRemocao_(l, chaves);
    if (rmA) { if (rmA.tipo === 'INDISPONIVEL' && rmA.chave && porChave[rmA.chave] && porChave[rmA.chave].fornecedor === rmA.forn) delete porChave[rmA.chave]; return; }
    var m = l.match(/^AUTORIZAD[OA]\s*:\s*(.+?)\s+-\s+(.+)\s+-\s+R?\$?\s*([\d.]+(?:,\d{1,2})?)\s*$/i);
    if (!m) return;
    var alvo = vd_semAcento_(m[2]).replace(/\s+/g, ' ').trim(), peca = null;
    for (var i = 0; i < chaves.length && !peca; i++) {
      var k = chaves[i];
      if (k.cod && k.cod.length >= 4 && alvo.indexOf(k.cod) >= 0) peca = k;
      else if (!k.cod && k.desc && alvo.indexOf(k.desc) >= 0) peca = k;
    }
    if (peca) porChave[peca.chave] = { chave: peca.chave, fornecedor: m[1].trim().toUpperCase(), valor: vd_valorNum_(m[3]), quem: quem, quando: quando };
  });
  return Object.keys(porChave).map(function (k) { return porChave[k]; });
}

// FormularioServidor.gs:1080
function vdf_autorizar(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro — não recebe autorização.'] };
  var an = vd_analisar_(card.desc, card.name);
  if (!vdf_podeAutorizar_(me, card, an)) {
    return { ok: false, faltas: [vdf_ehParticular_(card, an) ? 'Pedido particular: quem autoriza é o consultor que fez o pedido (ou a diretoria).' : 'Só a diretoria autoriza as peças da seguradora; as peças particulares, o consultor que as lançou (sua conta: ' + me.username + ').'] };
  }
  var criador; try { criador = vd_criador_(card.id); } catch (e) { criador = ''; }
  var porChave = {};
  an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var lidas = vd_cotacoesDaDescricao_(card.desc, an.pecas).cotacoes;
  var faltas = [], linhas = [], total = 0, evAut = [];
  /* 07/10/2026 (Weslley): na aba Autorizar a diretoria também marca a peça como ➕ COMPLEMENTO (vai no orçamento
   * complementar; compra entra em PAGAS COMPLEMENTO) ou 🚫 NÃO COMPRAR (sai do fluxo, fica de registro) — sem precisar
   * abrir o pedido do consultor. p.marcas = [{chave, complemento:true|false} | {chave, naoComprar:true, motivo}] */
  var marcas = vdf_ehAutorizador_(me) ? (p.marcas || []) : [];
  /* 07/10/2026 (Weslley): como na cotação — "Salvar parcial" guarda as autorizações sem mover o card nem avisar o
   * comprador; "Enviar autorização" fecha (move) e pode vir sem escolha nova, só para fechar o que foi salvo antes */
  var parcial = !!p.parcial;
  var autsAntes = vd_autorizacoesDaDescricao_(card.desc, an.pecas);
  var naoComprarAgora = {};
  marcas.forEach(function (m) { if (m && m.naoComprar && porChave[m.chave]) naoComprarAgora[m.chave] = 1; });
  (p.escolhas || []).forEach(function (e, i) {
    var peca = porChave[e.chave];
    if (!peca) { faltas.push('escolha ' + (i + 1) + ': peça não encontrada no pedido'); return; }
    if (naoComprarAgora[e.chave]) { faltas.push(vd_nomePeca_(peca) + ': marcada como não comprar — não pode ser autorizada ao mesmo tempo'); return; }
    if (!vdf_podeAutorizarPeca_(me, card, an, peca, criador)) { faltas.push(vd_nomePeca_(peca) + ': ' + (vdf_pecaParticular_(peca, card, an) ? 'peça particular — quem autoriza é o consultor que a lançou' : 'peça da seguradora — quem autoriza é a diretoria')); return; }
    var forn = String(e.fornecedor || '').trim().toUpperCase(), valor = vd_valorNum_(e.valor);
    var q = lidas.filter(function (x) { return x.chave === e.chave && x.fornecedor === forn && Math.abs(x.valor - valor) < 0.005; })[0];
    if (!q) { faltas.push(vd_nomePeca_(peca) + ': essa cotação (' + forn + ' ' + vd_valorBR_(valor) + ') não está no card'); return; }
    linhas.push('AUTORIZADO: ' + forn + ' - ' + (peca.pneu ? 'PNEU ' + String(peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(peca)) + ' - ' + vd_valorBR_(valor));
    total += valor;
    var doPeca = lidas.filter(function (x) { return x.chave === e.chave; }).map(function (x) { return x.valor; });
    var ea = ev_peca_(peca); ea.fornecedor = forn; ea.valor = valor; ea.dias = q.dias;
    ea.detalhe = doPeca.length > 1 ? 'menor ' + vd_valorBR_(Math.min.apply(null, doPeca)) + ' · maior ' + vd_valorBR_(Math.max.apply(null, doPeca)) + ' · ' + doPeca.length + ' cotações' : '1 cotação';
    evAut.push(ea);
  });
  // marcas na linha da peça (bloco do consultor): troca só a linha daquela peça, o resto do bloco fica igual
  var div = vd_dividir_(card.desc);
  var blocoNovo = div.bloco, marcadas = [];
  marcas.forEach(function (m) {
    var peca = m && porChave[m.chave]; if (!peca) return;
    if (m.naoComprar) { peca.naoComprar = true; peca.naoMotivo = String(m.motivo || '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '/').trim().slice(0, 80); peca.complemento = false; peca.compData = ''; }
    else if (m.complemento !== undefined) { if (!!peca.complemento === !!m.complemento) return; peca.complemento = !!m.complemento; peca.compData = m.complemento ? cp_hoje_() : ''; }
    else return;
    var linhaNova = vd_linhaPeca_(peca, 0).replace(/^1\. /, ''), feito = false;
    blocoNovo = blocoNovo.split('\n').map(function (l) {
      if (feito || vd_sigItem_(l) !== peca.sig) return l;
      feito = true;
      var mNum = l.match(/^(\s*\d+\s*[.)\-]\s*)/);
      return (mNum ? mNum[1] : '') + linhaNova;
    }).join('\n');
    if (feito) marcadas.push({ peca: peca, m: m });
  });
  var fechar = !parcial && !linhas.length && !marcadas.length && autsAntes.length > 0;   // só fechar o que já foi salvo
  if (!linhas.length && !marcadas.length && !faltas.length && !fechar) faltas.push(parcial ? 'Escolha a cotação de pelo menos uma peça para salvar.' : 'Escolha a cotação de pelo menos uma peça (ou marque complemento / não comprar).');
  if (faltas.length) return { ok: false, faltas: faltas };
  var obsL = vdf_linhasObs_(p, porChave, 'autorização');

  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  var resto = div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR;
  vd_backup_(card, 'compra autorizada pelo formulário por ' + me.username);
  var cabAut = linhas.length || obsL.linhas.length ? '\n\n**AUTORIZAÇÃO ' + agora + ' - ' + me.fullName + '**\n' + linhas.concat(obsL.linhas).join('\n') : '';
  var novaDesc = blocoNovo.replace(/\s+$/, '') + '\n\n' + resto + cabAut;
  if (cabAut || marcadas.length) vd_gravarDesc_(card.id, novaDesc, token);
  if (marcadas.length) {
    // a base de "peça nova" acompanha a linha alterada (senão o robô acharia que é peça nova e devolveria para cotação)
    try { vd_pkSet_(card.id, vd_linhasConsultor_(blocoNovo).map(vd_sigItem_)); } catch (e) {}
    an = vd_analisar_(novaDesc, card.name);
    var comps = marcadas.filter(function (x) { return x.m.complemento; }).map(function (x) { return x.peca; }), descomp = marcadas.filter(function (x) { return x.m.complemento === false; }).map(function (x) { return x.peca; }), naos = marcadas.filter(function (x) { return x.m.naoComprar; }).map(function (x) { return x.peca; });
    try { if (comps.length) ev_registrar_('COMPLEMENTO', card, me.username, comps.map(ev_peca_), { detalhe: comps.length + ' oficina · marcado na autorização' }); } catch (e) {}
    try { if (naos.length) ev_registrar_('PEDIDO EDITADO', card, me.username, naos.map(ev_peca_), { detalhe: 'NÃO COMPRAR (autorização): ' + naos.map(function (x) { return x.naoMotivo; }).filter(String).join('; ') }); } catch (e) {}
    var txtM = (comps.length ? '\n➕ **Complemento** (vai no orçamento complementar; compra em PAGAS COMPLEMENTO): ' + comps.map(cp_nome_).join('; ') : '')
      + (descomp.length ? '\n➖ Deixou de ser complemento: ' + descomp.map(cp_nome_).join('; ') : '')
      + (naos.length ? '\n🚫 **Não comprar**: ' + naos.map(function (x) { return cp_nome_(x) + (x.naoMotivo ? ' (' + x.naoMotivo + ')' : ''); }).join('; ') : '');
    if (!linhas.length) {
      // só marcas, sem autorização nova: comentário próprio; a coluna é reavaliada (card pode ter ficado sem peça da oficina)
      try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '✏️ **Peças marcadas na autorização** — ' + me.fullName + txtM + obsL.texto } }, token); } catch (e) {}
      var mv = ''; try { mv = rc_reavaliarColuna_(card.id, token, me.username); } catch (e) {}
      try { vd_marcar_(card); } catch (e) {}
      return { ok: true, url: card.shortUrl, nome: card.name, n: 0, total: 0, semAut: 0, aguarda: [], marcas: marcadas.length, lista: mv || vdf_nomeLista_(ctx, card.idList) };
    }
  }
  // card com peças da seguradora E particulares: só vai para AUTORIZADO COMPRA quando as duas partes
  // tiverem autorização (diretoria + consultor). Enquanto isso fica onde está, avisando quem falta.
  var autsAgora = vd_autorizacoesDaDescricao_(novaDesc, an.pecas);
  var temAut = function (x) { return autsAgora.some(function (a) { return a.chave === vd_chavePeca_(x); }); };
  if (parcial) {
    // guarda e para por aqui: card fica onde está, sem menção ao comprador
    try { ev_registrar_('AUTORIZAÇÃO', card, me.username, evAut, { detalhe: 'parcial' }); } catch (e) {}
    var jaAut = an.pecas.filter(temAut).length;
    try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '💾 **AUTORIZAÇÃO PARCIAL salva** — ' + me.fullName + ' · ' + linhas.length + ' peça(s) agora · ' + vd_valorBR_(total) + ' · ' + jaAut + ' de ' + an.pecas.length + ' peça(s) autorizada(s) no card' + (typeof txtM === 'string' ? txtM : '') + obsL.texto + '\nO card continua em **' + vdf_nomeLista_(ctx, card.idList) + '** até a autorização ser enviada.' } }, token); } catch (e) {}
    try { vd_marcar_(card); } catch (e) {}
    return { ok: true, parcial: true, url: card.shortUrl, nome: card.name, n: linhas.length, total: total, jaAut: jaAut, pecas: an.pecas.length, marcas: marcadas.length, lista: vdf_nomeLista_(ctx, card.idList) };
  }
  if (fechar) {
    // nada novo: fecha o que foi salvo parcialmente — totais passam a ser os de todas as autorizações do card
    total = autsAgora.reduce(function (sum, a) { return sum + (+a.valor || 0); }, 0);
    linhas = autsAgora.map(function (a) { return a.chave; });
    evAut = [];
  }
  var grupoSeg = an.pecas.filter(function (x) { return !vdf_pecaParticular_(x, card, an); }), grupoPart = an.pecas.filter(function (x) { return vdf_pecaParticular_(x, card, an); });
  var aguarda = [];
  if (grupoSeg.length && grupoPart.length) {
    if (!grupoSeg.some(temAut)) aguarda.push('peças da seguradora — diretoria');
    if (!grupoPart.some(temAut)) {
      var donos = grupoPart.map(function (x) { return x.partPor || criador; }).filter(function (u, i, a) { return u && a.indexOf(u) === i; });
      aguarda.push('peças particulares — ' + (donos.length ? donos.map(function (u) { return '@' + u; }).join(' ') : 'consultor'));
    }
  }
  var movido = '';
  try { ev_registrar_('AUTORIZAÇÃO', card, me.username, evAut, { detalhe: (fechar ? 'enviada (fecha as parciais)' : '') + (aguarda.length ? ' aguardando: ' + aguarda.join('; ') : '') }); } catch (e) {}
  if (!aguarda.length) { try { movido = vdf_moverPara_(card, ctx, VDF_LISTA_AUTORIZADO, token, me.username); } catch (e) {} }
  // "sem autorização" só conta as peças que ESTA pessoa podia autorizar
  var semAut = an.pecas.filter(function (x) { return vdf_podeAutorizarPeca_(me, card, an, x, criador) && !temAut(x); }).length;   // autorizada antes (ex.: complemento) não conta
  try {
    var compr = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).split(/[,;\s]+/).filter(function (u) { return u && u.toLowerCase() !== String(me.username).toLowerCase(); })[0];
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: (compr ? '@' + compr + ' ' : '') + '✅ **AUTORIZADO** — ' + me.fullName + ' · ' + linhas.length + ' peça(s) · ' + vd_valorBR_(total) + (movido ? ' → **' + movido + '**' : '') +
      (semAut ? '\n⛔ Sem autorização (não comprar): ' + semAut + ' peça(s)' : '') + (typeof txtM === 'string' ? txtM : '') + obsL.texto + (aguarda.length ? '\n⏳ Aguarda: ' + aguarda.join('; ') : '') } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: linhas.length, total: total, semAut: semAut, aguarda: aguarda, marcas: marcadas.length, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

// FormularioServidor.gs:1208
function vdf_linhasObs_(p, porChave, rotulo) {
  var linhas = [], txt = [];
  (p.obs || []).forEach(function (o) {
    var peca = porChave[o.chave], t = String(o.texto || '').replace(/\s*\n\s*/g, ' ').trim();
    if (!peca || !t) return;
    var nome = peca.pneu ? 'PNEU ' + String(peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(peca);
    linhas.push('OBS ' + nome + ': (' + rotulo + ') ' + t);
    txt.push('- ' + nome + ': ' + t);
  });
  var geral = String(p.geral || '').replace(/\s*\n\s*/g, ' ').trim();
  if (geral) { linhas.push('OBS GERAL: (' + rotulo + ') ' + geral); txt.unshift(geral); }
  return { linhas: linhas, n: linhas.length, texto: txt.length ? '\n📝 ' + txt.map(function (t) { return t.replace(/^- /, ''); }).join(' · ') : '' };
}

// FormularioServidor.gs:1227
function vdf_devolverCotacao(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var an = vd_analisar_(card.desc, card.name);
  if (!vdf_podeDevolver_(me, card, an)) return { ok: false, faltas: ['Só a diretoria pode devolver a cotação' + (an.pecas.some(function (x) { return x.particular; }) ? ' deste card (tem peças da seguradora junto com as particulares)' : '') + ' — sua conta: ' + me.username + '. Escreva a observação na peça e autorize só o que estiver certo.'] };
  // depois da compra não volta para cotação (anularia a autorização de peça já comprada)
  try {
    var cCk = vd_api_('/cards/' + card.id, { query: { fields: 'name', checklists: 'all', checkItem_fields: 'name' } });
    if (vdf_itensPagas_(cCk).length) return { ok: false, faltas: ['Este card já tem peça comprada — não volta para cotação. Para trocar uma peça, use "cotação autorizada indisponível" na aba Compra, ou inclua a peça nova pelo ✏️ EDITAR/INCLUIR PEÇA.'] };
  } catch (e) { return { ok: false, faltas: ['Não consegui conferir as compras do card agora. Tente de novo em alguns segundos.'] }; }
  var porChave = {};
  an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var obsL = vdf_linhasObs_(p, porChave, 'devolução');
  if (!obsL.n) return { ok: false, faltas: ['Escreva o motivo da devolução (geral ou em alguma peça) — é o que o comprador vai ler.'] };
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  var div = vd_dividir_(card.desc);
  var resto = div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR;
  vd_backup_(card, 'cotação devolvida pelo formulário por ' + me.username);
  vd_gravarDesc_(card.id, div.bloco.replace(/\s+$/, '') + '\n\n' + resto + '\n\n**DEVOLVIDA PARA COTAÇÃO ' + agora + ' - ' + me.fullName + '**\n' + obsL.linhas.join('\n'), token);
  try { ev_registrar_('DEVOLUÇÃO', card, me.username, null, { detalhe: [String(p.geral || '').trim()].concat((p.obs || []).map(function (o) { return o.texto; })).filter(String).join(' | ').slice(0, 500) }); } catch (e) {}
  var movido = '';
  try { movido = vdf_moverPara_(card, ctx, VD.LISTA_COTACAO, token, me.username); } catch (e) {}
  try {
    var compr = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).split(/[,;\s]+/).filter(function (u) { return u && u.toLowerCase() !== String(me.username).toLowerCase(); })[0];
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: (compr ? '@' + compr + ' ' : '') + '↩️ **COTAÇÃO DEVOLVIDA** — ' + me.fullName + (movido ? ' → **' + movido + '**' : '') + obsL.texto } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: obsL.n, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

// FormularioServidor.gs:1261
function vd_ultimaDevolucao_(desc) {
  var resto = vd_dividir_(desc).resto || '', dev = null;
  resto.split('\n').forEach(function (raw) {
    var l = vd_limpar_(raw).trim(), m;
    if ((m = l.match(/^DEVOLVIDA PARA COTA[ÇC][ÃA]O\s+(\S+(?:\s+\d{1,2}:\d{2})?)\s+-\s+(.+)$/i))) dev = { quando: m[1], quem: m[2].trim(), geral: '' };
    else if (dev && (m = l.match(/^OBS GERAL\s*:\s*(?:\(devolu[çc][ãa]o\)\s*)?(.+)$/i))) dev.geral = m[1].trim();
    else if (/^COTA[ÇC][ÃA]O\s+\d{1,2}\/\d{1,2}/i.test(l) || /^AUTORIZA[ÇC][ÃA]O\s+\d/i.test(l)) dev = null;
  });
  return dev;
}

// FormularioServidor.gs:1276
function vdf_marcarOrdemAutorizada(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) marca a ordem autorizada — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,idBoard,shortLink,shortUrl,labels' } });
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  if (card.idBoard !== board.id) return { ok: false, faltas: ['Este card não é do quadro do formulário.'] };
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (vdf_temOrdemAut_(card)) return { ok: true, ja: true, nome: card.name, url: card.shortUrl };
  var labels = vd_api_('/boards/' + vd_board_() + '/labels', { query: { fields: 'name', limit: 100 } });
  var etq = labels.filter(function (l) { return vd_semAcento_(String(l.name || '')).toUpperCase().indexOf(VDF_ETIQ_ORDEM) >= 0 && !/NAO/.test(vd_semAcento_(String(l.name || '')).toUpperCase()); })[0];
  if (!etq) return { ok: false, faltas: ['O quadro não tem a etiqueta ORDEM AUTORIZADA.'] };
  vd_api_('/cards/' + card.id + '/idLabels', { method: 'post', payload: { value: etq.id } }, token);
  (card.labels || []).forEach(function (l) {   // tira "ORDEM NAO AUTORIZADA", se tinha
    if (/ORDEM NAO AUTORIZADA/.test(vd_semAcento_(String(l.name || '')).toUpperCase())) { try { vd_api_('/cards/' + card.id + '/idLabels/' + l.id, { method: 'delete' }, token); } catch (e) {} }
  });
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🏷️ **ORDEM AUTORIZADA** marcada por ' + me.fullName + ' pelo formulário (conferido no Databox).' } }, token); } catch (e) {}
  return { ok: true, nome: card.name, url: card.shortUrl };
}

// FormularioServidor.gs:1300
function vdf_avisarSolicitante(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) faz este aviso — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,idBoard,shortLink,shortUrl,labels' } });
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  if (card.idBoard !== board.id) return { ok: false, faltas: ['Este card não é do quadro do formulário.'] };
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (vdf_temOrdemAut_(card)) return { ok: false, faltas: ['O card já tem a etiqueta ORDEM AUTORIZADA — pode registrar a compra.'] };
  var falta = [];
  if (p.naoAutorizada) falta.push('ordem de serviço **não autorizada** no Databox');
  if (p.naoImportado) falta.push('orçamento **não importado** no Databox');
  var obs = String(p.obs || '').trim().slice(0, 500);
  if (!falta.length && !obs) return { ok: false, faltas: ['Marque o que falta no Databox ou escreva uma observação.'] };
  var cache = CacheService.getScriptCache(), ch = 'avsol_' + card.shortLink;
  if (cache.get(ch)) return { ok: false, faltas: ['Este aviso já foi enviado há poucos minutos. Aguarde a resposta no card.'] };
  var quem = ''; try { quem = vd_criador_(card.id); } catch (e) {}
  var txt = (quem ? '@' + quem + ' ' : '') + '🏷️ **ORDEM AUTORIZADA PENDENTE** — ' + me.fullName + ' conferiu no Databox antes da compra:' +
    falta.map(function (f) { return '\n• ' + f; }).join('') +
    (obs ? '\n• Obs.: ' + obs : '') +
    '\nA compra fica parada até resolver. Depois de acertar no Databox, coloque a etiqueta **ORDEM AUTORIZADA** no card.';
  vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } }, token);
  cache.put(ch, '1', 600);
  return { ok: true, nome: card.name, url: card.shortUrl, quem: quem };
}

// FormularioServidor.gs:1330
function vdf_salvarCompra(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) registra compra — sua conta: ' + me.username + '.'] };
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro — não recebe cotação nem compra.'] };
  if (!vdf_temOrdemAut_(card)) return { ok: false, faltas: ['🏷️ FALTA A ETIQUETA ORDEM AUTORIZADA — confira no Databox se a ordem está autorizada e o orçamento importado. Se estiver tudo certo, coloque a etiqueta no card e envie de novo; se não, avise o solicitante no card.'] };
  var an = vd_analisar_(card.desc, card.name);
  var porChave = {};
  an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var cotLidas = vd_cotacoesDaDescricao_(card.desc, an.pecas), lidas = cotLidas.cotacoes;
  var naoCotadas = (cotLidas.semCot || []).map(function (x) { return x.chave; });   // justificadas: não ficam esperando compra
  var faltas = [], compras = [];
  /* 07/10/2026 (Weslley): "Salvar parcial" registra o que já comprou e o card fica em AUTORIZADO COMPRA;
   * "Enviar compra" exige toda peça autorizada comprada (pode vir sem compra nova, só para fechar) */
  var parcial = !!p.parcial;
  (p.compras || []).forEach(function (c, i) {
    var peca = porChave[c.chave];
    var rot = 'compra ' + (i + 1) + (peca ? ' (' + vd_nomePeca_(peca) + ')' : '');
    if (!peca) { faltas.push(rot + ': peça não encontrada no pedido'); return; }
    var forn = String(c.fornecedor || '').trim().toUpperCase();
    var valor = vd_valorNum_(c.valor);
    // só cotação que está no card
    var qc = lidas.filter(function (q) { return q.chave === c.chave && q.fornecedor === forn && Math.abs(q.valor - valor) < 0.005; })[0];
    var ok = !!qc;
    // prazo diferente do cotado = previsão mudada na compra: exige motivo (vai para o card como fora da autorização)
    if (qc && String(qc.dias == null ? '' : qc.dias) !== '' && String(c.dias == null ? '' : c.dias).trim() !== '' && +c.dias !== +qc.dias && !String(c.just || '').trim())
      { faltas.push(rot + ': prazo ' + c.dias + ' d.u. diferente do cotado (' + qc.dias + ' d.u.) — escreva o motivo.'); return; }
    if (!ok) { faltas.push(rot + ': escolha uma cotação lançada no card (' + forn + ' ' + vd_valorBR_(valor) + ' não está na descrição)'); return; }
    compras.push({ chave: c.chave, codigo: peca.pneu ? '' : peca.codigo, descricao: peca.pneu ? vd_nomePeca_(peca) : peca.descricao, fornecedor: forn, valor: valor, dias: String(c.dias == null ? '' : c.dias).trim(), particular: vdf_pecaParticular_(peca, card, an) && !vdf_ehParticular_(card, an), complemento: !!peca.complemento, just: String(c.just || '').replace(/\s*\n\s*/g, ' ').trim() });
  });
  if (!compras.length && !faltas.length && parcial) faltas.push('Escolha o fornecedor de pelo menos uma peça para salvar.');
  if (faltas.length) return { ok: false, faltas: faltas };

  // fora da autorização: não bloqueia, mas exige justificativa por peça e fica registrado no card
  var auts = vd_autorizacoesDaDescricao_(card.desc, an.pecas), foraAut = [], semJust = [];
  // o que ainda falta comprar DEPOIS desta gravação (peça autorizada — ou qualquer peça, se o card não tem autorização — sem PAGAS)
  var pendentesDepois = [];
  try {
    var lsA = vd_api_('/cards/' + card.id, { query: { fields: 'id', checklists: 'all', checkItem_fields: 'name' } }).checklists || [];
    var nomesA = [];
    lsA.filter(function (k) { return /^PAGAS/i.test((k.name || '').trim()); }).forEach(function (k) { (k.checkItems || []).forEach(function (i) { nomesA.push(vd_semAcento_(i.name)); }); });
    var autChA = auts.map(function (a) { return a.chave; }), novasCh = compras.map(function (c) { return c.chave; });
    an.pecas.forEach(function (x) {
      var k = vd_chavePeca_(x);
      if (naoCotadas.indexOf(k) >= 0 || novasCh.indexOf(k) >= 0) return;
      if (autChA.length && autChA.indexOf(k) < 0) return;
      if (!nomesA.some(function (nm) { return vd_casaItem_(nm, k); })) pendentesDepois.push(vd_nomePeca_(x));
    });
  } catch (e) {}
  if (!parcial && pendentesDepois.length) return { ok: false, faltas: ['Ainda falta comprar ' + pendentesDepois.length + ' peça(s): ' + pendentesDepois.join('; ') + '. Para guardar o que já tem, use **💾 Salvar parcial**.'] };
  if (!compras.length && !parcial) {
    // nada novo e nada pendente: só fecha (move) o que foi salvo parcialmente
    var movF = ''; try { movF = vdf_moverPara_(card, ctx, VDF_LISTA_CHEGAR, token, me.username); } catch (e) {}
    try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🛒 **COMPRA ENVIADA** — ' + me.fullName + ' · todas as peças já estavam registradas' + (movF ? ' → **' + movF + '**' : '') } }, token); } catch (e) {}
    try { vd_marcar_(card); } catch (e) {}
    return { ok: true, url: card.shortUrl, nome: card.name, pagas: 0, pendentes: 0, foraAut: [], lista: movF || vdf_nomeLista_(ctx, card.idList) };
  }
  compras.forEach(function (c) {
    var ch = c.chave, nome = vd_nomePeca_(porChave[ch]);
    var a = auts.filter(function (x) { return x.chave === ch; })[0];
    var txt = '';
    if (!a) txt = nome + ' (sem autorização)';
    else if (a.fornecedor !== c.fornecedor || Math.abs(a.valor - c.valor) >= 0.005) txt = nome + ' (aut. ' + a.fornecedor + ' ' + vd_valorBR_(a.valor) + ' → ' + c.fornecedor + ' ' + vd_valorBR_(c.valor) + ')';
    else {
      var qd = lidas.filter(function (q) { return q.chave === ch && q.fornecedor === c.fornecedor && Math.abs(q.valor - c.valor) < 0.005; })[0];
      if (qd && String(qd.dias == null ? '' : qd.dias) !== '' && c.dias !== '' && +c.dias !== +qd.dias) txt = nome + ' (prazo ' + qd.dias + ' → ' + c.dias + ' d.u.)';
    }
    if (!txt) return;
    if (!c.just) semJust.push(nome);
    foraAut.push(txt + (c.just ? ' — ' + c.just : ''));
  });
  if (semJust.length) return { ok: false, faltas: semJust.map(function (n) { return n + ': compra fora da autorização — escreva o motivo.'; }) };

  var n = vd_checklistPagas_(card.id, compras, token);
  try {
    ev_registrar_('COMPRA', card, me.username, compras.map(function (c) {
      var e = ev_peca_(porChave[c.chave]); e.fornecedor = c.fornecedor; e.valor = c.valor; e.dias = c.dias;
      e.previsao = c.dias !== '' ? vd_dataMaisDias_(c.dias) : '';
      var fa = foraAut.filter(function (f) { return f.indexOf(vd_nomePeca_(porChave[c.chave])) === 0; })[0];
      e.detalhe = fa ? 'FORA DA AUTORIZAÇÃO: ' + fa : '';
      return e;
    }));
  } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) { console.log('vitrine/compra: ' + e); }   // mostra 🛒 na descrição

  // tudo comprado? -> FALTA CHEGAR
  var movido = '', pendentes = 0;
  try {
    var ls = vd_api_('/cards/' + card.id, { query: { fields: 'id', checklists: 'all', checkItem_fields: 'name' } }).checklists || [];
    var nomes = [];
    ls.filter(function (k) { return /^PAGAS/i.test((k.name || '').trim()); }).forEach(function (k) { (k.checkItems || []).forEach(function (i) { nomes.push(vd_semAcento_(i.name)); }); });
    // pendente = peça autorizada (ou, sem nenhuma autorização no card, qualquer peça) ainda sem PAGAS;
    // peça não autorizada não prende o card em AUTORIZADO COMPRA
    var autCh = auts.map(function (a) { return a.chave; });
    an.pecas.forEach(function (x) {
      var k = vd_chavePeca_(x);
      if (naoCotadas.indexOf(k) >= 0) return;
      if (autCh.length && autCh.indexOf(k) < 0) return;
      if (!nomes.some(function (nm) { return vd_casaItem_(nm, k); })) pendentes++;
    });
    if (!pendentes && !parcial) movido = vdf_moverPara_(card, ctx, VDF_LISTA_CHEGAR, token, me.username);
  } catch (e) {}
  try {
    var dirs = foraAut.length ? sla_users_('SLA_AUTORIZAR', 'timweslley,comercialunity').filter(function (u) { return u !== me.username; }) : [];
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: dirs.map(function (u) { return '@' + u + ' '; }).join('') +
      (parcial ? '💾 **COMPRA PARCIAL salva** — ' : '🛒 **COMPRA** — ') + me.fullName + ' · ' + n + ' item(ns)' + (movido ? ' → **' + movido + '**' : '') +
      (pendentes ? '\n⏳ Falta comprar: ' + pendentes + ' peça(s)' : '') + (parcial && !pendentes ? '\nTudo comprado — envie a compra para o card seguir.' : '') +
      (foraAut.length ? '\n⚠️ **FORA DA AUTORIZAÇÃO:**\n' + foraAut.map(function (f) { return '- ' + f; }).join('\n') : '') } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, parcial: parcial, url: card.shortUrl, nome: card.name, pagas: n, pendentes: pendentes, foraAut: foraAut, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

// FormularioServidor.gs:1447
function vd_pecasSemCotacao_(card) {
  var desc = card.desc || '', an = vd_analisar_(desc, card.name || '');
  var cot = { cotacoes: [], semCot: [] }, auts = [], compras = [];
  try { cot = vd_cotacoesDaDescricao_(desc, an.pecas); } catch (e) {}
  try { auts = vd_autorizacoesDaDescricao_(desc, an.pecas); } catch (e) {}
  try { compras = vd_comprasDaDescricao_(desc); } catch (e) {}
  return (an.pecas || []).filter(function (p) {
    var k = vd_chavePeca_(p);
    if ((cot.cotacoes || []).some(function (q) { return q.chave === k; })) return false;
    if ((cot.semCot || []).some(function (q) { return q.chave === k; })) return false;
    if (auts.some(function (q) { return q.chave === k; })) return false;
    if (compras.some(function (c) { var ck = vd_semAcento_((c.codigo || '').replace(/\s+/g, '') || c.descricao); return ck && (ck === k || (p.codigo && vd_semAcento_(c.codigo) === vd_semAcento_(p.codigo))); })) return false;
    return true;
  }).map(vd_nomePeca_);
}

// FormularioServidor.gs:1463
function vd_comprasDaDescricao_(desc) {
  var out = [];
  vd_limpar_(desc).split('\n').forEach(function (l) {
    l = l.replace(/\s*_?\([^()]*\)_?\s*$/, '');   // tira a nota "(quem, quando)" do fim
    var m = l.match(/^\s*COMPRAD[OA]\s*:\s*(.+?)\s+-\s+(.+?)(?:\s+-\s+R?\$?\s*([\d.]+,?\d*))?(?:\s+-\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?))?\s*$/i);
    if (!m) return;
    var peca = m[2].trim();
    var mc = peca.match(/^([A-Z0-9][A-Z0-9\/.\-]{3,})\s+(.+)$/i);
    if (mc && !/\d/.test(mc[1])) mc = null;   // código tem de ter número
    out.push({ fornecedor: m[1].trim(), codigo: mc ? mc[1] : '', descricao: mc ? mc[2] : peca, valor: m[3] || '', previsao: m[4] || '' });
  });
  return out;
}

// FormularioServidor.gs:1485
function vdf_salvar(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var cardCampos = false;
  var ctx = vd_contexto_();
  var d = {
    modelo: String(p.dados.modelo || '').trim().toUpperCase(),
    ano: String(p.dados.ano || '').trim(),
    motor: String(p.dados.motor || '').trim().toUpperCase(),
    chassi: vd_normChassi_(p.dados.chassi),
    placa: vd_normPlaca_(p.dados.placa)
  };
  var pecas = (p.pecas || []).map(function (x) {
    return x.pneu
      ? { pneu: true, medida: String(x.medida || '').trim().toUpperCase().replace(/\s+/g, ''), categoria: x.categoria || '', marca: String(x.marca || '').trim().toUpperCase(), qtd: x.qtd || '' }
      : { pneu: false, codigo: String(x.codigo || '').trim().toUpperCase(), descricao: String(x.descricao || '').trim().toUpperCase(), tipos: (x.tipos || []).slice(0, 3), qtd: x.qtd || '' };
  });
  var n = p.novo || {};
  // peça de orçamento complementar (só peça da seguradora): marca "COMPLEMENTO dd/mm"
  (p.pecas || []).forEach(function (x, i) {
    if (x.complemento && !x.particular) { pecas[i].complemento = true; pecas[i].compData = String(x.compData || '').match(/^\d{1,2}\/\d{1,2}$/) ? x.compData : cp_hoje_(); }
    // "não comprar" (05/10/2026): peça do orçamento que a oficina não vai comprar — fica só de registro no card
    // 🚫 não comprar e ➕ complemento não convivem: marcar complemento é pedir a compra (QPG1B84, 06/10/2026)
    if (x.naoComprar && !(x.complemento && !x.particular)) { pecas[i].naoComprar = true; pecas[i].naoMotivo = String(x.naoMotivo || '').replace(/\s*\n\s*/g, ' ').trim().slice(0, 80); }
    // valor líquido da peça no orçamento (lido do PDF ou digitado): informativo, livre para editar, não trava (05/10/2026)
    pecas[i].valorOrc = vd_valorOrcTxt_(x.valorOrc);
    // observação do consultor sobre a peça (06/10/2026): vai na linha da peça ("| OBS: …") e aparece para o comprador
    pecas[i].obs = String(x.obs || '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '/').trim().slice(0, 120);
  });
  // peça particular dentro do pedido de seguradora: guarda quem lançou (é quem autoriza)
  if (vd_tipoNormPedido_(n.tipo) !== 'PARTICULAR') {
    (p.pecas || []).forEach(function (x, i) {
      if (!x.particular) return;
      pecas[i].particular = true;
      // quem lançou a peça particular é quem autoriza: fora da diretoria, sempre a própria pessoa
      pecas[i].partPor = String((vdf_ehAutorizador_(me) && x.partPor) || me.username || '').toLowerCase().replace(/[^\w.\-]/g, '');
    });
    // na descrição: primeiro as peças da seguradora, depois as particulares
    pecas = pecas.filter(function (x) { return !x.particular; }).concat(pecas.filter(function (x) { return x.particular; }));
  }
  var orc = p.orcamento || null;
  var fo = orc && orc.fo ? orc.fo : [];
  var tipo = vd_tipoNormPedido_(n.tipo) || 'SEGURADORA';
  var particular = tipo === 'PARTICULAR';
  var extra = {
    tipo: tipo,
    cor: String(n.cor || '').trim().toUpperCase(),
    seguradora: particular ? 'PARTICULAR' : String(n.seguradora || '').trim().toUpperCase(),
    sinistro: String(n.sinistro || '').trim(),
    fo: fo,
    origemOrc: orc && orc.origem ? orc.origem : ''
  };
  if (!extra.origemOrc && p.shortLink) {
    try {
      var cAnt = vd_api_('/cards/' + p.shortLink, { query: { fields: 'desc' } });
      var mOrc = vd_limpar_(cAnt.desc || '').match(/OR[ÇC]AMENTO IMPORTADO \(([^)]*)\)/i);
      if (mOrc) extra.origemOrc = mOrc[1];
    } catch (e) {}
  }
  var obs = String(p.obs || '').replace(/\s*\n\s*/g, ' ').trim();
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');

  // card existente: descobre coluna e peças que já existiam
  var card = null, lista = '', posCot = false, baseSigs = null, baseTodas = null;
  if (p.shortLink) {
    card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard' } });
    if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro — não pode ser usado como pedido. Clique em "Fazer pedido novo em vez disso".'] };
    lista = vd_api_('/lists/' + card.idList, { query: { fields: 'name' } }).name;
    posCot = vdf_ehPosCotacao_(lista);
    // peça já autorizada ou comprada: não muda nem sai do pedido (só a diretoria)
    if (!vdf_ehAutorizador_(me)) {
      try {
        var cTr = vd_api_('/cards/' + card.id, { query: { fields: 'name', checklists: 'all', checkItem_fields: 'name' } });
        var anTr = vd_analisar_(card.desc, card.name), autsTr = vd_autorizacoesDaDescricao_(card.desc, anTr.pecas);
        var novasSig = pecas.map(function (x) { return vdf_sigTrava_(x); });
        var travaErr = [];
        anTr.pecas.forEach(function (x) {
          var tr = vdf_travaPeca_(x, autsTr, cTr);
          if (tr && novasSig.indexOf(vdf_sigTrava_(x)) < 0) travaErr.push(vd_nomePeca_(x) + ': peça ' + tr.toLowerCase() + ' — não pode ser alterada nem removida (só a diretoria).');
        });
        if (travaErr.length) return { ok: false, faltas: travaErr };
      } catch (e) { console.log('trava de peça: ' + e); return { ok: false, faltas: ['Não consegui conferir as peças travadas agora (Trello lento). Envie de novo em alguns segundos.'] }; }
    }
    // fora da diretoria: não muda o tipo do pedido nem passa peça de seguradora para particular (e vice-versa)
    if (!vdf_ehAutorizador_(me)) {
      var anOr = vd_analisar_(card.desc, card.name), cardOr = { name: card.name, labels: [] };
      var eraPart = vdf_ehParticular_(cardOr, anOr);
      var tNovo = vd_tipoNormPedido_(n.tipo);
      if (anOr.pecas.length && tNovo && eraPart !== (tNovo === 'PARTICULAR'))
        return { ok: false, faltas: ['Só a diretoria muda o tipo do pedido (seguradora / particular).'] };
      var orPor = {};
      anOr.pecas.forEach(function (x) { orPor[vd_chavePeca_(x)] = x; });
      var trocou = [];
      pecas.forEach(function (x) {
        var o = orPor[vd_chavePeca_(x)];
        if (!o) return;
        if (!!o.particular !== !!x.particular) trocou.push(vd_nomePeca_(x));
        if (o.partPor) x.partPor = o.partPor;
      });
      if (trocou.length) return { ok: false, faltas: trocou.map(function (t) { return t + ': só a diretoria passa a peça entre seguradora e particular.'; }) };
    }
    if (posCot) baseSigs = vd_analisar_(card.desc, card.name).pecas.map(function (x) { return x.sig; });
    if (posCot) baseTodas = vd_linhasConsultor_(vd_dividir_(card.desc).bloco).map(vd_sigItem_);
    // orçamento novo trocou o código de peça que já existia (05/10/2026): não é peça nova — a base acompanha o código novo
    var trocas = ((p.complemento && p.complemento.atualizar) || []).filter(function (u) { return u && u.codigo && u.codigoAntigo; });
    if (posCot && trocas.length) {
      var troca = function (sig) { trocas.forEach(function (u) { sig = sig.replace(new RegExp('(^|[^A-Z0-9])' + vd_semAcento_(u.codigoAntigo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Z0-9])'), '$1' + vd_semAcento_(u.codigo)); }); return sig; };
      baseSigs = baseSigs.map(troca); baseTodas = baseTodas.map(troca);
    }
  }

  var comp = card && p.complemento ? p.complemento : null;
  var compFo = comp ? (comp.fo || []) : [];
  // card que já tem FORNECIMENTO no checklist pode ficar sem peça da oficina (só FO -> robô leva a FALTA CHEGAR)
  var temFoNoCard = false;
  if (card && !pecas.length && !fo.length && !compFo.length) {
    try { temFoNoCard = /^FORNECIMENTO/i.test(vd_limpar_(vd_dividir_(card.desc).bloco).split('\n').filter(function (l) { return /^FORNECIMENTO\b/i.test(l.trim()); }).join('\n')); } catch (e) {}
  }
  if (!pecas.length && !fo.length && !compFo.length && !temFoNoCard) return { ok: false, faltas: ['Adicione pelo menos uma peça (ou importe um orçamento com peças da seguradora). Se a peça não vai ser comprada, marque 🚫 Não comprar em vez de remover.'] };
  var temOrcNoCard = !!(card && vd_analisar_(card.desc, card.name).doOrcamento);
  var soAcrescentaParticular = !!card && (p.pecas || []).some(function (x) { return x.particular; });
  if (!particular && !posCot && !(orc && orc.origem) && !temOrcNoCard && !soAcrescentaParticular && !comp) {
    return { ok: false, faltas: ['Pedido de seguradora: anexe o orçamento autorizado (PDF do Cilia, HDI ou Websoma) na seção Documento — o formulário importa as peças dele. Se for cliente particular, marque "Particular" no tipo do pedido.'] };
  }
  // card existente: mantém as linhas de FORNECIMENTO que já estavam no bloco
  if (card) extra.foLinhas = vd_dividir_(card.desc).bloco.split('\n').filter(function (l) { return /^FORNECIMENTO\b/i.test(vd_limpar_(l).trim()); });
  // orçamento complementar: peças novas da seguradora -> checklist FORNECIMENTO COMPLEMENTO (antes de montar o bloco, para a contagem)
  var nFoComp = 0;
  if (compFo.length) {
    try {
      nFoComp = vdf_checklistFornecimento_(card.id, compFo, token, CP.FO);
      var totFoC = cp_contarChecklist_(card.id, CP.FO, token);
      extra.foLinhas = (extra.foLinhas || []).filter(function (l) { return !/^FORNECIMENTO COMPLEMENTO/i.test(vd_limpar_(l).trim()); });
      if (totFoC) extra.foLinhas.push(cp_linhaFo_(totFoC));
    } catch (e) { console.log('FO complemento: ' + e); }
  }
  var bloco = vd_montarBloco_(d, pecas, obs, 'Pedido enviado por ' + me.fullName + ' pelo formulário em ' + agora, extra);
  var an = vd_analisar_(bloco, d.placa, posCot ? { base: baseSigs, tipo: tipo } : { tipo: tipo });
  var faltas = an.faltas.slice();
  if (!String(n.carro || '').trim()) faltas.unshift('carro (nome curto para o título)');
  // ROTINA (diretoria): card aberto a partir do Cilia/portal pela Rotina Unity. Peça sem tipo/código é aceita;
  // com peça da oficina o card nasce em FALTA DADOS PARA COTAR para o consultor completar; só FO -> o robô leva a FALTA CHEGAR.
  var rotina = !!p.rotina && vdf_ehAutorizador_(me) && !p.shortLink;
  var faltasRotina = [];
  if (rotina) { faltasRotina = faltas.filter(function (f) { return /falta o tipo de pe|falta o c[óo]digo|fora do padr/i.test(f); }); faltas = faltas.filter(function (f) { return faltasRotina.indexOf(f) < 0; }); }
  if (faltas.length) return { ok: false, faltas: faltas };

  var titulo = String(n.carro || '').trim() ? vd_titulo_(d.placa, n.carro, extra.cor, extra.seguradora) : '';
  var novasPecas = posCot ? an.novas : [];
  /* 07/10/2026 (Weslley): peça alterada em card que já andou — quem editou respondeu que a mudança NÃO exige nova cotação
   * (acerto de texto, código atualizado…): não é peça nova, o card fica onde está e as cotações/autorizações seguem o
   * código novo. p.manterCotacao = [{codigoAntigo, codigo, descricaoAntiga, descricao}] (valores novos da peça). */
  var manter = posCot ? (p.manterCotacao || []).filter(function (m) { return m && (m.codigo || m.descricao); }) : [];
  var mantidas = [];
  if (manter.length) {
    var bateM = function (nv, m) { var kc = cp_norm_(m.codigo), kn = cp_norm_(nv.codigo); return kc.length >= 4 ? kc === kn : (!kn && cp_norm_(m.descricao) === cp_norm_(nv.descricao)); };
    novasPecas = novasPecas.filter(function (nv) { var m = manter.filter(function (x) { return bateM(nv, x); })[0]; if (m) { mantidas.push({ peca: nv, m: m }); return false; } return true; });
    an.novas = novasPecas;
    var trocasM = mantidas.filter(function (x) { return x.m.codigoAntigo && x.peca.codigo && cp_norm_(x.m.codigoAntigo) !== cp_norm_(x.peca.codigo); }).map(function (x) { return { codigoAntigo: x.m.codigoAntigo, codigo: x.peca.codigo }; });
    if (trocasM.length) trocas = (typeof trocas !== 'undefined' && trocas ? trocas : []).concat(trocasM);
  }
  // card NOVO com placa que já tem card aberto no quadro: só cria com confirmação explícita (criarMesmoAssim)
  if (!p.shortLink && !p.criarMesmoAssim) {
    var jaTem = [];
    try { jaTem = vdf_buscarPlaca(token, d.placa, d.chassi); } catch (e) { jaTem = []; }
    if (jaTem.length) return { ok: false, duplicado: jaTem, placa: d.placa, faltas: ['Já existe card aberto com esta placa/chassi: ' + jaTem.map(function (c) { return c.nome + ' (' + c.lista + (c.porChassi ? ', mesmo chassi' : '') + ')'; }).join('; ') + '. Atualize esse card ou confirme que quer criar outro.'] };
  }

  if (card) {
    var div = vd_dividir_(card.desc);
    var resto = div.temMarcador ? div.resto
      : VD.MARCADOR + (String(card.desc || '').trim() ? '\n_(texto que estava no card antes do formulário)_\n' + card.desc : '');
    if (typeof trocas !== 'undefined' && trocas.length) { try { resto = cp_trocarCodigos_(resto, trocas); } catch (e) {} }   // cotações/autorizações seguem o código novo
    // peça sem código mantida com descrição nova: as linhas de cotação/autorização seguem a descrição nova
    mantidas.forEach(function (x) { if (!x.peca.codigo && x.m.descricaoAntiga && x.m.descricao) resto = resto.split(String(x.m.descricaoAntiga).toUpperCase()).join(String(x.m.descricao).toUpperCase()); });
    vd_backup_(card, 'editado pelo formulário por ' + me.username);
    var upd = { desc: bloco + '\n\n' + resto };
    if (titulo && titulo !== card.name) upd.name = titulo;
    vd_gravarDesc_(card.id, upd.desc, token, upd.name ? { name: upd.name } : null);
    if (upd.name) card.name = upd.name;
  } else {
    var corpo = { idList: ctx.listas[rotina && pecas.length ? VD.LISTA_FALTA : VD.LISTA_COTACAO] || ctx.listas[VD.LISTA_COTACAO], name: titulo, desc: bloco + '\n\n' + VD.MARCADOR, pos: 'top' };
    card = vd_api_('/cards', { method: 'post', payload: corpo }, token);
    vd_fixarTopo_(corpo.idList, token);   // card fixo "NOVO PEDIDO" continua em primeiro (07/10/2026)
    if (rotina) {
      try {
        var avisoR = String(p.aviso || '').trim();
        vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🤖 **Card aberto pela Rotina Unity** a partir de ' + (extra.origemOrc || 'portal/Cilia') + ' — a equipe ainda não tinha feito o pedido.' +
          (pecas.length ? '\nPeças da oficina sem tipo/código: complete pelo ✏️ **EDITAR/INCLUIR PEÇA** — o card sai de FALTA DADOS sozinho.' : '\nSó fornecimento da seguradora: ver checklist FORNECIMENTO.') +
          (faltasRotina.length ? '\n' + faltasRotina.slice(0, 8).map(function (f) { return '- ' + f; }).join('\n') : '') + (avisoR ? '\n' + avisoR : '') } }, token);
      } catch (e) {}
    }
    try { vd_gravarDesc_(card.id, corpo.desc, token); } catch (e) { try { tr_guardar_(card.id, corpo.desc); } catch (e2) {} }
    try {
      vd_api_('/cards/' + card.id + '/attachments', { method: 'post', payload: { url: ctx.urlForm + '?card=' + card.shortLink, name: VD_LINK.EDITAR, setCover: false } }, token);
    } catch (e) {}
  }
  // nº da ordem (Databox) e unidade: campo personalizado + etiqueta, no pedido novo e na edição
  try { if (vdf_gravarOrdem_(card.id, p.dados.ordem)) cardCampos = true; } catch (e) { console.log('ordem: ' + e); }
  try { if (vdf_gravarUnidade_(card, n.unidade)) cardCampos = true; } catch (e) { console.log('unidade: ' + e); }
  if (cardCampos) { try { cf_sincronizar_(card.id); } catch (e) {} }
  vdf_linkComprador_(card, ctx, token);

  var nFo = 0;
  try { nFo = vdf_checklistFornecimento_(card.id, fo, token); } catch (e) {}
  var nPagas = 0;
  // compra só pela aba Compra (vdf_salvarCompra: permissão, etiqueta, autorização); o pedido não grava compra
  var compras = [];
  if (compras.length) {
    try { nPagas = vd_checklistPagas_(card.id, compras, token); } catch (e) {}
    // registra a compra na descrição, abaixo da linha de cotação
    try {
      var cAtual = vd_api_('/cards/' + card.id, { query: { fields: 'desc' } });
      var dv = vd_dividir_(cAtual.desc);
      var linhas = compras.map(function (c) {
        return 'COMPRADO: ' + String(c.fornecedor).trim().toUpperCase() + ' - ' + (c.codigo ? String(c.codigo).replace(/\s+/g, '').toUpperCase() + ' ' : '') + String(c.descricao || '').trim().toUpperCase() +
          (c.valor ? ' - R$ ' + String(c.valor).trim() : '') + (c.previsao ? ' - ' + vd_dataCurta_(c.previsao) : '') + ' _(' + me.username + ' ' + agora + ')_';
      }).filter(function (l) { return (cAtual.desc || '').indexOf(l.split(' _(')[0]) < 0; });
      if (linhas.length) {
        var lr = String(dv.resto || VD.MARCADOR).split('\n');
        lr.splice(1, 0, linhas.join('\n'));
        vd_gravarDesc_(card.id, dv.bloco + '\n\n' + lr.join('\n'), token);
      }
    } catch (e) {}
  }

  var anexados = 0, capaOk = false, repetidos = [], idsSubidos = [];
  // anexos que já estão no card (mesmo nome e tamanho) não sobem de novo
  var jaNoCard = [];
  if (p.shortLink && (p.fileIds || []).length) {
    try { jaNoCard = vd_api_('/cards/' + card.id + '/attachments', { query: { fields: 'name,fileName,bytes,date,isUpload' } }, token); } catch (e) {}
  }
  // o que o formulário sabe de cada arquivo (tipo: 'orc' | 'orc+' | 'capa' | ''; origem: Cilia/HDI/Websoma) — nome padronizado (05/10/2026)
  var infoArq = {};
  (p.arquivos || []).forEach(function (x) { if (x && x.fileId) infoArq[x.fileId] = x; });
  (p.fileIds || []).forEach(function (fid) {
    try {
      var f = vdf_arquivoTemp_(fid);
      var ehCapa = p.capaId && fid === p.capaId;
      // o nome do anexo no Trello pode ter sido padronizado: compara pelo nome ORIGINAL do arquivo (fileName) e tamanho
      if (!ehCapa && jaNoCard.some(function (a) { return (a.fileName || a.name) === f.getName() && +a.bytes === f.getSize(); })) {
        repetidos.push(f.getName()); f.setTrashed(true); return;
      }
      var mp = { file: f.getBlob(), name: f.getName() };
      if (ehCapa) mp.setCover = 'true';
      var at = vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: mp }, token);
      if (at && at.id) idsSubidos.push(at.id);
      if (ehCapa && at && at.id) { try { vd_api_('/cards/' + card.id, { method: 'put', payload: { idAttachmentCover: at.id } }, token); capaOk = true; } catch (e2) {} }
      if (at && at.id) {
        try {
          var inf = infoArq[fid] || {}, ehImg = /^image\//i.test(f.getMimeType() || '') || /\.(jpe?g|png|webp|gif)$/i.test(f.getName());
          var nomeAx = ehCapa ? ax_nome_(AX.FOTO, d.placa, ['capa'])
            : inf.tipo === 'orc' || inf.tipo === 'orc+' ? ax_nome_(inf.tipo === 'orc+' ? AX.ORC_MAIS : AX.ORC, d.placa, [extra.seguradora !== 'PARTICULAR' ? extra.seguradora : '', ax_origem_(inf.origem || extra.origemOrc)])
            : ehImg ? ax_nome_(AX.FOTO, d.placa, []) : '';
          if (nomeAx) { at.name = ax_batizar_(card.id, at.id, nomeAx, jaNoCard, token, { semVersao: ehCapa || ehImg }); jaNoCard.push({ id: at.id, name: at.name, date: new Date().toISOString() }); }
        } catch (e3) { console.log('nome do anexo: ' + e3); }
      }
      f.setTrashed(true);
      anexados++;
    } catch (e) {}
  });

  // orçamento complementar: o robô não precisa ler de novo o PDF que subiu agora; comentário no card
  var compOf = pecas.filter(function (x) { return x.complemento && x.compData === cp_hoje_() && (!posCot || an.novas.some(function (nv) { return vd_chavePeca_(nv) === vd_chavePeca_(x); })); });
  if (comp) {
    try { cp_marcarVistos_(idsSubidos); } catch (e) {}
    // peça que passou de FO para oficina (06/10/2026): sai do checklist FORNECIMENTO (a linha da oficina já está no bloco)
    var paraOf = (comp.paraOficina || []).filter(function (x) { return x && x.itemId; });
    paraOf.forEach(function (x) { try { vd_api_('/cards/' + card.id + '/checkItem/' + x.itemId, { method: 'delete' }, token); } catch (e) { console.log('FO→oficina: ' + e); } });
    if (compOf.length || nFoComp || (comp.pareadas || []).length || paraOf.length) {
      try {
        vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: cp_textoComentario_(me.fullName, comp.origem || '', '', compOf, compFo.slice(0, nFoComp ? compFo.length : 0), 0, '', comp.pareadas || [], [], paraOf.map(function (x) { return { item: { name: x.nome || '', lista: x.lista || '' }, peca: { descricao: x.peca || '' } }; })) } }, token);
      } catch (e) {}
      try { ev_registrar_('COMPLEMENTO', card, me.username, compOf.map(ev_peca_).concat(compFo.map(function (x) { var e = ev_peca_(x); e.fornecedor = 'SEGURADORA (FO)'; return e; })), { detalhe: compOf.length + ' oficina · ' + nFoComp + ' FO · ' + (comp.origem || '') }); } catch (e) {}
    }
  } else if (card && pecas.some(function (x) { return x.complemento; })) {
    // marcado à mão no formulário (sem PDF): só as peças que NÃO eram complemento antes
    try {
      var eramComp = {};
      vd_analisar_(card.desc, card.name).pecas.forEach(function (x) { if (x.complemento) eramComp[vd_chavePeca_(x)] = 1; });
      var novasComp = pecas.filter(function (x) { return x.complemento && !eramComp[vd_chavePeca_(x)]; });
      if (novasComp.length) {
        vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '➕ **COMPLEMENTO** marcado por ' + me.fullName + ' — fora do orçamento autorizado, vai no orçamento complementar da seguradora: ' + novasComp.map(cp_nome_).join('; ') + '\n_(na compra entra em PAGAS COMPLEMENTO)_' } }, token);
        ev_registrar_('COMPLEMENTO', card, me.username, novasComp.map(ev_peca_), { detalhe: novasComp.length + ' oficina · marcado à mão' });
      }
    } catch (e) { console.log('complemento à mão: ' + e); }
  }

  // confere na hora
  var acao = '';
  try {
    var c2 = vd_api_('/cards/' + card.id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,dateLastActivity,labels', attachments: 'true', attachment_fields: 'name,fileName,mimeType,isUpload,bytes,url,date' } });
    var props = PropertiesService.getScriptProperties();
    if (posCot) {
      if (novasPecas.length) {
        // peça nova em card que já andou: devolve para EM COTAÇÃO
        vd_pkSet_(card.id, baseTodas);
        acao = vd_conferirPosCotacao_(c2, ctx).acao;
      } else {
        vd_pkSet_(card.id, vd_linhasConsultor_(an.div.bloco).map(vd_sigItem_));
        acao = 'card continua em ' + lista;
        if (mantidas.length) {
          try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '✏️ **Peça alterada sem nova cotação** — ' + me.fullName + ' respondeu que a mudança não exige cotar de novo: ' + mantidas.map(function (x) { return vd_nomePeca_(x.peca) + (x.m.codigoAntigo && cp_norm_(x.m.codigoAntigo) !== cp_norm_(x.peca.codigo) ? ' (era ' + x.m.codigoAntigo + ')' : (x.m.descricaoAntiga && x.m.descricaoAntiga !== x.peca.descricao ? ' (era ' + x.m.descricaoAntiga + ')' : '')); }).join('; ') + '. O card continua em **' + lista + '**.' } }, token); } catch (e) {}
          try { ev_registrar_('PEDIDO EDITADO', card, me.username, mantidas.map(function (x) { return ev_peca_(x.peca); }), { detalhe: 'alterada sem nova cotação' }); } catch (e) {}
        }
        // peça removida / FO complementar: a coluna pode ter mudado (tudo comprado, ou card encerrado reaberto)
        try { var mvS = rc_reavaliarColuna_(card.id, token, me.username); if (mvS) acao = 'card → ' + mvS; } catch (e) { console.log('salvar/coluna: ' + e); }
      }
    } else if (c2.idList === ctx.listas[VD.LISTA_COTACAO] || c2.idList === ctx.listas[VD.LISTA_FALTA]) {
      acao = vd_conferirCard_(c2, ctx).acao;
    }
    vd_marcar_(c2);
  } catch (e) {}
  try {
    var evPecas = (posCot ? novasPecas : an.pecas).map(ev_peca_);
    ev_registrar_(!p.shortLink ? 'PEDIDO' : (posCot && novasPecas.length ? 'PEÇA NOVA' : 'PEDIDO EDITADO'), { name: card.name, shortLink: card.shortLink, shortUrl: card.shortUrl, labels: (typeof c2 !== 'undefined' && c2 && c2.labels) || [] },
      me.username, evPecas, { tipo: tipo, detalhe: (nFo ? nFo + ' peça(s) FO' : '') });
  } catch (e) {}

  return { ok: true, url: card.shortUrl, shortLink: card.shortLink, nome: card.name, acao: acao, novo: !p.shortLink, fo: nFo, foComp: nFoComp, comp: compOf.length, pagas: nPagas, anexos: anexados, capa: capaOk, repetidos: repetidos };
}

// FormularioServidor.gs:1808
function vdf_subirArquivo(token, base64, mime, nome) {
  vdf_usuario_(token);
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, nome);
  return { fileId: vdf_pastaTemp_().createFile(blob).getId() };
}

// FormularioServidor.gs:1820
function vdf_cotacaoIndisponivel(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) registra cotação indisponível — sua conta: ' + me.username + '.'] };
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var an = vd_analisar_(card.desc, card.name);
  var porChave = {}; an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var lidas = vd_cotacoesDaDescricao_(card.desc, an.pecas).cotacoes;
  var pagos = []; (card.checklists || []).forEach(function (k) { if (/^PAGAS/i.test(String(k.name || '').trim())) (k.checkItems || []).forEach(function (i) { pagos.push(vd_semAcento_(i.name)); }); });
  var foNome = function (x) { try { return fo_resolver_(x).nome || String(x || '').trim().toUpperCase(); } catch (e) { return String(x || '').trim().toUpperCase(); } };
  var faltas = [], linhas = [], novas = {}, ordem = [], afetadas = [], evs = [];
  (p.itens || []).forEach(function (it, i) {
    var peca = porChave[it.chave];
    if (!peca) { faltas.push('item ' + (i + 1) + ': peça não encontrada'); return; }
    var nomeP = peca.pneu ? 'PNEU ' + String(peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(peca);
    var forn = String(it.fornecedor || '').trim().toUpperCase(), valor = vd_valorNum_(it.valor), motivo = String(it.motivo || '').replace(/\s*\n\s*/g, ' ').replace(/\s+-\s+/g, ' – ').replace(/R\$/gi, 'R$ ').trim();
    if (!motivo) { faltas.push(nomeP + ': escreva o motivo (por que a cotação não está disponível)'); return; }
    if (pagos.some(function (n) { return n.indexOf(vd_chavePeca_(peca)) >= 0; })) { faltas.push(nomeP + ': já está comprada'); return; }
    if (!lidas.some(function (q) { return q.chave === it.chave && q.fornecedor === forn && Math.abs(q.valor - valor) < 0.005; })) { faltas.push(nomeP + ': cotação ' + forn + ' ' + vd_valorBR_(valor) + ' não está no card'); return; }
    linhas.push('INDISPONÍVEL: ' + forn + ' - ' + nomeP + ' - ' + vd_valorBR_(valor) + ' - ' + motivo);
    var e = ev_peca_(peca); e.fornecedor = forn; e.valor = valor; e.detalhe = 'indisponível: ' + motivo; evs.push(e);
    afetadas.push(peca);
    var n = it.nova;
    if (n && String(n.fornecedor || '').trim()) {
      var nf = foNome(n.fornecedor), nv = vd_valorNum_(n.valor), nd = String(n.dias == null ? '' : n.dias).trim(), nt = vd_tipoNorm_(n.tipo || '') || '', nm = String(n.marca || '').trim().toUpperCase();
      if (isNaN(nv) || nv <= 0) { faltas.push(nomeP + ': valor da cotação nova inválido'); return; }
      if (nd !== '' && !/^\d+$/.test(nd)) { faltas.push(nomeP + ': prazo da cotação nova em dias úteis (número)'); return; }
      var nl = vdf_linkCot_(n.link);   // link do anúncio da cotação nova (compra online), 07/10/2026
      if (nl === null) { faltas.push(nomeP + ': link da cotação nova inválido — cole o endereço completo, começando com http (ou deixe vazio)'); return; }
      if (!novas[nf]) { novas[nf] = []; ordem.push(nf); }
      novas[nf].push(nomeP + (nt || nm ? ' - ' + [nt, nm].filter(String).join(' ') : '') + ' - ' + vd_valorBR_(nv) + (nd !== '' ? ' - ' + nd + (nd === '1' ? ' dia útil' : ' dias úteis') : '') + (nl ? ' - [🔗 link](' + nl + ')' : ''));
      var e2 = ev_peca_(peca); e2.fornecedor = nf; e2.valor = nv; e2.dias = nd; e2.detalhe = 'cotação nova (no lugar da indisponível)'; evs.push(e2);
    }
  });
  if (!linhas.length && !faltas.length) faltas.push('Marque a peça com cotação indisponível e escreva o motivo.');
  if (faltas.length) return { ok: false, faltas: faltas };

  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  var L = ['**RECOTAÇÃO ' + agora + ' - ' + me.fullName + '**'].concat(linhas);
  ordem.forEach(function (f) { L.push('**' + f + '**'); L = L.concat(novas[f]); });
  var div = vd_dividir_(card.desc);
  var resto = div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR;
  vd_backup_(card, 'cotação indisponível registrada por ' + me.username);
  vd_gravarDesc_(card.id, div.bloco.replace(/\s+$/, '') + '\n\n' + resto + '\n\n' + L.join('\n'), token);
  try { fo_registrarUso_(ordem, me.username); } catch (e) {}
  try { ev_registrar_('COTAÇÃO INDISPONÍVEL', card, me.username, evs); } catch (e) {}

  // para onde vai: com cotação nova -> autorização de novo; sem -> volta para EM COTAÇÃO
  var criador = ''; try { criador = vd_criador_(card.id); } catch (e) {}
  var temNova = ordem.length > 0, soPart = afetadas.every(function (x) { return vdf_pecaParticular_(x, card, an); });
  var destino = !temNova ? VD.LISTA_COTACAO : (soPart ? VDF_LISTA_FINALIZADA : VDF_LISTA_PENDENTE);
  var movido = '';
  try { movido = vdf_moverPara_(card, ctx, destino, token, me.username); } catch (e) {}
  try {
    var us = [];
    if (temNova) afetadas.forEach(function (x) { if (vdf_pecaParticular_(x, card, an)) us.push(x.partPor || criador); else us = us.concat(sla_users_('SLA_AUTORIZAR', 'timweslley,comercialunity')); });
    us = us.filter(function (u, i) { return u && u !== me.username && us.indexOf(u) === i; });
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: us.map(function (u) { return '@' + u + ' '; }).join('') + '⚠️ **COTAÇÃO INDISPONÍVEL** — ' + me.fullName + (movido ? ' → **' + movido + '**' : '') + '\n' +
      linhas.map(function (l) { return '- ' + l.replace(/^INDISPON[IÍ]VEL:\s*/i, ''); }).join('\n') +
      (temNova ? '\n↪️ Cotação nova: autorizar de novo.' : '\n↪️ Sem cotação nova: volta para cotação.') } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: linhas.length, nova: temNova, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

// Fornecedores.gs:99
function fo_norm_(s) { return vd_semAcento_(s).replace(/[^A-Z0-9]+/g, ' ').trim(); }

// Fornecedores.gs:101
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

// Fornecedores.gs:116
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

// Fornecedores.gs:145
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

// Fornecedores.gs:160
function fo_paraFormulario_() {
  try {
    return fo_lista_().slice().sort(function (a, b) { return (b.usos - a.usos) || (a.nome < b.nome ? -1 : 1); })
      .map(function (f) { return [f.nome, [f.apelidos.join(', '), f.cod ? 'Databox ' + f.cod : ''].filter(String).join(' · ')]; });
  } catch (e) { console.log('fornecedores/form: ' + e); return []; }
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

// Previsao.gs:13
function pv_data_(s) { return s ? vd_dataBR_(String(s).trim()) : ''; }

// Previsao.gs:14
function pv_mesmoDia_(a, b) { return !!a && !!b && vd_dataCurta_(a) === vd_dataCurta_(b) && new Date(a).getFullYear() === new Date(b).getFullYear(); }

// Previsao.gs:15
function pv_curto_(nome) { return String(nome || '').split(/\s+[-—]\s+/)[0]; }

// Previsao.gs:18
function pv_item_(card, id) {
  var achado = null;
  (card.checklists || []).forEach(function (k) {
    (k.checkItems || []).forEach(function (i) { if (i.id === id) achado = { item: i, lista: String(k.name || '').trim().toUpperCase(), idLista: k.id }; });
  });
  return achado;
}

// Previsao.gs:27
function pv_dueCard_(cardId, token) {
  try {
    var c = vd_api_('/cards/' + cardId, { query: { fields: 'due', checklists: 'all', checkItem_fields: 'state,due' } });
    var maior = '';
    (c.checklists || []).forEach(function (k) {
      if (!/^(PAGAS|FORNECIMENTO)/i.test(String(k.name || '').trim())) return;
      (k.checkItems || []).forEach(function (i) { if (i.state !== 'complete' && i.due && (!maior || new Date(i.due) > new Date(maior))) maior = i.due; });
    });
    if (maior && !pv_mesmoDia_(maior, c.due)) vd_api_('/cards/' + cardId, { method: 'put', payload: { due: maior } }, token);
  } catch (e) { console.log('prazo do card: ' + e); }
}

// Previsao.gs:42
function vdf_alterarPrevisao(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) altera previsão — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var an = vd_analisar_(card.desc, card.name);
  var porChave = {}; an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var auts = vd_autorizacoesDaDescricao_(card.desc, an.pecas), lidas = vd_cotacoesDaDescricao_(card.desc, an.pecas).cotacoes;
  var faltas = [], mudar = [], cots = [], linhas = [], evs = [];
  (p.itens || []).forEach(function (x) {
    var motivo = String(x.motivo || '').replace(/\s*\n\s*/g, ' ').trim();
    if (x.tipo === 'COT') {
      var peca = porChave[x.chave], a = auts.filter(function (q) { return q.chave === x.chave; })[0];
      if (!peca) return faltas.push('peça não encontrada no pedido');
      var nome = vd_nomePeca_(peca);
      if (!a) return faltas.push(nome + ': ainda não autorizada — altere a cotação normalmente pela aba Cotação.');
      var q = lidas.filter(function (c) { return c.chave === x.chave && c.fornecedor === a.fornecedor && Math.abs(c.valor - a.valor) < 0.005; }).pop();
      var dias = String(x.dias == null ? '' : x.dias).trim();
      if (!/^\d+$/.test(dias)) return faltas.push(nome + ': prazo em dias úteis (número).');
      if (!motivo) return faltas.push(nome + ': escreva o motivo da mudança de prazo.');
      cots.push({ peca: peca, a: a, q: q || {}, dias: dias, motivo: motivo });
      linhas.push('- ' + nome + ' (' + a.fornecedor + '): ' + (q && q.dias !== '' && q.dias != null ? q.dias + ' → ' : '') + dias + ' d.u. — ' + motivo);
      var e = ev_peca_(peca); e.fornecedor = a.fornecedor; e.valor = a.valor; e.dias = dias; e.detalhe = 'PRAZO AUTORIZADO ALTERADO: ' + motivo; evs.push(e);
      return;
    }
    var it = pv_item_(card, x.id);
    if (!it) return faltas.push('item do checklist não encontrado (atualize a página)');
    var nova = pv_data_(x.previsao), velha = it.item.due || '';
    if (!nova) return faltas.push(pv_curto_(it.item.name) + ': data inválida.');
    if (pv_mesmoDia_(nova, velha)) return;
    if (velha && !motivo) return faltas.push(pv_curto_(it.item.name) + ': escreva o motivo da mudança de previsão.');
    mudar.push({ it: it, nova: nova });
    linhas.push('- ' + pv_curto_(it.item.name) + ': ' + (velha ? vd_dataCurta_(velha) : 'sem previsão') + ' → **' + vd_dataCurta_(nova) + '**' + (motivo ? ' — ' + motivo : ''));
    evs.push({ peca: pv_curto_(it.item.name), previsao: nova, detalhe: 'PREVISÃO ' + (velha ? vd_dataCurta_(velha) + ' → ' : '') + vd_dataCurta_(nova) + ' (' + it.lista + ')' + (motivo ? ': ' + motivo : '') });
  });
  if (faltas.length) return { ok: false, faltas: faltas };
  if (!mudar.length && !cots.length) return { ok: false, faltas: ['Nenhuma previsão mudou.'] };

  mudar.forEach(function (m) { vd_api_('/cards/' + card.id + '/checkItem/' + m.it.item.id, { method: 'put', payload: { due: m.nova } }, token); });
  if (cots.length) {
    var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
    var L = ['**COTAÇÃO ' + agora + ' - ' + me.fullName + '**'];
    cots.forEach(function (c) {
      var nomeP = c.peca.pneu ? 'PNEU ' + String(c.peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(c.peca);
      var tm = [c.q.tipo, c.q.marca].filter(String).join(' ');
      L.push('REMOVIDA: ' + c.a.fornecedor + ' - ' + nomeP + ' - ' + vd_valorBR_(c.a.valor));
      L.push('**' + c.a.fornecedor + '**');
      L.push(nomeP + (tm ? ' - ' + tm : '') + ' - ' + vd_valorBR_(c.a.valor) + ' - ' + c.dias + (c.dias === '1' ? ' dia útil' : ' dias úteis'));
      L.push('OBS ' + nomeP + ': (prazo alterado) ' + c.motivo);
    });
    var div = vd_dividir_(card.desc);
    vd_backup_(card, 'prazo autorizado alterado por ' + me.username);
    vd_gravarDesc_(card.id, div.bloco.replace(/\s+$/, '') + '\n\n' + (div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR) + '\n\n' + L.join('\n'), token);
  } else {
    try { vd_redesenhar_(card.id, token); } catch (e) {}
  }
  pv_dueCard_(card.id, token);
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '📅 **PREVISÃO ALTERADA** — ' + me.fullName + '\n' + linhas.join('\n') } }, token); } catch (e) {}
  try { ev_registrar_('PREVISÃO', card, me.username, evs); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: mudar.length + cots.length };
}

// Previsao.gs:109
function pv_baseFo_(nome, lista) {
  var b = String(nome || '').replace(/\s+[-—]\s+(EM COTA[ÇC][ÃA]O.*|B\.?O\.?\b.*)$/i, '').trim();
  b = b.replace(/^(\d{5,})(?=[A-Z])/i, '$1 ');   // código grudado na descrição (OCR do Cilia, 05/10/2026: "100260230EMBLEMA ...")
  // sufixo " - FORNECEDOR": testa do pedaço mais comprido para o mais curto, porque o fornecedor lido do
  // portal pode ter " - " e "/" dentro ("MEDIADORA - PRISMATEC / DUNA FIAT", 05/10/2026)
  var partes = b.split(/\s+-\s+/);
  for (var k = 1; k < partes.length; k++) {
    var suf = partes.slice(k).join(' - ').trim();
    if (/\d{4,}/.test(suf)) continue;
    var conhecido = /^(SEGURADORA|FO|MEDIADORA)\b/i.test(suf) || !fo_resolver_(suf, lista).novo
      || VD_SEGURADORAS.some(function (sg) { return sg[0] === vd_semAcento_(suf); })
      || (function () { var c = pv_fornecedorCurto_(suf, lista); return !!c && !fo_resolver_(c, lista).novo; })();
    if (conhecido) { b = partes.slice(0, k).join(' - ').trim(); break; }
  }
  return b;
}

// Previsao.gs:127
function pv_achaFo_(itensFo, x) {
  if (x.id) { var porId = itensFo.filter(function (i) { return i.id === x.id; })[0]; if (porId) return porId; }
  var cod = cp_norm_(x.codigo), desc = cp_norm_(x.descricao);
  if (cod.length >= 4) { var pc = itensFo.filter(function (i) { return cp_norm_(i.name).indexOf(cod) >= 0; })[0]; if (pc) return pc; }
  if (desc.length >= 4) return itensFo.filter(function (i) { return cp_norm_(i.name).indexOf(desc) >= 0; })[0] || null;
  return null;
}

// Previsao.gs:141
function vdf_atualizarFornecimento(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) atualiza o fornecimento — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  // "rotina" (motivo automático = portal da seguradora) só vale para a diretoria, que é quem roda a ROTINA UNITY
  var rotina = /rotina/i.test(String(p.origem || '')) && vdf_ehAutorizador_(me);
  var foLista = []; try { foLista = fo_lista_(); } catch (e) {}
  var itensFo = [];
  (card.checklists || []).forEach(function (k) { if (/FORNECIMENTO/i.test(k.name || '')) (k.checkItems || []).forEach(function (i) { i._lista = String(k.name).trim().toUpperCase(); itensFo.push(i); }); });
  var faltas = [], ops = [], linhas = [], evs = [], forns = [], avisos = [];
  var nomeNovo = function (base, x) {
    var forn = x.fornecedor ? fo_resolver_(x.fornecedor, foLista).nome : '';
    if (forn) forns.push(forn);
    var sit = vd_semAcento_(x.situacao || '');
    return base + (forn ? ' - ' + forn : '') + (/^EM COTA/.test(sit) ? ' - ' + PV.EM_COTACAO : (/^B\.?O/.test(sit) ? ' — ' + PV.BO + ' (' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM') + ')' : ''));
  };
  (p.itens || []).forEach(function (x) {
    var it = pv_achaFo_(itensFo, x);
    if (!it) return faltas.push('FO não encontrada no card: ' + (x.codigo || x.descricao || x.id || '?') + ' (use "novos" para incluir)');
    var base = pv_baseFo_(it.name, foLista), baseOrig = base, mud = {}, txt = [];
    var querNome = x.fornecedor !== undefined || x.situacao !== undefined;
    // o documento novo trouxe outro código (e/ou descrição) para a mesma peça: atualiza no item, sem duplicar (05/10/2026)
    if (x.codigoNovo) {
      var codNovo = String(x.codigoNovo).replace(/\s+/g, '').toUpperCase();
      var descBase = base.replace(/^[A-Z0-9][A-Z0-9.\-\/]{3,}\s+/i, '');
      base = codNovo + ' ' + (x.descNova ? String(x.descNova).toUpperCase() : descBase);
      querNome = true; txt.push('código → ' + codNovo);
    }
    if (querNome) {
      var antigoForn = (String(it.name).slice(baseOrig.length).match(/^\s+-\s+([^-—]+?)(?:\s+[-—]|$)/) || [])[1] || '';
      var nm = nomeNovo(base, { fornecedor: x.fornecedor !== undefined ? x.fornecedor : antigoForn, situacao: x.situacao });
      if (nm !== it.name) { mud.name = nm; txt.push(nm.slice(base.length).replace(/^\s+[-—]\s+/, '') || 'sem fornecedor'); }
    }
    if (x.previsao) {
      var nova = pv_data_(x.previsao), velha = it.due || '';
      if (!nova) return faltas.push(pv_curto_(it.name) + ': data inválida');
      if (it.state === 'complete' && velha) {
        // peça já recebida com data: a previsão fica como está (fornecedor/código ainda atualizam) — 06/10/2026
        if (!pv_mesmoDia_(nova, velha)) avisos.push(pv_curto_(it.name) + ': já recebida — previsão ' + vd_dataCurta_(velha) + ' mantida (o documento traz ' + vd_dataCurta_(nova) + ')');
      } else if (!pv_mesmoDia_(nova, velha)) {
        var motivo = String(x.motivo || '').trim() || (rotina ? 'portal da seguradora' : '');
        var adiou = !!velha && pv_diaNum_(nova) > pv_diaNum_(velha);   // só previsão que fica para DEPOIS pede motivo
        if (adiou && !motivo) return faltas.push(pv_curto_(it.name) + ': a previsão ficou para depois (' + vd_dataCurta_(velha) + ' → ' + vd_dataCurta_(nova) + ') — escreva o motivo');
        mud.due = nova;
        txt.push('prev. ' + (velha ? vd_dataCurta_(velha) + ' → ' : '') + '**' + vd_dataCurta_(nova) + '**' + (velha && motivo ? ' (' + motivo + ')' : ''));
      }
    }
    if (x.entregue && it.state !== 'complete') { mud.state = 'complete'; txt.push('✔ entregue'); }
    if (!Object.keys(mud).length) return;
    ops.push({ it: it, mud: mud });
    linhas.push('- ' + pv_curto_(base) + ': ' + txt.join(' · '));
    evs.push({ peca: base, fornecedor: mud.name ? (mud.name.slice(base.length).match(/^\s+-\s+([^-—]+)/) || [])[1] || '' : '', previsao: mud.due || it.due || '', detalhe: (it._lista + ': ' + txt.join(' · ')).replace(/\*\*/g, '') });
  });
  var novos = (p.novos || []).filter(function (x) { return x && (x.codigo || x.descricao); });
  var jaTem = itensFo.map(function (i) { return cp_norm_(i.name); });
  novos = novos.filter(function (x) { var k = cp_norm_(x.codigo) || cp_norm_(x.descricao); return k && !jaTem.some(function (n) { return n.indexOf(k) >= 0; }); });
  if (faltas.length) return { ok: false, faltas: faltas };
  if (!ops.length && !novos.length && !(p.fileIds || []).length) return { ok: true, nada: true, url: card.shortUrl, nome: card.name, n: 0, avisos: avisos };

  ops.forEach(function (o) { vd_api_('/cards/' + card.id + '/checkItem/' + o.it.id, { method: 'put', payload: o.mud }, token); });
  if (novos.length) {
    var cl = (card.checklists || []).filter(function (k) { return /FORNECIMENTO/i.test(k.name || '') && !/COMPLEMENTO/i.test(k.name || ''); })[0];
    if (!cl) cl = vd_api_('/checklists', { method: 'post', payload: { idCard: card.id, name: 'FORNECIMENTO', pos: 'bottom' } }, token);
    novos.forEach(function (x) {
      var base = ((String(x.codigo || '').replace(/\s+/g, '').toUpperCase() + ' ').trim() + ' ' + String(x.descricao || '').trim().toUpperCase()).trim();
      var corpo = { name: nomeNovo(base, x), pos: 'bottom' };
      var d = pv_data_(x.previsao); if (d) corpo.due = d;
      if (x.entregue) corpo.checked = 'true';
      vd_api_('/checklists/' + cl.id + '/checkItems', { method: 'post', payload: corpo }, token);
      linhas.push('- ➕ ' + corpo.name + (d ? ' · prev. ' + vd_dataCurta_(d) : '') + (x.entregue ? ' · ✔' : ''));
      evs.push({ peca: base, previsao: d, detalhe: 'FO NOVA (portal)' });
    });
  }
  var anexosCard = (p.fileIds || []).length ? ax_anexos_(card.id, token) : [];
  (p.fileIds || []).forEach(function (fid) {
    try {
      var f = vdf_arquivoTemp_(fid);
      var at = vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: { file: f.getBlob(), name: '🚚 FO — ' + f.getName() } }, token);
      // nome padronizado "🚚 FO · PLACA · Status do Pedido Cilia · dd/MM" (v2, v3… quando entra outro) — 05/10/2026
      if (at && at.id) {
        var nm = f.getName(), doc = /status/i.test(nm) ? 'Status do Pedido Cilia' : /hdi/i.test(nm) ? 'Peças HDI' : /soma/i.test(nm) ? 'Websoma' : '';
        at.name = ax_batizar_(card.id, at.id, ax_nome_(AX.FO, ax_placa_(card), [doc]), anexosCard, token);
        anexosCard.push({ id: at.id, name: at.name, date: new Date().toISOString() });
      }
      f.setTrashed(true);
    } catch (e) { console.log('anexo FO: ' + e); }
  });
  pv_dueCard_(card.id, token);
  try { fo_registrarUso_(forns, me.username); } catch (e) {}
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🚚 **FORNECIMENTO** — ' + me.fullName + (rotina ? ' (rotina)' : '') + '\n' + linhas.join('\n') } }, token); } catch (e) {}
  try { ev_registrar_('FORNECIMENTO', card, me.username, evs.map(function (e) { e.fornecedor = e.fornecedor || 'SEGURADORA (FO)'; return e; })); } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  var movidoF = '';
  try { movidoF = rc_reavaliarColuna_(card.id, token, me.username); } catch (e) { console.log('fornecimento/coluna: ' + e); }   // FO entregue fecha; FO nova reabre
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: ops.length + novos.length, lista: movidoF || undefined, avisos: avisos };
}

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
  var cab = /^(PECA|PECAS|PREV\.?\s*ENTREGA|ENTREGA|FORNECEDOR|TEL\.?|E-?MAIL|PE[CG]AS DO LAUDO.*|PE[CG]AS DO SINISTRO|OLA .*|SAIR|FECHAR|INTRANET|HDI SEGUROS?)$|PREV\.?\s*ENTREGA.*FORNECEDOR/;
  var pecas = [], fornecedores = [], datasSoltas = [], entregasSoltas = [], colunaAtual = '', linhaUltimaPeca = -1;
  var fornDe = function (t) { t = t.replace(reMail, '').replace(reTel, '').replace(/\s+/g, ' ').trim(); return t ? pv_fornecedorCurto_(t, lista) || t : ''; };
  // vários fornecedores numa linha só (OCR do print junta a coluna: "CAR HOUSE (49)… mail CAR HOUSE (49)… mail"): um por contato
  var fornsDe = function (t) {
    var sep = reMail.test(t) ? new RegExp(reMail.source, 'g') : (reTel.test(t) ? new RegExp(reTel.source, 'g') : null);
    var partes = sep ? t.split(sep) : [t];
    if (sep) partes = partes.slice(0, -1);   // o último pedaço é o que sobra depois do último contato
    var out = partes.map(fornDe).filter(String);
    return out.length ? out : [fornDe(t)].filter(String);
  };
  for (var i = ini + 1; i < fim; i++) {
    // ícones de ordenação do portal viram "☐ □ ▸" no OCR do print: fora, antes de reconhecer a linha (07/10/2026, BXZ4J84)
    var l = linhas[i].replace(/^[^A-Za-z0-9(À-ÿ]+/, '').trim(), u = vd_semAcento_(l);
    if (!l) continue;
    // cabeçalho de coluna sozinho na linha (layout em colunas): diz de que coluna são as linhas seguintes
    if (/^(ENTREGA|FORNECEDOR|TEL\.?|E-?MAIL)$/.test(u) && pecas.length) { colunaAtual = u.replace(/\W/g, ''); continue; }
    if (cab.test(u)) continue;
    if (/^FORNECIDO PELA OFICINA$/.test(u)) { fornecedores.push({ oficina: true }); continue; }
    var datas = l.match(reData) || [];
    var soDatas = datas.length && l.replace(reData, '').replace(/[\s\-]/g, '') === '';
    if (soDatas) {
      // a data da peça caiu na linha de baixo (OCR quebrou a célula): é dela, não da fila
      var ult = pecas[pecas.length - 1];
      if (!colunaAtual && ult && !ult.previsao && linhaUltimaPeca === i - 1 && datas.length === 1) { ult.previsao = datas[0]; linhaUltimaPeca = i; continue; }
      datas.forEach(function (d) { (colunaAtual === 'ENTREGA' ? entregasSoltas : datasSoltas).push(d); }); continue;
    }
    var temForn = reTel.test(l) || reMail.test(l), oficinaNaLinha = /FORNECIDO PELA OFICINA/.test(u);
    if (temForn && !datas.length && colunaAtual) { fornsDe(l).forEach(function (nm) { fornecedores.push({ nome: nm }); }); continue; }   // coluna Fornecedor, uma célula (ou várias) por linha
    var desc = l.replace(reMail, '').replace(reTel, '');
    var pos = desc.search(reData); if (pos >= 0) desc = desc.slice(0, pos);
    var fornTxt = '';
    if (temForn) { var m = l.match(reData); var dep = m ? l.slice(l.lastIndexOf(m[m.length - 1]) + m[m.length - 1].length) : ''; fornTxt = dep || ''; }
    if (oficinaNaLinha) desc = desc.replace(/fornecido pela oficina/i, '');
    desc = desc.replace(/\s+/g, ' ').trim();
    if (!desc || desc.length < 4) {
      // só fornecedor na linha (layout em colunas): entra na fila de fornecedores
      if (temForn) fornsDe(l).forEach(function (nm) { fornecedores.push({ nome: nm }); });
      continue;
    }
    if (!/[A-Z]{3,}/.test(vd_semAcento_(desc))) continue;
    var p = { descricao: desc.toUpperCase(), previsao: '', entregueEm: '', entregue: false, fornecedor: '', oficina: oficinaNaLinha, linha: l.slice(0, 120) };
    if (datas[0]) p.previsao = datas[0];
    if (datas[1]) p.entregueEm = datas[1];
    if (temForn) p.fornecedor = fornDe(fornTxt || l.slice(desc.length));
    p._temForn = temForn || oficinaNaLinha;
    pecas.push(p); linhaUltimaPeca = i;
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

// Previsao.gs:603
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

// Previsao.gs:685
function pv_enriquecerFo_(texto, fo) {
  if (!fo || !fo.length) return 0;
  var n = 0;
  pv_lerFornecimento_(texto, fo).forEach(function (r) {
    if (r.fornecedor) { r.alvo.fornecedor = r.fornecedor; n++; }
    if (r.previsao) r.alvo.previsao = r.previsao;
  });
  return n;
}

// Previsao.gs:699
function vdf_lerFornecimento(token, shortLink, base64, mime, nome) {
  var me = vdf_usuario_(token);
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc', checklists: 'all', checkItem_fields: 'name,state,due' } });
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, nome);
  var arq = vdf_pastaTemp_().createFile(blob);
  var texto;
  try { texto = vd_ocr_(blob, nome); } catch (e) { return { fileId: arq.getId(), erro: 'Não consegui ler o arquivo (' + String(e.message || e).slice(0, 80) + ').' }; }
  var out = pv_lerFornecimentoTexto_(card, texto);
  out.fileId = arq.getId();
  out.trecho = String(texto || '').slice(0, 4000);   // diagnóstico do OCR (o formulário não mostra)
  return out;
}

// Previsao.gs:714
function vdf_lerFornecimentoAnexo(token, shortLink, idAnexo) {
  vdf_usuario_(token);
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard', checklists: 'all', checkItem_fields: 'name,state,due', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url,date' } });
  var a = (card.attachments || []).filter(function (x) { return x.id === idAnexo; })[0];
  if (!a) throw new Error('Esse anexo não está mais no card.');
  if (!vd_anexoLegivel_(a)) throw new Error('Esse anexo não dá para ler (só PDF ou foto até 15 MB).');
  var resp = qt_fetch_(a.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
  if (resp.getResponseCode() >= 300) throw new Error('O Trello não entregou o arquivo "' + a.name + '". Tente de novo.');
  var texto;
  try { texto = vd_ocr_(resp.getBlob(), a.name); } catch (e) { return { anexoId: a.id, erro: 'Não consegui ler "' + a.name + '" (' + String(e.message || e).slice(0, 80) + ').' }; }
  var out = pv_lerFornecimentoTexto_(card, texto);
  out.anexoId = a.id;
  out.trecho = String(texto || '').slice(0, 4000);   // diagnóstico do OCR (o formulário não mostra)
  // anexo subido à mão e lido por aqui ganha o nome padronizado "🚚 FO · PLACA · doc · dd/MM" (07/10/2026, ATX2884)
  try {
    var docNome = pv_docFornecimento_(texto);
    if (docNome && a.isUpload && !ax_padronizado_(a.name) && ax_placa_(card) && out.lidos) {
      out.renomeado = ax_batizar_(card.id, a.id, ax_nome_(AX.FO, ax_placa_(card), [docNome], a.date), ax_anexos_(card.id, token), token, { nomeAtual: a.name });
    }
  } catch (e) { console.log('batizar anexo lido: ' + e); }
  return out;
}

// Previsao.gs:738
function pv_docFornecimento_(texto) {
  var nt = vd_normTexto_(texto);
  if (/STATUS DO PEDIDO|PREVISAO DE ENTREGA|STATUS DAS PECAS/.test(nt)) return 'Status do Pedido Cilia';
  if (/PE[CG]AS DO (SINISTRO|LAUDO)/.test(nt)) return 'Peças HDI';
  return '';
}

// Previsao.gs:746
function pv_lerFornecimentoTexto_(card, texto) {
  var itensFo = [];
  (card.checklists || []).forEach(function (k) { if (/FORNECIMENTO/i.test(k.name || '')) (k.checkItems || []).forEach(function (i) { itensFo.push(i); }); });
  var foLista = []; try { foLista = fo_lista_(); } catch (e) {}
  var alvos = itensFo.map(function (i) { var b = pv_baseFo_(i.name, foLista); var m = b.match(/^([A-Z0-9][A-Z0-9.\-\/]{3,})\s+(.+)$/i); return { id: i.id, nome: b, codigo: m && /\d/.test(m[1]) ? m[1] : '', descricao: m ? m[2] : b }; });
  var achados = pv_lerFornecimento_(texto, alvos, foLista);
  var achIds = achados.map(function (r) { return r.alvo.id; });
  var faltando = alvos.filter(function (a) { return a.codigo && achIds.indexOf(a.id) < 0; }).map(function (a) { return a.nome; });
  // peças a mais no documento: se for orçamento, pela lista dele; se for print do portal, códigos com data na mesma linha
  var orc = vd_lerOrcamento_(texto), extras = [];
  var conhecidas = alvos.map(function (a) { return cp_norm_(a.codigo); }).concat(vd_analisar_(card.desc, card.name).pecas.map(function (p) { return cp_norm_(p.codigo); })).filter(function (k) { return k.length >= 4; });
  var ja = function (k) { return conhecidas.some(function (c) { return c === k || c.indexOf(k) >= 0 || k.indexOf(c) >= 0; }); };
  var hdiL = null; try { hdiL = pv_lerHdiPecas_(texto, foLista); } catch (e) {}
  if (orc.origem) {
    orc.fo.forEach(function (p) { var k = cp_norm_(p.codigo); if (k.length >= 4 && !ja(k)) extras.push(cp_nome_(p)); });
  } else if (hdiL) {
    // "Peças do sinistro" da HDI: FO do documento que não bate com nenhuma peça do card (pela descrição)
    var descsCard = alvos.map(function (a) { return a.descricao || a.nome; }).concat(vd_analisar_(card.desc, card.name).pecas.map(function (p) { return p.descricao || ''; }));
    hdiL.forEach(function (p) { if (p.oficina) return; if (!descsCard.some(function (d) { return cp_similar_(d, p.descricao) > 0; })) extras.push(p.descricao + (p.fornecedor ? ' (' + p.fornecedor + ')' : '')); });
  } else {
    String(texto).split('\n').forEach(function (l) {
      if (!pv_datas_(l).length) return;
      var toks = vd_semAcento_(l).match(/\b(?=[A-Z0-9]*\d{5,})[A-Z0-9]{6,15}\b/g) || [];
      toks.forEach(function (t) {
        if (/^\d{11,}$/.test(t) || ja(t) || cp_norm_(card.desc).indexOf(t) >= 0) return;   // CNPJ/telefone/sinistro/chassi
        var nm = (t + ' ' + l.slice(l.toUpperCase().indexOf(t) + t.length).replace(/\d{1,2}\/\d{1,2}\/\d{2,4}.*/, '').trim()).slice(0, 60).trim();
        if (extras.indexOf(nm) < 0) extras.push(nm);
      });
    });
  }
  return {
    orcamento: !!orc.origem, lidos: achados.length,
    achados: achados.map(function (r) { return { id: r.alvo.id, nome: r.alvo.nome, fornecedor: r.fornecedor, previsao: r.previsao ? Utilities.formatDate(new Date(r.previsao), 'America/Sao_Paulo', 'yyyy-MM-dd') : '', codigoNovo: r.codigoNovo || '', descNova: r.descNova || '', entregue: !!r.entregue, entregueEm: r.entregueEm ? Utilities.formatDate(new Date(r.entregueEm), 'America/Sao_Paulo', 'yyyy-MM-dd') : '',
      // vindo do parecer do Cilia (07/10/2026): motivo da nova previsão, situação BO, previsão que a tabela mostrava
      motivo: r.motivo || '', situacao: r.situacao || '', parecer: r.parecer || '', previsaoTabela: r.previsaoTabela ? Utilities.formatDate(new Date(r.previsaoTabela), 'America/Sao_Paulo', 'yyyy-MM-dd') : '' }; }),
    faltando: faltando, extras: extras.slice(0, 20)
  };
}

// Recebimento.gs:13
function vdf_itensRecebimento_(c) {
  var out = [];
  (c.checklists || []).forEach(function (k) {
    var nm = String(k.name || '').trim();
    var comp = /COMPLEMENTO/i.test(nm);
    var tipo = /^PAGAS/i.test(nm) ? (/PARTICULAR/i.test(nm) ? 'PAGAS PARTICULAR' : (comp ? 'PAGAS COMPLEMENTO' : 'PAGAS')) : (/FORNECIMENTO/i.test(nm) ? (comp ? 'FORNECIMENTO COMPLEMENTO' : 'FORNECIMENTO') : '');
    if (!tipo) return;
    (k.checkItems || []).forEach(function (i) { out.push({ id: i.id, nome: i.name, ok: i.state === 'complete', due: i.due || '', lista: tipo }); });
  });
  return out;
}

// Recebimento.gs:26
function rc_atraso_(dueIso, chegada) {
  if (!dueIso) return null;
  var d0 = new Date(dueIso), a = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), 12);
  var b = new Date(chegada.getFullYear(), chegada.getMonth(), chegada.getDate(), 12);
  if (a.getTime() === b.getTime()) return 0;
  var sinal = b > a ? 1 : -1, n = 0, d = new Date(a.getTime()), guarda = 0;
  while (du_chave_(d) !== du_chave_(b) && guarda++ < 400) { d.setDate(d.getDate() + sinal); if (du_ehUtil_(d)) n++; }
  return sinal * n;
}

// Recebimento.gs:36
function rc_data_(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  var h = new Date();
  var d = m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12);
  if (d.getTime() > Date.now() + 864e5) d = new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12);   // sem data futura
  return d;
}

// Recebimento.gs:48
function vdf_podeReceber_(me, card) {
  if (vdf_podeComprar_(me)) return true;
  var u = ev_unidade_(card);   // campo "Unidade"; etiqueta só em card antigo
  return !/TOLEDO/i.test(u || '');
}

// Recebimento.gs:53
function vdf_salvarRecebimento(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (!vdf_podeReceber_(me, card)) return { ok: false, faltas: ['Em Toledo, o recebimento é registrado pelo setor de compras (ou pela diretoria) — sua conta: ' + me.username + '.'] };
  var todos = vdf_itensRecebimento_(card), porId = {};
  todos.forEach(function (i) { porId[i.id] = i; });
  var itens = (p.itens || []).filter(function (x) { return porId[x.id]; });
  var anexos = (p.anexos || []).filter(function (a) { return a && a.fileId; });
  if (!itens.length && !anexos.length) return { ok: false, faltas: ['Marque pelo menos uma peça que chegou (ou anexe a nota/foto).'] };

  var linhas = [], evs = [], feitos = 0;
  itens.forEach(function (x) {
    var it = porId[x.id], quando = rc_data_(x.data), obs = String(x.obs || '').replace(/\s*\n\s*/g, ' ').trim();
    if (!it.ok) {
      vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'put', payload: { state: 'complete' } }, token);
      it.ok = true; feitos++;
    }
    var atr = rc_atraso_(it.due, quando);
    var atrTxt = atr === null ? '' : (atr > 0 ? ' · **' + atr + ' d.u. de atraso**' : (atr < 0 ? ' · ' + (-atr) + ' d.u. antes' : ' · no prazo'));
    linhas.push('✔ ' + String(it.nome).split(/\s+-\s+/)[0] + ' — ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM') + atrTxt + (obs ? ' · 📝 ' + obs : ''));
    var partes = String(it.nome).split(/\s+-\s+/);
    var ehPg = /^PAGAS/.test(it.lista);
    evs.push({ peca: partes[0], particular: it.lista === 'PAGAS PARTICULAR', fornecedor: ehPg && partes.length >= 2 ? partes[1] : (/^FORNECIMENTO/.test(it.lista) ? 'SEGURADORA (FO)' : ''),
      valor: ehPg ? vd_valorNum_(((partes[2] || '').match(/[\d.]+(?:,\d{1,2})?/) || [''])[0]) : '',
      previsao: it.due || '', dias: atr === null ? '' : atr,
      detalhe: 'chegou ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM/yyyy') + (atr === null ? '' : ' · atraso ' + atr + ' d.u.') + (obs ? ' · ' + obs : '') + ' · ' + it.lista });
  });

  // anexos: nome diz a quais peças se referem
  var nAnexos = 0, nomesAnexos = [];
  var anexosCard = anexos.length ? ax_anexos_(card.id, token) : [], placaCard = ax_placa_(card);
  var foLista = []; try { foLista = fo_lista_(); } catch (e) {}
  anexos.forEach(function (a) {
    try {
      var f = vdf_arquivoTemp_(a.fileId);
      var refs = (a.ids || []).map(function (id) { return porId[id] ? String(porId[id].nome).split(/\s+-\s+/)[0] : ''; }).filter(String);
      // fornecedor das peças marcadas (sufixo " - FORNECEDOR" do item), para o nome do anexo
      var forns = [];
      (a.ids || []).forEach(function (id) {
        if (!porId[id]) return;
        var nm = String(porId[id].nome), fo = nm.slice(pv_baseFo_(nm, foLista).length).replace(/^\s+-\s+/, '').split(/\s+[-—]\s+/)[0].trim();
        if (fo && !/\d{4,}/.test(fo) && forns.indexOf(fo) < 0) forns.push(fo);
      });
      var ehNf = /pdf|xml/i.test(f.getMimeType() || '') || /\.(pdf|xml)$/i.test(f.getName());
      // nome padronizado (05/10/2026): "📦 NF 12345 · PLACA · MARAJO · dd/MM" / "📸 · PLACA · recebimento · dd/MM"
      var nome = ehNf
        ? ax_nome_(AX.NF + (function () { var n = ax_numeroNf_(f); return n ? ' ' + n : ''; })(), placaCard, [forns.join(', ') || refs.slice(0, 2).join(', ')])
        : ax_nome_(AX.FOTO, placaCard, ['recebimento', forns.join(', ') || refs.slice(0, 2).join(', ')]);
      var at = vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: { file: f.getBlob(), name: nome } }, token);
      if (at && at.id) { nome = ax_batizar_(card.id, at.id, nome, anexosCard, token, { semVersao: !ehNf, nomeAtual: nome }); anexosCard.push({ id: at.id, name: nome, date: new Date().toISOString() }); }
      f.setTrashed(true);
      nAnexos++; nomesAnexos.push(nome);
    } catch (e) { console.log('recebimento/anexo: ' + e); }
  });

  var pend = todos.filter(function (i) { return !i.ok; });
  var movido = '';
  // só fecha o card se ele estiver em FALTA CHEGAR (peça da oficina ainda em cotação/compra não fica para trás)
  try { movido = rc_reavaliarColuna_(card.id, token, me.username); } catch (e) { console.log('recebimento/coluna: ' + e); }
  try {
    var geral = String(p.geral || '').trim();
    var txt = '📦 **RECEBIMENTO** — ' + me.fullName + (movido ? ' → **' + movido + '**' : '') + '\n' + (linhas.length ? linhas.join('\n') : '_(só anexos)_') +
      (nAnexos ? '\n📎 ' + nAnexos + ' anexo(s)' : '') +
      (geral ? '\n📝 ' + geral : '') +
      (pend.length ? '\n⏳ Falta chegar: ' + pend.map(function (i) { return i.nome.split(/\s+-\s+/)[0]; }).join(', ') : '\n✅ Tudo recebido.');
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } }, token);
  } catch (e) {}
  try { ev_registrar_('RECEBIMENTO', card, me.username, evs.length ? evs : null, { detalhe: nAnexos ? nAnexos + ' anexo(s)' : '' }); } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: feitos, anexos: nAnexos, faltam: pend.length, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

// Recebimento.gs:137
function rc_reavaliarColuna_(cardOuId, token, usuario) {
  var id = typeof cardOuId === 'string' ? cardOuId : cardOuId.id;
  var card = vd_api_('/cards/' + id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state' } });
  if (vdf_cardProtegido_(card.name)) return '';
  // item FO com o mesmo código de uma peça da oficina: sai do checklist (a oficina venceu) antes de avaliar a coluna (07/10/2026)
  try {
    var foFora = cp_foNaOficina_(card, token, usuario ? '@' + usuario : '');
    if (foFora.length) card = vd_api_('/cards/' + id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state' } });
  } catch (e) { console.log('FO na oficina: ' + e); }
  var ctx = vd_contexto_(), lista = vdf_nomeLista_(ctx, card.idList);
  var itens = vdf_itensRecebimento_(card), pend = itens.filter(function (i) { return !i.ok; });
  var alvo = '';
  if (lista === VDF_LISTA_CHEGAR && itens.length && !pend.length) alvo = RC.LISTA_FIM;
  else if (lista === VDF_LISTA_AUTORIZADO) {
    // toda peça autorizada já está no PAGAS (ex.: a não autorizada foi removida do pedido)
    var anA = vd_analisar_(card.desc, card.name), autsA = vd_autorizacoesDaDescricao_(card.desc, anA.pecas);
    var pagas = vdf_itensPagas_(card);
    if (autsA.length && autsA.every(function (a) { return pagas.some(function (n) { return vd_casaItem_(n, a.chave); }); })) alvo = VDF_LISTA_CHEGAR;
  }
  else if ((lista === RC.LISTA_FIM || lista === 'ENTREGUES') && pend.length) alvo = VDF_LISTA_CHEGAR;
  // sem peça da oficina para comprar (só FO, ou tudo marcado 🚫 não comprar) em qualquer coluna antes da compra:
  // não tem o que cotar/autorizar -> FALTA CHEGAR (FO pendente) ou ENCERRADO (nada a receber). 05/10/2026 (QPG1B84)
  var soFo = '';
  if (!alvo && [VD.LISTA_COTACAO, VD.LISTA_FALTA, VDF_LISTA_FINALIZADA, VDF_LISTA_PENDENTE, VDF_LISTA_AUTORIZADO].indexOf(lista) >= 0 &&
      itens.every(function (i) { return /^FORNECIMENTO/.test(i.lista); }) && !vd_legado_(card.id)) {   // card antigo (sem descrição do formulário) não é mexido
    var an = vd_analisar_(card.desc, card.name);
    if (!an.pecas.length && (itens.length || (an.naoComprar || []).length)) {
      alvo = pend.length ? VDF_LISTA_CHEGAR : RC.LISTA_FIM;
      soFo = 'sem peça para a oficina comprar' + ((an.naoComprar || []).length ? ' (' + an.naoComprar.length + ' marcada(s) 🚫 não comprar)' : '') +
        (pend.length ? ' · ' + pend.length + ' peça(s) da seguradora para chegar' : (itens.length ? ' · fornecimento todo recebido' : ' · nada a receber'));
    }
  }
  if (!alvo || !ctx.listas[alvo]) return '';
  var movido = vdf_moverPara_(card, ctx, alvo, token, usuario || 'robô');
  if (movido && lista !== VDF_LISTA_CHEGAR) {
    try {
      vd_comentar_(card, '↪️ Card → **' + movido + '** (' + (soFo || (alvo === VDF_LISTA_CHEGAR ? pend.length + ' peça(s) para chegar' : 'tudo recebido')) + ').');
    } catch (e) {}
  }
  return movido;
}

// Seguranca.gs:12
function vdf_limparTexto_(s) {
  return String(s).replace(/[\r\n\u2028\u2029]+/g, ' / ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\s{2,}/g, ' ');
}

// Seguranca.gs:15
function vdf_limparObj_(o, prof) {
  if (prof > 6 || o === null || o === undefined) return o;
  if (typeof o === 'string') return vdf_limparTexto_(o);
  if (Array.isArray(o)) return o.map(function (x) { return vdf_limparObj_(x, prof + 1); });
  if (typeof o === 'object') { Object.keys(o).forEach(function (k) { if (k !== 'base64') o[k] = vdf_limparObj_(o[k], prof + 1); }); }
  return o;
}

// Seguranca.gs:24
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

// Seguranca.gs:40
function vdf_arquivoTemp_(fid) {
  var f = DriveApp.getFileById(String(fid || ''));
  var pasta = vdf_pastaTemp_().getId(), it = f.getParents();
  while (it.hasNext()) if (it.next().getId() === pasta) return f;
  throw new Error('arquivo fora da pasta do formulário: ' + fid);
}

// Seguranca.gs:48
function sg_celula_(v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }

// Seguranca.gs:65
function vd_viradaMs_() {
  var p = PropertiesService.getScriptProperties(), k = 'VD_VIRADA_EM_' + vd_board_(), v = p.getProperty(k);
  if (!v) { v = String(Date.now()); p.setProperty(k, v); }
  return +v;
}

// Seguranca.gs:70
function vd_legado_(cardId) {
  cardId = String(cardId || '');
  if (!/^[0-9a-f]{24}$/.test(cardId)) return false;
  if (parseInt(cardId.slice(0, 8), 16) * 1000 >= vd_viradaMs_()) return false;
  var cmp = vd_completasTodas_()[cardId];
  return !cmp;
}

// TravaChecklist.gs:19
function ck_licenca_(caminho, payload) {
  var ids = [], m;
  if ((m = caminho.match(/^\/cards\/([^\/?]+)\/(checkItem|checklists)/))) ids.push(m[1]);
  if ((m = caminho.match(/^\/checklists\/([^\/?]+)/))) ids.push(m[1]);
  if (/^\/checklists\/?(\?|$)/.test(caminho) && payload && payload.idCard) ids.push(payload.idCard);
  if (!ids.length) return;
  try {
    var c = CacheService.getScriptCache(), agora = Date.now(), atual = c.getAll(ids.map(function (i) { return 'ck_' + i; })), novo = {};
    ids.forEach(function (i) {
      var l = []; try { l = JSON.parse(atual['ck_' + i] || '[]'); } catch (e) {}
      l.push(agora); novo['ck_' + i] = JSON.stringify(l.slice(-40));
    });
    c.putAll(novo, 1800);
  } catch (e) { console.log('licença checklist: ' + e); }
}

// Validacao.gs:38
function vd_prop_(k, padrao) {
  var v = PropertiesService.getScriptProperties().getProperty(k);
  return (v === null || v === '') ? padrao : v;
}

// Validacao.gs:42
function vd_board_() { return vd_prop_('VD_BOARD', VD.BOARD_PADRAO); }

// Validacao.gs:43
function vd_modo_() { return vd_prop_('VD_MODO', 'ATIVO'); }

// Validacao.gs:44
function vd_ligado_() { return vd_prop_('VD_LIGADO', 'SIM') !== 'NAO'; }

// Validacao.gs:53
function vd_cred_() {
  var p = PropertiesService.getScriptProperties();
  return { key: p.getProperty('TRELLO_KEY'), token: p.getProperty('TRELLO_TOKEN') };
}

// Validacao.gs:58
function vd_auth_(tokenUsuario) {
  var c = vd_cred_();
  return 'OAuth oauth_consumer_key="' + c.key + '", oauth_token="' + (tokenUsuario || c.token) + '"';
}

// Validacao.gs:64
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

// Validacao.gs:104
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

// Validacao.gs:167
function vd_nomeColuna_(n) {
  var s = String(n || '').trim().toUpperCase();
  if (/^FALTA DADOS PARA COTA/.test(s)) return 'FALTA DADOS PARA COTAR';
  return s;
}

// Validacao.gs:175
function vd_limpar_(s) {
  return String(s || '')
    .replace(/\\([\\\x60*_{}\[\]()#+\-.!|>~])/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/ /g, ' ')
    .split('\n').map(function (l) { return l.replace(/^[\s*_]+/, '').replace(/[\s*_]+$/, ''); }).join('\n');
}

// Validacao.gs:183
function vd_semAcento_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

// Validacao.gs:188
function vd_dividir_(desc) {
  var linhas = String(desc || '').split('\n');
  for (var i = 0; i < linhas.length; i++) {
    if (/^\s*[\\*_]*={2,}\s*COTA[ÇC][ÃA]O/i.test(vd_limpar_(linhas[i]))) {
      return { bloco: linhas.slice(0, i).join('\n'), resto: linhas.slice(i).join('\n'), temMarcador: true };
    }
  }
  return { bloco: String(desc || ''), resto: '', temMarcador: false };
}

// Validacao.gs:198
function vd_campo_(txt, rotulos) {
  var re = new RegExp('^\\s*(?:' + rotulos + ')\\s*[:\\-–]\\s*(.*)$', 'im');
  var m = vd_limpar_(txt).match(re);
  return m ? m[1].trim() : '';
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

// Validacao.gs:226
function vd_placaValida_(p) {
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(vd_normPlaca_(p));
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

// Validacao.gs:242
function vd_anoValido_(a) {
  var anos = String(a || '').match(/(19[89]\d|20[0-4]\d)/g);
  return !!anos;
}

// Validacao.gs:247
function vd_tipoNorm_(t) {
  var s = vd_semAcento_(t).replace(/[^A-Z]/g, '');
  if (!s) return '';
  if (/^GENUIN/.test(s)) return 'GENUÍNO';
  if (/^ORIGINAL/.test(s)) return 'ORIGINAL';
  if (/^PARALEL/.test(s)) return 'PARALELO';
  if (/^USAD/.test(s)) return 'USADO';
  return '?' + String(t).trim();
}

// Validacao.gs:257
function vd_tipoNormPedido_(t) {
  var s = vd_semAcento_(t).replace(/[^A-Z]/g, '');
  if (/^PART/.test(s)) return 'PARTICULAR';
  if (/^SEG/.test(s)) return 'SEGURADORA';
  return '';
}

// Validacao.gs:264
function vd_categPneu_(t) {
  var s = vd_semAcento_(t).replace(/\s+/g, ' ').trim();
  if (/^IMPORTAD/.test(s)) return 'IMPORTADO';
  if (/^1\s*[AªºO°]?\.?\s*LINHA|^PRIMEIRA LINHA/.test(s)) return '1ª LINHA';
  return '';
}

// Validacao.gs:271
function vd_medidaPneu_(m) {
  return /\d{3}\s*\/\s*\d{2}\s*Z?R?\s*\d{2}/i.test(String(m || ''));
}

// Validacao.gs:285
function vd_sigItem_(linha) {
  // "| ORÇ R$ x" (valor da peça no orçamento) e "| OBS: texto" (observação do consultor) não entram na assinatura: informativos, não travam nem contam como peça nova
  return vd_semAcento_(vd_limpar_(linha)).replace(/\s*\|\s*ORC\.?\s*R?\$?\s*[\d.,]+/gi, '').replace(/\s*\|\s*OBS\.?\s*[:\-]\s*[^|]*/gi, '').replace(/^\s*(?:\d+\s*[.)\-]|[-•*])\s*/, '').replace(/\s*\|\s*/g, '|').replace(/\s+/g, ' ').trim();
}

// Validacao.gs:292
function vd_pkH_(sig) {
  sig = String(sig || '');
  if (/^#[A-Za-z0-9+\/]{9}$/.test(sig)) return sig;
  return '#' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, sig, Utilities.Charset.UTF_8)).slice(0, 9);
}

// Validacao.gs:297
function vd_pkSet_(cardId, sigs) { PropertiesService.getScriptProperties().setProperty('VD_PK2_' + cardId, JSON.stringify((sigs || []).map(vd_pkH_))); }

// Validacao.gs:300
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

// Validacao.gs:315
function vd_linhasPecas_(bloco) {
  var linhas = vd_limpar_(bloco).split('\n');
  var ini = -1;
  for (var i = 0; i < linhas.length; i++) {
    if (/^\s*PE[ÇC]AS\s*:?\s*$/i.test(linhas[i])) { ini = i + 1; break; }
  }
  var out = { achouBloco: ini >= 0, linhas: [], idx: [], semOficina: false };   // idx = nº da linha no bloco (para reescrever)
  if (ini < 0) return out;
  for (var j = ini; j < linhas.length; j++) {
    var l = linhas[j].trim();
    if (!l) { if (out.linhas.length) break; continue; }
    if (/^(OBS|OBSERVA[ÇC][ÃA]O|PEDIDO ENVIADO|↳|FORNECIMENTO|FO\b|DADOS DO CARRO|-{3,}|={3,})/i.test(l)) break;
    if (/^NENHUMA PE[ÇC]A/i.test(l)) { out.semOficina = true; break; }
    l = l.replace(/^\s*(?:\d+\s*[.)\-]|[-•*])\s*/, '');
    if (l) { out.linhas.push(l); out.idx.push(j); }
  }
  return out;
}

// Validacao.gs:339
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
  // marcar/desmarcar "| COMPLEMENTO dd/mm" numa peça que já existia não é peça nova (07/10/2026, Weslley): o card não volta a cotar
  var semComp = function (s) { return String(s || '').replace(/\|COMPLEMENTO(?: \d{1,2}\/\d{1,2})?(?=\||$)/g, ''); };
  var baseSem = base.map(semComp);
  var pecas = [], novas = [], naoComprar = [];
  lp.linhas.forEach(function (l) {
    var p = vd_analisarPeca_(l, pecas.length + 1, { codigoOpcional: particular });
    if (particular) p.particular = true;
    p.sig = vd_sigItem_(l);
    // "NÃO COMPRAR": fica só de registro — fora de cotação, autorização, compra, totais e coluna (como se não existisse)
    if (p.naoComprar) { naoComprar.push(p); return; }
    pecas.push(p);
    if (baseSem.indexOf(semComp(p.sig)) < 0) novas.push(p);
  });
  if (!modoNova && !pecas.length && !naoComprar.length && !lp.semOficina) {
    faltas.push('lista de peças no padrão (use o formulário ou escreva "PEÇAS:" e uma peça por linha: CÓDIGO | DESCRIÇÃO | TIPO)');
  }
  (modoNova ? novas : pecas).forEach(function (p) { p.faltas.forEach(function (f) { faltas.push(f); }); });

  return { dados: d, pecas: pecas, novas: novas, naoComprar: naoComprar, faltas: faltas, div: div, doOrcamento: doOrcamento };
}

// Validacao.gs:405
function vd_analisarPeca_(linha, n, opts) {
  opts = opts || {};
  var partes = linha.split('|').map(function (s) { return s.trim(); });
  var qtd = '', part = false, partPor = '', comp = false, compData = '', nao = false, naoMotivo = '', valorOrc = '', obs = '';
  partes = partes.filter(function (s) {
    var m = s.match(/^QTD\.?\s*:?\s*(\d+)$/i);
    if (m) { qtd = m[1]; return false; }
    // observação do consultor sobre a peça (06/10/2026): "OBS: fotos em anexo" — informativa, vai para o comprador
    var mo = s.match(/^OBS\.?\s*[:\-–]\s*(.+)$/i);
    if (mo) { obs = mo[1].trim(); return false; }
    // valor líquido unitário da peça no orçamento da seguradora: "ORÇ R$ 1.234,56" (informativo; base da comparação com a cotação)
    var mv = s.match(/^OR[ÇC]\.?\s*:?\s*R?\$?\s*([\d.]+,\d{2}|\d+(?:\.\d{1,2})?)$/i);
    if (mv) { valorOrc = mv[1]; return false; }
    // peça do orçamento que NÃO vai ser comprada (consultor decidiu: recuperar, cliente já tem...): fica só de registro
    var mn = s.match(/^N[ÃA]O COMPRAR(?:\s*[:\-–]\s*(.*))?$/i);
    if (mn) { nao = true; naoMotivo = (mn[1] || '').trim(); return false; }
    // peça de orçamento complementar: "COMPLEMENTO dd/mm"
    var mc = s.match(/^COMPLEMENTO(?:\s+(\d{1,2}\/\d{1,2}))?$/i);
    if (mc) { comp = true; compData = mc[1] || ''; return false; }
    // peça particular dentro de pedido de seguradora (cliente paga): "PARTICULAR @consultor"
    var mp = s.match(/^PARTICULAR(?:\s*@\s*([\w.\-]+))?$/i);
    if (mp) { part = true; partPor = (mp[1] || '').toLowerCase(); return false; }
    return true;
  });
  if (part) opts = { codigoOpcional: true };
  if (nao) opts = { codigoOpcional: true };   // não vai ser comprada: não cobra código nem tipo
  var faltas = [];
  var rot;
  if (/^PNEUS?$/i.test(partes[0] || '')) {
    var medida = partes[1] || '', catMarca = partes[2] || '';
    rot = 'item ' + n + ' (PNEU ' + (medida || '?') + ')';
    if (!medida) faltas.push(rot + ': falta a medida');
    else if (!vd_medidaPneu_(medida)) faltas.push(rot + ': medida fora do padrão (ex.: 195/65R15)');
    if (!catMarca && !nao) faltas.push(rot + ': falta categoria (IMPORTADO / 1ª LINHA) ou marca');
    if (nao) faltas = [];
    return { pneu: true, medida: medida, categoria: vd_categPneu_(catMarca), marca: vd_categPneu_(catMarca) ? '' : catMarca, qtd: qtd, particular: part, partPor: partPor, complemento: comp, compData: compData, naoComprar: nao, naoMotivo: naoMotivo, valorOrc: valorOrc, obs: obs, faltas: faltas, texto: linha };
  }
  var codigo = partes[0] || '', descr = partes[1] || '', tiposTxt = partes.slice(2).join('/');
  rot = 'item ' + n + ' (' + (descr || codigo || linha).slice(0, 40) + ')';
  if (partes.length < 2) {
    faltas.push(rot + ': fora do padrão CÓDIGO | DESCRIÇÃO | TIPO');
    return { pneu: false, codigo: '', descricao: linha, tipos: [], qtd: qtd, particular: part, partPor: partPor, complemento: comp, compData: compData, naoComprar: nao, naoMotivo: naoMotivo, valorOrc: valorOrc, obs: obs, faltas: faltas, texto: linha };
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
  if (nao) faltas = [];
  return { pneu: false, codigo: codigo, descricao: descr, tipos: tipos, qtd: qtd, particular: part, partPor: partPor, complemento: comp, compData: compData, naoComprar: nao, naoMotivo: naoMotivo, valorOrc: valorOrc, obs: obs, faltas: faltas, texto: linha };
}

// Validacao.gs:465
function vd_linhaPeca_(p, i) {
  var q = (p.qtd && +p.qtd > 1 ? ' | QTD ' + p.qtd : '') + (p.complemento && !p.particular ? ' | COMPLEMENTO' + (p.compData ? ' ' + p.compData : '') : '') + (p.particular ? ' | PARTICULAR' + (p.partPor ? ' @' + p.partPor : '') : '')
    + (p.naoComprar ? ' | NÃO COMPRAR' + (p.naoMotivo ? ': ' + String(p.naoMotivo).replace(/\|/g, '/').trim() : '') : '')
    + (vd_valorOrcTxt_(p.valorOrc) ? ' | ORÇ ' + vd_valorOrcTxt_(p.valorOrc) : '')
    + (p.obs ? ' | OBS: ' + String(p.obs).replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim() : '');
  if (p.pneu) return (i + 1) + '. PNEU | ' + p.medida + ' | ' + (p.categoria || p.marca) + q;
  return (i + 1) + '. ' + p.codigo + ' | ' + p.descricao + ' | ' + (p.tipos || []).join('/') + q;
}

// Validacao.gs:475
function vd_valorOrcTxt_(v) {
  if (v == null || v === '') return '';
  var n = typeof v === 'number' ? v : vd_valorNum_(v);
  return isNaN(n) || n <= 0 ? '' : vd_valorBR_(n);
}

// Validacao.gs:482
function vd_economiaOrc_(valorOrc, valorCot) {
  var o = typeof valorOrc === 'number' ? valorOrc : vd_valorNum_(valorOrc), c = typeof valorCot === 'number' ? valorCot : vd_valorNum_(valorCot);
  if (isNaN(o) || isNaN(c) || o <= 0 || c < 0) return null;
  var pct = (o - c) / o * 100;
  return { pct: Math.round(pct * 10) / 10, nivel: pct < 20 ? 'ruim' : (pct <= 30 ? 'medio' : 'bom') };
}

// Validacao.gs:490
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

// Validacao.gs:522
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

// Validacao.gs:537
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

// Validacao.gs:633
function vd_anexoLegivel_(a) {
  return !!a && a.isUpload && (a.bytes || 0) <= VD.MAX_BYTES_ANEXO &&
    (/pdf|image\/(jpe?g|png|webp|gif)/i.test(a.mimeType || '') || /\.(pdf|jpe?g|png)$/i.test(a.name || ''));
}

// Validacao.gs:647
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
      // tipo do documento para o nome padronizado do anexo (05/10/2026): "Status do Pedido" do Cilia = fornecimento
      if (!orc.origem) {
        var nt = vd_normTexto_(texto);
        if (/STATUS DO PEDIDO|PREVISAO DE ENTREGA/.test(nt)) { r.doc = 'FO'; r.docNome = 'Status do Pedido Cilia'; }
        else if (/PECAS DO SINISTRO|PECAS DO LAUDO/.test(nt)) { r.doc = 'FO'; r.docNome = 'Peças HDI'; }   // portal HDI (07/10/2026)
      }
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

// Validacao.gs:704
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

// Validacao.gs:723
function vd_lerAnexosCard_(card, placa, prazo, batizar) {
  var anexos = (card.attachments || []).filter(vd_anexoLegivel_).slice(0, VD.MAX_ANEXOS_CARD);

  var achados = [];
  for (var i = 0; i < anexos.length; i++) {
    if (Date.now() > prazo) break;
    var r = vd_lerAnexoTrello_(anexos[i]);
    if (!r) continue;
    // orçamento/Status do Pedido subido à mão: ganha o nome padronizado ("📄 ORÇ · PLACA · …", 05/10/2026)
    if (batizar && card.id && !anexos[i]._batizado) { anexos[i]._batizado = true; ax_batizarLido_(card, anexos[i], r, false); }
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

// Validacao.gs:790
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

// Validacao.gs:836
function tr_hash_(desc) {
  var s = String(desc || '').replace(/\s+$/, '');
  var h = 0;
  for (var i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (h >>> 0) + ':' + s.length;
}

// Validacao.gs:843
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

// Validacao.gs:856
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

// Validacao.gs:885
function tr_marcarRecente_(cardId, h) {
  try {
    var cache = CacheService.getScriptCache(), k = 'tr_rec_' + cardId, lista = [];
    try { lista = JSON.parse(cache.get(k) || '[]'); } catch (e) {}
    lista = lista.filter(function (x) { return x !== h; }).concat([h]).slice(-12);
    cache.put(k, JSON.stringify(lista), 21600);
  } catch (e) { console.log('trava/recentes: ' + e); }
}

// Validacao.gs:899
function tr_guardar_(cardId, desc) { tr_guardarLote_([{ id: cardId, desc: desc }]); }

// Validacao.gs:912
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

// Validacao.gs:939
function vd_redesenhar_(cardId, token) {
  var desc = vd_completa_(cardId);
  if (!desc) desc = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'desc' } }).desc || '';
  vd_gravarDesc_(cardId, desc, token);
}

// Validacao.gs:1028
function du_pad_(n) { return (n < 10 ? '0' : '') + n; }

// Validacao.gs:1029
function du_chave_(d) { return d.getFullYear() + '-' + du_pad_(d.getMonth() + 1) + '-' + du_pad_(d.getDate()); }

// Validacao.gs:1032
function du_pascoa_(a) {
  var b = Math.floor(a / 100), c = a % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  var g = Math.floor((b - f + 1) / 3), h = (19 * (a % 19) + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor(((a % 19) + 11 * h + 22 * l) / 451);
  var mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(a, mes - 1, dia, 12);
}

// Validacao.gs:1040
function du_lerProp_(nome) {
  var out = [];
  String(vd_prop_(nome, '') || '').split(/[,;\s]+/).forEach(function (t) {
    var m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/) || t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return;
    out.push(m[1].length === 4 ? m[1] + '-' + m[2] + '-' + m[3] : m[3] + '-' + du_pad_(+m[2]) + '-' + du_pad_(+m[1]));
  });
  return out;
}

// Validacao.gs:1051
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

// Validacao.gs:1064
function du_ehUtil_(d) {
  var w = d.getDay();
  if (w === 0 || w === 6) return false;
  return !du_feriados_(d.getFullYear())[du_chave_(d)];
}

// Validacao.gs:1071
function du_somarUteis_(dias, base) {
  var n = parseInt(dias, 10) || 0, h = base ? new Date(base) : new Date();
  if (isNaN(h.getTime())) h = new Date();
  var d = new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12, 0, 0);
  if (vd_prop_('VD_DIAS_UTEIS', 'SIM') === 'NAO') { d.setDate(d.getDate() + n); return d.toISOString(); }
  var guarda = 0;
  while (n > 0 && guarda++ < 400) { d.setDate(d.getDate() + 1); if (du_ehUtil_(d)) n--; }
  return d.toISOString();
}

// Validacao.gs:1095
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

// Validacao.gs:1107
function vd_backup_(card, motivo) {
  vd_planilhaBackup_().appendRow([new Date(), vd_board_(), card.name, card.shortUrl || card.url, motivo, card.desc]);
}

// Validacao.gs:1128
function vd_criador_(cardId) {
  // quem criou o card não muda: cache de 6 h (06/10/2026 — era 1 chamada a cada abertura do formulário e a cada comentário do robô)
  var cache = null, k = 'vd_criador_' + cardId;
  try { cache = CacheService.getScriptCache(); var c = cache.get(k); if (c !== null) return c; } catch (e) {}
  var quem = '';
  try {
    var acts = vd_api_('/cards/' + cardId + '/actions', {
      query: { filter: 'createCard,copyCard,moveCardToBoard,emailCard,convertToCardFromCheckItem', limit: 50, memberCreator_fields: 'username,fullName' }
    });
    if (acts && acts.length) {
      var a = acts[acts.length - 1];
      if (a.memberCreator) quem = a.memberCreator.username;
    }
    try { if (cache && quem) cache.put(k, quem, 21600); } catch (e2) {}
  } catch (e) {}
  return quem;
}

// Validacao.gs:1149
function vd_agruparTipo_(faltas) {
  var nums = [], outras = [];
  faltas.forEach(function (f) {
    var m = f.match(/^item (\d+) \(.*\): falta o tipo de peça/);
    if (m) nums.push(m[1]); else outras.push(f);
  });
  if (nums.length < 2) return faltas;
  return outras.concat(['falta marcar o tipo de peça (GENUÍNO, ORIGINAL, PARALELO ou USADO) nos itens ' + nums.join(', ')]);
}

// Validacao.gs:1159
function vd_anosSeCruzam_(a, b) {
  var x = String(a || '').match(/(19|20)\d\d/g) || [], y = String(b || '').match(/(19|20)\d\d/g) || [];
  if (!x.length || !y.length) return true;
  return x.some(function (v) { return y.indexOf(v) >= 0; });
}

// Validacao.gs:1165
function vd_comentar_(card, txt) {
  vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } });
}

// Validacao.gs:1169
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

// Validacao.gs:1181
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
    lido = vd_lerAnexosCard_(card, d.placa, ctx.prazo, ctx.modoAtivo);
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

// Validacao.gs:1354
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

// Validacao.gs:1400
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
    // peça da oficina com o mesmo código de um item FO pendente: o item FO sai (07/10/2026, RHM1J09)
    if (ctx.modoAtivo && /FORNECIMENTO/i.test(div.bloco)) {
      try {
        var cFo = vd_api_('/cards/' + card.id, { query: { fields: 'name,desc', checklists: 'all', checkItem_fields: 'name,state' } });
        if (cp_foNaOficina_(cFo, null, 'robô').length) { try { rc_reavaliarColuna_(card.id, null, ''); } catch (e) {} }
      } catch (e) { console.log('FO na oficina: ' + e); }
    }
    // peça da oficina sem cotação num card que já andou (deixou de ser "não comprar", passou de FO para oficina…):
    // volta para EM COTAÇÃO — só em card que já teve cotação/compra de verdade (06/10/2026, QPG1B84)
    var semCot = [];
    try { if (vd_cotacoesDaDescricao_(card.desc, vd_analisar_(card.desc, card.name).pecas).cotacoes.length || vd_comprasDaDescricao_(card.desc).length) semCot = vd_pecasSemCotacao_(card); } catch (e) {}
    if (semCot.length) {
      res.acao = 'peça sem cotação → volta para EM COTAÇÃO';
      if (ctx.modoAtivo) {
        var nomeL = ''; Object.keys(ctx.listas).forEach(function (k) { if (ctx.listas[k] === card.idList) nomeL = k; });
        vd_mover_(card, ctx.listas[VD.LISTA_COTACAO], 'top');
        vd_comentar_(card, '🆕 **PEÇA SEM COTAÇÃO** (estava em ' + nomeL + ') → **EM COTAÇÃO**: ' + semCot.join('; '));
        props.setProperty('VD_SIG_' + card.id, 'OK');
      }
      return res;
    }
    res.acao = res.pagas ? 'pagas' : 'sem peça nova';
    return res;
  }

  // linha "NÃO COMPRAR" (registro, fora do fluxo) não é peça nova
  novas = novas.filter(function (l) { return !/\|\s*N[ÃA]O COMPRAR\b/i.test(l); });
  if (!novas.length) { vd_pkSet_(card.id, sigs); res.acao = res.pagas ? 'pagas' : 'sem peça nova'; return res; }
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

// Validacao.gs:1492
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

// Validacao.gs:1524
function vd_marcar_(card) {
  try { cf_sincronizar_(card.id); } catch (e) {}   // campos personalizados antes de marcar (a gravação mexe na atividade)
  try {
    var atual = vd_api_('/cards/' + card.id, { query: { fields: 'dateLastActivity,idList' } });
    PropertiesService.getScriptProperties().setProperty('VD_AT_' + card.id, atual.dateLastActivity + '|' + atual.idList);
  } catch (e) {}
}

// Validacao.gs:1652
function vd_fixarTopo_(idLista, token) {
  try {
    var g = String(PropertiesService.getScriptProperties().getProperty('VD_FIXO') || '').split('|');
    if (g[0] && g[1] === idLista) vd_api_('/cards/' + g[0], { method: 'put', payload: { pos: 'top' } }, token);
  } catch (e) { console.log('fixar topo: ' + e); }
}

// Validacao.gs:1851
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

// Validacao.gs:2097
function vd_vitrineLigada_() { return vd_prop_('VD_VITRINE', 'SIM') !== 'NAO'; }

// Validacao.gs:2100
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

// Validacao.gs:2116
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

// Validacao.gs:2130
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

// Validacao.gs:2142
function vd_tit_(s) { s = String(s || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }

// Validacao.gs:2143
function vd_md_(s) { return String(s || '').replace(/([\\`*_\[\]#>|~])/g, '\\$1'); }

// Validacao.gs:2149
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
  // economia da cotação sobre o valor líquido do orçamento (faixas do Weslley, 05/10/2026): 🟢 > 30% · 🟡 20–30% · 🔴 < 20% ou mais caro
  var ecoTxt = function (p, q) {
    var e = q && q.valor != null ? vd_economiaOrc_(p.valorOrc, q.valor) : null;
    if (!e) return '';
    return ' · ' + (e.nivel === 'bom' ? '🟢' : (e.nivel === 'medio' ? '🟡' : '🔴')) + ' ' + (e.pct >= 0 ? '−' : '+') + Math.abs(e.pct).toFixed(0) + '%';
  };

  L.push('');
  if (!an.pecas.length) L.push((an.naoComprar || []).length ? '_Nenhuma peça para comprar pela oficina._' : '_Sem peças pela oficina._');
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
    var cab = (i + 1) + '. **' + vd_md_(titulo) + '**' + (!p.pneu && p.codigo ? ' · ' + vd_md_(p.codigo) : '') + (p.qtd && +p.qtd > 1 ? ' · QTD ' + p.qtd : '') + (p.particular && d.tipo !== 'PARTICULAR' && !misto ? ' · 👤 PARTICULAR' : '') + (p.complemento && !p.particular ? ' · ➕ complemento' + (p.compData ? ' ' + p.compData : '') : '')
      + (vd_valorOrcTxt_(p.valorOrc) ? ' · 📄 orç. ' + vd_valorOrcTxt_(p.valorOrc) : '');
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
      sub.push('✅ ' + vd_md_([fornTxt(aut.fornecedor), tipoTxt(qa), vd_valorBR_(aut.valor), prazoTxt(qa)].filter(String).join(' · ')) + ecoTxt(p, aut) + linkTxt(qa));
      // outras cotações da peça (anteriores ou lançadas só de registro depois da autorização, 07/10/2026)
      var outras = minhas.filter(function (q) { return q !== qa; });
      if (outras.length) sub.push('📝 também cotado: ' + outras.slice(0, 4).map(function (q) { return vd_md_([fornTxt(q.fornecedor), vd_valorBR_(q.valor), prazoTxt(q)].filter(String).join(' ')); }).join(' · ') + (outras.length > 4 ? ' · …' : ''));
    } else {
      if (!p.pneu && (p.tipos || []).length) cab += ' _(' + p.tipos.map(vd_tit_).join('/') + ')_';
      if (minhas.length) minhas.forEach(function (q) { sub.push(vd_md_([fornTxt(q.fornecedor), tipoTxt(q), vd_valorBR_(q.valor), prazoTxt(q)].filter(String).join(' · ')) + ecoTxt(p, q) + linkTxt(q)); });
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
  // peças do orçamento que NÃO vão ser compradas (decisão do consultor): só registro
  (an.naoComprar || []).forEach(function (p, j) {
    var tit = p.pneu ? 'PNEU ' + String(p.medida || '').replace(/\s+/g, '') + ((p.marca || p.categoria) ? ' ' + (p.marca || p.categoria) : '') : String(p.descricao || '').toUpperCase();
    L.push((an.pecas.length + j + 1) + '. ~~' + vd_md_(tit) + '~~' + (!p.pneu && p.codigo ? ' · ' + vd_md_(p.codigo) : '') + ' · 🚫 não comprar' + (p.naoMotivo ? ' — _' + vd_md_(p.naoMotivo) + '_' : ''));
  });

  var mFo = bloco.match(/FORNECIMENTO \(SEGURADORA\)\s*:?\s*(\d+)/i);
  if (mFo) L.push('', '📦 Fornecimento da seguradora: ' + mFo[1] + ' peça(s) — checklist FORNECIMENTO');
  var mFoC = bloco.match(/FORNECIMENTO COMPLEMENTO\s*:?\s*(\d+)/i);
  if (mFoC) { var lc = '📦➕ Complemento da seguradora: ' + mFoC[1] + ' peça(s) — checklist FORNECIMENTO COMPLEMENTO'; if (mFo) L.push(lc); else L.push('', lc); }

  // legenda: só dos ícones que aparecem neste card
  var txt = L.join('\n');
  var leg = [['👤', 'peça particular (cliente paga — autoriza o consultor)'], ['➕', 'peça de orçamento complementar'], ['✅', 'autorizada'], ['🛒', 'comprada (✔ marcada no PAGAS)'], ['⏳', 'aguardando cotação'], ['⛔', 'não cotada'], ['🚫', 'não comprar (decisão do consultor)'], ['📝', 'observação'], ['↩️', 'devolvida para cotação'], ['📦', 'peças da seguradora'], ['📄', 'valor líquido da peça no orçamento da seguradora'], ['🟢', 'economia sobre o orçamento: 🟢 acima de 30% · 🟡 20–30% · 🔴 abaixo de 20% ou mais caro']]
    .filter(function (x) { return txt.indexOf(x[0]) >= 0 || (x[0] === '🟢' && /🟡|🔴/.test(txt)); }).map(function (x) { return x[0] + ' ' + x[1]; });
  if (an.pecas.length) leg.push('linhas sem ícone = cotações, da mais barata para a mais cara');
  if (leg.length) txt += '\n\n_' + leg.join(' · ') + ' · histórico nos comentários_';
  return txt;
}

// Validacao.gs:2273
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
