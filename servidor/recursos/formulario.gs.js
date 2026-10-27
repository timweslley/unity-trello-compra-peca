// GERADO AUTOMATICAMENTE por servidor/scripts/extrair-leitores.mjs formulario — NÃO EDITAR À MÃO.
// Código do robô (Apps Script) usado pelo formulário: roda no servidor dentro de um contexto vm com os
// serviços do Google imitados (src/gas/servicos.ts). Raízes: doPost + vdf_*.

// Anexos.gs:14
var AX = { ORC: '📄 ORÇ', ORC_MAIS: '📄 ORÇ+', FO: '🚚 FO', NF: '📦 NF', FOTO: '📸', COMPRA: '🛒 COMPRA', COT: '💬 COTAÇÃO', SEP: ' · ' };

// Anexos.gs:15
var AX_RE_PADRAO = /^((📄 ORÇ\+?|🚚 FO|📦 NF( \d+)?|🛒 COMPRA) · |📸 )/;

// Anexos.gs:328
var AX_MAD_MAX_LEITURAS = 150;

// Campos.gs:12
var CF = {
  CAMPOS: [
    // mesmos nomes do quadro principal (as regras do Butler que põem os membros da unidade esperam estes)
    { nome: 'Unidade', tipo: 'list', opcoes: ['TOLEDO', 'RONDON', 'CASCAVEL', 'MOURÃO'] },
    { nome: 'Seguradora', tipo: 'list', opcoes: ['PARTICULAR', 'RETORNO'] },
    { nome: 'Tipo', tipo: 'list', opcoes: ['SEGURADORA', 'PARTICULAR', 'RETORNO', 'MISTO'] },
    { nome: 'Placa', tipo: 'text' },
    { nome: 'Consultor', tipo: 'text' },
    { nome: 'Total seguradora', tipo: 'number' },
    { nome: 'Total particular', tipo: 'number' },
    { nome: 'Total retorno', tipo: 'number' },
    { nome: 'Total seg+part', tipo: 'number', antigo: 'Total comprado' },
    { nome: 'Nº Ordem', tipo: 'text', naoPreencher: true }
  ]
};

// CiliaApi.gs:42
var CL = {
  ARQUIVO: 'CILIA-HOJE.json',
  PASTA: 'Cilia',
  LIGADO_PADRAO: 'SIM',             // principal: ligado com o OK do Weslley (15/10/2026, "podemos seguir com 1"); CL_LIGADO=NAO desliga
  LISTAS_SILENCIO: /ENTREGUES|ENCERRADO|PEND[ÊE]NCIA/i,   // card já entregue/encerrado: anexa sem comentário (o PDF serve ao faturamento)
  INTERVALO_MS: 15 * 60 * 1000,     // confere se o arquivo mudou no máximo a cada 15 min (fila vazia)
  MAX_POR_RODADA: 6,                // versões tratadas por ciclo (cada uma: PDF do Drive + anexo no Trello + complemento)
  PEND_DIAS: 3,                     // versão sem card aberto: tenta de novo por até 3 dias (o card pode nascer depois)
  VELHO_DIAS: 20,                   // versão autorizada há mais de 20 dias e sem card aberto: não fica pendente
  MAX_FEITOS: 600,
  QUADRO_TESTE: 'ZX4gRmnX',
  TESTE_V: '4',                     // muda a cada teste no TESTE (1 e 2 = Cilia 15/10/2026; 3 e 4 = HDI 15/10/2026 — o 4 registra na aba a espera e o fim)
  TESTE_BASES: ['HDI'],             // bases que o teste da versão atual exercita
  MAX_TESTE: 5,
  ABA_LOG: 'CILIA API'
};

// CiliaApi.gs:59
var CL_BASES = [
  { id: 'CILIA', rot: 'Cilia', arquivo: 'CILIA-HOJE.json', pasta: 'Cilia', pref: 'CL_', padrao: CL.LIGADO_PADRAO, org: 'CILIA', fonte: 'pela API do Cilia', obrigatoria: true },
  { id: 'HDI', rot: 'HDI', arquivo: 'HDI-HOJE.json', pasta: 'HDI', pref: 'CLH_', padrao: 'SIM', org: 'HDI', fonte: 'pelo portal HDI' },   // LIGADA no principal: OK do Weslley 15/10 17h57 ("1 liga"); CLH_LIGADO=NAO desliga
  { id: 'SOMA', rot: 'SOMA', arquivo: 'SOMA-HOJE.json', pasta: 'SOMA', pref: 'CLS_', padrao: 'NAO', org: 'WEBSOMA', fonte: 'pelo Websoma' }
];

// CiliaApi.gs:64
var CL_MEM = { pastas: {}, cards: null, json: {}, arq: {}, ctx: null };

// Código.gs:12
var BOARD_ID = 'oH4TbTqb';

// Código.gs:13
var JANELA_MINUTOS = 60;

// Código.gs:14
var MAX_LINHAS = 12;

// Código.gs:15
var MAX_CHARS_LINHA = 160;

// Código.gs:16
var AGRUPAR_MINUTOS = 10;

// Código.gs:18
var ATRASO_SEGUNDOS = 180;

// Código.gs:61
var LOG_ATE_MS = 0;

// Código.gs:306
var LISTAS_PARADO = ['PENDÊNCIA DE FATURAMENTO', 'PENDÊNCIA TRATADA - FATURAR'];

// Código.gs:307
var DIAS_PARADO = 7;

// Código.gs:308
var LISTA_ENTREGUES = 'ENTREGUES';

// Código.gs:309
var DIAS_ENTREGUES = 5;

// Código.gs:310
var LISTA_FALTA_CHEGAR = 'FALTA CHEGAR';

// Código.gs:311
var LISTA_ENCERRADO = 'ENCERRADO COMPRAS/FORNEC.';

// Código.gs:312
var DIAS_ENCERRADO = 15;

// Código.gs:313
var LBL_PARADO = 'PARADO';

// Código.gs:314
var LBL_CONFERIR = 'CONFERIR FATURAMENTO';

// Código.gs:482
var EMAIL_ALERTA = 'weslley.santos@unitycs.com.br';

// Código.gs:483
var LIMITE_FALHAS = 2;

// Complemento.gs:16
var CP = {
  FO: 'FORNECIMENTO COMPLEMENTO',
  PAGAS: 'PAGAS COMPLEMENTO',
  ESPERA_CRIACAO_MS: 30 * 60 * 1000,   // anexo nos primeiros 30 min do card = orçamento original
  MAX_VISTOS: 400
};

// Complemento.gs:91
var CP_PAL_FRACA = /^(DE|DO|DA|DOS|DAS|COM|SEM|PARA|MOTOR|MANUAL|AUTOMATICO|AUTOMATICA|COMPLETO|COMPLETA|KIT|JOGO|UNIDADE|PCS|PECA)$/;

// Complemento.gs:93
var CP_POSICAO = { DIR: 'D', DIREITO: 'D', DIREITA: 'D', LD: 'D', ESQ: 'E', ESQUERDO: 'E', ESQUERDA: 'E', LE: 'E', DIANT: 'F', DIANTEIRO: 'F', DIANTEIRA: 'F', FRENTE: 'F', TRAS: 'T', TRASEIRO: 'T', TRASEIRA: 'T', SUP: 'S', SUPERIOR: 'S', INF: 'I', INFERIOR: 'I' };

// Complemento.gs:94
var CP_EIXO = { D: 1, E: 1, F: 2, T: 2, S: 3, I: 3 };

// Complemento.gs:127
var CP_NAO_PECA = /\b(REFATURAMENTO|REFATURAR|REEMBOLSO|RESSARCIMENTO|ESTORNO|DIFERENCA DE VALOR|COMPLEMENTO DE VALOR|AJUSTE DE VALOR)\b/;

// Corretivo.gs:12
var CR = {
  CHAVE: 'CR_20261011',
  DIA: '2026-10-11',
  // ordem de execução; cada card registra quando terminou (CR_20261011_OK) — continua no ciclo seguinte se o tempo acabar
  CARDS: [
    { sl: 'Tz8Yl1Ct', placa: 'FOB8723', coluna: 'AUTORIZADO COMPRA',
      motivo: 'a linha «I REFATURAMENTO VALOR DA LANTERNA TRAS DIR» do laudo HDI é ajuste de valor (refaturamento), não peça — saiu da lista' },
    { sl: 'cfPMK7s6', placa: 'BBV0H58', coluna: 'PENDENTE AUTORIZAR', retorno: true,
      motivo: 'card de RETORNO: o PDF do Cilia trouxe as peças do sinistro todo, que já foram compradas no card original — desfeito o complemento e o checklist FORNECIMENTO COMPLEMENTO' },
    { sl: 'PikLFvQH', placa: 'BAT9F19', coluna: 'PENDENTE AUTORIZAR', retorno: true,
      motivo: 'card de RETORNO: o PDF do Cilia trouxe as peças do sinistro todo, que já foram compradas no card original — desfeito o complemento e o checklist FORNECIMENTO COMPLEMENTO' },
    { sl: 's4KyKU83', placa: 'BXZ4J84', hdi: true,
      // laudo HDI / portal HDI (fornecimento) de 11/10: 4 FO da CAR HOUSE (prev. 15/10) + 4 FO novas da própria HDI; da oficina só o aditivo
      foVolta: [
        { codigo: '5382602250', descricao: 'ACABAMENTO DO PARALAMA DIANT ESQ' },
        { codigo: '4806902360', descricao: 'BRACO OSCILANTE DIANT ESQ' },
        { codigo: '5380202320', descricao: 'PARALAMA DIANT ESQ' },
        { codigo: '8954312110', descricao: 'SENSOR DO ABS DA RODA DIANT ESQ' }
      ],
      foVoltaFornecedor: 'CAR HOUSE', foVoltaPrev: '2026-10-15T15:00:00.000Z',
      foNova: [
        { codigo: '8117002U90', descricao: 'FAROL ESQUERDO', fornecedor: 'HDI SEGUROS S/A' },
        { codigo: '7585202911', descricao: 'MOLDURA PRIMER DA SOLEIRA ESQ', fornecedor: 'HDI SEGUROS S/A' },
        { codigo: '52119F2931', descricao: 'PARACHOQUE DIANTEIRO SEM FURO PARA SENSOR', fornecedor: 'HDI SEGUROS S/A' },
        { codigo: '887181E150', descricao: 'TRAVA DO TUBO COMPRESSOR', fornecedor: 'HDI SEGUROS S/A' }
      ],
      oficina: [{ codigo: '', descricao: 'ADITIVO DE RADIADOR', qtd: '4', valorOrc: 50 }],
      motivo: 'sinistro HDI: o PDF do Cilia traz tudo como peça da oficina, mas quem diz o que a HDI fornece é o laudo/portal HDI' },
    { sl: 'aX6Qgx1G', placa: 'SDX5I55', hdi: true,
      oficina: [{ codigo: '', descricao: 'ADITIVO DO RADIADOR', qtd: '1', valorOrc: 40 }],
      motivo: 'sinistro HDI: o PDF do Cilia (v4 de 08/10) traz tudo como peça da oficina, mas pelo laudo HDI 2.0 a HDI fornece FAROL ESQUERDO, GRADE DO PARACHOQUE DIANT, GRADE DO RADIADOR, PARACHOQUE DIANTEIRO, GUIA ESQ DO PARACHOQUE DIANT, MOLDURA DO FAROL DE MILHA ESQ e DEFLETOR DO RADIADOR',
      extra: '📦 Pelo laudo HDI 2.0 (02/10) a HDI fornece 7 peças e o card não tem checklist FORNECIMENTO: verificar prazo do item 52138594 FAROL ESQUERDO, 100255820 GRADE DO PARACHOQUE DIANT, 100274271 GRADE DO RADIADOR, 100249454 PARACHOQUE DIANTEIRO, 52045820 GUIA ESQ DO PARACHOQUE DIANT, 100255433 MOLDURA DO FAROL DE MILHA ESQ, 52245037 DEFLETOR DO RADIADOR.\n' +
        '🔎 O Cilia v4 (08/10) troca/inclui peças que ainda não estão em laudo HDI (52138593 FAROL ESQUERDO SEM LED, 100248119 GRADE DO PARACHOQUE PRETO ONIX, 100274160 FRISO INF ESQ DA GRADE): quando a HDI emitir o laudo do complemento, anexar o PDF da HDI no card.' }
  ]
};

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
        'Fornecedor', 'Valor', 'Prazo (dias úteis)', 'Previsão', 'Usuário', 'Detalhe', 'Quadro', 'Registro']
};

// Eventos.gs:15
var EV_VERBOS = { 'COTAÇÃO': 'lançou cotação', 'COTAÇÃO INDISPONÍVEL': 'marcou cotação indisponível', 'AUTORIZAÇÃO': 'autorizou', 'COMPRA': 'registrou compra',
  'COMPRA CANCELADA': 'cancelou a compra', 'PREVISÃO': 'alterou o prazo', 'FORNECIMENTO': 'atualizou o fornecimento', 'RECEBIMENTO': 'registrou recebimento',
  'RETIRADA': 'registrou retirada', 'DEVOLUÇÃO': 'registrou devolução', 'DEVOLUÇÃO FO': 'registrou devolução de FO', 'PEDIDO EDITADO': 'editou o pedido',
  'COMPLEMENTO': 'marcou complemento', 'CÓDIGO CORRIGIDO': 'corrigiu o código', 'COLUNA': 'moveu o card', 'FATURADO': 'registrou faturamento' };

// Eventos.gs:32
var EV_CAB_OK = false;

// Faturamento.gs:17
var FAT = { LISTAS: ['ENCERRADO COMPRAS/FORNEC.', 'ENTREGUES', 'PENDÊNCIA DE FATURAMENTO', 'PENDÊNCIA TRATADA - FATURAR'], MARCA: '🧾' };

// Faturamento.gs:35
var FAT_CONF = 'FATURAD[OA]S?', FAT_NEG = '(?:NAO|FALTA|FALTAM|PENDENTE|AGUARDANDO|AGUARDA|SEM|NUNCA)';

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

// Fluxo.gs:151
var SLA = { INTERVALO_MS: 55 * 60 * 1000, REPETIR_DU: 2, REPETIR_FATURAR_DU: 5, LIMITE_MS: 40 * 1000, RESUMO_MAX: 120 };

// FormularioServidor.gs:26
var VDF_API = ['vdf_servidorProps', 'vdf_limparCardRotina', 'vdf_rotinaPecasBase', 'vdf_abrir', 'vdf_iniciar', 'vdf_buscarPlaca', 'vdf_carregarCard', 'vdf_lerDocumento',
  'vdf_salvarCotacao', 'vdf_salvarCompra', 'vdf_salvar', 'vdf_subirArquivo', 'vdf_lerAnexoCard', 'vdf_autorizar', 'vdf_devolverCotacao', 'vdf_salvarRecebimento', 'vdf_cotacaoIndisponivel', 'vdf_compararComplemento', 'vdf_alterarPrevisao', 'vdf_atualizarFornecimento', 'vdf_lerFornecimento', 'vdf_lerFornecimentoAnexo', 'vdf_avisarSolicitante', 'vdf_marcarOrdemAutorizada', 'vdf_padronizarAnexos', 'vdf_padronizarQuadro', 'vdf_padronizarQuadroStatus', 'vdf_textoAnexo', 'vdf_removerRepetidos', 'vdf_consumo', 'vdf_valoresOrcamento', 'vdf_treinoLeitor', 'vdf_treinoResumo', 'vdf_treinoAmostrar', 'vdf_treinoAvaliar', 'vdf_treinoAssinatura', 'vdf_cancelarCompra', 'vdf_salvarRetirada', 'vdf_testeMarcar', 'vdf_propsServidor', 'vdf_anexosAntigosCard', 'vdf_previaFornecimento', 'vdf_foRevertidas', 'vdf_foRevertidaDevolvida', 'vdf_fotosCard', 'vdf_fotoCard', 'vdf_definirCapa', 'vdf_ocrServidor', 'vdf_renomearPagas', 'vdf_encerrarSemPecas', 'vdf_salvarDevolucao', 'vdf_incluirDevolucao', 'vdf_reavaliarColuna', 'vdf_varrerTrocasCodigo'];

// FormularioServidor.gs:68
var VDF_PROPS_SERVIDOR = ['RC_LOCAIS', 'RC_QUEM', 'VD_COMPRADORES', 'VD_AUTORIZADORES', 'FAT_USUARIOS', 'DU_EXTRAS', 'DU_REMOVER',
  'VD_DIAS_UTEIS', 'SLA_DIAS_COTAR', 'SLA_DIAS_AUTORIZAR', 'SLA_DIAS_RECEBER', 'SLA_DIAS_FATURAR', 'SLA_REPETIR_DU', 'TST_CARDS',
  'VD_FIXO', 'VD_VITRINE', 'VD_TRAVA_DESC'];

// FormularioServidor.gs:155
var VDF_ME = null;

// FormularioServidor.gs:156
var VDF_ACOES = [
  [/CÓDIGO CORRIGIDO/, 'corrigiu o código'], [/COTAÇÃO DE REGISTRO/, 'registrou cotação (só registro)'],
  [/COTAÇÃO INDISPONÍVEL/, 'marcou cotação indisponível'], [/COTAÇÃO DEVOLVIDA/, 'devolveu para cotação'], [/^COTAÇÃO$/, 'lançou a cotação'],
  [/AUTORIZAÇÃO ALTERADA/, 'alterou a autorização'], [/^AUTORIZADO$/, 'autorizou'], [/Peças marcadas na autorização/i, 'marcou peças na autorização'],
  [/ORDEM AUTORIZADA PENDENTE/, 'conferiu a ordem no Databox'], [/^ORDEM AUTORIZADA$/, 'marcou ordem autorizada'],
  [/^COMPLEMENTAR$/, 'registrou o complementar'], [/^COMPLEMENTO$/, 'marcou complemento'],
  [/COMPRA PARCIAL/, 'registrou compra (parcial)'], [/COMPRA CANCELADA/, 'cancelou a compra'], [/^COMPRA$/, 'registrou compra'],
  [/QUEM PAGA MUDOU/, 'mudou quem paga'], [/PEDIDO EDITADO/, 'editou o pedido'], [/^NÃO COMPRAR$/, 'marcou não comprar'],
  [/Peça removida do pedido/i, 'removeu peça com compra'], [/Peça alterada sem nova cotação/i, 'alterou peça sem nova cotação'],
  [/PREVISÃO ALTERADA/, 'alterou o prazo'], [/^FORNECIMENTO$/, 'atualizou o fornecimento'], [/FO REVERTIDA/, 'registrou FO revertida'],
  [/^RETIRADA$/, 'registrou retirada'], [/NF DE DEVOLUÇÃO/, 'registrou NF de devolução'], [/^RECEBIMENTO$/, 'registrou recebimento'],
  [/^PEÇAS — local/, 'registrou local/devolução de peça'], [/Encerrado sem peças/i, 'encerrou sem peças'], [/Compras do card antigo/i, 'passou as compras para o padrão novo']
];

// FormularioServidor.gs:184
var VDF_COMPRADORES_PADRAO = 'comprasunity,timweslley,christianfarias23';

// FormularioServidor.gs:191
var VDF_AUTORIZADORES_PADRAO = 'timweslley,comercialunity,christianfarias23';

// FormularioServidor.gs:209
var VDF_EQUIPES_PADRAO = 'RONDON: jeziel, edilsontibes1; CASCAVEL: laisalmeida9, lucasmoreira50';

// FormularioServidor.gs:218
var VDF_EQUIPE_MEM = {};

// FormularioServidor.gs:366
var VD_MARCAS = ['CHEVROLET', 'CHEV', 'GM', 'VOLKSWAGEN', 'VW', 'FORD', 'FIAT', 'TOYOTA', 'HONDA', 'HYUNDAI', 'RENAULT', 'NISSAN',
  'JEEP', 'PEUGEOT', 'CITROEN', 'MITSUBISHI', 'KIA', 'BMW', 'AUDI', 'MERCEDES-BENZ', 'MERCEDES', 'BENZ', 'M.BENZ', 'LAND', 'ROVER',
  'VOLVO', 'CAOA', 'CHERY', 'BYD', 'GWM', 'RAM', 'DODGE', 'SUZUKI', 'SUBARU', 'JAC', 'LIFAN', 'PORSCHE', 'MINI', 'IVECO', 'SCANIA', 'I', 'IMP'];

// FormularioServidor.gs:423
var VDF_ETIQ_ORDEM = 'ORDEM AUTORIZADA';

// FormularioServidor.gs:438
var VDF_CAMPO_ORDEM = 'Nº Ordem';

// FormularioServidor.gs:579
var VD_CORES = ['BRANCO', 'BRANCA', 'PRETO', 'PRETA', 'PRATA', 'CINZA', 'VERMELHO', 'VERMELHA', 'AZUL', 'VERDE', 'AMARELO', 'AMARELA',
  'BEGE', 'MARROM', 'DOURADO', 'DOURADA', 'LARANJA', 'VINHO', 'GRAFITE', 'ROXO', 'ROXA', 'BRONZE', 'CHAMPAGNE'];

// FormularioServidor.gs:583
var VD_LIXO_TITULO = ['TOL', 'TOLEDO', 'MCR', 'RONDON', 'MARECHAL', 'CVEL', 'CASCAVEL', 'CM', 'CMO', 'MOURAO', 'CAMPO', 'IMAGE', 'PNG', 'JPG', 'JPEG', 'PDF', 'RETORNO', 'INTERNO', 'RETRABALHO', 'GARANTIA'];

// FormularioServidor.gs:869
var VDF_FO_TROCAS = [];

// FormularioServidor.gs:1076
var VDF_LISTA_PENDENTE = 'PENDENTE AUTORIZAR';

// FormularioServidor.gs:1077
var VDF_LISTA_FINALIZADA = 'COTAÇÃO FINALIZADA';

// FormularioServidor.gs:1078
var VDF_LISTA_CHEGAR = 'FALTA CHEGAR';

// FormularioServidor.gs:1109
var VDF_RX_REMOVE = /^(REMOVIDA|INDISPON[IÍ]VEL)\s*:\s*(.+?)\s+-\s+(.+)\s+-\s+R?\$?\s*([\d.]+(?:,\d{1,2})?)(?:\s+-\s+(.*))?\s*$/i;

// FormularioServidor.gs:1677
var VDF_ETIQUETA_PARCIAL = 'COTAÇÃO PARCIAL';

// FormularioServidor.gs:1715
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

// Migracao.gs:105
var MG_FORN = null;

// Migracao.gs:349
var MG_VOLTA = {
  COTACAO: ['FALTA DADOS PARA COTAR', 'EM COTAÇÃO'],
  INICIAL: ['Ubqjp2V0'],   // BDK2J49 STRADA BRADESCO — voltou em 11/10 (complemento Bradesco, O.S. 2174)
  MAX_TENTATIVAS: 3
};

// Migracao.gs:478
var MG_FIX = { SL: 'Ubqjp2V0', TIRAR: ['100193183', '51766536', '51914848', '735371638', '100208180', '100208792', '185/60'] };

// Orcamento.gs:9
var VD_SEGURADORAS = [
  ['HDI', /\bHDI\b/], ['PORTO', /PORTO SEGURO/], ['AZUL', /\bAZUL\b/], ['ITAU', /\bITAU\b/],
  ['YELUM', /\bYELUM\b/], ['SANCOR', /\bSANCOR\b/], ['BRADESCO', /\bBRADESCO\b/], ['ALLIANZ', /\bALLIANZ\b/],
  ['TOKIO', /\bTOKIO\b/], ['MAPFRE', /\bMAPFRE\b/], ['SURA', /\bSURA\b/], ['ZURICH', /\bZURICH\b/],
  ['SUHAI', /\bSUHAI\b/], ['MITSUI', /\bMITSUI\b/], ['EZZE', /\bEZZE\b/], ['DARWIN', /\bDARWIN\b/],
  ['AMERICAS', /\bAMERICAS\b/], ['SOMPO', /\bSOMPO\b/], ['GENERALI', /\bGENERALI\b/], ['ALFA', /\bALFA SEGURADORA\b/],
  ['JUSTOS', /\bJUSTOS\b/], ['PIER', /\bPIER SEGURADORA\b/], ['COONECTA', /\bCOONECTA\b/], ['PORTO', /\bPORTO\b/]
];

// Orcamento.gs:27
var VD_PALAVRAS_PECA = 'SENSOR|SILENCIOSO|PARACHOQUE|PARABARRO|PARALAMA|PARABRISA|FAROL|FAROLETE|LANTERNA|GRADE|MOLDURA|SUPORTE|EMBLEMA|FRISO|GUIA|PORTA|CAPO|TAMPA|ESPELHO|RETROVISOR|PAINEL|ABSORVEDOR|ALMA|REFORCO|BORRACHA|ACABAMENTO|APLIQUE|DEFLETOR|COBERTURA|CAPA|TRAVA|FECHADURA|MACANETA|VIDRO|RADIADOR|CONDENSADOR|ELETROVENTILADOR|PROTETOR|COXIM|BRACO|AMORTECEDOR|BANDEJA|PNEU|RODA|CALOTA|LONGARINA|COLUNA|SOLEIRA|CAIXA|TUBO|MANGUEIRA|RESERVATORIO|PALHETA|BOCAL|TRILHO|DOBRADICA|BATENTE|PARAFUSO|PORCA|GRAMPO|ETIQUETA|ADESIVO|SPOILER|ESTRIBO|CHICOTE|LAMPADA|INTERCOOLER|VIGA|TRAVESSA|ESTRUTURA|LATERAL|CARCACA|ALOJAMENTO|FORRO|REVESTIMENTO|BAGAGEIRO|ANTENA|BUZINA|MODULO|CENTRAL|CONJUNTO|JOGO|KIT|CJ';

// Painel.gs:8
var PN = { ABA: 'PAINEL', DIAS: 30, AZUL: '#0c66e4', CINZA: '#f1f2f4' };

// Previsao.gs:10
var PV = { EM_COTACAO: 'EM COTAÇÃO, AINDA SEM PRAZO', BO: 'B.O. NO PORTAL' };

// Previsao.gs:147
var PV_INTERNO = false;

// Previsao.gs:148
var PV_CACHE_TXT = 'PV_TXT_';

// Recebimento.gs:10
var RC = { LISTA_FIM: 'ENCERRADO COMPRAS/FORNEC.', LOCAIS_MAX: 60 };

// Recebimento.gs:17
var RC_RE_MARCA = /\s*·\s*(📍|✋|↩️?|🔁)\s*([^·]*?)\s*(?=\s*·\s*(?:📍|✋|↩️?|🔁)|$)/g;

// Recebimento.gs:603
var RC_DEV = { LISTA: 'DEVOLUÇÕES', RX: /^DEVOLU[ÇC][ÕO]ES/i, AGUARDA: 'aguardando NF' };

// Saude.gs:12
var SD = { EMAIL: 'weslley.santos@unitycs.com.br', FALHAS: 5, REPETE_MS: 6 * 3600 * 1000, BACKUPS: 8, PASTA: 'Backups' };

// Saude.gs:14
var SD_TEMPOS = [];

// Saude.gs:160
var SD_PREF_CARD = /^(?:VD_PK2_|VD_AT_|VD_SIG_|VD_NOVAS_|VD_DESC_AV_|PZ_AT_|PZ_COL_|PZ_SEMPREV_|PZ_FOAV_|ST_ESP_|FO_REV_)([0-9a-f]{24})$|^SLA_([0-9a-f]{24})_/;

// Saude.gs:164
var SD_PREF_ANEXO = /^VD_ANX3_([0-9a-f]{24})$/, SD_PREF_ITEM = /^SLA_I_([0-9a-f]{24})_\d{4}-\d{2}-\d{2}/;

// Saude.gs:166
var SD_PREF_LEGADO_USA = /^(?:SLA_|PZ_COL_)/;

// Seguranca.gs:9
var SG = { LOCK_MS: 25000 };

// Seguranca.gs:10
var SG_TRAVADO = false;

// Seguranca.gs:11
var SG_CHAVE = '';

// Teste.gs:431
var TST_RE_PLACA = /\bZZT\d[A-Z0-9]\d\d\b/;

// TravaChecklist.gs:9
var CK = {
  TIPOS: 'createCheckItem,updateCheckItem,updateCheckItemStateOnCard,deleteCheckItem,addChecklistToCard,removeChecklistFromCard,updateChecklist',
  ANTES_MS: 15 * 1000,     // ação até 15 s depois da licença...
  DEPOIS_MS: 120 * 1000,   // ...ou até 2 min antes dela = oficial (licença gravada antes e depois da escrita)
  ABA: 'CHECKLISTS',
  ESPERA_MS: 90 * 1000     // 17/10/2026: ação mais nova que isso espera o próximo ciclo (licença do servidor a caminho)
};

// Treino.gs:10
var TRN = {
  PASTA_NOME: 'Treino do leitor de orçamento',
  LIMITE_MS: 240 * 1000,
  MAX_BYTES: 8 * 1024 * 1024,
  POR_CARD: 3,
  TEXTO_MAX: 14000,
  LOTE: 40,
  COMPARTILHAR: ['weslley.santos@unitycs.com.br']
};

// Validacao.gs:18
var VD = {
  BOARD_PADRAO: 'ZX4gRmnX',
  LISTA_COTACAO: 'EM COTAÇÃO',
  LISTA_FALTA: 'FALTA DADOS PARA COTAR',
  TIPOS: ['GENUÍNO', 'ORIGINAL', 'PARALELO', 'USADO'],
  CATEG_PNEU: ['IMPORTADO', '1ª LINHA'],
  MARCADOR: '=== COTAÇÃO (compras) ===',
  LIMITE_MS: 3 * 60 * 1000,      // núcleo (10/10/2026: era 4,5 min; o ciclo inteiro agora tem 5 min — ver vd_cicloIniciar_)
  CICLO_MS: 5 * 60 * 1000,       // prazo global do acionador de 1 min: o Google mata a execução aos 6 min sem avisar
  MAX_ANEXOS_CARD: 6,
  MAX_BYTES_ANEXO: 15 * 1024 * 1024,
  // formulário estático no GitHub Pages (abre em <1 s; chama o web app por fetch). O link
  // antigo do web app (…/exec) continua funcionando; a propriedade VD_URL_FORM sobrepõe.
  URL_FORM: 'https://timweslley.github.io/unity-trello-compra-peca/powerup/formulario.html',
  URL_FORM_ANTIGA: 'https://script.google.com/macros/s/AKfycbwkTI6PgPTe8OgIcyxzk5oysMvK2BvWwIQEdh5vhOY2n44KlVJvmeHdXTU1HQ3I5BoQew/exec',
  // colunas onde vale a regra de peça nova (todas depois de EM COTAÇÃO)
  LISTAS_FORA: ['ESPERA/NÃO AUTORIZADO', 'EM COTAÇÃO', 'FALTA DADOS PARA COTAR']
};

// Validacao.gs:41
var VD_CICLO_FIM = 0;

// Validacao.gs:54
var VD_BOARD_FORCA = '';

// Validacao.gs:58
var VD_V2_PRINCIPAL = true;

// Validacao.gs:85
var VD_SEM_MENCOES = false;

// Validacao.gs:187
var VD_ACOES = null;

// Validacao.gs:279
var VD_ROT = {
  modelo: 'MODELO|VE[IÍ]CULO',
  ano: 'ANO(?:\\s*FAB(?:RICA[ÇC][ÃA]O)?\\s*/\\s*MOD(?:ELO)?)?|ANO\\s*/\\s*MODELO',
  motor: 'MOTOR\\s*/\\s*VERS[ÃA]O|MOTOR|VERS[ÃA]O',
  chassi: 'CHASSI|CHASSIS',
  placa: 'PLACA'
};

// Validacao.gs:364
var VD_ROT_EXTRA = {
  tipo: 'TIPO(?:\\s*D[OE]\\s*PEDIDO)?',
  cor: 'COR',
  seguradora: 'SEGURADORA',
  sinistro: 'SINISTRO|N[ºO°.]*\\s*SINISTRO'
};

// Validacao.gs:638
var VD_SO_MO_LINHA = 'nenhuma peça pela oficina — orçamento só de mão de obra (sem peça de troca nem fornecimento)';

// Validacao.gs:811
var VD_ANXS = { ABA: 'ANEXOS', SH: null, ROW: null, MAX: 45000 };

// Validacao.gs:886
var VD_LEITOR_V = 6;

// Validacao.gs:887
var VD_ANX_V = 3;

// Validacao.gs:975
var VD_PULAR_ANEXOS = [];

// Validacao.gs:1078
var VD_CSS = /\bZACARIAS\b/i;

// Validacao.gs:1105
var TR = { PREFIXO: 'VD_DESC_', ABA: 'TRAVA', ESPERA_MS: 40 * 1000, AVISO_MS: 60 * 60 * 1000 };

// Validacao.gs:1317
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

// Validacao.gs:1329
var DU_CACHE = {};

// Validacao.gs:1955
var VD_LINK = {
  EDITAR: '✏️ EDITAR/INCLUIR PEÇA',
  COMPRA: '💰 COTAÇÃO/COMPRA/RECEBIMENTO',
  RX_EDITAR: /Editar pe[çc]as|EDITAR\/INCLUIR PE[ÇC]A/i,
  RX_COMPRA: /Cota[çc][ãa]o \/ Compra|COTA[ÇC][ÃA]O\/COMPRA/i
};

// Validacao.gs:2274
var PZ = {
  LISTAS_FORA: ['ESPERA/NÃO AUTORIZADO'],   // estacionamento: não ganha prazo
  /* 07/10/2026 (Weslley): card nessas colunas está concluído — o prazo fica marcado como concluído; se o card volta, desmarca */
  /* 08/10/2026 (Weslley): as colunas de pendência pós-entrega (ordem de serviço/comercial e fiscal) também contam como concluídas */
  LISTAS_CONCLUIDAS: ['ENCERRADO COMPRAS/FORNEC.', 'ENTREGUES', 'PENDÊNCIA DE FATURAMENTO', 'PENDÊNCIA TRATADA - FATURAR', 'PENDÊNCIA ORDEM DE SERVIÇO/COMERCIAL', 'PENDENCIA FISCAL'],
  DIAS_SEM_PREVISAO: 2,   // card sem previsão de peça: prazo = entrada na coluna + N dias úteis
  LBL_ATRASADO: 'ATRASADO',
  COR_ATRASADO: 'orange',
  LIMITE_MS: 40 * 1000
};

// Validacao.gs:2442
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

// Validacao.gs:2581
var VD_CMP_MEM = null;

// Anexos.gs:18
function ax_semLeituraRobo_(nome) { return ax_ehNota_(nome) || /^((📦 NF( \d+)?|🛒 COMPRA) · |📸 )/.test(String(nome || '')); }

// Anexos.gs:22
function ax_ehNota_(nome) { return /^(📦 NF( \d+)? · |NF(S-e|-e|e)?\s*(\d+\s*)?[-–](?!\S)|NF(S-e|-e|e)? (FORNECIMENTO|ML\b|\d+|[A-Z0-9][^·]*? - \d+ - \d{2}-\d{2}))/i.test(String(nome || '')); }

// Anexos.gs:24
function ax_hoje_(d) { var dt = d ? new Date(d) : new Date(); if (isNaN(dt.getTime())) dt = new Date(); return Utilities.formatDate(dt, 'America/Sao_Paulo', 'dd/MM'); }

// Anexos.gs:27
function ax_origem_(o) {
  o = String(o || '').trim().toUpperCase();
  if (!o) return '';
  return o === 'HDI' ? 'HDI' : o.charAt(0) + o.slice(1).toLowerCase();
}

// Anexos.gs:34
function ax_placa_(card) {
  var nome = String((card && card.name) || '');
  return vd_placaDoTexto_(nome.split(/\s+/)[0]) || vd_placaDoTexto_(nome) || '';
}

// Anexos.gs:40
function ax_nomeAutomatico_(nome) {
  var n = String(nome || '').replace(/\.[a-z0-9]{2,5}$/i, '').trim();
  return !n || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(n) || /^(image|img|imagem|foto|photo|picture|pic|screenshot|captura|print|scan|pdf_report|document|documento|file|arquivo|whatsapp image|whatsapp|dsc|pxl|vid|video)[\s_\-\d().]*(at[\s_\-\d().]*)?$/i.test(n) || /^[\d_\-\s().]+$/.test(n);
}

// Anexos.gs:46
function ax_padronizado_(nome) { return AX_RE_PADRAO.test(String(nome || '')); }

// Anexos.gs:49
function ax_nome_(tipo, placa, partes, data) {
  var p = [tipo].concat(placa ? [placa] : []).concat((partes || []).map(function (s) { return String(s || '').trim(); }).filter(String));
  p.push(ax_hoje_(data));
  var nome = p.join(AX.SEP);
  return /[A-Z]/i.test(tipo) ? nome : nome.replace(AX.SEP, ' ');   // "📸 RHV1E04 · capa · 05/10" (tipo só com o ícone)
}

// Anexos.gs:57
function ax_renomear_(cardId, idAnexo, nome, token) {
  try { vd_api_('/cards/' + cardId + '/attachments/' + idAnexo, { method: 'put', payload: { name: nome } }, token); return true; }
  catch (e) { console.log('renomear anexo ' + idAnexo + ': ' + e); return false; }
}

// Anexos.gs:68
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

// Anexos.gs:88
function ax_anexos_(cardId, token) {
  try { return vd_api_('/cards/' + cardId + '/attachments', { query: { fields: 'name,date,isUpload' } }, token) || []; } catch (e) { return []; }
}

// Anexos.gs:97
function ax_batizarLido_(card, a, r, complementar, token) {
  try {
    if (!card || !a || !r || r.erro || ax_padronizado_(a.name)) return '';
    var placa = ax_placa_(card);
    if (!placa) return '';
    var nome = '';
    if (r.doc === 'FO') nome = ax_nome_(AX.FO, placa, [r.docNome || 'Status do Pedido Cilia'], a.date);
    else if (r.orcamento && (r.placas || []).some(function (p) { return vd_mesmaPlaca_(p, placa); })) {
      // 15/10/2026: o nº da versão do Cilia ("Cilia - Orçamento 1993730.2 - …", da API ou da rotina) fica no nome — é por ele que
      // o robô sabe que a versão já está no card e não anexa de novo
      var nv = r.api || (typeof cl_ligado_ === 'function' && cl_ligado_() ? (String(a.name || '').match(/Cilia\s*(?:-\s*Or[çc]amento\s*)?(\d{3,}\.\d{1,3})(?!\d)/i) || [])[1] || '' : '');
      // laudo HDI anexado pela rotina ("Orcamento_HDI_<PLACA>_sin…_laudo1.0.pdf"): a versão do laudo fica no nome (base HDI ligada)
      if (!nv && r.orcamento === 'HDI' && typeof cl_ligadoBase_ === 'function' && cl_ligadoBase_('HDI')) { var lv = (String(a.name || '').match(/laudo\s*_?(\d+\.\d+)(?![0-9])/i) || [])[1]; if (lv) nv = 'laudo ' + lv; }
      nome = ax_nome_(complementar ? AX.ORC_MAIS : AX.ORC, placa, [r.seguradora || '', ax_origem_(r.orcamento) + (nv ? ' ' + nv : '')], a.date);
    }
    if (!nome) return '';
    var fim = ax_batizar_(card.id, a.id, nome, ax_anexos_(card.id, token), token, { nomeAtual: a.name });
    a.name = fim;
    return fim;
  } catch (e) { console.log('ax_batizarLido_: ' + e); return ''; }
}

// Anexos.gs:140
function ax_emitente20_(s) { return vd_semAcento_(String(s || '')).toUpperCase().replace(/[^A-Z0-9 &.\-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20).trim(); }

// Anexos.gs:142
function ax_dadosNf_(texto) {
  var bruto = String(texto || ''), m;
  if (/<nfeProc|<infNFe/i.test(bruto)) {
    var nx = (bruto.match(/<nNF>\s*0*(\d{1,9})\s*<\/nNF>/) || [])[1];
    if (!nx) return null;
    var ex = (bruto.match(/<emit>[\s\S]*?<xNome>([^<]+)<\/xNome>/) || [])[1];
    var dx = bruto.match(/<dhEmi>(\d{4})-(\d{2})-(\d{2})/) || bruto.match(/<dEmi>(\d{4})-(\d{2})-(\d{2})/);
    return { numero: nx, emitente: ax_emitente20_(ex), emissao: dx ? dx[3] + '-' + dx[2] : '' };
  }
  var U = vd_normTexto_(bruto).toUpperCase();
  if (!/\bDANFE\b|DOCUMENTO AUXILIAR DA NOTA FISCAL/.test(U)) return null;
  // nº da DANFE vem como 000.123.456; o genérico ("Nº 1.234") por último — "NO 1.500,00" (valor) não é número de nota
  m = U.match(/\bN[ºO°]?\.?\s*(\d{3}\.\d{3}\.\d{3})\b/) || U.match(/\b(?:NF-?E?|NOTA FISCAL|DANFE)\b[^0-9]{0,40}?N[ºO°]?\.?\s*0*(\d{3,9})\b/) ||
    U.match(/\bN[ºO°]\.?\s*0*(\d{1,3}(?:\.\d{3}){1,2})(?![,\d])/);
  if (!m) return null;
  var numero = m[1].replace(/\./g, '').replace(/^0+/, '');
  var em = (U.match(/RECEBEMOS DE (.{3,90}?) OS PRODUTOS/) || [])[1] || '';
  var d = U.match(/DATA (?:DA |DE )?EMISSAO:? ?(\d{2})\/(\d{2})\/\d{2,4}/) || U.match(/\b(\d{2})\/(\d{2})\/20\d\d\b/);
  return { numero: numero, emitente: ax_emitente20_(em), emissao: d ? d[1] + '-' + d[2] : '' };
}

// Anexos.gs:163
function ax_nomeNfRotina_(nf, fornecimento, dataUpload, ext) {
  var dt = nf.emissao || Utilities.formatDate(dataUpload ? new Date(dataUpload) : new Date(), 'America/Sao_Paulo', 'dd-MM');
  return 'NF ' + (fornecimento ? 'FORNECIMENTO - ' : '') + (nf.emitente || 'EMITENTE') + ' - ' + nf.numero + ' - ' + dt + (ext || '.pdf');
}

// Anexos.gs:168
function ax_nfDeFornecimento_(card, emitente) {
  var w = String(emitente || '').split(' ')[0];
  if (!w || w.length < 3) return false;
  var noFo = false, noPagas = false;
  (card.checklists || []).forEach(function (k) {
    var nm = String(k.name || '').trim(), tem = (k.checkItems || []).some(function (i) { return vd_semAcento_(String(i.name || '')).toUpperCase().indexOf(w) >= 0; });
    if (!tem) return;
    if (/^FORNECIMENTO/i.test(nm)) noFo = true; else if (/^PAGAS/i.test(nm)) noPagas = true;
  });
  return noFo && !noPagas;
}

// Anexos.gs:184
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

// Anexos.gs:208
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
      var js = vd_anxGet_(a.id);
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

// Anexos.gs:235
function axPadronizarQuadro() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('AX_PASSO')) return;   // nada agendado
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { query: { fields: 'name,shortLink', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url,date' } }) || [];
  var pos = +(String(props.getProperty('AX_PASSO')).split('|')[0] || 0), feitos = +(String(props.getProperty('AX_PASSO')).split('|')[1] || 0);
  var ini = Date.now();
  for (; pos < cards.length && Date.now() - ini < 4.5 * 60 * 1000; pos++) {
    try { feitos += ax_padronizarCard_(cards[pos], null); } catch (e) {}
  }
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'axPadronizarQuadro') ScriptApp.deleteTrigger(t); });
  if (pos >= cards.length) {
    props.deleteProperty('AX_PASSO');
    console.log('padronização dos anexos concluída: ' + feitos + ' anexo(s) em ' + cards.length + ' card(s)');
  } else {
    props.setProperty('AX_PASSO', pos + '|' + feitos);
    ScriptApp.newTrigger('axPadronizarQuadro').timeBased().after(2 * 60 * 1000).create();
  }
}

// Anexos.gs:255
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

// Anexos.gs:268
function vdf_padronizarQuadroStatus(token) {
  vdf_usuario_(token);
  var p = PropertiesService.getScriptProperties().getProperty('AX_PASSO');
  return { rodando: !!p, passo: p || '' };
}

// Anexos.gs:276
function ax_md5_(blob) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, blob.getBytes()).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

// Anexos.gs:279
function ax_hashAnexo_(a) {
  try {
    var r = qt_fetch_(a.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
    return r.getResponseCode() < 300 ? ax_md5_(r.getBlob()) : '';
  } catch (e) { console.log('hash do anexo ' + a.id + ': ' + e); return ''; }
}

// Anexos.gs:290
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

// Anexos.gs:312
function vdf_removerRepetidos(token, shortLink) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria.'] };
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,id', attachments: 'true', attachment_fields: 'name,fileName,bytes,date,isUpload,url' } });
  var ans = (card.attachments || []).filter(function (a) { return a.isUpload; }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });   // mais novo primeiro
  var removidos = [];
  ans.forEach(function (a) { if (ax_removerRepetido_(card.id, a, '')) removidos.push(a.name); });
  return { ok: true, removidos: removidos };
}

// Anexos.gs:331
function ax_madRegistrar_(cardId, anexoId, de, para) {
  try {
    var props = PropertiesService.getScriptProperties(), l = JSON.parse(props.getProperty('AX_MAD_REN') || '[]');
    l.push([cardId, anexoId, String(de || '').slice(0, 60), String(para || '').slice(0, 70)]);
    while (JSON.stringify(l).length > 8500) l.shift();
    props.setProperty('AX_MAD_REN', JSON.stringify(l));
  } catch (e) {}
}

// Anexos.gs:340
function ax_madrugada_(teste) {
  var h = +Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'H');
  if (!teste && (h < 3 || h > 5)) return 'fora do horário';   // 3h–5h59: depois da Rotina Unity (1h59), que precisa do robô livre para ler os PDFs que anexa
  var props = PropertiesService.getScriptProperties();
  var dia = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  var st = {}; try { st = JSON.parse(props.getProperty('AX_MAD') || '{}'); } catch (e) {}
  if (teste) st = { dia: 'teste', fila: [teste], pos: 0, lidos: 0, renomeados: 0, antigos: 0 };
  else if (st.dia !== dia) {
    var listas = vd_api_('/boards/' + vd_board_() + '/lists', { query: { fields: 'name', filter: 'open' } }) || [];
    var pular = {}; listas.forEach(function (l) { if (/ENCERRAD|ENTREGUE/i.test(l.name || '')) pular[l.id] = 1; });
    var cards = vd_api_('/boards/' + vd_board_() + '/cards', { query: { fields: 'shortLink,idList,name', filter: 'open' } }) || [];
    st = { dia: dia, fila: cards.filter(function (c) { return !pular[c.idList] && !vdf_cardProtegido_(c.name || '') && ax_placa_(c); }).map(function (c) { return c.shortLink; }), pos: 0, lidos: 0, renomeados: 0, antigos: 0 };
  }
  if (st.pos >= st.fila.length) return 'noite concluída';
  if (!teste && st.lidos >= AX_MAD_MAX_LEITURAS) return 'teto da noite (' + AX_MAD_MAX_LEITURAS + ' leituras) — continua amanhã';
  var ini = Date.now(), limite = Math.min(45 * 1000, (vd_restante_() === Infinity ? 45 * 1000 : vd_restante_() - 20 * 1000));
  for (; st.pos < st.fila.length && Date.now() - ini < limite; st.pos++) {
    try {
      var card = vd_api_('/cards/' + st.fila[st.pos], { query: { fields: 'name,idList', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url,date', checklists: 'all', checkItem_fields: 'name' } });
      st.renomeados += ax_padronizarCard_(card, null);   // fotos e anexos já lidos (sem OCR)
      var anexos = (card.attachments || []).filter(function (a) {
        var nomeVelhoNf = String(a.name || '').indexOf(AX.NF) === 0;   // "📦 NF 123 · PLACA · …" (recebimento antigo) vira o padrão das rotinas
        return a.isUpload && ((!ax_padronizado_(a.name) && !ax_ehNota_(a.name)) || nomeVelhoNf) && vd_anexoLegivel_(a) && !/^image\//i.test(a.mimeType || '') &&
          !vd_anxTem_(a.id);
      }).sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); });
      for (var i = 0; i < anexos.length && Date.now() - ini < limite && (teste || st.lidos < AX_MAD_MAX_LEITURAS); i++) {
        var a = anexos[i], r = vd_lerAnexoTrello_(a);
        st.lidos++;
        if (!r || r.erro) continue;
        if (r.nf && !r.orcamento) {   // nota fiscal anexada à mão: padrão das rotinas de NF
          var nmNf = ax_nomeNfRotina_(r.nf, ax_nfDeFornecimento_(card, r.nf.emitente), a.date);
          var deNf = a.name;
          if (nmNf !== a.name && ax_renomear_(card.id, a.id, nmNf, null)) { ax_madRegistrar_(card.id, a.id, deNf, nmNf); a.name = nmNf; st.renomeados++; st.notas = (st.notas || 0) + 1; }
          continue;
        }
        var placa = ax_placa_(card);
        var orcNovo = (card.attachments || []).filter(function (x) { return x.id !== a.id && String(x.name || '').indexOf(AX.ORC + AX.SEP) === 0 && String(x.date || '') > String(a.date || ''); })[0];
        if (r.orcamento && orcNovo && (r.placas || []).some(function (p) { return vd_mesmaPlaca_(p, placa); })) {
          var nm = ax_nome_(AX.ORC, placa, [r.seguradora || '', ax_origem_(r.orcamento)], a.date) + ' (antigo)';
          var deA = a.name;
          if (ax_renomear_(card.id, a.id, nm, null)) { ax_madRegistrar_(card.id, a.id, deA, nm); a.name = nm; st.renomeados++; st.antigos++; }
          continue;
        }
        var temOrc = (card.attachments || []).some(function (x) { return x.id !== a.id && String(x.name || '').indexOf(AX.ORC + AX.SEP) === 0; });
        var deB = a.name, paraB = ax_batizarLido_(card, a, r, temOrc, null);
        if (paraB) { ax_madRegistrar_(card.id, a.id, deB, paraB); st.renomeados++; }
      }
      if (i < anexos.length) break;   // acabou o tempo no meio do card: continua dele no próximo ciclo
    } catch (e) { console.log('madrugada anexos ' + st.fila[st.pos] + ': ' + e); }
  }
  if (teste) return st;
  props.setProperty('AX_MAD', JSON.stringify(st));
  if (st.pos >= st.fila.length) {
    try {
      var lg = JSON.parse(props.getProperty('AX_MAD_LOG') || '[]');
      lg.push(dia + ': ' + st.fila.length + ' cards, ' + st.lidos + ' anexos lidos, ' + st.renomeados + ' renomeados (' + st.antigos + ' antigos, ' + (st.notas || 0) + ' notas)');
      props.setProperty('AX_MAD_LOG', JSON.stringify(lg.slice(-15)));
    } catch (e) {}
  }
  return st.pos + '/' + st.fila.length + ' cards · ' + st.lidos + ' lidos · ' + st.renomeados + ' renomeados';
}

// Anexos.gs:403
function vdf_anexosAntigosCard(token, shortLink) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) throw new Error('Só a diretoria.');
  return ax_madrugada_(shortLink);
}

// Campos.gs:28
function cf_ligado_() { return vd_prop_('CF_LIGADO', 'SIM') !== 'NAO'; }

// Campos.gs:31
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

// Campos.gs:58
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

// Campos.gs:85
function vd_totaisPorQtd_() { try { return vd_board_() === 'ZX4gRmnX' || vd_prop_('VD_TOTAIS_QTD', 'SIM') === 'SIM'; } catch (e) { return false; } }

// Campos.gs:86
function vd_qtdNum_(q) { var n = parseFloat(String(q == null ? '' : q).replace(',', '.')); return n > 0 ? n : 1; }

// Campos.gs:88
function vd_totais_(c) {
  var porQtd = vd_totaisPorQtd_();
  var an = vd_analisar_(c.desc || '', c.name || '');
  var cardPart = an.dados.tipo === 'PARTICULAR' || (/\bPARTICULAR\b/i.test(c.name || '') && !an.pecas.some(function (p) { return !p.particular; }));
  var cardRet = an.dados.tipo === 'RETORNO';   // oficina paga: grupo próprio (09/10/2026)
  var z = function () { return { cot: 0, aut: 0, comp: 0, valor: 0, nAut: 0, nComp: 0 }; };
  var T = { seg: z(), part: z(), ret: z() };
  var grupo = function (p) { return cardPart || p.particular ? 'part' : cardRet ? 'ret' : 'seg'; };
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
    var g = T[grupo(p)], k = vd_chavePeca_(p), q = porQtd ? vd_qtdNum_(p.qtd) : 1;
    var minhas = cots.filter(function (x) { return x.chave === k && !isNaN(x.valor); }).map(function (x) { return x.valor; });
    if (minhas.length) g.cot += Math.min.apply(null, minhas) * q;
    var a = auts.filter(function (x) { return x.chave === k; })[0];
    if (a && !isNaN(a.valor)) { g.aut += a.valor * q; g.nAut++; }
    var it = itens.filter(function (x) { return !x.usado && k && vd_casaItem_(x.nome, k); })[0];
    if (it) { it.usado = true; g.comp += it.valor * q; g.nComp++; g.valor += it.valor * q; }
    else if (a && !isNaN(a.valor)) g.valor += a.valor * q;
  });
  // compra que não casou com peça da lista (card antigo): entra pelo nome do checklist
  itens.forEach(function (it) { if (it.usado) return; var g = T[cardPart || it.part ? 'part' : cardRet ? 'ret' : 'seg']; g.comp += it.valor; g.valor += it.valor; g.nComp++; });
  var r2 = function (v) { return Math.round(v * 100) / 100; };
  ['seg', 'part', 'ret'].forEach(function (k) { ['cot', 'aut', 'comp', 'valor'].forEach(function (f) { T[k][f] = r2(T[k][f]); }); });
  T.tot = {}; ['cot', 'aut', 'comp', 'valor', 'nAut', 'nComp'].forEach(function (f) { T.tot[f] = r2(T.seg[f] + T.part[f] + T.ret[f]); });
  T.temPart = cardPart || an.pecas.some(function (p) { return p.particular; });
  T.temSeg = !cardPart && an.pecas.some(function (p) { return !p.particular; });
  return T;
}

// Campos.gs:130
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

// Campos.gs:141
function cf_opcoesUnidade_() {
  var d = cf_defs_()['Unidade']; if (!d) return [];
  var ordem = ['TOLEDO', 'RONDON', 'CASCAVEL', 'MOURÃO'];
  return Object.keys(d.opcoes).map(function (k) { return { id: d.opcoes[k], name: k }; })
    .sort(function (a, b) { var ia = ordem.indexOf(a.name), ib = ordem.indexOf(b.name); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name); });
}

// Campos.gs:148
function cf_gravarUnidade_(cardId, idOpcao) {
  var d = cf_defs_()['Unidade']; if (!d || !idOpcao) return false;
  vd_api_('/cards/' + cardId + '/customField/' + d.id + '/item', { method: 'put', payload: { idValue: idOpcao } });
  return true;
}

// Campos.gs:155
function cf_valores_(c) {
  var an = vd_analisar_(c.desc || '', c.name || '');
  var tipo = vd_semSeguradora_(an.dados.tipo) ? an.dados.tipo : (an.pecas.some(function (p) { return p.particular; }) ? 'MISTO' : 'SEGURADORA');
  var seg = vd_rotuloSeguradora_(an.dados.tipo, String(an.dados.seguradora || '').trim().toUpperCase());
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
    'Total retorno': T ? num(T.ret.valor) : undefined,
    'Total seg+part': T ? num(T.tot.valor) : undefined
  };
}

// Campos.gs:177
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

// CiliaApi.gs:66
function cl_base_(id) { for (var i = 0; i < CL_BASES.length; i++) if (CL_BASES[i].id === id) return CL_BASES[i]; return CL_BASES[0]; }

// CiliaApi.gs:67
function cl_ligado_() { return vd_prop_('CL_LIGADO', CL.LIGADO_PADRAO) === 'SIM'; }

// CiliaApi.gs:68
function cl_ligadoBase_(B) { B = typeof B === 'string' ? cl_base_(B) : (B || CL_BASES[0]); return vd_prop_(B.pref + 'LIGADO', B.padrao) === 'SIM'; }

// CiliaApi.gs:70
function cl_chave_(casa, o) { return casa + '|' + o.budget_id + '|' + (o.chave_versao || o.versao_baixada || o.numero_versao || ''); }

// CiliaApi.gs:72
function cl_rotVersao_(B, nv) { return B.id === 'HDI' ? 'laudo ' + nv : String(nv); }

// CiliaApi.gs:73
function cl_nomeAnexo_(B, nv, placa) {
  if (B.id === 'HDI') return 'HDI - Orçamento laudo ' + nv + ' - ' + placa + '.pdf';
  if (B.id === 'SOMA') return 'SOMA - Orçamento ' + nv + ' - ' + placa + '.pdf';
  return 'Cilia - Orçamento ' + nv + ' - ' + placa + '.pdf';
}

// CiliaApi.gs:79
function cl_ehEstaVersao_(B, nv, nome) {
  var e = String(nv).replace(/\./g, '\\.');
  if (B.id === 'HDI') return new RegExp('laudo\\s*_?' + e + '(?![0-9])', 'i').test(nome);
  var re = new RegExp('(^|[^0-9.])' + e + '($|[^0-9])');
  return B.id === 'SOMA' ? /SOMA/i.test(nome) && re.test(nome) : re.test(nome);
}

// CiliaApi.gs:85
function cl_quadroRot_(board) { return board === CL.QUADRO_TESTE ? 'TESTE' : 'principal'; }

// CiliaApi.gs:90
function cl_arquivo_(B, forcar) {
  B = B || CL_BASES[0];
  if (CL_MEM.arq[B.id]) return CL_MEM.arq[B.id];
  var props = PropertiesService.getScriptProperties(), id = props.getProperty(B.pref + 'ARQ_ID');
  if (id) { try { var f0 = DriveApp.getFileById(id); if (!f0.isTrashed()) return (CL_MEM.arq[B.id] = f0); } catch (e) {} }
  if (!B.obrigatoria && !forcar) { var sem = +(props.getProperty(B.pref + 'SEM_ARQ') || 0); if (sem && Date.now() - sem < 6 * 3600 * 1000) return null; }
  var it = DriveApp.searchFiles('title = "' + B.arquivo + '" and trashed = false'), melhor = null;
  while (it.hasNext()) {
    var f = it.next(), pais = f.getParents(), naPasta = false;
    while (pais.hasNext()) { if (pais.next().getName() === B.pasta) naPasta = true; }
    if (!naPasta) continue;
    if (!melhor || f.getLastUpdated().getTime() > melhor.getLastUpdated().getTime()) melhor = f;
  }
  if (!melhor) {
    if (!B.obrigatoria) { props.setProperty(B.pref + 'SEM_ARQ', String(Date.now())); return null; }
    throw new Error('não achei ' + B.arquivo + ' na pasta "' + B.pasta + '" (compartilhada com a conta do robô?)');
  }
  props.deleteProperty(B.pref + 'SEM_ARQ');
  props.setProperty(B.pref + 'ARQ_ID', melhor.getId());
  return (CL_MEM.arq[B.id] = melhor);
}

// CiliaApi.gs:111
function cl_json_(B) {
  B = B || CL_BASES[0];
  if (CL_MEM.json[B.id]) return CL_MEM.json[B.id];
  return (CL_MEM.json[B.id] = JSON.parse(cl_arquivo_(B).getBlob().getDataAsString('UTF-8')));
}

// CiliaApi.gs:117
function cl_pdf_(B, caminho) {
  B = B || CL_BASES[0];
  var partes = String(caminho || '').split('/').filter(String), nome = partes.pop();
  if (!nome) return null;
  var pasta = cl_arquivo_(B).getParents().next(), rota = B.id;
  for (var i = 0; i < partes.length; i++) {
    rota += '/' + partes[i];
    if (!CL_MEM.pastas[rota]) { var it = pasta.getFoldersByName(partes[i]); if (!it.hasNext()) return null; CL_MEM.pastas[rota] = it.next(); }
    pasta = CL_MEM.pastas[rota];
  }
  var fs = pasta.getFilesByName(nome);
  return fs.hasNext() ? fs.next() : null;
}

// CiliaApi.gs:134
function cl_pecasParaOrc_(pecas) {
  var r = { oficina: [], fo: [] };
  (pecas || []).forEach(function (p) {
    if (!p || p.troca !== true) return;
    var codigo = String(p.codigo || '').replace(/\s+/g, '').toUpperCase();
    var desc = vd_limparDescricao_(vd_normTexto_(p.nome || '').trim());
    if (!desc || vd_ehServico_(desc)) return;
    if (vd_codigoInterno_(codigo)) codigo = '';
    var pneu = vd_pneuDaDescricao_(desc);
    var item = pneu ? pneu : { pneu: false, codigo: codigo, descricao: desc, tipos: [] };
    var q = Number(p.qtd);
    item.qtd = String(q > 0 ? q : 1);
    item.dica = '';
    item.descricaoOrc = desc;
    item.codigoOrc = codigo;
    var v = Number(p.valor_unit);
    if (v > 0) item.valorOrc = Math.round(v * 100) / 100;
    (p.fornece === 'SEGURADORA' ? r.fo : r.oficina).push(item);
  });
  return r;
}

// CiliaApi.gs:156
function cl_seguradora_(nome) {
  var U = vd_normTexto_(nome);
  for (var s = 0; s < VD_SEGURADORAS.length; s++) { if (new RegExp('\\b' + VD_SEGURADORAS[s][0] + '\\b').test(U) || VD_SEGURADORAS[s][1].test(U)) return VD_SEGURADORAS[s][0]; }
  return '';
}

// CiliaApi.gs:163
function cl_guardarPecas_(idAnexo, o, B) {
  B = B || CL_BASES[0];
  var orc = cl_pecasParaOrc_(o.pecas);
  var js = JSON.stringify({ v: 1, nv: cl_rotVersao_(B, o.versao_baixada || o.numero_versao || ''), org: B.org, placa: o.placa || '', seg: cl_seguradora_(o.seguradora), si: o.sinistro || '',
    o: vd_orcCompacto_(orc.oficina), f: vd_orcCompacto_(orc.fo), em: Date.now() });
  if (js.length > 8500) return false;   // orçamento enorme: fica a leitura do PDF (OCR), como antes
  PropertiesService.getScriptProperties().setProperty('CL_PEC_' + idAnexo, js);
  return true;
}

// CiliaApi.gs:172
function cl_pecasDoAnexo_(idAnexo) {
  try { var v = PropertiesService.getScriptProperties().getProperty('CL_PEC_' + idAnexo); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}

// CiliaApi.gs:177
function cl_juntarApi_(orc, api, r) {
  var dicas = {};
  (orc.oficina || []).concat(orc.fo || []).forEach(function (p) { if (p.dica) cp_chaves_(p).forEach(function (k) { dicas[k] = p.dica; }); });
  var exp = function (lista) {
    return vd_orcExpandir_(lista).map(function (p) {
      if (!p.pneu) { p.descricaoOrc = p.descricao; p.codigoOrc = p.codigo; if (!p.dica) cp_chaves_(p).some(function (k) { if (dicas[k]) { p.dica = dicas[k]; return true; } return false; }); }
      return p;
    });
  };
  var novo = { origem: api.org || 'CILIA', oficina: exp(api.o), fo: exp(api.f), seguradora: orc.seguradora || api.seg || '', cor: orc.cor || '', sinistro: orc.sinistro || api.si || '', api: api.nv };
  if (api.placa && r) {
    r.placas = r.placas || []; r.placasRot = r.placasRot || [];
    if (!r.placas.some(function (p) { return vd_mesmaPlaca_(p, api.placa); })) r.placas.unshift(api.placa);
    if (!r.placasRot.some(function (p) { return vd_mesmaPlaca_(p, api.placa); })) r.placasRot.unshift(api.placa);
  }
  return novo;
}

// CiliaApi.gs:196
function cl_cards_(board) {
  if (CL_MEM.cards && CL_MEM.cards.board === board) return CL_MEM.cards.lista;
  var lista = vd_api_('/boards/' + board + '/cards/open', { query: { fields: 'name,idList,shortLink,shortUrl,desc' } }) || [];
  CL_MEM.cards = { board: board, lista: lista };
  return lista;
}

// CiliaApi.gs:202
function cl_ehRetorno_(c) { return /\bRETORNO\b/i.test(c.name || '') || /\bRETORNO\b/.test(vd_semAcento_(String(c.desc || '').slice(0, 600))); }

// CiliaApi.gs:205
function cl_acharCard_(board, o) {
  var cands = cl_cards_(board).filter(function (c) {
    if (vdf_cardProtegido_(c.name) || cl_ehRetorno_(c)) return false;
    var p = ax_placa_(c);
    return p && vd_mesmaPlaca_(p, o.placa);
  });
  if (!cands.length) return { nenhum: true };
  if (cands.length === 1) return { card: cands[0] };
  var sin = String(o.sinistro || '').replace(/\D/g, '');
  if (sin.length >= 5) {
    var porSin = cands.filter(function (c) { return String(c.desc || '').replace(/[.\-\/\s]/g, '').indexOf(sin) >= 0; });
    if (porSin.length === 1) return { card: porSin[0] };
  }
  // seguradora do orçamento no fim do título ("PLACA MODELO COR SEGURADORA"), como o robô monta o título (16/10/2026, AYK0H85:
  // "… FIESTA PRATA PARTICULAR" e "… FIESTA CINZA BRADESCO" abertos e orçamento da Bradesco). A cor no meio do título não conta.
  var seg = cl_seguradora_(o.seguradora || '');
  if (seg) {
    var porSeg = cands.filter(function (c) { return vdf_partesTitulo_(c.name || '', {}).seguradora === seg; });
    if (porSeg.length === 1) return { card: porSeg[0] };
  }
  return { varios: cands.map(function (c) { return c.name; }) };
}

// CiliaApi.gs:229
function cl_log_(linhas) {
  if (!linhas.length) return;
  try {
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('VD_PLANILHA_BACKUP') || vd_planilhaBackup_().getParent().getId());
    var sh = ss.getSheetByName(CL.ABA_LOG);
    if (!sh) { sh = ss.insertSheet(CL.ABA_LOG); sh.appendRow(['Quando', 'Quadro', 'Casa', 'Placa', 'Versão', 'Conclusão', 'Card', 'O que o robô fez', 'Detalhe']); sh.setFrozenRows(1); }
    sh.getRange(sh.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
  } catch (e) { console.log('cilia/log: ' + e); }
}

// CiliaApi.gs:238
function cl_dataBr_(iso) { var d = new Date(iso || ''); return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM'); }

// CiliaApi.gs:246
function cl_executar_(opt) {
  opt = opt || {};
  var board = opt.quadro || vd_board_();
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var prazo = vd_prazo_(opt.teste ? 4 * 60 * 1000 : 90 * 1000, 15 * 1000);
  var n = 0, erroCilia = null;
  CL_BASES.forEach(function (B) {
    if (opt.bases && opt.bases.indexOf(B.id) < 0) return;
    if (!opt.teste && !cl_ligadoBase_(B)) return;
    if (Date.now() > prazo) return;
    try { n += cl_executarBase_(B, board, opt, prazo); }
    catch (e) {
      if (B.obrigatoria) { erroCilia = e; return; }
      // base do portal com erro: registra no máximo 1× a cada 6 h (o ciclo roda a cada minuto)
      var props = PropertiesService.getScriptProperties(), msg = String(e.message || e).slice(0, 200), ant = (props.getProperty(B.pref + 'ERRO') || '').split('|');
      if (ant[1] !== msg || Date.now() - (+ant[0] || 0) > 6 * 3600 * 1000) {
        props.setProperty(B.pref + 'ERRO', Date.now() + '|' + msg);
        cl_log_([[new Date(), cl_quadroRot_(board), '', '', '', '', '', 'erro na base ' + B.rot, msg]]);
      }
      console.log('base ' + B.id + ': ' + e);
    }
  });
  if (erroCilia) throw erroCilia;
  return n;
}

// CiliaApi.gs:272
function cl_executarBase_(B, board, opt, prazo) {
  var props = PropertiesService.getScriptProperties(), P = B.pref;
  var kFila = P + 'FILA_' + board, kFeito = P + 'FEITO_' + board, kLido = P + 'LIDO_' + board, kDesde = P + 'DESDE_' + board;
  var fila = []; try { fila = JSON.parse(props.getProperty(kFila) || '[]'); } catch (e) {}
  var feitos = {}; try { feitos = JSON.parse(props.getProperty(kFeito) || '{}'); } catch (e) {}
  var ult = +(props.getProperty(P + 'ULT_' + board) || 0);
  // fila só com versões esperando o card nascer (tentam de novo a cada 15 min): não gasta chamada no ciclo de 1 em 1 minuto
  var pronta = fila.some(function (x) { return !x.prox || Date.now() >= x.prox; });
  if (!opt.teste && !pronta && Date.now() - ult < CL.INTERVALO_MS) return 0;
  props.setProperty(P + 'ULT_' + board, String(Date.now()));
  var arq = cl_arquivo_(B, !!opt.teste);
  if (!arq) return 0;   // base do portal ainda não existe (ou pasta não compartilhada): nada a fazer
  var log = [], agora = new Date(), n = 0, qRot = cl_quadroRot_(board);
  var vRot = function (o) { return B.id === 'CILIA' ? o.versao_baixada : B.rot + ' ' + cl_rotVersao_(B, o.versao_baixada); };

  // 1) arquivo novo (ou teste): entra na fila o que foi baixado depois do início (DESDE) e ainda não foi tratado
  var atu = arq.getLastUpdated().toISOString();
  if (opt.teste || props.getProperty(kLido) !== atu) {
    var j = cl_json_(B);
    var desde = props.getProperty(kDesde);
    // 1ª leitura: Cilia vale a rodada do dia; base de portal (HDI, SOMA) vale daqui para frente — ao ligar, os laudos que já
    // estavam na base (a rotina já anexou) não voltam para os cards (15/10/2026)
    if (!desde) { desde = B.obrigatoria ? new Date(new Date(j.gerado_em).getTime() - 60 * 1000).toISOString() : agora.toISOString(); props.setProperty(kDesde, desde); }
    var naFila = {}; fila.forEach(function (x) { naFila[x.k] = 1; });
    var escolhidas = [];
    Object.keys(j.orcamentos || {}).forEach(function (casa) {
      (j.orcamentos[casa] || []).forEach(function (o) {
        if (!o || !o.dispara_compra || !o.pdf || !o.versao_baixada || !o.placa) return;
        var k = cl_chave_(casa, o);
        if (feitos[k] === 'vários cards') delete feitos[k];   // marca de antes de 16/10/2026 (desistia na hora): mais uma chance
        if (feitos[k] || naFila[k]) return;
        // sinistro HDI na base do Cilia: o PDF e as peças que valem são os do portal HDI (laudo) — o do Cilia não vai para o card
        if (B.id === 'CILIA' && cl_seguradora_(o.seguradora) === 'HDI') {
          if (opt.teste || String(o.detalhe_em || '') >= desde) { feitos[k] = 'HDI'; log.push([agora, qRot, casa, o.placa, o.versao_baixada, o.conclusao || '', '', 'não anexei: sinistro HDI (vale o PDF do portal HDI)', '']); }
          return;
        }
        if (!opt.teste && String(o.detalhe_em || '') < desde) return;
        escolhidas.push({ k: k, casa: casa, id: o.budget_id, placa: o.placa, nv: o.versao_baixada, desde: agora.toISOString(), n: 0, data: o.detalhe_em || '' });
      });
    });
    if (opt.teste) {   // teste: só placas que têm UM card aberto (não RETORNO) no quadro de teste, a versão mais recente de cada
      var porPlaca = {};
      escolhidas.forEach(function (x) { var a = porPlaca[x.placa]; if (!a || String(x.data) > String(a.data)) porPlaca[x.placa] = x; });
      escolhidas = Object.keys(porPlaca).map(function (p) { return porPlaca[p]; })
        .filter(function (x) { return !!cl_acharCard_(board, { placa: x.placa }).card; })
        .sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); })
        .slice(0, CL.MAX_TESTE);
    }
    fila = fila.concat(escolhidas);
    props.setProperty(kLido, atu);
    if (!opt.teste) log.push([agora, qRot, '', '', '', '', '', 'li a base do ' + B.rot, 'rodada de ' + cl_dataBr_(j.gerado_em) + ' ' + Utilities.formatDate(new Date(j.gerado_em), 'America/Sao_Paulo', 'HH:mm') + ' · ' + escolhidas.length + ' versão(ões) nova(s) na fila']);
  }
  if (!fila.length) { props.setProperty(kFila, '[]'); cl_log_(log); props.setProperty(kFeito, JSON.stringify(feitos)); return 0; }

  // 2) trata a fila (mais antigas primeiro), dentro do prazo do ciclo
  var j2 = cl_json_(B), idx = {};
  Object.keys(j2.orcamentos || {}).forEach(function (casa) { (j2.orcamentos[casa] || []).forEach(function (o) { if (o && o.budget_id) idx[casa + '|' + o.budget_id] = o; }); });
  var resto = [], feitosAgora = 0;
  for (var i = 0; i < fila.length; i++) {
    var x = fila[i];
    if (Date.now() > prazo || feitosAgora >= (opt.teste ? CL.MAX_TESTE : CL.MAX_POR_RODADA)) { resto.push(x); continue; }
    if (!opt.teste && x.prox && Date.now() < x.prox) { resto.push(x); continue; }   // esperando o card: ainda não é hora
    var o = idx[x.casa + '|' + x.id];
    if (!o || cl_chave_(x.casa, o) !== x.k) { feitos[x.k] = 'versão substituída'; continue; }   // veio versão mais nova: ela entra sozinha
    feitosAgora++;
    var lin = function (card, acao, det) { log.push([agora, qRot, x.casa, o.placa, vRot(o), (o.conclusao || '') + (o.conclusao_detalhe && o.conclusao_detalhe.data ? ' ' + cl_dataBr_(o.conclusao_detalhe.data) : ''), card ? card.shortUrl || card.name : '', acao, det || '']); };
    try {
      var achou = cl_acharCard_(board, o);
      var velho = (Date.now() - new Date((o.conclusao_detalhe && o.conclusao_detalhe.data) || o.status_data || o.criado_em || 0).getTime()) / 864e5 > CL.VELHO_DIAS;
      var tentando = (Date.now() - new Date(x.desde).getTime()) / 864e5 <= CL.PEND_DIAS;
      if (achou.varios) {
        // nada decide entre os cards: tenta de novo por até CL.PEND_DIAS dias (a equipe pode arquivar o card que sobrou ou
        // acertar o título) — até 16/10/2026 desistia na hora; versão antiga não fica esperando
        if (!velho && tentando && !opt.teste) {
          x.vc = (x.vc || 0) + 1; x.prox = Date.now() + CL.INTERVALO_MS; resto.push(x);
          if (x.vc === 1) lin(null, 'não anexei: mais de um card aberto da placa — tento de novo nos próximos dias', achou.varios.join(' | '));
        } else { feitos[x.k] = 'vários cards — desisti'; lin(null, 'não anexei: mais de um card aberto da placa', achou.varios.join(' | ')); }
        continue;
      }
      if (achou.nenhum) {
        if (!velho && tentando && !opt.teste) { x.n++; x.prox = Date.now() + CL.INTERVALO_MS; resto.push(x); if (x.n === 1) lin(null, 'sem card aberto da placa: tento de novo nos próximos dias', ''); }
        else { feitos[x.k] = 'sem card'; lin(null, 'sem card aberto da placa', velho ? 'versão antiga' : 'desisti depois de ' + CL.PEND_DIAS + ' dias'); }
        continue;
      }
      var r = cl_tratarVersao_(board, achou.card, x, o, opt, B);
      feitos[x.k] = r.acao.slice(0, 40);
      if (r.anexou) n++;
      lin(r.card || achou.card, r.acao, r.det);
    } catch (e) {
      x.n++;
      if (x.n < 3) resto.push(x); else feitos[x.k] = 'erro';
      lin(null, 'erro', String(e.message || e).slice(0, 200));
      console.log(B.id + ' ' + x.k + ': ' + e);
    }
  }
  // registros: guarda os mais recentes
  var ks = Object.keys(feitos);
  if (ks.length > CL.MAX_FEITOS) { var novo = {}; ks.slice(-CL.MAX_FEITOS).forEach(function (k) { novo[k] = feitos[k]; }); feitos = novo; }
  props.setProperty(kFeito, JSON.stringify(feitos));
  props.setProperty(kFila, JSON.stringify(resto));
  cl_limparPecas_();
  cl_log_(log);
  return n;
}

// CiliaApi.gs:378
function cl_tratarVersao_(board, c, x, o, opt, B) {
  B = B || CL_BASES[0];
  var card = vd_api_('/cards/' + c.id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', attachments: 'true', attachment_fields: 'name,date,bytes,isUpload,mimeType,url', checklists: 'all', checkItem_fields: 'name' } });
  var nv = String(o.versao_baixada);
  var anexos = card.attachments || [];
  if (anexos.some(function (a) { return cl_ehEstaVersao_(B, nv, String(a.name || '')); })) return { acao: 'já tinha o PDF desta versão', det: '' };
  // orçamento anexado (pela rotina antiga ou à mão) depois da autorização desta versão: já é ela
  var autorizadoEm = new Date((o.conclusao_detalhe && o.conclusao_detalhe.data) || o.status_data || 0).getTime();
  var depois = anexos.filter(function (a) { return /pdf/i.test(a.mimeType || '') && String(a.name || '').indexOf(AX.ORC) === 0 && new Date(a.date).getTime() >= autorizadoEm; });
  if (autorizadoEm && depois.length) return { acao: 'já tinha orçamento anexado depois da autorização', det: depois.map(function (a) { return a.name; }).join(' | ') };

  var pdf = cl_pdf_(B, o.pdf);
  if (!pdf) return { acao: 'não anexei: PDF não achado no Drive', det: o.pdf };
  var nome = cl_nomeAnexo_(B, nv, vd_normPlaca_(o.placa));
  var at = vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: { file: pdf.getBlob().setName(nome), name: nome } });
  if (!at || !at.id) throw new Error('o Trello não devolveu o anexo');
  try { cp_marcarVistos_([at.id]); } catch (e) {}   // o ciclo do complemento não trata de novo: quem trata é este módulo
  var comPecas = cl_guardarPecas_(at.id, o, B);
  var conc = (o.conclusao || 'autorizado') + (o.conclusao_detalhe && o.conclusao_detalhe.data ? ' em ' + cl_dataBr_(o.conclusao_detalhe.data) : '');
  if (!CL_MEM.ctx) CL_MEM.ctx = vd_contexto_();
  var ctx = CL_MEM.ctx, lista = '';
  try { lista = vd_nomeColuna_(vdf_nomeLista_(ctx, card.idList)); } catch (e) {}
  var cabeca = '📄 **Orçamento ' + B.rot + ' ' + cl_rotVersao_(B, nv) + '** (' + conc + ', ' + B.fonte + ') anexado pelo robô.';

  if (/ESPERA/i.test(lista)) {
    var quem = ''; try { quem = vd_criador_(card.id); } catch (e) {}
    vd_comentar_(card, cabeca + ' Card em **ESPERA/NÃO AUTORIZADO**' + (quem ? ': @' + quem + ',' : ':') + ' verificar se a cotação deve seguir — o robô não move o card.');
    return { acao: 'anexei; card em ESPERA: comentei, não movi', det: lista, anexou: true, card: card };
  }
  var silencio = CL.LISTAS_SILENCIO.test(lista);
  if (vd_legado_(card.id)) {
    if (!silencio) vd_comentar_(card, cabeca);
    return { acao: 'anexei (card antigo: o robô não importa peças)', det: lista, anexou: true, card: card };
  }
  var an = vd_analisar_(card.desc || '', card.name), lp = vd_linhasPecas_(an.div.bloco);
  if (!lp.linhas.length && !lp.semOficina) return { acao: 'anexei; card sem lista de peças: o ciclo importa', det: lista + (comPecas ? '' : ' · peças pelo PDF (orçamento grande)'), anexou: true, card: card };
  var a = { id: at.id, name: at.name || nome, mimeType: at.mimeType || 'application/pdf', isUpload: true, bytes: at.bytes, url: at.url, date: at.date || new Date().toISOString() };
  var res = cp_doAnexo_({ id: card.id, name: card.name }, a, ctx);
  // a leitura já guardou as peças da API no cache do anexo (VD_ANX3_): libera o espaço das propriedades
  try { var pp = PropertiesService.getScriptProperties(); if (vd_anxTem_(at.id)) pp.deleteProperty('CL_PEC_' + at.id); } catch (e) {}
  if (res === true) return { acao: 'anexei e importei o complemento', det: lista, anexou: true, card: card };
  if (res === 'erro') return { acao: 'anexei; leitura falhou (o ciclo tenta de novo)', det: lista, anexou: true, card: card };
  // nada novo: avisa que a versão chegou (PDF do Cilia em sinistro HDI e card de RETORNO o próprio cp_doAnexo_ já comentou)
  var seg = vd_semAcento_(((an.dados && an.dados.seguradora) || '') + ' ' + (card.name || ''));
  var hdiNoCilia = B.id === 'CILIA' && /\bHDI\b/.test(seg);
  if (!hdiNoCilia && !silencio) vd_comentar_(card, cabeca + ' Nenhuma peça nova em relação ao que o card já tem.');
  return { acao: hdiNoCilia ? 'anexei; sinistro HDI: peças pelo laudo da HDI' : 'anexei; sem peça nova', det: lista, anexou: true, card: card };
}

// CiliaApi.gs:428
function cl_limparPecas_() {
  try {
    var props = PropertiesService.getScriptProperties(), tudo = props.getProperties(), lim = Date.now() - 3 * 864e5;
    Object.keys(tudo).forEach(function (k) {
      if (k.indexOf('CL_PEC_') !== 0) return;
      try { if ((JSON.parse(tudo[k]).em || 0) < lim) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
    });
  } catch (e) {}
}

// CiliaApi.gs:441
function cl_agendarTeste_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('CL_TESTE_V') === CL.TESTE_V) return 0;
  // versão nova do teste tenta logo; a mesma versão sem a base tenta de novo a cada hora
  if (props.getProperty('CL_TESTE_TENTOU_V') === CL.TESTE_V && Date.now() - (+(props.getProperty('CL_TESTE_TENTOU') || 0)) < 3600 * 1000) return 0;
  props.setProperty('CL_TESTE_TENTOU', String(Date.now())); props.setProperty('CL_TESTE_TENTOU_V', CL.TESTE_V);
  var faltam = (CL.TESTE_BASES || []).filter(function (id) { try { return !cl_arquivo_(cl_base_(id), true); } catch (e) { return true; } });
  if (faltam.length) {
    console.log('cilia/teste: esperando a base ' + faltam.join(', '));
    // 15/10: uma linha na aba por versão do teste — para se ver no registro que o teste espera a base (antes só no log do Apps Script)
    if (props.getProperty('CL_TESTE_AVISO') !== CL.TESTE_V) { props.setProperty('CL_TESTE_AVISO', CL.TESTE_V); cl_log_([[new Date(), 'TESTE', '', '', '', '', '', 'teste esperando a base ' + faltam.join(', '), 'não achei o arquivo da base na pasta compartilhada com a conta do robô — tento de novo a cada hora']]); }
    return 0;
  }
  props.setProperty('CL_TESTE_V', CL.TESTE_V);
  ScriptApp.newTrigger('cl_testeTESTE').timeBased().after(30 * 1000).create();
  return 1;
}

// Código.gs:23
function props_() {
  return PropertiesService.getScriptProperties();
}

// Código.gs:27
function cred_() {
  var p = props_();
  var key = p.getProperty('TRELLO_KEY');
  var token = p.getProperty('TRELLO_TOKEN');
  if (!key || !token) {
    throw new Error('Faltam TRELLO_KEY / TRELLO_TOKEN nas propriedades do script.');
  }
  return { key: key, token: token };
}

// Código.gs:37
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

// Código.gs:84
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
      // 10/10/2026 (teste completo): card do fluxo novo tem trava de descrição — ela desfaz a edição e já avisa no card;
      // o log comentava a mesma edição de novo (a restauração caía fora da janela de 3 min). Log só para card antigo.
      try { if (vd_prop_('VD_TRAVA_DESC', 'SIM') !== 'NAO' && !vd_legado_(g.cardId)) return; } catch (e) {}
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

// Código.gs:182
function ehGravacaoDoRobo_(cardId, desc) {
  if (typeof desc !== 'string') return false;
  try { return typeof tr_ehOficial_ === 'function' && tr_ehOficial_(cardId, desc); } catch (e) { return false; }
}

// Código.gs:187
function normalizar_(s) {
  return (s || '').replace(/\r/g, '').replace(/[ \t]+$/gm, '').trim();
}

// Código.gs:193
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

// Código.gs:204
function sigTexto_(s) {
  return normalizar_(s).split('\n').map(sigLinha_)
    .filter(function (x) { return x; }).join('\n');
}

// Código.gs:209
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

// Código.gs:252
function seguro_(l) {
  l = (l || '').replace(/[\u200B-\u200D\uFEFF\u2060]/g, '');
  if (/^\s*([-=_*~+.]\s*){3,}$/.test(l)) return '───';
  return l;
}

// Código.gs:258
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

// Código.gs:274
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

// Código.gs:318
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
  // 10/10/2026: card com a etiqueta SEM COBRANÇA FATURAMENTO (rotinas de NF) não ganha CONFERIR FATURAMENTO (e perde, se tiver)
  var idsSemCob = labels.filter(function (l) { return fat_semCobranca_([l]); }).map(function (l) { return l.id; });
  function semCob(c) { return (c.idLabels || []).some(function (id) { return idsSemCob.indexOf(id) > -1; }); }
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
        // 21/10/2026 (Weslley: "sem aviso pra isso"): só a etiqueta; o lembrete de faturamento é o ⏰ do SLA + resumo diário
        nParado++;
      }
    } else if (temParado) {
      api_('/cards/' + c.id + '/idLabels/' + idParado, {}, 'delete'); nLimpa++;
    }

    // 10/10/2026 (revisão): só a etiqueta CONFERIR FATURAMENTO; o comentário de cobrança saía em dobro com o SLA de
    // ENTREGUES (Fluxo.gs), que agora tem o resumo diário — este bloco não comenta mais
    if (c.idList === idEnt && !semCob(c)) {
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

// Código.gs:377
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

// Código.gs:437
function moverEncerrados_(idEnc, idEntregues, idFaltaChegar) {
  if (!idEnc || !idEntregues || !idFaltaChegar) return 0;
  var cards = api_('/lists/' + idEnc + '/cards', { fields: 'name', checklists: 'all', checkItem_fields: 'state' });
  var n = 0;
  // 19/10/2026 (Weslley: "rotina diária mais rápida"): o histórico de colunas de todos os cards vem em paralelo, de 10 em 10
  // (antes, uma chamada por card em fila: ~13 s); cada lote que falhar cai na leitura antiga, card a card
  var cr = cred_(), hist = {};
  for (var i0 = 0; i0 < cards.length; i0 += 10) {
    var lote = cards.slice(i0, i0 + 10);
    try {
      var rs = qt_fetchAll_(lote.map(function (c) {
        return { url: 'https://api.trello.com/1/cards/' + c.id + '/actions?filter=updateCard:idList&limit=50&key=' + cr.key + '&token=' + cr.token, muteHttpExceptions: true };
      }));
      rs.forEach(function (r, j) { if (r.getResponseCode() === 200) { try { hist[lote[j].id] = JSON.parse(r.getContentText()); } catch (e) {} } });
    } catch (e) { if (qt_ehErroDeCota_(e)) throw e; }
  }
  cards.forEach(function (c) {
    var acs = hist[c.id] || api_('/cards/' + c.id + '/actions', { filter: 'updateCard:idList', limit: 50 });
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

// Código.gs:485
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

// Código.gs:515
function verificarAlteracoesDescricao() {
  if (vd_roboNoServidor_()) return;
  comAlarme_('log de descrição', verificarAlteracoesDescricaoNucleo_);
}

// Código.gs:520
function rotinaDiaria() {
  if (vd_roboNoServidor_()) return;
  comAlarme_('rotina diária', rotinaDiariaNucleo_);
}

// Complemento.gs:23
function cp_norm_(s) { return vd_semAcento_(s).replace(/[^A-Z0-9]/g, ''); }

// Complemento.gs:26
function cp_chaves_(p) {
  if (!p) return [];
  if (p.pneu) return ['PNEU' + cp_norm_(p.medida)];
  var out = [], c = cp_norm_(p.codigo || p.codigoOrc), d = cp_norm_(p.descricao || p.descricaoOrc);
  if (c.length >= 4) out.push(c);
  if (d.length >= 4) out.push(d);
  return out;
}

// Complemento.gs:36
function cp_orcDoCache_(idAnexo) {
  try {
    var v = vd_anxGet_(idAnexo);
    if (!v) return null;
    var r = JSON.parse(v);
    if (!r.orc) return null;
    return { oficina: vd_orcExpandir_(r.orc.o), fo: vd_orcExpandir_(r.orc.f) };
  } catch (e) { return null; }
}

// Complemento.gs:50
function cp_conhecidas_(card, excluirAnexo) {
  var chaves = {}, textos = [], textosCompra = [];
  var an = vd_analisar_(card.desc || '', card.name || '');
  an.pecas.forEach(function (p) { cp_chaves_(p).forEach(function (k) { chaves[k] = 1; }); });   // 🚫 não comprar: ver cp_comparar_
  var foItens = [];
  (card.checklists || []).forEach(function (k) {
    var nomeK = vd_semAcento_(String(k.name || '').trim());
    // 16/10/2026 (NPG5429 — Weslley: "o robô precisa entender isso e não duplicar peça já comprada"): o checklist
    // "COMPLEMENTO" do jeito antigo (peça do complementar comprada ANTES de a seguradora autorizar, liberada pela diretoria
    // ou pelo orçamentista) também é compra — antes só PAGAS e FORNECIMENTO contavam e o reservatório voltou como peça nova
    if (!/^(PAGAS|FORNECIMENTO|COMPLEMENTO|COMPRAD)/.test(nomeK)) return;
    var ehFo = /^FORNECIMENTO/.test(nomeK);
    (k.checkItems || []).forEach(function (i) {
      textos.push(cp_norm_(i.name));
      if (!ehFo) textosCompra.push(cp_norm_(i.name));
      if (ehFo) foItens.push({ id: i.id, idChecklist: k.id, name: i.name, state: i.state, lista: String(k.name).trim().toUpperCase() });
    });
  });
  // orçamentos anteriores (só os que já estão no cache): peça que o consultor tirou de propósito não volta
  (card.attachments || []).forEach(function (a) {
    if (a.id === excluirAnexo) return;
    var o = cp_orcDoCache_(a.id);
    if (!o) return;
    o.oficina.concat(o.fo).forEach(function (p) { cp_chaves_(p).forEach(function (k) { chaves[k] = 1; }); });
  });
  return { chaves: chaves, textos: textos, textosCompra: textosCompra, an: an, foItens: foItens };
}

// Complemento.gs:78
function cp_jaTem_(conh, p) {
  var ks = cp_chaves_(p);
  if (!ks.length) return true;   // sem código nem descrição: não dá para comparar, ignora
  return ks.some(function (k) {
    if (conh.chaves[k]) return true;
    return conh.textos.some(function (t) { return t.indexOf(k) >= 0; });
  });
}

// Complemento.gs:95
function cp_palavras_(s) { return vd_semAcento_(s).replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 2; }); }

// Complemento.gs:96
function cp_posicoes_(pal) { var o = {}; pal.forEach(function (w) { var c = CP_POSICAO[w]; if (c) o[CP_EIXO[c]] = c; }); return o; }

// Complemento.gs:97
function cp_fortes_(pal) { return pal.filter(function (w) { return w.length >= 3 && !CP_PAL_FRACA.test(w) && !CP_POSICAO[w]; }); }

// Complemento.gs:100
function cp_similar_(descA, descB) {
  var pa = cp_palavras_(descA), fa = cp_fortes_(pa), xa = cp_posicoes_(pa);
  var pb = cp_palavras_(descB), fb = cp_fortes_(pb), xb = cp_posicoes_(pb);
  if (!fa.length || !fb.length || fa[0] !== fb[0]) return 0;   // RADIADOR x CONDENSADOR
  if (Object.keys(xa).some(function (e) { return xb[e] && xb[e] !== xa[e]; })) return 0;   // FAROL ESQ x FAROL DIR
  var comum = fa.filter(function (w) { return fb.indexOf(w) >= 0; }).length;
  var n = comum / (fa.length + fb.length - comum);
  return n >= 0.5 ? n : 0;
}

// Complemento.gs:110
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

// Complemento.gs:121
function cp_casaManual_(conh, p, usadas) {
  var i = cp_maisParecida_(conh.an.pecas, p, usadas, function (c) { return !!c.complemento; });
  return i >= 0 ? conh.an.pecas[i] : null;
}

// Complemento.gs:130
function cp_comparar_(card, orc, excluirAnexo) {
  var conh = cp_conhecidas_(card, excluirAnexo);
  // atualizar: peça que o card já tem e o orçamento novo traz diferente — código novo (Weslley, 05/10/2026: "pode haver
  // mudança de código da peça, atualizar também") e/ou valor líquido novo. {chave, codigo, valorOrc, descricao}
  // casadas (22/10/2026, AYT6699): chave de cada peça do card que o orçamento traz — o formulário marca "do orçamento" (verde)
  var out = { oficina: [], fo: [], jaTinha: 0, pareadas: [], atualizar: [], paraOficina: [], casadas: [] }, vistos = {}, usadas = {};
  var pecasCard = conh.an.pecas || [];
  var porCodigo = {}; pecasCard.forEach(function (c, i) { var k = cp_norm_(c.codigo); if (k.length >= 4) porCodigo[k] = i; });
  var porDesc = {}; pecasCard.forEach(function (c, i) { var k = cp_norm_(c.descricao); if (k.length >= 4 && !c.pneu) porDesc[k] = i; });
  // 🚫 não comprar: mesmo código ou mesma descrição = o consultor já decidiu por essa peça, não entra de novo (09/10/2026)
  var naoComprar = {}; (conh.an.naoComprar || []).forEach(function (c) { cp_chaves_(c).forEach(function (k) { naoComprar[k] = 1; }); });
  // 15/10/2026 (API do Cilia, BCB8218): item FO que o orçamento novo AINDA traz como FO não foi revertido para a oficina — a peça
  // da oficina parecida é outra ("FAIXA SUP DA PORTA" × "FAIXA DA COLUNA DA PORTA"). Primeiro só com as peças da API; desde
  // 15/10/2026 à tarde (Weslley: "1 sim") vale também para o orçamento lido do PDF — FO cujo código o orçamento novo ainda traz
  // como FO fica no FORNECIMENTO (se o OCR não leu o código, segue a regra de antes).
  var aindaFo = []; if (orc) (orc.fo || []).forEach(function (f) { var k = cp_norm_(f.codigo || f.codigoOrc); if (k.length >= 4) aindaFo.push(k); var ka = cp_norm_(f.codigoAntigo || ''); if (ka.length >= 4) aindaFo.push(ka); });   // 27/10/2026: o código antigo (riscado) também segura o item no FO
  var marcaAtualizar = function (i, p, codigoNovo) {
    var c = pecasCard[i], u = { chave: vd_chavePeca_(c), codigoAntigo: c.codigo || '' };
    var vOrc = vd_valorOrcTxt_(p.valorOrc), vCard = vd_valorOrcTxt_(c.valorOrc);
    if (codigoNovo && cp_norm_(codigoNovo) !== cp_norm_(c.codigo)) u.codigo = String(codigoNovo).replace(/\s+/g, '').toUpperCase();
    if (vOrc && vOrc !== vCard) u.valorOrc = vOrc;
    if (p.descricao || p.descricaoOrc) u.descricao = String(p.descricao || p.descricaoOrc).toUpperCase();
    if (u.codigo || u.valorOrc) out.atualizar.push(u);
    if (out.casadas.indexOf(u.chave) < 0) out.casadas.push(u.chave);
    usadas[i] = 1;
  };
  var junta = function (lista, destino, ehFo) {
    (lista || []).forEach(function (p) {
      var k = cp_chaves_(p).join('|');
      if (vistos[k]) return; vistos[k] = 1;
      var kc = cp_norm_(p.codigo || p.codigoOrc), kd = cp_norm_(p.descricao || p.descricaoOrc);
      // linha de ajuste de valor do laudo (refaturamento, reembolso…) não é peça (11/10/2026, FOB8723)
      if (!p.pneu && CP_NAO_PECA.test(vd_semAcento_(p.descricao || p.descricaoOrc || ''))) return;
      if (!ehFo && cp_chaves_(p).some(function (x) { return naoComprar[x]; })) { out.jaTinha++; return; }
      if (!ehFo && !p.pneu) {
        // mesma peça da oficina pelo código: já tem (valor do orçamento pode ter mudado)
        if (kc.length >= 4 && porCodigo[kc] !== undefined) { out.jaTinha++; marcaAtualizar(porCodigo[kc], p, ''); return; }
        // 27/10/2026 (KPJ9A04): o orçamento trouxe o código antigo riscado ao lado do novo — acha a peça pelo antigo e troca o código
        var kaO = cp_norm_(p.codigoAntigo || '');
        if (kaO.length >= 4 && porCodigo[kaO] !== undefined && !usadas[porCodigo[kaO]]) { out.jaTinha++; marcaAtualizar(porCodigo[kaO], p, p.codigo || p.codigoOrc); return; }
        // código num checklist de COMPRA (PAGAS, PAGAS COMPLEMENTO, COMPLEMENTO antigo): a peça já foi comprada com esse código —
        // não casa pela descrição com outra peça do card (16/10/2026, NPG5429: "8148202130 GRADE ESQ DO PARACHOQUE DIANT",
        // comprada em setembro, casava com "5311202200 GRADE DO PARACHOQUE DIANT" e trocava o código dela)
        if (kc.length >= 4 && (conh.textosCompra || []).some(function (t) { return t.indexOf(kc) >= 0; })) { out.jaTinha++; return; }
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
        var itFo = cp_foParaOficina_(conh, p, aindaFo);
        if (itFo) { out.paraOficina.push({ item: itFo, peca: p }); destino.push(p); return; }
      }
      // 27/10/2026 (KPJ9A04): FO cujo código antigo (riscado no orçamento) está no checklist — segue para o checklist, que troca o código e registra
      var kaF = cp_norm_(p.codigoAntigo || '');
      if (ehFo && kaF.length >= 4 && (conh.chaves[kaF] || conh.textos.some(function (t) { return t.indexOf(kaF) >= 0; })) && !(kc.length >= 4 && (conh.chaves[kc] || conh.textos.some(function (t) { return t.indexOf(kc) >= 0; })))) { destino.push(p); return; }
      if (cp_jaTem_(conh, p)) {
        // FO: já está no checklist pelo código. Com código diferente e descrição conhecida, segue para o checklist,
        // que atualiza o item existente (código/descrição) em vez de repetir — vdf_checklistFornecimento_
        if (ehFo && !(kc.length >= 4 && (conh.chaves[kc] || conh.textos.some(function (t) { return t.indexOf(kc) >= 0; })))) { destino.push(p); return; }
        // item FO com o código GRUDADO na descrição ("5Q0919275CGRUSENSOR DE …"): segue para o checklist, que reescreve o item
        // como "CÓDIGO DESCRIÇÃO" (13/10/2026, STG3I57)
        if (ehFo && kc.length >= 6 && cp_itemColado_(card, kc)) { destino.push(p); return; }
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

// Complemento.gs:215
function cp_foParaOficina_(conh, p, aindaFo) {
  var kc = cp_norm_(p.codigo || p.codigoOrc), desc = p.descricao || p.descricaoOrc || '';
  var foItens = (conh.foItens || []).filter(function (i) { var n = cp_norm_(i.name); return !(aindaFo || []).some(function (k) { return n.indexOf(k) >= 0; }); });
  var naLista = (conh.an.pecas || []).concat(conh.an.naoComprar || []).some(function (c) {
    return (kc.length >= 4 && cp_norm_(c.codigo) === kc) || (!c.pneu && cp_similar_(desc, c.descricao) > 0);
  });
  if (naLista) return null;
  var cands = foItens.filter(function (i) { return i.state !== 'complete'; });
  // pelo código vale também item já ✔ (14/10/2026, JDC7H45: a bandeja revertida para a oficina tinha sido marcada no
  // FORNECIMENTO porque usaram uma do estoque); pela descrição, só o que ainda não chegou
  var porCod = kc.length >= 6 ? foItens.filter(function (i) { return cp_norm_(i.name).indexOf(kc) >= 0; })[0] :
    kc.length >= 4 ? cands.filter(function (i) { return cp_norm_(i.name).indexOf(kc) >= 0; })[0] : null;
  if (porCod) return porCod;
  var melhor = null, nota = 0;
  cands.forEach(function (i) {
    var base = String(i.name).replace(/^[A-Z0-9][A-Z0-9.\-\/]{3,}\s+/i, '').split(/\s+[-—]\s+/)[0];
    var n = cp_similar_(desc, base);
    if (n > nota) { nota = n; melhor = i; }
  });
  return melhor;
}

// Complemento.gs:238
function cp_trocarCodigos_(texto, atualizar) {
  var t = String(texto || '');
  (atualizar || []).forEach(function (u) {
    if (!u.codigo || !u.codigoAntigo || u.codigo === u.codigoAntigo) return;
    t = t.replace(new RegExp('(^|[^A-Z0-9])' + String(u.codigoAntigo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Z0-9])', 'gi'), '$1' + u.codigo);
  });
  return t;
}

// Complemento.gs:248
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

// Complemento.gs:266
function cp_hoje_() { return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM'); }

// Complemento.gs:269
function cp_linhaFo_(n) { return '**' + CP.FO + ':** ' + n + ' peça(s) — ver checklist ' + CP.FO; }

// Complemento.gs:272
function cp_contarChecklist_(cardId, nome, token) {
  var ls = vd_api_('/cards/' + cardId + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name' } }, token);
  var n = 0;
  ls.forEach(function (k) { if (String(k.name || '').trim().toUpperCase() === nome) n += (k.checkItems || []).length; });
  return n;
}

// Complemento.gs:283
function cp_inserirNoBloco_(bloco, novas, nFo) {
  var linhas = String(bloco || '').split('\n');
  var ini = -1;
  for (var i = 0; i < linhas.length; i++) if (/^\s*PE[ÇC]AS\s*:?\s*$/i.test(vd_limpar_(linhas[i]))) { ini = i; break; }
  var data = cp_hoje_();
  var novasTxt = novas.map(function (p) {
    var q = { pneu: !!p.pneu, codigo: String(p.codigo || '').replace(/\s+/g, '').toUpperCase(), descricao: String(p.descricao || '').toUpperCase(), tipos: p.tipos || [],
      medida: p.medida || '', categoria: p.categoria || '', marca: p.marca || '', qtd: p.qtd || '', complemento: true, compData: p.compData || data, valorOrc: p.valorOrc || '' };
    return vd_linhaPeca_(q, 0).replace(/^\d+\.\s*/, '');
  });
  var idxPecas = [], semOf = -1, fim = -1;
  if (ini >= 0) {
    for (var j = ini + 1; j < linhas.length; j++) {
      var l = vd_limpar_(linhas[j]).trim();
      if (!l) { if (idxPecas.length || semOf >= 0) break; continue; }
      if (/^(OBS|OBSERVA[ÇC][ÃA]O|PEDIDO ENVIADO|↳|FORNECIMENTO|FO\b|DADOS DO CARRO|-{3,}|={3,})/i.test(l)) break;
      if (/^NENHUMA PE[ÇC]A/i.test(l)) { semOf = j; break; }
      idxPecas.push(j);
    }
  }
  if (novasTxt.length) {
    if (ini < 0) {
      linhas.push('', '**PEÇAS:**');
      novasTxt.forEach(function (t) { linhas.push(t); });
      ini = linhas.length - novasTxt.length - 1;
      idxPecas = novasTxt.map(function (t, k) { return ini + 1 + k; });
    } else if (semOf >= 0) {
      linhas.splice.apply(linhas, [semOf, 1].concat(novasTxt));
      idxPecas = novasTxt.map(function (t, k) { return semOf + k; });
    } else {
      // depois da última peça que não é particular
      var primeiro = idxPecas.length ? idxPecas[0] : ini + 1;
      var depois = primeiro - 1;
      idxPecas.forEach(function (ix) { if (!vd_analisarPeca_(vd_limpar_(linhas[ix]).replace(/^\s*(?:\d+\s*[.)\-]|[-•*])\s*/, ''), 1).particular) depois = ix; });
      linhas.splice.apply(linhas, [depois + 1, 0].concat(novasTxt));
      var total = idxPecas.length + novasTxt.length;
      idxPecas = []; for (var t = 0; t < total; t++) idxPecas.push(primeiro + t);
    }
    idxPecas.forEach(function (ix, k) { linhas[ix] = (k + 1) + '. ' + linhas[ix].replace(/^\s*(?:\d+\s*[.)\-]|[-•*])\s*/, ''); });
  }
  if (nFo) {
    var achou = false;
    for (var a = 0; a < linhas.length; a++) {
      if (/^FORNECIMENTO COMPLEMENTO/i.test(vd_limpar_(linhas[a]).trim())) { linhas[a] = cp_linhaFo_(nFo); achou = true; break; }
    }
    if (!achou) {
      var pos = -1;
      for (var b = 0; b < linhas.length; b++) if (/^FORNECIMENTO \(SEGURADORA\)/i.test(vd_limpar_(linhas[b]).trim())) pos = b;
      if (pos < 0) {
        // logo depois da lista de peças
        pos = ini;
        for (var c2 = ini + 1; ini >= 0 && c2 < linhas.length; c2++) { var lc = vd_limpar_(linhas[c2]).trim(); if (!lc) break; pos = c2; }
        if (pos < 0) pos = linhas.length - 1;
        linhas.splice(pos + 1, 0, '', cp_linhaFo_(nFo));
      } else {
        linhas.splice(pos + 1, 0, cp_linhaFo_(nFo));
      }
    }
  }
  return linhas.join('\n');
}

// Complemento.gs:346
function cp_nome_(p) {
  return p.pneu ? 'PNEU ' + String(p.medida || '').replace(/\s+/g, '') + (p.marca ? ' ' + p.marca : '')
    : ((String(p.codigo || p.codigoOrc || '').replace(/\s+/g, '') + ' ').trim() + ' ' + String(p.descricao || p.descricaoOrc || '')).trim() + (p.qtd && +p.qtd > 1 ? ' (x' + p.qtd + ')' : '');
}

// Complemento.gs:352
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
  if ((paraOficina || []).length) t += '\n⚠️ Se a seguradora entregar a peça revertida: **recusar na entrega** (ou devolver) e registrar na aba 📦 Recebimento.';
  (atualizadas || []).forEach(function (u) {
    t += '\n🔄 **Atualizada:** ' + (u.codigoAntigo || u.chave) + (u.codigo ? ' → código ' + u.codigo : '') + (u.valorOrc ? ' · orç. ' + u.valorOrc : '');
  });
  if (urlTipos && semTipo) t += '\n✏️ ' + urlTipos;
  return t;
}

// Complemento.gs:375
function vdf_compararComplemento(token, shortLink, o, idAnexo) {
  vdf_usuario_(token);
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard', checklists: 'all', checkItem_fields: 'name', attachments: 'true', attachment_fields: 'name,date,mimeType' } });
  // 13/10/2026 (UIC5G94): orçamento ANTIGO do card (há outro orçamento/laudo anexado DEPOIS dele) foi substituído pelo
  // mais novo — reler não traz peça nova (o de 11/09 tinha tudo pela oficina; o laudo 2.1 passou tudo para a HDI)
  if (idAnexo) {
    var axA = (card.attachments || []).filter(function (x) { return x.id === idAnexo; })[0];
    var ehDoc = function (x) { var n = String(x.name || ''); return (/pdf/i.test(x.mimeType || '') || /\.pdf$/i.test(n)) && !ax_ehNota_(n) && !/^🚚 |^📸 |^🧾 /.test(n); };
    if (axA && (card.attachments || []).some(function (x) { return x.id !== axA.id && ehDoc(x) && String(x.date || '') > String(axA.date || ''); })) {
      return { oficina: [], fo: [], jaTinha: ((o && o.oficina) || []).length + ((o && o.fo) || []).length, pareadas: [], atualizar: [], paraOficina: [], jaProcessado: true, antigo: true };
    }
  }
  // 13/10/2026 (BDK2J49): "ler de novo" um orçamento que JÁ está no card e já foi processado não é complemento novo — as
  // peças dele contam como conhecidas (compradas no fluxo antigo, tiradas de propósito etc.). Só anexo novo é comparado sem ele.
  var excluir = idAnexo || '';
  if (excluir) {
    try {
      var axE = (card.attachments || []).filter(function (x) { return x.id === excluir; })[0];
      if ((axE && /^📄 ORÇ\+? · /.test(String(axE.name || ''))) ||
          JSON.parse(PropertiesService.getScriptProperties().getProperty('CP_VISTOS') || '[]').indexOf(excluir) >= 0) excluir = '';   // já processado
    } catch (e) {}
  }
  if (idAnexo && !excluir) {   // orçamento já processado: nada da OFICINA entra de novo (o cache pode não guardar orçamento grande)
    // ...mas peça FORNECIDA pela seguradora que não está em nenhum checklist entra (não gera compra; 13/10/2026, UIC5G94:
    // VENTOINHA do laudo 2.1 ficou de fora do card e reler o laudo não a trazia)
    var foFalta = [];
    try { foFalta = cp_comparar_(card, { oficina: [], fo: (o && o.fo) || [] }, idAnexo).fo || []; } catch (e) {}
    // aqui só entra peça que FALTA: código diferente de uma peça que já está no checklist (ex.: HDI "1988 FAROL DIREITO" x
    // "5U7941006C FAROL DIREITO") não troca o código bom do item
    var itensFo = [];
    (card.checklists || []).forEach(function (k) { if (/FORNECIMENTO/i.test(k.name || '')) (k.checkItems || []).forEach(function (i) { itensFo.push(String(i.name || '')); }); });
    foFalta = foFalta.filter(function (p) {
      var kcF = cp_norm_(p.codigo || p.codigoOrc); if (kcF.length >= 6 && cp_itemColado_(card, kcF)) return true;
      // 27/10/2026 (KPJ9A04): o orçamento diz explicitamente qual era o código antigo (riscado) — item com esse código recebe o novo
      var kaF = cp_norm_(p.codigoAntigo || ''); if (kaF.length >= 4 && itensFo.some(function (n) { return cp_norm_(n).indexOf(kaF) >= 0; })) return true;
      return !itensFo.some(function (n) { return cp_similar_(p.descricao || '', n.replace(/^\S*\d\S*\s+/, '').replace(/\s+-\s+[^-]+$/, '')) > 0; });
    });
    // ...e peça que ERA fornecida (está no checklist FORNECIMENTO) e o orçamento traz como da OFICINA (revertida pela
    // seguradora) entra, casando só pelo CÓDIGO (14/10/2026, JDC7H45: bandeja revertida para a oficina; o card encerrou)
    var revert = [], cmpOf = null;
    try { cmpOf = cp_comparar_(card, { oficina: (o && o.oficina) || [], fo: [] }, idAnexo); } catch (e) {}
    try {
      revert = ((cmpOf && cmpOf.paraOficina) || []).filter(function (x) {
        var kcR = cp_norm_(x.peca.codigo || x.peca.codigoOrc);
        return kcR.length >= 6 && cp_norm_(x.item.name).indexOf(kcR) >= 0;
      });
    } catch (e) {}
    // 22/10/2026 (Weslley, AYT6699: "leio um orçamento que o orçamentista já tinha lançado manualmente e o sistema não atualiza o
    // código"): reler o orçamento já processado também atualiza código/valor da peça que o card já tem (casada pelo código ou pela
    // descrição) — nada da oficina entra de novo; a mudança só vale quando quem editou clicar em Enviar
    return { oficina: revert.map(function (x) { return x.peca; }), fo: foFalta, jaTinha: ((o && o.oficina) || []).length + ((o && o.fo) || []).length - foFalta.length - revert.length, pareadas: [],
      atualizar: (cmpOf && cmpOf.atualizar) || [], casadas: (cmpOf && cmpOf.casadas) || [],
      paraOficina: revert.map(function (x) { return { itemId: x.item.id, nome: x.item.name, lista: x.item.lista || '', peca: cp_nome_(x.peca) }; }), jaProcessado: true };
  }
  var r = cp_comparar_(card, { oficina: (o && o.oficina) || [], fo: (o && o.fo) || [] }, excluir);
  return { oficina: r.oficina, fo: r.fo, jaTinha: r.jaTinha, pareadas: r.pareadas, atualizar: r.atualizar || [], casadas: r.casadas || [], paraOficina: (r.paraOficina || []).map(function (x) { return { itemId: x.item.id, nome: x.item.name, lista: x.item.lista || '', peca: cp_nome_(x.peca) }; }) };
}

// Complemento.gs:434
function cp_itemColado_(card, kc) {
  return (card.checklists || []).some(function (k) {
    return /FORNECIMENTO/i.test(k.name || '') && (k.checkItems || []).some(function (i) {
      var n = vd_semAcento_(String(i.name || '')).toUpperCase();
      return n.indexOf(kc) === 0 && /^[A-Z]{3}/.test(n.slice(kc.length));
    });
  });
}

// Complemento.gs:444
function cp_marcarVistos_(ids) {
  if (!ids || !ids.length) return;
  sg_secao_('CP_VISTOS', function () {   // ler-modificar-gravar protegido (10/10/2026)
    var props = PropertiesService.getScriptProperties();
    var l = []; try { l = JSON.parse(props.getProperty('CP_VISTOS') || '[]'); } catch (e) {}
    ids.forEach(function (id) { if (l.indexOf(id) < 0) l.push(id); });
    props.setProperty('CP_VISTOS', JSON.stringify(l.slice(-CP.MAX_VISTOS)));
  });
}

// Complemento.gs:456
function cp_ligado_() { return vd_prop_('CP_LIGADO', 'SIM') !== 'NAO'; }

// Complemento.gs:459
function cp_criadoEm_(id) { return parseInt(String(id).slice(0, 8), 16) * 1000; }

// Complemento.gs:461
function cp_executar_() {
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO' || !cp_ligado_()) return 0;
  var props = PropertiesService.getScriptProperties();
  // histórico do quadro: só os anexos novos desde a última rodada (antes baixava os anexos de todos os cards)
  var desde = vd_marca_('CP_ACT');
  if (!desde) {
    var antigo = +(vd_marca_('CP_DESDE') || 0);   // marcador antigo (ms) continua valendo na troca
    desde = new Date(antigo || Date.now()).toISOString();
    vd_marcaSet_('CP_ACT', desde);
    if (!antigo) return 0;
  }
  var vistos = []; try { vistos = JSON.parse(props.getProperty('CP_VISTOS') || '[]'); } catch (e) {}
  var prazo = vd_prazo_(60 * 1000);   // não passa do fim do ciclo (10/10/2026)
  var ctx = vd_contexto_();
  // anexos cuja leitura falhou (OCR do Google fora do ar na hora): tenta de novo nos ciclos seguintes, até 3 vezes (07/10/2026)
  var retry = []; try { retry = JSON.parse(props.getProperty('CP_RETRY') || '[]'); } catch (e) {}
  var retryNovo = [], n = 0, mudou = false;
  retry.forEach(function (x) {
    if (Date.now() > prazo) { retryNovo.push(x); return; }
    var a; try { a = vd_api_('/cards/' + x.c + '/attachments/' + x.a, { cru: true, query: { fields: 'name,mimeType,isUpload,bytes,url,date' } }); } catch (e) { return; }
    var res = false; try { res = cp_doAnexo_({ id: x.c, name: x.nome || '' }, a, ctx); } catch (e) { console.log('complemento (retry) ' + x.nome + ': ' + e); }
    if (res === 'erro' && x.n < 3) retryNovo.push({ c: x.c, a: x.a, nome: x.nome, n: x.n + 1 });
    else if (res === true) n++;
  });
  if (retry.length !== retryNovo.length || retry.length) props.setProperty('CP_RETRY', JSON.stringify(retryNovo.slice(-20)));
  var acts = vd_acoesQuadro_(ctx.board, { filter: 'addAttachmentToCard', since: desde, limit: 100, fields: 'data,date', memberCreator: 'true', memberCreator_fields: 'username' });
  if (!acts.length) return n;
  acts.reverse();   // mais antigo primeiro
  var ultima = desde;
  for (var k = 0; k < acts.length; k++) {
    if (Date.now() > prazo) break;
    var ac = acts[k], d = ac.data || {}, c = d.card || {}, at = d.attachment || {};
    ultima = new Date(new Date(ac.date).getTime() + 1).toISOString();
    if (!c.id || !at.id || vistos.indexOf(at.id) >= 0) continue;
    if (vdf_cardProtegido_(c.name || '') || /^\s*AVISO\b/i.test(c.name || '') || /NOVO PEDIDO DE PE[ÇC]A/i.test(c.name || '')) continue;
    if (vd_legado_(c.id)) continue;
    var a;
    try { a = vd_api_('/cards/' + c.id + '/attachments/' + at.id, { cru: true, query: { fields: 'name,mimeType,isUpload,bytes,url,date' } }); } catch (e) { continue; }
    // mesmo arquivo subido de novo à mão (conteúdo igual, conferido por hash): apaga o repetido e comenta (06/10/2026)
    if (a.isUpload && ax_removerRepetido_(c.id, a, ac.memberCreator ? ac.memberCreator.username : '')) { vistos.push(a.id); mudou = true; continue; }
    if (ax_semLeituraRobo_(a.name)) { vistos.push(a.id); mudou = true; continue; }   // nota/foto/comprovante já batizado pelo sistema: não é orçamento
    if (!vd_anexoLegivel_(a)) continue;
    if (new Date(a.date).getTime() - cp_criadoEm_(c.id) <= CP.ESPERA_CRIACAO_MS) continue;   // orçamento original do card
    vistos.push(a.id); mudou = true;
    try {
      var res2 = cp_doAnexo_(c, a, ctx);
      if (res2 === true) n++;
      else if (res2 === 'erro') { retryNovo.push({ c: c.id, a: a.id, nome: c.name || '', n: 1 }); props.setProperty('CP_RETRY', JSON.stringify(retryNovo.slice(-20))); }
    } catch (e) { console.log('complemento ' + c.name + ': ' + e); }
  }
  vd_marcaSet_('CP_ACT', ultima);
  if (mudou) props.setProperty('CP_VISTOS', JSON.stringify(vistos.slice(-CP.MAX_VISTOS)));
  return n;
}

// Complemento.gs:518
function cp_doAnexo_(c, a, ctx) {
  var r = vd_lerAnexoTrello_(a, { orcCompleto: true });
  if (!r || r.erro) return r && r.erro ? 'erro' : false;
  var card = vd_api_('/cards/' + c.id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name', attachments: 'true', attachment_fields: 'name' } });
  var an = vd_analisar_(card.desc || '', card.name);
  var lp = vd_linhasPecas_(an.div.bloco);
  // nome padronizado para o anexo subido à mão (05/10/2026): orçamento (complementar se o card já tem peças) ou Status do Pedido
  ax_batizarLido_(card, a, r, !!(lp.linhas.length || (card.attachments || []).some(function (x) { return String(x.name || '').indexOf(AX.ORC + AX.SEP) === 0; })));
  var placa = an.dados.placa;
  // 10/10/2026 (revisão): leitura que não serve não fica mais em silêncio — PDF em card que espera orçamento e não foi
  // reconhecido, ou orçamento de OUTRA placa, ganham um comentário (uma vez por anexo; o anexo é marcado visto)
  var listaNome = ''; try { listaNome = vd_nomeColuna_(vdf_nomeLista_(ctx, card.idList)); } catch (e) {}
  if (!r.orcamento) {
    // laudo HDI ainda sem peças ("Peças em processo de cotação"): não é erro de leitura — a HDI ainda não fechou as peças (11/10/2026, BXZ4J84)
    if (r.doc === 'LAUDO_HDI') {
      if (/FALTA DADOS/i.test(listaNome)) { try { vd_comentar_(card, '📄 «' + a.name + '» é o laudo da HDI, mas as peças ainda estão em cotação na HDI (o laudo não lista peças). Quando a HDI fechar as peças, anexar o laudo novo.'); } catch (e) {} }
      return false;
    }
    if (!r.doc && /pdf/i.test(a.mimeType || '') && /FALTA DADOS/i.test(listaNome)) {   // Status do Pedido / Peças HDI são anexos legítimos (r.doc)
      try { vd_comentar_(card, '📄 Li o anexo «' + a.name + '» mas não reconheci um orçamento de seguradora (Cilia, HDI ou Websoma/Porto)' + (r.doc ? ' — parece ' + (r.docNome || 'outro documento') : '') + '. Se for o orçamento, anexe o PDF original do sistema da seguradora (ou um print legível da lista de peças).'); } catch (e) {}
    }
    return false;
  }
  if (!lp.linhas.length && !lp.semOficina) return false;   // card sem lista: a importação normal cuida
  if (!placa || !(r.placas || []).some(function (p) { return vd_mesmaPlaca_(p, placa); })) {
    if (placa && (r.placas || []).length) { try { vd_comentar_(card, '📄 O anexo «' + a.name + '» é um orçamento (' + r.orcamento + ') da placa **' + r.placas.join(' / ') + '**, não deste card (' + placa + ') — não importei. Se for outro carro, anexe no card certo.'); } catch (e) {} }
    return false;
  }
  // 11/10/2026 (Weslley, "corrigir tudo"): dois casos em que o PDF anexado NÃO é complemento e o robô não importa —
  //  1) PDF do Cilia em sinistro HDI: o Cilia traz tudo como peça da oficina; o que a HDI fornece (FO) e o que a oficina compra
  //     quem diz é o laudo HDI (BXZ4J84/SDX5I55: FO virou "peça nova" e saiu do checklist FORNECIMENTO);
  //  2) card de RETORNO: o orçamento traz as peças do sinistro todo, já compradas no card original (BBV0H58/BAT9F19).
  var segCard = vd_semAcento_(((an.dados && an.dados.seguradora) || '') + ' ' + (card.name || ''));
  if (r.orcamento === 'CILIA' && /\bHDI\b/.test(segCard)) {
    try { vd_comentar_(card, '📄 «' + a.name + '» é o orçamento do **Cilia**; neste sinistro **HDI** quem diz o que a HDI fornece (FO) e o que a oficina compra é o laudo da HDI — não importei. Para complemento, anexe o PDF do laudo HDI.'); } catch (e) {}
    return false;
  }
  if (/\bRETORNO\b/.test(segCard)) {
    try { vd_comentar_(card, '📄 Card de **RETORNO**: o orçamento «' + a.name + '» traz as peças do sinistro todo (as do card original já foram compradas) — não importei. Peça nova do retorno entra pelo ✏️ EDITAR/INCLUIR PEÇA.'); } catch (e) {}
    return false;
  }
  var orc = r.orcFull || (r.orc ? { oficina: vd_orcExpandir_(r.orc.o), fo: vd_orcExpandir_(r.orc.f) } : null);
  if (!orc) return false;
  orc = vd_orcCss_(orc, card.name);   // CSS (Zacarias): tudo é FO (08/10/2026)
  var cmp = cp_comparar_(card, orc, a.id);
  if (!cmp.oficina.length && !cmp.fo.length && !(cmp.atualizar || []).length) return false;
  cp_aplicar_(card, cmp, { origem: r.orcamento, anexo: a.name, quem: 'robô', token: null, ctx: ctx });
  return true;
}

// Complemento.gs:572
function vdf_varrerTrocasCodigo(token, p) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria.'] };
  p = vdf_entrada_(p);
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due', attachments: 'true', attachment_fields: 'name,fileName,mimeType,isUpload,bytes,url,date' } });
  if (vdf_cardProtegido_(card.name)) return { ok: true, trocas: [], anexo: '', aplicado: false };
  var cilia = (card.attachments || []).filter(function (a) { return /CILIA/i.test(a.name || '') && /^📄 OR[ÇC]\+? · /.test(a.name || '') && vd_anexoLegivel_(a); })
    .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
  if (!cilia.length) return { ok: true, trocas: [], anexo: '', aplicado: false };
  var a = cilia[0], r = null;
  try { r = vd_lerAnexoTrello_(a, { orcCompleto: true }); } catch (e) { return { ok: false, faltas: ['não li o anexo: ' + e] }; }
  var orc = r && (r.orcFull || (r.orc ? { oficina: vd_orcExpandir_(r.orc.o), fo: vd_orcExpandir_(r.orc.f) } : null));
  if (!orc) return { ok: true, trocas: [], anexo: a.name, aplicado: false, semLeitura: true };
  var an = vd_analisar_(card.desc, card.name);
  var itensFo = []; (card.checklists || []).forEach(function (k) { if (/FORNECIMENTO/i.test(k.name || '')) (k.checkItems || []).forEach(function (i) { itensFo.push(vd_semAcento_(i.name)); }); });
  var trocas = [], foAplicar = [], atualizar = [];
  (orc.fo || []).forEach(function (x) {
    var ka = String(x.codigoAntigo || '').replace(/\s+/g, ''), kn = String(x.codigo || '').replace(/\s+/g, '');
    if (!ka || !kn || ka === kn) return;
    if (itensFo.some(function (n) { return vd_casaItem_(n, vd_semAcento_(ka)); }) && !itensFo.some(function (n) { return vd_casaItem_(n, vd_semAcento_(kn)); })) {
      trocas.push({ onde: 'FORNECIMENTO', desc: x.descricao, antigo: ka, novo: kn }); foAplicar.push(x);
    }
  });
  (orc.oficina || []).forEach(function (x) {
    var ka = String(x.codigoAntigo || '').replace(/\s+/g, ''), kn = String(x.codigo || '').replace(/\s+/g, '');
    if (!ka || !kn || ka === kn) return;
    var pc = (an.pecas || []).filter(function (c) { return cp_norm_(c.codigo) === cp_norm_(ka); })[0];
    if (pc && !(an.pecas || []).some(function (c) { return cp_norm_(c.codigo) === cp_norm_(kn); })) {
      trocas.push({ onde: 'oficina', desc: x.descricao, antigo: ka, novo: kn }); atualizar.push({ chave: vd_chavePeca_(pc), codigoAntigo: pc.codigo || '', codigo: kn, descricao: String(x.descricao || '').toUpperCase() });
    }
  });
  if (!trocas.length || !p.aplicar) return { ok: true, trocas: trocas, anexo: a.name, aplicado: false };
  var ctx = vd_contexto_();
  if (foAplicar.length) {
    vdf_checklistFornecimento_(card.id, foAplicar, null, 'FORNECIMENTO');
    try { vdf_registrarTrocasFo_(card, null, 'orçamento CILIA · ' + a.name, me.username); } catch (e) {}
  }
  if (atualizar.length) {
    cp_aplicar_(card, { oficina: [], fo: [], jaTinha: 0, pareadas: [], atualizar: atualizar, paraOficina: [], casadas: [] }, { origem: 'CILIA', anexo: a.name, quem: me.username, token: null, ctx: ctx });
  }
  return { ok: true, trocas: trocas, anexo: a.name, aplicado: true };
}

// Complemento.gs:616
function cp_aplicar_(card, cmp, o) {
  var nFoTotal = 0;
  if (cmp.fo.length) {
    vdf_checklistFornecimento_(card.id, cmp.fo, o.token, CP.FO);
    try { vdf_registrarTrocasFo_(card, o.token, 'orçamento ' + (o.origem || '') + (o.anexo ? ' · ' + o.anexo : ''), o.quem || 'robô'); } catch (e) {}   // 27/10/2026: código trocado no FO fica registrado
    nFoTotal = cp_contarChecklist_(card.id, CP.FO, o.token);
  }
  var div = vd_dividir_(card.desc);
  var blocoAtu = cp_atualizarNoBloco_(div.bloco, cmp.atualizar);
  var resto = cp_trocarCodigos_(div.resto, cmp.atualizar);   // cotações/autorizações/compras abaixo da linha seguem o código novo
  // código trocado não é peça nova: a base de assinaturas passa a ser a lista atualizada (as peças novas de verdade ficam fora dela)
  if ((cmp.atualizar || []).some(function (u) { return u.codigo; })) { try { vd_pkSet_(card.id, vd_linhasConsultor_(blocoAtu).map(vd_sigItem_)); } catch (e) {} }
  var bloco = cp_inserirNoBloco_(blocoAtu, cmp.oficina, nFoTotal);
  vd_backup_(card, 'orçamento complementar (' + (o.origem || '') + ')');
  // peça que passou de FO para oficina: sai do checklist FORNECIMENTO (a linha da oficina já entrou acima)
  (cmp.paraOficina || []).forEach(function (x) {
    try { vd_api_('/cards/' + card.id + '/checkItem/' + x.item.id, { method: 'delete' }, o.token); } catch (e) { console.log('complemento/FO→oficina: ' + e); }
  });
  try { cp_revGuardar_(card.id, (cmp.paraOficina || []).map(function (x) { return x.item.name; }), o.quem || 'robô'); } catch (e) {}
  vd_gravarDesc_(card.id, bloco + (div.temMarcador ? '\n\n' + resto : '\n\n' + VD.MARCADOR), o.token);
  var quem = ''; try { quem = vd_criador_(card.id); } catch (e) {}
  var url = o.ctx && o.ctx.urlForm ? o.ctx.urlForm + '?card=' + card.shortLink + '&so=tipos' : '';
  if (!o.semComentario) try { vd_comentar_(card, (quem && cmp.oficina.length ? '@' + quem + ' ' : '') + cp_textoComentario_('', o.origem, o.anexo, cmp.oficina, cmp.fo, cmp.jaTinha, url, cmp.pareadas, cmp.atualizar, cmp.paraOficina)); } catch (e) {}
  try {
    ev_registrar_('COMPLEMENTO', card, o.quem || 'robô', cmp.oficina.map(ev_peca_).concat(cmp.fo.map(function (p) { var e = ev_peca_(p); e.fornecedor = 'SEGURADORA (FO)'; return e; })),
      { detalhe: cmp.oficina.length + ' oficina · ' + cmp.fo.length + ' FO · ' + (o.origem || '') });
  } catch (e) {}
  // só FO nova num card já encerrado: volta para FALTA CHEGAR (peça da oficina nova o robô devolve para cotação)
  if (cmp.fo.length && !cmp.oficina.length) { try { rc_reavaliarColuna_(card.id, o.token, o.quem || 'robô'); } catch (e) { console.log('complemento/coluna: ' + e); } }
}

// Complemento.gs:653
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

// Complemento.gs:689
function cp_revLista_(cardId) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('FO_REV_' + cardId) || '[]'); } catch (e) { return []; }
}

// Complemento.gs:692
function cp_revGuardar_(cardId, nomes, por) {
  nomes = (nomes || []).filter(String);
  if (!nomes.length) return;
  sg_secao_('FO_REV_' + cardId, function () {
    var l = cp_revLista_(cardId), hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
    nomes.forEach(function (n) {
      var base = rc_semMarcas_(n).split(/\s+[-—]\s+/)[0].trim();
      if (!l.some(function (x) { return x.nome === base && !x.fim; })) l.push({ nome: base, quando: hoje, por: por || '' });
    });
    PropertiesService.getScriptProperties().setProperty('FO_REV_' + cardId, JSON.stringify(l.slice(-20)));
  });
}

// Complemento.gs:706
function vdf_foRevertidas(token, shortLink) {
  vdf_usuario_(token);
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'idBoard' } });
  if (PropertiesService.getScriptProperties().getProperty('FO_REV_' + card.id) === null) { try { cp_revDosComentarios_(card.id); } catch (e) { console.log('FO revertida (comentários): ' + e); } }
  return cp_revLista_(card.id).filter(function (x) { return !x.fim; });
}

// Complemento.gs:714
function cp_revDosComentarios_(cardId) {
  var acts = vd_api_('/cards/' + cardId + '/actions', { cru: true, query: { filter: 'commentCard', limit: 300, fields: 'data,date' } }) || [];
  var l = [], fim = {};
  acts.slice().reverse().forEach(function (a) {   // mais antigo primeiro
    var txt = String((a.data && a.data.text) || ''), quando = Utilities.formatDate(new Date(a.date), 'America/Sao_Paulo', 'dd/MM/yyyy');
    txt.split('\n').forEach(function (ln) {
      var m = ln.match(/🔁 \*\*Passou para a oficina:\*\*\s*(.+?)\s+—\s+era fornecida/);
      if (m && !l.some(function (x) { return x.nome === m[1].trim(); })) l.push({ nome: m[1].trim(), quando: quando, por: '' });
      var f = ln.match(/↩️ \*\*FO REVERTIDA (RECUSADA|DEVOLVIDA)\*\*\s+—\s+(.+?)\s+·/);
      if (f) fim[f[2].trim()] = f[1].toLowerCase() + ' ' + quando.slice(0, 5);
    });
  });
  l.forEach(function (x) { if (fim[x.nome]) x.fim = fim[x.nome]; });
  PropertiesService.getScriptProperties().setProperty('FO_REV_' + cardId, JSON.stringify(l.slice(-20)));
}

// Complemento.gs:730
function vdf_foRevertidaDevolvida(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,shortLink,shortUrl,idBoard,idList' } });
  if (!vdf_podeReceber_(me, card)) return { ok: false, faltas: ['Sua conta (' + me.username + ') não registra recebimento neste card.'] };
  var acao = p.acao === 'devolvida' ? 'devolvida' : 'recusada', obs = String(p.obs || '').replace(/\s*\n\s*/g, ' ').trim();
  var achou = null;
  sg_secao_('FO_REV_' + card.id, function () {
    var l = cp_revLista_(card.id);
    achou = l.filter(function (x) { return x.nome === p.nome && !x.fim; })[0] || null;
    if (!achou) return;
    achou.fim = acao + ' ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM') + ' ' + me.username;
    PropertiesService.getScriptProperties().setProperty('FO_REV_' + card.id, JSON.stringify(l));
  });
  if (!achou) return { ok: false, faltas: ['Peça revertida não encontrada (atualize a página).'] };
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '↩️ **FO REVERTIDA ' + acao.toUpperCase() + '** — ' + achou.nome + ' · ' + me.fullName +
    '\n_A seguradora entregou a peça que tinha passado para a oficina em ' + achou.quando + ' — ' + (acao === 'recusada' ? 'recusada na entrega' : 'devolvida') + '; não entra no FORNECIMENTO._' + (obs ? '\n📝 ' + obs : '') } }, token); } catch (e) {}
  try { ev_registrar_('DEVOLUÇÃO FO', card, me.username, [{ peca: achou.nome, detalhe: 'revertida para a oficina — ' + acao }], { detalhe: 'FO revertida ' + acao + (obs ? ' — ' + obs : '') }); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, peca: achou.nome, acao: acao };
}

// Corretivo.gs:48
function cr_executar_() {
  var props = PropertiesService.getScriptProperties();
  try { cr_executarB_(); } catch (e) { console.log('correção 11/10 (B): ' + e); }
  if (props.getProperty(CR.CHAVE) === 'FEITO') return 0;
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var ok = []; try { ok = JSON.parse(props.getProperty(CR.CHAVE + '_OK') || '[]'); } catch (e) {}
  var tent = {}; try { tent = JSON.parse(props.getProperty(CR.CHAVE + '_TENT') || '{}'); } catch (e) {}
  var ctx = vd_contexto_(), backups = null, n = 0;
  for (var i = 0; i < CR.CARDS.length; i++) {
    var c = CR.CARDS[i];
    if (ok.indexOf(c.sl) >= 0) continue;
    if (vd_restante_() < 25 * 1000) break;   // continua no próximo ciclo
    if ((tent[c.sl] || 0) >= 3) { ok.push(c.sl); console.log('correção 11/10 ' + c.placa + ': desisti depois de 3 tentativas'); continue; }
    tent[c.sl] = (tent[c.sl] || 0) + 1;
    props.setProperty(CR.CHAVE + '_TENT', JSON.stringify(tent));
    try {
      if (!backups) backups = cr_backups_();
      var r = cr_corrigir_(c, ctx, backups[c.sl]);
      console.log('correção 11/10 ' + c.placa + ': ' + r);
      ok.push(c.sl); n++;
    } catch (e) { console.log('correção 11/10 ' + c.placa + ' (tentativa ' + tent[c.sl] + '): ' + e); }
    props.setProperty(CR.CHAVE + '_OK', JSON.stringify(ok));
  }
  if (CR.CARDS.every(function (c) { return ok.indexOf(c.sl) >= 0; })) props.setProperty(CR.CHAVE, 'FEITO');
  return n;
}

// Corretivo.gs:76
function cr_backups_() {
  var out = {}, v = vd_planilhaBackup_().getDataRange().getValues();
  var sls = CR.CARDS.map(function (c) { return c.sl; });
  for (var i = 1; i < v.length; i++) {
    var d = v[i][0];
    if (!(d instanceof Date) || Utilities.formatDate(d, 'America/Sao_Paulo', 'yyyy-MM-dd') !== CR.DIA) continue;
    if (!/^or[çc]amento complementar/i.test(String(v[i][4] || ''))) continue;
    var link = String(v[i][3] || '');
    sls.forEach(function (sl) { if (out[sl] === undefined && link.indexOf(sl) >= 0) out[sl] = String(v[i][5] || ''); });
  }
  return out;
}

// Corretivo.gs:89
function cr_corrigir_(c, ctx, descAntes) {
  if (!descAntes) throw new Error('sem cópia de antes do complemento na planilha de backup');
  var q = { fields: 'name,desc,idList,idBoard,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state' };
  var card = vd_api_('/cards/' + c.sl, { query: q });
  var idQuadro = ctx.board;
  if (!/^[0-9a-f]{24}$/.test(idQuadro)) { try { idQuadro = vd_api_('/boards/' + ctx.board, { query: { fields: 'id' } }).id; } catch (e) {} }
  if (card.idBoard !== idQuadro) throw new Error('card fora do quadro do robô');
  var divAtual = vd_dividir_(card.desc || '');
  if (!/complemento 11\/10|COMPLEMENTO 11\/10/i.test(vd_limpar_(divAtual.bloco))) return 'já estava sem o complemento de 11/10 — nada a fazer';
  var divAntes = vd_dividir_(descAntes);
  var feito = [];

  // 1) descrição: bloco do consultor de antes do complemento + cotações/compras de agora (abaixo do marcador)
  vd_backup_(card, 'correção 11/10 (antes de desfazer o complemento)');
  var nova = divAntes.bloco + (divAtual.temMarcador ? '\n\n' + divAtual.resto : (divAntes.temMarcador ? '\n\n' + divAntes.resto : '\n\n' + VD.MARCADOR));
  vd_gravarDesc_(card.id, nova);
  feito.push('descrição voltou ao que era antes do complemento');
  var props = PropertiesService.getScriptProperties();
  vd_pkSet_(card.id, vd_linhasConsultor_(divAntes.bloco).map(vd_sigItem_));   // base de peças = as de antes (nada é "peça nova")
  props.deleteProperty('VD_SIG_' + card.id);
  if (c.oficina && c.oficina.length) props.setProperty('VD_NOVAS_' + card.id, JSON.stringify(vd_linhasPecas_(divAntes.bloco).linhas.map(vd_sigItem_)));
  else props.deleteProperty('VD_NOVAS_' + card.id);

  // 2) checklist FORNECIMENTO COMPLEMENTO criado hoje pelo complemento errado (cards de retorno)
  if (c.retorno) {
    var hoje0 = new Date(CR.DIA + 'T03:00:00Z').getTime(), apagados = 0;
    (card.checklists || []).forEach(function (k) {
      if (String(k.name || '').trim().toUpperCase() !== CP.FO) return;
      var itens = k.checkItems || [], deHoje = itens.filter(function (it) { return cp_criadoEm_(it.id) >= hoje0; });
      if (cp_criadoEm_(k.id) >= hoje0 && deHoje.length === itens.length) {
        vd_api_('/checklists/' + k.id, { method: 'delete' }); apagados += itens.length;
      } else {
        deHoje.forEach(function (it) { vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'delete' }); apagados++; });
      }
    });
    if (apagados) feito.push('saíram ' + apagados + ' item(ns) do checklist ' + CP.FO);
  }

  // 3) FO que tinha saído do FORNECIMENTO por engano volta (com fornecedor e previsão)
  if (c.foVolta && c.foVolta.length) {
    var fo = c.foVolta.map(function (p) { return { codigo: p.codigo, descricao: p.descricao, fornecedor: c.foVoltaFornecedor || '', previsao: c.foVoltaPrev || '' }; });
    vdf_checklistFornecimento_(card.id, fo, null, 'FORNECIMENTO');
    feito.push('voltaram para o checklist FORNECIMENTO: ' + c.foVolta.map(function (p) { return p.codigo + ' ' + p.descricao; }).join('; ') +
      (c.foVoltaFornecedor ? ' (' + c.foVoltaFornecedor + (c.foVoltaPrev ? ', prev. ' + Utilities.formatDate(new Date(c.foVoltaPrev), 'America/Sao_Paulo', 'dd/MM') : '') + ')' : ''));
  }

  // 4) o complemento certo (pelo laudo HDI): peça nova da oficina na lista + FO nova no FORNECIMENTO COMPLEMENTO
  var oficina = (c.oficina || []).map(function (p) { return { codigo: p.codigo, descricao: p.descricao, qtd: p.qtd, valorOrc: p.valorOrc, tipos: [], compData: '11/10' }; });
  var foNova = (c.foNova || []).map(function (p) { return { codigo: p.codigo, descricao: p.descricao, fornecedor: p.fornecedor || '' }; });
  if (oficina.length || foNova.length) {
    var card2 = vd_api_('/cards/' + card.id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name' } });
    cp_aplicar_(card2, { oficina: oficina, fo: foNova, jaTinha: 0, pareadas: [], atualizar: [], paraOficina: [] },
      { origem: 'HDI — correção', anexo: '', quem: 'robô (correção 11/10)', token: null, ctx: ctx, semComentario: true });
    if (oficina.length) feito.push('peça nova da oficina (laudo HDI): ' + oficina.map(cp_nome_).join('; '));
    if (foNova.length) feito.push('FO nova da HDI no checklist ' + CP.FO + ': ' + foNova.map(cp_nome_).join('; '));
  }

  // 5) coluna de antes do engano
  var movido = '';
  if (c.coluna) {
    var card3 = vd_api_('/cards/' + card.id, { query: { fields: 'name,idList' } });
    movido = vdf_moverPara_(card3, ctx, c.coluna, null, 'robô (correção 11/10)');
    if (movido) feito.push('card voltou para **' + movido + '**');
  }

  // 6) comentário
  var quem = ''; try { quem = vd_criador_(card.id); } catch (e) {}
  var txt = (quem ? '@' + quem + ' ' : '') + '🛠️ **CORREÇÃO DO ROBÔ** (11/10) — ' + c.motivo + '. Os avisos de 🆕 PEÇA NOVA / FALTA DADOS de hoje vieram desse engano.\n' +
    feito.map(function (f) { return '- ' + f; }).join('\n') +
    (c.foNova && c.foNova.length ? '\n- verificar prazo do item ' + c.foNova.map(function (p) { return p.codigo + ' ' + p.descricao; }).join(', ') : '') +
    (oficina.length ? '\n- verificar compra do item ' + oficina.map(function (p) { return p.descricao; }).join(', ') + ' (marcar código e tipo no ✏️ EDITAR/INCLUIR PEÇA)' : '') +
    (c.extra ? '\n' + c.extra : '');
  vd_comentar_(card, txt);
  return feito.join(' · ');
}

// Corretivo.gs:167
function cr_executarB_() {
  var props = PropertiesService.getScriptProperties(), k = CR.CHAVE + 'B';
  if (props.getProperty(k) === 'FEITO') return 0;
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var n = +(props.getProperty(k + '_TENT') || 0);
  if (n >= 3) { props.setProperty(k, 'FEITO'); return 0; }
  props.setProperty(k + '_TENT', String(n + 1));
  var card = vd_api_('/cards/aX6Qgx1G', { query: { fields: 'name,idList,shortLink' } });
  vdf_checklistFornecimento_(card.id, [{ codigo: '52245037', descricao: 'DEFLETOR DO RADIADOR', fornecedor: 'FLORENCA', previsao: '2026-10-19T15:00:00.000Z' }], null, 'FORNECIMENTO');
  vd_comentar_(card, '🛠️ **CORREÇÃO DO ROBÔ** (11/10, complemento) — voltou para o checklist FORNECIMENTO: 52245037 DEFLETOR DO RADIADOR (FO da HDI, FLORENCA, prev. 19/10), que tinha saído por engano. Verificar prazo do item 52245037 DEFLETOR DO RADIADOR.');
  props.setProperty(k, 'FEITO');
  return 1;
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

// Cota.gs:42
function qt_ehErroDeCota_(e) { var s = String((e && e.message) || e); return /^COTA:/.test(s) || qt_ehEstouro_(e); }

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

// Cota.gs:119
function qt_resumoPausa_() { var ate = qt_pausadaAte_(); return 'cota estourada, pausado até ' + (ate ? Utilities.formatDate(new Date(ate), 'America/Sao_Paulo', 'HH:mm') : '?'); }

// Cota.gs:125
function qt_retomarSePreciso_() {
  var p = PropertiesService.getScriptProperties(), desde = p.getProperty('QT_PAUSA_DESDE');
  if (!desde || qt_pausada_()) return false;
  var agora = new Date().toISOString();
  ['TR_ACT', 'CK_DESDE', 'ST_ULTIMA'].forEach(function (m) { try { vd_marcaSet_(m, agora); } catch (e) {} });
  p.deleteProperty('QT_PAUSA_DESDE');
  console.log('cota liberou: travas retomam a partir de agora; o que foi feito à mão desde ' + new Date(+desde).toLocaleString('pt-BR') + ' fica como está');
  return true;
}

// Cota.gs:136
function vdf_consumo(token) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria.'] };
  var ate = qt_pausadaAte_();
  var p = PropertiesService.getScriptProperties(), falhas = {}, tempos = [];
  try { Object.keys(p.getProperties()).forEach(function (k) { if (/^FALHAS_(?!AV_|T_)/.test(k)) falhas[k.slice(7)] = +p.getProperty(k); }); } catch (e) {}
  try { tempos = JSON.parse(p.getProperty('SD_TEMPOS_LOG') || '[]').slice(-8); } catch (e) {}
  // 16/10/2026: uso das Propriedades do script por prefixo (alerta da conferência diária passou de 380 KB)
  var props = null;
  try {
    var all = p.getProperties(), tot = 0, por = {}, qtd = {}, maiores = [];
    Object.keys(all).forEach(function (k) {
      var t = k.length + String(all[k]).length; tot += t;
      var pre = (k.match(/^[A-Z]+_(?:[A-Z0-9]+_)?/) || [k])[0];
      por[pre] = (por[pre] || 0) + t; qtd[pre] = (qtd[pre] || 0) + 1;
      maiores.push([k, t]);
    });
    maiores.sort(function (a, b) { return b[1] - a[1]; });
    props = { kb: Math.round(tot / 1024), chaves: Object.keys(all).length,
      prefixos: Object.keys(por).sort(function (a, b) { return por[b] - por[a]; }).slice(0, 20).map(function (k) { return k + ' ' + Math.round(por[k] / 1024) + ' KB (' + qtd[k] + ')'; }),
      maiores: maiores.slice(0, 10).map(function (x) { return x[0] + ' ' + Math.round(x[1] / 1024) + ' KB'; }) };
  } catch (e) {}
  return { ok: true, hoje: qt_doDia_(0), ontem: qt_doDia_(1), anteontem: qt_doDia_(2), resumo: [qt_resumo_(0), qt_resumo_(1), qt_resumo_(2)], pausadaAte: ate ? new Date(ate).toISOString() : '', limite: QT.LIMITE, falhas: falhas, tempos: tempos, props: props };
}

// Espelho.gs:29
function es_ligado_() { return vd_prop_('ES_LIGADO', 'NAO') === 'SIM' && vd_board_() === ES.DESTINO; }

// Espelho.gs:32
function es_guarda_() {
  if (vd_board_() !== ES.DESTINO) throw new Error('Espelho só roda com o sistema no quadro TESTE.');
  if (ES.ORIGEM === ES.DESTINO) throw new Error('origem = destino');
}

// Espelho.gs:38
function es_filtrarMencoes_(txt) {
  if (!es_ligado_()) return txt;
  return String(txt).replace(/(^|[^A-Za-z0-9_.])@([A-Za-z0-9_]{3,})/g, function (m, pre, u) {
    return ES.MENCOES_OK.indexOf(u.toLowerCase()) >= 0 ? m : pre + '👤' + u;
  });
}

// Espelho.gs:46
function es_marcarAutor_(idTeste, nome) { try { CacheService.getScriptCache().put('es_autor_' + idTeste, String(nome || '').slice(0, 60), 900); } catch (e) {} }

// Espelho.gs:47
function es_autor_(idTeste) {
  try { var n = CacheService.getScriptCache().get('es_autor_' + idTeste); return n ? ' _(no principal: ' + n + ')_' : ''; } catch (e) { return ''; }
}

// Espelho.gs:52
function es_aba_() {
  var ss = vd_planilhaBackup_().getParent(), sh = ss.getSheetByName(ES.ABA);
  if (!sh) { sh = ss.insertSheet(ES.ABA); sh.appendRow(['Card principal (id)', 'Card TESTE (id)', 'Link TESTE', 'Nome', 'Copiado em']); sh.setFrozenRows(1); }
  return sh;
}

// Espelho.gs:57
function es_mapa_() {
  var sh = es_aba_(), n = sh.getLastRow(), m = {};
  if (n < 2) return m;
  sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r) { if (r[0] && r[1]) m[r[0]] = r[1]; });
  return m;
}

// Espelho.gs:65
function es_api_(caminho, opts) { opts = opts || {}; opts.semLicenca = true; return vd_api_(caminho, opts); }

// Espelho.gs:67
function es_listasDestino_() { return vd_listas_(ES.DESTINO); }

// Espelho.gs:68
function es_nomeListaOrigem_() {
  var m = {};
  vd_api_('/boards/' + ES.ORIGEM + '/lists', { cru: true, query: { fields: 'name' } }).forEach(function (l) { m[l.id] = vd_nomeColuna_(l.name); });
  return m;
}

// Espelho.gs:75
function es_copiar_(cardOrigem, nomeLista, listasDest, mapa) {
  var idL = listasDest[nomeLista];
  if (!idL) return null;
  var novo = vd_api_('/cards', { method: 'post', query: {
    idList: idL, idCardSource: cardOrigem.id, keepFromSource: 'attachments,checklists,due,start,labels,stickers', pos: 'bottom' } });
  try { ck_licenca_('/cards/' + novo.id + '/checklists'); } catch (e) {}   // a cópia não é "mão" — a trava não desfaz
  mapa[cardOrigem.id] = novo.id;
  es_aba_().appendRow([cardOrigem.id, novo.id, novo.shortUrl || '', cardOrigem.name || '', new Date()]);
  return novo;
}

// Espelho.gs:117
function es_sincronizar() {
  if (!es_ligado_()) return;   // (fora do TESTE: não roda e não dá erro a cada 10 min)
  es_guarda_();
  var p = PropertiesService.getScriptProperties();
  var rodando = +(p.getProperty('ES_RODANDO') || 0);
  if (Date.now() - rodando < 7 * 60000) return;            // outra rodada ainda em andamento
  p.setProperty('ES_RODANDO', String(Date.now()));
  try {
    var fim = Date.now() + ES.LIMITE_MS, mapa = es_mapa_(), dest = es_listasDestino_(), origemNome = es_nomeListaOrigem_();
    var r = { copiados: 0, aplicados: 0, erros: 0 };
    // cópia inicial (em partes, se precisar)
    if (p.getProperty('ES_COPIA_INICIAL') === 'PENDENTE') {
      var cards = vd_api_('/boards/' + ES.ORIGEM + '/cards', { cru: true, query: { fields: 'name,idList,pos' } });
      var ordem = {}; ES.FLUXO.forEach(function (n, i) { ordem[n] = i; });
      cards = cards.filter(function (c) { return ordem[origemNome[c.idList]] !== undefined && !mapa[c.id] && !/NOVO PEDIDO DE PE[ÇC]A/i.test(c.name || ''); })
        .sort(function (a, b) { return (ordem[origemNome[a.idList]] - ordem[origemNome[b.idList]]) || (a.pos - b.pos); });
      for (var i = 0; i < cards.length && Date.now() < fim; i++) {
        try { if (es_copiar_(cards[i], origemNome[cards[i].idList], dest, mapa)) r.copiados++; } catch (e) { r.erros++; console.log('copiar ' + cards[i].name + ': ' + e); }
      }
      if (i >= cards.length) p.setProperty('ES_COPIA_INICIAL', 'FEITA');
    }
    // mudanças do principal
    if (Date.now() < fim) {
      var desde = p.getProperty('ES_DESDE');
      var acts = vd_api_('/boards/' + ES.ORIGEM + '/actions', { cru: true, query: { filter: ES.TIPOS, since: desde, limit: 500, memberCreator_fields: 'username,fullName' } }) || [];
      var feitos = {}, ultimo = desde;
      acts.reverse().some(function (a) {
        if (Date.now() > fim) return true;
        try { if (es_aplicar_(a, mapa, dest, origemNome, feitos)) r.aplicados++; } catch (e) { r.erros++; console.log('espelho ' + a.type + ': ' + e); }
        ultimo = a.id;
        return false;
      });
      if (ultimo) p.setProperty('ES_DESDE', ultimo);
    }
    p.setProperty('ES_ULTIMA', new Date().toISOString());
    Logger.log('espelho: ' + r.copiados + ' card(s) copiado(s), ' + r.aplicados + ' mudança(s) aplicada(s), ' + r.erros + ' erro(s)');
    return r;
  } finally { p.deleteProperty('ES_RODANDO'); }
}

// Espelho.gs:158
function es_aplicar_(a, mapa, dest, origemNome, feitos) {
  var d = a.data || {}, cardO = d.card || {};
  if (!cardO.id) return false;
  if (feitos[cardO.id]) return false;                       // copiado nesta rodada: já veio com o estado atual
  var autor = a.memberCreator ? (a.memberCreator.fullName || a.memberCreator.username) : '';
  var idT = mapa[cardO.id];

  // card ainda não espelhado: copia se ele está (agora) no fluxo
  if (!idT) {
    var criou = /^(createCard|copyCard|moveCardToBoard|convertToCardFromCheckItem|emailCard)$/.test(a.type);
    var entrou = a.type === 'updateCard' && d.listAfter && ES.FLUXO.indexOf(vd_nomeColuna_(d.listAfter.name)) >= 0;
    if (!criou && !entrou) return false;
    var atual; try { atual = vd_api_('/cards/' + cardO.id, { cru: true, query: { fields: 'name,idList,closed' } }); } catch (e) { return false; }
    var nl = origemNome[atual.idList];
    if (atual.closed || ES.FLUXO.indexOf(nl) < 0) return false;
    if (/NOVO PEDIDO DE PE[ÇC]A/i.test(atual.name || '')) return false;
    es_copiar_(atual, nl, dest, mapa);
    feitos[cardO.id] = true;
    return true;
  }
  es_marcarAutor_(idT, autor);

  switch (a.type) {
    case 'updateCard':
      var old = d.old || {}, put = {};
      if (d.listAfter) {
        var nomeL = vd_nomeColuna_(d.listAfter.name), alvo = dest[ES.FLUXO.indexOf(nomeL) >= 0 ? nomeL : ES.FORA];
        if (alvo) put.idList = alvo;
      }
      if (Object.prototype.hasOwnProperty.call(old, 'desc')) put.desc = cardO.desc || '';
      if (Object.prototype.hasOwnProperty.call(old, 'name')) put.name = cardO.name || '';
      if (Object.prototype.hasOwnProperty.call(old, 'due')) put.due = cardO.due || null;
      if (Object.prototype.hasOwnProperty.call(old, 'dueComplete')) put.dueComplete = !!cardO.dueComplete;
      if (Object.prototype.hasOwnProperty.call(old, 'closed')) put.closed = !!cardO.closed;
      if (!Object.keys(put).length) return false;
      es_api_('/cards/' + idT, { method: 'put', payload: put });
      return true;
    case 'commentCard':
      es_api_('/cards/' + idT + '/actions/comments', { method: 'post', payload: { text: '💬 **' + autor + '** _(principal)_: ' + String(d.text || '') } });
      return true;
    case 'addAttachmentToCard':
      return es_copiarAnexo_(d.attachment || {}, cardO.id, idT);
    case 'deleteAttachmentFromCard':
      var ans = vd_api_('/cards/' + idT + '/attachments', { query: { fields: 'name' } });
      var alvoA = ans.filter(function (x) { return x.name === (d.attachment || {}).name; })[0];
      if (!alvoA) return false;
      es_api_('/cards/' + idT + '/attachments/' + alvoA.id, { method: 'delete' });
      return true;
    case 'addLabelToCard':
    case 'removeLabelFromCard':
      var et = es_etiqueta_((d.label || {}).name, (d.label || {}).color);
      if (!et) return false;
      if (a.type === 'addLabelToCard') { try { es_api_('/cards/' + idT + '/idLabels', { method: 'post', payload: { value: et } }); } catch (e) { if (e.codigo !== 400) throw e; } }
      else { try { es_api_('/cards/' + idT + '/idLabels/' + et, { method: 'delete' }); } catch (e) { if (e.codigo !== 404) throw e; } }
      return true;
    default:
      return es_checklist_(a, idT);
  }
}

// Espelho.gs:218
function es_etiqueta_(nome, cor) {
  if (!nome) return '';
  var c = CacheService.getScriptCache(), k = 'es_etq_' + ES.DESTINO, js = c.get(k), ls;
  if (js) ls = JSON.parse(js); else { ls = vd_api_('/boards/' + ES.DESTINO + '/labels', { query: { fields: 'name,color', limit: 200 } }); c.put(k, JSON.stringify(ls), 3600); }
  var l = ls.filter(function (x) { return (x.name || '').trim().toUpperCase() === String(nome).trim().toUpperCase(); })[0];
  if (l) return l.id;
  var novo = vd_api_('/boards/' + ES.DESTINO + '/labels', { method: 'post', payload: { name: nome, color: cor || null } });
  c.remove(k);
  return novo.id;
}

// Espelho.gs:230
function es_copiarAnexo_(at, idO, idT) {
  if (!at.id) return false;
  var info = vd_api_('/cards/' + idO + '/attachments/' + at.id, { cru: true, query: { fields: 'name,url,isUpload,mimeType' } });
  if (!info.isUpload) { es_api_('/cards/' + idT + '/attachments', { method: 'post', payload: { url: info.url, name: info.name } }); return true; }
  var r = qt_fetch_(info.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error('download do anexo ' + info.name + ': ' + r.getResponseCode());
  var blob = r.getBlob().setName(info.name);
  es_api_('/cards/' + idT + '/attachments', { method: 'post', multipart: { file: blob, name: info.name } });
  return true;
}

// Espelho.gs:242
function es_checklist_(a, idT) {
  var d = a.data || {}, nomeCl = (d.checklist || {}).name, it = d.checkItem || {};
  var cls = vd_api_('/cards/' + idT + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name,state,due', fields: 'name' } });
  var cl = cls.filter(function (k) { return k.name === nomeCl; })[0];
  var item = cl && it.name ? (cl.checkItems || []).filter(function (i) { return i.name === it.name || (d.old && i.name === d.old.name); })[0] : null;
  switch (a.type) {
    case 'addChecklistToCard':
      if (cl) return false;
      es_api_('/checklists', { method: 'post', payload: { idCard: idT, idChecklistSource: (d.checklist || {}).id } });
      return true;
    case 'removeChecklistFromCard':
      if (!cl) return false;
      es_api_('/checklists/' + cl.id, { method: 'delete' });
      return true;
    case 'updateChecklist':
      var antigo = d.old && d.old.name;
      var cl2 = cls.filter(function (k) { return k.name === antigo; })[0];
      if (!cl2) return false;
      es_api_('/checklists/' + cl2.id, { method: 'put', payload: { name: nomeCl } });
      return true;
    case 'createCheckItem':
      if (!cl || item) return false;
      es_api_('/checklists/' + cl.id + '/checkItems', { method: 'post', payload: { name: it.name, pos: 'bottom' } });
      return true;
    case 'deleteCheckItem':
      if (!item) return false;
      es_api_('/cards/' + idT + '/checkItem/' + item.id, { method: 'delete' });
      return true;
    case 'updateCheckItemStateOnCard':
      if (!item || item.state === it.state) return false;
      es_api_('/cards/' + idT + '/checkItem/' + item.id, { method: 'put', payload: { state: it.state } });
      return true;
    case 'updateCheckItem':
      if (!item) return false;
      var put = {};
      if (d.old && d.old.name !== undefined) put.name = it.name;
      if (d.old && d.old.due !== undefined) put.due = it.due || null;
      if (!Object.keys(put).length) return false;
      es_api_('/cards/' + idT + '/checkItem/' + item.id, { method: 'put', payload: put });
      return true;
  }
  return false;
}

// Eventos.gs:19
function ev_frase_(evento, usuario, it) {
  it = it || {};
  var u = String(usuario || '').trim(), quem = /^[a-z0-9_.\-]{3,}$/i.test(u) && !/^rob/i.test(u) ? '@' + u : (u || 'robô');
  var verbo = EV_VERBOS[evento] || String(evento || '').toLowerCase();
  var det = String(it.detalhe || '').trim(), peca = String(it.peca || '').trim();
  if (evento === 'PREVISÃO') {
    var mp = det.match(/^PREVIS[ÃA]O\s+(?:(\S+)\s+→\s+)?(\S+)(?:\s+\(([^)]*)\))?(?::\s*(.*))?$/), ma = det.match(/^PRAZO AUTORIZADO ALTERADO:\s*(.*)$/);
    if (mp) return quem + ' alterou o prazo de ' + peca + (mp[1] ? ' de ' + mp[1] : '') + ' para ' + mp[2] + (mp[4] ? ' pelo motivo: ' + mp[4] : '');
    if (ma) return quem + ' alterou o prazo autorizado de ' + peca + (it.dias !== '' && it.dias != null ? ' para ' + it.dias + ' d.u.' : '') + ' pelo motivo: ' + ma[1];
  }
  return quem + ' ' + verbo + (peca ? ' — ' + peca : '') + (det ? ' (' + det + ')' : '');
}

// Eventos.gs:33
function ev_ligado_() { return vd_prop_('EV_LIGADO', 'SIM') !== 'NAO'; }

// Eventos.gs:35
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
  // aba antiga (16 colunas): ganha o título da coluna nova uma vez
  if (!EV_CAB_OK) { try { if (sh.getRange(1, EV.CAB.length).getValue() !== EV.CAB[EV.CAB.length - 1]) sh.getRange(1, EV.CAB.length).setValue(EV.CAB[EV.CAB.length - 1]).setFontWeight('bold'); } catch (e) {} EV_CAB_OK = true; }
  return sh;
}

// Eventos.gs:52
function ev_unidade_(card) {
  var u = '';
  try { u = cf_unidadeDoCard_(card); } catch (e) {}
  if (u) return u;
  return ev_unidadeEtiqueta_(card);
}

// Eventos.gs:58
function ev_unidadeEtiqueta_(card) {
  var nomes = ((card && card.labels) || []).map(function (l) { return String(l.name || '').toUpperCase(); }).join(' ');
  if (/TOLEDO|\bTOL\b/.test(nomes)) return 'TOLEDO';
  if (/RONDON|\bMCR\b/.test(nomes)) return 'RONDON';
  if (/CASCAVEL|\bCVEL\b/.test(nomes)) return 'CASCAVEL';
  if (/MOUR/.test(nomes)) return 'MOURÃO';
  return '';
}

// Eventos.gs:72
function ev_registrar_(evento, card, usuario, itens, extra) {
  if (!ev_ligado_()) return;
  try {
    extra = extra || {};
    card = card || {};
    // 17/10/2026 (teste das cópias): card de teste no quadro principal (TST_CARDS, 🧪 ou placa ZZT) não entra nos
    // eventos — senão as métricas de prazo/compra contam peça que nunca existiu
    if (/🧪|\bZZT\d/.test(card.name || '')) return;
    try { var tst = JSON.parse(PropertiesService.getScriptProperties().getProperty('TST_CARDS') || '[]');
      if (tst.indexOf(card.id) >= 0 || tst.indexOf(card.shortLink) >= 0) return; } catch (e) {}
    var agora = new Date();
    var placa = vd_placaDoTexto_(card.name || '') || '';
    var tipo = extra.tipo || (/\bPARTICULAR\b/i.test(card.name || '') ? 'PARTICULAR' : /\bRETORNO\b/i.test(card.name || '') ? 'RETORNO' : 'SEGURADORA');
    var base = function (it) {
      it = it || {};
      var prev = it.previsao ? new Date(it.previsao) : '';
      return [agora, evento, card.name || '', card.shortUrl || (card.shortLink ? 'https://trello.com/c/' + card.shortLink : ''),
        placa, ev_unidade_(card), tipo, it.peca || '', it.particular ? 'SIM' : '',
        it.fornecedor || '', (it.valor === 0 || it.valor) && !isNaN(+it.valor) ? +it.valor : '',
        it.dias === 0 || it.dias ? it.dias : '', prev && !isNaN(prev) ? prev : '',
        usuario || '', it.detalhe || extra.detalhe || '', vd_board_(), ev_frase_(evento, usuario, { peca: it.peca, dias: it.dias, detalhe: it.detalhe || extra.detalhe || '' })];
    };
    var linhas = (itens && itens.length ? itens : [null]).map(base).map(function (l) { return l.map(sg_celula_); });
    // appendRow é atômico por linha: robô e formulário podem gravar ao mesmo tempo sem se atropelar
    // (não usa a trava do script — o robô a segura durante a rodada inteira)
    var sh = ev_aba_();
    linhas.forEach(function (l) { sh.appendRow(l); });
  } catch (e) { console.log('eventos: ' + e); }
}

// Eventos.gs:103
function ev_peca_(p) {
  if (!p) return { peca: '' };
  return { peca: p.pneu ? 'PNEU ' + String(p.medida || '').replace(/\s+/g, '') + (p.marca ? ' ' + p.marca : '') : vd_nomePeca_(p), particular: !!p.particular };
}

// Faturamento.gs:23
function fat_semCobranca_(labels) {
  return (labels || []).some(function (l) { return /SEM COBRAN[ÇC]A/i.test(typeof l === 'string' ? l : String((l && l.name) || '')); });
}

// Faturamento.gs:27
function fat_usuarios_() {
  var us = String(vd_prop_('FAT_USUARIOS', 'financeirounity,christianfarias23')).toLowerCase().split(/[,;\s]+/).filter(String);
  if (vd_board_() === VD.BOARD_PADRAO && us.indexOf('timweslley') < 0) us.push('timweslley');   // TESTE: dá para testar com a conta do script
  return us;
}

// Faturamento.gs:36
function fat_ehConfirmacao_(txt) {
  var t = vd_semAcento_(txt || '').replace(/[^A-Z0-9?.]+/g, ' ').trim();
  if (/\?/.test(t)) return false;
  // "fechado/fechada" só vale perto de O.S./ordem ("OK fechada", "O.S. fechada", "ordem fechada") — "porta fechada" não é faturamento;
  // e com qualquer negação no texto não vale
  var fechado = /\b(?:O\.?S\.?|ORDEM|OK)\b[^A-Z0-9]{0,3}(?:\S+ ){0,2}FECHAD[OA]S?\b|\bFECHAD[OA]S?\b (?:\S+ ){0,2}(?:O\.?S\.?|ORDEM)\b|^FECHAD[OA]S?$/.test(t);
  if (fechado && !new RegExp('\\b' + FAT_NEG + '\\b').test(t)) return true;
  if (!new RegExp('\\b' + FAT_CONF + '\\b').test(t)) return false;
  if (new RegExp('\\b' + FAT_NEG + '\\b(?: \\S+){0,2} ' + FAT_CONF + '\\b').test(t)) return false;        // "não faturado", "ainda não foi faturado"
  if (new RegExp('\\b' + FAT_CONF + ' NAO\\b').test(t)) return false;                                        // "faturado não"
  return true;
}

// Faturamento.gs:49
function fat_executar_() {
  if (vd_prop_('FAT_LIGADO', 'SIM') === 'NAO' || !vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var desde = vd_marca_('FAT_ULTIMA');
  if (!desde) { vd_marcaSet_('FAT_ULTIMA', new Date().toISOString()); return 0; }   // 1ª vez: só daqui para frente
  var board = vd_board_();
  var acoes = vd_acoesQuadro_(board, { filter: 'commentCard,updateCard:closed', since: desde, limit: 100, memberCreator_fields: 'username,fullName' });
  if (!acoes.length) return 0;
  vd_marcaSet_('FAT_ULTIMA', new Date(new Date(acoes[0].date).getTime() + 1).toISOString());   // a 1ª é a mais nova
  var ls = vd_listas_(board), nomeL = {};
  Object.keys(ls).forEach(function (k) { nomeL[ls[k]] = k; });
  var us = fat_usuarios_(), n = 0, vistos = {};
  var usTxt = us.filter(function (u) { return u !== 'timweslley' || vd_board_() === VD.BOARD_PADRAO; }).map(function (u) { return '@' + u; }).join(' / ');
  acoes.reverse().forEach(function (a) {
    var cardId = a.data && a.data.card && a.data.card.id;
    if (!cardId || vistos[cardId]) return;
    var quem = a.memberCreator ? String(a.memberCreator.username || '').toLowerCase() : '';
    var arquivou = a.type === 'updateCard';
    // 20/10/2026 (Weslley): card arquivado por FATURAMENTO só ele desarquiva — quem mais desarquivar, o card volta a ser arquivado
    if (arquivou && a.data.card && a.data.card.closed === false) {
      if (vd_prop_('FAT_TRAVA_DESARQ', 'SIM') === 'NAO' || !quem || quem === 'timweslley') return;
      try { if (fat_desarquivouFaturado_(cardId, a, us, quem)) { vistos[cardId] = 1; n++; } } catch (eD) { console.log('desarquivar faturado: ' + eD); }
      return;
    }
    if (arquivou) {
      // arquivamento à mão: só interessa o de quem confirma faturamento (arquivar = "faturado")
      if (!(a.data.card && a.data.card.closed) || !quem || us.indexOf(quem) < 0) return;
      if (quem === 'timweslley' && vd_board_() !== VD.BOARD_PADRAO) return;   // no quadro real o Weslley arquiva por outros motivos
    } else {
      var txt = (a.data && a.data.text) || '';
      if (txt.indexOf(FAT.MARCA) >= 0 || txt.indexOf('⏰') >= 0) return;   // comentário do próprio robô
      if (!fat_ehConfirmacao_(txt)) return;   // negação perto da palavra ou pergunta: não é confirmação
    }
    var c;
    try { c = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'name,idList,closed,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state' } }); } catch (e) { return; }
    if (!c || vdf_cardProtegido_(c.name || '')) return;
    if (c.closed !== arquivou) return;   // comentário em card já arquivado (o arquivamento trata) / arquivamento já desfeito
    vistos[cardId] = 1;
    var lista = nomeL[c.idList] || '';
    try {
      if (us.indexOf(quem) < 0) {
        vd_comentar_(c, '@' + quem + ' ' + FAT.MARCA + ' O faturamento é confirmado por ' + usTxt + ' — o card não foi arquivado.');
        return;
      }
      if (FAT.LISTAS.indexOf(lista) < 0) {
        if (arquivou) return;   // arquivou em outra coluna: não é faturamento, não mexe
        vd_comentar_(c, '@' + quem + ' ' + FAT.MARCA + ' Card em **' + (lista || '?') + '** — só é arquivado como faturado em ' + FAT.LISTAS.join(' ou ') + '. O card continua no quadro.');
        return;
      }
      // card antigo (anterior à virada) arquivado à mão: o robô não mantém o checklist dele — só registra o evento
      if (arquivou && vd_legado_(c.id)) { ev_registrar_('FATURADO', c, quem, null, { detalhe: lista + ' — arquivado à mão (card antigo)' }); n++; return; }
      var reabrir = function (motivo) {
        if (arquivou) { try { vd_api_('/cards/' + c.id, { method: 'put', payload: { closed: 'false' } }); } catch (e) {} }
        vd_comentar_(c, '@' + quem + ' ' + FAT.MARCA + ' ' + (arquivou ? 'Desarquivei o card: ' : 'Não arquivei: ') + motivo);
      };
      // 09/10/2026 (Weslley): complementar comprado antes da autorização e ainda sem confirmação da seguradora não fatura
      var cpP = [];
      try { var cD = vd_api_('/cards/' + c.id, { query: { fields: 'name,desc' } }); cpP = vd_complPendentes_(vd_analisar_(cD.desc, cD.name)); } catch (e) {}   // desc completa (o card acima veio cru)
      if (cpP.length) {
        reabrir('complementar comprado **antes da autorização** e ainda sem confirmação da seguradora — verificar autorização e importação no Databox do item ' + vd_complPendTxt_(cpP) + '. Depois de marcar na aba Compra do formulário, comente «faturado» de novo.');
        return;
      }
      var falta = [];
      (c.checklists || []).forEach(function (k) { (k.checkItems || []).forEach(function (i) { if (i.state !== 'complete') falta.push(String(i.name).split(/\s+-\s+/)[0] + ' (' + k.name + ')'); }); });
      if (falta.length) {
        reabrir('ainda há ' + falta.length + ' item(ns) sem ✔ — ' + falta.slice(0, 8).join(', ') + (falta.length > 8 ? '…' : '') + '. Depois de conferir, comente «faturado» de novo.');
        return;
      }
      ev_registrar_('FATURADO', c, quem, null, { detalhe: lista + (arquivou ? ' — arquivado à mão' : ' — arquivado') });
      if (!arquivou) vd_api_('/cards/' + c.id, { method: 'put', payload: { closed: 'true' } });
      n++;
    } catch (e) { console.log('faturamento: ' + e); }
  });
  if (n) console.log('faturamento: ' + n + ' card(s) faturado(s)');
  return n;
}

// Faturamento.gs:127
function fat_desarquivouFaturado_(cardId, acao, us, quem) {
  var c = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'name,idList,closed,shortLink,shortUrl' } });
  if (!c || c.closed || vdf_cardProtegido_(c.name || '')) return false;   // já foi arquivado de novo / card fixo
  var acts = vd_api_('/cards/' + cardId + '/actions', { cru: true, query: { filter: 'updateCard:closed,commentCard', limit: 50, fields: 'type,date,data', memberCreator_fields: 'username' } }) || [];
  var tDesarq = new Date(acao.date).getTime(), arq = null;
  for (var i = 0; i < acts.length; i++) {   // mais nova primeiro
    var x = acts[i];
    if (new Date(x.date).getTime() >= tDesarq) continue;
    if (x.type === 'updateCard' && x.data && x.data.card && x.data.card.closed === true) { arq = x; break; }
  }
  if (!arq) return false;
  var autor = String((arq.memberCreator && arq.memberCreator.username) || '').toLowerCase(), fat = false;
  var usF = us.filter(function (u) { return u !== 'timweslley'; });
  if (usF.indexOf(autor) >= 0) fat = true;
  else if (autor === 'timweslley') {
    // robô arquivou: vale se houve «faturado» de quem confirma faturamento até 15 min antes
    var tArq = new Date(arq.date).getTime();
    fat = acts.some(function (x) {
      var t = new Date(x.date).getTime(), u = String((x.memberCreator && x.memberCreator.username) || '').toLowerCase();
      return x.type === 'commentCard' && t <= tArq && tArq - t < 15 * 60000 && usF.indexOf(u) >= 0 && fat_ehConfirmacao_((x.data && x.data.text) || '');
    });
  }
  if (!fat) return false;
  vd_comentar_(c, '@' + quem + ' ' + FAT.MARCA + ' Card já **faturado** — só o Weslley pode desarquivar. O card foi arquivado de novo. ' +
    'Para retorno ou peça nova deste carro, abra um card novo pelo formulário (a placa traz os dados do card arquivado).');
  vd_api_('/cards/' + cardId, { method: 'put', payload: { closed: 'true' } });
  ev_registrar_('DESARQUIVAMENTO DESFEITO', c, quem, null, { detalhe: 'card faturado desarquivado por @' + quem + ' — arquivado de novo' });
  return true;
}

// Fluxo.gs:27
function st_ligado_() { return vd_prop_('ST_TRAVA', 'SIM') !== 'NAO'; }

// Fluxo.gs:34
function st_permitir_(cardId, idLista) {
  if (!cardId || !idLista) return;
  var k = ST.PREFIXO_OK + cardId + '_' + idLista, n = 1;
  try { var c = CacheService.getScriptCache(); n = (parseInt(c.get(k), 10) || 0) + 1; c.put(k, String(n), 240); } catch (e) {}   // 4 min: o ciclo é de 1 min
  var lp = {}; lp[k] = String(n); lic_espelhar_(lp, 240);
}

// Fluxo.gs:40
function st_temLicenca_(cardId, idLista) {
  try { return (parseInt(CacheService.getScriptCache().get(ST.PREFIXO_OK + cardId + '_' + idLista), 10) || 0) > 0; } catch (e) { return false; }
}

// Fluxo.gs:43
function st_gastarLicenca_(cardId, idLista) {
  try {
    var c = CacheService.getScriptCache(), k = ST.PREFIXO_OK + cardId + '_' + idLista, n = (parseInt(c.get(k), 10) || 0) - 1;
    if (n > 0) c.put(k, String(n), 240); else c.remove(k);
  } catch (e) {}
}

// Fluxo.gs:51
function st_executar_() {
  if (!st_ligado_() || !vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var props = PropertiesService.getScriptProperties();
  var agora = new Date().toISOString();
  var desde = vd_marca_('ST_ULTIMA');
  if (!desde) { vd_marcaSet_('ST_ULTIMA', agora); return 0; }   // 1ª vez: não olha para trás
  var board = vd_board_();
  var acoes = vd_acoesQuadro_(board, { filter: 'updateCard:idList', since: desde, limit: 100, memberCreator_fields: 'username,fullName' });
  // 17/10/2026: só julga movimento com mais de 90 s (licença de gravação feita pelo servidor chega logo depois) — o marcador
  // para no limite, e o movimento mais novo é visto no próximo ciclo
  agora = new Date(Date.now() - 90 * 1000).toISOString();
  if (desde >= agora) return 0;
  acoes = acoes.filter(function (a) { return !a.date || a.date <= agora; });
  if (!acoes.length) { vd_marcaSet_('ST_ULTIMA', agora); return 0; }
  var ultimaFeita = desde;   // o marcador só avança sobre o que foi processado de verdade
  var ls = vd_listas_(board), nome = {};
  Object.keys(ls).forEach(function (k) { nome[ls[k]] = k; });
  var inicio = ST.INICIO.map(function (n) { return ls[n]; }).filter(String);
  var fim = vd_prazo_(ST.LIMITE_MS), desfeitos = 0, vistos = {};
  var parou = false;
  acoes.reverse().forEach(function (a) {
    if (parou || Date.now() > fim) { parou = true; return; }
    if (a.date) ultimaFeita = new Date(new Date(a.date).getTime() + 1).toISOString();   // +1 ms: não reprocessa a mesma ação
    if (!a.data || !a.data.card || !a.data.listAfter || !a.data.listBefore) return;
    var cardId = a.data.card.id, para = a.data.listAfter.id, de = a.data.listBefore.id;
    if (vd_legado_(cardId)) return;   // card antigo: segue o jeito antigo
    var nPara = nome[para] || vd_nomeColuna_(a.data.listAfter.name);
    var nDe = nome[de] || vd_nomeColuna_(a.data.listBefore.name);
    var motivo = '', ESP = 'ESPERA/NÃO AUTORIZADO', kEsp = 'ST_ESP_' + cardId;
    // 10/10/2026 (revisão): a marca "veio de X para a ESPERA" só era gravada e nunca apagada — card que saía da ESPERA
    // por licença (devolver para cotação) ou por outra coluna carregava a marca velha e era devolvido indevidamente na
    // passagem seguinte. Agora: saiu da ESPERA por qualquer caminho aceito = marca apagada; entrou na ESPERA vindo de
    // coluna livre = marca apagada.
    var tiraMarca = function () { try { props.deleteProperty(kEsp); } catch (e) {} };
    if (st_temLicenca_(cardId, para)) { st_gastarLicenca_(cardId, para); if (nDe === ESP) tiraMarca(); return; }
    // 20/10/2026 (QAX3J48 12:18/12:20): no servidor as licenças ficam na memória e somem a cada deploy — um movimento feito
    // antes do processo subir (inclusive o próprio "desfazer" da trava) ficava sem licença e era desfeito de novo. Movimento
    // anterior à subida do processo não é julgado.
    if (typeof SERVIDOR_INICIO_MS === 'number' && SERVIDOR_INICIO_MS > 0 && a.date && new Date(a.date).getTime() < SERVIDOR_INICIO_MS) return;
    if (vdf_cardProtegido_(a.data.card.name || '') || /^\s*AVISO\b/i.test(a.data.card.name || '')) return;
    // card estacionado em ESPERA: guarda de onde veio; pode voltar só para lá
    if (nPara === ESP) { if (ST.TRAVADAS[nDe]) props.setProperty(kEsp, nDe); else tiraMarca(); return; }
    // Butler "todos os checklists completos em FALTA CHEGAR -> ENCERRADO": é a mesma regra do sistema, aceita
    if (nDe === 'FALTA CHEGAR' && nPara === 'ENCERRADO COMPRAS/FORNEC.') {
      try {
        var cE = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'name', checklists: 'all', checkItem_fields: 'name,state' } });
        var itE = vdf_itensRecebimento_(cE);
        if (itE.length && itE.every(function (i) { return i.ok; })) return;
      } catch (e) {}
    }
    if (nDe === ESP && ST.TRAVADAS[nPara] && props.getProperty(kEsp) === nPara) { props.deleteProperty(kEsp); return; }
    if (nDe === ESP && inicio.indexOf(para) >= 0 && props.getProperty(kEsp)) {
      motivo = 'Card que já passou da cotação não volta pela ESPERA para **' + nPara + '**: devolva para **' + props.getProperty(kEsp) + '**, ou use **↩️ Devolver para cotação** / **✏️ EDITAR/INCLUIR PEÇA**.';
    }
    else if (ST.TRAVADAS[nPara]) motivo = 'O card não pode ser movido à mão para **' + nPara + '**: ele vai sozinho ' + ST.TRAVADAS[nPara] + '.';
    else if (inicio.indexOf(para) >= 0 && ST.TRAVADAS[nDe]) motivo = 'Card que já passou da cotação não volta à mão para **' + nPara + '**: para refazer a cotação use **↩️ Devolver para cotação** (aba ✅ Autorizar); para pedir peça nova, **✏️ Editar peças** — o card volta sozinho.';
    if (!motivo) { if (nDe === ESP) tiraMarca(); return; }   // saiu da ESPERA para coluna livre: aceito, marca apagada
    if (vistos[cardId]) return;   // vários movimentos seguidos: trata uma vez, devolvendo para a origem do primeiro
    vistos[cardId] = 1;
    var c;
    try { c = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'name,desc,idList,shortLink,shortUrl,labels' } }); } catch (e) { return; }
    if (c.idList !== para) return;   // já saiu de lá
    // volta à mão para EM COTAÇÃO com peça da oficina ainda sem cotação (ex.: peça que deixou de ser "não comprar" ou passou
    // de FO para oficina — QPG1B84, 06/10/2026): o movimento está certo, fica
    if (inicio.indexOf(para) >= 0 && ST.TRAVADAS[nDe]) {
      var semCot = [];
      // sem "cru": precisa da descrição completa (a vitrine não tem o bloco PEÇAS)
      try { semCot = vd_pecasSemCotacao_(vd_api_('/cards/' + cardId, { query: { fields: 'name,desc' } })); } catch (e) {}
      if (semCot.length) {
        var quemM = a.memberCreator ? a.memberCreator.username : '';
        try { vd_comentar_(c, '✔ Card em **' + nPara + '**' + (quemM ? ' (movido por @' + quemM + ')' : '') + ' — peça(s) aguardando cotação: ' + semCot.join('; ')); } catch (e) {}
        try { PropertiesService.getScriptProperties().deleteProperty('VD_NOVAS_' + cardId); } catch (e) {}
        return;
      }
    }
    try {
      st_permitir_(cardId, de);
      vd_api_('/cards/' + cardId, { method: 'put', payload: { idList: de, pos: 'top' } });
      vd_fixarTopo_(de);
      desfeitos++;
      var quem = a.memberCreator ? a.memberCreator.username : '';
      var orig = ''; try { orig = es_autor_(cardId); } catch (e) {}
      vd_comentar_(c, (quem ? '@' + quem + ' ' : '') + '🔒 ' + motivo + orig + '\nO card voltou para **' + nDe + '**.');
      ev_registrar_('MOVIMENTO DESFEITO', c, quem || '?', null, { detalhe: nDe + ' → ' + nPara + ' (à mão) — voltou para ' + nDe });
    } catch (e) { console.log('trava de colunas: ' + e); }
  });
  vd_marcaSet_('ST_ULTIMA', parou ? ultimaFeita : agora);
  if (desfeitos) console.log('trava de colunas: ' + desfeitos + ' movimento(s) desfeito(s)');
  return desfeitos;
}

// Fluxo.gs:158
function sla_dia_(d) { d = new Date(d); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }

// Fluxo.gs:159
function sla_mais_(d, n) { d = sla_dia_(d); var g = 0; while (n > 0 && g++ < 400) { d.setDate(d.getDate() + 1); if (du_ehUtil_(d)) n--; } return d; }

// Fluxo.gs:161
function sla_users_(prop, padrao) { if (vd_board_() === VD.BOARD_PADRAO) padrao = 'timweslley'; return String(vd_prop_(prop, padrao)).split(/[,;\s]+/).filter(String); }

// Fluxo.gs:163
function pz_jaAvisouHoje_(cardId) {
  try {
    var props = PropertiesService.getScriptProperties(), k = 'PZ_DIA_' + cardId, hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
    if (props.getProperty(k) === hoje) return true;
    props.setProperty(k, hoje); return false;
  } catch (e) { return false; }
}

// Fluxo.gs:170
function sla_mencao_(us) { return us.filter(function (u, i) { return u && us.indexOf(u) === i; }).map(function (u) { return '@' + u; }).join(' '); }

// Fluxo.gs:176
function sla_podeAvisar_(props, chave, hoje) {
  var ult = props.getProperty(chave);
  if (!ult) return true;
  var rep = +vd_prop_('SLA_REPETIR_DU', 0);
  return rep > 0 && sla_mais_(new Date(ult), rep) <= hoje;
}

// Fluxo.gs:184
function sla_resumoFaturamento_(props, itens, hoje, diasPrazo) {
  if (vd_prop_('FAT_RESUMO', 'SIM') === 'NAO' || !itens.length) return false;
  var kDia = 'FAT_RESUMO_DIA', dia = Utilities.formatDate(hoje, 'America/Sao_Paulo', 'yyyy-MM-dd');
  if (props.getProperty(kDia) === dia) return false;
  var g = String(props.getProperty('VD_FIXO') || '').split('|');
  if (!g[0]) { console.log('resumo de faturamento: sem card fixo'); return false; }
  itens.sort(function (a, b) { return b.dias - a.dias; });
  var mostra = itens.slice(0, SLA.RESUMO_MAX);
  var usF = fat_usuarios_();
  if (vd_board_() !== VD.BOARD_PADRAO) usF = usF.filter(function (u) { return u !== 'timweslley'; });
  var mencao = sla_mencao_(vd_board_() === VD.BOARD_PADRAO ? ['timweslley'] : usF);
  var txt = mencao + ' 🧾 **Faturamento pendente — ' + Utilities.formatDate(hoje, 'America/Sao_Paulo', 'dd/MM') + '**: ' + itens.length +
    ' card(s) em ENTREGUES há mais de ' + diasPrazo + ' dia(s) útil(eis), do mais antigo para o mais novo. _Lista atualizada todo dia útil neste mesmo comentário._ Depois de faturar, comente «faturado» no card (ou arquive) — ele sai da lista.\n' +
    mostra.map(function (x) { return '- ' + x.dias + ' d.u. · [' + x.nome + '](' + x.url + ')' + (x.compl ? ' ⚠️ complementar antecipado sem confirmação' : ''); }).join('\n') +
    (itens.length > mostra.length ? '\n- … e mais ' + (itens.length - mostra.length) + ' card(s)' : '');
  // 10/10/2026: UM comentário só, atualizado no lugar todo dia útil (editar não notifica de novo) — quem fatura é avisado de cada
  // card uma vez pelo lembrete no próprio card; o resumo é a lista viva. Comentário apagado/sumido: cria outro.
  try {
    var idAnt = props.getProperty('FAT_RESUMO_ID'), ok = false;
    if (idAnt) { try { vd_api_('/actions/' + idAnt, { method: 'put', payload: { text: txt.slice(0, 16000) } }); ok = true; } catch (e1) { ok = false; } }
    if (!ok) { var nv = vd_api_('/cards/' + g[0] + '/actions/comments', { method: 'post', payload: { text: txt.slice(0, 16000) } }); if (nv && nv.id) props.setProperty('FAT_RESUMO_ID', nv.id); }
    props.setProperty(kDia, dia);
    return !ok;
  } catch (e) { console.log('resumo de faturamento: ' + e); return false; }
}

// Fluxo.gs:210
function sla_executar_(forcar) {
  if (vd_prop_('SLA_LIGADO', 'SIM') === 'NAO' || !vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var props = PropertiesService.getScriptProperties();
  var agora = new Date(), hoje = sla_dia_(agora);
  var hora = +Utilities.formatDate(agora, 'America/Sao_Paulo', 'H');
  // zerar (uma vez por quadro, ou de novo apagando SLA_ZERADO_<quadro>): o que já está atrasado hoje fica
  // marcado para nunca avisar, sem comentar — só pendência nova (nova entrada na etapa / nova previsão) avisa
  var kZ = 'SLA_ZERADO_' + vd_board_(), silencioso = props.getProperty(kZ) !== 'SIM';
  if (silencioso) forcar = true;
  if (!forcar) {
    if (!du_ehUtil_(hoje) || hora < 8 || hora >= 18) return 0;
    if (Date.now() - (+props.getProperty('SLA_ULTIMA') || 0) < SLA.INTERVALO_MS) return 0;
  }
  props.setProperty('SLA_ULTIMA', String(Date.now()));
  var fim = vd_prazo_(SLA.LIMITE_MS), n = 0, resumoFat = [], fatCompleto = true;
  var board = vd_board_(), ls = vd_listas_(board);
  var etapas = [
    { lista: 'EM COTAÇÃO', dias: +vd_prop_('SLA_DIAS_COTAR', 2), quem: 'cotar' },
    { lista: 'PENDENTE AUTORIZAR', dias: +vd_prop_('SLA_DIAS_AUTORIZAR', 2), quem: 'autorizar' },
    { lista: 'COTAÇÃO FINALIZADA', dias: +vd_prop_('SLA_DIAS_AUTORIZAR', 2), quem: 'autorizar' },
    { lista: 'FALTA DADOS PARA COTAÇÃO', dias: +vd_prop_('SLA_DIAS_DADOS', 1), quem: 'dados' },        // 21/10/2026 (Weslley)
    { lista: 'AUTORIZADO COMPRA', dias: +vd_prop_('SLA_DIAS_COMPRAR', 2), quem: 'comprar' },           // 21/10/2026 (Weslley)
    { lista: 'ENTREGUES', dias: +vd_prop_('SLA_DIAS_FATURAR', 7), quem: 'faturar' }   // vale também para card antigo
  ];
  // 1) tempo parado na etapa
  etapas.forEach(function (et) {
    var idL = ls[et.lista];
    if (!idL || Date.now() > fim) return;
    vd_api_('/lists/' + idL + '/cards', { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels' } }).forEach(function (c) {
      if (Date.now() > fim) { if (et.quem === 'faturar') fatCompleto = false; return; }
      if (vdf_cardProtegido_(c.name || '') || /^\s*AVISO\b/i.test(c.name || '')) return;
      if (et.quem === 'faturar' && fat_semCobranca_(c.labels)) return;   // card das rotinas de NF (10/10/2026)
      if (et.quem !== 'faturar' && vd_legado_(c.id)) return;   // card antigo: segue o jeito antigo (menos a cobrança do faturamento)
      // entrada na coluna: cache PZ_COL_ (1 chamada ao histórico só na 1ª vez por coluna — 10/10/2026; antes era 1 por card por hora)
      var ent = pz_entradaColuna_(c, props);
      var limite = sla_mais_(ent, et.dias);
      if (hoje < limite) return;
      var dias = 0, d = sla_dia_(ent), g = 0;
      while (d < hoje && g++ < 400) { d.setDate(d.getDate() + 1); if (du_ehUtil_(d)) dias++; }
      var cpP = [];
      if (et.quem === 'faturar') {
        try { cpP = vd_complPendentes_(vd_analisar_(c.desc, c.name)); } catch (e) {}
        resumoFat.push({ nome: c.name, url: c.shortUrl, dias: dias, compl: cpP.length > 0 });
      }
      // 20/10/2026 (Weslley: "lembrar só os novos"): card que entrou em ENTREGUES antes do corte não recebe mais lembrete no card
      // (continua no resumo diário). Mudar o corte: propriedade SLA_FAT_DESDE (ISO); vazio = sem corte.
      if (et.quem === 'faturar') { var desde = String(vd_prop_('SLA_FAT_DESDE', '2026-10-20T15:30:00.000Z') || ''); if (desde && String(ent) < desde) return; }
      var chave = 'SLA_' + c.id + '_' + idL + '_' + ent.slice(0, 16);
      if (!sla_podeAvisar_(props, chave, hoje)) return;
      var mencao, txt;
      if (et.quem === 'faturar') {
        var usF = fat_usuarios_();
        if (vd_board_() !== VD.BOARD_PADRAO) usF = usF.filter(function (u) { return u !== 'timweslley'; });
        mencao = sla_mencao_(vd_board_() === VD.BOARD_PADRAO ? ['timweslley'] : usF);
        txt = '⏰ Card em **ENTREGUES** há ' + dias + ' dia(s) útil(eis) sem confirmação de faturamento (prazo: ' + et.dias + '). Depois de faturar, comente a palavra faturado no card (ou arquive) — ele é arquivado.';
        // 09/10/2026 (Weslley): complementar comprado antes da autorização e ainda sem confirmação da seguradora entra no lembrete
        if (cpP.length) txt += '\n⚠️ Complementar comprado **antes da autorização** e ainda sem confirmação da seguradora — verificar autorização e importação no Databox do item ' + vd_complPendTxt_(cpP) + ' (marcar na aba Compra do formulário).';
      } else if (et.quem === 'dados') {
        var crD = ''; try { crD = vd_criador_(c.id); } catch (e) {}
        mencao = sla_mencao_(crD ? [crD] : sla_users_('SLA_COTAR', 'comprasunity'));
        txt = '⏰ Card em **FALTA DADOS** há ' + dias + ' dia(s) útil(eis) (prazo: ' + et.dias + '). Completar o pedido pelo anexo **✏️ EDITAR/INCLUIR PEÇA** — o que falta está no último aviso ⚠️ FALTA DADOS.';
      } else if (et.quem === 'comprar') {
        mencao = sla_mencao_(sla_users_('SLA_COMPRAR', 'comprasunity'));
        txt = '⏰ Card em **AUTORIZADO COMPRA** há ' + dias + ' dia(s) útil(eis) sem compra registrada (prazo: ' + et.dias + '). Registrar pelo anexo **💰 Cotação / Compra** → aba 🛒 Compra.';
      } else if (et.quem === 'cotar') {
        mencao = sla_mencao_(sla_users_('SLA_COTAR', 'comprasunity'));
        txt = '⏰ Card em **EM COTAÇÃO** há ' + dias + ' dia(s) útil(eis) (prazo: ' + et.dias + '). Lançar a cotação pelo anexo **💰 Cotação / Compra**.';
      } else {
        var an = vd_analisar_(c.desc, c.name), criador = '';
        try { criador = vd_criador_(c.id); } catch (e) {}
        var auts = []; try { auts = vd_autorizacoesDaDescricao_(c.desc, an.pecas); } catch (e) {}
        var falta = an.pecas.filter(function (p) { return !auts.some(function (x) { return x.chave === vd_chavePeca_(p); }); });
        var seg = falta.filter(function (p) { return !vdf_pecaParticular_(p, c, an); }), part = falta.filter(function (p) { return vdf_pecaParticular_(p, c, an); });
        var us = [];
        if (seg.length) us = us.concat(sla_users_('SLA_AUTORIZAR', 'timweslley,comercialunity'));
        part.forEach(function (p) { us = us.concat(vdf_donosPart_(c, p, criador)); });   // equipe da unidade (14/10/2026)
        if (!us.length) return;
        mencao = sla_mencao_(us);
        txt = '⏰ Cotação aguardando autorização há ' + dias + ' dia(s) útil(eis) (prazo: ' + et.dias + ')' +
          (seg.length && part.length ? ' — peças da seguradora: diretoria; peças particulares: consultor' : '') + '. Autorizar pelo anexo **💰 Cotação / Compra** → aba ✅ Autorizar.';
      }
      try {
        if (silencioso) { props.setProperty(chave, '2999-01-01T12:00:00.000Z'); return; }   // pendência antiga: não avisa mais
        vd_comentar_(c, mencao + ' ' + txt);
        ev_registrar_('ALERTA PRAZO', c, 'robô', null, { detalhe: et.lista + ' há ' + dias + ' d.u. — ' + mencao });
        props.setProperty(chave, hoje.toISOString()); n++;
      } catch (e) { console.log('sla: ' + e); }
    });
  });
  // resumo diário do faturamento (só quando a coluna inteira foi vista — senão a lista sairia pela metade)
  if (!silencioso && fatCompleto && resumoFat.length) { try { if (sla_resumoFaturamento_(props, resumoFat, hoje, +vd_prop_('SLA_DIAS_FATURAR', 7))) n++; } catch (e) { console.log('resumo faturamento: ' + e); } }
  // 2) peça comprada / FO sem recebimento 1 d.u. depois da previsão
  var folga = +vd_prop_('SLA_DIAS_RECEBER', 1);
  var cards = vd_api_('/boards/' + board + '/cards', { cru: true, query: { fields: 'name,idList,shortLink,shortUrl,labels', checklists: 'all', checklist_fields: 'name', checkItem_fields: 'name,state,due' } });
  cards.forEach(function (c) {
    if (Date.now() > fim) return;
    if (vd_legado_(c.id)) return;   // card antigo: sem avisos de prazo
    var atrasados = { PAGAS: [], FO: [] }, chaves = [];
    (c.checklists || []).forEach(function (k) {
      // FO atrasada já tem o aviso "⏰ Fornecimento atrasado" (pz_executar_) — aqui só peça comprada (10/10/2026: era aviso em dobro)
      var tipo = /^PAGAS/i.test(String(k.name || '').trim()) ? 'PAGAS' : '';
      if (!tipo) return;
      (k.checkItems || []).forEach(function (it) {
        if (it.state === 'complete' || !it.due) return;
        if (hoje <= sla_mais_(it.due, folga)) return;
        var ch = 'SLA_I_' + it.id + '_' + String(it.due).slice(0, 10);
        if (!sla_podeAvisar_(props, ch, hoje)) return;
        atrasados[tipo].push(it.name.split(/\s+-\s+/)[0] + ' (previsão ' + vd_dataCurta_(it.due) + ')');
        chaves.push(ch);
      });
    });
    // 21/10/2026 (Weslley): devolução sem NF há mais de SLA_DIAS_NF_DEVOLUCAO d.u. (checklist DEVOLUÇÕES) — avisa o comprador uma vez por item
    try {
      var devAtr = [], chDev = [], folgaDev = +vd_prop_('SLA_DIAS_NF_DEVOLUCAO', 3);
      (c.checklists || []).forEach(function (k) {
        if (!/^DEVOLU[ÇC][ÕO]ES/i.test(String(k.name || '').trim())) return;
        (k.checkItems || []).forEach(function (it) {
          if (it.state === 'complete' || !it.due || hoje <= sla_mais_(it.due, folgaDev)) return;
          var chD = 'SLA_DEV_' + it.id; if (!sla_podeAvisar_(props, chD, hoje)) return;
          devAtr.push(String(it.name || '').replace(/^↩️\s*/, '').split(/\s+-\s+/)[0] + ' (devolvida ' + vd_dataCurta_(it.due) + ')'); chDev.push(chD);
        });
      });
      if (devAtr.length) {
        if (silencioso) chDev.forEach(function (ch) { props.setProperty(ch, '2999-01-01T12:00:00.000Z'); });
        else {
          vd_comentar_(c, sla_mencao_(sla_users_('SLA_RECEBER', 'comprasunity')) + ' ⏰ NF de devolução pendente há mais de ' + folgaDev + ' dia(s) útil(eis) — ' + devAtr.join('; ') + '. Informar o nº da NF e anexar na aba **📦 Recebimento → Devoluções**.');
          ev_registrar_('ALERTA PRAZO', c, 'robô', null, { detalhe: 'NF de devolução: ' + devAtr.join('; ') });
          chDev.forEach(function (ch) { props.setProperty(ch, hoje.toISOString()); }); n++;
        }
      }
    } catch (eD) { console.log('sla/devolução: ' + eD); }
    if (!chaves.length) return;
    var partes = [];
    if (atrasados.PAGAS.length) partes.push('verificar compra do item ' + atrasados.PAGAS.join(', '));
    if (atrasados.FO.length) partes.push('verificar prazo do item ' + atrasados.FO.join(', '));
    var mencao = sla_mencao_(sla_users_('SLA_RECEBER', 'comprasunity'));
    try {
      if (silencioso) { chaves.forEach(function (ch) { props.setProperty(ch, '2999-01-01T12:00:00.000Z'); }); return; }
      if (pz_jaAvisouHoje_(c.id)) { chaves.forEach(function (ch) { props.setProperty(ch, hoje.toISOString()); }); return; }
      vd_comentar_(c, mencao + ' ⏰ Peça sem recebimento informado depois da previsão — ' + partes.join('; ') + '. Se já chegou, registrar na aba **📦 Recebimento**.');
      ev_registrar_('ALERTA PRAZO', c, 'robô', null, { detalhe: 'recebimento: ' + partes.join('; ') });
      chaves.forEach(function (ch) { props.setProperty(ch, hoje.toISOString()); }); n++;
    } catch (e) { console.log('sla/receb: ' + e); }
  });
  if (silencioso) { props.setProperty(kZ, 'SIM'); console.log('prazos por etapa: histórico zerado (sem avisos)'); return 0; }
  if (n) console.log('prazos por etapa: ' + n + ' aviso(s)');
  return n;
}

// Fluxo.gs:370
function exc_executar_() {
  if (vd_prop_('EXC_PROTEGER', 'SIM') === 'NAO' || !vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var props = PropertiesService.getScriptProperties();
  var agora = new Date().toISOString(), desde = vd_marca_('EXC_ULTIMA');
  vd_marcaSet_('EXC_ULTIMA', agora);
  if (!desde) return 0;
  var board = vd_board_();
  var acoes = vd_acoesQuadro_(board, { filter: 'deleteCard', since: desde, limit: 50, memberCreator_fields: 'username,fullName' });
  if (!acoes.length) return 0;
  var admins = null, kAdm = 'exc_admins_' + board;
  try { admins = JSON.parse(CacheService.getScriptCache().get(kAdm) || 'null'); } catch (e) {}
  if (!admins) {
    admins = (vd_api_('/boards/' + board + '/memberships', { cru: true, query: { member: 'false' } }) || [])
      .filter(function (m) { return m.memberType === 'admin'; }).map(function (m) { return m.idMember; });
    try { CacheService.getScriptCache().put(kAdm, JSON.stringify(admins), 3600); } catch (e) {}
  }
  var n = 0;
  acoes.forEach(function (a) {
    if (!a.data || !a.data.card || !a.data.list) return;
    var quemId = a.idMemberCreator || (a.memberCreator && a.memberCreator.id) || '';
    var quem = a.memberCreator ? a.memberCreator.username : '?';
    if (!quemId || admins.indexOf(quemId) >= 0) return;   // administrador pode excluir; sem autor identificado, não recria (nunca recriar por falta de dado)
    if (vd_prop_('EXC_LIVRES', 'timweslley').split(/[,\s]+/).filter(String).indexOf(quem) >= 0) return;   // usuários liberados por nome (propriedade EXC_LIVRES; Weslley sempre pode excluir)
    var velho = a.data.card;
    try {
      var desc = vd_completa_(velho.id) || tr_ler_(velho.id) || '';
      var nome = String(velho.name || '').trim() || ('CARD RECUPERADO ' + (velho.idShort || ''));
      var novo = vd_api_('/cards', { method: 'post', payload: { idList: a.data.list.id, name: nome, pos: 'top' } });
      if (desc) vd_gravarDesc_(novo.id, desc);
      var compras = exc_comprasDoCard_(velho.shortLink);
      vd_comentar_(novo, '@' + quem + ' ♻️ **Card recuperado**: ele foi excluído em ' + Utilities.formatDate(new Date(a.date), 'America/Sao_Paulo', 'dd/MM HH:mm') +
        ' e só administrador pode excluir — para tirar um card do quadro, use **Arquivar**.\nA descrição voltou; checklists e anexos não voltam com a exclusão.' +
        (compras.length ? '\n\n🛒 Compras registradas antes da exclusão (planilha de eventos):\n' + compras.map(function (c) { return '- ' + c; }).join('\n') : ''));
      ev_registrar_('CARD EXCLUÍDO E RECRIADO', { name: nome, shortLink: novo.shortLink, shortUrl: novo.shortUrl }, quem, null, { detalhe: 'card antigo ' + (velho.shortLink || velho.id) });
      try {
        MailApp.sendEmail(vd_prop_('EXC_EMAIL', 'weslley.santos@unitycs.com.br'), 'Trello: card excluído e recriado — ' + nome,
          quem + ' excluiu o card "' + nome + '" (' + vd_board_() + ') em ' + a.date + '.\nO robô recriou o card: ' + novo.shortUrl +
          '\nChecklists e anexos não voltam com a exclusão — conferir no card.\n\nCompras registradas:\n' + (compras.join('\n') || '(nenhuma)'));
      } catch (e) {}
      n++;
    } catch (e) { console.log('exclusão: ' + e); }
  });
  return n;
}

// Fluxo.gs:416
function exc_comprasDoCard_(shortLink) {
  if (!shortLink) return [];
  try {
    var sh = ev_aba_(), n = sh.getLastRow();
    if (n < 2) return [];
    var v = sh.getRange(2, 1, n - 1, 13).getValues();
    return v.filter(function (r) { return r[1] === 'COMPRA' && String(r[3]).indexOf(shortLink) >= 0; }).map(function (r) {
      return [r[7], r[9], r[10] !== '' ? vd_valorBR_(r[10]) : '', r[12] ? 'previsão ' + Utilities.formatDate(new Date(r[12]), 'America/Sao_Paulo', 'dd/MM') : ''].filter(String).join(' - ');
    });
  } catch (e) { return []; }
}

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
  } finally {
    try { sg_destravar_(); } catch (e3) {}   // trava por card (10/10/2026)
  }
  try { qt_registrar_('formulário'); } catch (e2) {}
  var txt = JSON.stringify(out);
  if (rid && cache) {
    try { if (out.ok && txt.length < 90000) cache.put(rid, txt, 600); else cache.remove(rid); } catch (e2) {}
  }
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}

// FormularioServidor.gs:77
function vdf_servidorProps(token, op) {
  var me = vdf_usuario_(token), dono = vd_api_('/members/me', { query: { fields: 'id' } });
  if (!me || !dono || me.id !== dono.id) throw new Error('Só o servidor (conta do robô).');
  var p = PropertiesService.getScriptProperties();
  op = op || {};
  if (op.ler) return p.getProperties();
  // 17/10/2026: e-mails do robô rodando no servidor (alarmes, relatório diário) saem pela conta do robô
  if (op.emails && op.emails.length) {
    op.emails.slice(0, 20).forEach(function (m) {
      var o = { to: String(m.para || ''), subject: String(m.assunto || ''), body: String(m.corpo || '') };
      if (m.html) o.htmlBody = String(m.html);
      if (m.nome) o.name = String(m.nome);
      if (o.to) MailApp.sendEmail(o);
    });
    if (!op.set && !op.del && !op.cache) return { ok: true, emails: op.emails.length };
  }
  // 17/10/2026: licenças das travas do robô gravadas pelo servidor (ck_* = lista de horários, junta com a que já existe)
  if (op.cache) {
    var cs = CacheService.getScriptCache(), ks = Object.keys(op.cache), atual = cs.getAll(ks), nc = 0;
    ks.forEach(function (k) {
      if (!/^(ck_|st_ok_|tr_rec_)/.test(k)) return;
      var x = op.cache[k] || {}, v = String(x.v || '');
      if (/^(ck_|tr_rec_)/.test(k)) { var a1 = [], a2 = []; try { a1 = JSON.parse(atual[k] || '[]'); } catch (e) {} try { a2 = JSON.parse(v || '[]'); } catch (e) {}
        v = JSON.stringify(a1.concat(a2).filter(function (t, i, arr) { return arr.indexOf(t) === i; }).slice(/^ck_/.test(k) ? -40 : -12)); }
      // 19/10/2026: licença de coluna é contador — a do servidor SOMA à que já está aqui (a do robô não se perde)
      if (/^st_ok_/.test(k)) v = String((parseInt(atual[k], 10) || 0) + 1);
      cs.put(k, v, Math.min(+x.seg || 600, 21600)); nc++;
    });
    if (!op.set && !op.del) return { ok: true, cache: nc };
  }
  // 17/10/2026: o ciclo do robô segura a trava do script por minutos — esperar por ela fazia a devolução falhar (VD_DESC não
  // chegava). Tenta a trava por 3 s e grava de qualquer jeito (setProperties é atômico por chamada).
  var lock = LockService.getScriptLock(), travou = false;
  try { travou = lock.tryLock(3000); } catch (e) {}
  try {
    var set = op.set || {}, n = 0;
    if (Object.keys(set).length) { p.setProperties(set, false); n += Object.keys(set).length; }
    (op.del || []).forEach(function (k) { p.deleteProperty(k); n++; });
    return { ok: true, n: n, trava: travou };
  } finally { if (travou) lock.releaseLock(); }
}

// FormularioServidor.gs:119
function vdf_propsServidor(token) {
  vdf_usuario_(token);
  var p = PropertiesService.getScriptProperties(), out = {};
  VDF_PROPS_SERVIDOR.forEach(function (k) { var v = p.getProperty(k); if (v !== null) out[k] = v; });
  return out;
}

// FormularioServidor.gs:128
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
  VDF_ME = { username: me.username, fullName: me.fullName, token: token };   // 26/10/2026: assinatura "@usuario fez…" dos comentários
  return me;
}

// FormularioServidor.gs:169
function vdf_assinarComentario_(texto, token) {
  if (!VDF_ME || !token || token !== VDF_ME.token || !VDF_ME.username || vd_prop_('VD_ASSINAR_COMENT', 'SIM') === 'NAO') return texto;
  var t = String(texto || ''), u = String(VDF_ME.username), nome = String(VDF_ME.fullName || '');
  var m = t.match(/^((?:@[\w.\-]+\s+)*)(\S+\s+)?\*\*([^*\n]+)\*\*/);   // menções já existentes + emoji + **TÍTULO**
  if (!m) return t;
  if (new RegExp('^@' + u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s', 'i').test(t)) return t;   // já assinado
  var titulo = m[3].trim(), acao = '';
  VDF_ACOES.some(function (a) { if (a[0].test(titulo)) { acao = a[1]; return true; } return false; });
  if (!acao) return t;
  var resto = t.slice(m[0].length), esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  if (nome) resto = resto.replace(new RegExp('^\\s*(?:—\\s*|marcad[oa]s? por\\s+)' + esc(nome) + '(?:\\s*\\(' + esc(u) + '\\))?'), '');
  return (m[1] || '') + '@' + u + ' ' + acao + ' — ' + (m[2] || '') + '**' + titulo + '**' + resto;
}

// FormularioServidor.gs:185
function vdf_ehComprador_(me) {
  var lista = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).toLowerCase().split(/[,;\s]+/).filter(String);
  return lista.indexOf(String(me.username || '').toLowerCase()) >= 0;
}

// FormularioServidor.gs:192
function vdf_ehAutorizador_(me) {
  var lista = String(vd_prop_('VD_AUTORIZADORES', VDF_AUTORIZADORES_PADRAO)).toLowerCase().split(/[,;\s]+/).filter(String);
  return lista.indexOf(String(me.username || '').toLowerCase()) >= 0;
}

// FormularioServidor.gs:197
function vdf_podeComprar_(me) { return !!me && (vdf_ehComprador_(me) || vdf_ehAutorizador_(me)); }

// FormularioServidor.gs:198
function vdf_ehParticular_(card, an) {
  return (an.dados.tipo === 'PARTICULAR') || /PARTICULAR/i.test((card.labels || []).map(function (l) { return l.name; }).join(' ')) || /\bPARTICULAR\b/i.test(card.name || '');
}

// FormularioServidor.gs:202
function vdf_pecaParticular_(peca, card, an) { return !!(peca && peca.particular) || vdf_ehParticular_(card, an); }

// FormularioServidor.gs:210
function vdf_equipes_() {
  var out = {};
  String(vd_prop_('VD_EQUIPES', VDF_EQUIPES_PADRAO)).split(';').forEach(function (bloco) {
    var m = bloco.match(/^\s*([^:]+):\s*(.*)$/); if (!m) return;
    out[vd_semAcento_(m[1]).trim()] = m[2].toLowerCase().split(/[,\s]+/).map(function (u) { return u.replace(/^@/, '').trim(); }).filter(String);
  });
  return out;
}

// FormularioServidor.gs:220
function vdf_equipeDoCard_(card) {
  if (!card || !card.id) return [];
  if (VDF_EQUIPE_MEM[card.id]) return VDF_EQUIPE_MEM[card.id];
  var eq = [];
  try {
    var d = cf_defs_()['Unidade'];
    if (d) {
      var itens = card.customFieldItems || vd_api_('/cards/' + card.id + '/customFieldItems', { cru: true }) || [];
      var it = itens.filter(function (i) { return i.idCustomField === d.id; })[0], nome = '';
      if (it && it.idValue) Object.keys(d.opcoes).forEach(function (k) { if (d.opcoes[k] === it.idValue) nome = vd_semAcento_(k).trim(); });
      eq = (nome && vdf_equipes_()[nome]) || [];
    }
  } catch (e) { console.log('equipe da unidade: ' + e); }
  VDF_EQUIPE_MEM[card.id] = eq;
  return eq;
}

// FormularioServidor.gs:237
function vdf_donosPart_(card, peca, criador) {
  var eq = vdf_equipeDoCard_(card);
  if (eq.length) return eq.slice();
  var u = (peca && peca.partPor) || criador || '';
  return u ? [u] : [];
}

// FormularioServidor.gs:246
function vdf_podeAutorizarPeca_(me, card, an, peca, criador) {
  if (!me) return false;
  if (vdf_ehAutorizador_(me)) return true;
  if (!vdf_pecaParticular_(peca, card, an)) return false;
  var u = String(me.username || '').toLowerCase();
  if (peca && peca.partPor && peca.partPor === u) return true;
  if (vdf_equipeDoCard_(card).indexOf(u) >= 0) return true;   // consultor da equipe da unidade (14/10/2026)
  if (criador === undefined) { try { criador = vd_criador_(card.id); } catch (e) { criador = ''; } }
  return String(criador || '').toLowerCase() === u;
}

// FormularioServidor.gs:258
function vdf_podeAutorizar_(me, card, an) {
  if (!me) return false;
  if (vdf_ehAutorizador_(me)) return true;
  var criador; try { criador = vd_criador_(card.id); } catch (e) { criador = ''; }
  if (!an.pecas.length) return vdf_ehParticular_(card, an) && (String(criador || '').toLowerCase() === String(me.username || '').toLowerCase() || vdf_equipeDoCard_(card).indexOf(String(me.username || '').toLowerCase()) >= 0);
  return an.pecas.some(function (x) { return vdf_podeAutorizarPeca_(me, card, an, x, criador); });
}

// FormularioServidor.gs:267
function vdf_podeDevolver_(me, card, an) {
  if (!me) return false;
  if (vdf_ehAutorizador_(me)) return true;
  var criador; try { criador = vd_criador_(card.id); } catch (e) { criador = ''; }
  return an.pecas.length > 0 && an.pecas.every(function (x) { return vdf_podeAutorizarPeca_(me, card, an, x, criador); });
}

// FormularioServidor.gs:274
function vdf_iniciar(token) {
  var me = vdf_usuario_(token);
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'name,shortUrl' } });
  var labels = cf_opcoesUnidade_();   // opções do campo personalizado "Unidade"
  return {
    nome: me.fullName, usuario: me.username, quadro: board.name, urlQuadro: board.shortUrl, unidades: labels, comprador: vdf_podeComprar_(me), diretoria: vdf_ehAutorizador_(me),
    cfg: { teste: vd_board_() === VD.BOARD_PADRAO, tipos: VD.TIPOS, categPneu: VD.CATEG_PNEU }
  };
}

// FormularioServidor.gs:286
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

// FormularioServidor.gs:333
function vd_temOrcAnexo_(atts) { return (atts || []).some(function (a) { return /^📄 ORÇ\+? · /.test(String((a && a.name) || '')); }); }

// FormularioServidor.gs:336
function vdf_itensPagas_(c) {
  var out = [];
  (c.checklists || []).forEach(function (k) { if (/^PAGAS/i.test(String(k.name || '').trim())) (k.checkItems || []).forEach(function (i) { out.push(vd_semAcento_(i.name)); }); });
  return out;
}

// FormularioServidor.gs:342
function vdf_pecasAguardandoDecisao_(c, an, auts) {
  var pagas = vdf_itensPagas_(c);
  return ((an && an.pecas) || []).filter(function (x) {
    var k = vd_chavePeca_(x);
    return k && !x.naoComprar && !(auts || []).some(function (a) { return a.chave === k; }) && !pagas.some(function (n) { return vd_casaItem_(n, k); });
  });
}

// FormularioServidor.gs:350
function vdf_travaPeca_(p, auts, c) {
  var k = vd_chavePeca_(p);
  if (!k) return '';
  if (vdf_itensPagas_(c).some(function (n) { return vd_casaItem_(n, k); })) return 'COMPRADA';
  if ((auts || []).some(function (a) { return a.chave === k; })) return 'AUTORIZADA';
  return '';
}

// FormularioServidor.gs:358
function vdf_sigTrava_(p) {
  return [p.pneu ? 'P' : '', String(p.codigo || '').replace(/\s+/g, '').toUpperCase(),
    p.pneu ? vd_semAcento_(p.medida).replace(/\s+/g, '') : vd_semAcento_(p.descricao).replace(/\s+/g, ' ').trim(),
    p.pneu ? '' : (p.tipos || []).join('/'), String(+(p.qtd || 1) || 1)].join('|');
}

// FormularioServidor.gs:370
function vd_carroCurto_(modelo) {
  var ps = vd_semAcento_(modelo).replace(/[\/]/g, ' ').split(/\s+/).filter(String);
  // "VOLKSWAGEN NOVO GOL RALLYE" -> GOL, não NOVO (ATP5105, 08/10/2026)
  for (var i = 0; i < ps.length; i++) if (VD_MARCAS.indexOf(ps[i]) < 0 && !/^\d/.test(ps[i]) && !(/^(NOVO|NOVA)$/.test(ps[i]) && i + 1 < ps.length)) return ps[i];
  return '';
}

// FormularioServidor.gs:377
function vd_titulo_(placa, carro, cor, seguradora) {
  return [placa, carro, cor, seguradora].map(function (s) { return String(s || '').trim().toUpperCase(); }).filter(String).join(' ');
}

// FormularioServidor.gs:384
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
  }).concat(vdf_arquivadosDaPlaca_(placa));
}

// FormularioServidor.gs:411
function vdf_arquivadosDaPlaca_(placa) {
  if (!vd_placaValida_(placa)) return [];
  try {
    var idQ = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } }).id;   // a busca só aceita o id longo do quadro (o atalho dá erro)
    var r = vd_api_('/search', { query: { query: placa + ' is:archived', idBoards: idQ, modelTypes: 'cards', card_fields: 'name,shortLink,closed,dateLastActivity', cards_limit: 10, partial: 'true' } });
    return ((r && r.cards) || []).filter(function (c) { return c.closed && !vdf_cardProtegido_(c.name) && vd_mesmaPlaca_(vd_placaDoTexto_(c.name) || '', placa); })
      .sort(function (a, b) { return String(b.dateLastActivity || '').localeCompare(String(a.dateLastActivity || '')); })
      .slice(0, 5).map(function (c) { return { shortLink: c.shortLink, nome: c.name, lista: 'arquivado', arquivado: true, porChassi: false }; });
  } catch (e) { console.log('busca arquivados: ' + e); return []; }
}

// FormularioServidor.gs:424
function vdf_temOrdemAut_(card) {
  return (card.labels || []).some(function (l) { return vd_semAcento_(String(l.name || '')).toUpperCase().indexOf(VDF_ETIQ_ORDEM) >= 0; });
}

// FormularioServidor.gs:428
function vdf_ehPosCotacao_(nomeLista) {
  return VD.LISTAS_FORA.indexOf(vd_nomeColuna_(nomeLista)) < 0;
}

// FormularioServidor.gs:433
function vdf_cardProtegido_(nome) {
  return /NOVO PEDIDO DE PE[ÇC]A/i.test(nome || '') || /^\s*AVISO\b/i.test(nome || '');
}

// FormularioServidor.gs:439
function vdf_ordemDoCard_(c) {
  try {
    var d = cf_defs_()[VDF_CAMPO_ORDEM]; if (!d) return '';
    var it = (c.customFieldItems || []).filter(function (i) { return i.idCustomField === d.id; })[0];
    return it && it.value ? String(it.value.number || it.value.text || '') : '';
  } catch (e) { return ''; }
}

// FormularioServidor.gs:447
function vdf_gravarOrdem_(cardId, ordem, card) {
  ordem = String(ordem || '').replace(/\D/g, '');
  if (!ordem) return false;
  var d = cf_defs_()[VDF_CAMPO_ORDEM]; if (!d) return false;
  // 26/10/2026 (velocidade): card lido com customFieldItems — nº da ordem igual não grava de novo (nem dispara cf_sincronizar_)
  try {
    var itO = ((card && card.customFieldItems) || []).filter(function (i) { return i.idCustomField === d.id; })[0];
    var atualO = itO && itO.value ? String(itO.value.number !== undefined ? itO.value.number : (itO.value.text || '')) : '';
    if (atualO.replace(/\D/g, '') === ordem) return false;
  } catch (e) {}
  var corpo = d.tipo === 'number' ? { value: { number: ordem } } : { value: { text: ordem } };
  vd_api_('/cards/' + cardId + '/customField/' + d.id + '/item', { method: 'put', payload: corpo });
  return true;
}

// FormularioServidor.gs:462
function vdf_unidadeDoCard_(c) {
  try {
    var d = cf_defs_()['Unidade']; if (!d) return '';
    var it = (c.customFieldItems || []).filter(function (i) { return i.idCustomField === d.id; })[0];
    return it && it.idValue ? it.idValue : '';
  } catch (e) { return ''; }
}

// FormularioServidor.gs:470
function vdf_gravarUnidade_(card, idOpcao) {
  if (!idOpcao || vdf_unidadeDoCard_(card) === idOpcao) return false;
  return cf_gravarUnidade_(card.id, idOpcao);
}

// FormularioServidor.gs:481
function vdf_limparCardRotina(token, p) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) throw new Error('Só a diretoria.');
  var acs = vd_api_('/cards/' + p.shortLink + '/actions', { query: { filter: 'commentCard', limit: 1000, fields: 'data' } }) || [];
  if (!p.forcar && !acs.some(function (a) { return /Card aberto pela Rotina Unity/.test(((a.data || {}).text) || ''); })) return { ok: false, faltas: ['Este card não foi aberto pela Rotina.'] };
  var c = vdf_carregarCard(token, p.shortLink);
  var tirar = [], pecas = [];
  (c.pecas || []).forEach(function (x) {
    var d = vd_consertarAcentos_(x.descricao || '');
    if (!x.pneu && vd_ehServico_(vd_semAcento_(d).toUpperCase())) { tirar.push(d); return; }
    pecas.push({ pneu: x.pneu, codigo: x.codigo, descricao: d, tipos: x.tipos || [], medida: x.medida, categoria: x.categoria, marca: vd_consertarAcentos_(x.marca || ''),
      qtd: x.qtd, particular: x.particular, partPor: x.partPor, complemento: x.complemento, compData: x.compData, naoComprar: x.naoComprar, naoMotivo: x.naoMotivo, valorOrc: x.valorOrc, obs: x.obs });
  });
  // 19/10/2026 (Weslley: "BDD2J09 puxou errado tbm as peças"): a Rotina mandou TODAS as linhas do Cilia (R&I, reparação,
  // pintura) como peça. p.manter = códigos das peças de TROCA pela oficina (conferidas no PDF); 'PNEU' mantém um pneu por medida.
  if (p.manter && p.manter.length) {
    var norm = function (x) { return String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); };
    var keep = p.manter.map(norm), pneuVisto = {}, ficaM = [];
    // pneu: um por medida, de preferência o que já tem marca
    pecas.filter(function (x) { return x.pneu; }).forEach(function (x) { var m = norm(x.medida); if (!pneuVisto[m] || (!pneuVisto[m].marca && x.marca)) pneuVisto[m] = x; });
    pecas.forEach(function (x) {
      var ok = x.pneu ? (keep.indexOf('PNEU') >= 0 && pneuVisto[norm(x.medida)] === x) : !!(x.codigo && keep.indexOf(norm(x.codigo)) >= 0);
      if (ok) ficaM.push(x); else tirar.push(x.pneu ? 'PNEU ' + (x.medida || '') + ' ' + (x.marca || '') : x.descricao);
    });
    var travadas = (c.pecas || []).filter(function (x) { return x.travada; }).length;
    var temCot = ((c.cotacoes || {}).cotacoes || []).length;
    if (travadas || temCot) return { ok: false, faltas: ['O card já tem cotação/autorização — conferir à mão.'] };
    pecas = ficaM;
  }
  var acento = (c.pecas || []).filter(function (x) { return vd_consertarAcentos_(x.descricao || '') !== (x.descricao || ''); }).length;
  if (p.simular || (!tirar.length && !acento)) return { ok: true, simulado: !!p.simular, tirar: tirar, acentos: acento, ficam: pecas.length };
  var t = c.titulo || {};
  var r = vdf_salvar(token, { shortLink: p.shortLink, limpezaRotina: true, dados: Object.assign({}, c.dados || {}, { ordem: c.ordem || '' }), pecas: pecas, obs: c.obs || '', fileIds: [], capaId: '', orcamento: null,
    novo: { tipo: c.tipo, carro: t.carro, cor: t.cor || (c.dados || {}).cor, seguradora: t.seguradora || (c.dados || {}).seguradora, sinistro: (c.dados || {}).sinistro || '', unidade: c.unidadeId || '' } });
  return { ok: !!(r && r.ok !== false), tirar: tirar, acentos: acento, ficam: pecas.length, resultado: r && r.ok === false ? r.faltas : (r && r.lista) };
}

// FormularioServidor.gs:518
function vdf_carregarCard(token, shortLink) {
  var me = vdf_usuario_(token);
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  var c = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,idBoard,idList,shortLink,shortUrl,idLabels,labels', checklists: 'all', checkItem_fields: 'name,state,due', attachments: 'true', attachment_fields: 'name,fileName,mimeType,isUpload,bytes,url,date', customFieldItems: 'true' } });
  if (c.idBoard !== board.id) throw new Error('Este card não é do quadro do formulário.');
  var lista = vd_api_('/lists/' + c.idList, { query: { fields: 'name' } }).name;
  ax_padronizarCard_(c, token);   // card antigo aberto no formulário: anexos já lidos ganham o nome padronizado (05/10/2026)
  return vdf_montarCard_(c, lista, me);
}

// FormularioServidor.gs:529
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
      return an.pecas.map(function (p) { return { pneu: p.pneu, codigo: p.codigo, acessorio: !!p.acessorio, descricao: p.descricao, tipos: p.tipos, medida: p.medida, categoria: p.categoria, marca: p.marca, qtd: p.qtd, particular: vdf_pecaParticular_(p, c, an), partPor: p.partPor || '', complemento: !!p.complemento, compData: p.compData || '', compStatus: p.compStatus || '', compPor: p.compPor || '', valorOrc: vd_valorOrcTxt_(p.valorOrc), obs: p.obs || '', foto: !!p.foto, travada: vdf_travaPeca_(p, autorizadas, c), podeAut: vdf_podeAutorizarPeca_(me, c, an, p, criador), chave: vd_chavePeca_(p), nome: vd_nomePeca_(p) }; })
        // peças "não comprar": o formulário de edição mostra (chip marcado); cotação/autorização/compra não (sem chave)
        .concat((an.naoComprar || []).map(function (p) { return { pneu: p.pneu, codigo: p.codigo, acessorio: !!p.acessorio, descricao: p.descricao, tipos: p.tipos, medida: p.medida, categoria: p.categoria, marca: p.marca, qtd: p.qtd, particular: false, partPor: '', complemento: !!p.complemento, compData: p.compData || '', naoComprar: true, naoMotivo: p.naoMotivo || '', valorOrc: vd_valorOrcTxt_(p.valorOrc), obs: p.obs || '', travada: '', podeAut: false, chave: '', nome: vd_nomePeca_(p) }; }));
    })(),
    padrao: an.pecas.length > 0 || (an.naoComprar || []).length > 0,
    cotacoes: (function () { try { return vd_cotacoesDaDescricao_(c.desc, an.pecas); } catch (e) { return { cotacoes: [], nt: [] }; } })(),
    doOrcamento: an.doOrcamento || vd_temOrcAnexo_(c.attachments),   // 13/10/2026: card migrado do fluxo antigo tem o 📄 ORÇ anexado mas não a marca na descrição (BDK2J49)
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
    locais: rc_locais_(),
    quemRetira: rc_quemLista_(),   // quem já retirou peças (sugestão na aba Retirada)   // locais de estoque já usados (sugestão na aba Recebimento, 10/10/2026)
    particular: vdf_ehParticular_(c, an),
    diretoria: vdf_ehAutorizador_(me), podeComprar: vdf_podeComprar_(me), podeReceber: vdf_podeReceber_(me, c), ordemAut: vdf_temOrdemAut_(c), solicitante: criador || '',
    ordem: vdf_ordemDoCard_(c), unidadeId: vdf_unidadeDoCard_(c),
    devolucoes: (function () { try { return rc_devolucoes_(c); } catch (e) { return []; } })(),   // 21/10/2026: checklist DEVOLUÇÕES (NF pendente / informada)
    totais: (function () { try { return vd_totais_(c); } catch (e) { return null; } })(),
    totaisQtd: (function () { try { return vd_totaisPorQtd_(); } catch (e) { return false; } })(),   // valor da cotação é da UNIDADE: as somas da tela multiplicam pela quantidade (15/10/2026)
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

// FormularioServidor.gs:585
function vdf_partesTitulo_(nome, dados) {
  dados = dados || {};
  var estrIni = /^\s*([A-Z]{4}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})\b/.exec(vd_semAcento_(nome));   // placa estrangeira no começo do título (13/10/2026)
  if (estrIni && dados.pais) nome = nome.replace(estrIni[0], ' ABC1D23 ');   // troca por uma placa de mentira só para separar as partes
  if (!vd_placaDoTexto_(nome)) nome = '';   // título fora do padrão (ex.: "image.png"): monta do zero
  // nº da ordem antes da placa ("4496 BBV0H58 ETIOS …", card criado à mão) não é parte do carro (09/10/2026)
  var ps0 = vd_semAcento_(nome).replace(/^[\s\d]+(?=[A-Z]{3}[\s\-]?\d[A-Z0-9]\d{2}\b)/, '').replace(/\b[A-Z]{3}[\s\-]?\d[A-Z0-9]\d{2}\b/, ' ').replace(/[^A-Z0-9 \-]/g, ' ').split(/\s+/).map(function (t) { return t.replace(/^-+|-+$/g, ''); }).filter(String);   // 17/10: hífen do carro fica (F-250, HR-V, T-CROSS)
  var ps = ps0.filter(function (t) { return VD_LIXO_TITULO.indexOf(t) < 0; });
  var r = { carro: '', cor: dados.cor || '', seguradora: dados.seguradora || '' };
  if (ps.length && !r.seguradora && (ps[ps.length - 1] === 'PARTICULAR' || ps[ps.length - 1] === 'RETORNO' || VD_SEGURADORAS.some(function (s) { return s[0] === ps[ps.length - 1]; }))) r.seguradora = ps.pop();
  else if (ps.length && r.seguradora && ps[ps.length - 1] === vd_semAcento_(r.seguradora)) ps.pop();
  // 17/10/2026 (DRL8G82 "HONDA CIVIC CINZA AZUL", orçamento da Porto): outra seguradora no fim do título também sai (AZUL é
  // seguradora e cor) e a cor lida do anexo não fica repetida no carro ("HONDA CIVIC CINZA CINZA PORTO")
  else if (ps.length > 1 && r.seguradora && VD_SEGURADORAS.some(function (s) { return s[0] === ps[ps.length - 1]; })) ps.pop();
  if (r.cor) { var corN = vd_semAcento_(r.cor); for (var k0 = ps.length - 1; k0 > 0; k0--) if (ps[k0] === corN) { ps.splice(k0, 1); break; } }
  for (var k = ps.length - 1; k > 0; k--) {
    if (VD_CORES.indexOf(ps[k]) >= 0 && !(r.cor && k < ps.length - 1)) { var c = ps.splice(k, 1)[0]; if (!r.cor) r.cor = c; break; }
  }
  r.carro = ps.join(' ') || vd_carroCurto_(dados.modelo || '');
  return r;
}

// FormularioServidor.gs:610
function vdf_ocrServidor(token, base64, mime, nome) {
  vdf_usuario_(token);
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime || 'application/pdf', nome || 'arquivo');
  return { texto: vd_ocr_(blob, nome || 'arquivo') };
}

// FormularioServidor.gs:619
function vdf_fotosDoCard_(token, shortLink) {
  vdf_usuario_(token);
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  var c = vd_api_('/cards/' + shortLink, { query: { fields: 'idBoard,idAttachmentCover', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,url,previews,date,bytes' } });
  if (c.idBoard !== board.id) throw new Error('Este card não é do quadro do formulário.');
  var fotos = (c.attachments || []).filter(function (a) {
    return a.isUpload && (/^image\//i.test(a.mimeType || '') || /\.(jpe?g|png|webp|gif)$/i.test(a.name || ''));
  });
  fotos.sort(function (a, b) { return (b.id === c.idAttachmentCover) - (a.id === c.idAttachmentCover) || String(b.date || '').localeCompare(String(a.date || '')); });
  return { card: c, fotos: fotos };
}

// FormularioServidor.gs:631
function vdf_urlPreview_(a, min) {
  var ps = (a.previews || []).filter(function (p) { return p && p.url && p.width; }).sort(function (x, y) { return x.width - y.width; });
  var p = ps.filter(function (x) { return x.width >= min; })[0] || ps[ps.length - 1];
  if (p) return p.url;
  return (a.bytes || 0) <= 400000 ? a.url : '';
}

// FormularioServidor.gs:637
function vdf_baixarFotos_(lista, min, pref) {
  var cache = CacheService.getScriptCache(), out = {}, falta = [];
  lista.forEach(function (a) {
    var v = null; try { v = cache.get(pref + a.id); } catch (e) {}
    if (v) out[a.id] = v; else falta.push(a);
  });
  var reqs = [], quem = [];
  falta.forEach(function (a) { var u = vdf_urlPreview_(a, min); if (u) { reqs.push({ url: u, method: 'get', muteHttpExceptions: true, headers: { Authorization: vd_auth_() } }); quem.push(a); } });
  if (reqs.length) {
    var rs = qt_fetchAll_(reqs);
    rs.forEach(function (r, i) {
      if (r.getResponseCode() >= 300) return;
      var b = r.getBlob(), tipo = b.getContentType() || 'image/jpeg';
      if (!/^image\//i.test(tipo)) return;
      var src = 'data:' + tipo + ';base64,' + Utilities.base64Encode(b.getBytes());
      out[quem[i].id] = src;
      if (src.length < 95000) { try { cache.put(pref + quem[i].id, src, 21600); } catch (e) {} }
    });
  }
  return out;
}

// FormularioServidor.gs:659
function vdf_fotosCard(token, shortLink) {
  var x = vdf_fotosDoCard_(token, shortLink), lista = x.fotos.slice(0, 12);
  var srcs = vdf_baixarFotos_(lista, 300, 'vdf_mini_');
  return {
    capa: x.card.idAttachmentCover || '', total: x.fotos.length,
    fotos: lista.filter(function (a) { return srcs[a.id]; }).map(function (a) {
      return { id: a.id, nome: a.name || '', data: a.date ? vd_dataCurta_(a.date) : '', capa: a.id === x.card.idAttachmentCover, src: srcs[a.id] };
    })
  };
}

// FormularioServidor.gs:670
function vdf_fotoCard(token, shortLink, idAnexo) {
  var x = vdf_fotosDoCard_(token, shortLink);
  var a = x.fotos.filter(function (f) { return f.id === idAnexo; })[0];
  if (!a) throw new Error('Essa foto não está mais no card.');
  var srcs = vdf_baixarFotos_([a], 1000, 'vdf_foto_');
  return { id: a.id, src: srcs[a.id] || '' };
}

// FormularioServidor.gs:678
function vdf_copiarCapa_(origem, destino, placa, token) {
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  var c = vd_api_('/cards/' + origem, { query: { fields: 'idBoard,idAttachmentCover', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,url,bytes' } });
  if (!c || c.idBoard !== board.id || !c.idAttachmentCover) return false;
  var a = (c.attachments || []).filter(function (x) { return x.id === c.idAttachmentCover && x.isUpload && x.url; })[0];
  if (!a || (a.bytes || 0) > 10000000) return false;
  var r = UrlFetchApp.fetch(a.url, { method: 'get', muteHttpExceptions: true, headers: { Authorization: vd_auth_() } });
  if (r.getResponseCode() >= 300) return false;
  var b = r.getBlob();
  if (!/^image\//i.test(b.getContentType() || '') && !/\.(jpe?g|png|webp|gif)$/i.test(a.name || '')) return false;
  var nome = ax_nome_(AX.FOTO, placa, ['capa']);
  b.setName(/\.\w{3,4}$/.test(nome) ? nome : nome + ((/\.(jpe?g|png|webp|gif)$/i.exec(a.name || '') || ['.jpg'])[0]));
  var at = vd_api_('/cards/' + destino.id + '/attachments', { method: 'post', multipart: { file: b, name: b.getName(), setCover: 'true' } }, token);
  if (!at || !at.id) return false;
  try { vd_api_('/cards/' + destino.id, { method: 'put', payload: { idAttachmentCover: at.id } }, token); } catch (e) {}
  return true;
}

// FormularioServidor.gs:696
function vdf_definirCapa(token, shortLink, idAnexo) {
  var x = vdf_fotosDoCard_(token, shortLink);
  if (!x.fotos.some(function (f) { return f.id === idAnexo; })) throw new Error('Essa foto não está mais no card.');
  vd_api_('/cards/' + x.card.id, { method: 'put', payload: { idAttachmentCover: idAnexo } }, token);
  return { ok: true, capa: idAnexo };
}

// FormularioServidor.gs:706
function vdf_anexosDoCard_(attachments) {
  var props = PropertiesService.getScriptProperties();
  return (attachments || []).filter(vd_anexoLegivel_).map(function (a) {
    return { id: a.id, nome: a.name, arquivo: a.fileName || a.name, bytes: a.bytes || 0, pdf: /pdf/i.test(a.mimeType || '') || /\.pdf$/i.test(a.name || ''), lido: vd_anxTem_(a.id), url: a.url || '' };
  });
}

// FormularioServidor.gs:714
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

// FormularioServidor.gs:727
function vdf_lerAnexoCard(token, shortLink, idAnexo, placa) {
  vdf_usuario_(token);
  var board = vd_api_('/boards/' + vd_board_(), { query: { fields: 'id' } });
  var c = vd_api_('/cards/' + shortLink, { query: { fields: 'idBoard,name', attachments: 'true', attachment_fields: 'name,fileName,mimeType,isUpload,bytes,url,date' } });
  if (c.idBoard !== board.id) throw new Error('Este card não é do quadro do formulário.');
  var a = (c.attachments || []).filter(function (x) { return x.id === idAnexo; })[0];
  if (!a) throw new Error('Esse anexo não está mais no card.');
  if (!vd_anexoLegivel_(a)) throw new Error('Esse anexo não dá para ler (só PDF ou foto até 15 MB).');
  var r = vd_lerAnexoTrello_(a, { orcCompleto: true });
  // anexo lido pelo botão do formulário já ganha o nome padronizado (13/10/2026, UIC5G94: antes só na próxima abertura do card,
  // e orçamento grande nem isso — o cache curto não guardava que era orçamento)
  try {
    if (r && !r.erro && a.isUpload) {
      var temOrcA = (c.attachments || []).some(function (x) { return x.id !== a.id && String(x.name || '').indexOf(AX.ORC + AX.SEP) === 0; });
      ax_batizarLido_(c, a, r, temOrcA, token);
    }
  } catch (e) { console.log('batizar anexo lido (formulário): ' + e); }
  if (!r) throw new Error('O Trello não entregou o arquivo "' + a.name + '". Tente de novo.');
  if (r.erro) return { anexoId: a.id, jaNoCard: true, erro: 'Não consegui ler "' + a.name + '" (' + r.erro + ').' };
  var orc = r.orcFull || (r.orc ? { origem: r.orcamento, oficina: vd_orcExpandir_(r.orc.o), fo: vd_orcExpandir_(r.orc.f) } : { origem: '' });
  if (!r.orcFull && orc.fo) (r.foi || []).forEach(function (fi) { orc.fo.forEach(function (x) { if (fi[0] && x.codigo === fi[0]) { x.fornecedor = fi[1]; x.previsao = fi[2]; } }); });
  orc.cor = r.cor; orc.seguradora = r.seguradora; orc.sinistro = r.sinistro;
  var out = vdf_respostaLeitura_(r, orc, placa);
  out.anexoId = a.id; out.jaNoCard = true; out.doCache = !!r.doCache;
  return out;
}

// FormularioServidor.gs:755
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

// FormularioServidor.gs:773
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

// FormularioServidor.gs:807
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

// FormularioServidor.gs:825
function vdf_respostaLeitura_(r, orc, placa) {
  var placasDoc = (r.placas || []).slice(0, 5);
  var confere = !placa || placasDoc.some(function (p) { return vd_mesmaPlaca_(p, placa); });
  r.chassis = r.chassis || [];
  // 15/10/2026 (Weslley, RHR9A41): Cilia "HILUX ... 4X4 AUT 2022" virava placa "AUT2022" e, com 2 placas, o formulário
  // não preenchia nenhuma. Sugestão: a placa "com rótulo" (logo depois de PLACA) se for única; senão a única que não
  // tem cara de ano (4 dígitos 19xx/20xx).
  var rot = r.placasRot || [];
  var placaSug = rot.length === 1 ? rot[0] : '';
  if (!placaSug) {
    var semAno = placasDoc.filter(function (p) { return !/^[A-Z]{3}(19[5-9]\d|20[0-4]\d)$/.test(p); });
    if (placasDoc.length === 1) placaSug = placasDoc[0];
    else if (semAno.length === 1) placaSug = semAno[0];
  }
  return {
    confere: confere,
    placasDoc: placasDoc,
    placaSug: placaSug,
    chassi: confere && r.chassis.length === 1 ? r.chassis[0] : '',
    chassiDivergente: r.chassis.length > 1 ? r.chassis : null,
    chassiInvalido: !r.chassis.length && r.chassiInvalido ? r.chassiInvalido : '',   // 26/10/2026 (APO0I47)
    modelo: r.modelo || '', ano: r.ano || '', motor: r.motor || '',
    carro: vd_carroCurto_(r.modelo || ''),
    cor: orc.cor || '', seguradora: orc.seguradora || '', sinistro: orc.sinistro || '',
    orcamento: orc.origem ? { origem: orc.origem, oficina: orc.oficina, fo: orc.fo } : null
  };
}

// FormularioServidor.gs:853
function vdf_pastaTemp_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('VD_PASTA_TEMP');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var p = DriveApp.createFolder('Validação Trello — anexos temporários do formulário');
  props.setProperty('VD_PASTA_TEMP', p.getId());
  return p;
}

// FormularioServidor.gs:870
function vdf_registrarTrocasFo_(card, token, origem, usuario) {
  var trocas = VDF_FO_TROCAS; VDF_FO_TROCAS = [];
  if (!trocas.length || !card) return '';
  var txt = '🔁 **CÓDIGO ALTERADO NO FORNECIMENTO**' + (origem ? ' — ' + origem : '') + '\n' +
    trocas.map(function (t) { return '- ' + t.desc + ': ' + t.antigo + ' → **' + t.novo + '** (o item do checklist já está com o código novo; o antigo fica anotado nele como "🔁 ex")'; }).join('\n');
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } }, token); } catch (e) { console.log('trocas FO/comentário: ' + e); }
  try { ev_registrar_('CÓDIGO CORRIGIDO', card, usuario || 'robô', trocas.map(function (t) { return { peca: { codigo: t.novo, descricao: t.desc }, detalhe: 'código ' + t.antigo + ' → ' + t.novo + ' (fornecimento' + (origem ? ', ' + origem : '') + ')' }; })); } catch (e) {}
  return txt;
}

// FormularioServidor.gs:879
function vdf_checklistFornecimento_(cardId, fo, token, nomeLista) {
  VDF_FO_TROCAS = [];
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
    existentes.forEach(function (e, j) { if (porCodigo[j] === undefined && (vd_casaItem_(e.norm, vd_semAcento_(cod0)) || vdf_foColado_(e.norm, cod0))) porCodigo[j] = k; });
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
    var candJa = existentes.filter(function (e, j) { return !usados[j] && (vd_casaItem_(e.norm, chave) || (cod && vdf_foColado_(e.norm, cod))); });
    // 27/10/2026 (KPJ9A04): sem item com o código novo, o item com o código ANTIGO (riscado no orçamento) é a mesma peça
    var codAnt = String(p.codigoAntigo || '').replace(/\s+/g, '');
    if (!candJa.length && codAnt) candJa = existentes.filter(function (e, j) { return !usados[j] && (vd_casaItem_(e.norm, vd_semAcento_(codAnt)) || vdf_foColado_(e.norm, codAnt)); });
    // mesmo código em dois itens (sensor DIR/ESQ) com o código grudado: fica o de descrição mais parecida
    var ja = candJa.length > 1 && desc ? candJa.slice().sort(function (a, b) { return cp_similar_(desc, b.norm.slice(cod.length)) - cp_similar_(desc, a.norm.slice(cod.length)); })[0] : candJa[0];
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
        var mkJa = rc_marcas_(String(ja.item.name || '').trim()), atual = mkJa.base, novo = nome;   // marcas 📍/✋/↩️ ficam (10/10/2026)
        // 27/10/2026 (KPJ9A04): casou pela descrição e o código é outro = o orçamento trocou o código → o antigo fica no item ("🔁 ex") e a troca é registrada
        var codAntigo = (atual.match(/^([A-Z0-9][A-Z0-9.\-\/]{3,})\s/i) || [])[1] || '';
        if (cod && codAntigo && vd_semAcento_(codAntigo) !== vd_semAcento_(cod)) {
          if (!mkJa.exCodigo) mkJa.exCodigo = codAntigo;
          VDF_FO_TROCAS.push({ antigo: codAntigo, novo: cod, desc: desc || pv_curto_(atual), item: ja.item.id });
        }
        // fornecedor que alguém já anotou no item ("... - AVENIDA") fica, se o orçamento não trouxe outro
        var sufixo = atual.match(/\s-\s[^-]+$/);
        if (!p.fornecedor && sufixo && !/\s-\s[^-]+$/.test(novo)) novo += sufixo[0];
        var upd = {};
        if (novo && novo !== atual) upd.name = rc_comMarcas_(novo, mkJa);
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

// FormularioServidor.gs:955
function vdf_foColado_(norm, cod) {
  var n = String(norm || '').toUpperCase(), c = vd_semAcento_(String(cod || '')).toUpperCase().replace(/\s+/g, '');
  return c.length >= 6 && n.indexOf(c) === 0 && /^[A-Z]{3}/.test(n.slice(c.length));
}

// FormularioServidor.gs:962
function vd_dataCurta_(s) {
  var iso = vd_dataBR_(s);
  return iso ? Utilities.formatDate(new Date(iso), 'America/Sao_Paulo', 'dd/MM') : String(s || '');
}

// FormularioServidor.gs:968
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

// FormularioServidor.gs:980
function vd_valorNum_(s) {
  s = String(s == null ? '' : s).replace(/R\$/i, '').replace(/\s/g, '');
  if (!s) return NaN;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  else if (!/^-?\d*\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');   // 14/10/2026 (A01): ".5" = 0,50 e "-12.5" = -12,50, igual ao formulário
  return parseFloat(s);
}

// FormularioServidor.gs:989
function vd_valorBR_(v) {
  var n = typeof v === 'number' ? v : vd_valorNum_(v);
  if (isNaN(n)) return '';
  var s = n.toFixed(2).split('.');
  return 'R$ ' + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + s[1];
}

// FormularioServidor.gs:998
function vd_dataMaisDias_(dias) {
  return du_somarUteis_(dias);
}

// FormularioServidor.gs:1003
function vd_chavePeca_(p) {
  if (p.pneu) return vd_semAcento_('PNEU ' + String(p.medida || '').replace(/\s+/g, ''));
  var cod = String(p.codigo || '').replace(/\s+/g, '');
  return vd_semAcento_(cod || p.descricao || '').replace(/\s+/g, ' ').trim();
}

// FormularioServidor.gs:1011
function vd_casaItem_(nomeItem, k) {
  k = String(k || '').replace(/\s+/g, ' ').trim();
  if (!k) return false;
  var n = vd_semAcento_(nomeItem).replace(/\s+/g, ' ').trim();
  if (n === k) return true;
  if (/^\S+$/.test(k) && /\d/.test(k)) return n.indexOf(k + ' ') === 0;
  if (/^PNEU /.test(k)) return n.indexOf(k + ' ') === 0;
  return n.indexOf(k + ' - ') === 0 || n.indexOf(k + ' (X') === 0;
}

// FormularioServidor.gs:1022
function vd_nomePeca_(p) {
  if (p.pneu) return ('PNEU ' + String(p.medida || '').replace(/\s+/g, '') + ' ' + (p.marca || p.categoria || '')).trim();
  var cod = String(p.codigo || '').replace(/\s+/g, '');
  return ((cod ? cod + ' ' : '') + String(p.descricao || '').trim()).toUpperCase();
}

// FormularioServidor.gs:1032
function vd_checklistPagas_(cardId, compras, token) {
  compras = (compras || []).filter(function (c) { return String(c.fornecedor || '').trim(); });
  if (!compras.length) return 0;
  var lists = vd_api_('/cards/' + cardId + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name,due,pos' } }, token);
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
  var n = 0, lote = [], posMax = {};
  compras.forEach(function (c) {
    var cl = lista(!!c.particular, !!c.complemento);
    // 17/10/2026: itens vão em paralelo (vd_apiLote_) — a posição explícita mantém a ordem das peças
    if (posMax[cl.id] === undefined) posMax[cl.id] = (cl.checkItems || []).reduce(function (m, i) { return Math.max(m, +i.pos || 0); }, 0);
    var cod = String(c.codigo || '').replace(/\s+/g, '').toUpperCase();
    var desc = String(c.descricao || '').trim().toUpperCase();
    var forn = String(c.fornecedor || '').trim().toUpperCase();
    var valor = vd_valorBR_(c.valor);
    var nome = (cod ? cod + ' ' : '') + desc + ' - ' + forn + (valor ? ' - ' + valor : '');
    var chave = vd_semAcento_(cod || desc);
    if (chave && existentes.some(function (e) { return vd_casaItem_(e, chave); })) return;
    posMax[cl.id] += 16384;
    var payload = { name: nome, pos: posMax[cl.id] };
    var due = c.previsao ? vd_dataBR_(c.previsao) : (c.dias !== undefined && c.dias !== '' ? vd_dataMaisDias_(c.dias) : '');
    if (due) payload.due = due;
    lote.push({ caminho: '/checklists/' + cl.id + '/checkItems', opts: { method: 'post', payload: payload } });
    existentes.push(vd_semAcento_(nome));
    n++;
  });
  if (lote.length) vd_apiLote_(lote, token);
  return n;
}

// FormularioServidor.gs:1089
function vdf_pecaDoTexto_(texto, chaves) {
  /* 17/10/2026 (teste das cópias, BDD2J09): casava pela PRIMEIRA peça cujo código aparecia DENTRO do texto — o código
   * "0000001" casava com a linha de "00000014 PARABARRO" e a cotação ia para a peça errada. Agora: código inteiro (separado
   * por espaço/pontuação) ganha; entre vários, o mais longo; só depois código dentro do texto e, por fim, a descrição. */
  var alvo = vd_semAcento_(texto).replace(/\s+/g, ' ').trim(), melhor = null, nivel = 0;
  var esc = function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  for (var i = 0; i < chaves.length; i++) {
    var k = chaves[i], n = 0, tam = 0;
    if (k.cod && k.cod.length >= 4) {
      if (new RegExp('(^|[^A-Z0-9])' + esc(k.cod) + '($|[^A-Z0-9])').test(alvo)) { n = 3; tam = k.cod.length; }
      else if (alvo.indexOf(k.cod) >= 0) { n = 2; tam = k.cod.length; }
    } else if (!k.cod && k.desc && (alvo === k.desc || alvo.indexOf(k.desc) >= 0)) { n = 1; tam = k.desc.length; }
    if (n > nivel || (n && n === nivel && tam > melhor.tam)) { nivel = n; melhor = { k: k, tam: tam }; }
  }
  return melhor ? melhor.k : null;
}

// FormularioServidor.gs:1105
function vdf_chavesPecas_(pecas) {
  return (pecas || []).map(function (p) { return { chave: vd_chavePeca_(p), desc: vd_semAcento_(p.pneu ? 'PNEU ' + p.medida : p.descricao).replace(/\s+/g, ' ').trim(), cod: vd_semAcento_(String(p.codigo || '').replace(/\s+/g, '')) }; });
}

// FormularioServidor.gs:1110
function vdf_lerRemocao_(l, chaves) {
  var m = l.match(VDF_RX_REMOVE);
  if (!m) return null;
  var k = vdf_pecaDoTexto_(m[3], chaves);
  return { tipo: /^REM/i.test(m[1]) ? 'REMOVIDA' : 'INDISPONIVEL', forn: m[2].trim().toUpperCase(), chave: k ? k.chave : '', valor: vd_valorNum_(m[4]), motivo: (m[5] || '').trim() };
}

// FormularioServidor.gs:1118
function vdf_linkCot_(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (!/^https?:\/\/\S+$/i.test(s) || /[\s<>]/.test(s)) return null;
  s = vdf_encurtarLink_(s).replace(/\(/g, '%28').replace(/\)/g, '%29');   // parênteses quebrariam o [🔗 link](url) da descrição
  return s.length > 1500 ? null : s;
}

// FormularioServidor.gs:1129
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

// FormularioServidor.gs:1142
function vdf_tirarLinkCot_(l) {
  var m = l.match(/^(.*?)\s+-\s+(?:\[[^\]]*\]\()?(https?:\/\/[^\s)]+)\)?\s*$/i);
  var r = m ? { linha: m[1], link: m[2], nota: '' } : { linha: l, link: '', nota: '' };
  // 26/10/2026: "- 📝 texto" = obs. do comprador nesta cotação (fica entre o prazo e o link)
  var n = r.linha.match(/^(.*?)\s+-\s+📝\s*(.*)$/);
  if (n) { r.linha = n[1]; r.nota = n[2].trim(); }
  // 27/10/2026 (Weslley, kit): "- 🧩 KIT <id> R$ <total do kit> (<n> peças)" = esta cotação faz parte de um kit (valor da linha = parte rateada)
  var k = r.linha.match(/^(.*?)\s+-\s+🧩\s*KIT\s+([A-Z0-9]{2,10})\s+R?\$?\s*([\d.]+(?:,\d{1,2})?)\s*\((\d+)\s*PE[ÇC]AS?\)\s*$/i);
  if (k) { r.linha = k[1]; r.kit = { id: k[2].toUpperCase(), total: vd_valorNum_(k[3]), n: +k[4] }; }
  return r;
}

// FormularioServidor.gs:1154
function vdf_notaCot_(s) {
  return String(s || '').replace(/\s*\n\s*/g, ' ').replace(/https?:\/\/\S+/gi, '').replace(/\*\*|__|\[|\]/g, '').replace(/📝/g, '').replace(/\s{2,}/g, ' ').trim().slice(0, 200);
}

// FormularioServidor.gs:1158
function vd_cotacoesDaDescricao_(desc, pecas) {
  var out = { cotacoes: [], nt: [], obs: [], semCot: [] };
  var resto = vd_dividir_(desc).resto;
  if (!resto) return out;
  var chaves = (pecas || []).map(function (p) { return { chave: vd_chavePeca_(p), desc: vd_semAcento_(p.pneu ? 'PNEU ' + p.medida : p.descricao).replace(/\s+/g, ' ').trim(), cod: vd_semAcento_(String(p.codigo || '').replace(/\s+/g, '')) }; });
  var forn = '', obs = '';
  /* 16/10/2026 (Weslley, ARW5715): bloco "RECOTAÇÃO" = a cotação autorizada ficou indisponível na compra e o comprador já trouxe
   * outra. As cotações desse bloco saem marcadas (nova = {no: cotação que caiu, motivo, quem, data}) para a autorização mostrar. */
  var recot = null, caiu = {};
  resto.split('\n').slice(1).forEach(function (raw) {
    var l = vd_limpar_(raw).trim();
    if (!l) return;
    var mrc = l.match(/^RECOTA[ÇC][ÃA]O\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*-?\s*(.*)$/i);
    if (mrc) { recot = { data: mrc[1], quem: mrc[2].trim() }; caiu = {}; forn = ''; return; }
    if (/^COTA[ÇC][ÃA]O\s+\d{1,2}\/\d{1,2}/i.test(l) || /^AUTORIZA[ÇC][ÃA]O\s+\d{1,2}\/\d{1,2}/i.test(l) || /^DEVOLVIDA PARA COTA/i.test(l)) { recot = null; caiu = {}; }
    // cotação removida pelo cotador / indisponível na hora da compra: sai da lista (a mais recente igual)
    var rm = vdf_lerRemocao_(l, chaves);
    if (rm) {
      if (rm.chave) {
        for (var ir = out.cotacoes.length - 1; ir >= 0; ir--) {
          var q0 = out.cotacoes[ir];
          if (q0.chave === rm.chave && q0.fornecedor === rm.forn && Math.abs(q0.valor - rm.valor) < 0.005) { out.cotacoes.splice(ir, 1); break; }
        }
        if (rm.tipo === 'INDISPONIVEL') {
          out.obs.push({ chave: rm.chave, texto: '(indisponível) ' + rm.forn + ' ' + vd_valorBR_(rm.valor) + (rm.motivo ? ': ' + rm.motivo : '') });
          if (recot) caiu[rm.chave] = { no: rm.forn + ' ' + vd_valorBR_(rm.valor), motivo: rm.motivo, quem: recot.quem, data: recot.data };
        }
      }
      forn = '';
      return;
    }
    if (/^COMPRAD[OA]\s*:/i.test(l) || /^AUTORIZAD[OA]\s*:/i.test(l) || /^(RE)?COTA[ÇC][ÃA]O\s+\d{1,2}\/\d{1,2}/i.test(l) || /^AUTORIZA[ÇC][ÃA]O\s+\d{1,2}\/\d{1,2}/i.test(l) || /^DEVOLVIDA PARA COTA/i.test(l) || /^MANTIDA\s*\(comprada\)/i.test(l) || /^OBS GERAL\s*:/i.test(l) || /^\(texto que estava/i.test(l)) { if (/^(AUTORIZA|DEVOLVIDA)/i.test(l)) forn = ''; return; }
    /* SEM COTAÇÃO <peça>: motivo — comprador justificou por que não cotou a peça */
    var ms = l.match(/^SEM COTA[ÇC][ÃA]O\s+(.+?)\s*:\s*(.+)$/i);
    if (ms) {
      var alvoS = vd_semAcento_(ms[1]).replace(/\s+/g, ' ').trim();
      var ks = vdf_pecaDoTexto_(alvoS, chaves);
      if (ks) out.semCot.push({ chave: ks.chave, texto: ms[2].trim() });
      return;
    }
    var mo = l.match(/^OBS\s+(.+?)\s*:\s*(.+)$/i);
    if (mo) {
      var alvoO = vd_semAcento_(mo[1]).replace(/\s+/g, ' ').trim(), pecaO = null;
      pecaO = vdf_pecaDoTexto_(alvoO, chaves);
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
    if (!peca) peca = vdf_pecaDoTexto_(alvo, chaves);
    if (!peca) return;
    var tm = String(m[2] || '').trim().toUpperCase();
    var tipo = '', marca = tm;
    var mt = tm.match(/^(GENU[IÍ]NO|ORIGINAL|PARALEL[OA]|USAD[OA])\b\s*(.*)$/i);
    if (mt) { tipo = vd_tipoNorm_(mt[1]); marca = mt[2].trim(); }
    var qn = { chave: peca.chave, fornecedor: forn, obs: obs, tipo: tipo, marca: marca, valor: vd_valorNum_(m[3]), dias: m[4] !== undefined ? +m[4] : '', data: m[5] || '', link: tl.link, nota: tl.nota || '' };
    if (tl.kit) qn.kit = tl.kit;
    if (recot && caiu[peca.chave]) qn.nova = caiu[peca.chave];
    // 19/10/2026 (revisão, ZZT9C01): cotação nova igual a uma que já está no card (mesmo fornecedor, tipo, marca, valor e prazo)
    // fica numa linha só — a mais nova, com a marca de "cotação nova"; antes aparecia duas vezes e ia para o "também cotado"
    if (vd_ajustes1910_()) {
      for (var id = out.cotacoes.length - 1; id >= 0; id--) {
        var qd = out.cotacoes[id];
        if (qd.chave === qn.chave && qd.fornecedor === qn.fornecedor && Math.abs(qd.valor - qn.valor) < 0.005 && (qd.tipo || '') === (qn.tipo || '') && (qd.marca || '') === (qn.marca || '') && String(qd.dias) === String(qn.dias) && ((qd.kit || {}).id || '') === ((qn.kit || {}).id || '')) { if (!qn.link && qd.link) qn.link = qd.link; out.cotacoes.splice(id, 1); }
      }
    }
    out.cotacoes.push(qn);
    // 10/10/2026 (revisão): "SEM COTAÇÃO" de bloco anterior cai quando a peça ganha cotação depois — senão a justificativa velha
    // deixava a peça autorizada passar no "Enviar compra" sem compra (vdf_salvarCompra trata naoCotadas como "não espera compra")
    out.semCot = out.semCot.filter(function (s) { return s.chave !== peca.chave; });
  });
  return out;
}

// FormularioServidor.gs:1252
function vdf_nomeLista_(ctx, id) {
  var n = '';
  Object.keys(ctx.listas).forEach(function (k) { if (ctx.listas[k] === id) n = k; });
  return n;
}

// FormularioServidor.gs:1258
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

// FormularioServidor.gs:1272
function vdf_linkComprador_(card, ctx, token, anexos) {
  try {
    var ans = anexos || vd_api_('/cards/' + card.id + '/attachments', { query: { fields: 'name,url' } });
    if (ans.some(function (a) { return VD_LINK.RX_COMPRA.test(a.name || ''); })) return;
    vd_api_('/cards/' + card.id + '/attachments', { method: 'post', payload: { url: ctx.urlForm + '?card=' + card.shortLink + '&modo=compras', name: VD_LINK.COMPRA, setCover: false } }, token);
  } catch (e) {}
}

// FormularioServidor.gs:1290
function vdf_salvarCotacao(token, p) {
  var cods = (p && p.codigos) || [];
  if (!cods.length) return vdf_salvarCotacaoBase_(token, p);
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) corrige o código na cotação — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl', checklists: 'all', checkItem_fields: 'name' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var an0 = vd_analisar_(card.desc, card.name);
  var v = vdf_validarCodigos_(p.codigos, card, an0);
  if (v.faltas.length) return { ok: false, faltas: v.faltas };
  var q = {}; Object.keys(p).forEach(function (k) { if (k !== 'codigos') q[k] = p[k]; });
  var soCodigo = !(q.cotacoes || []).length && !(q.nt || []).length && !(q.obs || []).length && !(q.semCot || []).length && !(q.remover || []).length && !(q.anexos || []).length;
  var r;
  // só código no "Salvar parcial": não passa pela cotação (lá daria "Nada novo para salvar"); no "Enviar" a cotação confere a cobertura como sempre
  if (soCodigo && q.parcial) r = { ok: true, parcial: true, soCodigo: true, url: card.shortUrl, nome: card.name, lista: vdf_nomeLista_(vd_contexto_(), card.idList), n: 0, obs: 0, faltam: (function () { try { return vdf_coberturaCotacao_(card.desc, an0.pecas).faltam; } catch (e) { return []; } })(), semCot: 0 };
  else { r = vdf_salvarCotacaoBase_(token, q); if (!r || !r.ok) return r; }
  var t = vdf_trocarCodigosCard_(token, me, p.shortLink, v.trocas);
  r.codigos = t.n; r.codigosTxt = t.txt;
  return r;
}

// FormularioServidor.gs:1313
function vdf_codigoLimpo_(s) {
  var c = String(s || '').replace(/\s+/g, '').toUpperCase();
  return /^[A-Z0-9][A-Z0-9.\-\/]{3,39}$/.test(c) && /\d/.test(c) ? c : '';
}

// FormularioServidor.gs:1318
function vdf_validarCodigos_(lista, card, an) {
  var faltas = [], trocas = [];
  var porChave = {}; an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var pagas = [];
  (card.checklists || []).forEach(function (k) { if (/^PAGAS/i.test(String(k.name || '').trim())) (k.checkItems || []).forEach(function (i) { pagas.push(vd_semAcento_(i.name)); }); });
  var compras = []; try { compras = vd_comprasDaDescricao_(card.desc); } catch (e) {}
  var usados = {}; an.pecas.forEach(function (x) { var c = vd_semAcento_(String(x.codigo || '').replace(/\s+/g, '')); if (c) usados[c] = vd_chavePeca_(x); });
  (lista || []).forEach(function (x) {
    var peca = porChave[x && x.chave];
    if (!peca) return faltas.push('Peça não encontrada no pedido (' + String((x && x.chave) || '?') + ') — abra o card de novo.');
    var nome = vd_nomePeca_(peca), ch = vd_chavePeca_(peca);
    if (peca.pneu) return faltas.push(nome + ': pneu não tem código para corrigir.');
    var novo = vdf_codigoLimpo_(x.codigo);
    if (!novo) return faltas.push(nome + ': código novo inválido — use só letras, números, ponto, traço ou barra (mín. 4, com número).');
    var antigo = String(peca.codigo || '').replace(/\s+/g, '').toUpperCase();
    if (novo === antigo) return;
    if (usados[vd_semAcento_(novo)] && usados[vd_semAcento_(novo)] !== ch) return faltas.push(nome + ': o código ' + novo + ' já é de outra peça do card.');
    var comprada = pagas.some(function (n) { return vd_casaItem_(n, ch); })
      || compras.some(function (c) { var ck = vd_semAcento_(String(c.codigo || '').replace(/\s+/g, '') || c.descricao || ''); return ck && ck === ch; });
    if (comprada) return faltas.push(nome + ': já comprada — o código não muda mais pela cotação (fale com a diretoria).');
    trocas.push({ chave: ch, antigo: antigo, codigo: novo });
  });
  return { faltas: faltas, trocas: trocas };
}

// FormularioServidor.gs:1343
function vdf_trocarCodigosCard_(token, me, shortLink, trocas) {
  if (!trocas || !trocas.length) return { n: 0, txt: [] };
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc,shortLink,shortUrl,idList' } });
  var an = vd_analisar_(card.desc, card.name);
  var chaves = vdf_chavesPecas_(an.pecas);
  var div = vd_dividir_(card.desc), bloco = div.bloco, resto = div.temMarcador ? div.resto : VD.MARCADOR;
  var feitas = [], pares = [], escRx = function (s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  trocas.forEach(function (t) {
    var peca = an.pecas.filter(function (x) { return vd_chavePeca_(x) === t.chave; })[0];
    if (!peca) return;
    var nova = JSON.parse(JSON.stringify(peca)); nova.codigo = t.codigo; if (nova.acessorio) nova.acessorio = false;
    var linhaNova = vd_linhaPeca_(nova, 0).replace(/^1\. /, ''), achou = false, sigNova = '';
    bloco = bloco.split('\n').map(function (l) {
      if (achou || vd_sigItem_(l) !== peca.sig) return l;
      achou = true;
      var mNum = l.match(/^(\s*\d+\s*[.)\-]\s*)/), nl = (mNum ? mNum[1].replace(/\s+$/, ' ') : '') + linhaNova;
      sigNova = vd_sigItem_(nl);
      return nl;
    }).join('\n');
    if (!achou) return;
    // linhas abaixo do marcador que são desta peça (pelo código/descrição antigos): o código antigo vira o novo; sem código, o novo entra antes da descrição
    var descU = String(peca.descricao || '').trim().toUpperCase();
    resto = resto.split('\n').map(function (raw, i) {
      if (i === 0) return raw;
      var l = vd_limpar_(raw).trim(); if (!l) return raw;
      var k = vdf_pecaDoTexto_(l, chaves); if (!k || k.chave !== t.chave) return raw;
      if (t.antigo) return raw.replace(new RegExp('(^|[^A-Z0-9])' + escRx(t.antigo) + '(?![A-Z0-9])', 'i'), '$1' + t.codigo);
      var ix = raw.toUpperCase().indexOf(descU);
      return ix >= 0 && descU ? raw.slice(0, ix) + t.codigo + ' ' + raw.slice(ix) : raw;
    }).join('\n');
    feitas.push({ peca: peca, nova: nova, antigo: t.antigo, codigo: t.codigo });
    if (sigNova) pares.push({ antes: peca.sig, depois: sigNova });
  });
  if (!feitas.length) return { n: 0, txt: [] };
  vd_backup_(card, 'código corrigido na cotação por ' + me.username);
  vd_gravarDesc_(card.id, bloco.replace(/\s+$/, '') + '\n\n' + resto.replace(/^\s+/, ''), token);
  // base de "peça nova": a assinatura antiga dá lugar à nova (peça que ainda não estava na base continua fora dela)
  try {
    var props = PropertiesService.getScriptProperties(), kPk = 'VD_PK2_' + card.id, bt = props.getProperty(kPk);
    if (bt !== null) {
      var base = JSON.parse(bt).map(vd_pkH_), mudou = false;
      pares.forEach(function (x) { var i = base.indexOf(vd_pkH_(x.antes)); if (i >= 0) { base[i] = vd_pkH_(x.depois); mudou = true; } });
      if (mudou) props.setProperty(kPk, JSON.stringify(base));
    }
  } catch (e) { console.log('código corrigido/base: ' + e); }
  var txt = feitas.map(function (f) { return String(f.peca.descricao || '').toUpperCase() + ': ' + (f.antigo || 'sem código') + ' → ' + f.codigo; });
  try { ev_registrar_('CÓDIGO CORRIGIDO', card, me.username, feitas.map(function (f) { var e = ev_peca_(f.nova); e.detalhe = 'código ' + (f.antigo || '(sem)') + ' → ' + f.codigo + ' (cotação)'; return e; })); } catch (e) {}
  try {
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🔁 **CÓDIGO CORRIGIDO NA COTAÇÃO** — ' + me.fullName + '\n' + txt.map(function (s) { return '- ' + s; }).join('\n') + '\nAs cotações e a autorização desta peça seguem o código novo.' } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { n: feitas.length, txt: txt };
}

// FormularioServidor.gs:1403
function vdf_kitRateio_(total, pecas) {
  var qs = pecas.map(function (p) { return vd_qtdNum_(p.qtd); });
  var orc = pecas.map(function (p) { var v = vd_valorNum_(vd_valorOrcTxt_(p.valorOrc)); return isNaN(v) ? 0 : v; });
  var porOrc = orc.every(function (v) { return v > 0; });
  var pesos = pecas.map(function (p, i) { return porOrc ? orc[i] * qs[i] : qs[i]; });
  var soma = pesos.reduce(function (a, b) { return a + b; }, 0) || 1;
  var cent = Math.round(total * 100), usados = 0;
  var unit = pecas.map(function (p, i) {
    var parte = i === pecas.length - 1 ? cent - usados : Math.round(cent * pesos[i] / soma);
    var u = Math.round(parte / qs[i]);   // valor da linha é o da unidade
    usados += u * qs[i];
    return u / 100;
  });
  return { unit: unit, criterio: porOrc ? 'orçamento' : 'partes iguais' };
}

// FormularioServidor.gs:1418
function vdf_kitExpandir_(k, porChave, foNome, auts, idsUsados, i) {
  var faltas = [], rot = 'kit ' + (i + 1);
  var chaves = (k && k.chaves || []).filter(function (c, j, a) { return c && a.indexOf(c) === j; });
  var pecas = chaves.map(function (c) { return porChave[c]; });
  if (chaves.length < 2) faltas.push(rot + ': escolha pelo menos 2 peças do pedido');
  if (pecas.some(function (x) { return !x; })) faltas.push(rot + ': peça não encontrada no pedido — abra o card de novo');
  var forn = foNome(k && k.fornecedor), valor = vd_valorNum_(k && k.valor), dias = String(k && k.dias == null ? '' : k.dias).trim();
  if (!forn) faltas.push(rot + ': falta o fornecedor');
  if (isNaN(valor) || valor <= 0) faltas.push(rot + ': valor do kit inválido');
  if (dias !== '' && !/^\d+$/.test(dias)) faltas.push(rot + ': prazo em dias úteis (número)');
  pecas.forEach(function (x) {
    if (!x) return;
    if (x.pneu) faltas.push(rot + ': pneu não entra em kit');
    if ((auts || []).some(function (a) { return a.chave === vd_chavePeca_(x); })) faltas.push(rot + ': ' + vd_nomePeca_(x) + ' já está autorizada — kit só com peças ainda não autorizadas');
  });
  if (faltas.length) return { faltas: faltas, cots: [] };
  var id; do { id = 'K' + Math.floor(Math.random() * 1679616).toString(36).toUpperCase(); } while (idsUsados[id]);
  idsUsados[id] = 1;
  var rt = vdf_kitRateio_(valor, pecas), tipo = vd_tipoNorm_(k.tipo || '') || '', marca = String(k.marca || '').trim().toUpperCase();
  var kit = { id: id, total: Math.round(valor * 100) / 100, n: pecas.length };
  return { faltas: [], cots: pecas.map(function (x, j) {
    return { peca: x, fornecedor: forn, tipo: tipo, marca: marca, valor: rt.unit[j], dias: dias, link: vdf_linkCot_(k.link) || '', nota: vdf_notaCot_(k.nota), kit: kit };
  }) };
}

// FormularioServidor.gs:1444
function vdf_kitConferirAutorizacao_(escolhas, lidas, autsAntes, porChave, naoComprar) {
  var kitDe = function (ch, forn, valor) { var q = lidas.filter(function (x) { return x.chave === ch && x.fornecedor === forn && Math.abs(x.valor - valor) < 0.005; })[0]; return q && q.kit ? q.kit.id : ''; };
  var final = {};
  (autsAntes || []).forEach(function (a) { final[a.chave] = kitDe(a.chave, a.fornecedor, +a.valor || 0); });
  escolhas.forEach(function (e) { if (porChave[e.chave]) final[e.chave] = kitDe(e.chave, String(e.fornecedor || '').trim().toUpperCase(), vd_valorNum_(e.valor)); });
  Object.keys(naoComprar || {}).forEach(function (ch) { final[ch] = null; });
  var faltas = [], vistos = {};
  Object.keys(final).forEach(function (ch) {
    var id = final[ch]; if (!id || vistos[id]) return; vistos[id] = 1;
    var membros = lidas.filter(function (q) { return q.kit && q.kit.id === id; }).map(function (q) { return q.chave; }).filter(function (c, j, a) { return a.indexOf(c) === j; });
    var fora = membros.filter(function (c) { return final[c] !== id; });
    if (fora.length) {
      var q0 = lidas.filter(function (q) { return q.kit && q.kit.id === id; })[0];
      faltas.push('Kit ' + q0.fornecedor + ' ' + vd_valorBR_(q0.kit.total) + ' cobre ' + membros.map(function (c) { return porChave[c] ? vd_nomePeca_(porChave[c]) : c; }).join(' + ') + ': autorize todas essas peças pelo kit, ou escolha outra cotação para cada uma.');
    }
  });
  return faltas;
}

// FormularioServidor.gs:1463
function vdf_salvarCotacaoBase_(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) lança cotação — sua conta: ' + me.username + '.'] };
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state' } });   // 27/10/2026: checklists para saber o que já foi comprado (quem decide)
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro — não recebe cotação nem compra.'] };
  var an = vd_analisar_(card.desc, card.name);
  var porChave = {};
  an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var faltas = [];
  var foLista = []; try { foLista = fo_lista_(); } catch (e) {}
  var foNome = function (x) { try { return fo_resolver_(x, foLista).nome || String(x || '').trim().toUpperCase(); } catch (e) { return String(x || '').trim().toUpperCase(); } };
  var cots = (p.cotacoes || []).map(function (c, i) {
    var peca = porChave[c.chave];
    var r = { peca: peca, fornecedor: foNome(c.fornecedor), tipo: vd_tipoNorm_(c.tipo || '') || '', marca: String(c.marca || '').trim().toUpperCase(), valor: vd_valorNum_(c.valor), dias: String(c.dias == null ? '' : c.dias).trim(), link: vdf_linkCot_(c.link), nota: vdf_notaCot_(c.nota) };
    var rot = 'cotação ' + (i + 1) + (peca ? ' (' + vd_nomePeca_(peca) + ')' : '');
    if (!peca) faltas.push(rot + ': peça não encontrada no pedido');
    if (!r.fornecedor) faltas.push(rot + ': falta o fornecedor');
    if (isNaN(r.valor) || r.valor <= 0) faltas.push(rot + ': valor inválido');
    if (r.dias !== '' && !/^\d+$/.test(r.dias)) faltas.push(rot + ': prazo em dias úteis (número)');
    if (r.tipo && r.tipo.charAt(0) === '?') faltas.push(rot + ': tipo inválido');
    if (r.link === null) faltas.push(rot + ': link inválido — cole o endereço completo, começando com http (ou deixe vazio)');
    return r;
  });
  // 27/10/2026 (Weslley): cotação de KIT — um preço para várias peças; vira uma linha por peça com o valor rateado
  if ((p.kits || []).length) {
    var autsK = []; try { autsK = vd_autorizacoesDaDescricao_(card.desc, an.pecas); } catch (e) {}
    var idsUsados = {}; try { vd_cotacoesDaDescricao_(card.desc, an.pecas).cotacoes.forEach(function (q) { if (q.kit) idsUsados[q.kit.id] = 1; }); } catch (e) {}
    (p.kits || []).forEach(function (k, i) {
      var ex = vdf_kitExpandir_(k, porChave, foNome, autsK, idsUsados, i);
      faltas = faltas.concat(ex.faltas);
      cots = cots.concat(ex.cots);
    });
  }
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
  var arqsCot = (p.anexos || []).filter(function (a) { return a && a.fileId; }).map(function (a) { return { fileId: a.fileId, nome: a.nome, forn: foNome(a.forn || ''), peca: porChave[a.chave] ? vd_nomePeca_(porChave[a.chave]) : '' }; });   // 23/10/2026: print/foto/PDF da cotação (por peça / por cotação / geral)
  if (nada && parcial && !arqsCot.length) faltas.push('Nada novo para salvar.');
  if (faltas.length) return { ok: false, faltas: faltas };
  /* 07/10/2026 (Weslley): cotação lançada em peça JÁ AUTORIZADA (ou comprada) é só de registro — fica na descrição e na
   * vitrine ("📝 também cotado"), mas não mexe na autorização, não move o card e não menciona ninguém. Vale quando toda
   * cotação deste envio é de peça autorizada e não há peça nova sem cotação / remoção junto. Para trocar o fornecedor
   * autorizado, o caminho continua sendo "cotação indisponível" na aba Compra. */
  // (revisão 07/10/2026) vale também no "Salvar parcial": cotação só de registro nunca move o card nem põe etiqueta
  /* 23/10/2026 (Weslley, MVU1552): compra cancelada → o comprador lança cotação nova e a tela pergunta se é só registro ou se
   * precisa de NOVA AUTORIZAÇÃO. p.reautorizar = [chaves]: a cotação autorizada dessas peças é cancelada (linha INDISPONÍVEL,
   * como a "cotação indisponível" da aba Compra) e o card volta para o autorizador. Só no "Enviar"; peça já comprada não entra. */
  var reaut = {}; var pagosR = [];
  if (!parcial && (p.reautorizar || []).length) {
    try { (vd_api_('/cards/' + card.id + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name' } }) || []).forEach(function (k) { if (/^PAGAS/i.test(String(k.name || '').trim())) (k.checkItems || []).forEach(function (i) { pagosR.push(vd_semAcento_(i.name)); }); }); } catch (e) {}
    (p.reautorizar || []).forEach(function (ch) {
      if (!porChave[ch] || !autsAntes.some(function (a) { return a.chave === ch; })) return;
      if (pagosR.some(function (n) { return n.indexOf(ch) >= 0; })) return;   // comprada: a compra tem de ser cancelada antes
      if (!cots.some(function (c) { return vd_chavePeca_(c.peca) === ch; })) return;   // só com cotação nova nesta gravação
      reaut[ch] = autsAntes.filter(function (a) { return a.chave === ch; })[0];
    });
  }
  var temReaut = Object.keys(reaut).length > 0;
  var registro = cots.length > 0 && !rem.length && !semCot.length && !temReaut
    && cots.every(function (c) { return autsAntes.some(function (a) { return a.chave === vd_chavePeca_(c.peca); }); });
  if (registro) parcial = false;
  // 10/10/2026 (revisão): "Enviar cotação" em card em FALTA DADOS pulava a validação do pedido (chassi/ano/tipo nunca mais
  // eram cobrados). Salvar parcial continua valendo; enviar só depois de o card estar completo.
  if (!parcial && !registro && vdf_nomeLista_(ctx, card.idList) === VD.LISTA_FALTA) return { ok: false, faltas: ['O card está em FALTA DADOS: corrija o pedido pelo ✏️ Editar peças (o card vai para EM COTAÇÃO sozinho) antes de enviar a cotação. Enquanto isso, use "Salvar parcial".'] };
  // 23/10/2026: só arquivo da cotação, sem cotação nova — anexa e pronto (o card não muda de coluna nem de etiqueta)
  if (nada && arqsCot.length) {
    var axSo = { anexados: [], repetidos: [] };
    try { axSo = vdf_anexarCompra_(card, arqsCot, token, AX.COT); } catch (e) { console.log('cotação/anexos: ' + e); }
    try { vd_marcar_(card); } catch (e) {}
    return { ok: true, parcial: true, soAnexos: true, url: card.shortUrl, nome: card.name, lista: vdf_nomeLista_(ctx, card.idList), n: 0, obs: 0, faltam: [], semCot: 0, anexos: axSo.anexados.length, repetidos: axSo.repetidos };
  }
  var novaDesc = card.desc;
  if (!nada) novaDesc = vdf_descComCotacao_(card, an, me, cots, nt, obs, semCot, rem);
  var linhasReaut = [];
  if (temReaut) {
    Object.keys(reaut).forEach(function (ch) {
      var a0 = reaut[ch], pc = porChave[ch], nomeP = pc.pneu ? 'PNEU ' + String(pc.medida || '').replace(/\s+/g, '') : vd_nomePeca_(pc);
      linhasReaut.push('INDISPONÍVEL: ' + a0.fornecedor + ' - ' + nomeP + ' - ' + vd_valorBR_(a0.valor) + ' - nova cotação pelo comprador, autorizar de novo');
    });
    novaDesc = novaDesc.replace(/\s+$/, '') + '\n\n**RECOTAÇÃO ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy') + ' - ' + me.fullName + '**\n' + linhasReaut.join('\n');
  }
  // enviar: toda peça precisa de cotação OU de justificativa para não cotar (salvar parcial não exige)
  var cobPrev = vdf_coberturaCotacao_(novaDesc, an.pecas);
  if (!parcial && !registro && cobPrev.faltam.length) return { ok: false, faltas: cobPrev.faltam.map(function (n) { return n + ': sem cotação — lance a cotação, escreva o motivo de não cotar, ou use "Salvar parcial"'; }) };
  if (!nada) {
    vd_backup_(card, 'cotação ' + (parcial ? 'parcial ' : registro ? 'de registro ' : '') + 'lançada pelo formulário por ' + me.username);
    vd_gravarDesc_(card.id, novaDesc, token);
    try { fo_registrarUso_(cots.map(function (c) { return c.fornecedor; }).concat(nt), me.username); } catch (e) {}
    try {
      if (temReaut) try { ev_registrar_('COTAÇÃO INDISPONÍVEL', card, me.username, Object.keys(reaut).map(function (ch) { var e = ev_peca_(porChave[ch]); e.fornecedor = reaut[ch].fornecedor; e.valor = reaut[ch].valor; e.detalhe = 'nova cotação pelo comprador — autorizar de novo'; return e; })); } catch (e2) {}
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
  // 27/10/2026 (Weslley, FOB8723): quem decide é definido pelas peças que AINDA esperam decisão (sem 🚫, sem autorização, fora
  // do PAGAS) — peça da seguradora já comprada não manda o card para a diretoria por causa de uma particular nova
  var pendDec = [];
  try { pendDec = vdf_pecasAguardandoDecisao_(card, an, autsAntes.filter(function (a) { return !reaut[a.chave]; })); } catch (e) { pendDec = []; }
  var baseQuem = pendDec.length ? pendDec : an.pecas;
  var particular = baseQuem.length ? baseQuem.every(function (x) { return vdf_pecaParticular_(x, card, an); }) : vdf_ehParticular_(card, an);
  var misto = !particular && baseQuem.some(function (x) { return x.particular; });
  var movido = '';
  if (!registro) {
    // 26/10/2026 (Weslley, TCL9H02): "Salvar parcial" com o card em FALTA DADOS guarda a cotação mas NÃO tira o card de lá —
    // ele ia para EM COTAÇÃO com o pedido incompleto (o robô devolvia logo depois). Sai de FALTA DADOS só quando o pedido completar.
    var emFalta = vdf_nomeLista_(ctx, card.idList) === VD.LISTA_FALTA;
    if (!(emFalta && (parcial || cob.faltam.length))) {
      try { movido = vdf_moverPara_(card, ctx, parcial || cob.faltam.length ? VD.LISTA_COTACAO : (particular ? VDF_LISTA_FINALIZADA : VDF_LISTA_PENDENTE), token, me.username); } catch (e) {}
    }
    try { vdf_etiquetaParcial_(card, parcial || cob.faltam.length > 0, token); } catch (e) {}
  }
  var nPc = Object.keys(cots.reduce(function (a, c) { a[c.chave || vd_chavePeca_(c.peca)] = 1; return a; }, {})).length;
  // 23/10/2026 (comprador): print/foto/PDF da cotação anexado ao card como "💬 COTAÇÃO · PLACA · FORN · dd/MM" (repetido não sobe)
  var axCot = { anexados: [], repetidos: [] };
  if (arqsCot.length) { try { axCot = vdf_anexarCompra_(card, arqsCot, token, AX.COT); } catch (e) { console.log('cotação/anexos: ' + e); } }
  var txtAxCot = (axCot.anexados.length ? '\n📎 Cotação: ' + axCot.anexados.join(' · ') : '') + (axCot.repetidos.length ? '\n🗑️ Não anexado (repetido): ' + axCot.repetidos.join(' · ') : '');
  if (registro) {
    try {
      vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '📝 **COTAÇÃO DE REGISTRO** — ' + me.fullName + ' · ' + cots.length + ' cotação(ões) em ' + nPc + ' peça(s) já autorizada(s): a autorização e a coluna não mudam. Para trocar o fornecedor autorizado, use "cotação indisponível" na aba Compra.' } }, token);
    } catch (e) {}
    try { vd_marcar_(card); } catch (e) {}
    return { ok: true, registro: true, url: card.shortUrl, nome: card.name, lista: vdf_nomeLista_(ctx, card.idList), n: cots.length, obs: obs.length, faltam: [], semCot: 0 };
  }
  if (parcial) {
    // salva aos poucos: NÃO comenta no card (21/10/2026, Weslley: "aviso nenhum de cotação parcial, tá tumultuando") —
    // o card não anda e o comprador vê a situação no próprio formulário; o aviso sai só no "Enviar cotação".
    try { vd_marcar_(card); } catch (e) {}
    return { ok: true, parcial: true, url: card.shortUrl, nome: card.name, lista: movido || vdf_nomeLista_(ctx, card.idList), n: cots.length, obs: obs.length, faltam: cob.faltam, semCot: cob.semCot.length, anexos: axCot.anexados.length, repetidos: axCot.repetidos };
  }
  try {
    // menciona o setor de compras (quem cuida do card daqui em diante), não o consultor (05/10/2026, Weslley);
    // o consultor só é mencionado quando é ele quem autoriza (pedido particular / peças particulares dele)
    var compr = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).toLowerCase().split(/[,;\s]+/).filter(function (u) { return u && u !== String(me.username).toLowerCase(); })[0] || '';   // 1º da lista (comprasunity), como no AUTORIZADO
    var quem = particular ? vd_criador_(card.id) : '';
    var eqC = vdf_equipeDoCard_(card), temPartC = particular || an.pecas.some(function (x) { return x.particular; });
    var mencoes = [compr].concat(temPartC && eqC.length ? eqC : [quem].concat(an.pecas.map(function (x) { return x.partPor; }))).filter(function (u, i, a) { return u && u !== String(me.username).toLowerCase() && a.indexOf(u) === i; });
    var txt = vdf_mencao_(mencoes) + '💰 **COTAÇÃO** — ' + me.fullName + ' · ' + (nada ? 'enviada (salva antes aos poucos)' : cots.length + ' cotação(ões) em ' + nPc + ' peça(s)' + (nt.length ? ' · ' + nt.length + ' NT' : '')) + (movido ? ' → **' + movido + '**' : '');
    if (cob.faltam.length) txt += '\n⏳ **PARCIAL** — falta cotar ou justificar: ' + cob.faltam.join(', ');
    else if (cob.semCot.length) txt += '\n⛔ **NÃO COTADAS:** ' + cob.semCot.map(function (s) { return s.nome + ' (' + s.texto + ')'; }).join('; ');
    if (misto && !cob.faltam.length) txt += '\n👤 Particulares: autoriza o consultor pela aba Autorizar.';
    if (temReaut) txt += '\n🔁 **Nova autorização necessária** — autorização anterior cancelada: ' + Object.keys(reaut).map(function (ch) { var a0 = reaut[ch]; return vd_nomePeca_(porChave[ch]) + ' (' + a0.fornecedor + ' ' + vd_valorBR_(a0.valor) + ')'; }).join('; ') + '. Autorizar de novo pela aba ✅ Autorizar.';
    txt += txtAxCot;
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, lista: movido || vdf_nomeLista_(ctx, card.idList), n: cots.length, obs: obs.length, faltam: cob.faltam, semCot: cob.semCot.length, anexos: axCot.anexados.length, repetidos: axCot.repetidos };
}

// FormularioServidor.gs:1641
function vdf_descComCotacao_(card, an, me, cots, nt, obs, semCot, rem) {
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  var ordem = [], grupos = {};
  cots.forEach(function (c) {
    if (!grupos[c.fornecedor]) { grupos[c.fornecedor] = []; ordem.push(c.fornecedor); }
    var nomeP = c.peca.pneu ? 'PNEU ' + String(c.peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(c.peca);
    grupos[c.fornecedor].push(nomeP + (c.tipo || c.marca ? ' - ' + [c.tipo, c.marca].filter(String).join(' ') : '') + ' - ' + vd_valorBR_(c.valor) + (c.dias !== '' ? ' - ' + c.dias + (c.dias === '1' ? ' dia útil' : ' dias úteis') : '')
      + (c.kit ? ' - 🧩 KIT ' + c.kit.id + ' ' + vd_valorBR_(c.kit.total) + ' (' + c.kit.n + ' peças)' : '')   // 27/10/2026: parte de um kit (antes da obs.)
      + (c.nota ? ' - 📝 ' + c.nota : '')   // 26/10/2026: obs. do comprador nesta cotação (antes do link, que fica sempre no fim)
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

// FormularioServidor.gs:1665
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

// FormularioServidor.gs:1679
function vdf_etiquetaParcial_(card, por, token) {
  var id = pz_labelId_(card.idBoard, VDF_ETIQUETA_PARCIAL, 'orange');
  var tem = (card.labels || []).some(function (l) { return l.id === id; });
  if (por && !tem) vd_api_('/cards/' + card.id + '/idLabels', { method: 'post', payload: { value: id } }, token);
  if (!por && tem) vd_api_('/cards/' + card.id + '/idLabels/' + id, { method: 'delete' }, token);
}

// FormularioServidor.gs:1692
function vd_autorizacoesDaDescricao_(desc, pecas) {
  var resto = vd_dividir_(desc).resto;
  if (!resto) return [];
  var chaves = (pecas || []).map(function (p) { return { chave: vd_chavePeca_(p), desc: vd_semAcento_(p.pneu ? 'PNEU ' + p.medida : p.descricao).replace(/\s+/g, ' ').trim(), cod: vd_semAcento_(String(p.codigo || '').replace(/\s+/g, '')) }; });
  var porChave = {}, antes = {}, quem = '', quando = '';
  resto.split('\n').forEach(function (raw) {
    var l = vd_limpar_(raw).trim();
    var h = l.match(/^AUTORIZA[ÇC][ÃA]O\s+(\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+\d{1,2}:\d{2})?)\s+-\s+(.+)$/i);
    if (h) { quando = h[1]; quem = h[2].trim(); return; }
    if (/^DEVOLVIDA PARA COTA/i.test(l)) { antes = porChave; porChave = {}; return; }   // devolução anula autorizações anteriores…
    var mk = l.match(/^MANTIDA\s*\(comprada\)\s*:\s*(.+)$/i);   // …menos a das peças já compradas (14/10/2026)
    if (mk) { var kk = vd_semAcento_(mk[1]).replace(/\s+/g, ' ').trim(); if (antes[kk]) porChave[kk] = antes[kk]; return; }
    var rmA = vdf_lerRemocao_(l, chaves);
    if (rmA) { if (rmA.tipo === 'INDISPONIVEL' && rmA.chave && porChave[rmA.chave] && porChave[rmA.chave].fornecedor === rmA.forn) delete porChave[rmA.chave]; return; }
    var m = l.match(/^AUTORIZAD[OA]\s*:\s*(.+?)\s+-\s+(.+)\s+-\s+R?\$?\s*([\d.]+(?:,\d{1,2})?)\s*$/i);
    if (!m) return;
    var alvo = vd_semAcento_(m[2]).replace(/\s+/g, ' ').trim(), peca = null;
    peca = vdf_pecaDoTexto_(alvo, chaves);
    if (peca) porChave[peca.chave] = { chave: peca.chave, fornecedor: m[1].trim().toUpperCase(), valor: vd_valorNum_(m[3]), quem: quem, quando: quando };
  });
  return Object.keys(porChave).map(function (k) { return porChave[k]; });
}

// FormularioServidor.gs:1720
function vdf_mencao_(us) {
  if (vd_prop_('MENCAO_FLUXO', 'NAO') === 'NAO') return '';
  return (us || []).filter(function (u, i, a) { return u && a.indexOf(u) === i; }).map(function (u) { return '@' + u + ' '; }).join('');
}

// FormularioServidor.gs:1730
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
  // 21/10/2026 (Weslley): autorização reenviada repetia o aviso inteiro ("✅ AUTORIZADO" de novo, com menção ao comprador).
  // Agora, se a autorização do card já foi ENVIADA antes (marca VDF_AUT_ENV_), compara escolha por escolha com a anterior:
  // só o que mudou (nova / fornecedor ou valor trocado / obs / marca) entra na descrição e sai em "✏️ AUTORIZAÇÃO ALTERADA";
  // reenvio igual = uma linha "reenviada sem alteração", sem menção. A marca cai em "Devolver para cotação".
  var antesPorChave = {}; autsAntes.forEach(function (a) { antesPorChave[a.chave] = a; });
  var propsA = PropertiesService.getScriptProperties(), kEnv = 'VDF_AUT_ENV_' + card.id;
  var jaEnviada = !parcial && (!!propsA.getProperty(kEnv) || card.idList === ctx.listas[VDF_LISTA_AUTORIZADO]);   // card já em AUTORIZADO COMPRA também conta (cards de antes da marca)
  var novasA = [], trocadasA = [], iguaisA = [];
  (p.escolhas || []).forEach(function (e, i) {
    var peca = porChave[e.chave];
    if (!peca) { faltas.push('escolha ' + (i + 1) + ': peça não encontrada no pedido'); return; }
    if (naoComprarAgora[e.chave]) { faltas.push(vd_nomePeca_(peca) + ': marcada como não comprar — não pode ser autorizada ao mesmo tempo'); return; }
    if (!vdf_podeAutorizarPeca_(me, card, an, peca, criador)) { faltas.push(vd_nomePeca_(peca) + ': ' + (vdf_pecaParticular_(peca, card, an) ? 'peça particular — quem autoriza é o consultor que a lançou' : 'peça da seguradora — quem autoriza é a diretoria')); return; }
    var forn = String(e.fornecedor || '').trim().toUpperCase(), valor = vd_valorNum_(e.valor);
    var q = lidas.filter(function (x) { return x.chave === e.chave && x.fornecedor === forn && Math.abs(x.valor - valor) < 0.005; })[0];
    if (!q) { faltas.push(vd_nomePeca_(peca) + ': essa cotação (' + forn + ' ' + vd_valorBR_(valor) + ') não está no card'); return; }
    var antA = antesPorChave[e.chave], nomeA = peca.pneu ? 'PNEU ' + String(peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(peca);
    var mesmaA = !!(antA && antA.fornecedor === forn && Math.abs((+antA.valor || 0) - valor) < 0.005);
    if (mesmaA) iguaisA.push(peca); else if (antA) trocadasA.push(nomeA + ': ' + antA.fornecedor + ' ' + vd_valorBR_(antA.valor) + ' → ' + forn + ' ' + vd_valorBR_(valor)); else novasA.push(nomeA + ' (' + forn + ' ' + vd_valorBR_(valor) + ')');
    if (jaEnviada && mesmaA) return;   // reenvio da mesma escolha: não repete a linha na descrição nem conta de novo
    linhas.push('AUTORIZADO: ' + forn + ' - ' + nomeA + ' - ' + vd_valorBR_(valor));
    total += valor * (vd_totaisPorQtd_() ? vd_qtdNum_(peca.qtd) : 1);   // 16/10/2026: valor é da unidade (LÍQUIDO 4 × R$ 40 = R$ 160)
    var doPeca = lidas.filter(function (x) { return x.chave === e.chave; }).map(function (x) { return x.valor; });
    var ea = ev_peca_(peca); ea.fornecedor = forn; ea.valor = valor; ea.dias = q.dias;
    ea.detalhe = doPeca.length > 1 ? 'menor ' + vd_valorBR_(Math.min.apply(null, doPeca)) + ' · maior ' + vd_valorBR_(Math.max.apply(null, doPeca)) + ' · ' + doPeca.length + ' cotações' : '1 cotação';
    evAut.push(ea);
  });
  // 27/10/2026 (Weslley): kit se autoriza inteiro — todas as peças pelo kit, ou nenhuma pelo kit
  try { faltas = faltas.concat(vdf_kitConferirAutorizacao_(p.escolhas || [], lidas, autsAntes, porChave, naoComprarAgora)); } catch (e) { console.log('kit/autorização: ' + e); }
  // marcas na linha da peça (bloco do consultor): troca só a linha daquela peça, o resto do bloco fica igual
  var div = vd_dividir_(card.desc);
  var blocoNovo = div.bloco, marcadas = [];
  marcas.forEach(function (m) {
    var peca = m && porChave[m.chave]; if (!peca) return;
    if (m.naoComprar) { peca.naoComprar = true; peca.naoMotivo = String(m.motivo || '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '/').trim().slice(0, 80); peca.complemento = false; peca.compData = ''; }
    else if (m.complemento !== undefined) { if (!!peca.complemento === !!m.complemento) return; peca.complemento = !!m.complemento; peca.compData = m.complemento ? cp_hoje_() : ''; }
    else if (m.complStatus) { if (!peca.complemento) return; var stN = vdf_complNorm_(m.complStatus, m.complPor); if (!stN || (peca.compStatus === stN.status && (peca.compPor || '') === stN.por)) return; peca.compStatus = stN.status; peca.compPor = stN.por; }
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
  if (!linhas.length && !marcadas.length && !faltas.length && !fechar) {
    // 10/10/2026: toda peça "sem cotação" = nada a autorizar — a saída é decidir por peça (🚫 não comprar) ou devolver
    var semNada = !lidas.length && an.pecas.length > 0;
    faltas.push(parcial ? 'Escolha a cotação de pelo menos uma peça para salvar.'
      : (semNada ? 'Nenhuma peça deste card tem cotação (ainda não cotada ou o comprador justificou "sem cotação"). Decida por peça: marque 🚫 não comprar com o motivo, ou use ↩️ Devolver para cotação com a orientação para o comprador.'
        : 'Escolha a cotação de pelo menos uma peça (ou marque complemento / não comprar).'));
  }
  if (faltas.length) return { ok: false, faltas: faltas };
  var obsL = vdf_linhasObs_(p, porChave, 'autorização');
  var reenvio = jaEnviada && (iguaisA.length > 0 || trocadasA.length > 0);
  if (reenvio && !linhas.length && !marcadas.length && !obsL.linhas.length) {
    // mesma autorização de novo: nada muda no card; uma linha de registro, sem menção
    var totR = autsAntes.reduce(function (sum, a) { var pc = porChave[a.chave] || {}; return sum + (+a.valor || 0) * (vd_totaisPorQtd_() ? vd_qtdNum_(pc.qtd) : 1); }, 0);
    // 21/10/2026 19h03 (Weslley): sem comentário quando nada mudou
    return { ok: true, repetida: true, url: card.shortUrl, nome: card.name, n: autsAntes.length, total: totR, semAut: 0, aguarda: [], marcas: 0, lista: vdf_nomeLista_(ctx, card.idList) };
  }

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
      + (naos.length ? '\n🚫 **Não comprar**: ' + naos.map(function (x) { return cp_nome_(x) + (x.naoMotivo ? ' (' + x.naoMotivo + ')' : ''); }).join('; ') : '')
      + marcadas.filter(function (x) { return x.m.complStatus; }).map(function (x) { return '\n' + (x.peca.compStatus === 'AUTORIZADO' ? '✅ Complementar autorizado pela seguradora e importado no Databox: ' : '⚠️ **Comprado antes da autorização do complementar** — liberado por ' + x.peca.compPor + ': ') + cp_nome_(x.peca); }).join('');
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
    // 21/10/2026 (Weslley): salvar parcial não comenta — só o "Enviar autorização"
    try { vd_marcar_(card); } catch (e) {}
    return { ok: true, parcial: true, url: card.shortUrl, nome: card.name, n: linhas.length, total: total, jaAut: jaAut, pecas: an.pecas.length, marcas: marcadas.length, lista: vdf_nomeLista_(ctx, card.idList) };
  }
  if (fechar) {
    // nada novo: fecha o que foi salvo parcialmente — totais passam a ser os de todas as autorizações do card
    total = autsAgora.reduce(function (sum, a) { var pc = porChave[a.chave] || {}; return sum + (+a.valor || 0) * (vd_totaisPorQtd_() ? vd_qtdNum_(pc.qtd) : 1); }, 0);
    linhas = autsAgora.map(function (a) { return a.chave; });
    evAut = [];
  }
  var grupoSeg = an.pecas.filter(function (x) { return !vdf_pecaParticular_(x, card, an); }), grupoPart = an.pecas.filter(function (x) { return vdf_pecaParticular_(x, card, an); });
  var aguarda = [];
  if (grupoSeg.length && grupoPart.length) {
    if (!grupoSeg.some(temAut)) aguarda.push('peças da seguradora — diretoria');
    if (!grupoPart.some(temAut)) {
      var donos = [].concat.apply([], grupoPart.map(function (x) { return vdf_donosPart_(card, x, criador); })).filter(function (u, i, a) { return u && a.indexOf(u) === i; });
      aguarda.push('peças particulares — ' + (donos.length ? donos.join(' / ') : 'consultor'));
    }
  }
  // 16/10/2026 (Weslley, NPG5429): peça ainda sem cotação (complemento novo em EM COTAÇÃO) segura o card — antes o "Enviar
  // autorização" sem escolha nova fechava as autorizações antigas e levava o card para AUTORIZADO COMPRA com a peça sem cotar
  // peça já no checklist PAGAS (compra antiga, sem linha de cotação na descrição) não conta como "sem cotação"
  var semCotAgora = [];
  try {
    var nomesSem = vd_pecasSemCotacao_({ desc: novaDesc, name: card.name });
    if (nomesSem.length) {
      var pagasN = vdf_itensPagas_(vd_api_('/cards/' + card.id, { query: { fields: 'name', checklists: 'all', checkItem_fields: 'name' } }));
      semCotAgora = an.pecas.filter(function (x) {
        var k = vd_chavePeca_(x);
        return nomesSem.indexOf(vd_nomePeca_(x)) >= 0 && !(k && pagasN.some(function (nm) { return nm.indexOf(k) >= 0; }));
      }).map(vd_nomePeca_);
    }
  } catch (e) { semCotAgora = []; }
  if (semCotAgora.length) {
    if (fechar) return { ok: false, faltas: ['Ainda há peça aguardando cotação do comprador: ' + semCotAgora.join('; ') + '. O card fica em ' + vdf_nomeLista_(ctx, card.idList) + ' até a cotação chegar — depois autorize essa peça. (As peças já autorizadas/compradas continuam valendo.)'] };
    aguarda.push('cotação do comprador: ' + semCotAgora.join('; '));
  }
  var movido = '';
  try { ev_registrar_('AUTORIZAÇÃO', card, me.username, evAut, { detalhe: (fechar ? 'enviada (fecha as parciais)' : '') + (aguarda.length ? ' aguardando: ' + aguarda.join('; ') : '') }); } catch (e) {}
  if (!aguarda.length) { try { movido = vdf_moverPara_(card, ctx, VDF_LISTA_AUTORIZADO, token, me.username); } catch (e) {} }
  // "sem autorização" só conta as peças que ESTA pessoa podia autorizar
  // 27/10/2026 (ATP5105): peça não autorizada e não marcada 🚫 fica "sem decisão" (o card não encerra com ela assim) — antes o comentário dizia "não comprar"
  var semAut = an.pecas.filter(function (x) { return vdf_podeAutorizarPeca_(me, card, an, x, criador) && !temAut(x) && !x.naoComprar; }).length;   // autorizada antes (ex.: complemento) não conta
  try {
    var compr = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).split(/[,;\s]+/).filter(function (u) { return u && u.toLowerCase() !== String(me.username).toLowerCase(); })[0];
    if (reenvio) {
      // só o que mudou, com o total do card depois da mudança
      var totC = autsAgora.reduce(function (sum, a) { var pc = porChave[a.chave] || {}; return sum + (+a.valor || 0) * (vd_totaisPorQtd_() ? vd_qtdNum_(pc.qtd) : 1); }, 0);
      vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: vdf_mencao_([compr]) + '✏️ **AUTORIZAÇÃO ALTERADA** — ' + me.fullName + ' · ' + autsAgora.length + ' peça(s) · ' + vd_valorBR_(totC) + (movido ? ' → **' + movido + '**' : '') +
        (trocadasA.length ? '\n🔁 Trocou: ' + trocadasA.join('; ') : '') + (novasA.length ? '\n➕ Autorizou agora: ' + novasA.join('; ') : '') +
        (typeof txtM === 'string' ? txtM : '') + obsL.texto + (aguarda.length ? '\n⏳ Aguarda: ' + aguarda.join('; ') : '') } }, token);
      total = totC; linhas = autsAgora.map(function (a) { return a.chave; });
    } else {
      vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: vdf_mencao_([compr]) + '✅ **AUTORIZADO** — ' + me.fullName + ' · ' + linhas.length + ' peça(s) · ' + vd_valorBR_(total) + (movido ? ' → **' + movido + '**' : '') +
        (semAut ? '\n⏳ Sem decisão: ' + semAut + ' peça(s) — autorizar depois ou marcar 🚫 não comprar (o card não encerra com peça sem decisão)' : '') + (typeof txtM === 'string' ? txtM : '') + obsL.texto + (aguarda.length ? '\n⏳ Aguarda: ' + aguarda.join('; ') : '') } }, token);
    }
  } catch (e) {}
  try { propsA.setProperty(kEnv, agora); } catch (e) {}   // daqui em diante, reenvio compara com esta autorização
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: linhas.length, total: total, semAut: semAut, aguarda: aguarda, marcas: marcadas.length, lista: movido || vdf_nomeLista_(ctx, card.idList), alterada: reenvio };
}

// FormularioServidor.gs:1916
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

// FormularioServidor.gs:1936
function vdf_devolverCotacao(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var an = vd_analisar_(card.desc, card.name);
  if (!vdf_podeDevolver_(me, card, an)) return { ok: false, faltas: ['Só a diretoria pode devolver a cotação' + (an.pecas.some(function (x) { return x.particular; }) ? ' deste card (tem peças da seguradora junto com as particulares)' : '') + ' — sua conta: ' + me.username + '. Escreva a observação na peça e autorize só o que estiver certo.'] };
  // card com peça já comprada (14/10/2026, BBM4739): devolve só as peças SEM compra. A autorização das compradas é
  // mantida pelas linhas "MANTIDA (comprada): <chave>" logo abaixo do cabeçalho (vd_autorizacoesDaDescricao_ as preserva).
  var mantidas = [];
  try {
    var cCk = vd_api_('/cards/' + card.id, { query: { fields: 'name', checklists: 'all', checkItem_fields: 'name' } });
    var autsAnt = vd_autorizacoesDaDescricao_(card.desc, an.pecas);
    var compradas = an.pecas.filter(function (x) { return vdf_travaPeca_(x, autsAnt, cCk) === 'COMPRADA'; });
    if (compradas.length && compradas.length >= an.pecas.length) return { ok: false, faltas: ['Todas as peças deste card já foram compradas — não há o que devolver para cotação. Para trocar uma peça, use "cotação autorizada indisponível" na aba Compra, ou inclua a peça nova pelo ✏️ EDITAR/INCLUIR PEÇA.'] };
    compradas.forEach(function (x) { var k = vd_chavePeca_(x); if (autsAnt.some(function (a) { return a.chave === k; })) mantidas.push(k); });
  } catch (e) { return { ok: false, faltas: ['Não consegui conferir as compras do card agora. Tente de novo em alguns segundos.'] }; }
  var porChave = {};
  an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var obsL = vdf_linhasObs_(p, porChave, 'devolução');
  if (!obsL.n) return { ok: false, faltas: ['Escreva o motivo da devolução (geral ou em alguma peça) — é o que o comprador vai ler.'] };
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
  var div = vd_dividir_(card.desc);
  var resto = div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR;
  vd_backup_(card, 'cotação devolvida pelo formulário por ' + me.username);
  vd_gravarDesc_(card.id, div.bloco.replace(/\s+$/, '') + '\n\n' + resto + '\n\n**DEVOLVIDA PARA COTAÇÃO ' + agora + ' - ' + me.fullName + '**\n' +
    mantidas.map(function (k) { return 'MANTIDA (comprada): ' + k + '\n'; }).join('') + obsL.linhas.join('\n'), token);
  try { ev_registrar_('DEVOLUÇÃO', card, me.username, null, { detalhe: [String(p.geral || '').trim()].concat((p.obs || []).map(function (o) { return o.texto; })).filter(String).join(' | ').slice(0, 500) }); } catch (e) {}
  try { PropertiesService.getScriptProperties().deleteProperty('VDF_AUT_ENV_' + card.id); } catch (e) {}   // a próxima autorização é nova, não "alterada"
  var movido = '';
  try { movido = vdf_moverPara_(card, ctx, VD.LISTA_COTACAO, token, me.username); } catch (e) {}
  try {
    var compr = String(vd_prop_('VD_COMPRADORES', VDF_COMPRADORES_PADRAO)).split(/[,;\s]+/).filter(function (u) { return u && u.toLowerCase() !== String(me.username).toLowerCase(); })[0];
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: vdf_mencao_([compr]) + '↩️ **COTAÇÃO DEVOLVIDA** — ' + me.fullName + (movido ? ' → **' + movido + '**' : '') + obsL.texto } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: obsL.n, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

// FormularioServidor.gs:1977
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

// FormularioServidor.gs:1992
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

// FormularioServidor.gs:2016
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

// FormularioServidor.gs:2046
function vdf_salvarCompra(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) registra compra — sua conta: ' + me.username + '.'] };
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro — não recebe cotação nem compra.'] };
  if (!vdf_temOrdemAut_(card)) return { ok: false, faltas: ['🏷️ FALTA A ETIQUETA ORDEM AUTORIZADA — confira no Databox se a ordem está autorizada e o orçamento importado. Se estiver tudo certo, coloque a etiqueta no card e envie de novo; se não, avise o solicitante no card.'] };
  // (revisão 07/10/2026, Weslley) autorização parcial é rascunho: compra só depois de a diretoria ENVIAR a autorização
  // (card em AUTORIZADO COMPRA ou adiante). Antes disso o card ainda está em cotação/autorização.
  var colunaAtual = vd_nomeColuna_(vdf_nomeLista_(ctx, card.idList));
  if ([VD.LISTA_COTACAO, VD.LISTA_FALTA, VDF_LISTA_PENDENTE, VDF_LISTA_FINALIZADA, 'ESPERA/NÃO AUTORIZADO'].map(vd_nomeColuna_).indexOf(colunaAtual) >= 0)
    return { ok: false, faltas: ['A autorização ainda não foi enviada pela diretoria (o card está em ' + colunaAtual + '). A compra só pode ser registrada depois que o card chegar em AUTORIZADO COMPRA.'] };
  var an = vd_analisar_(card.desc, card.name);
  var porChave = {};
  an.pecas.forEach(function (x) { porChave[vd_chavePeca_(x)] = x; });
  var cotLidas = vd_cotacoesDaDescricao_(card.desc, an.pecas), lidas = cotLidas.cotacoes;
  var naoCotadas = (cotLidas.semCot || []).map(function (x) { return x.chave; });   // justificadas: não ficam esperando compra
  var faltas = [], compras = [], complMarcas = [];
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
    // 10/10/2026 (revisão): compra sem prazo gerava item PAGAS sem data — o aviso de recebimento atrasado nunca saía
    var diasC = String(c.dias == null ? '' : c.dias).trim();
    if (diasC === '' || !/^\d+$/.test(diasC)) { faltas.push(rot + ': informe o prazo de entrega em dias úteis (número).'); return; }
    // 09/10/2026 (Weslley): peça ➕ complemento de pedido de seguradora só é comprada com a situação do complementar informada:
    // AUTORIZADO (seguradora autorizou e foi importado no Databox) ou ANTECIPADO (compra antes da autorização, liberada pelo orçamentista — quem)
    if (vdf_complExige_(peca, card, an)) {
      var stC = vdf_complNorm_(c.compl, c.complPor);
      if (!peca.compStatus && !stC) { faltas.push(rot + ': complemento — marque se a seguradora já autorizou o complementar (e ele foi importado no Databox) ou se a compra é antes da autorização, liberada pelo orçamentista (informe quem).'); return; }
      if (stC && stC.status === 'ANTECIPADO' && !stC.por) { faltas.push(rot + ': compra antes da autorização do complementar — informe quem liberou (orçamentista).'); return; }
      if (stC && (stC.status !== peca.compStatus || stC.por !== (peca.compPor || ''))) complMarcas.push({ peca: peca, status: stC.status, por: stC.por });
    }
    compras.push({ chave: c.chave, codigo: peca.pneu ? '' : peca.codigo, descricao: peca.pneu ? vd_nomePeca_(peca) : peca.descricao, fornecedor: forn, valor: valor, dias: String(c.dias == null ? '' : c.dias).trim(), particular: vdf_pecaParticular_(peca, card, an) && !vdf_ehParticular_(card, an), complemento: !!peca.complemento, just: String(c.just || '').replace(/\s*\n\s*/g, ' ').trim(), anexos: c.anexos || [] });
  });
  // situação do complementar marcada em peça já comprada (ex.: comprada antecipada, agora a seguradora autorizou)
  (p.complementos || []).forEach(function (m) {
    var peca = m && porChave[m.chave]; if (!peca || !peca.complemento) return;
    var stM = vdf_complNorm_(m.status, m.por); if (!stM) return;
    if (stM.status === 'ANTECIPADO' && !stM.por) { faltas.push(vd_nomePeca_(peca) + ': compra antes da autorização do complementar — informe quem liberou.'); return; }
    if (stM.status !== peca.compStatus || stM.por !== (peca.compPor || '')) complMarcas.push({ peca: peca, status: stM.status, por: stM.por });
  });
  /* 08/10/2026 (Weslley): print/arquivo da negociação e forma de pagamento, por peça — TUDO o que foi colado no formulário vai
   * para o card (nome "🛒 COMPRA · PLACA · FORN · PEÇA · dd/MM"), menos cópia idêntica do que já está lá. Arquivo de peça
   * ainda sem compra escolhida também vai (anexosExtra). */
  var arqs = [];
  compras.forEach(function (c) { (c.anexos || []).forEach(function (a) { if (a && a.fileId) arqs.push({ fileId: a.fileId, nome: a.nome, forn: c.fornecedor, peca: vd_nomePeca_(porChave[c.chave]) }); }); });
  (p.anexosExtra || []).forEach(function (a) { if (a && a.fileId) arqs.push({ fileId: a.fileId, nome: a.nome, forn: '', peca: porChave[a.chave] ? vd_nomePeca_(porChave[a.chave]) : '' }); });
  if (!compras.length && !faltas.length && parcial && !arqs.length && !complMarcas.length) faltas.push('Escolha o fornecedor de pelo menos uma peça para salvar.');
  if (faltas.length) return { ok: false, faltas: faltas };
  // grava a situação do complementar na linha da peça (antes do resto, para a vitrine e o comentário já saírem certos)
  var txtCompl = '';
  if (complMarcas.length) {
    try {
      complMarcas.forEach(function (x) { x.peca.compStatus = x.status; x.peca.compPor = x.por; });
      vdf_regravarLinhasPeca_(card, complMarcas.map(function (x) { return x.peca; }), token);
      card.desc = vd_api_('/cards/' + card.id, { query: { fields: 'desc' } }).desc;
      txtCompl = '\n' + complMarcas.map(function (x) { return (x.status === 'AUTORIZADO' ? '✅ Complementar autorizado pela seguradora e importado no Databox: ' : '⚠️ **Comprado antes da autorização do complementar** — liberado por ' + x.por + ': ') + vd_nomePeca_(x.peca); }).join('\n');
    } catch (e) { console.log('compl/compra: ' + e); }
  }
  if (!compras.length && parcial && !arqs.length && complMarcas.length) {
    try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '📝 **COMPLEMENTAR** — ' + me.fullName + txtCompl } }, token); } catch (e) {}
    try { vd_marcar_(card); } catch (e) {}
    return { ok: true, parcial: true, url: card.shortUrl, nome: card.name, pagas: 0, pendentes: 0, foraAut: [], anexos: [], repetidos: [], lista: vdf_nomeLista_(ctx, card.idList) };
  }

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
      if (x.naoComprar || naoCotadas.indexOf(k) >= 0 || novasCh.indexOf(k) >= 0) return;
      if (autChA.length && autChA.indexOf(k) < 0) return;
      if (!nomesA.some(function (nm) { return vd_casaItem_(nm, k); })) pendentesDepois.push(vd_nomePeca_(x));
    });
  } catch (e) {}
  if (!parcial && pendentesDepois.length) return { ok: false, faltas: ['Ainda falta comprar ' + pendentesDepois.length + ' peça(s): ' + pendentesDepois.join('; ') + '. Para guardar o que já tem, use **💾 Salvar parcial**.'] };
  if (!compras.length && !parcial) {
    // nada novo e nada pendente: só fecha (move) o que foi salvo parcialmente
    var axF = vdf_anexarCompra_(card, arqs, token);
    var movF = ''; try { movF = vdf_moverPara_(card, ctx, VDF_LISTA_CHEGAR, token, me.username); } catch (e) {}
    // tudo já recebido (ex.: compras do fluxo antigo ✔) -> segue direto para ENCERRADO (13/10/2026, BDK2J49)
    try { var movF2 = rc_reavaliarColuna_(card.id, token, me.username); if (movF2) movF = movF2; } catch (e) { console.log('compra/coluna: ' + e); }
    try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🛒 **COMPRA** — ' + me.fullName + ' · enviada (salva antes aos poucos)' + (movF ? ' → **' + movF + '**' : '') + vdf_txtAnexosCompra_(axF) } }, token); } catch (e) {}
    try { vd_marcar_(card); } catch (e) {}
    return { ok: true, url: card.shortUrl, nome: card.name, pagas: 0, pendentes: 0, foraAut: [], anexos: axF.anexados, repetidos: axF.repetidos, lista: movF || vdf_nomeLista_(ctx, card.idList) };
  }
  if (!compras.length && parcial) {
    // só arquivos (peça ainda sem compra escolhida): anexa e pronto
    var axP = vdf_anexarCompra_(card, arqs, token);
    // 21/10/2026 (Weslley): só anexa, sem comentário
    return { ok: true, parcial: true, url: card.shortUrl, nome: card.name, pagas: 0, pendentes: 0, foraAut: [], anexos: axP.anexados, repetidos: axP.repetidos, lista: vdf_nomeLista_(ctx, card.idList) };
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
  var axC = vdf_anexarCompra_(card, arqs, token);
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
      if (x.naoComprar || naoCotadas.indexOf(k) >= 0) return;
      if (autCh.length && autCh.indexOf(k) < 0) return;
      if (!nomes.some(function (nm) { return vd_casaItem_(nm, k); })) pendentes++;
    });
    if (!pendentes && !parcial) movido = vdf_moverPara_(card, ctx, VDF_LISTA_CHEGAR, token, me.username);
  } catch (e) {}
  try {
    var dirs = foraAut.length ? sla_users_('SLA_AUTORIZAR', 'timweslley,comercialunity').filter(function (u) { return u !== me.username; }) : [];
    if (!parcial) vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: dirs.map(function (u) { return '@' + u + ' '; }).join('') +   // 21/10/2026: salvar parcial não comenta
      (parcial ? '💾 **COMPRA PARCIAL salva** — ' : '🛒 **COMPRA** — ') + me.fullName + ' · ' + n + ' item(ns)' + (movido ? ' → **' + movido + '**' : '') +
      (pendentes ? '\n⏳ Falta comprar: ' + pendentes + ' peça(s)' : '') + (parcial && !pendentes ? '\nTudo comprado — envie a compra para o card seguir.' : '') +
      (foraAut.length ? '\n⚠️ **FORA DA AUTORIZAÇÃO:**\n' + foraAut.map(function (f) { return '- ' + f; }).join('\n') : '') + txtCompl + vdf_txtAnexosCompra_(axC) } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, parcial: parcial, url: card.shortUrl, nome: card.name, pagas: n, pendentes: pendentes, foraAut: foraAut, anexos: axC.anexados, repetidos: axC.repetidos, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

// FormularioServidor.gs:2221
function vdf_anexarCompra_(card, arqs, token, tipoAx) {   // tipoAx: AX.COMPRA (padrão) ou AX.COT (23/10/2026, anexos da cotação)
  var out = { anexados: [], repetidos: [] };
  if (!arqs || !arqs.length) return out;
  var placa = ax_placa_(card), anexosCard = [];
  try { anexosCard = vd_api_('/cards/' + card.id + '/attachments', { query: { fields: 'name,fileName,bytes,date,isUpload,url' } }) || []; } catch (e) {}
  var hashes = {};   // id do anexo → md5 (só calcula para os de tamanho igual)
  arqs.forEach(function (a) {
    var f;
    try { f = vdf_arquivoTemp_(a.fileId); } catch (e) { console.log('compra/anexo: ' + e); return; }
    try {
      var blob = f.getBlob(), bytes = blob.getBytes().length, md5 = ax_md5_(blob);
      var igual = anexosCard.filter(function (x) { return x.isUpload && +x.bytes === bytes; }).filter(function (x) {
        if (!(x.id in hashes)) hashes[x.id] = ax_hashAnexo_(x);
        return hashes[x.id] && hashes[x.id] === md5;
      })[0];
      if (igual) { out.repetidos.push((a.nome || f.getName()) + ' (já está no card como «' + igual.name + '»)'); f.setTrashed(true); return; }
      var curto = String(a.peca || '').replace(/^[A-Z0-9][A-Z0-9\/.\-]{3,}\s+/, '').slice(0, 40).trim();   // descrição sem o código
      var nome = ax_nome_(tipoAx || AX.COMPRA, placa, [a.forn || '', curto]);
      var at = vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: { file: blob, name: nome } }, token);
      if (at && at.id) { nome = ax_batizar_(card.id, at.id, nome, anexosCard, token, { nomeAtual: nome, semVersao: true }); anexosCard.push({ id: at.id, name: nome, bytes: bytes, isUpload: true, date: new Date().toISOString() }); hashes[at.id] = md5; }
      f.setTrashed(true);
      out.anexados.push(nome);
    } catch (e) { console.log('compra/anexo ' + a.nome + ': ' + e); }
  });
  return out;
}

// FormularioServidor.gs:2247
function vdf_txtAnexosCompra_(ax) {
  var t = '';
  if (ax.anexados.length) t += '\n📎 Negociação/pagamento: ' + ax.anexados.join(' · ');
  if (ax.repetidos.length) t += '\n🗑️ Não anexado (repetido): ' + ax.repetidos.join(' · ');
  return t;
}

// FormularioServidor.gs:2256
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

// FormularioServidor.gs:2272
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

// FormularioServidor.gs:2298
function vdf_pecasDaBase_(placa, sinistro) {
  if (!placa) return null;
  var sin = String(sinistro || '').replace(/\D/g, ''), melhor = null;
  CL_BASES.forEach(function (B) {
    if (!cl_ligadoBase_(B)) return;
    var j; try { if (!cl_arquivo_(B)) return; j = cl_json_(B); } catch (e) { return; }
    Object.keys(j.orcamentos || {}).forEach(function (casa) {
      (j.orcamentos[casa] || []).forEach(function (o) {
        if (!o || !o.dispara_compra || !o.pecas || !o.pecas.length || !vd_mesmaPlaca_(o.placa, placa)) return;
        if (B.id === 'CILIA' && cl_seguradora_(o.seguradora) === 'HDI') return;   // sinistro HDI: vale o laudo do portal HDI
        var bateSin = sin.length >= 5 && String(o.sinistro || '').replace(/\D/g, '').indexOf(sin) >= 0;
        var data = String((o.conclusao_detalhe && o.conclusao_detalhe.data) || o.detalhe_em || '');
        var nota = (bateSin ? 'B' : 'A') + data;
        if (!melhor || nota > melhor.nota) melhor = { nota: nota, o: o, B: B };
      });
    });
  });
  if (!melhor) return null;
  var orc = cl_pecasParaOrc_(melhor.o.pecas);
  var paraPeca = function (x) {
    return x.pneu ? { pneu: true, medida: x.medida || '', categoria: x.categoria || '', marca: x.marca || '', qtd: x.qtd || '1' }
      : { codigo: x.codigo || '', descricao: x.descricao || '', tipos: [], qtd: x.qtd || '1', valorOrc: x.valorOrc };
  };
  return { oficina: orc.oficina.map(paraPeca), fo: orc.fo.map(function (x) { return { codigo: x.codigo || '', descricao: x.pneu ? 'PNEU ' + x.medida : x.descricao, qtd: x.qtd || '1' }; }),
    origem: melhor.B.org, rot: melhor.B.rot + ' ' + cl_rotVersao_(melhor.B, melhor.o.versao_baixada || '') };
}

// FormularioServidor.gs:2326
function vdf_rotinaPecasBase(token, p) {
  if (!vdf_ehAutorizador_(vdf_usuario_(token))) throw new Error('Só a diretoria.');
  return { ok: true, base: vdf_pecasDaBase_(p.placa, p.sinistro) };
}

// FormularioServidor.gs:2332
function vdf_fotoPecaLigada_() { try { return vd_board_() === 'ZX4gRmnX' || vd_prop_('VD_FOTO_PECA', 'NAO') === 'SIM'; } catch (e) { return false; } }

// FormularioServidor.gs:2334
function vdf_soMaoDeObraLigada_() { try { return vd_board_() === 'ZX4gRmnX' || vd_prop_('VD_SO_MO', 'SIM') !== 'NAO'; } catch (e) { return false; } }

// FormularioServidor.gs:2336
function vdf_salvar(token, p) {
  var trocasPart = { paraPart: [], paraSeg: [] };
  // 💾 Salvar parcial (13/10/2026, Weslley): grava o que já tem mesmo com dado faltando — o robô põe o card em FALTA DADOS e
  // comenta o que falta. Só placa, carro e ao menos uma peça continuam obrigatórios.
  var parcial = !!(p && p.parcial);
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var cardCampos = false;
  var ctx = vd_contexto_();
  // 23/10/2026 (Weslley: "orçamentos só de mão de obra também devem ter card aberto e o robô deve encaminhá-los para ENCERRADO";
  // DTA9330, GHH1I54, FYS4A72): a Rotina abre o card de orçamento autorizado sem peça de TROCA nem FO direto em ENCERRADO.
  // Só com rotina + diretoria + card novo + chave (TESTE sempre; principal com VD_SO_MO=SIM). Fora disso o pedido é ignorado
  // e vale a recusa de sempre ("Adicione pelo menos uma peça").
  var soMO = !!p.soMaoDeObra && !!p.rotina && !p.shortLink && vdf_ehAutorizador_(me) && vdf_soMaoDeObraLigada_();
  var d = {
    modelo: String(p.dados.modelo || '').trim().toUpperCase(),
    ano: String(p.dados.ano || '').trim(),
    motor: String(p.dados.motor || '').trim().toUpperCase(),
    chassi: vd_normChassi_(p.dados.chassi),
    placa: vd_normPlaca_(p.dados.placa)
  };
  // placa estrangeira confirmada no formulário (13/10/2026): "ABCD123 (PY)" — só quando o formato bate com o país
  var paisP = String(p.dados.pais || '').toUpperCase();
  if ((paisP === 'PY' || paisP === 'AR') && vd_placaEstrangeira_(d.placa) === paisP) d.pais = paisP;
  // 19/10/2026: texto com acento quebrado (UTF-8 lido como cp1252) vem consertado; card aberto pela Rotina não leva serviço como peça
  (p.pecas || []).forEach(function (x) { if (x) { x.descricao = vd_consertarAcentos_(x.descricao); x.marca = vd_consertarAcentos_(x.marca); } });
  // 19/10/2026 (Weslley: "ajuste a skill e a rotina pra isso, dado que o robô já faz"): card aberto pela Rotina leva as peças
  // da MESMA base de orçamentos que o robô usa (Cilia/HDI, só TROCA, sem serviço) — a lista que a Rotina mandou só vale quando
  // a placa não está na base (SOMA, orçamento manual). O fornecedor/previsão das FO que a Rotina leu no portal continuam.
  if (p.rotina && !p.shortLink) {
    var daBase = null;
    try { daBase = vdf_pecasDaBase_(p.dados && p.dados.placa, (p.novo || {}).sinistro); } catch (eB) { console.log('rotina/base: ' + eB); }
    // só mão de obra com peça de troca/fornecimento na base de orçamentos da placa: não é só M.O. — recusa explicando
    if (soMO && daBase && ((daBase.oficina || []).length || (daBase.fo || []).length)) {
      return { ok: false, faltas: ['Placa ' + vd_normPlaca_(p.dados && p.dados.placa) + ': não é só mão de obra — o orçamento dela na base do robô (' + daBase.rot + ') tem ' +
        (daBase.oficina || []).length + ' peça(s) de troca da oficina e ' + (daBase.fo || []).length + ' de fornecimento. Abra o card normal (sem soMaoDeObra) ou confira se é outro sinistro.'] };
    }
    if (daBase) {
      // 21/10/2026 (FPY5D56, QCJ1I71): o pneu da base vem sem categoria/marca e a API recusava ("falta categoria") mesmo com a
      // Rotina mandando 1ª LINHA — agora a categoria/marca que a Rotina manda para o pneu da mesma medida é aproveitada.
      var enviadas = (p.pecas || []).filter(function (x) { return x && x.pneu; }), medidaN = function (x) { return String((x && x.medida) || '').replace(/\s+/g, '').toUpperCase(); };
      p.pecas = (daBase.oficina || []).map(function (x) {
        if (!x || !x.pneu || x.categoria || x.marca) return x;
        var r = enviadas.filter(function (e) { return medidaN(e) === medidaN(x) && (e.categoria || e.marca); })[0] || (enviadas.length === 1 && (enviadas[0].categoria || enviadas[0].marca) ? enviadas[0] : null);
        return r ? Object.assign({}, x, { categoria: r.categoria || '', marca: r.marca || '' }) : x;
      });
      var foRot = ((p.orcamento || {}).fo || []), chFo = function (x) { return String((x && x.codigo) || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || vd_semAcento_(String((x && x.descricao) || '')).toUpperCase(); };
      var porCod = {}; foRot.forEach(function (x) { if (x) porCod[chFo(x)] = x; });
      p.orcamento = Object.assign({}, p.orcamento || {}, { origem: (p.orcamento || {}).origem || daBase.origem,
        fo: daBase.fo.map(function (x) { var r = porCod[chFo(x)]; return r ? Object.assign({}, x, { fornecedor: r.fornecedor || '', previsao: r.previsao || '', entregue: r.entregue }) : x; }) });
      p.baseOrcamento = daBase.rot;
    }
  }
  if (p.rotina && !p.shortLink) p.pecas = (p.pecas || []).filter(function (x) { return !x || x.pneu || !vd_ehServico_(vd_semAcento_(String(x.descricao || '')).toUpperCase()); });
  // 19/10/2026: a Rotina só abre peça de TROCA. Com o campo operacao (do Cilia: "T", "R&I", "R", "P", "T P"…), linha sem T
  // (só remover/instalar, reparar ou pintar) não é compra e não entra.
  if (p.rotina && !p.shortLink) p.pecas = (p.pecas || []).filter(function (x) { return !x || x.operacao == null || /(^|\s)T(ROCA)?(\s|$)/.test(String(x.operacao).toUpperCase().replace(/R&I/g, ' ')); });
  var pecas = (p.pecas || []).map(function (x) {
    // 17/10/2026: pneu que chegou como peça comum sem código ("PNEU HIFLY 195/55R15 …") vira pneu (BDD2J09)
    var dP = String(x.descricao || '').trim().toUpperCase(), mP = !x.pneu && /^PNEUS?\b/.test(dP) && !/\d{4}/.test(String(x.codigo || '').replace(/[^A-Z0-9]/gi, '')) && dP.match(/\d{3}\s*\/\s*\d{2}\s*Z?R?\s*\d{2}/);
    if (mP) x = Object.assign({}, x, { pneu: true, medida: mP[0], marca: dP.replace(/^PNEUS?\b/, '').replace(mP[0], ' ').replace(/\s+/g, ' ').trim(), categoria: x.categoria || '' });
    return x.pneu
      ? { pneu: true, medida: String(x.medida || '').trim().toUpperCase().replace(/\s+/g, ''), categoria: x.categoria || '', marca: String(x.marca || '').trim().toUpperCase(), qtd: x.qtd || '' }
      : vd_ehAcessorio_(x.codigo)
      ? { pneu: false, codigo: '', acessorio: true, descricao: String(x.descricao || '').trim().toUpperCase(), tipos: (x.tipos || []).slice(0, 3), qtd: x.qtd || '' }
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
    // 22/10/2026 (Weslley): foto da peça (📷 no pedido) — só vale a foto que vai junto nesta gravação (está em fileIds)
    if (!pecas[i].pneu && (x.fotoIds || []).some(function (fid) { return (p.fileIds || []).indexOf(fid) >= 0; })) pecas[i].foto = true;
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
  /* 08/10/2026 (Weslley, regra fixa): card CSS (ZACARIAS no título / nome do carro) -> toda peça da seguradora é FO:
   * sai da lista da oficina e entra no checklist FORNECIMENTO (fornecedor ZACARIAS). Peça particular continua na oficina. */
  var cssCard = vd_cardCss_((card && card.name) || '') || vd_cardCss_(n.carro);
  if (cssCard) {
    var paraFo = [];
    pecas = pecas.filter(function (x) { if (x.particular || x.naoComprar) return true; paraFo.push(vd_pecaParaFo_(x, 'ZACARIAS')); return false; });
    if (paraFo.length) { fo = fo.concat(paraFo); orc = orc || { origem: 'CSS' }; }
    if (p.complemento && (p.complemento.oficina || []).length) { var cc = vd_orcCss_(p.complemento, 'ZACARIAS'); p.complemento = { origem: p.complemento.origem, oficina: [], fo: cc.fo }; }
  }
  var tipo = vd_tipoNormPedido_(n.tipo) || 'SEGURADORA';
  var particular = tipo === 'PARTICULAR', semSeguradora = vd_semSeguradora_(tipo);   // RETORNO também dispensa orçamento (09/10/2026)
  var extra = {
    tipo: tipo,
    cor: String(n.cor || '').trim().toUpperCase(),
    seguradora: vd_rotuloSeguradora_(tipo, String(n.seguradora || '').trim().toUpperCase()),
    sinistro: String(n.sinistro || '').trim(),
    fo: fo,
    origemOrc: orc && orc.origem ? orc.origem : '',
    soMaoDeObra: soMO
  };
  var obs = String(p.obs || '').replace(/\s*\n\s*/g, ' ').trim();
  var agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');

  // card existente: descobre coluna e peças que já existiam
  var card = null, lista = '', posCot = false, baseSigs = null, baseTodas = null;
  var naoAntes = {}, pecasAntes = null;   // 21/10/2026: como o pedido estava antes desta gravação (para dizer o que mudou e quem mudou)
  if (p.shortLink) {
    // 26/10/2026 (velocidade): o card vem UMA vez com checklists e anexos — as conferências abaixo (peça travada, FORNECIMENTO
    // no checklist, orçamento anexado, anexo repetido, link 💰) reaproveitam esta leitura em vez de pedir o card de novo
    card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard', checklists: 'all', checkItem_fields: 'name,state,due', attachments: 'true', attachment_fields: 'name,fileName,bytes,date,isUpload,url', customFieldItems: 'true' } });
    if (!extra.origemOrc) {
      try { var mOrc = vd_limpar_(card.desc || '').match(/OR[ÇC]AMENTO IMPORTADO \(([^)]*)\)/i); if (mOrc) extra.origemOrc = mOrc[1]; } catch (e) {}
    }
    try {
      var anAntes = vd_analisar_(card.desc, card.name); pecasAntes = {};
      (anAntes.pecas || []).forEach(function (x) { pecasAntes[vd_chavePeca_(x)] = x; });
      (anAntes.naoComprar || []).forEach(function (x) { naoAntes[vd_chavePeca_(x)] = 1; pecasAntes[vd_chavePeca_(x)] = x; });
    } catch (e) { pecasAntes = null; }
    if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro — não pode ser usado como pedido. Clique em "Fazer pedido novo em vez disso".'] };
    // CSS pelo título do card (quando o nome do carro não trouxe ZACARIAS): mesma conversão para FO
    if (!cssCard && vd_cardCss_(card.name)) {
      cssCard = true;
      var paraFo2 = [];
      pecas = pecas.filter(function (x) { if (x.particular || x.naoComprar) return true; paraFo2.push(vd_pecaParaFo_(x, 'ZACARIAS')); return false; });
      if (paraFo2.length) { fo = fo.concat(paraFo2); extra.fo = fo; orc = orc || { origem: 'CSS' }; }
      if (p.complemento && (p.complemento.oficina || []).length) { var cc2 = vd_orcCss_(p.complemento, 'ZACARIAS'); p.complemento = { origem: p.complemento.origem, oficina: [], fo: cc2.fo }; }
    }
    lista = vd_api_('/lists/' + card.idList, { query: { fields: 'name' } }).name;
    posCot = vdf_ehPosCotacao_(lista);
    // situação do complementar na seguradora (COMPL:) já gravada no card não se perde quando o pedido é reenviado
    // (09/10/2026; revisão da noite: o bloco estava antes de `card` ser carregado e nunca rodava)
    try {
      var anC = vd_analisar_(card.desc, card.name), mapC = {};
      anC.pecas.forEach(function (o) { mapC[vd_chavePeca_(o)] = o; });
      pecas.forEach(function (x) { var o = mapC[vd_chavePeca_(x)]; if (o && o.compStatus && x.complemento && !x.compStatus) { x.compStatus = o.compStatus; x.compPor = o.compPor; } });
    } catch (e) { console.log('compl: ' + e); }
    // peça já autorizada ou comprada: não muda nem sai do pedido (só a diretoria)
    if (!vdf_ehAutorizador_(me)) {
      try {
        var cTr = card;   // checklists já vieram na leitura inicial (26/10/2026)
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
    // 14/10/2026 (Weslley, NPG5429): peça que passou entre seguradora e particular nesta edição — vai num comentário no card
    // 21/10/2026 (SES8I10): pedido PARTICULAR não entra — nele toda peça é do cliente (vd_analisar_ marca todas) e o formulário
    // manda particular=false, o que gerava "QUEM PAGA MUDOU — voltou para a seguradora" (com @menções) a cada edição.
    try {
      var descTp = card.desc; try { var cmpTp = vd_completa_(card.id); if (cmpTp) descTp = cmpTp; } catch (e) {}   // vitrine -> descrição completa
      var anTp = vd_analisar_(descTp, card.name), velhoP = {};
      if (tipo === 'PARTICULAR' || anTp.dados.tipo === 'PARTICULAR') anTp.pecas = [];
      anTp.pecas.forEach(function (x) { velhoP[vd_chavePeca_(x)] = !!x.particular; });
      pecas.forEach(function (x) {
        var kTp = vd_chavePeca_(x);
        if (!Object.prototype.hasOwnProperty.call(velhoP, kTp) || !!x.particular === velhoP[kTp]) return;
        (x.particular ? trocasPart.paraPart : trocasPart.paraSeg).push({ nome: vd_nomePeca_(x), por: x.partPor || '' });
      });
    } catch (e) { console.log('troca seguradora/particular: ' + e); }
    // fora da diretoria: não muda o tipo do pedido nem passa peça de seguradora para particular (e vice-versa)
    if (!vdf_ehAutorizador_(me)) {
      var anOr = vd_analisar_(card.desc, card.name), cardOr = { name: card.name, labels: [] };
      var eraPart = vdf_ehParticular_(cardOr, anOr);
      var tNovo = vd_tipoNormPedido_(n.tipo);
      var tVelho = anOr.dados.tipo || (eraPart ? 'PARTICULAR' : 'SEGURADORA');
      if (anOr.pecas.length && tNovo && tVelho !== tNovo)
        return { ok: false, faltas: ['Só a diretoria muda o tipo do pedido (seguradora / particular / retorno).'] };
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
    /* 26/10/2026 (Weslley, PYU9B65): card de seguradora só com peça particular convertido em PARTICULAR pela diretoria — a marca
     * "| PARTICULAR @quem" sai das linhas (o card todo é do cliente); não é peça nova, o card fica onde está */
    if (posCot && tipo === 'PARTICULAR') {
      var semMarcaPart = function (sig) { return String(sig || '').replace(/\|\s*PARTICULAR(?:\s+@[^|]*)?(?=\||$)/gi, ''); };
      baseSigs = baseSigs.map(semMarcaPart); baseTodas = baseTodas.map(semMarcaPart);
    }
  }

  var comp = card && p.complemento ? p.complemento : null;
  var compFo = comp ? (comp.fo || []) : [];
  // card que já tem FORNECIMENTO no checklist pode ficar sem peça da oficina (só FO -> robô leva a FALTA CHEGAR)
  var temFoNoCard = false;
  if (card && !pecas.length && !fo.length && !compFo.length) {
    try { temFoNoCard = /^FORNECIMENTO/i.test(vd_limpar_(vd_dividir_(card.desc).bloco).split('\n').filter(function (l) { return /^FORNECIMENTO\b/i.test(l.trim()); }).join('\n')); } catch (e) {}
    // card do fluxo antigo (descrição fora do padrão): vale o checklist FORNECIMENTO/PAGAS com itens (13/10/2026, UIC5G94)
    if (!temFoNoCard) {
      try { temFoNoCard = (card.checklists || []).some(function (k) { return /^(FORNECIMENTO|PAGAS)/i.test(String(k.name || '').trim()) && (k.checkItems || []).length; }); } catch (e) {}
    }
  }
  // 23/10/2026: card só de mão de obra (marca no bloco PEÇAS) continua sem peça quando é editado (unidade, ordem, obs…)
  var temMoNoCard = false;
  if (card && !pecas.length && !fo.length && !compFo.length) { try { temMoNoCard = vd_soMaoDeObra_(card.desc); } catch (e) {} }
  if (temMoNoCard) extra.soMaoDeObra = true;
  if (soMO) {
    var faltasMO = [];
    if (pecas.length || fo.length) faltasMO.push('Orçamento marcado como só mão de obra, mas veio ' + (pecas.length ? pecas.length + ' peça(s) da oficina (' + pecas.slice(0, 4).map(vd_nomePeca_).join('; ') + ')' : '') +
      (pecas.length && fo.length ? ' e ' : '') + (fo.length ? fo.length + ' peça(s) de fornecimento' : '') + ' — abra o card normal (sem soMaoDeObra).');
    if (!(orc && orc.origem)) faltasMO.push('Orçamento só de mão de obra: informe orcamento.origem (Cilia, HDI, Websoma…) — é o registro do orçamento autorizado no card.');
    if (!ctx.listas[RC.LISTA_FIM]) faltasMO.push('Quadro sem a coluna ' + RC.LISTA_FIM + '.');
    if (faltasMO.length) return { ok: false, faltas: faltasMO };
  }
  if (!pecas.length && !fo.length && !compFo.length && !temFoNoCard && !soMO && !temMoNoCard && !parcial) return { ok: false, faltas: ['Adicione pelo menos uma peça (ou importe um orçamento com peças da seguradora). Se a peça não vai ser comprada, marque 🚫 Não comprar em vez de remover.'] };
  var temOrcNoCard = !!(card && vd_analisar_(card.desc, card.name).doOrcamento);
  if (card && !temOrcNoCard) { try { temOrcNoCard = vd_temOrcAnexo_(card.attachments || []); } catch (e) {} }
  var soAcrescentaParticular = !!card && (p.pecas || []).some(function (x) { return x.particular; });
  if (!parcial && !semSeguradora && !posCot && !(orc && orc.origem) && !temOrcNoCard && !soAcrescentaParticular && !comp) {
    return { ok: false, faltas: ['Pedido de seguradora: anexe o orçamento autorizado (PDF do Cilia, HDI ou Websoma) na seção Documento — o formulário importa as peças dele. Se for cliente particular ou retorno (oficina paga), marque isso no tipo do pedido.'] };
  }
  // card existente: mantém as linhas de FORNECIMENTO que já estavam no bloco
  if (card) extra.foLinhas = vd_dividir_(card.desc).bloco.split('\n').filter(function (l) { return /^FORNECIMENTO\b/i.test(vd_limpar_(l).trim()); });
  // orçamento complementar: peças novas da seguradora -> checklist FORNECIMENTO COMPLEMENTO (antes de montar o bloco, para a contagem)
  var nFoComp = 0;
  if (compFo.length) {
    try {
      nFoComp = vdf_checklistFornecimento_(card.id, compFo, token, CP.FO);
      try { vdf_registrarTrocasFo_(card, token, 'orçamento ' + (extra.origemOrc || ''), me.username); } catch (e) {}
      var totFoC = cp_contarChecklist_(card.id, CP.FO, token);
      extra.foLinhas = (extra.foLinhas || []).filter(function (l) { return !/^FORNECIMENTO COMPLEMENTO/i.test(vd_limpar_(l).trim()); });
      if (totFoC) extra.foLinhas.push(cp_linhaFo_(totFoC));
    } catch (e) { console.log('FO complemento: ' + e); }
  }
  // 22/10/2026: peça que já tinha foto (| FOTO) continua com a marca quando o pedido é reenviado
  if (pecasAntes) pecas.forEach(function (x) { var o = pecasAntes[vd_chavePeca_(x)]; if (o && o.foto && !x.pneu) x.foto = true; });
  var bloco = vd_montarBloco_(d, pecas, obs, 'Pedido enviado por ' + me.fullName + ' pelo formulário em ' + agora, extra);
  var an = vd_analisar_(bloco, d.placa, posCot ? { base: baseSigs, tipo: tipo } : { tipo: tipo });
  var faltas = an.faltas.slice();
  if (!String(n.carro || '').trim()) faltas.unshift('carro (nome curto para o título)');
  // ROTINA (diretoria): card aberto a partir do Cilia/portal pela Rotina Unity. Peça sem tipo/código é aceita;
  // com peça da oficina o card nasce em FALTA DADOS PARA COTAR para o consultor completar; só FO -> o robô leva a FALTA CHEGAR.
  var rotina = !!p.rotina && vdf_ehAutorizador_(me) && !p.shortLink;
  var faltasRotina = [];
  // 19/10/2026: limpeza de card que a Rotina abriu (vdf_limparCardRotina) tolera o mesmo que a Rotina tolerou ao abrir
  var limpezaRotina = !!p.limpezaRotina && vdf_ehAutorizador_(me) && !!p.shortLink;
  if (rotina || limpezaRotina) { faltasRotina = faltas.filter(function (f) { return /falta o tipo de pe|falta o c[óo]digo|fora do padr|falta categoria/i.test(f); }); faltas = faltas.filter(function (f) { return faltasRotina.indexOf(f) < 0; }); }   // 21/10/2026: pneu sem categoria também abre o card (vai para FALTA DADOS) em vez de recusar
  /* 22/10/2026 (Weslley): peça particular (pedido particular, peça 👤 em card de seguradora) e de retorno — onde o código é
   * opcional — precisa do código OU de uma foto da peça (📷 no pedido). Só peça nova ou alterada (peça que já estava no card
   * fica como está). TESTE sempre; principal com a propriedade VD_FOTO_PECA=SIM. */
  if (!rotina && !limpezaRotina && vdf_fotoPecaLigada_()) {
    pecas.forEach(function (x) {
      if (x.pneu || x.naoComprar || x.codigo || x.foto) return;
      if (!(particular || semSeguradora || x.particular)) return;
      if (pecasAntes && pecasAntes[vd_chavePeca_(x)]) return;
      faltas.push(vd_nomePeca_(x) + ': peça ' + (tipo === 'RETORNO' ? 'de retorno' : 'particular') + ' sem código — escreva o código ou anexe uma foto da peça (📷 Foto da peça)');
    });
  }
  // 23/10/2026 (Weslley: "salvar parcial não deve exigir nada — é só para salvar e terminar depois"): só a placa (card novo precisa de título)
  if (parcial) faltas = faltas.filter(function (f) { return /^placa/i.test(f) && !p.shortLink; });
  if (faltas.length) return { ok: false, faltas: faltas };

  var titulo = String(n.carro || '').trim() ? vd_titulo_(d.placa, n.carro, extra.cor, extra.seguradora) : (!p.shortLink ? vd_titulo_(d.placa, '', extra.cor, extra.seguradora) : '');   // 23/10/2026: parcial sem carro → título só com placa (o robô pede o carro)
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
    try { jaTem = vdf_buscarPlaca(token, d.placa, d.chassi).filter(function (c) { return !c.arquivado; }); } catch (e) { jaTem = []; }
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
    // só mão de obra (23/10/2026): nasce em ENCERRADO — criar não é mover, a trava de colunas (st_executar_) não julga
    var corpo = { idList: soMO ? ctx.listas[RC.LISTA_FIM] : (ctx.listas[rotina && pecas.length ? VD.LISTA_FALTA : VD.LISTA_COTACAO] || ctx.listas[VD.LISTA_COTACAO]), name: titulo, desc: bloco + '\n\n' + VD.MARCADOR, pos: 'top' };
    card = vd_api_('/cards', { method: 'post', payload: corpo }, token);
    try { PropertiesService.getScriptProperties().setProperty('VD_DUP_' + card.id, '1'); } catch (e) {}   // 23/10/2026: duplicidade já conferida pelo formulário (vd_avisoDuplicado_ não repete)
    vd_fixarTopo_(corpo.idList, token);   // card fixo "NOVO PEDIDO" continua em primeiro (07/10/2026)
    if (soMO) {
      try {
        var avisoMO = String(p.aviso || '').trim();
        vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🤖 **Card aberto pela Rotina Unity** — orçamento só de mão de obra (sem peça de troca nem fornecimento)' +
          (extra.origemOrc ? ', ' + extra.origemOrc : '') + ': vai direto para **' + RC.LISTA_FIM + '** para registro e faturamento.' + (avisoMO ? '\n' + avisoMO : '') } }, token);
      } catch (e) {}
    } else if (rotina) {
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
  try { if (vdf_gravarOrdem_(card.id, p.dados.ordem, card)) cardCampos = true; } catch (e) { console.log('ordem: ' + e); }
  try { if (vdf_gravarUnidade_(card, n.unidade)) cardCampos = true; } catch (e) { console.log('unidade: ' + e); }
  if (cardCampos) { try { cf_sincronizar_(card.id); } catch (e) {} }
  vdf_linkComprador_(card, ctx, token, card.attachments || (p.shortLink ? null : []));   // anexos da leitura inicial; card novo ainda não tem o link 💰

  var nFo = 0;
  try { nFo = vdf_checklistFornecimento_(card.id, fo, token); } catch (e) {}
  try { vdf_registrarTrocasFo_(card, token, 'orçamento ' + (extra.origemOrc || ''), me.username); } catch (e) {}   // 27/10/2026: código trocado no FO fica registrado
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

  var anexados = 0, capaOk = false, repetidos = [], idsSubidos = [], idsLidos = [];
  // anexos que já estão no card (mesmo nome e tamanho) não sobem de novo
  var jaNoCard = [];
  if (p.shortLink && (p.fileIds || []).length) jaNoCard = card.attachments || [];   // da leitura inicial (nada subiu ainda nesta gravação)
  // o que o formulário sabe de cada arquivo (tipo: 'orc' | 'orc+' | 'capa' | ''; origem: Cilia/HDI/Websoma) — nome padronizado (05/10/2026)
  var infoArq = {}, textosForn = [], idsForn = [];
  (p.arquivos || []).forEach(function (x) { if (x && x.fileId) infoArq[x.fileId] = x; });
  (p.fileIds || []).forEach(function (fid) {
    try {
      var f = vdf_arquivoTemp_(fid);
      var ehCapa = p.capaId && fid === p.capaId;
      // o nome do anexo no Trello pode ter sido padronizado: compara pelo nome ORIGINAL do arquivo (fileName) e tamanho
      if (!ehCapa && jaNoCard.some(function (a) { return (a.fileName || a.name) === f.getName() && +a.bytes === f.getSize(); })) {
        repetidos.push(f.getName()); f.setTrashed(true); return;
      }
      // Status do Pedido mandado com o pedido (13/10/2026): texto guardado na prévia (ou lido agora) para aplicar no fim
      var txtForn = '';
      if ((infoArq[fid] || {}).tipo === 'forn') {
        try { txtForn = CacheService.getScriptCache().get(PV_CACHE_TXT + fid) || ''; } catch (e) {}
        if (!txtForn) { try { txtForn = vd_ocr_(f.getBlob(), f.getName()); } catch (e) { console.log('forn/ocr: ' + e); } }
        if (txtForn) textosForn.push(txtForn);
      }
      var mp = { file: f.getBlob(), name: f.getName() };
      if (ehCapa) mp.setCover = 'true';
      var at = vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: mp }, token);
      if (at && at.id) {
        idsSubidos.push(at.id);
        // orçamento que o formulário já leu e importou: o robô do complementar não pode ler de novo (09/10/2026, STG3I57:
        // PDF subido pelo formulário 65 min depois do card criado foi relido como "complementar" e repetiu peças)
        var tipoArq = (infoArq[fid] || {}).tipo;
        if (tipoArq === 'orc' || tipoArq === 'orc+') idsLidos.push(at.id);
        if (tipoArq === 'forn') idsForn.push(at.id);
      }
      if (ehCapa && at && at.id) { try { vd_api_('/cards/' + card.id, { method: 'put', payload: { idAttachmentCover: at.id } }, token); capaOk = true; } catch (e2) {} }
      if (at && at.id) {
        try {
          var inf = infoArq[fid] || {}, ehImg = /^image\//i.test(f.getMimeType() || '') || /\.(jpe?g|png|webp|gif)$/i.test(f.getName());
          var nomeAx = ehCapa ? ax_nome_(AX.FOTO, d.placa, ['capa'])
            : inf.tipo === 'orc' || inf.tipo === 'orc+' ? ax_nome_(inf.tipo === 'orc+' ? AX.ORC_MAIS : AX.ORC, d.placa, [vd_semSeguradora_(extra.tipo) ? '' : extra.seguradora, ax_origem_(inf.origem || extra.origemOrc)])
            : inf.tipo === 'forn' ? ax_nome_(AX.FO, d.placa, [pv_docFornecimento_(txtForn) || 'Status do Pedido'])
            : inf.tipo === 'peca' ? ax_nome_(AX.FOTO, d.placa, ['peça ' + String(inf.peca || '').replace(/[·|]/g, ' ').trim().toUpperCase().slice(0, 40)])
            : inf.tipo === 'outro' ? ''
            : ehImg ? ax_nome_(AX.FOTO, d.placa, []) : '';
          if (nomeAx) { at.name = ax_batizar_(card.id, at.id, nomeAx, jaNoCard, token, { semVersao: ehCapa || ehImg }); jaNoCard.push({ id: at.id, name: at.name, date: new Date().toISOString() }); }
        } catch (e3) { console.log('nome do anexo: ' + e3); }
      }
      f.setTrashed(true);
      anexados++;
    } catch (e) {}
  });

  // card novo de RETORNO (Weslley, 20/10/2026): sem foto de capa enviada, a capa do card anterior vem junto
  if (!p.shortLink && !capaOk) {
    var mRet = /card anterior[^\n]*?trello\.com\/c\/([A-Za-z0-9]{8})/i.exec(obs || '');
    var origemCapa = String(p.retornoDe || (mRet && mRet[1]) || '').trim();
    if (origemCapa) { try { capaOk = vdf_copiarCapa_(origemCapa, card, d.placa, token); } catch (e) { console.log('capa do retorno: ' + e); } }
  }

  // orçamento que o formulário leu agora (original ou complementar): o robô não precisa ler de novo o PDF que subiu
  if (idsLidos.length || idsForn.length) { try { cp_marcarVistos_(idsLidos.concat(idsForn)); } catch (e) {} }
  // orçamento complementar: comentário no card
  var compOf = pecas.filter(function (x) { return x.complemento && x.compData === cp_hoje_() && (!posCot || an.novas.some(function (nv) { return vd_chavePeca_(nv) === vd_chavePeca_(x); })); });
  if (comp) {
    try { cp_marcarVistos_(idsSubidos); } catch (e) {}
    // peça que passou de FO para oficina (06/10/2026): sai do checklist FORNECIMENTO (a linha da oficina já está no bloco)
    var paraOf = (comp.paraOficina || []).filter(function (x) { return x && x.itemId; });
    paraOf.forEach(function (x) { try { vd_api_('/cards/' + card.id + '/checkItem/' + x.itemId, { method: 'delete' }, token); } catch (e) { console.log('FO→oficina: ' + e); } });
    try { cp_revGuardar_(card.id, paraOf.map(function (x) { return x.nome; }), me.username); } catch (e) {}
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

  // 10/10/2026 (revisão): diretoria tirou do pedido uma peça já comprada — o item PAGAS ficava órfão (card nunca fechava e o
  // SLA cobrava peça que não existia mais). Agora o item sai junto, com comentário e evento.
  if (p.shortLink && vdf_ehAutorizador_(me)) {
    try {
      var novasCh = {}, novasDesc = {}; pecas.forEach(function (x) { novasCh[vd_chavePeca_(x)] = 1; if (!x.pneu) novasDesc[cp_norm_(x.descricao)] = 1; });
      // troca de código/descrição da mesma peça (orçamento complementar ou "manter cotação") não é remoção
      var antigos = {};
      (typeof trocas !== 'undefined' && trocas ? trocas : []).forEach(function (u) { antigos[cp_norm_(u.codigoAntigo)] = 1; });
      mantidas.forEach(function (x) { if (x.m.codigoAntigo) antigos[cp_norm_(x.m.codigoAntigo)] = 1; if (x.m.descricaoAntiga) antigos['D' + cp_norm_(x.m.descricaoAntiga)] = 1; });
      var sairam = vd_analisar_(card.desc, card.name).pecas.filter(function (x) {
        if (novasCh[vd_chavePeca_(x)]) return false;
        if (x.codigo && antigos[cp_norm_(x.codigo)]) return false;
        if (!x.pneu && (antigos['D' + cp_norm_(x.descricao)] || novasDesc[cp_norm_(x.descricao)])) return false;   // mesma descrição com código novo
        return true;
      });
      if (sairam.length) {
        var cPg = vd_api_('/cards/' + card.id, { query: { fields: 'name', checklists: 'all', checkItem_fields: 'name,state,due' } });
        var itensPg = vdf_itensRecebimento_(cPg).filter(function (i) { return /^PAGAS/.test(i.lista); }), tirados = [], evsT = [];
        sairam.forEach(function (x) {
          var k = vd_chavePeca_(x);
          itensPg.filter(function (i) { return vd_casaItem_(i.base, k); }).forEach(function (i) {
            vd_api_('/cards/' + card.id + '/checkItem/' + i.id, { method: 'delete' }, token);
            var pt = i.base.split(/\s+-\s+/);
            tirados.push(pt[0] + (pt[1] ? ' (' + pt[1] + ')' : '') + (i.ok ? ' — já recebida' : ''));
            evsT.push({ peca: pt[0], fornecedor: pt[1] || '', detalhe: 'peça removida do pedido pela diretoria · item ' + i.lista + ' retirado' + (i.ok ? ' (já recebida)' : '') });
          });
        });
        if (tirados.length) {
          try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🗑️ **Peça removida do pedido com compra registrada** — ' + me.fullName + ': ' + tirados.join('; ') + '. O item saiu do checklist PAGAS; se a peça já foi paga, verificar compra do item com o fornecedor.' } }, token); } catch (e) {}
          try { ev_registrar_('COMPRA CANCELADA', card, me.username, evsT, { detalhe: 'peça removida do pedido' }); } catch (e) {}
        }
      }
    } catch (e) { console.log('peça removida/PAGAS: ' + e); }
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
      // 27/10/2026 (BBI3942, 30 s para criar o card): foto/capa/outro anexo que acabou de subir não passa pelo OCR AGORA
      // (7 s cada, com a pessoa esperando) — o orçamento já foi lido antes de salvar; o robô lê o resto no próximo ciclo se precisar.
      VD_PULAR_ANEXOS = idsSubidos.filter(function (id) { return idsLidos.indexOf(id) < 0 && idsForn.indexOf(id) < 0; });
      try { acao = vd_conferirCard_(c2, ctx).acao; } finally { VD_PULAR_ANEXOS = []; }
    } else if (soMO) {
      // só mão de obra: base de peças registrada já (a regra de peça nova das colunas depois da cotação parte daqui)
      vd_pkSet_(card.id, vd_linhasConsultor_(an.div.bloco).map(vd_sigItem_));
      acao = 'card em ' + RC.LISTA_FIM + ' (só mão de obra)';
    }
    vd_marcar_(c2);
  } catch (e) {}
  // Status do Pedido mandado com o pedido: lança fornecedor e previsão nas FO do card (mesmas regras da aba Fornecimento)
  var forn = null;
  if (textosForn.length) {
    try { forn = pv_fornDoPedido_(token, card.shortLink, textosForn); }
    catch (e) { console.log('fornecimento do pedido: ' + e); forn = { n: 0, erro: String((e && e.message) || e).slice(0, 160), faltas: [], avisos: [], extras: [], faltando: [] }; }
  }
  try {
    var evPecas = (posCot ? novasPecas : an.pecas).map(ev_peca_);
    ev_registrar_(!p.shortLink ? 'PEDIDO' : (posCot && novasPecas.length ? 'PEÇA NOVA' : 'PEDIDO EDITADO'), { name: card.name, shortLink: card.shortLink, shortUrl: card.shortUrl, labels: (typeof c2 !== 'undefined' && c2 && c2.labels) || [] },
      me.username, evPecas, { tipo: tipo, detalhe: soMO ? 'só mão de obra → ' + RC.LISTA_FIM : (nFo ? nFo + ' peça(s) FO' : '') });
  } catch (e) {}

  if (trocasPart.paraPart.length || trocasPart.paraSeg.length) {
    try {
      var eqTp = vdf_equipeDoCard_(card);
      var donosTp = (eqTp.length ? eqTp : trocasPart.paraPart.map(function (x) { return x.por; })).filter(function (u, i, a) { return u && u !== String(me.username).toLowerCase() && a.indexOf(u) === i; });
      vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: vdf_mencao_(donosTp) + '🔀 **QUEM PAGA MUDOU** — ' + me.fullName +
        (trocasPart.paraPart.length ? '\n👤 Passou para **particular** (cliente paga · autoriza o consultor): ' + trocasPart.paraPart.map(function (x) { return x.nome; }).join('; ') : '') +
        (trocasPart.paraSeg.length ? '\n🛡️ Voltou para a **seguradora** (autoriza a diretoria): ' + trocasPart.paraSeg.map(function (x) { return x.nome; }).join('; ') : '') } }, token);
    } catch (e) {}
    try { ev_registrar_('PEDIDO EDITADO', card, me.username, trocasPart.paraPart.concat(trocasPart.paraSeg).map(function (x) { return { peca: x.nome, detalhe: '' }; }), { detalhe: 'quem paga mudou: ' + trocasPart.paraPart.length + ' → particular · ' + trocasPart.paraSeg.length + ' → seguradora' }); } catch (e) {}
  }
  // 21/10/2026 (Weslley, AGL5650: "não tem quem incluiu e pediu as peças"): edição do pedido deixa no card QUEM fez e O QUE
  // mudou — peça incluída, tipo definido/trocado, peça tirada, 🚫 não comprar (com motivo). Sem @menção (o prazo avisa).
  try {
    if (pecasAntes) {
      var incl = [], tipoDef = [], naoNovas = [], tiradas = [], agoraCh = {};
      pecas.forEach(function (x) {
        var k = vd_chavePeca_(x), ant = pecasAntes[k]; agoraCh[k] = 1;
        var nmX = vd_nomePeca_(x), tpX = (x.tipos || []).join('/');
        if (x.naoComprar) { if (!naoAntes[k]) naoNovas.push(nmX + (x.naoMotivo ? ' (' + x.naoMotivo + ')' : '')); return; }
        if (!ant) { incl.push(nmX + (tpX ? ' · ' + tpX : '')); return; }
        var tpA = (ant.tipos || []).join('/');
        if (tpX && tpX !== tpA) tipoDef.push(nmX + ': ' + (tpA ? tpA + ' → ' : '') + tpX);
      });
      Object.keys(pecasAntes).forEach(function (k) { if (!agoraCh[k] && !pecasAntes[k].naoComprar) tiradas.push(vd_nomePeca_(pecasAntes[k])); });
      if (incl.length || tipoDef.length || naoNovas.length || tiradas.length) {
        vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '✏️ **PEDIDO EDITADO** — ' + me.fullName + ' (' + me.username + ')' +
          (incl.length ? '\n➕ Incluiu: ' + incl.join('; ') : '') + (tipoDef.length ? '\n🏷️ Tipo definido: ' + tipoDef.join('; ') : '') +
          (tiradas.length ? '\n➖ Tirou do pedido: ' + tiradas.join('; ') : '') + (naoNovas.length ? '\n🚫 Não comprar: ' + naoNovas.join('; ') : '') } }, token);
      }
    } else {
      var naoNovo = pecas.filter(function (x) { return x.naoComprar; });
      if (naoNovo.length) vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🚫 **NÃO COMPRAR** — ' + me.fullName + ' (' + me.username + ') marcou como não comprar: ' + naoNovo.map(function (x) { return vd_nomePeca_(x) + (x.naoMotivo ? ' (' + x.naoMotivo + ')' : ''); }).join('; ') } }, token);
    }
  } catch (e) {}
  return { ok: true, url: card.shortUrl, shortLink: card.shortLink, nome: card.name, acao: acao, novo: !p.shortLink, fo: nFo, foComp: nFoComp, comp: compOf.length, pagas: nPagas, anexos: anexados, capa: capaOk, repetidos: repetidos, forn: forn };
}

// FormularioServidor.gs:2912
function vdf_subirArquivo(token, base64, mime, nome) {
  vdf_usuario_(token);
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, nome);
  return { fileId: vdf_pastaTemp_().createFile(blob).getId() };
}

// FormularioServidor.gs:2924
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
  var faltas = [], linhas = [], novas = {}, ordem = [], afetadas = [], evs = [], resumo = [], semNova = 0;
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
    var novaTxt = '';
    if (n && String(n.fornecedor || '').trim()) {
      var nf = foNome(n.fornecedor), nv = vd_valorNum_(n.valor), nd = String(n.dias == null ? '' : n.dias).trim(), nt = vd_tipoNorm_(n.tipo || '') || '', nm = String(n.marca || '').trim().toUpperCase();
      if (isNaN(nv) || nv <= 0) { faltas.push(nomeP + ': valor da cotação nova inválido'); return; }
      if (nd !== '' && !/^\d+$/.test(nd)) { faltas.push(nomeP + ': prazo da cotação nova em dias úteis (número)'); return; }
      var nl = vdf_linkCot_(n.link);   // link do anúncio da cotação nova (compra online), 07/10/2026
      if (nl === null) { faltas.push(nomeP + ': link da cotação nova inválido — cole o endereço completo, começando com http (ou deixe vazio)'); return; }
      if (!novas[nf]) { novas[nf] = []; ordem.push(nf); }
      novas[nf].push(nomeP + (nt || nm ? ' - ' + [nt, nm].filter(String).join(' ') : '') + ' - ' + vd_valorBR_(nv) + (nd !== '' ? ' - ' + nd + (nd === '1' ? ' dia útil' : ' dias úteis') : '') + (nl ? ' - [🔗 link](' + nl + ')' : ''));
      var e2 = ev_peca_(peca); e2.fornecedor = nf; e2.valor = nv; e2.dias = nd; e2.detalhe = 'cotação nova (no lugar da indisponível)'; evs.push(e2);
      novaTxt = nf + (nt || nm ? ' · ' + [nt, nm].filter(String).join(' ') : '') + ' · ' + vd_valorBR_(nv) + (nd !== '' ? ' · ' + nd + (nd === '1' ? ' dia útil' : ' dias úteis') : '');
    }
    if (!novaTxt) semNova++;
    resumo.push('- **' + nomeP + '**: ' + forn + ' ' + vd_valorBR_(valor) + ' indisponível — ' + motivo + '\n  ' + (novaTxt ? '↪️ cotação nova: **' + novaTxt + '**' : '↪️ sem cotação nova: volta para cotação'));
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
  // 16/10/2026: peça sem cotação nova precisa ser cotada antes — o card vai para EM COTAÇÃO mesmo que outra peça tenha trazido nova
  // (a nova fica guardada e vai para a autorização junto com a cotação que falta)
  var destino = (!temNova || semNova) ? VD.LISTA_COTACAO : (soPart ? VDF_LISTA_FINALIZADA : VDF_LISTA_PENDENTE);
  var movido = '';
  try { movido = vdf_moverPara_(card, ctx, destino, token, me.username); } catch (e) {}
  try {
    var us = [];
    if (temNova) afetadas.forEach(function (x) { if (vdf_pecaParticular_(x, card, an)) us = us.concat(vdf_donosPart_(card, x, criador)); else us = us.concat(sla_users_('SLA_AUTORIZAR', 'timweslley,comercialunity')); });
    us = us.filter(function (u, i) { return u && u !== me.username && us.indexOf(u) === i; });
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: vdf_mencao_(us) + '⚠️ **COTAÇÃO INDISPONÍVEL** — ' + me.fullName + (movido ? ' → **' + movido + '**' : '') + '\n' +
      // 16/10/2026: no quadro TESTE (2.0) o comentário traz a cotação nova; no principal fica o texto de antes até a migração
      (vd_v2_() ? resumo.join('\n') + (!semNova ? '\n✅ Autorizar de novo pela aba Autorizar (a cotação nova já vem marcada).' : temNova ? '\n🔁 Falta cotar ' + (semNova === 1 ? 'a peça sem cotação nova' : 'as peças sem cotação nova') + ' — depois a cotação vai para autorização junto com a nova.' : '\n🔁 Sem cotação nova: volta para cotação.')
        : linhas.map(function (l) { return '- ' + l.replace(/^INDISPON[IÍ]VEL:\s*/i, ''); }).join('\n') + (temNova ? '\n↪️ Cotação nova: autorizar de novo.' : '\n↪️ Sem cotação nova: volta para cotação.')) } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: linhas.length, nova: temNova, semNova: semNova, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

// FormularioServidor.gs:3001
function vdf_complExige_(peca, card, an) {
  if (!peca || !peca.complemento || peca.particular) return false;
  if (vd_semSeguradora_(an.dados.tipo) || vdf_ehParticular_(card, an)) return false;
  return true;
}

// FormularioServidor.gs:3007
function vdf_complNorm_(status, por) {
  var st = vd_semAcento_(String(status || '')).toUpperCase().replace(/[^A-Z]/g, '');
  if (!/^(AUTORIZADO|ANTECIPADO)$/.test(st)) return null;
  return { status: st, por: st === 'ANTECIPADO' ? String(por || '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '/').trim().slice(0, 60).toUpperCase() : '' };
}

// FormularioServidor.gs:3013
function vdf_regravarLinhasPeca_(card, pecas, token) {
  var div = vd_dividir_(card.desc), bloco = div.bloco, mexeu = false;
  pecas.forEach(function (peca) {
    var linhaNova = vd_linhaPeca_(peca, 0).replace(/^1\. /, ''), feito = false;
    bloco = bloco.split('\n').map(function (l) {
      if (feito || vd_sigItem_(l) !== peca.sig) return l;
      feito = true; mexeu = true;
      var mNum = l.match(/^(\s*\d+\s*[.)\-]\s*)/);
      return (mNum ? mNum[1] : '') + linhaNova;
    }).join('\n');
  });
  if (!mexeu) return false;
  var resto = div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR;
  var novaDesc = bloco.replace(/\s+$/, '') + '\n\n' + resto;
  vd_gravarDesc_(card.id, novaDesc, token);
  try { vd_pkSet_(card.id, vd_linhasConsultor_(bloco).map(vd_sigItem_)); } catch (e) {}
  return true;
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

// Migracao.gs:60
function mg_item_(txt) {
  var s = vd_limpar_(String(txt || '')).trim();
  s = s.replace(/^\s*(?:\d{1,3}\s*[.)]|[-•*✔✓☐☑])\s*/, '').trim();   // numeração/bullet (não um código numérico seguido de " - ")
  var partes = s.split(/\s+-\s+|\s+[–—]\s+/);
  if (partes.length > 1 && /R\$|\d+[.,]\d{2}\b|\bDIAS?\b|PREVIS/i.test(partes.slice(1).join(' '))) s = partes[0].trim();
  var qtd = '';
  var mq = s.match(/\b(?:QTD\.?\s*:?\s*(\d+)|(\d+)\s*(?:X|UN|PÇ|PC)S?\.?)\s*$/i);
  if (mq) { qtd = mq[1] || mq[2]; s = s.slice(0, mq.index).trim(); }
  var pneu = s.match(/\bPNEUS?\b.*?(\d{3}\/\d{2}\s*Z?R\s*\d{2}(?:[.,]5)?)/i) || s.match(/^(\d{3}\/\d{2}\s*Z?R\s*\d{2})/i);
  if (pneu) {
    var medida = pneu[1].replace(/\s+/g, '').toUpperCase();
    var marca = s.replace(/\bPNEUS?\b/i, '').replace(pneu[1], '').replace(/^\s*[A-Z0-9]*\d[A-Z0-9]*\s+/i, '').replace(/\s+/g, ' ').trim();   // tira só um código numérico na frente
    return { pneu: true, medida: medida, categoria: vd_categPneu_(marca), marca: vd_categPneu_(marca) ? '' : marca, qtd: qtd };
  }
  var toks = s.split(/\s+/), codigo = '', descricao = s;
  var ehCod = function (t) { t = String(t || '').replace(/[^A-Z0-9\-.\/]/gi, ''); return /\d/.test(t) && t.replace(/[^A-Z0-9]/gi, '').length >= 4 && !/^\d{1,3}$/.test(t) && !/^\d{2,4}\/\d{2,4}$/.test(t); };
  if (toks.length > 1 && ehCod(toks[0])) { codigo = toks[0].replace(/[^A-Z0-9\-.\/]/gi, '').toUpperCase(); descricao = toks.slice(1).join(' '); }
  else if (toks.length > 1 && ehCod(toks[toks.length - 1]) && toks[toks.length - 1].replace(/[^A-Z0-9]/gi, '').length >= 6) { codigo = toks[toks.length - 1].replace(/[^A-Z0-9\-.\/]/gi, '').toUpperCase(); descricao = toks.slice(0, -1).join(' '); }
  descricao = descricao.replace(/^[\s:\-–]+/, '').trim().toUpperCase();
  return { pneu: false, codigo: codigo, descricao: descricao, tipos: [], qtd: qtd };
}

// Migracao.gs:84
function mg_itemPagas_(nome) {
  var s = vd_limpar_(String(nome || '')).trim(), valor = '';
  if (/^(NOTA FISCAL|NF\b|NFE?\b|FRETE|BOLETO)/i.test(s)) return null;   // não é peça
  var mv = s.match(/\s*-?\s*R\$\s*([\d.]+(?:,\d{1,2})?)\s*$/i);
  if (mv) { valor = mv[1]; s = s.slice(0, mv.index).trim(); }
  var partes = s.split(/\s*-\s*/).map(function (x) { return x.trim(); }).filter(String), fornecedor = '', resto = s;
  if (partes.length >= 2) {
    var ehCodigoOuPeca = function (t) { return /\d{4,}/.test(t.split(/\s+/)[0]) || /\d{4,}/.test(t.split(/\s+/).pop()); };
    if (ehCodigoOuPeca(partes[0]) && !ehCodigoOuPeca(partes[partes.length - 1])) { fornecedor = partes[partes.length - 1]; resto = partes.slice(0, -1).join(' - '); }   // formato novo
    else { fornecedor = partes[0]; resto = partes.slice(1).join(' - '); }   // formato antigo
    if (/^\d/.test(fornecedor) && !mg_ehFornecedor_(fornecedor)) { fornecedor = ''; resto = s; }
  }
  var it = mg_item_(resto);
  it.fornecedor = fornecedor.toUpperCase();
  it.valor = valor;
  var cab = it.pneu ? 'PNEU ' + it.medida + (it.marca || it.categoria ? ' ' + (it.marca || it.categoria) : '') : ((it.codigo ? it.codigo + ' ' : '') + it.descricao);
  it.nomeNovo = cab + (it.fornecedor ? ' - ' + it.fornecedor : '') + (valor ? ' - ' + vd_valorBR_(valor) : '');
  return it;
}

// Migracao.gs:106
function mg_ehFornecedor_(l) {
  if (MG_FORN === null) { MG_FORN = {}; try { fo_lista_().forEach(function (f) { MG_FORN[fo_norm_(f.nome)] = 1; (f.apelidos || []).forEach(function (a) { MG_FORN[fo_norm_(a)] = 1; }); }); } catch (e) {} }
  var n = fo_norm_(l).replace(/\s+(NT|ND|PE|LINK|GENUINO|USADA|USADO)$/, '').trim();
  return !!MG_FORN[n] || /^(MERCADO LIVRE|ML|SHOPEE|AMAZON)\b/i.test(n);
}

// Migracao.gs:112
function mg_ehConsulta_(l) { return mg_ehFornecedor_(l) || /(\s-?\s*(NT|ND|N\/T|N[ÃA]O TEM)|\s[-–])\s*$/i.test(l); }

// Migracao.gs:113
function mg_ehItem_(l) {
  if (!l || l.length > 90 || /:/.test(l) || !/[A-Za-zÀ-ú]{3,}/.test(l)) return false;
  if (l.split(/\s+/).length > 12 || /\b(PRECISO|GENTILEZA|CONSIDERAR|PODE SER|SE N[ÃA]O|FAVOR|OBRIGAD|APRESENTAR|SOMENTE|APENAS)\b/i.test(l)) return false;
  if (/^[A-Z]{3}[\s-]?\d[A-Z0-9]\d{2}\b/.test(l) || /\b[A-HJ-NPR-Z0-9]{17}\b/.test(l)) return false;   // placa / chassi
  if (mg_ehConsulta_(l)) return false;
  if (/R\$|\d+[.,]\d{2}\b|\b(DIAS?|PRAZO|PREVIS|ENTREG|CHEG|PAGO|PAGA|NOTA|NF|ORÇAMENTO|FATUR)\b/i.test(l)) return false;
  if (/^(FOTOS?|SEGUE|EM ANEXO|OBS|AGUARD|CONFORME|VERIFICAR|FOI |SER[ÁA] |COMPRAR|COTAR|PE[ÇC]AS|PEDIDO|N[ÃA]O |JA |J[ÁA] |CLIENTE|LIBERADO|AUTORIZAD)/i.test(l)) return false;
  return true;
}

// Migracao.gs:122
function mg_ehRotulo_(l) { return /^\s*(MODELO|VE[IÍ]CULO|ANO|MOTOR|CHASSI|PLACA|COR|SEGURADORA|SINISTRO|TIPO|OBS|OBSERVA[ÇC][ÃA]O|UNIDADE|CONSULTOR)\b/i.test(l) || /^\s*COMPRAR\b.*\d{1,2}\/\d{1,2}/i.test(l); }

// Migracao.gs:123
function mg_ehSeparador_(l) { return /^[\\\-=_ .~]{3,}$/.test(l); }

// Migracao.gs:126
function mg_pecasDoTexto_(desc, modeloLinha) {
  modeloLinha = String(modeloLinha || '').trim();
  var linhas = vd_limpar_(desc).split('\n').map(function (l) { return l.trim(); }), ini = -1, i;
  for (i = 0; i < linhas.length; i++) {
    if (/^(PE[ÇC]AS|COTAR|PEDIDO|COMPRAR|ITENS)\s*(PE[ÇC]AS)?\s*:?\s*$/i.test(linhas[i]) || /^(PE[ÇC]AS|COTAR)\s*:\s*\S/i.test(linhas[i])) { ini = i; break; }
  }
  var out = [], vazias = 0, comecou = false;
  if (ini >= 0) {
    var primeiro = linhas[ini].replace(/^(PE[ÇC]AS|COTAR|PEDIDO|COMPRAR|ITENS)\s*(PE[ÇC]AS)?\s*:?\s*/i, '').trim();
    if (primeiro) { out.push(primeiro); comecou = true; }
    for (i = ini + 1; i < linhas.length; i++) {
      var l = linhas[i];
      if (!l) { if (comecou && ++vazias > 1) break; continue; }
      if (mg_ehSeparador_(l) || /^(FORNECIMENTO|FO\b)/i.test(l)) break;
      if (/R\$\s*\d|\d{2,}[.,]\d{1,2}\s*$/.test(l) && comecou) break;
      if (mg_ehConsulta_(l) || (!mg_ehItem_(l) && !/^\d/.test(l) && !/\s-\s/.test(l))) { if (comecou) break; else continue; }
      out.push(l); comecou = true; vazias = 0;
    }
    return out;
  }
  // sem cabeçalho: primeiro bloco de linhas que parecem itens (depois dos rótulos MODELO/CHASSI/PLACA)
  for (i = 0; i < linhas.length; i++) {
    var l2 = linhas[i];
    if (!l2) { if (comecou && ++vazias > 1) break; continue; }
    if (mg_ehRotulo_(l2) || mg_ehSeparador_(l2)) { if (comecou) break; else continue; }
    if (!comecou && (/\b(19[89]\d|20[0-4]\d)(\s*\/\s*(19[89]\d|20[0-4]\d))?\s*$/.test(l2) || l2 === modeloLinha)) continue;   // linha do modelo
    if (/R\$\s*\d|\d{2,}[.,]\d{1,2}\s*$/.test(l2) || mg_ehConsulta_(l2)) { if (comecou) break; else continue; }
    var item = mg_ehItem_(l2) || (/^[A-Z0-9][A-Z0-9\-.\/]{3,}\s*[-–:]\s*\S/i.test(l2) && !/R\$/.test(l2));
    if (item) { out.push(l2); comecou = true; vazias = 0; }
    else if (comecou) break;
  }
  return out.filter(function (l) { return l.length > 2; });
}

// Migracao.gs:161
function mg_modeloDoTexto_(desc) {
  var linhas = vd_limpar_(desc).split('\n');
  for (var i = 0; i < Math.min(linhas.length, 6); i++) {
    var l = linhas[i].trim();
    if (!l || /:/.test(l) || /R\$|COTAR|PE[ÇC]AS|FOTO/i.test(l)) continue;
    if (l.length < 8 || l.length > 90 || !/[A-Z]{3,}/.test(l) || l !== l.toUpperCase()) continue;
    var carro = /\b(19[89]\d|20[0-4]\d)\b/.test(l) || /\b(FIAT|VW|VOLKS|CHEVROLET|GM|FORD|HONDA|TOYOTA|HYUNDAI|RENAULT|NISSAN|JEEP|BMW|AUDI|MERCEDES|PEUGEOT|CITRO|KIA|MITSUBISHI|BYD|GWM|CAOA|CHERY|RAM|DODGE|VOLVO|LAND ROVER|JAC|SUZUKI|YAMAHA|IVECO|SCANIA|PORSCHE|MINI|LEXUS|SUBARU|TROLLER|HAVAL|OMODA|JAECOO)\b/.test(l);
    if (carro) return l;
  }
  return '';
}

// Migracao.gs:174
function mg_ordemDosComentarios_(comentarios) {
  var ns = {};
  (comentarios || []).forEach(function (t) {
    var re = /\b(?:O\.?\s*S\.?|ORDEM(?:\s+DE\s+SERVI[ÇC]O)?)\s*(?:N[ºo°.]*\s*)?:?\s*(\d{3,6})\b/gi, m;
    while ((m = re.exec(String(t || '')))) ns[m[1]] = (ns[m[1]] || 0) + 1;
  });
  var melhor = '', q = 0;
  Object.keys(ns).forEach(function (k) { if (ns[k] > q) { q = ns[k]; melhor = k; } });
  return melhor;
}

// Migracao.gs:185
function mg_neutralizar_(txt) { return String(txt || '').replace(/(^|[^A-Za-z0-9_.])@(?=[A-Za-z0-9_]{3,})/g, '$1👤'); }

// Migracao.gs:191
function mg_converter_(card, comentarios, opt) {
  opt = opt || {};
  var desc = String(card.desc || ''), limpo = vd_limpar_(desc);
  var nome = card.name || '';
  var placa = vd_normPlaca_((vd_campo_(limpo, VD_ROT.placa).split(/[\s(]/)[0]) || '') || vd_placaDoTexto_(nome) || '';
  var d = {
    modelo: vd_campo_(limpo, VD_ROT.modelo) || mg_modeloDoTexto_(desc),
    ano: vd_campo_(limpo, VD_ROT.ano),
    motor: vd_campo_(limpo, VD_ROT.motor),
    chassi: vd_normChassi_(vd_campo_(limpo, VD_ROT.chassi).split(/[\s(]/)[0]),
    placa: placa
  };
  if (!d.ano && d.modelo) { var am = d.modelo.match(/\b(19[89]\d|20[0-4]\d)\b/g); if (am) { d.ano = am.slice(0, 2).join('/'); d.modelo = d.modelo.replace(/\s*\b(19[89]\d|20[0-4]\d)(\s*\/\s*(19[89]\d|20[0-4]\d))?\b\s*$/, '').trim(); } }
  var t = vdf_partesTitulo_(nome, { modelo: d.modelo });
  var tipo = vd_tipoNormPedido_(vd_campo_(limpo, VD_ROT_EXTRA.tipo)) || (/\bPARTICULAR\b/i.test(nome) || /PARTICULAR/i.test((card.labels || []).map(function (l) { return l.name; }).join(' ')) ? 'PARTICULAR' : /\bRETORNO\b/i.test(nome) ? 'RETORNO' : 'SEGURADORA');
  var seguradora = vd_campo_(limpo, VD_ROT_EXTRA.seguradora) || (vd_semSeguradora_(tipo) ? '' : t.seguradora);
  var sinistro = vd_campo_(limpo, VD_ROT_EXTRA.sinistro);

  // peças da oficina: checklist PAGAS* > bloco no texto
  var fonte = 'nenhuma', pecas = [], fo = [], renomear = [], compras = 0;
  (card.checklists || []).forEach(function (k) {
    var n = String(k.name || '').trim();
    if (/^PAGAS/i.test(n)) (k.checkItems || []).forEach(function (i) {
      var it = mg_itemPagas_(i.name); if (!it) return;
      pecas.push(it); if (it.fornecedor || it.valor) compras++;
      if (it.nomeNovo && it.nomeNovo !== String(i.name).trim()) renomear.push({ de: String(i.name).trim(), para: it.nomeNovo });
    });
    else if (/^FORNECIMENTO/i.test(n)) (k.checkItems || []).forEach(function (i) { fo.push(mg_item_(i.name)); });
  });
  if (pecas.length) fonte = 'checklist PAGAS';
  else {
    var lp = mg_pecasDoTexto_(desc, vd_campo_(limpo, VD_ROT.modelo) ? '' : mg_modeloDoTexto_(desc));
    if (lp.length) { pecas = lp.map(mg_item_); fonte = 'texto da descrição'; }
    else if (fo.length) fonte = 'só fornecimento (checklist FORNECIMENTO)';
  }
  pecas = pecas.filter(function (p) { return p.pneu ? p.medida : p.descricao; });
  if (tipo === 'PARTICULAR') pecas.forEach(function (p) { p.particular = false; });   // pedido particular: o TIPO: PARTICULAR já marca tudo

  var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  var extra = { tipo: tipo, cor: t.cor, seguradora: seguradora, sinistro: sinistro, fo: fo };
  var bloco = vd_montarBloco_(d, opt.semPecas ? [] : pecas, '', opt.rodape || ('Convertido do fluxo antigo pelo robô em ' + hoje + ' — tipo de peça e cotações antigas: ver o texto original abaixo'), extra);
  var original = mg_neutralizar_(desc).trim();
  var descNova = bloco + '\n\n' + VD.MARCADOR + (original ? '\n_(texto que estava no card antes da conversão)_\n' + original : '');
  var an = vd_analisar_(descNova, nome);
  return {
    desc: descNova, renomear: renomear, pecasAntigas: pecas,
    info: { fonte: fonte, pecas: pecas.length, fo: fo.length, compras: compras, modelo: d.modelo, ano: d.ano, chassi: d.chassi, tipo: tipo,
            ordem: mg_ordemDosComentarios_(comentarios), avisos: an.faltas.slice(0, 6).join(' | ') + (an.faltas.length > 6 ? ' (+' + (an.faltas.length - 6) + ')' : '') }
  };
}

// Migracao.gs:355
function mg_voltaExecutar_() {
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO' || vd_prop_('MG_VOLTA_LIGADO', 'SIM') === 'NAO') return 0;
  var ctx = vd_contexto_(), n = 0, prazo = vd_prazo_(60 * 1000);
  var desde = vd_marca_('MG_VOLTA_ACT');
  if (!desde) {
    vd_marcaSet_('MG_VOLTA_ACT', new Date().toISOString());
    MG_VOLTA.INICIAL.forEach(function (sl) {
      try { if (mg_voltaConverter_(sl, '', ctx)) n++; } catch (e) { console.log('volta p/ cotação (inicial) ' + sl + ': ' + e); }
    });
    return n;
  }
  var acts = vd_acoesQuadro_(ctx.board, { filter: 'updateCard:idList', since: desde, limit: 1000, fields: 'data,date' }) || [];
  acts.reverse();   // mais antigo primeiro
  var ultima = desde, feitos = {}, props = PropertiesService.getScriptProperties();
  for (var k = 0; k < acts.length; k++) {
    if (Date.now() > prazo) break;
    var a = acts[k], d = a.data || {}, c = d.card || {};
    var proxima = new Date(Date.parse(a.date) + 1).toISOString();
    if (!c.id || !d.listAfter || !d.listBefore || feitos[c.id]) { ultima = proxima; continue; }
    var para = vd_nomeColuna_(d.listAfter.name), de = vd_nomeColuna_(d.listBefore.name);
    if (MG_VOLTA.COTACAO.indexOf(para) < 0 || MG_VOLTA.COTACAO.indexOf(de) >= 0) { ultima = proxima; continue; }
    if (vdf_cardProtegido_(c.name || '') || /^\s*AVISO\b/i.test(c.name || '') || !vd_legado_(c.id)) { ultima = proxima; continue; }
    feitos[c.id] = 1;
    try { if (mg_voltaConverter_(c.id, de, ctx)) n++; }
    catch (e) {
      // erro (Trello/planilha fora do ar): tenta de novo no ciclo seguinte, até 3 vezes; depois segue em frente
      var kErr = 'MG_VOLTA_ERR_' + c.id, t = +(props.getProperty(kErr) || 0) + 1;
      console.log('volta p/ cotação ' + (c.name || c.id) + ' (tentativa ' + t + '): ' + e);
      if (t < MG_VOLTA.MAX_TENTATIVAS) { props.setProperty(kErr, String(t)); break; }
      props.deleteProperty(kErr);
    }
    ultima = proxima;
  }
  vd_marcaSet_('MG_VOLTA_ACT', ultima);
  return n;
}

// Migracao.gs:394
function mg_mesmaBase_(a, b) {
  var pa = cp_palavras_(a), pb = cp_palavras_(b), fa = cp_fortes_(pa), fb = cp_fortes_(pb);
  // a peça-base de um aparece entre as palavras do outro: "ESPELHO RETROVISOR ESQ" x "RETROVISOR LE" (12/10/2026, BDK2J49)
  if (!fa.length || !fb.length || (fb.indexOf(fa[0]) < 0 && fa.indexOf(fb[0]) < 0)) return false;
  var xa = cp_posicoes_(pa), xb = cp_posicoes_(pb);
  return !Object.keys(xa).some(function (e) { return xb[e] && xb[e] !== xa[e]; });
}

// Migracao.gs:403
function mg_voltaConverter_(idOuShortLink, de, ctx) {
  var card = vd_api_('/cards/' + idOuShortLink, { cru: true, query: { fields: 'name,desc,idList,shortLink,shortUrl,labels,closed', checklists: 'all', checkItem_fields: 'name,state', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url,date' } });
  if (!card || card.closed) return false;
  var col = vd_nomeColuna_(vdf_nomeLista_(ctx, card.idList));
  if (MG_VOLTA.COTACAO.indexOf(col) < 0) return false;   // já saiu da cotação
  if (!vd_legado_(card.id)) return false;                 // já foi salvo pelo formulário
  var comentarios = [];
  try { comentarios = (vd_api_('/cards/' + card.id + '/actions', { cru: true, query: { filter: 'commentCard', limit: 50, fields: 'data' } }) || []).map(function (a) { return a.data && a.data.text; }); } catch (e) {}
  var comPecas = mg_converter_(card, comentarios);   // pedido antigo como peças: base para saber o que já foi pedido
  var placa = vd_analisar_(comPecas.desc, card.name).dados.placa;
  var seg = vd_semAcento_(card.name || '') + ' ' + vd_semAcento_(vd_campo_(vd_limpar_(comPecas.desc), VD_ROT_EXTRA.seguradora) || '');
  var avisar = function (txt) { try { vd_comentar_(card, txt); } catch (e) {} };
  var cab = '🔄 **Card antigo voltou para cotação**' + (de ? ' (veio de ' + de + ')' : '') + ': ';

  if (/\bRETORNO\b/.test(seg)) { avisar(cab + 'card de RETORNO — para passar para o sistema novo, incluir as peças do retorno pelo ✏️ EDITAR/INCLUIR PEÇA e salvar.'); return false; }

  // orçamento mais recente anexado, da mesma placa
  var anexos = (card.attachments || []).filter(vd_anexoLegivel_).sort(function (x, y) { return Date.parse(y.date) - Date.parse(x.date); });
  var orc = null, anexo = null, origem = '';
  for (var i = 0; i < anexos.length && i < 5 && !orc; i++) {
    var r = null; try { r = vd_lerAnexoTrello_(anexos[i], { orcCompleto: true }); } catch (e) { console.log('volta/anexo: ' + e); }
    if (!r || r.erro || !r.orcamento) continue;
    if (!placa || !(r.placas || []).some(function (p) { return vd_mesmaPlaca_(p, placa); })) continue;
    if (r.orcamento === 'CILIA' && /\bHDI\b/.test(seg)) continue;   // sinistro HDI: quem manda é o laudo HDI (11/10/2026)
    orc = r.orcFull || (r.orc ? { oficina: vd_orcExpandir_(r.orc.o), fo: vd_orcExpandir_(r.orc.f) } : null);
    anexo = anexos[i]; origem = r.orcamento;
  }
  if (!orc) { avisar(cab + 'não achei orçamento legível desta placa anexado. Para passar para o sistema novo, incluir as peças novas pelo ✏️ EDITAR/INCLUIR PEÇA e salvar.'); return false; }
  orc = vd_orcCss_(orc, card.name);

  var cmp = cp_comparar_({ name: card.name, desc: comPecas.desc, checklists: card.checklists, attachments: card.attachments }, orc, anexo.id);
  // o que sobrou e é a mesma peça-base de uma peça do pedido antigo (texto livre): conta como já pedida
  var antigas = (comPecas.pecasAntigas || []).filter(function (p) { return !p.pneu && p.descricao; }), usadas = {}, doAntigo = [];
  cmp.oficina = cmp.oficina.filter(function (p) {
    if (p.pneu) return true;
    for (var j = 0; j < antigas.length; j++) {
      if (!usadas[j] && mg_mesmaBase_(p.descricao || p.descricaoOrc || '', antigas[j].descricao)) { usadas[j] = 1; doAntigo.push(cp_nome_(p) + ' ≈ ' + antigas[j].descricao); cmp.jaTinha++; return false; }
    }
    return true;
  });
  // a Rotina (Cilia) já comparou as versões do orçamento e comentou o que é complemento ("O.S. 2174 recebeu complemento
  // Bradesco (Cilia 1978341.2): verificar compra do item A, B, C."): o orçamento novo traz o sinistro inteiro, então só
  // entram as peças que ela listou (12/10/2026, BDK2J49 — sem isso entraram farol, lanterna, pneu… do orçamento .1)
  var lista = mg_listaDaRotina_(comentarios), foraDaRotina = [];
  if (lista.length) cmp.oficina = cmp.oficina.filter(function (p) {
    var d = p.pneu ? 'PNEU ' + (p.medida || '') : (p.descricao || p.descricaoOrc || '');
    if (lista.some(function (x) { return cp_similar_(d, x) > 0 || mg_mesmaBase_(d, x); })) return true;
    foraDaRotina.push(cp_nome_(p)); return false;
  });
  cmp.atualizar = [];   // as peças antigas não ficam na lista nova: nada a atualizar nelas
  if (!cmp.oficina.length && !cmp.fo.length) { avisar(cab + 'o orçamento «' + anexo.name + '» não trouxe peça nova em relação ao pedido antigo. Se há peça nova, incluir pelo ✏️ EDITAR/INCLUIR PEÇA e salvar.'); return false; }

  var hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy');
  var semPecas = mg_converter_(card, comentarios, { semPecas: true, rodape: 'Card antigo convertido para o sistema novo pelo robô em ' + hoje + ' ao voltar para cotação — pedido antigo (já comprado): ver o texto original abaixo' });
  avisar(cab + 'passou para o sistema novo. Em PEÇAS ficaram só as peças novas do orçamento «' + anexo.name + '»; o pedido antigo (já comprado) ficou no texto original, abaixo da linha.' +
    (doAntigo.length ? '\nConsiderei do pedido antigo (não entraram de novo): ' + doAntigo.join('; ') + '. Se alguma for peça nova, incluir pelo ✏️ EDITAR/INCLUIR PEÇA.' : '') +
    (foraDaRotina.length ? '\nNo orçamento, mas fora do complemento comentado pela rotina (não entraram): ' + foraDaRotina.join('; ') + '. Se alguma precisar, incluir pelo ✏️ EDITAR/INCLUIR PEÇA.' : ''));
  cp_aplicar_({ id: card.id, name: card.name, desc: semPecas.desc, shortLink: card.shortLink, shortUrl: card.shortUrl, idList: card.idList, labels: card.labels },
    cmp, { origem: origem, anexo: anexo.name, quem: 'robô', token: null, ctx: ctx });
  try { ev_registrar_('CONVERSAO', card, 'robô', [], { detalhe: 'card antigo voltou para cotação' + (de ? ' (de ' + de + ')' : '') + ' — ' + cmp.oficina.length + ' oficina · ' + cmp.fo.length + ' FO' }); } catch (e) {}
  return true;
}

// Migracao.gs:467
function mg_listaDaRotina_(comentarios) {
  for (var i = 0; i < (comentarios || []).length; i++) {   // mais novo primeiro
    var m = String(comentarios[i] || '').match(/recebeu complemento[^:]*:\s*verificar compra d[oa]s? ite(?:m|ns)\s+([\s\S]+?)\.?\s*$/i);
    if (m) return m[1].split(/\s*[,;]\s*|\s+e\s+(?=[A-ZÀ-Ú])/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 2; });
  }
  return [];
}

// Migracao.gs:479
function mg_corrigirBDK2J49_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('MG_FIX_BDK2J49') || vd_board_() !== 'oH4TbTqb' || !vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var card = vd_api_('/cards/' + MG_FIX.SL, { cru: true, query: { fields: 'name,desc,idList,shortLink,shortUrl,labels,closed' } });
  var cmp = vd_completa_(card.id);
  if (!cmp || card.closed) { props.setProperty('MG_FIX_BDK2J49', 'NADA'); return 0; }
  var div = vd_dividir_(cmp), lp = vd_linhasPecas_(div.bloco), linhas = div.bloco.split('\n'), tirar = {}, tiradas = [];
  lp.linhas.forEach(function (l, k) {
    var norm = l.replace(/\s+/g, '');
    if (MG_FIX.TIRAR.some(function (c) { return norm.indexOf(c.replace(/\s+/g, '')) >= 0; })) { tirar[lp.idx[k]] = 1; tiradas.push(l.split('|')[0].trim()); }
  });
  if (!tiradas.length) { props.setProperty('MG_FIX_BDK2J49', 'NADA'); return 0; }
  var n = 0, novas = [];
  linhas.forEach(function (l, i) {
    if (tirar[i]) return;
    if (lp.idx.indexOf(i) >= 0) { n++; l = l.replace(/^(\s*[*_]*\s*)\d+\s*[.)\-]\s*/, '$1' + n + '. '); }
    novas.push(l);
  });
  vd_backup_({ name: card.name, shortUrl: card.shortUrl, desc: cmp }, 'correção 12/10 — peças fora do complemento');
  vd_gravarDesc_(card.id, novas.join('\n') + (div.temMarcador ? '\n\n' + div.resto : ''));
  vd_comentar_(card, '🛠️ **Correção do robô (12/10):** na conversão entraram peças do orçamento .2 que não são do complemento comentado pela rotina (o PDF traz o sinistro inteiro) — saíram da lista: ' + tiradas.join('; ') + '. Ficaram as ' + n + ' peças do complemento. Se alguma das retiradas precisar ser comprada, incluir pelo ✏️ EDITAR/INCLUIR PEÇA.');
  try { ev_registrar_('CORRECAO', card, 'robô', tiradas.map(function (t) { return { peca: t, detalhe: 'fora do complemento — retirada da lista' }; }), { detalhe: 'correção 12/10 da conversão' }); } catch (e) {}
  props.setProperty('MG_FIX_BDK2J49', 'FEITO');
  return tiradas.length;
}

// Orcamento.gs:18
function vd_normTexto_(texto) {
  return vd_semAcento_(String(texto || '').replace(/\r/g, '')).replace(/[\s ]+/g, ' ');
}

// Orcamento.gs:22
function vd_codigoInterno_(c) {
  return /^0{2,}\d+$/.test(c) || /^SOMA\d+$/.test(c);
}

// Orcamento.gs:33
function vd_consertarAcentos_(s) {
  s = String(s == null ? '' : s).replace(/MÃQUINA/g, 'MÁQUINA');   // 0xC1 (Á) perde o 2º byte (0x81 não existe no cp1252)
  if (!/[ÃÂ][\u0080-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/.test(s)) return s;
  var cp = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e,
    0x0191: 0x83, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };
  var bytes = [];
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 0x100) bytes.push(c); else if (cp[c] !== undefined) bytes.push(cp[c]); else return s;   // caractere fora do cp1252: não era isso
  }
  // 0x81/0x8D/0x8F/0x90/0x9D não existem no cp1252 e somem no caminho ("MÃQUINA" era "MÁQUINA"): sem conserto exato, volta como estava
  try { return decodeURIComponent(bytes.map(function (b) { return '%' + (b < 16 ? '0' : '') + b.toString(16); }).join('')); } catch (e) { return s.replace(/MÃQUINA/g, 'MÁQUINA'); }
}

// Orcamento.gs:48
function vd_ehServico_(desc) {
  return /TAXA|ASSES+ORIA|AFERI[CÇ]|VISTORIA|REM\s*\/\s*INST|BORRACHARIA|BORRACHEIR|GEOMETRIA|ALINHAMENTO|BALANCEAMENTO|PRESILHA|MAO DE OBRA|LAVAGEM|POLIMENTO|HIGIENIZA|GUINCHO|REBOQUE|DIAGNOSTICO|SCANNER|RECARGA|FRETE|\bMARKUP\b/.test(desc);
}

// Orcamento.gs:52
function vd_tipoOrcamento_(t) {
  t = String(t || '').toUpperCase();
  if (/^GENU|^GE$/.test(t)) return 'GENUÍNA';   // Cilia abrevia: GE = genuína, OR = original (AYI7869, 08/10/2026)
  if (/^REPOSI/.test(t)) return 'REPOSIÇÃO';
  if (t === 'OR') return 'ORIGINAL';
  return t;
}

// Orcamento.gs:61
function vd_pneuDaDescricao_(desc) {
  var d = String(desc || '');
  if (!/\bPNEU/.test(d)) return null;
  // 08/10/2026 (treino): "VALVULA DE AR DO PNEU", "SENSOR DE PRESSAO DO PNEU" não são pneu — só quando começa com PNEU ou tem medida
  if (!/^\s*(JOGO DE |KIT )?PNEUS?\b/.test(d) && !/\d{3}\s*[\/ ]\s*\d{2}\s*(?:Z?R|\/)\s*\d{2}/.test(d)) return null;
  // "195/65R15", "195/ 55 R15" e também "185 70 R14" (Soma/Porto escreve sem a barra)
  var m = d.match(/(\d{3})\s*[\/ ]\s*(\d{2})\s*(?:Z?R|\/)\s*(\d{2})/);   // 16/10/2026 (SDW8A49, HDI): também "205/70/15"
  var medida = m ? m[1] + '/' + m[2] + 'R' + m[3] : '';
  var categoria = /IMPORTAD/.test(d) ? 'IMPORTADO' : (/1\s*[ªA]?\s*LINHA|PRIMEIRA LINHA/.test(d) ? '1ª LINHA' : '');
  var marca = '';
  if (!categoria) {
    var resto = d.replace(/\bPNEUS?\b/, '').replace(/\d{3}\s*[\/ ]\s*\d{2}\s*(?:Z?R|\/)\s*\d{2}.*/, '').replace(/[^A-Z0-9 ]/g, ' ').trim().split(/\s+/);
    // pula siglas (D.D., DD, DT) e palavras genéricas: a marca é a 1ª palavra "de verdade"
    marca = resto.filter(function (w) { return w.length >= 3 && !/^(DD|DT|DE|DO|DA|NACIONAL|RADIAL|ARO|NOVO|NOVA|TROCA|JOGO|KIT)$/.test(w); })[0] || '';
  }
  return { pneu: true, medida: medida, marca: marca, categoria: categoria };
}

// Orcamento.gs:79
function vd_limparDescricao_(d) {
  return String(d || '')
    .replace(/^\(A\)\s*/, '')
    .replace(/\s+(?:R&I|T|R|P)\s+(?:-|\d+,\d{2})\s.*$/, '')   // 16/10/2026: linha seguinte (operação "R&I 0,50 1FORRO…") vazou na descrição
    .replace(/^[A-Z0-9]{6,20}(?:GENUINA|ORIGINAL)\s+/, '')   // 16/10/2026: 2º código + tipo colados ("92101R1510GENUINA FAROL")
    .replace(/^(?:\d{3,}\s+)+/, '')              // 2º código numérico do Cilia (ex.: 1632439, 4310)
    .replace(/^\d{5,}(?=[A-Z]{3})/, '')           // 2º código colado na descrição ("951450JOGO DE FAROIS")
    .replace(/^(?:PPOI|PPG|PPC|PPO|PRO|PAR|PG|PO|OR|GE)\s+/, '')   // sigla de tipo do Cilia (PPG/PPC = paralela; PPO = original)
    .replace(new RegExp('^(?:PPG|PPC|PPO|PRO|PG|PO|GE)(?=(?:' + VD_PALAVRAS_PECA + ')\\b)'), '')   // sigla colada ("PGCONDENSADOR", 16/10/2026)
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

// Orcamento.gs:103
function vd_tirarRepeticao_(d) {
  var ws = String(d).split(' ');
  for (var i = Math.ceil(ws.length / 2); i < ws.length; i++) {
    var a = ws.slice(0, i).join(' '), b = ws.slice(i).join(' ');
    if (b.length >= 4 && a.indexOf(b) === 0) return a;
  }
  return d;
}

// Orcamento.gs:113
function vd_numOrc_(s) { var n = parseFloat(String(s || '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? NaN : n; }

// Orcamento.gs:115
function vd_liquidoOrc_(unit, descPct) {
  var u = vd_numOrc_(unit), d = vd_numOrc_(descPct);
  if (isNaN(u)) return NaN;
  return isNaN(d) || d === 0 || d >= 100 || d <= -100 ? u : u * (1 - d / 100);   // desconto negativo = acréscimo (16/10/2026, JDC7H45)
}

// Orcamento.gs:126
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

// Orcamento.gs:186
function vd_compactarCodigos_(txt, marca) {
  return String(txt || '').replace(/\b([A-Z0-9]{2,4})\/ ?([A-Z0-9]{3,8})\/ ?([A-Z0-9]{0,3}) ?\/ ?([A-Z0-9]{0,4})(?=\s|$)/g, function (_, a, b, c, d) {
    var cod = [a, b, c, d].filter(String).join('/');
    return marca ? ' ' + marca + cod + marca + ' ' : cod;
  });
}

// Orcamento.gs:194
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

// Orcamento.gs:206
function vd_lerOrcamento_(texto) {
  var U = vd_normTexto_(texto);
  // 17/10/2026 (Weslley: "sem cobertura não entra pra compra"): no Cilia, os itens do bloco "ITENS DO TIPO SEM COBERTURA" (até
  // o próximo "ITENS DO TIPO …") não são pagos pela seguradora — ficam fora da leitura
  U = U.replace(/ITENS DO TIPO SEM COBERTURA[\s\S]*?(?=ITENS DO TIPO |RESUMO GERAL|$)/g, ' ');
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
  // Soma/Porto chama a cor de "Impregnação". 16/10/2026 (AVO9I95, AUX4331): com a cor em branco, "Impregnação: Fabricação:"
  // dava cor = FABRICACAO — nome de campo não é cor
  else if ((m = U.match(/IMPREGNACAO:? ([A-Z]{3,15})\b/)) && !/^(FABRICACAO|EMPRESA|MODELO|ANO|KM|VERSAO|PLACA|CHASSI|LICENCA|MOTIVO|DATA)$/.test(m[1])) r.cor = m[1];
  // sinistro
  if ((m = U.match(/SINISTRO:? (\d[\d.\-\/]{6,})/))) r.sinistro = m[1];
  // 16/10/2026: no Cilia o rótulo "Sinistro" sai sem valor (cabeçalho em colunas) e o número vem sozinho numa linha logo
  // depois de "Orçamento <versão> - <data>" (UBR1C00 434427503, BCB8218 531.26.02497). Só número puro: CNPJ (com /),
  // quilometragem ("72759.0") e código interno ("0000002") ficam de fora; "a informar" deixa vazio.
  var ii;
  if (!r.sinistro && /SINISTRO/.test(U) && (ii = texto.search(/\nOr[çc]amento \n\d+\.\d+ - \d\d\/\d\d\/\d\d/)) >= 0) {
    var lin = texto.slice(ii).split('\n').slice(2, 40);
    for (var li = 0; li < lin.length; li++) {
      var ls = lin[li].trim();
      if (/^\d[\d.\-]{6,21}$/.test(ls) && !/\.\d$/.test(ls) && !/^0{3}/.test(ls) && ls.replace(/\D/g, '').length >= 8) { r.sinistro = ls; break; }
    }
  }

  // valor líquido unitário da peça no orçamento (o que a seguradora paga) — 05/10/2026, Weslley: aparece ao lado da peça
  // na cotação/autorização e serve de base para a comparação com a cotação (economia < 20% vermelho, 20–30 amarelo, > 30 verde)
  var add = function (lista, codigo, desc, qtd, tipo, valor, codigoAntigo) {
    codigo = String(codigo || '').replace(/\s+/g, ' ').trim();
    // OCR do Cilia às vezes gruda (ou põe antes) o código na descrição ("100260230EMBLEMA DA GRADE", "1632439 FAROL"):
    // se o código da coluna é interno (0000001) ou vazio, esse número é o código (RHV1E04, 05/10/2026) — antes da limpeza,
    // que apaga esses dígitos (08/10/2026)
    var mg = String(desc || '').trim().match(/^(\d{6,}) ?([A-Z(].*)$/);
    if (mg && (!codigo || vd_codigoInterno_(codigo.replace(/\s/g, '')))) { codigo = mg[1]; desc = mg[2]; }
    desc = vd_limparDescricao_(desc);
    var mc = codigo.match(/^(\d{6,})([A-Z][A-Z\-]{2,})$/);   // "52181025PARACHOQUE" veio como código (08/10/2026)
    if (mc) { codigo = mc[1]; desc = vd_limparDescricao_(mc[2] + ' ' + desc); }
    // 16/10/2026 (STG3I57): código alfanumérico colado na 1ª palavra ("5Q0919275CGRUSENSOR", "5U7807421T9B9PARACHOQUE")
    var mw = !mc && codigo.length >= 10 && codigo.match(new RegExp('^([A-Z0-9]*\\d[A-Z0-9]*?)(' + VD_PALAVRAS_PECA + ')([A-Z]*)$'));
    if (mw && mw[1].length >= 6) { codigo = mw[1]; desc = vd_limparDescricao_(mw[2] + mw[3] + ' ' + desc); }
    var pneu = vd_pneuDaDescricao_(desc);
    if (!desc || vd_ehServico_(desc)) return;
    // código interno (000000x / SOMA00x) = peça sem código de fábrica: consultor completa pelo Cilia
    if (vd_codigoInterno_(codigo.replace(/\s/g, ''))) codigo = '';
    var item = pneu ? pneu : { pneu: false, codigo: codigo, descricao: desc, tipos: [] };
    item.qtd = String(qtd || '1');
    item.dica = vd_tipoOrcamento_(tipo);
    item.descricaoOrc = desc;
    item.codigoOrc = codigo;
    // 27/10/2026 (Weslley, KPJ9A04): orçamento Cilia com "CÓDIGO DIFERENTE" traz o código antigo riscado e o novo ao lado —
    // o novo vale; o antigo vai junto para o card achar a peça que já tinha e registrar a troca
    if (codigoAntigo && !pneu) { codigoAntigo = String(codigoAntigo).replace(/\s+/g, '').trim(); if (codigoAntigo && codigoAntigo !== codigo && !vd_codigoInterno_(codigoAntigo)) item.codigoAntigo = codigoAntigo; }
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
    // 16/10/2026 (BDL9F71, UBR1C00): pintura "P -" (sem horas) também; código colado na descrição pode passar de 20 letras
    var PROX = '\\bT (?:-|\\d+,\\d{2})(?: P (?:-|\\d+,\\d{2}))? \\d{1,3} [A-Z0-9]{4,30}\\b';
    // 27/10/2026 (KPJ9A04): "1 52141759 52055306 GENUINAPARACHOQUE…" = código antigo riscado + código novo (CÓDIGO DIFERENTE) — o 2º é o que vale
    var reCi = new RegExp('\\bT (?:-|\\d+,\\d{2})(?: P (?:-|\\d+,\\d{2}))? (\\d{1,3}) ([A-Z0-9]{4,30})\\.? (?:(\\d{5,}) )?(?:(GENUINA|ORIGINAL)|(PPOI|PRO|PPO|PPG|PPC|PAR|OR|GE|PG|PO|OUTRAS FONTES|VERDE|USADA|RECONDICIONADA) )?((?:(?!' + PROX + '| ?(?:OFICINA|SEGURADORA) (?:R\\$|-)).)+?)(?= ?(?:OFICINA|SEGURADORA) (?:R\\$|-)|' + PROX + '|$)' +
      '|(OFICINA|SEGURADORA) (?:R\\$(?: ?(\\d{1,3}(?:\\.\\d{3})*,\\d{2})(?: ?(?:R\\$ ?)?(\\d{1,3}(?:\\.\\d{3})*,\\d{2})(?! ?%))?(?: ?(-?\\d{1,3},\\d{2}) ?%| ?-(?= ?R\\$))?(?: ?R\\$ ?(\\d{1,3}(?:\\.\\d{3})*,\\d{2}))?)?|-)', 'g');   // número seguido de % é desconto, não total (07/10/2026)
    // código com ponto no fim ("1312791700. BRAÇO OSCILANTE", 14/10/2026, JDC7H45): o item sumia e o preço OFICINA ficava sem dono
    var filaCi = [];
    while ((m = reCi.exec(U))) {
      if (m[2]) { filaCi.push({ qtd: m[1], codigo: m[3] || m[2], codigoAntigo: m[3] ? m[2] : '', tipo: m[4] || m[5] || '', desc: m[6] }); continue; }
      var it = filaCi.shift();
      if (!it) continue;   // preço sem item antes (cabeçalho, serviços): ignora
      // Cilia: "OFICINA R$ unit [R$ total] [desc %]" — o valor unitário líquido; formato confirmado no 1º PDF real (05/10/2026)
      // 16/10/2026 (SJC0H98, AZV7F58, JDC7H45): o PREÇO LÍQUIDO impresso vale — preço negociado ("R$ 719,80 - R$ 500,00")
      // e desconto negativo ("R$ 73,37 -5,30% R$ 77,26") davam o bruto. O líquido é da linha: com quantidade > 1 divide,
      // salvo quando ele já bate com o unitário calculado.
      var calcU = m[8] ? vd_liquidoOrc_(m[8], m[10]) : NaN, vOrc = calcU;
      if (m[11]) {
        var liqL = vd_numOrc_(m[11]), qn = Math.max(1, parseInt(it.qtd, 10) || 1);
        if (!isNaN(liqL)) vOrc = (qn > 1 && !isNaN(calcU) && Math.abs(liqL - calcU) < 0.05) ? liqL : liqL / qn;
      }
      add(m[7] === 'SEGURADORA' ? r.fo : r.oficina, it.codigo, it.desc, it.qtd, it.tipo, vOrc, it.codigoAntigo);
    }
    // item que ficou sem preço (fim do texto cortado): entra como da oficina, sem valor
    filaCi.forEach(function (it) { add(r.oficina, it.codigo, it.desc, it.qtd, it.tipo, NaN, it.codigoAntigo); });
    return r;
  }
  return r;
}

// Painel.gs:10
function pn_atualizar() {
  var ss = vd_planilhaBackup_().getParent(), ev = ss.getSheetByName(EV.ABA);
  var linhas = ev && ev.getLastRow() > 1 ? ev.getRange(2, 1, ev.getLastRow() - 1, EV.CAB.length).getValues() : [];
  var quadro = vd_board_(), desde = Date.now() - PN.DIAS * 864e5;
  // colunas: 0 data,1 evento,2 card,3 link,4 placa,5 unidade,6 tipo,7 peça,8 particular,9 fornecedor,10 valor,11 dias,12 previsão,13 usuário,14 detalhe,15 quadro
  var L = linhas.filter(function (r) { return r[0] instanceof Date && (!r[15] || r[15] === quadro); });
  var rec30 = L.filter(function (r) { return r[0].getTime() >= desde; });
  var conta = function (arr, ev) { return arr.filter(function (r) { return r[1] === ev; }).length; };
  var cards = function (arr, ev) { var s = {}; arr.forEach(function (r) { if (r[1] === ev) s[r[3] || r[2]] = 1; }); return Object.keys(s).length; };
  var soma = function (arr, f) { return arr.reduce(function (t, r) { return t + (f(r) ? (+r[10] || 0) : 0); }, 0); };

  var out = [];   // [texto/valores, estilo]
  var titulo = function (t) { out.push({ v: [t], t: 'tit' }); };
  var cab = function (a) { out.push({ v: a, t: 'cab' }); };
  var lin = function (a, fmt) { out.push({ v: a, t: 'lin', f: fmt }); };
  var vazio = function () { out.push({ v: [''], t: '' }); };

  out.push({ v: ['📊 PAINEL — COMPRA DE PEÇA (' + (quadro === VD.BOARD_PADRAO ? 'quadro TESTE' : 'quadro principal') + ')'], t: 'top' });
  out.push({ v: ['Atualizado em ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm') + ' · fonte: aba EVENTOS · ' + L.length + ' evento(s)'], t: 'sub' });
  vazio();

  // 1. resumo 30 dias
  titulo('1. ÚLTIMOS ' + PN.DIAS + ' DIAS');
  cab(['Indicador', 'Valor']);
  var compras30 = rec30.filter(function (r) { return r[1] === 'COMPRA'; });
  var receb30 = rec30.filter(function (r) { return r[1] === 'RECEBIMENTO' && r[11] !== ''; });
  var noPrazo30 = receb30.filter(function (r) { return +r[11] <= 0; }).length;
  lin(['Pedidos novos (cards)', cards(rec30, 'PEDIDO')]);
  lin(['Cards cotados', cards(rec30, 'COTAÇÃO')]);
  lin(['Cards autorizados', cards(rec30, 'AUTORIZAÇÃO')]);
  lin(['Devoluções para cotação', conta(rec30, 'DEVOLUÇÃO')]);
  lin(['Peças compradas', compras30.length]);
  lin(['Valor comprado — seguradora', soma(compras30, function (r) { return r[6] !== 'PARTICULAR' && r[6] !== 'RETORNO' && r[8] !== 'SIM'; })], 'R$ #,##0.00');
  lin(['Valor comprado — particular', soma(compras30, function (r) { return r[6] === 'PARTICULAR' || r[8] === 'SIM'; })], 'R$ #,##0.00');
  lin(['Valor comprado — retorno (oficina paga)', soma(compras30, function (r) { return r[6] === 'RETORNO' && r[8] !== 'SIM'; })], 'R$ #,##0.00');
  lin(['Compras fora da autorização', compras30.filter(function (r) { return /FORA DA AUTORIZA/.test(r[14]); }).length]);
  lin(['Peças recebidas', conta(rec30, 'RECEBIMENTO')]);
  lin(['Recebidas no prazo', receb30.length ? noPrazo30 / receb30.length : ''], '0%');
  lin(['Alterações à mão desfeitas (travas)', conta(rec30, 'MOVIMENTO DESFEITO') + conta(rec30, 'CHECKLIST DESFEITO')]);
  vazio();

  // 2. fornecedores
  titulo('2. FORNECEDORES — PRAZO PROMETIDO x REAL (todo o período)');
  cab(['Fornecedor', 'Peças compradas', 'Valor comprado', 'Peças recebidas', 'Atraso médio (d.u.)', 'No prazo', 'Pior atraso (d.u.)']);
  var F = {};
  L.forEach(function (r) {
    var f = String(r[9] || '').trim().toUpperCase();
    if (!f || (r[1] !== 'COMPRA' && r[1] !== 'RECEBIMENTO')) return;
    var x = F[f] || (F[f] = { comp: 0, valor: 0, rec: 0, atrasos: [] });
    if (r[1] === 'COMPRA') { x.comp++; x.valor += +r[10] || 0; }
    if (r[1] === 'RECEBIMENTO') { x.rec++; if (r[11] !== '' && !isNaN(+r[11])) x.atrasos.push(+r[11]); }
  });
  var fs = Object.keys(F).sort(function (a, b) { return (F[b].comp + F[b].rec) - (F[a].comp + F[a].rec); });
  if (!fs.length) lin(['(sem compras registradas ainda)']);
  fs.forEach(function (f) {
    var x = F[f], n = x.atrasos.length;
    lin([f, x.comp, x.valor, x.rec, n ? x.atrasos.reduce(function (t, v) { return t + v; }, 0) / n : '', n ? x.atrasos.filter(function (v) { return v <= 0; }).length / n : '', n ? Math.max.apply(null, x.atrasos) : ''],
      [null, '0', 'R$ #,##0.00', '0', '0.0', '0%', '0']);
  });
  vazio();

  // 3. tempo por etapa
  titulo('3. TEMPO POR ETAPA (mediana em dias corridos, cards com as duas pontas)');
  cab(['Etapa', 'Mediana (dias)', 'Cards medidos']);
  var C = {};
  L.forEach(function (r) {
    var k = r[3] || r[2]; if (!k) return;
    var c = C[k] || (C[k] = {}), t = r[0].getTime(), e = r[1];
    if (['PEDIDO', 'COTAÇÃO', 'AUTORIZAÇÃO', 'COMPRA'].indexOf(e) >= 0 && !c[e]) c[e] = t;
    if (e === 'RECEBIMENTO') c.REC = t;
  });
  var etapa = function (nome, a, b) {
    var ds = Object.keys(C).map(function (k) { var c = C[k]; return c[a] && c[b] && c[b] >= c[a] ? (c[b] - c[a]) / 864e5 : null; }).filter(function (v) { return v !== null; }).sort(function (x, y) { return x - y; });
    var med = ds.length ? (ds.length % 2 ? ds[(ds.length - 1) / 2] : (ds[ds.length / 2 - 1] + ds[ds.length / 2]) / 2) : '';
    lin([nome, med, ds.length], [null, '0.0', '0']);
  };
  etapa('Pedido → cotação', 'PEDIDO', 'COTAÇÃO');
  etapa('Cotação → autorização', 'COTAÇÃO', 'AUTORIZAÇÃO');
  etapa('Autorização → compra', 'AUTORIZAÇÃO', 'COMPRA');
  etapa('Compra → última peça recebida', 'COMPRA', 'REC');
  etapa('Pedido → última peça recebida (total)', 'PEDIDO', 'REC');
  vazio();

  // 4. fora da autorização
  titulo('4. COMPRAS FORA DA AUTORIZAÇÃO (últimas 20)');
  cab(['Data', 'Card', 'Peça', 'Fornecedor', 'Valor', 'Comprador', 'Motivo']);
  var fora = L.filter(function (r) { return r[1] === 'COMPRA' && /FORA DA AUTORIZA/.test(r[14]); }).slice(-20).reverse();
  if (!fora.length) lin(['(nenhuma)']);
  fora.forEach(function (r) {
    var motivo = String(r[14]).split(' — ').slice(1).join(' — ') || String(r[14]).replace(/^FORA DA AUTORIZAÇÃO:\s*/, '');
    lin([r[0], r[2], r[7], r[9], r[10], r[13], motivo], ['dd/MM/yyyy', null, null, null, 'R$ #,##0.00', null, null]);
  });
  vazio();

  // 5. travas por usuário
  titulo('5. ALTERAÇÕES À MÃO DESFEITAS POR USUÁRIO (últimos ' + PN.DIAS + ' dias) — onde reforçar o treinamento');
  cab(['Usuário', 'Movimentos de coluna', 'Checklists', 'Total']);
  var U = {};
  rec30.forEach(function (r) {
    if (r[1] !== 'MOVIMENTO DESFEITO' && r[1] !== 'CHECKLIST DESFEITO') return;
    var u = r[13] || '?', x = U[u] || (U[u] = { mov: 0, ck: 0 });
    if (r[1] === 'MOVIMENTO DESFEITO') x.mov++; else x.ck++;
  });
  var us = Object.keys(U).sort(function (a, b) { return (U[b].mov + U[b].ck) - (U[a].mov + U[a].ck); });
  if (!us.length) lin(['(nenhuma)']);
  us.forEach(function (u) { lin([u, U[u].mov, U[u].ck, U[u].mov + U[u].ck]); });

  // escreve
  var sh = ss.getSheetByName(PN.ABA) || ss.insertSheet(PN.ABA, 0);
  sh.clear(); sh.clearFormats();
  var larg = 7;
  out.forEach(function (o, i) {
    var row = i + 1, v = o.v.slice(); while (v.length < larg) v.push('');
    var rg = sh.getRange(row, 1, 1, larg);
    rg.setValues([v]);
    if (o.t === 'top') rg.setFontSize(15).setFontWeight('bold').setFontColor(PN.AZUL);
    else if (o.t === 'sub') rg.setFontColor('#626f86').setFontStyle('italic');
    else if (o.t === 'tit') rg.setFontWeight('bold').setFontSize(11).setBackground(PN.AZUL).setFontColor('#ffffff');
    else if (o.t === 'cab') rg.setFontWeight('bold').setBackground(PN.CINZA);
    else if (o.t === 'lin' && o.f) {
      if (typeof o.f === 'string') sh.getRange(row, 2).setNumberFormat(o.f);
      else o.f.forEach(function (f, j) { if (f) sh.getRange(row, j + 1).setNumberFormat(f); });
    }
  });
  sh.setColumnWidth(1, 300); for (var c = 2; c <= larg; c++) sh.setColumnWidth(c, 140);
  sh.setFrozenRows(2);
  Logger.log('painel: ' + out.length + ' linhas · ' + ss.getUrl() + '#gid=' + sh.getSheetId());
  return ss.getUrl() + '#gid=' + sh.getSheetId();
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
    var c = vd_api_('/cards/' + cardId, { query: { fields: 'due,dueComplete', checklists: 'all', checkItem_fields: 'state,due' } });
    var maior = '';
    (c.checklists || []).forEach(function (k) {
      if (!/^(PAGAS|FORNECIMENTO)/i.test(String(k.name || '').trim())) return;
      (k.checkItems || []).forEach(function (i) { if (i.state !== 'complete' && i.due && (!maior || new Date(i.due) > new Date(maior))) maior = i.due; });
    });
    if (maior && (!pv_mesmoDia_(maior, c.due) || c.dueComplete)) vd_api_('/cards/' + cardId, { method: 'put', payload: { due: maior, dueComplete: false } }, token);
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
      linhas.push('- ' + nome + ' (' + a.fornecedor + '): ' + (q && q.dias !== '' && q.dias != null ? 'de ' + q.dias + ' para ' : '') + '**' + dias + ' d.u.** pelo motivo: ' + motivo);   // 26/10/2026: "alterou o prazo x pelo motivo z"
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
    linhas.push('- ' + pv_curto_(it.item.name) + ': ' + (velha ? 'de ' + vd_dataCurta_(velha) + ' para' : 'sem previsão →') + ' **' + vd_dataCurta_(nova) + '**' + (motivo ? ' pelo motivo: ' + motivo : ''));
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
  var b = rc_semMarcas_(nome).replace(/\s+[-—]\s+(EM COTA[ÇC][ÃA]O.*|B\.?O\.?\b.*)$/i, '').trim();   // sem 📍/✋ (10/10/2026)
  // código grudado na descrição (OCR do Cilia, 05/10/2026: "100260230EMBLEMA ..."). 23/10/2026 (FUR0C92): só quando o que vem
  // depois é PALAVRA — "62022W730P" (código Mitsubishi) virava "62022 W730P" e a peça não casava com o documento da HDI
  b = b.replace(/^(\d{5,})(?=[A-Z]{3,}[A-Z\s])/i, '$1 ');
  // sufixo " - FORNECEDOR": testa do pedaço mais comprido para o mais curto, porque o fornecedor lido do
  // portal pode ter " - " e "/" dentro ("MEDIADORA - PRISMATEC / DUNA FIAT", 05/10/2026)
  b = b.replace(/\s+-\s+QTD\s*\d*$/i, '');   // 23/10/2026 (SFL9F03): "- QTD 1" gravado como fornecedor por leitura antiga
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

// Previsao.gs:130
function pv_achaFo_(itensFo, x) {
  if (x.id) { var porId = itensFo.filter(function (i) { return i.id === x.id; })[0]; if (porId) return porId; }
  var cod = cp_norm_(x.codigo), desc = cp_norm_(x.descricao);
  if (cod.length >= 4) { var pc = itensFo.filter(function (i) { return cp_norm_(i.name).indexOf(cod) >= 0; })[0]; if (pc) return pc; }
  if (desc.length >= 4) return itensFo.filter(function (i) { return cp_norm_(i.name).indexOf(desc) >= 0; })[0] || null;
  return null;
}

// Previsao.gs:152
function vdf_previaFornecimento(token, fileId, shortLink, foForm) {
  vdf_usuario_(token);
  var f = vdf_arquivoTemp_(fileId), texto;
  try { texto = vd_ocr_(f.getBlob(), f.getName()); } catch (e) { return { erro: 'Não consegui ler o arquivo (' + String(e.message || e).slice(0, 80) + ').' }; }
  try { CacheService.getScriptCache().put(PV_CACHE_TXT + fileId, String(texto || '').slice(0, 90000), 6 * 3600); } catch (e) {}
  var doc = pv_docFornecimento_(texto), achados = [];
  if (shortLink) {
    var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc', checklists: 'all', checkItem_fields: 'name,state,due' } });
    var r = pv_lerFornecimentoTexto_(card, texto);
    achados = r.achados.map(function (a) { return { nome: a.nome, fornecedor: a.fornecedor || '', previsao: a.previsao || '', situacao: a.situacao || '' }; });
  }
  if (!achados.length && (foForm || []).length) {
    var alvos = foForm.map(function (x, i) { return { id: 'f' + i, codigo: x.codigo || '', descricao: x.descricao || '', nome: ((x.codigo || '') + ' ' + (x.descricao || '')).trim() }; });
    achados = pv_lerFornecimento_(texto, alvos).map(function (a) { return { nome: a.alvo.nome, fornecedor: a.fornecedor || '', previsao: a.previsao ? Utilities.formatDate(new Date(a.previsao), 'America/Sao_Paulo', 'yyyy-MM-dd') : '', situacao: a.situacao || '' }; });
  }
  return { doc: doc, fornecimento: !!doc || achados.length > 0, achados: achados };
}

// Previsao.gs:171
function pv_fornDoPedido_(token, shortLink, textos) {
  var card = vd_api_('/cards/' + shortLink, { query: { fields: 'name,desc', checklists: 'all', checkItem_fields: 'name,state,due' } });
  var itens = [], vistos = {}, extras = [], faltando = [];
  textos.forEach(function (t) {
    var r = pv_lerFornecimentoTexto_(card, t);
    (r.achados || []).forEach(function (a) {
      if (vistos[a.id]) return; vistos[a.id] = 1;
      var x = { id: a.id };
      if (a.fornecedor) x.fornecedor = a.fornecedor;
      if (a.situacao) x.situacao = a.situacao;
      if (a.codigoNovo) { x.codigoNovo = a.codigoNovo; x.descNova = a.descNova || ''; }
      if (a.previsao && !a.situacao) { x.previsao = a.previsao; if (a.motivo) x.motivo = a.motivo; }
      if (Object.keys(x).length > 1) itens.push(x);
    });
    extras = extras.concat(r.extras || []); faltando = faltando.concat(r.faltando || []);
  });
  var res = { ok: true, n: 0, faltas: [], avisos: [] };
  if (itens.length) {
    PV_INTERNO = true;
    try { res = vdf_atualizarFornecimento(token, { shortLink: shortLink, origem: 'pedido', itens: itens }); } finally { PV_INTERNO = false; }
  }
  return { n: res.n || 0, faltas: res.faltas || [], avisos: res.avisos || [], extras: extras, faltando: faltando };
}

// Previsao.gs:195
function vdf_atualizarFornecimento(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!PV_INTERNO && !vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) atualiza o fornecimento — sua conta: ' + me.username + '.'] };
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
    if (x && /^\s*QTD\s*\d*\s*$/i.test(String(x.fornecedor || ''))) delete x.fornecedor;   // 23/10/2026 (SFL9F03): quantidade lida como fornecedor — ignora
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
      var marcasIt = rc_marcas_(it.name);   // 📍 local / ✋ retirada no fim do nome ficam (10/10/2026)
      // 27/10/2026 (KPJ9A04): o documento trouxe código novo → o antigo fica no item como "🔁 ex" (a troca já sai no comentário 🚚)
      if (x.codigoNovo) { var exC = (baseOrig.match(/^([A-Z0-9][A-Z0-9.\-\/]{3,})\s/i) || [])[1] || ''; if (exC && !marcasIt.exCodigo && vd_semAcento_(exC) !== vd_semAcento_(codNovo)) marcasIt.exCodigo = exC; }
      var antigoForn = (marcasIt.base.slice(baseOrig.length).match(/^\s+-\s+([^-—]+?)(?:\s+[-—]|$)/) || [])[1] || '';
      if (/^QTD\b/i.test(antigoForn)) antigoForn = '';   // "- QTD 1" de leitura antiga não é fornecedor
      var nm = rc_comMarcas_(nomeNovo(base, { fornecedor: x.fornecedor !== undefined ? x.fornecedor : antigoForn, situacao: x.situacao }), marcasIt);
      if (nm !== it.name) { mud.name = nm; txt.push(rc_semMarcas_(nm).slice(base.length).replace(/^\s+[-—]\s+/, '') || 'sem fornecedor'); }
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
    // B.O. / em cotação = sem previsão: a data sai do item (revisão 07/10/2026 — ficava "atrasada" para sempre)
    if (x.situacao !== undefined && /^(B\.?O|EM COTA)/.test(vd_semAcento_(x.situacao || '')) && it.due && !mud.due && it.state !== 'complete') { mud.due = null; txt.push('sem previsão'); }
    if (!Object.keys(mud).length) return;
    ops.push({ it: it, mud: mud });
    linhas.push('- ' + pv_curto_(base) + ': ' + txt.join(' · '));
    evs.push({ peca: base, fornecedor: mud.name ? (rc_semMarcas_(mud.name).slice(base.length).match(/^\s+-\s+([^-—]+)/) || [])[1] || '' : '', previsao: mud.due || it.due || '', detalhe: (it._lista + ': ' + txt.join(' · ')).replace(/\*\*/g, '') });
  });
  var novos = (p.novos || []).filter(function (x) { return x && (x.codigo || x.descricao); });
  var jaTem = itensFo.map(function (i) { return cp_norm_(i.name); });
  novos = novos.filter(function (x) { var k = cp_norm_(x.codigo) || cp_norm_(x.descricao); return k && !jaTem.some(function (n) { return n.indexOf(k) >= 0; }); });
  if (faltas.length) return { ok: false, faltas: faltas };
  if (!ops.length && !novos.length && !(p.fileIds || []).length) return { ok: true, nada: true, url: card.shortUrl, nome: card.name, n: 0, avisos: avisos };

  ops.forEach(function (o) {
    var mud = o.mud;
    if (mud.due === null) {   // tirar a data: o Trello aceita null (JSON); se recusar, tenta vazio — e nunca derruba o resto
      var resto = {}; Object.keys(mud).forEach(function (k) { if (k !== 'due') resto[k] = mud[k]; });
      if (Object.keys(resto).length) vd_api_('/cards/' + card.id + '/checkItem/' + o.it.id, { method: 'put', payload: resto }, token);
      try { vd_api_('/cards/' + card.id + '/checkItem/' + o.it.id, { method: 'put', payload: { due: null } }, token); }
      catch (e) { try { vd_api_('/cards/' + card.id + '/checkItem/' + o.it.id, { method: 'put', payload: { due: '' } }, token); } catch (e2) { console.log('tirar previsão: ' + e2); } }
      return;
    }
    vd_api_('/cards/' + card.id + '/checkItem/' + o.it.id, { method: 'put', payload: mud }, token);
  });
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

// Previsao.gs:313
function pv_diaNum_(d) { try { return +Utilities.formatDate(new Date(d), 'America/Sao_Paulo', 'yyyyMMdd'); } catch (e) { return 0; } }

// Previsao.gs:319
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

// Previsao.gs:331
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

// Previsao.gs:355
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

// Previsao.gs:377
function pv_lerStatusCilia_(texto, lista) {
  var U = vd_semAcento_(String(texto || '').replace(/\r/g, ''));
  // relatório de peças novo do Cilia ("piece_report", 20/10/2026, TAX1A70): leitor próprio
  var rel = null; try { rel = pv_lerRelatorioPecasCilia_(texto, lista); } catch (e) { console.log('relatório de peças cilia: ' + e); }
  if (rel) return rel;
  if (!/STATUS DAS PECAS|PREVISAO DE ENTREGA|STATUS DO PEDIDO/.test(U)) return null;
  var linhas = U.split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(String);
  var STATUS = /^(EM COTACAO|AGUARDANDO (APROVACAO|ENTREGA)|ENTREG|CANCELAD|RECUSAD)/;
  var LABEL = /^(CODIGO|PECA|QTD|FORNECEDOR|PREVIS|STATUS|ULTIMA|RASTREAM|PARECER|SEGURADORA|SINISTRO|ORCAMENTO|OFICINA|CIDADE|E)$|^\d{1,2}\/\d{1,2}\/\d{2,4}\s*-\s*\d/;
  var ehCodigo = function (t) { return /^[A-Z0-9]{6,20}$/.test(t) && (t.match(/\d/g) || []).length >= 4 && !/^\d{11,}$/.test(t) && !/^\d{1,2}\/\d/.test(t); };
  var ehData = function (t) { return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t); };
  var limpaForn = function (t) { var r = t.replace(/PREVISAO DE ENTREGA.*$/, '').replace(/\s+\d{1,2}\/\d{1,2}\/\d{2,4}.*$/, '').trim(); return /^QTD\b/.test(r) ? '' : r; };
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
    // 16/10/2026 (BAE2475, OCR do Google): fornecedor sem "/" grudado no rótulo ("DEMAK IMPORTSPREVISÃO DE ENTREGA")
    var mfg = l.match(/^(.*[A-Z]{3}.*?)\s*PREVISAO DE ENTREGA\s*(\d{1,2}\/\d{1,2}\/\d{2,4})?$/);
    if (mfg && !ehForn(l) && !STATUS.test(mfg[1]) && !LABEL.test(mfg[1].trim()) && !ehCodigo(mfg[1].replace(/\s/g, '')) && !/HTTPS?:|:|\d{1,2}\/\d{1,2}/.test(mfg[1]) && mfg[1].trim().split(' ').length <= 8) {
      forns.push({ i: i, nome: mfg[1].trim() });
      if (mfg[2]) prevs.push({ i: i, data: mfg[2] });
      continue;
    }
    // fornecedor sem "/" numa linha sozinha logo antes de "PREVISÃO DE ENTREGA dd/mm" ("KAIZEN RS - VEIULOS E SERVIÇOS LTDA")
    if (/^PREVISAO DE ENTREGA\s*\d/.test(linhas[i + 1] || '') && /[A-Z]{3}/.test(l) && !STATUS.test(l) && !LABEL.test(l) && !ehCodigo(l.replace(/\s/g, '')) && !/HTTPS?:|:|\d{1,2}\/\d{1,2}|^PREVISAO|ENTREG/.test(l) && l.split(' ').length <= 10) {
      forns.push({ i: i, nome: l.trim() });
      continue;
    }
    // carimbo de status grudado ("01/10/26 - 15:20:55Entregue RUBRICA"): a peça foi entregue nessa data
    var mcg = l.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s*-\s*[\d:]+\s*ENTREGUE\b/);
    if (mcg) { entregas.push({ i: i, data: mcg[1] }); continue; }
    if (ehForn(l)) {
      var md = l.match(/PREVISAO DE ENTREGA\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      forns.push({ i: i, nome: limpaForn(l) });
      if (md) prevs.push({ i: i, data: md[1] });
      continue;
    }
    if (/^FORNECEDOR$/.test(l)) {   // nome na linha seguinte (quando não tem "/")
      // 23/10/2026 (SFL9F03): "FORNECEDOR / QTD 1 / MEDIADORA…" — a quantidade não é o fornecedor (o item ficava "- QTD 1")
      var jF = i + 1; while (jF < linhas.length && /^QTD\s*\d*$/.test(linhas[jF])) jF++;
      var prox = linhas[jF] || '';
      if (/[A-Z]{3}/.test(prox) && !STATUS.test(prox) && !LABEL.test(prox) && !ehCodigo(prox) && !ehForn(prox) && limpaForn(prox)) forns.push({ i: i, nome: limpaForn(prox) });
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
    if (prox && !prox.semCodigo && prox.i - p.i <= 6) { prox.descricao = p.descricao; prox.i = p.i; return false; }   // 16/10: o bloco começa na descrição (o fornecedor fica entre ela e o código)   // a descrição "…QTD" vale mais que o palpite
    // 16/10/2026 (BAE2475, CONDENSADOR): bloco com código curto ("6899") ou sem código — fica; casa pelo código curto ou
    // pela descrição (peça do card que não achou o código no documento)
    for (var z = p.i + 1; z < Math.min(p.i + 6, linhas.length); z++) { if (/^[A-Z0-9]{3,5}$/.test(linhas[z]) && /\d{3}/.test(linhas[z])) { p.codigo = linhas[z]; break; } }
    return pecas.some(function (q) { return !q.semCodigo; });
  });
  if (!pecas.length) return null;
  // valor dominante (o documento costuma ter um fornecedor só; a linha de parecer que escapou não muda a maioria)
  var comum = function (arr, campo) { var s = {}, melhor = '', n = 0; arr.forEach(function (x) { s[x[campo]] = (s[x[campo]] || 0) + 1; if (s[x[campo]] > n) { n = s[x[campo]]; melhor = x[campo]; } }); return n >= 2 && n >= arr.length * 0.6 ? melhor : (arr.length === 1 ? melhor : ''); };
  var fornUnico = comum(forns, 'nome'), prevUnica = comum(prevs, 'data');
  var out = {};
  // 16/10/2026 (ZZT9B01): quando quase todas as peças trazem fornecedor no próprio bloco, a que não traz fornecedor NEM
  // previsão no bloco ainda está em cotação — não herda o fornecedor/previsão das outras
  var blocoDe = function (k) { var ini = pecas[k].i, fim = k + 1 < pecas.length ? pecas[k + 1].i : linhas.length; return function (x) { return x.i > ini && x.i < fim; }; };
  var comFornNoBloco = pecas.filter(function (p, k) { return p.forn || forns.some(blocoDe(k)); }).length;
  var porBloco = pecas.length >= 3 && comFornNoBloco >= pecas.length * 0.6 && forns.length !== pecas.length;
  pecas.forEach(function (p, k) {
    var ini = p.i, fim = k + 1 < pecas.length ? pecas[k + 1].i : linhas.length;
    var noBloco = function (arr) { return arr.filter(function (x) { return x.i > ini && x.i < fim; })[0] || null; };
    var emCot = porBloco && !p.forn && !p.prev && !noBloco(forns) && !noBloco(prevs);
    var forn = p.forn || (noBloco(forns) || {}).nome || (forns.length === pecas.length ? forns[k].nome : emCot ? '' : fornUnico) || '';
    var prev = p.prev || (noBloco(prevs) || {}).data || (prevs.length === pecas.length ? prevs[k].data : emCot ? '' : prevUnica) || '';
    var ent = noBloco(entregas) || (entregas.length === pecas.length ? entregas[k] : null);
    var d = prev ? pv_datas_(prev) : [];
    var dEnt = ent && ent.data ? pv_datas_(/\/\d{2,4}$/.test(ent.data) ? ent.data : ent.data.replace(/\/?$/, '/' + new Date().getFullYear())) : [];
    out[cp_norm_(p.codigo) || ('SEMCOD' + k)] = {
      codigo: p.codigo, descricao: p.descricao, fornecedor: forn ? pv_fornecedorCurto_(forn, lista) : '',
      previsao: d.length ? d[0].toISOString() : '', entregue: !!ent, entregueEm: dEnt.length ? dEnt[0].toISOString() : '',
      linha: (p.codigo + ' ' + p.descricao).slice(0, 120)
    };
  });
  return out;
}

// Previsao.gs:494
function pv_ehRelatorioPecasCilia_(texto) {
  var U = vd_semAcento_(String(texto || ''));
  return /FORNECIMENTO\s*\([^)\n]*\d{14}\s*\)/.test(U) && /DATA\/HORA/.test(U) && /\bENTREGA\b/.test(U) && /\bATUALIZACAO\b/.test(U);
}

// Previsao.gs:508
function pv_lerRelatorioPecasCilia_(texto, lista) {
  if (!pv_ehRelatorioPecasCilia_(texto)) return null;
  var linhas = vd_semAcento_(String(texto || '').replace(/\r/g, '')).split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(String);
  var ehCodigo = function (t) { return /^[A-Z0-9]{6,20}$/.test(t) && (t.match(/\d/g) || []).length >= 4 && !/^\d{11,}$/.test(t); };
  var iPar = linhas.length;
  for (var z = 0; z < linhas.length; z++) if (/^ULTIMOS PARECERES/.test(linhas[z])) { iPar = z; break; }
  // códigos citados nos pareceres ("670030D450 PORTA TRASEIRA DIR"): separam o código grudado no título no OCR do Google
  // ("759210D220FAIXA SUP DA")
  var codPar = [];
  for (var y = iPar + 1; y < linhas.length; y++) { var t0 = linhas[y].split(' ')[0]; if (ehCodigo(t0) && codPar.indexOf(t0) < 0) codPar.push(t0); }
  var separa = function (t) {
    var p = codPar.filter(function (c) { return t !== c && t.indexOf(c) === 0 && /^[A-Z]{3,}$/.test(t.slice(c.length)); }).sort(function (a, b) { return b.length - a.length; })[0];
    if (p) return p;
    var m = t.match(/^([A-Z0-9]*\d)([A-Z]{4,})$/);
    return m && m[1].length >= 6 && (m[1].match(/\d/g) || []).length >= 4 ? m[1] : t;
  };
  var med = '', forn = '', pecas = [], dentro = false;
  for (var i = 0; i < iPar; i++) {
    var l = linhas[i], mm = l.match(/^FORNECIMENTO\s*\((.*?)\s*(?:-\s*\d{14})?\s*\)/);
    if (mm) { med = mm[1].trim(); forn = ''; dentro = true; continue; }
    if (!dentro) continue;
    if (/^TOTAIS\b/.test(l)) { dentro = false; continue; }
    var mf = l.match(/^([A-Z][A-Z0-9 .&\/\-]{2,80}?)\s*-\s*\d{14}$/);
    if (mf) { forn = mf[1].trim(); continue; }
    l.split(' ').forEach(function (t) {
      if (!ehCodigo(t)) return;
      t = separa(t);
      if (pecas.some(function (p) { return p.codigo === t; })) return;
      pecas.push({ codigo: t, i: i, med: med, forn: forn });
    });
  }
  if (!pecas.length) return null;
  // datas de cada linha da tabela: do código até o próximo código (layout: mesma linha; simples: linhas seguintes)
  pecas.forEach(function (p, k) {
    var fim = k + 1 < pecas.length ? pecas[k + 1].i : iPar, ds = [];
    for (var j = p.i; j < fim; j++) { if (/^TOTAIS\b/.test(linhas[j])) break; (linhas[j].match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) || []).forEach(function (d) { ds.push(d); }); }
    p.colEntrega = ds.length === 5 ? ds[3] : '';
  });
  // pareceres: blocos a partir de "FLUXO: … DATA DE CRIACAO", mais novo primeiro
  var blocos = [], atual = null;
  for (var b = iPar + 1; b < linhas.length; b++) {
    if (/^FLUXO:.*DATA DE CRIACAO/.test(linhas[b])) { atual = []; blocos.push(atual); continue; }
    if (atual) atual.push(linhas[b]);
  }
  var out = {};
  pecas.forEach(function (p) {
    var prev = '', ent = '', entregue = false, desc = '';
    blocos.forEach(function (bl) {
      var txt = bl.join(' '), tem = bl.some(function (x) { return x.split(/[\s\-]+/).indexOf(p.codigo) >= 0; });
      if (!tem) return;
      bl.forEach(function (x) { var md = x.match(new RegExp('^' + p.codigo + '\\s+(.+?)(?:\\s+-\\s+PREVISAO.*)?$')); if (md && !desc) desc = md[1].trim(); });
      if (!entregue) { var me = txt.match(/ENTREGUE\(?S?\)?\s+EM\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/); if (me) { entregue = true; ent = me[1]; } }
      if (!prev) {
        var lp = bl.filter(function (x) { return x.indexOf(p.codigo) === 0 && /PREVISAO DE ENTREGA:?\s*\d/.test(x); })[0];
        var mp = lp ? lp.match(/PREVISAO DE ENTREGA:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/) : txt.match(/COM PREVISAO DE ENTREGA PARA:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
        if (mp) prev = mp[1];
      }
    });
    if (!prev) prev = p.colEntrega;
    var d = prev ? pv_datas_(prev) : [], dE = ent ? pv_datas_(ent) : [];
    var nomeF = p.forn ? (p.med ? p.med.replace(/\s*-\s*\d+$/, '') + ' / ' : '') + p.forn : '';
    out[cp_norm_(p.codigo)] = {
      codigo: p.codigo, descricao: desc, fornecedor: nomeF ? pv_fornecedorCurto_(nomeF, lista) : '',
      previsao: d.length ? d[0].toISOString() : '', entregue: entregue, entregueEm: dE.length ? dE[0].toISOString() : '',
      linha: (p.codigo + ' ' + desc).slice(0, 120)
    };
  });
  return out;
}

// Previsao.gs:591
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

// Previsao.gs:647
function pv_ultimaAtualizacaoCilia_(texto) {
  var m = vd_semAcento_(String(texto || '')).match(/ULTIMA ATUALIZACAO\s*\(?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  var a = +m[3]; if (a < 100) a += 2000;
  var d = new Date(a, +m[2] - 1, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  return isNaN(d.getTime()) ? null : d;
}

// Previsao.gs:659
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

// Previsao.gs:713
function pv_soFornecedor_(u, lista) {
  u = vd_semAcento_(String(u || '')).toUpperCase().replace(/\s+/g, ' ').trim();
  if (!u) return false;
  var pecaW = /\b(PARACHOQUE|PARALAMA|FAROL|LANTERNA|PORTA|TAMPA|GRADE|ESPELHO|MOLDURA|EMBLEMA|FRISO|VIDRO|CAPO|SUPORTE)\b/;
  if (/\b(VEICULOS|AUTOMOVEIS|DISTRIBUIDORA|CONCESSIONARIA|COMERCIO|LTDA|S\/?A|EIRELI|AUTO ?PECAS|AUTOPECAS|MOTORS)\b/.test(u) && !pecaW.test(u)) return true;
  // 23/10/2026: concessionária "MARCA cidade UF" ("Servopa VW Curitiba PR", "Open Mitsubishi PR") — virava peça no print da HDI
  if (/\b(VW|FIAT|GM|FORD|TOYOTA|HONDA|HYUNDAI|RENAULT|NISSAN|MITSUBISHI|PEUGEOT|CITROEN|JEEP|CHEVROLET|KIA|BMW|AUDI|VOLVO|CHERY|BYD)\b.*\b(PR|SC|RS|SP|MG|GO|MS|MT|RJ|DF|BA|ES)$/.test(u) && !pecaW.test(u)) return true;
  return false;
}

// Previsao.gs:723
function pv_lerHdiPecas_(texto, lista) {
  var U = vd_semAcento_(texto);
  if (!/PE[CG]AS DO (SINISTRO|LAUDO)/.test(U)) return null;   // OCR lê "Peças" como "Pegas"
  var linhas = String(texto || '').replace(/\r/g, '').split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(String);
  // PDF do portal lido pelo Google: a tabela inteira vem numa linha só, com o cabeçalho na frente
  // ("Peça Prev.Entrega Entrega Fornecedor Tel. E-mail ABSORVEDOR … mail CAPÔ … mail") — 13/10/2026, UIC5G94.
  // Quebra uma peça por linha: depois de cada e-mail (e de "Fornecido pela Oficina").
  var reMailG = /\S+@\S+\.\S+/g;
  linhas = [].concat.apply([], linhas.map(function (l) {
    if ((l.match(reMailG) || []).length < 2 && !/PREV\.?\s*ENTREGA.+E-?MAIL\s+\S/i.test(vd_semAcento_(l))) return [l];
    return l.replace(/^.*?Prev\.?\s*Entrega\s+Entrega\s+Fornecedor\s+Tel\.?\s+E-?mail\s+/i, '')
      .replace(/(\S+@\S+\.\S+)\s+/g, '$1\n').replace(/(Fornecido pela Oficina)\s+/gi, '$1\n')
      .split('\n').map(function (x) { return x.trim(); }).filter(String);
  }));
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
    // 23/10/2026 (FUR0C92, print da HDI lido pelo OCR): cabeçalho de coluna com dados na mesma linha ("Prev.Entrega 20/10/26",
    // "Entrega Fornecedor 20/10/26 Open Mitsubishi PR …") virava peça — tira o cabeçalho e segue só com os dados
    var mCab = l.match(/^((?:Prev\.?\s*Entrega|Entrega|Fornecedor|Tel\.?|E-?mail)\b\s*)+/i);
    if (mCab && mCab[0].trim() && l.length > mCab[0].length) {
      l = l.slice(mCab[0].length).trim(); u = vd_semAcento_(l);
      if (!l) continue;
      if (!/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(l.split(/\s+/)[0] || '') && !reTel.test(l) && !reMail.test(l)) continue;   // sobrou texto sem dado: era só cabeçalho
    }
    // 23/10/2026 (FUR0C92): linha das colunas Entrega/Fornecedor/Tel/E-mail sem a peça ("(45) … mail 16/10/26 ASUKA MOTORS … mail
    // 20/10/26 Open Mitsubishi PR …"): cada data seguida de nome = fornecedor da próxima peça, na ordem do portal. Uma linha com um
    // só fornecedor logo depois da peça (layout uma peça por linha: "18/09/26 COMERCIAL OESTE VW SA") é dessa peça.
    // A data dessas células (coluna Entrega) não é usada: o "entregue" continua vindo só do jeito de antes.
    var segsF = l.split(/(\b\d{1,2}\/\d{1,2}\/\d{2,4}\b)/);
    var tiraContato = function (t) { return String(t || '').replace(/\S+@\S+\.\S+/g, ' ').replace(/\(\d{2}\)\s*\d{4,5}-?\d{4}/g, ' ').replace(/\s+/g, ' ').trim(); };
    if (segsF.length >= 3 && !tiraContato(segsF[0]) && segsF.slice(2).some(function (s, k) { return k % 2 === 0 && /[A-Za-z]{3,}/.test(tiraContato(s)); })) {
      var nomesF = [];
      for (var sk = 1; sk < segsF.length; sk += 2) {
        var nmF = tiraContato(segsF[sk + 1] || ''), ofF = /FORNECIDO PELA OFICINA/i.test(vd_semAcento_(nmF));
        nmF = nmF.replace(/fornecido pela oficina/i, '').trim();
        if (/[A-Za-z]{3,}/.test(nmF)) nomesF.push({ nome: pv_fornecedorCurto_(nmF, lista) || nmF });
        if (ofF) nomesF.push({ oficina: true });
      }
      var ultF = pecas[pecas.length - 1];
      if (nomesF.length === 1 && nomesF[0].nome && ultF && !ultF._temForn && linhaUltimaPeca >= i - 2) { ultF.fornecedor = nomesF[0].nome; ultF._temForn = true; }
      else nomesF.forEach(function (f) { fornecedores.push(f); });
      continue;
    }
    if (/^FORNECIDO PELA OFICINA$/.test(u)) { fornecedores.push({ oficina: true }); continue; }
    // 19/10/2026 (FOB8723): linha só com nomes de fornecedor e datas (coluna Fornecedor do print) não é peça
    var semDatasU = u.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (semDatasU && pv_soFornecedor_(semDatasU, lista)) continue;
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
    // 23/10/2026 (FUR0C92): duas peças na mesma linha ("MOLDURA INTERMEDIÁRIA DIR DO PARACHOQUE DIANT MOLDURA INTERMEDIÁRIA ESQ…"):
    // a 1ª palavra se repete adiante — cada pedaço vira uma peça (a data da linha fica com a primeira)
    var palD = desc.split(' '), cortes = [0];
    if (palD.length >= 6 && palD[0].length >= 4 && /^[A-ZÀ-Ü]+$/i.test(palD[0])) {
      for (var w = 3; w < palD.length - 1; w++) if (vd_semAcento_(palD[w]).toUpperCase() === vd_semAcento_(palD[0]).toUpperCase() && w - cortes[cortes.length - 1] >= 3) cortes.push(w);
    }
    if (cortes.length > 1) {
      cortes.forEach(function (c0, ci) {
        var dz = palD.slice(c0, ci + 1 < cortes.length ? cortes[ci + 1] : palD.length).join(' ');
        var px = { descricao: dz.toUpperCase(), previsao: ci === 0 && datas[0] ? datas[0] : '', entregueEm: ci === 0 && datas[1] ? datas[1] : '', entregue: false, fornecedor: '', oficina: oficinaNaLinha, linha: l.slice(0, 120) };
        px._temForn = temForn || oficinaNaLinha;
        pecas.push(px);
      });
      linhaUltimaPeca = i;
      continue;
    }
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

// Previsao.gs:855
function pv_lerFornecimento_(texto, alvos, lista) {
  var linhas = String(texto || '').replace(/\r/g, '').split('\n');
  var norm = linhas.map(cp_norm_);
  lista = lista || (function () { try { return fo_lista_(); } catch (e) { return []; } })();
  // "Peças do sinistro" do portal HDI: sem código — casa pela descrição (07/10/2026)
  var hdi = null; try { hdi = pv_lerHdiPecas_(texto, lista); } catch (e) { console.log('peças hdi: ' + e); }
  if (hdi) {
    // casa pela melhor nota de todas as combinações (não pela ordem do card) e dá preferência ao fornecedor
    // que o item do card já traz ("GRADE PARACHOQUE DIANT - LUSON"): 13/10/2026, UIC5G94
    var outH = [], usadasH = {}, usadosA = {}, pares = [];
    var tagForn = function (a) { var m = String(a.nome || '').match(/\s-\s([A-Za-zÀ-ÿ]{3,})[^-]*$/); return m ? vd_semAcento_(m[1]).slice(0, 4) : ''; };
    (alvos || []).forEach(function (a, ia) {
      var tag = tagForn(a), desc = String(a.descricao || a.nome || '').replace(/\s-\s[A-Za-zÀ-ÿ0-9][^-]*$/, '');   // fornecedor pode começar com número ("26 OPEN MITSUBISHI PR", 23/10/2026)
      hdi.forEach(function (p, i) {
        if (p.oficina) return;
        var sim = cp_similar_(desc, p.descricao);
        if (!sim) return;
        if (tag && vd_semAcento_(p.fornecedor || '').indexOf(tag) === 0) sim += 0.3;
        pares.push({ ia: ia, i: i, n: sim });
      });
    });
    pares.sort(function (x, y) { return y.n - x.n || x.ia - y.ia || x.i - y.i; });
    var porAlvo = {};
    pares.forEach(function (pr) { if (usadasH[pr.i] || usadosA[pr.ia]) return; usadasH[pr.i] = 1; usadosA[pr.ia] = 1; porAlvo[pr.ia] = pr.i; });
    (alvos || []).forEach(function (a, ia) {
      if (porAlvo[ia] === undefined) return;
      var r = hdi[porAlvo[ia]];
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
      var r = cilia[k] || cilia[kd], kr = cilia[k] ? k : kd;
      // 16/10/2026 (ZZT9B01): o item do card guarda o código com espaço ("71198 T7AJ00 GUIA…") — compara o nome sem espaços
      if (!r) { var nn = cp_norm_(a.nome || ''); Object.keys(cilia).some(function (kk) { if (kk.length >= 6 && !usadasC[kk] && nn.indexOf(kk) === 0) { r = cilia[kk]; kr = kk; return true; } return false; }); }
      if (r) { usadasC[kr] = 1; outC.push({ alvo: a, fornecedor: r.fornecedor, previsao: r.previsao, linha: r.linha, entregue: r.entregue, entregueEm: r.entregueEm }); }
      else semCodigo.push(a);
    });
    // peça do card cujo código não está no documento: mesma peça pela descrição = código mudou -> devolve o código novo
    semCodigo.forEach(function (a) {
      var melhor = '', nota = 0;
      Object.keys(cilia).forEach(function (kk) {
        if (usadasC[kk]) return;
        var sim = cp_similar_(String(a.descricao || a.nome || '').replace(/^(?:[A-Z0-9]*\d[A-Z0-9]*\s+)+/, ''), cilia[kk].descricao);   // sem o resto do código ("T7TM01 CONDENSADOR")
        if (sim > nota) { nota = sim; melhor = kk; }
      });
      if (!melhor) return;
      usadasC[melhor] = 1;
      var r = cilia[melhor];
      outC.push({ alvo: a, fornecedor: r.fornecedor, previsao: r.previsao, linha: r.linha, codigoNovo: String(r.codigo || '').length >= 6 ? r.codigo : '', descNova: r.descricao, entregue: r.entregue, entregueEm: r.entregueEm });
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

// Previsao.gs:948
function pv_enriquecerFo_(texto, fo) {
  if (!fo || !fo.length) return 0;
  var n = 0;
  pv_lerFornecimento_(texto, fo).forEach(function (r) {
    if (r.fornecedor) { r.alvo.fornecedor = r.fornecedor; n++; }
    if (r.previsao) r.alvo.previsao = r.previsao;
  });
  return n;
}

// Previsao.gs:962
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

// Previsao.gs:977
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

// Previsao.gs:1001
function pv_docFornecimento_(texto) {
  var nt = vd_normTexto_(texto);
  if (/STATUS DO PEDIDO|PREVISAO DE ENTREGA|STATUS DAS PECAS/.test(nt) || pv_ehRelatorioPecasCilia_(texto)) return 'Status do Pedido Cilia';
  if (/PE[CG]AS DO (SINISTRO|LAUDO)/.test(nt)) return 'Peças HDI';
  return '';
}

// Previsao.gs:1009
function pv_lerFornecimentoTexto_(card, texto) {
  var itensFo = [];
  (card.checklists || []).forEach(function (k) { if (/FORNECIMENTO/i.test(k.name || '')) (k.checkItems || []).forEach(function (i) { itensFo.push(i); }); });
  var foLista = []; try { foLista = fo_lista_(); } catch (e) {}
  // código grudado na descrição no item do card ("5Q0919275CGRUSENSOR DE ESTACIONAMENTO…", 13/10/2026, STG3I57): separa pelo
  // código que o documento traz (o maior pedaço do começo da palavra que aparece no texto)
  var tNorm = ' ' + vd_semAcento_(String(texto || '')).toUpperCase().replace(/[^A-Z0-9]+/g, ' ') + ' ';
  var descolar = function (b) {
    var mt = b.match(/^([A-Z0-9]{8,})(\s.*)?$/i);
    if (!mt || !/[A-Z]{3,}$/i.test(mt[1]) || tNorm.indexOf(' ' + mt[1].toUpperCase() + ' ') >= 0) return b;
    for (var L = mt[1].length - 3; L >= 6; L--) {
      var pre = mt[1].slice(0, L).toUpperCase();
      if ((pre.match(/\d/g) || []).length >= 4 && tNorm.indexOf(' ' + pre + ' ') >= 0) return pre + ' ' + mt[1].slice(L) + (mt[2] || '');
    }
    return b;
  };
  var alvos = itensFo.map(function (i) { var b0 = pv_baseFo_(i.name, foLista), b = descolar(b0); var m = b.match(/^([A-Z0-9][A-Z0-9.\-\/]{3,})\s+(.+)$/i); return { id: i.id, colado: b !== b0, nome: b, codigo: m && /\d/.test(m[1]) ? m[1] : '', descricao: m ? m[2] : b }; });
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
    var anC = vd_analisar_(card.desc, card.name);
    // 23/10/2026 (FUR0C92): sem o " - FORNECEDOR" do item (como no casamento) — a peça casada aparecia também como "a mais"
    var descsCard = alvos.map(function (a) { return String(a.descricao || a.nome || '').replace(/\s-\s[A-Za-zÀ-ÿ0-9][^-]*$/, ''); }).concat(anC.pecas.concat(anC.naoComprar || []).map(function (p) { return p.descricao || ''; }));
    hdiL.forEach(function (p) {
      if (p.oficina) return;
      var dU = vd_semAcento_(p.descricao).toUpperCase();
      // 19/10/2026 (FOB8723): "REFATURAMENTO VALOR DA LANTERNA…" é cobrança, não peça; nome de fornecedor também não
      if (/REFATURA|\bVALOR\b|DIFERENCA|\bTAXA\b|MAO DE OBRA/.test(dU) || vd_ehServico_(dU) || pv_soFornecedor_(dU, foLista)) return;
      if (!descsCard.some(function (d) { return cp_similar_(d, p.descricao) > 0; })) extras.push(p.descricao + (p.fornecedor ? ' (' + p.fornecedor + ')' : ''));
    });
  } else if (pv_ehRelatorioPecasCilia_(texto)) {
    // relatório de peças novo do Cilia: peças a mais = códigos da tabela que o card não tem (20/10/2026, TAX1A70 — antes
    // o nº do orçamento "160115.1" aparecia como peça a mais)
    var relX = {}; try { relX = pv_lerRelatorioPecasCilia_(texto, foLista) || {}; } catch (e) {}
    Object.keys(relX).forEach(function (k) { if (!ja(k)) extras.push((relX[k].codigo + ' ' + relX[k].descricao).trim()); });
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
    achados: achados.map(function (r) { return { id: r.alvo.id, nome: r.alvo.nome, fornecedor: r.fornecedor, previsao: r.previsao ? Utilities.formatDate(new Date(r.previsao), 'America/Sao_Paulo', 'yyyy-MM-dd') : '', codigoNovo: r.codigoNovo || (r.alvo.colado ? r.alvo.codigo : ''), descNova: r.descNova || (r.alvo.colado ? r.alvo.descricao : ''), entregue: !!r.entregue, entregueEm: r.entregueEm ? Utilities.formatDate(new Date(r.entregueEm), 'America/Sao_Paulo', 'yyyy-MM-dd') : '',
      // vindo do parecer do Cilia (07/10/2026): motivo da nova previsão, situação BO, previsão que a tabela mostrava
      motivo: r.motivo || '', situacao: r.situacao || '', parecer: r.parecer || '', previsaoTabela: r.previsaoTabela ? Utilities.formatDate(new Date(r.previsaoTabela), 'America/Sao_Paulo', 'yyyy-MM-dd') : '' }; }),
    faltando: faltando, extras: extras.slice(0, 20)
  };
}

// Recebimento.gs:18
function rc_marcas_(nome) {
  var out = { base: String(nome || ''), local: '', retirada: '', devolvida: '', exCodigo: '' }, m;
  var re = new RegExp(RC_RE_MARCA.source, 'g');
  while ((m = re.exec(out.base))) { if (m[1] === '📍') out.local = m[2]; else if (m[1] === '✋') out.retirada = m[2]; else if (m[1] === '🔁') out.exCodigo = String(m[2] || '').replace(/^ex\s+/i, '').trim(); else out.devolvida = m[2]; }
  out.base = out.base.replace(new RegExp(RC_RE_MARCA.source, 'g'), '').trim();
  return out;
}

// Recebimento.gs:25
function rc_comMarcas_(base, mk) {
  var s = String(base || '').trim();
  if (mk.local) s += ' · 📍 ' + mk.local;
  if (mk.retirada) s += ' · ✋ ' + mk.retirada;
  if (mk.devolvida) s += ' · ↩️ ' + mk.devolvida;
  if (mk.exCodigo) s += ' · 🔁 ex ' + mk.exCodigo;   // 27/10/2026 (Weslley, KPJ9A04): código antigo da peça fica no item
  return s;
}

// Recebimento.gs:34
function rc_semMarcas_(nome) { return rc_marcas_(nome).base; }

// Recebimento.gs:35
function rc_normLocal_(s) { return vd_semAcento_(String(s || '')).replace(/[^A-Z0-9 \-\/]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }

// Recebimento.gs:37
function rc_locais_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('RC_LOCAIS') || '[]'); } catch (e) { return []; } }

// Recebimento.gs:38
function rc_guardarLocais_(novos) {
  if (!novos.length) return;
  sg_secao_('RC_LOCAIS', function () {
    var l = rc_locais_();
    novos.forEach(function (x) { if (x && l.indexOf(x) < 0) l.push(x); });
    l.sort();
    try { PropertiesService.getScriptProperties().setProperty('RC_LOCAIS', JSON.stringify(l.slice(-RC.LOCAIS_MAX))); } catch (e) {}
  });
}

// Recebimento.gs:48
function rc_gravarMarcas_(cardId, it, mk, token) {
  var m = rc_marcas_(it.nome), novo = {};
  Object.keys(m).forEach(function (k) { novo[k] = m[k]; });
  Object.keys(mk).forEach(function (k) { novo[k] = mk[k]; });
  var nome = rc_comMarcas_(novo.base, novo);
  if (nome === it.nome) return nome;
  vd_api_('/cards/' + cardId + '/checkItem/' + it.id, { method: 'put', payload: { name: nome } }, token);
  it.nome = nome;
  return nome;
}

// Recebimento.gs:64
function rc_cancelarCompra_(card, it, motivo, modo, token, me) {
  vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'delete' }, token);
  var partes = rc_semMarcas_(it.nome).split(/\s+-\s+/);
  var e = { peca: partes[0], particular: it.lista === 'PAGAS PARTICULAR', fornecedor: partes.length >= 2 ? partes[1] : '',
    valor: vd_valorNum_(((partes[2] || '').match(/[\d.]+(?:,\d{1,2})?/) || [''])[0]), previsao: it.due || '',
    detalhe: (modo === 'devolvida' ? 'DEVOLVIDA AO FORNECEDOR' : 'COMPRA CANCELADA') + (motivo ? ': ' + motivo : '') + ' · ' + it.lista };
  try { ev_registrar_('COMPRA CANCELADA', card, me.username, [e], { detalhe: modo + (motivo ? ' — ' + motivo : '') }); } catch (x) {}
  try { rc_aposCancelar_(card, it, motivo, modo, token); } catch (x) { console.log('cancelar/ajustes: ' + x); }
  return (modo === 'devolvida' ? '↩️ ' : '❌ ') + partes[0] + (partes[1] ? ' (' + partes[1] + ')' : '') + ' — ' + (modo === 'devolvida' ? 'devolvida ao fornecedor' : 'compra cancelada') + (motivo ? ': ' + motivo : '') + ' · verificar compra do item';
}

// Recebimento.gs:80
function rc_aposCancelar_(card, it, motivo, modo, token) {
  if (!vd_ajustes1910_()) return;
  (card.checklists || []).forEach(function (k) { k.checkItems = (k.checkItems || []).filter(function (i) { return i.id !== it.id; }); });
  var nomeIt = vd_semAcento_(rc_semMarcas_(it.nome)), partes = rc_semMarcas_(it.nome).split(/\s+-\s+/);
  if (card.desc && !vd_ehVitrineSemCompleta_(card.desc)) {   // sem a descrição completa não regrava nada (só a Data Entrega)
    var an = vd_analisar_(card.desc, card.name);
    var peca = (an.pecas || []).filter(function (p) { return vd_casaItem_(nomeIt, vd_chavePeca_(p)); })[0];
    if (peca) {
      var k = vd_chavePeca_(peca), resto = [];
      (card.checklists || []).forEach(function (ck) { if (/^PAGAS/i.test(String(ck.name || '').trim())) (ck.checkItems || []).forEach(function (i) { resto.push(vd_semAcento_(i.name)); }); });
      var reler = function () { try { card.desc = vd_api_('/cards/' + card.id, { query: { fields: 'desc' } }).desc; } catch (x) {} };
      if (peca.compStatus === 'ANTECIPADO' && !resto.some(function (n) { return vd_casaItem_(n, k); })) {
        peca.compStatus = ''; peca.compPor = '';
        if (vdf_regravarLinhasPeca_(card, [peca], token)) reler();
      }
      var nomeP = peca.pneu ? 'PNEU ' + String(peca.medida || '').replace(/\s+/g, '') : vd_nomePeca_(peca);
      var quando = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM');
      var linha = 'OBS ' + nomeP + ': (' + (modo === 'devolvida' ? 'devolvida' : 'compra cancelada') + ' ' + quando + (partes[1] ? ' · ' + partes[1] : '') + ') ' + String(motivo || '').replace(/\s*\n\s*/g, ' ').trim();
      var div = vd_dividir_(card.desc);
      vd_gravarDesc_(card.id, div.bloco.replace(/\s+$/, '') + '\n\n' + (div.temMarcador ? div.resto.replace(/\s+$/, '') : VD.MARCADOR) + '\n' + linha, token);
      reler();
    }
  }
  // Data Entrega: a previsão da compra cancelada não vale mais
  var maior = '';
  (card.checklists || []).forEach(function (ck) {
    if (!/^(PAGAS|FORNECIMENTO)/i.test(String(ck.name || '').trim())) return;
    (ck.checkItems || []).forEach(function (i) { if (i.state !== 'complete' && i.due && (!maior || new Date(i.due) > new Date(maior))) maior = i.due; });
  });
  if (!maior) maior = new Date(du_somarUteis_(PZ.DIAS_SEM_PREVISAO, new Date().toISOString())).toISOString();
  vd_api_('/cards/' + card.id, { method: 'put', payload: { due: maior, dueComplete: false } }, token);
}

// Recebimento.gs:118
function ck_aceitarManual_(cardId, m) {
  var card = vd_api_('/cards/' + cardId, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return [];
  var me = { username: String(m.quem || '').toLowerCase(), fullName: m.nome || m.quem };
  if (!vdf_podeReceber_(me, card)) return [];
  var todos = vdf_itensRecebimento_(card), porId = {};
  todos.forEach(function (i) { porId[i.id] = i; });
  var hoje = rc_data_(''), linhas = [], evs = [], aceitos = [];
  (m.itens || []).forEach(function (ci) {
    var it = porId[ci.id];
    if (!it || !it.ok) return;   // já desmarcado de novo / item sumiu
    aceitos.push(it.id);
    if (it.devolvida) { try { rc_gravarMarcas_(card.id, it, { devolvida: '' }, null); } catch (e) {} }
    var atr = rc_atraso_(it.due, hoje);
    var atrTxt = atr === null ? '' : (atr > 0 ? ' · **' + atr + ' d.u. de atraso**' : (atr < 0 ? ' · ' + (-atr) + ' d.u. antes' : ' · no prazo'));
    linhas.push('✔ ' + it.base.split(/\s+-\s+/)[0] + ' — ' + Utilities.formatDate(hoje, 'America/Sao_Paulo', 'dd/MM') + atrTxt);
    var partes = it.base.split(/\s+-\s+/), ehPg = /^PAGAS/.test(it.lista);
    evs.push({ peca: partes[0], particular: it.lista === 'PAGAS PARTICULAR', fornecedor: ehPg && partes.length >= 2 ? partes[1] : (/^FORNECIMENTO/.test(it.lista) ? 'SEGURADORA (FO)' : ''),
      valor: ehPg ? vd_valorNum_(((partes[2] || '').match(/[\d.]+(?:,\d{1,2})?/) || [''])[0]) : '', previsao: it.due || '', dias: atr === null ? '' : atr,
      detalhe: 'chegou ' + Utilities.formatDate(hoje, 'America/Sao_Paulo', 'dd/MM/yyyy') + (atr === null ? '' : ' · atraso ' + atr + ' d.u.') + ' · ✔ marcado no Trello · ' + it.lista });
  });
  if (!aceitos.length) return [];
  var pend = todos.filter(function (i) { return !i.ok; });
  var movido = ''; try { movido = rc_reavaliarColuna_(card.id, null, m.quem); } catch (e) { console.log('✔ manual/coluna: ' + e); }
  try {
    vd_comentar_(card, '📦 **RECEBIMENTO** — ' + (m.nome || m.quem) + ' (✔ marcado no Trello)' + (movido ? ' → **' + movido + '**' : '') + '\n' + linhas.join('\n') +
      '\n_Dica: pela aba 📦 Recebimento dá para informar a data certa, onde guardou (📍) e anexar a nota._' +
      (pend.length ? '\n⏳ Falta chegar: ' + pend.map(function (i) { return i.base.split(/\s+-\s+/)[0]; }).join(', ') : '\n✅ Tudo recebido.'));
  } catch (e) {}
  try { ev_registrar_('RECEBIMENTO', card, m.quem, evs, { detalhe: '✔ marcado no Trello' }); } catch (e) {}
  try { vd_redesenhar_(card.id); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return aceitos;
}

// Recebimento.gs:157
function rc_quemLista_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('RC_QUEM') || '[]'); } catch (e) { return []; } }

// Recebimento.gs:158
function rc_guardarQuem_(q) {
  if (!q) return;
  sg_secao_('RC_QUEM', function () {
    var l = rc_quemLista_(); if (l.indexOf(q) >= 0) return;
    l.push(q); l.sort();
    try { PropertiesService.getScriptProperties().setProperty('RC_QUEM', JSON.stringify(l.slice(-RC.LOCAIS_MAX))); } catch (e) {}
  });
}

// Recebimento.gs:166
function vdf_salvarRetirada(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (!vdf_podeReceber_(me, card)) return { ok: false, faltas: ['Em Toledo, a retirada é registrada pelo setor de compras (ou pela diretoria) — sua conta: ' + me.username + '.'] };
  var todos = vdf_itensRecebimento_(card), porId = {};
  todos.forEach(function (i) { porId[i.id] = i; });
  var ids = (p.itens || []).filter(function (id) { return porId[id] && porId[id].ok && !porId[id].retirada; });
  var desf = (p.desfazer || []).filter(function (x) { return x && porId[x.id] && porId[x.id].retirada; });
  var quem = vd_semAcento_(String(p.quem || '')).replace(/[^A-Z0-9 \-\/]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  var faltas = [];
  if (ids.length && !quem) faltas.push('Informe quem retirou as peças.');
  desf.forEach(function (x) { if (!String(x.motivo || '').trim()) faltas.push(pv_curto_(porId[x.id].base) + ': escreva o motivo para desfazer a retirada.'); });
  if (p.data && new Date(p.data + 'T12:00:00').getTime() > Date.now() + 864e5) faltas.push('Data da retirada no futuro (' + p.data + ') — confira.');
  if (!ids.length && !desf.length && !faltas.length) faltas.push('Marque pelo menos uma peça retirada (só aparecem peças já recebidas).');
  if (faltas.length) return { ok: false, faltas: faltas };
  var quando = rc_data_(p.data), dd = Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM');
  var linhas = [], evs = [], evsD = [];
  ids.forEach(function (id) {
    var it = porId[id];
    rc_gravarMarcas_(card.id, it, { retirada: quem + ' ' + dd }, token);
    it.retirada = quem + ' ' + dd;
    var pt = it.base.split(/\s+-\s+/);
    linhas.push('✋ ' + pt[0] + (it.local ? ' (estava em ' + it.local + ')' : ''));
    evs.push({ peca: pt[0], particular: it.lista === 'PAGAS PARTICULAR', fornecedor: /^PAGAS/.test(it.lista) && pt.length >= 2 ? pt[1] : (/^FORNECIMENTO/.test(it.lista) ? 'SEGURADORA (FO)' : ''),
      detalhe: 'retirada por ' + quem + ' em ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM/yyyy') + (it.local ? ' · estava em ' + it.local : '') + ' · ' + it.lista });
  });
  desf.forEach(function (x) {
    var it = porId[x.id], motivo = String(x.motivo).replace(/\s*\n\s*/g, ' ').trim(), era = it.retirada;
    rc_gravarMarcas_(card.id, it, { retirada: '' }, token);
    it.retirada = '';
    var pt = it.base.split(/\s+-\s+/);
    linhas.push('↩️ retirada desfeita: ' + pt[0] + ' (era ' + era + ') — ' + motivo);
    evsD.push({ peca: pt[0], detalhe: 'RETIRADA DESFEITA (era ' + era + '): ' + motivo + ' · ' + it.lista });
  });
  rc_guardarQuem_(quem);
  // tudo recebido e tudo retirado: ENCERRADO -> ENTREGUES
  var movido = '', lista = vdf_nomeLista_(ctx, card.idList);
  var noEstoque = todos.filter(function (i) { return i.ok && !i.retirada; }), pendRec = todos.filter(function (i) { return !i.ok; });
  var devPend = []; try { devPend = rc_devolucoesPendentes_(card); } catch (e) {}
  if (lista === RC.LISTA_FIM && todos.length && !pendRec.length && !noEstoque.length && ctx.listas['ENTREGUES']) {
    // 21/10/2026 (Weslley): devolução sem NF segura o card em ENCERRADO até o comprador informar a NF (aba Recebimento → Devoluções)
    if (devPend.length) linhas.push('⏳ O card fica em **' + RC.LISTA_FIM + '**: NF de devolução pendente — ' + devPend.map(function (d) { return d.peca; }).join('; '));
    else { try { movido = vdf_moverPara_(card, ctx, 'ENTREGUES', token, me.username); } catch (e) { console.log('retirada/coluna: ' + e); } }
  }
  try {
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '✋ **RETIRADA** — ' + me.fullName + (ids.length ? ' · por **' + quem + '** em ' + dd : '') + (movido ? ' → **' + movido + '**' : '') + '\n' + linhas.join('\n') +
      (noEstoque.length ? '\n📦 Ainda no estoque: ' + noEstoque.map(function (i) { return i.base.split(/\s+-\s+/)[0] + (i.local ? ' (' + i.local + ')' : ''); }).join(', ') : (pendRec.length ? '' : '\n✅ Todas as peças retiradas.')) } }, token);
  } catch (e) {}
  try { if (evs.length) ev_registrar_('RETIRADA', card, me.username, evs, { detalhe: ids.length + ' peça(s) · ' + quem }); } catch (e) {}
  try { if (evsD.length) ev_registrar_('RETIRADA', card, me.username, evsD, { detalhe: 'desfeita' }); } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: ids.length, desfeitas: desf.length, faltam: noEstoque.length, lista: movido || lista };
}

// Recebimento.gs:225
function vdf_cancelarCompra(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_podeComprar_(me)) return { ok: false, faltas: ['Só o setor de compras (ou a diretoria) cancela uma compra — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var it = vdf_itensRecebimento_(card).filter(function (i) { return i.id === p.id; })[0];
  if (!it || !/^PAGAS/.test(it.lista)) return { ok: false, faltas: ['Item de compra não encontrado (atualize a página).'] };
  if (it.ok) return { ok: false, faltas: ['Esta peça já foi recebida — se voltou ao fornecedor, use "↩️ devolvida" na aba 📦 Recebimento.'] };
  var motivo = String(p.motivo || '').replace(/\s*\n\s*/g, ' ').trim();
  if (!motivo) return { ok: false, faltas: ['Escreva o motivo do cancelamento — vai para o card.'] };
  var linha = rc_cancelarCompra_(card, it, motivo, 'cancelada', token, me);
  var movido = ''; try { movido = rc_reavaliarColuna_(card.id, token, me.username, { semCompra: true }); } catch (e) { console.log('cancelar/coluna: ' + e); }
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '❌ **COMPRA CANCELADA** — ' + me.fullName + (movido ? ' → **' + movido + '**' : '') + '\n' + linha } }, token); } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, lista: movido || vdf_nomeLista_(vd_contexto_(), card.idList) };
}

// Recebimento.gs:247
function vdf_renomearPagas(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria renomeia itens de compra — sua conta: ' + me.username + '.'] };
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,idBoard,shortLink,shortUrl', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var porId = {}; vdf_itensRecebimento_(card).forEach(function (i) { if (/^PAGAS/.test(i.lista)) porId[i.id] = i; });
  var faltas = [], feitos = [];
  (p.itens || []).forEach(function (x) {
    var it = porId[x && x.id], nome = String((x && x.nome) || '').replace(/\s+/g, ' ').trim().toUpperCase();
    if (!it) { faltas.push('item ' + (x && x.id) + ' não está no PAGAS deste card'); return; }
    if (!nome || nome.length > 200) { faltas.push(it.nome + ': nome vazio ou longo demais'); return; }
    var novo = rc_comMarcas_(nome, rc_marcas_(it.nome));
    if (novo === it.nome) return;
    vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'put', payload: { name: novo } }, token);
    feitos.push('• ' + it.base + ' → ' + nome);
  });
  if (faltas.length) return { ok: false, faltas: faltas, feitos: feitos.length };
  if (feitos.length) { try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🔄 **Compras do card antigo no padrão novo** — ' + me.fullName + '\n' + feitos.join('\n') } }, token); } catch (e) {} }
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  return { ok: true, n: feitos.length, url: card.shortUrl };
}

// Recebimento.gs:273
function vdf_encerrarSemPecas(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria encerra card sem peças — sua conta: ' + me.username + '.'] };
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,idBoard,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var an = vd_analisar_(card.desc, card.name), pend = vdf_itensRecebimento_(card).filter(function (i) { return !i.ok; });
  if ((an.pecas || []).length) return { ok: false, faltas: ['O card tem ' + an.pecas.length + ' peça(s) no pedido — use o fluxo normal (ou marque 🚫 Não comprar).'] };
  if (pend.length) return { ok: false, faltas: ['O card tem ' + pend.length + ' item(ns) de checklist ainda não recebido(s).'] };
  var motivo = String(p.motivo || '').replace(/\s*\n\s*/g, ' ').trim().slice(0, 300);
  if (!motivo) return { ok: false, faltas: ['Escreva o motivo — vai para o card.'] };
  var mv = vdf_moverPara_(card, ctx, RC.LISTA_FIM, token, me.username);
  try { vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '🔒 **Encerrado sem peças** — ' + me.fullName + (mv ? ' → **' + mv + '**' : '') + '\n📝 ' + motivo } }, token); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, lista: mv || vdf_nomeLista_(ctx, card.idList) };
}

// Recebimento.gs:292
function vdf_itensRecebimento_(c) {
  var out = [];
  (c.checklists || []).forEach(function (k) {
    var nm = String(k.name || '').trim();
    var comp = /COMPLEMENTO/i.test(nm);
    var tipo = /^PAGAS/i.test(nm) ? (/PARTICULAR/i.test(nm) ? 'PAGAS PARTICULAR' : (comp ? 'PAGAS COMPLEMENTO' : 'PAGAS')) : (/FORNECIMENTO/i.test(nm) ? (comp ? 'FORNECIMENTO COMPLEMENTO' : 'FORNECIMENTO') : '');
    if (!tipo) return;
    (k.checkItems || []).forEach(function (i) {
      var mk = rc_marcas_(i.name);
      out.push({ id: i.id, nome: i.name, base: mk.base, local: mk.local, retirada: mk.retirada, devolvida: mk.devolvida, exCodigo: mk.exCodigo, ok: i.state === 'complete', due: i.due || '', lista: tipo });
    });
  });
  return out;
}

// Recebimento.gs:308
function rc_atraso_(dueIso, chegada) {
  if (!dueIso) return null;
  var d0 = new Date(dueIso), a = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), 12);
  var b = new Date(chegada.getFullYear(), chegada.getMonth(), chegada.getDate(), 12);
  if (a.getTime() === b.getTime()) return 0;
  var sinal = b > a ? 1 : -1, n = 0, d = new Date(a.getTime()), guarda = 0;
  while (du_chave_(d) !== du_chave_(b) && guarda++ < 400) { d.setDate(d.getDate() + sinal); if (du_ehUtil_(d)) n++; }
  return sinal * n;
}

// Recebimento.gs:318
function rc_data_(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  var h = new Date();
  var d = m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12);
  if (d.getTime() > Date.now() + 864e5) d = new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12);   // sem data futura
  return d;
}

// Recebimento.gs:330
function vdf_podeReceber_(me, card) {
  if (vdf_podeComprar_(me)) return true;
  var u = ev_unidade_(card);   // campo "Unidade"; etiqueta só em card antigo
  return !/TOLEDO/i.test(u || '');
}

// Recebimento.gs:335
function vdf_salvarRecebimento(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (!vdf_podeReceber_(me, card)) return { ok: false, faltas: ['Este card está com a Unidade TOLEDO — em Toledo, o recebimento é registrado pelo setor de compras (ou pela diretoria); sua conta: ' + me.username + '. Se o carro é de outra unidade, corrija o campo Unidade do card (ou peça ao consultor) e tente de novo.'] };
  var todos = vdf_itensRecebimento_(card), porId = {};
  todos.forEach(function (i) { porId[i.id] = i; });
  var itens = (p.itens || []).filter(function (x) { return porId[x.id]; });
  var anexos = (p.anexos || []).filter(function (a) { return a && a.fileId; });
  // 10/10/2026: local no estoque de peça já recebida, retirada (quem levou) e devolução ao fornecedor
  var locais = (p.locais || []).filter(function (x) { return porId[x.id] && porId[x.id].ok; });
  var retiradas = (p.retiradas || []).filter(function (x) { return porId[x.id] && porId[x.id].ok; });
  var devolucoes = (p.devolucoes || []).filter(function (x) { return porId[x.id] && porId[x.id].ok; });
  if (!itens.length && !anexos.length && !locais.length && !retiradas.length && !devolucoes.length) return { ok: false, faltas: ['Marque pelo menos uma peça que chegou (ou anexe a nota/foto).'] };
  var faltas = [];
  retiradas.forEach(function (x) { if (!String(x.quem || '').trim()) faltas.push(pv_curto_(porId[x.id].nome) + ': informe quem retirou a peça.'); });
  devolucoes.forEach(function (x) { if (!String(x.motivo || '').trim()) faltas.push(pv_curto_(porId[x.id].nome) + ': escreva o motivo da devolução ao fornecedor.'); });
  if (faltas.length) return { ok: false, faltas: faltas };

  var linhas = [], evs = [], feitos = 0, locaisNovos = [];
  // data futura: antes virava "hoje" sem aviso (10/10/2026) — agora é erro
  var dataFutura = itens.filter(function (x) { return x.data && new Date(x.data + 'T12:00:00').getTime() > Date.now() + 864e5; });
  if (dataFutura.length) return { ok: false, faltas: dataFutura.map(function (x) { return pv_curto_(porId[x.id].nome) + ': data da chegada no futuro (' + x.data + ') — confira.'; }) };
  var marcar = [];   // 17/10/2026: marcar como recebido em paralelo (39 peças = ~20 s uma a uma)
  itens.forEach(function (x) {
    var it = porId[x.id], quando = rc_data_(x.data), obs = String(x.obs || '').replace(/\s*\n\s*/g, ' ').trim(), local = rc_normLocal_(x.local);
    if (!it.ok) {
      marcar.push({ caminho: '/cards/' + card.id + '/checkItem/' + it.id, opts: { method: 'put', payload: { state: 'complete' } } });
      it.ok = true; feitos++;
    }
    if (local) { try { rc_gravarMarcas_(card.id, it, { local: local, devolvida: '' }, token); locaisNovos.push(local); } catch (e) { console.log('local: ' + e); } }
    else if (it.devolvida) { try { rc_gravarMarcas_(card.id, it, { devolvida: '' }, token); } catch (e) {} }
    var atr = rc_atraso_(it.due, quando);
    var atrTxt = atr === null ? '' : (atr > 0 ? ' · **' + atr + ' d.u. de atraso**' : (atr < 0 ? ' · ' + (-atr) + ' d.u. antes' : ' · no prazo'));
    linhas.push('✔ ' + it.base.split(/\s+-\s+/)[0] + ' — ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM') + atrTxt + (local ? ' · 📍 ' + local : '') + (obs ? ' · 📝 ' + obs : ''));
    var partes = it.base.split(/\s+-\s+/);
    var ehPg = /^PAGAS/.test(it.lista);
    evs.push({ peca: partes[0], particular: it.lista === 'PAGAS PARTICULAR', fornecedor: ehPg && partes.length >= 2 ? partes[1] : (/^FORNECIMENTO/.test(it.lista) ? 'SEGURADORA (FO)' : ''),
      valor: ehPg ? vd_valorNum_(((partes[2] || '').match(/[\d.]+(?:,\d{1,2})?/) || [''])[0]) : '',
      previsao: it.due || '', dias: atr === null ? '' : atr,
      detalhe: 'chegou ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM/yyyy') + (atr === null ? '' : ' · atraso ' + atr + ' d.u.') + (local ? ' · local ' + local : '') + (obs ? ' · ' + obs : '') + ' · ' + it.lista });
  });
  if (marcar.length) vd_apiLote_(marcar, token);
  // local de peça já recebida
  locais.forEach(function (x) {
    var it = porId[x.id], local = rc_normLocal_(x.local);
    if (!local || local === it.local) return;
    try { rc_gravarMarcas_(card.id, it, { local: local }, token); locaisNovos.push(local); linhas.push('📍 ' + it.base.split(/\s+-\s+/)[0] + ' → ' + local); } catch (e) { console.log('local: ' + e); }
  });
  // retirada: quem levou a peça (funileiro, unidade, montagem) e quando
  var evsRet = [];
  retiradas.forEach(function (x) {
    var it = porId[x.id], quem = vd_semAcento_(String(x.quem || '')).replace(/[^A-Z0-9 \-\/]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24), quando = rc_data_(x.data);
    var marca = quem + ' ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM');
    try { rc_gravarMarcas_(card.id, it, { retirada: marca }, token); } catch (e) { console.log('retirada: ' + e); return; }
    var partes = it.base.split(/\s+-\s+/);
    linhas.push('✋ ' + partes[0] + ' — retirada por ' + quem + ' em ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM'));
    evsRet.push({ peca: partes[0], particular: it.lista === 'PAGAS PARTICULAR', fornecedor: /^PAGAS/.test(it.lista) && partes.length >= 2 ? partes[1] : (/^FORNECIMENTO/.test(it.lista) ? 'SEGURADORA (FO)' : ''), detalhe: 'retirada por ' + quem + ' em ' + Utilities.formatDate(quando, 'America/Sao_Paulo', 'dd/MM/yyyy') + (it.local ? ' · estava em ' + it.local : '') + ' · ' + it.lista });
  });
  // devolução ao fornecedor: peça PAGAS sai do checklist (compra cancelada, precisa de compra nova); peça FO volta a pendente
  var evsDev = [], devPagas = 0;
  devolucoes.forEach(function (x) {
    var it = porId[x.id], motivo = String(x.motivo || '').replace(/\s*\n\s*/g, ' ').trim();
    try {
      try { rc_registrarDevolucao_(card, it, motivo, !/^PAGAS/.test(it.lista), token); } catch (eD) { console.log('devolução/checklist: ' + eD); }   // 21/10/2026: checklist DEVOLUÇÕES
      if (/^PAGAS/.test(it.lista)) { devPagas++; linhas.push(rc_cancelarCompra_(card, it, motivo, 'devolvida', token, me)); delete porId[x.id]; todos = todos.filter(function (i) { return i.id !== it.id; }); }
      else {
        vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'put', payload: { state: 'incomplete' } }, token);
        it.ok = false;
        rc_gravarMarcas_(card.id, it, { local: '', retirada: '', devolvida: Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM') }, token);
        var partesD = it.base.split(/\s+-\s+/);
        linhas.push('↩️ ' + partesD[0] + ' — devolvida (fornecimento da seguradora): ' + motivo + ' · verificar prazo do item');
        evsDev.push({ peca: partesD[0], fornecedor: 'SEGURADORA (FO)', detalhe: 'DEVOLVIDA: ' + motivo + ' · ' + it.lista });
      }
    } catch (e) { console.log('devolução: ' + e); }
  });
  rc_guardarLocais_(locaisNovos);

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
      // nota: padrão das rotinas de NF — "NF <EMITENTE> - <nº> - <dd-mm emissão>.pdf" (13/10/2026, Weslley); sem leitura, o antigo
      var nfR = null;
      if (ehNf) {
        try {
          var txtNf = /xml/i.test(f.getMimeType() || '') || /\.xml$/i.test(f.getName()) ? f.getBlob().getDataAsString()
            : (f.getSize() <= 8 * 1024 * 1024 ? vd_ocr_(f.getBlob(), f.getName()) : '');
          nfR = ax_dadosNf_(txtNf);
        } catch (e) { console.log('nota do recebimento: ' + e); }
      }
      var soFoNf = (a.ids || []).length && (a.ids || []).every(function (id) { return porId[id] && /^FORNECIMENTO/.test(porId[id].lista || ''); });
      if (nfR && !nfR.emitente && forns.length) nfR.emitente = ax_emitente20_(forns[0]);
      var nome = ehNf
        ? (nfR ? ax_nomeNfRotina_(nfR, soFoNf, null, /xml/i.test(f.getMimeType() || '') || /\.xml$/i.test(f.getName()) ? '.xml' : '.pdf') : ax_nome_(AX.NF, placaCard, [forns.join(', ') || refs.slice(0, 2).join(', ')]))
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
  try { movido = rc_reavaliarColuna_(card.id, token, me.username, { semCompra: devolucoes.length > 0 }); } catch (e) { console.log('recebimento/coluna: ' + e); }
  try {
    var geral = String(p.geral || '').trim();
    var soMarcas = !itens.length && !anexos.length;   // só local/retirada/devolução: título diferente
    var txt = (soMarcas ? '📦 **PEÇAS — local / devolução** — ' : '📦 **RECEBIMENTO** — ') + me.fullName + (movido ? ' → **' + movido + '**' : '') + '\n' + (linhas.length ? linhas.join('\n') : '_(só anexos)_') +
      (nAnexos ? '\n📎 ' + nAnexos + ' anexo(s)' : '') +
      (geral ? '\n📝 ' + geral : '') +
      (pend.length ? '\n⏳ Falta chegar: ' + pend.map(function (i) { return i.base.split(/\s+-\s+/)[0]; }).join(', ') :
        // 19/10/2026 (revisão): compra devolvida saiu do checklist — "tudo recebido" enganava; a peça precisa de compra nova
        (vd_ajustes1910_() && devPagas ? '\n🔁 Falta comprar de novo a peça devolvida.' : (todos.length ? '\n✅ Tudo recebido.' : '')));
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } }, token);
  } catch (e) {}
  try { if (evs.length || nAnexos || itens.length) ev_registrar_('RECEBIMENTO', card, me.username, evs.length ? evs : null, { detalhe: nAnexos ? nAnexos + ' anexo(s)' : '' }); } catch (e) {}
  try { if (evsRet.length) ev_registrar_('RETIRADA', card, me.username, evsRet, { detalhe: evsRet.length + ' peça(s)' }); } catch (e) {}
  try { if (evsDev.length) ev_registrar_('DEVOLUÇÃO FO', card, me.username, evsDev, { detalhe: evsDev.length + ' peça(s)' }); } catch (e) {}
  try { vd_redesenhar_(card.id, token); } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: feitos, anexos: nAnexos, faltam: pend.length, locais: locais.length + locaisNovos.length, retiradas: retiradas.length, devolucoes: devolucoes.length, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

// Recebimento.gs:484
function rc_reavaliarColuna_(cardOuId, token, usuario, opt) {
  var id = typeof cardOuId === 'string' ? cardOuId : cardOuId.id;
  opt = opt || {};
  var card = vd_api_('/cards/' + id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state' } });
  if (vdf_cardProtegido_(card.name)) return '';
  // item FO com o mesmo código de uma peça da oficina: sai do checklist (a oficina venceu) antes de avaliar a coluna (07/10/2026)
  try {
    var foFora = cp_foNaOficina_(card, token, usuario ? '@' + usuario : '');
    if (foFora.length) card = vd_api_('/cards/' + id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,labels', checklists: 'all', checkItem_fields: 'name,state' } });
  } catch (e) { console.log('FO na oficina: ' + e); }
  // 17/10/2026 (teste das cópias): sem a descrição completa (só a vitrine) a análise não vê peça nenhuma e o card ia para
  // ENCERRADO como "sem peça para a oficina comprar". Sem a completa, as regras que leem as peças não valem (próximo ciclo).
  var semCompleta = vd_ehVitrineSemCompleta_(card.desc);
  if (semCompleta) console.log('coluna: ' + card.shortLink + ' sem descrição completa — só a regra dos checklists vale');
  var ctx = vd_contexto_(), lista = vdf_nomeLista_(ctx, card.idList);
  var itens = vdf_itensRecebimento_(card), pend = itens.filter(function (i) { return !i.ok; });
  var alvo = '', soFo = '';
  // compra cancelada / peça devolvida ao fornecedor (10/10/2026): peça autorizada sem item PAGAS -> volta para AUTORIZADO COMPRA
  // (só quando quem chamou acabou de cancelar/devolver — opt.semCompra — para não mexer em card antigo com PAGAS fora do padrão)
  var semCompra = false;
  if (opt.semCompra && !semCompleta && (lista === VDF_LISTA_CHEGAR || lista === RC.LISTA_FIM || lista === 'ENTREGUES') && ctx.listas[VDF_LISTA_AUTORIZADO] && !vd_legado_(card.id)) {
    try {
      var anC = vd_analisar_(card.desc, card.name), autsC = vd_autorizacoesDaDescricao_(card.desc, anC.pecas), pagasC = vdf_itensPagas_(card);
      var naoC = {}; (anC.pecas || []).forEach(function (p) { if (p.naoComprar) naoC[vd_chavePeca_(p)] = 1; });
      semCompra = autsC.some(function (a) { return !naoC[a.chave] && !pagasC.some(function (n) { return vd_casaItem_(n, a.chave); }); });
    } catch (e) { console.log('coluna/sem compra: ' + e); }
  }
  if (semCompra) alvo = VDF_LISTA_AUTORIZADO;
  else if ((lista === VDF_LISTA_CHEGAR || (lista === RC.LISTA_FIM && opt.reavaliar)) && itens.length && !pend.length) {
    if (lista === VDF_LISTA_CHEGAR) alvo = RC.LISTA_FIM;
    // 27/10/2026 (Weslley, ATP5105 — "encerrado mas não está completo, tem coisa sem autorizar"): peça da oficina cotada que
    // ninguém autorizou nem marcou 🚫 não comprar é "sem decisão" — tudo comprado chegou, mas o card NÃO encerra: volta para
    // quem decide (PENDENTE AUTORIZAR / COTAÇÃO FINALIZADA; EM COTAÇÃO se faltar cotação).
    if (!semCompleta && !vd_legado_(card.id)) {
      try {
        var anP = vd_analisar_(card.desc, card.name), autsP = vd_autorizacoesDaDescricao_(card.desc, anP.pecas), pagasP = vdf_itensPagas_(card);
        var semDec = (anP.pecas || []).filter(function (x) {
          var k = vd_chavePeca_(x);
          return k && !x.naoComprar && !autsP.some(function (a) { return a.chave === k; }) && !pagasP.some(function (n) { return vd_casaItem_(n, k); });
        });
        if (semDec.length) {
          var faltamP = [];
          try { faltamP = vdf_coberturaCotacao_(card.desc, semDec).faltam || []; } catch (e) {}
          var soPartP = semDec.every(function (x) { return vdf_pecaParticular_(x, card, anP); });
          alvo = faltamP.length ? VD.LISTA_COTACAO : (soPartP ? VDF_LISTA_FINALIZADA : VDF_LISTA_PENDENTE);
          soFo = 'tudo que foi comprado chegou, mas ' + semDec.length + ' peça(s) ainda sem decisão: ' + semDec.map(vd_nomePeca_).join('; ') +
            ' — ' + (faltamP.length ? 'falta cotação do comprador' : 'autorizar ou marcar 🚫 não comprar pela aba ✅ Autorizar');
        }
      } catch (e) { console.log('coluna/sem decisão: ' + e); }
    }
  }
  else if (lista === VDF_LISTA_AUTORIZADO && !semCompleta) {
    // toda peça autorizada já está no PAGAS (ex.: a não autorizada foi removida do pedido)
    var anA = vd_analisar_(card.desc, card.name), autsA = vd_autorizacoesDaDescricao_(card.desc, anA.pecas);
    var pagas = vdf_itensPagas_(card);
    if (autsA.length && autsA.every(function (a) { return pagas.some(function (n) { return vd_casaItem_(n, a.chave); }); })) alvo = VDF_LISTA_CHEGAR;
  }
  else if ((lista === RC.LISTA_FIM || lista === 'ENTREGUES') && pend.length) alvo = VDF_LISTA_CHEGAR;
  // sem peça da oficina para comprar (só FO, ou tudo marcado 🚫 não comprar) em qualquer coluna antes da compra:
  // não tem o que cotar/autorizar -> FALTA CHEGAR (FO pendente) ou ENCERRADO (nada a receber). 05/10/2026 (QPG1B84)
  if (!alvo && !semCompleta && [VD.LISTA_COTACAO, VD.LISTA_FALTA, VDF_LISTA_FINALIZADA, VDF_LISTA_PENDENTE, VDF_LISTA_AUTORIZADO].indexOf(lista) >= 0 &&
      itens.every(function (i) { return /^FORNECIMENTO/.test(i.lista) || i.ok; }) && !vd_legado_(card.id)) {   // card antigo (sem descrição do formulário) não é mexido; PAGAS já recebido não impede (13/10/2026, BBG3844: tudo 🚫 e compras antigas ✔)
    var an = vd_analisar_(card.desc, card.name);
    if (!an.pecas.length && (itens.length || (an.naoComprar || []).length)) {
      alvo = pend.length ? VDF_LISTA_CHEGAR : RC.LISTA_FIM;
      soFo = 'sem peça para a oficina comprar' + ((an.naoComprar || []).length ? ' (' + an.naoComprar.length + ' marcada(s) 🚫 não comprar)' : '') +
        (pend.length ? ' · ' + pend.length + ' peça(s) da seguradora para chegar' : (itens.length ? ' · fornecimento todo recebido' : ' · nada a receber'));
    }
  }
  // toda peça da oficina JÁ COMPRADA (está no PAGAS) e o resto 🚫 não comprar, mas o card voltou para antes da compra
  // (ex.: orçamento complementar trouxe peça nova que a diretoria marcou não comprar — RAM9I31, 13/10/2026):
  // não tem o que cotar -> FALTA CHEGAR (falta receber) ou ENCERRADO (tudo recebido)
  if (!alvo && !semCompleta && [VD.LISTA_COTACAO, VD.LISTA_FALTA, VDF_LISTA_FINALIZADA, VDF_LISTA_PENDENTE, VDF_LISTA_AUTORIZADO].indexOf(lista) >= 0 &&
      itens.length && !vd_legado_(card.id)) {
    try {
      var anJ = vd_analisar_(card.desc, card.name), pagasJ = vdf_itensPagas_(card);
      if ((anJ.pecas || []).length && pagasJ.length && !(anJ.faltas || []).length &&
          anJ.pecas.every(function (p) { return pagasJ.some(function (n) { return vd_casaItem_(n, vd_chavePeca_(p)); }); })) {
        alvo = pend.length ? VDF_LISTA_CHEGAR : RC.LISTA_FIM;
        soFo = 'toda peça da oficina já comprada' + ((anJ.naoComprar || []).length ? ', ' + anJ.naoComprar.length + ' marcada(s) 🚫 não comprar' : '') +
          (pend.length ? ' · ' + pend.length + ' peça(s) para chegar' : ' · tudo recebido');
      }
    } catch (e) { console.log('coluna/já comprado: ' + e); }
  }
  /* 26/10/2026 (Weslley, AYT6699: "mudei para seguradora e continua em COTAÇÃO FINALIZADA, deveria ir para PENDENTE AUTORIZAR"):
   * quem paga mudou depois da cotação e ninguém autorizou ainda — COTAÇÃO FINALIZADA (só peça particular: o consultor autoriza)
   * ↔ PENDENTE AUTORIZAR (tem peça da seguradora: a diretoria autoriza), a mesma regra do "Enviar cotação". */
  if (!alvo && !semCompleta && (lista === VDF_LISTA_FINALIZADA || lista === VDF_LISTA_PENDENTE) && !vd_legado_(card.id)) {
    try {
      var anT = vd_analisar_(card.desc, card.name);
      // 27/10/2026 (FOB8723): quem decide = peças que ainda esperam decisão (fora do PAGAS); se não sobrou nenhuma, todas.
      // A cobertura de cotação também é só delas (peça comprada antes da autorização não tem linha de cotação).
      var autsT = vd_autorizacoesDaDescricao_(card.desc, anT.pecas);
      var pendT = vdf_pecasAguardandoDecisao_(card, anT, autsT), baseT = pendT.length ? pendT : anT.pecas;
      // autorização "aberta" = autorizada e ainda não comprada (a diretoria já decidiu, espera a compra): aí não mexe
      var pagasT = vdf_itensPagas_(card), autAberta = autsT.some(function (a) { return !pagasT.some(function (n) { return vd_casaItem_(n, a.chave); }); });
      if ((anT.pecas || []).length && !autAberta && !vdf_coberturaCotacao_(card.desc, baseT).faltam.length) {
        var soPartT = baseT.every(function (x) { return vdf_pecaParticular_(x, card, anT); });
        var certaT = soPartT ? VDF_LISTA_FINALIZADA : VDF_LISTA_PENDENTE;
        if (certaT !== lista) { alvo = certaT; soFo = soPartT ? 'pedido particular: quem autoriza é o consultor' : 'tem peça da seguradora: quem autoriza é a diretoria'; }
      }
    } catch (e) { console.log('coluna/quem paga: ' + e); }
  }
  if (!alvo || !ctx.listas[alvo]) return '';
  var movido = vdf_moverPara_(card, ctx, alvo, token, usuario || 'robô');
  if (movido && (lista !== VDF_LISTA_CHEGAR || alvo !== RC.LISTA_FIM)) {   // FALTA CHEGAR → ENCERRADO já tem o "✅ Tudo recebido" do recebimento
    try {
      vd_comentar_(card, '↪️ Card → **' + movido + '** (' + (semCompra ? 'peça autorizada sem compra — verificar compra do item' : soFo || (alvo === VDF_LISTA_CHEGAR ? pend.length + ' peça(s) para chegar' : 'tudo recebido')) + ').');
    } catch (e) {}
  }
  return movido;
}

// Recebimento.gs:605
function rc_checklistDev_(card, token) {
  var k = (card.checklists || []).filter(function (c) { return RC_DEV.RX.test(String(c.name || '').trim()); })[0];
  if (k) return k;
  k = vd_api_('/cards/' + card.id + '/checklists', { method: 'post', payload: { name: RC_DEV.LISTA, pos: 'bottom' } }, token);
  k.checkItems = []; card.checklists = (card.checklists || []).concat([k]);
  return k;
}

// Recebimento.gs:613
function rc_devLigado_() { try { return vd_board_() === VD.BOARD_PADRAO || vd_prop_('RC_DEV_PRINCIPAL', 'SIM') !== 'NAO'; } catch (e) { return false; } }

// Recebimento.gs:614
function rc_registrarDevolucao_(card, it, motivo, fo, token, quando) {
  if (!rc_devLigado_()) return null;
  var k = rc_checklistDev_(card, token);
  var partes = rc_semMarcas_(it.nome).split(/\s+-\s+/), hoje = quando || new Date();
  var nome = '↩️ ' + partes[0] + ' - ' + (fo ? 'SEGURADORA (FO)' : (partes[1] || '?')) + (partes[2] && !fo ? ' - ' + partes[2] : '') +
    ' · devolvida ' + Utilities.formatDate(hoje, 'America/Sao_Paulo', 'dd/MM') + (motivo ? ' (' + String(motivo).replace(/\s*·\s*/g, ' ').slice(0, 60) + ')' : '') + ' · ' + RC_DEV.AGUARDA;
  var due = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 15).toISOString();
  var novo = vd_api_('/checklists/' + k.id + '/checkItems', { method: 'post', payload: { name: nome.slice(0, 16000), due: due, pos: 'bottom' } }, token);
  k.checkItems.push(novo);
  return novo;
}

// Recebimento.gs:626
function rc_devolucoes_(card) {
  var out = [];
  (card.checklists || []).forEach(function (k) {
    if (!RC_DEV.RX.test(String(k.name || '').trim())) return;
    (k.checkItems || []).forEach(function (i) {
      var m = String(i.name || '').match(/\s*·\s*NF\s+(\S+)\s+(\d{1,2}\/\d{1,2})\s*$/i);
      out.push({ id: i.id, nome: i.name, peca: String(i.name || '').replace(/^↩️\s*/, '').split(/\s+-\s+/)[0], ok: i.state === 'complete', due: i.due || '',
        dueIso: i.due ? Utilities.formatDate(new Date(i.due), 'America/Sao_Paulo', 'yyyy-MM-dd') : '', nf: m ? m[1] : '', nfData: m ? m[2] : '' });
    });
  });
  return out;
}

// Recebimento.gs:638
function rc_devolucoesPendentes_(card) { return rc_devolucoes_(card).filter(function (d) { return !d.ok; }); }

// Recebimento.gs:641
function vdf_salvarDevolucao(token, p) {
  var me = vdf_usuario_(token);
  p = vdf_entrada_(p);
  var ctx = vd_contexto_();
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due', attachments: 'true', attachment_fields: 'name,date' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (!vdf_podeReceber_(me, card)) return { ok: false, faltas: ['Só quem registra recebimento neste card (comprador / diretoria) informa a NF de devolução.'] };
  var devs = rc_devolucoes_(card), porId = {}; devs.forEach(function (d) { porId[d.id] = d; });
  var itens = (p.itens || []).filter(function (x) { return x && porId[x.id]; });
  if (!itens.length) return { ok: false, faltas: ['Nenhuma devolução marcada.'] };
  var faltas = [];
  itens.forEach(function (x) {
    if (!String(x.nf || '').trim()) faltas.push(porId[x.id].peca + ': informe o nº da NF de devolução.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(x.data || ''))) faltas.push(porId[x.id].peca + ': informe a data da devolução.');
  });
  if (faltas.length) return { ok: false, faltas: faltas };
  var placa = vd_analisar_(card.desc, card.name).dados.placa || vd_placaDoTexto_(card.name) || '';
  var linhas = [], nAnexos = 0, evs = [], anexosCard = (card.attachments || []).slice();
  itens.forEach(function (x) {
    var d = porId[x.id], nf = String(x.nf).trim().replace(/\s+/g, ''), dt = x.data.split('-');
    var ddmm = dt[2] + '/' + dt[1], due = new Date(+dt[0], +dt[1] - 1, +dt[2], 15).toISOString();
    var base = String(d.nome).replace(/\s*·\s*aguardando NF\s*$/i, '').replace(/\s*·\s*NF\s+\S+\s+\d{1,2}\/\d{1,2}\s*$/i, '');
    var nomeNovo = base + ' · NF ' + nf + ' ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM');
    try { vd_api_('/cards/' + card.id + '/checkItem/' + d.id, { method: 'put', payload: { name: nomeNovo.slice(0, 16000), state: 'complete', due: due } }, token); } catch (e) { console.log('devolução/item: ' + e); }
    var forn = String(d.nome).replace(/^↩️\s*/, '').split(/\s+-\s+/)[1] || '';
    (x.fileIds || []).forEach(function (fid) {
      try {
        var f = vdf_arquivoTemp_(fid);
        var ext = /\.xml$/i.test(f.getName()) ? '.xml' : (/\.pdf$/i.test(f.getName()) || /pdf/i.test(f.getMimeType() || '') ? '.pdf' : '');
        var nome = '↩️ NF DEVOLUÇÃO ' + nf + AX.SEP + placa + AX.SEP + forn.split(/\s*\(/)[0].trim() + AX.SEP + ddmm + ext;
        var at = vd_api_('/cards/' + card.id + '/attachments', { method: 'post', multipart: { file: f.getBlob(), name: nome } }, token);
        if (at && at.id) { try { nome = ax_batizar_(card.id, at.id, nome, anexosCard, token, { semVersao: false, nomeAtual: nome }); } catch (e) {} anexosCard.push({ id: at.id, name: nome, date: new Date().toISOString() }); }
        f.setTrashed(true); nAnexos++;
      } catch (e) { console.log('devolução/anexo: ' + e); }
    });
    linhas.push('↩️ ' + d.peca + ' (' + forn + ') — devolvida em ' + ddmm + ' · NF ' + nf + ((x.fileIds || []).length ? ' anexada' : ' (sem anexo)'));
    evs.push({ peca: d.peca, fornecedor: forn, detalhe: 'NF DEVOLUÇÃO ' + nf + ' · devolvida ' + ddmm });
  });
  try { ev_registrar_('DEVOLUÇÃO', card, me.username, evs, { detalhe: 'NF de devolução · ' + itens.length + ' peça(s)' }); } catch (e) {}
  // liberou? tudo recebido e retirado e sem devolução pendente -> ENTREGUES (o que a retirada teria feito)
  var movido = '';
  try {
    var c2 = vd_api_('/cards/' + card.id, { query: { fields: 'name,idList', checklists: 'all', checkItem_fields: 'name,state,due' } });
    var lista = vdf_nomeLista_(ctx, c2.idList), todos = vdf_itensRecebimento_(c2);
    if (lista === RC.LISTA_FIM && todos.length && todos.every(function (i) { return i.ok && i.retirada; }) && !rc_devolucoesPendentes_(c2).length && ctx.listas['ENTREGUES']) {
      movido = vdf_moverPara_(card, ctx, 'ENTREGUES', token, me.username);
    }
  } catch (e) { console.log('devolução/coluna: ' + e); }
  try {
    vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: '↩️ **NF DE DEVOLUÇÃO** — ' + me.fullName + (movido ? ' → **' + movido + '**' : '') + '\n' + linhas.join('\n') + (nAnexos ? '\n📎 ' + nAnexos + ' anexo(s)' : '') } }, token);
  } catch (e) {}
  try { vd_marcar_(card); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, n: itens.length, anexos: nAnexos, pendentes: rc_devolucoesPendentes_(card).length - itens.length, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

// Recebimento.gs:700
function vdf_reavaliarColuna(token, p) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria reavalia a coluna.'] };
  p = vdf_entrada_(p);
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,idList,shortLink,shortUrl' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  var movido = '';
  try { movido = rc_reavaliarColuna_(card.id, token, me.username, { reavaliar: true }); } catch (e) { return { ok: false, faltas: ['Não consegui reavaliar: ' + e] }; }
  var ctx = vd_contexto_();
  return { ok: true, url: card.shortUrl, nome: card.name, movido: movido, lista: movido || vdf_nomeLista_(ctx, card.idList) };
}

// Recebimento.gs:711
function vdf_incluirDevolucao(token, p) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria inclui devolução antiga.'] };
  p = vdf_entrada_(p);
  var card = vd_api_('/cards/' + p.shortLink, { query: { fields: 'name,desc,idList,shortLink,shortUrl,idBoard,labels', checklists: 'all', checkItem_fields: 'name,state,due' } });
  if (vdf_cardProtegido_(card.name)) return { ok: false, faltas: ['Este é o card fixo do quadro.'] };
  if (!String(p.peca || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(p.data || ''))) return { ok: false, faltas: ['Informe a peça e a data da devolução.'] };
  var dt = p.data.split('-'), quando = new Date(+dt[0], +dt[1] - 1, +dt[2], 12);
  var nomeIt = String(p.peca).trim() + (p.fo ? '' : ' - ' + String(p.fornecedor || '?').trim() + (p.valor ? ' - R$ ' + String(p.valor).trim() : ''));
  var ja = rc_devolucoes_(card).some(function (d) { return d.peca === String(p.peca).trim(); });
  if (ja) return { ok: false, faltas: ['Esta peça já está no checklist DEVOLUÇÕES.'] };
  var novo = rc_registrarDevolucao_(card, { nome: nomeIt }, String(p.motivo || '').trim(), !!p.fo, token, quando);
  if (!novo) return { ok: false, faltas: ['Controle de devoluções desligado neste quadro.'] };
  try { ev_registrar_('DEVOLUÇÃO', card, me.username, [{ peca: String(p.peca).trim(), fornecedor: p.fo ? 'SEGURADORA (FO)' : String(p.fornecedor || ''), detalhe: 'incluída no checklist DEVOLUÇÕES (devolvida ' + dt[2] + '/' + dt[1] + ')' }], { detalhe: 'inclusão pela diretoria' }); } catch (e) {}
  return { ok: true, url: card.shortUrl, nome: card.name, item: novo.name };
}

// Saude.gs:15
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

// Saude.gs:49
function sd_vigiaServidor_() {
  var p = PropertiesService.getScriptProperties(), agora = Date.now();
  var ult = +(p.getProperty('SD_ULTIMO_CICLO') || 0), av = +(p.getProperty('SD_VIGIA_AV') || 0);
  var min = Math.round((agora - ult) / 60000), hora = function (t) { return Utilities.formatDate(new Date(t), 'America/Sao_Paulo', 'dd/MM HH:mm'); };
  var painel = 'https://compra-peca-858550421734.southamerica-east1.run.app/tarefas/robo';
  if (ult && agora - ult > 25 * 60000) {   // 22/10/2026: varredura a cada 10 min + ciclos pelo aviso do Trello (antes: 10 min)
    if (agora - av < 60 * 60000) return;
    MailApp.sendEmail(SD.EMAIL, 'ALERTA Trello: robô do servidor parado há ' + min + ' min',
      'O robô do quadro Compra de Peça (rodando no servidor) não completa um ciclo desde ' + hora(ult) + ' (' + min + ' min).\n\n' +
      'Enquanto isso, nada é conferido no quadro (travas, fornecimento, prazos, etiquetas).\n\n' +
      'Ver o que o servidor está fazendo: ' + painel + '\n' +
      'Para o Google voltar a rodar o robô: no GitHub, workflow do servidor, ROBO_SERVIDOR: OBSERVAR (o Google retoma no minuto seguinte à publicação).\n\n' +
      'Este aviso repete a cada hora enquanto o robô estiver parado.');
    p.setProperty('SD_VIGIA_AV', String(agora));
  } else if (av && ult > av) {
    MailApp.sendEmail(SD.EMAIL, 'Trello: robô do servidor voltou a rodar',
      'O robô do servidor voltou a completar ciclos (último às ' + hora(ult) + ').');
    p.deleteProperty('SD_VIGIA_AV');
  }
}

// Saude.gs:71
function sd_batida_() { PropertiesService.getScriptProperties().setProperty('SD_ULTIMO_CICLO', String(Date.now())); }

// Saude.gs:73
function sd_instalarSeFaltar_() {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('SD_DIARIO_OK') === 'SIM') return;
  var tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'sd_diario'; });
  if (!tem) ScriptApp.newTrigger('sd_diario').timeBased().everyDays(1).atHour(7).nearMinute(50).inTimezone('America/Sao_Paulo').create();
  p.setProperty('SD_DIARIO_OK', 'SIM');
}

// Saude.gs:81
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
  // só falhas das últimas 24 h (06/10/2026: o contador de ontem aparecia no relatório de hoje mesmo com a rotina já normal)
  var props = p.getProperties();
  Object.keys(props).filter(function (k) { return /^FALHAS_(?!AV_|T_)/.test(k); }).forEach(function (k) {
    var nome = k.slice(7), t = +(props['FALHAS_T_' + nome] || 0);
    if (t && Date.now() - t > 24 * 3600000) return;
    prob.push('"' + nome + '" com ' + props[k] + ' falha(s) seguida(s)' + (t ? ' (última ' + new Date(t).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ')' : ''));
  });
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

// Saude.gs:117
function sd_backupSemanal_() {
  var p = PropertiesService.getScriptProperties();
  var hoje = new Date(), semana = Utilities.formatDate(hoje, 'America/Sao_Paulo', 'YYYY-ww');
  if (Utilities.formatDate(hoje, 'America/Sao_Paulo', 'u') !== '1' && p.getProperty('SD_BACKUP_SEMANA')) return '';   // só segunda (o 1º roda já)
  if (p.getProperty('SD_BACKUP_SEMANA') === semana) return '';
  var nome = sd_backupAgora();
  p.setProperty('SD_BACKUP_SEMANA', semana);
  return nome;
}

// Saude.gs:127
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

// Saude.gs:144
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

// Saude.gs:167
function sd_limparPropriedades_() {
  var p = PropertiesService.getScriptProperties(), all = p.getProperties(), abertos = {}, anexos = {}, itens = {};
  vd_api_('/boards/' + vd_board_() + '/cards', { cru: true, query: { fields: 'id', attachments: 'true', attachment_fields: 'id', checklists: 'all', checkItem_fields: 'id' } }).forEach(function (c) {
    abertos[c.id] = 1;
    (c.attachments || []).forEach(function (a) { anexos[a.id] = 1; });
    (c.checklists || []).forEach(function (k) { (k.checkItems || []).forEach(function (i) { itens[i.id] = 1; }); });
  });
  if (Object.keys(abertos).length < 5) return 0;   // leitura estranha: não apaga nada
  var n = 0;
  var recente = Date.now() / 1000 - 2 * 86400;   // anexo subido nas últimas 48 h fica (card pode ainda não estar na lista)
  Object.keys(all).forEach(function (k) {
    var m = k.match(SD_PREF_CARD), id = m && (m[1] || m[2]);
    if (id) { if (!abertos[id] || (vd_legado_(id) && !SD_PREF_LEGADO_USA.test(k))) { p.deleteProperty(k); n++; } return; }
    var ma = k.match(SD_PREF_ANEXO);
    if (ma) { if (!anexos[ma[1]] && parseInt(ma[1].slice(0, 8), 16) < recente) { p.deleteProperty(k); n++; } return; }
    // aviso por item de checklist: sai quando o item não existe mais em card aberto (a chave traz a previsão, não a data do aviso)
    var mi = k.match(SD_PREF_ITEM);
    if (mi && !itens[mi[1]]) { p.deleteProperty(k); n++; }
  });
  // aba ANEXOS (cache de leitura, 16/10/2026): sai a leitura de anexo que não está mais em card aberto (e não é recente)
  try {
    var shA = vd_anxAba_(), nA = shA.getLastRow();
    if (nA > 1) {
      var rowsA = shA.getRange(2, 1, nA - 1, 3).getValues(), vistosA = {}, ficam = [];
      for (var iA = rowsA.length - 1; iA >= 0; iA--) {   // de baixo para cima: fica a leitura mais nova de cada anexo
        var idA = String(rowsA[iA][0] || '');
        if (!idA || vistosA[idA]) continue;
        vistosA[idA] = 1;
        if (anexos[idA] || parseInt(idA.slice(0, 8), 16) >= recente) ficam.unshift(rowsA[iA]);
      }
      if (ficam.length < rowsA.length) {
        shA.getRange(2, 1, nA - 1, 3).clearContent();
        if (ficam.length) shA.getRange(2, 1, ficam.length, 3).setValues(ficam);
        VD_ANXS.ROW = null;
        n += rowsA.length - ficam.length;
      }
    }
  } catch (e) { console.log('anexos/limpeza: ' + e); }
  if (n) console.log('propriedades: ' + n + ' de cards fechados/anexos antigos apagadas');
  return n;
}

// Seguranca.gs:16
function sg_travarCard_(shortLink) {
  var cache = CacheService.getScriptCache(), k = 'sg_lock_' + shortLink, t0 = Date.now(), meu = Utilities.getUuid();
  while (Date.now() - t0 < SG.LOCK_MS) {
    if (!cache.get(k)) {
      cache.put(k, meu, 300);   // 5 min: compra com anexos/OCR já passou de 1 min
      Utilities.sleep(120);
      if (cache.get(k) === meu) { SG_CHAVE = k; SG_TRAVADO = true; return; }
    }
    Utilities.sleep(600);
  }
  throw new Error('Outra gravação neste card ainda está em andamento. Espere alguns segundos e envie de novo.');
}

// Seguranca.gs:28
function sg_destravar_() { if (SG_CHAVE) { try { CacheService.getScriptCache().remove(SG_CHAVE); } catch (e) {} SG_CHAVE = ''; } }

// Seguranca.gs:33
function sg_secao_(nome, fn, ms) {
  var cache = CacheService.getScriptCache(), k = 'sg_sec_' + nome, t0 = Date.now(), meu = Utilities.getUuid(), tenho = false;
  try {
    while (Date.now() - t0 < (ms || 8000)) {
      if (!cache.get(k)) { cache.put(k, meu, 30); Utilities.sleep(60); if (cache.get(k) === meu) { tenho = true; break; } }
      Utilities.sleep(250);
    }
  } catch (e) {}
  try { return fn(); }
  finally { if (tenho) { try { cache.remove(k); } catch (e) {} } }
}

// Seguranca.gs:45
function vdf_limparTexto_(s) {
  return String(s).replace(/[\r\n\u2028\u2029]+/g, ' / ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\s{2,}/g, ' ');
}

// Seguranca.gs:48
function vdf_limparObj_(o, prof) {
  if (prof > 6 || o === null || o === undefined) return o;
  if (typeof o === 'string') return vdf_limparTexto_(o);
  if (Array.isArray(o)) return o.map(function (x) { return vdf_limparObj_(x, prof + 1); });
  if (typeof o === 'object') { Object.keys(o).forEach(function (k) { if (k !== 'base64') o[k] = vdf_limparObj_(o[k], prof + 1); }); }
  return o;
}

// Seguranca.gs:57
function vdf_entrada_(p) {
  p = vdf_limparObj_(p || {}, 0);
  if (p.shortLink) {
    if (!/^[A-Za-z0-9]{6,24}$/.test(String(p.shortLink))) throw new Error('Card inválido.');
    var c = vd_api_('/cards/' + p.shortLink, { cru: true, query: { fields: 'idBoard' } });
    if (c.idBoard !== sg_idQuadro_()) throw new Error('Este card não é do quadro do formulário.');
    if (!SG_TRAVADO) sg_travarCard_(String(p.shortLink));
  }
  if (!SG_TRAVADO) {
    try { LockService.getUserLock().waitLock(SG.LOCK_MS); SG_TRAVADO = true; }
    catch (e) { throw new Error('Outra gravação ainda está em andamento. Espere alguns segundos e envie de novo.'); }
  }
  return p;
}

// Seguranca.gs:72
function sg_idQuadro_() {
  var cache = CacheService.getScriptCache(), k = 'sg_board_' + vd_board_(), v = null;
  try { v = cache.get(k); } catch (e) {}
  if (v) return v;
  v = vd_api_('/boards/' + vd_board_(), { cru: true, query: { fields: 'id' } }).id;
  try { cache.put(k, v, 21600); } catch (e) {}
  return v;
}

// Seguranca.gs:82
function vdf_arquivoTemp_(fid) {
  var f = DriveApp.getFileById(String(fid || ''));
  var pasta = vdf_pastaTemp_().getId(), it = f.getParents();
  while (it.hasNext()) if (it.next().getId() === pasta) return f;
  throw new Error('arquivo fora da pasta do formulário: ' + fid);
}

// Seguranca.gs:90
function sg_celula_(v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }

// Seguranca.gs:95
function vd_marca_(nome) {
  var p = PropertiesService.getScriptProperties(), b = vd_board_(), k = nome + '_' + b, v = p.getProperty(k);
  if (v === null && b === VD.BOARD_PADRAO) { v = p.getProperty(nome); if (v !== null) p.setProperty(k, v); }
  return v;
}

// Seguranca.gs:100
function vd_marcaSet_(nome, v) { PropertiesService.getScriptProperties().setProperty(nome + '_' + vd_board_(), String(v)); }

// Seguranca.gs:108
function vd_viradaMs_() {
  var p = PropertiesService.getScriptProperties(), k = 'VD_VIRADA_EM_' + vd_board_(), v = p.getProperty(k);
  if (!v) { v = String(Date.now()); p.setProperty(k, v); }
  return +v;
}

// Seguranca.gs:113
function vd_legado_(cardId) {
  cardId = String(cardId || '');
  if (!/^[0-9a-f]{24}$/.test(cardId)) return false;
  if (parseInt(cardId.slice(0, 8), 16) * 1000 >= vd_viradaMs_()) return false;
  // 10/10/2026 (revisão): fora do ciclo do robô (formulário) não carrega a coluna inteira de completas (megabytes) só para
  // saber de um card — lê a completa desse card (cache de 6 h por card)
  var cmp = VD_CMP_MEM ? VD_CMP_MEM[cardId] : vd_completa_(cardId);
  return !cmp;
}

// Teste.gs:432
function tst_ehCardTeste_(idOuSl) {
  if (!idOuSl) return false;
  var lista = []; try { lista = JSON.parse(PropertiesService.getScriptProperties().getProperty('TST_CARDS') || '[]'); } catch (e) {}
  if (lista.indexOf(idOuSl) >= 0) return true;
  var cache = CacheService.getScriptCache(), k = 'tst_nome_' + idOuSl, nome = cache.get(k);
  if (nome === null) {
    try { nome = String(vd_api_('/cards/' + idOuSl, { cru: true, query: { fields: 'name' } }).name || ''); } catch (e) { nome = ''; }
    try { cache.put(k, nome.slice(0, 200), 21600); } catch (e) {}
  }
  return TST_RE_PLACA.test(nome) || /🧪/.test(nome);
}

// Teste.gs:443
function tst_filtrarMencoes_(caminho, txt) {
  var m = String(caminho || '').match(/^\/cards\/([^\/?]+)\/actions\/comments/);
  if (!m || !tst_ehCardTeste_(m[1])) return txt;
  return String(txt).replace(/(^|[^A-Za-z0-9_.])@([A-Za-z0-9_.\-]{3,})/g, function (x, pre, u) { return u.toLowerCase() === 'timweslley' ? x : pre + '👤' + u; });
}

// Teste.gs:449
function vdf_testeMarcar(token, p) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) throw new Error('Só a diretoria.');
  var c = vd_api_('/cards/' + p.shortLink, { cru: true, query: { fields: 'id,shortLink,name' } });
  var props = PropertiesService.getScriptProperties(), l = []; try { l = JSON.parse(props.getProperty('TST_CARDS') || '[]'); } catch (e) {}
  l = l.filter(function (x) { return x !== c.id && x !== c.shortLink; });
  if (p.ligar !== false) l.push(c.id, c.shortLink);
  props.setProperty('TST_CARDS', JSON.stringify(l.slice(-40)));
  return { ok: true, id: c.id, nome: c.name, teste: p.ligar !== false };
}

// TravaChecklist.gs:17
function ck_ligado_() { return vd_prop_('CK_TRAVA', 'SIM') !== 'NAO'; }

// TravaChecklist.gs:20
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
    lic_espelhar_(novo, 1800);
  } catch (e) { console.log('licença checklist: ' + e); }
}

// TravaChecklist.gs:37
function ck_licenciada_(a, cache) {
  var d = a.data || {}, t = new Date(a.date).getTime();
  var ids = [d.card && d.card.id, d.card && d.card.shortLink, d.checklist && d.checklist.id].filter(String);
  return ids.some(function (id) {
    var l = []; try { l = JSON.parse(cache['ck_' + id] || '[]'); } catch (e) {}
    return l.some(function (ts) { return t >= ts - CK.DEPOIS_MS && t <= ts + CK.ANTES_MS; });
  });
}

// TravaChecklist.gs:47
function ck_aba_() {
  var ss = vd_planilhaBackup_().getParent(), sh = ss.getSheetByName(CK.ABA);
  if (!sh) { sh = ss.insertSheet(CK.ABA); sh.appendRow(['Card (id)', 'Checklists (JSON)', 'Atualizado em']); sh.setFrozenRows(1); }
  return sh;
}

// TravaChecklist.gs:52
function ck_retratar_(cardIds) {
  if (!cardIds.length) return;
  var sh = ck_aba_();
  cardIds.forEach(function (id) {
    try {
      var ls = vd_api_('/cards/' + id + '/checklists', { query: { checkItems: 'all', checkItem_fields: 'name,state,due,pos', fields: 'name,pos' } });
      var js = JSON.stringify(ls.map(function (k) { return { id: k.id, name: k.name, pos: k.pos, itens: (k.checkItems || []).map(function (i) { return { n: i.name, s: i.state, d: i.due || '', p: i.pos }; }) }; }));
      var cel = sh.getRange('A:A').createTextFinder(id).matchEntireCell(true).findNext();
      if (cel) sh.getRange(cel.getRow(), 2, 1, 2).setValues([[js, new Date()]]);
      else sh.appendRow([id, js, new Date()]);
    } catch (e) { console.log('retrato ' + id + ': ' + e); }
  });
}

// TravaChecklist.gs:65
function ck_retrato_(cardId, idChecklist) {
  try {
    var cel = ck_aba_().getRange('A:A').createTextFinder(cardId).matchEntireCell(true).findNext();
    if (!cel) return null;
    var ls = JSON.parse(String(ck_aba_().getRange(cel.getRow(), 2).getValue() || '[]'));
    return ls.filter(function (k) { return k.id === idChecklist; })[0] || null;
  } catch (e) { return null; }
}

// TravaChecklist.gs:75
function ck_desfazer_(a) {
  var d = a.data || {}, card = d.card || {}, it = d.checkItem || {}, cl = d.checklist || {};
  switch (a.type) {
    case 'updateCheckItemStateOnCard':
      vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'put', payload: { state: it.state === 'complete' ? 'incomplete' : 'complete' } });
      return (it.state === 'complete' ? 'desmarcado ✔ de ' : 'marcado de novo ') + pv_curto_(it.name);
    case 'updateCheckItem':
      var old = d.old || {}, volta = {};
      ['name', 'due', 'pos'].forEach(function (k) { if (Object.prototype.hasOwnProperty.call(old, k)) volta[k] = old[k] === null ? null : old[k]; });
      if (!Object.keys(volta).length) return '';
      vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'put', payload: volta });
      return 'voltou ' + (volta.name !== undefined ? 'o nome' : (volta.due !== undefined ? 'a data' : 'a posição')) + ' de ' + pv_curto_(old.name || it.name);
    case 'createCheckItem':
      vd_api_('/cards/' + card.id + '/checkItem/' + it.id, { method: 'delete' });
      return 'apagado item incluído à mão: ' + pv_curto_(it.name);
    case 'deleteCheckItem':
      var corpo = { name: it.name, pos: 'bottom' };
      if (it.state === 'complete') corpo.checked = 'true';
      vd_api_('/checklists/' + cl.id + '/checkItems', { method: 'post', payload: corpo });
      return 'item apagado voltou: ' + pv_curto_(it.name);
    case 'addChecklistToCard':
      vd_api_('/checklists/' + cl.id, { method: 'delete' });
      return 'apagado checklist criado à mão: ' + (cl.name || '');
    case 'updateChecklist':
      if (!d.old || d.old.name === undefined) return '';
      vd_api_('/checklists/' + cl.id, { method: 'put', payload: { name: d.old.name } });
      return 'checklist voltou a se chamar ' + d.old.name;
    case 'removeChecklistFromCard':
      var r = ck_retrato_(card.id, cl.id);
      if (!r) return 'checklist ' + (cl.name || '') + ' apagado — sem retrato para refazer (refazer pelo formulário)';
      var novo = vd_api_('/checklists', { method: 'post', payload: { idCard: card.id, name: r.name, pos: 'bottom' } });
      r.itens.forEach(function (i) {
        var c2 = { name: i.n, pos: 'bottom' };
        if (i.s === 'complete') c2.checked = 'true';
        if (i.d) c2.due = i.d;
        vd_api_('/checklists/' + novo.id + '/checkItems', { method: 'post', payload: c2 });
      });
      return 'checklist ' + r.name + ' apagado voltou (' + r.itens.length + ' itens)';
  }
  return '';
}

// TravaChecklist.gs:118
function ck_executar_() {
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO' || !ck_ligado_()) return 0;
  var props = PropertiesService.getScriptProperties(), board = vd_board_();
  var desde = vd_marca_('CK_DESDE');
  if (!desde) {
    // 1ª vez: só começa a vigiar daqui para frente; o retrato de cada card é tirado quando ele mexe
    // (no quadro principal, retratar ~650 cards de uma vez estouraria o ciclo de 1 minuto)
    var ult = vd_api_('/boards/' + board + '/actions', { cru: true, query: { limit: 1, fields: 'id' } });
    vd_marcaSet_('CK_DESDE', ult.length ? ult[0].id : new Date().toISOString());
    return 0;
  }
  var acts = vd_acoesQuadro_(board, { filter: CK.TIPOS, since: desde, limit: 200, memberCreator_fields: 'username,fullName' });
  // 17/10/2026: só julga ação com mais de 90 s — a licença de gravação feita pelo servidor chega ao cache logo depois da
  // escrita (o servidor manda antes de responder); a ação mais nova fica para o próximo ciclo (o marcador não passa dela)
  var limCk = Date.now() - CK.ESPERA_MS;
  acts = acts.filter(function (a) { return new Date(a.date).getTime() <= limCk; });
  if (!acts.length) return 0;
  var cache = {};
  try {
    var ids = [];
    acts.forEach(function (a) { var d = a.data || {}; [d.card && d.card.id, d.card && d.card.shortLink, d.checklist && d.checklist.id].forEach(function (i) { if (i && ids.indexOf('ck_' + i) < 0) ids.push('ck_' + i); }); });
    cache = CacheService.getScriptCache().getAll(ids);
  } catch (e) {}
  var avisos = {}, tocados = [], n = 0, manuais = {};
  acts.slice().reverse().forEach(function (a) {
    var cardId = a.data && a.data.card && a.data.card.id;
    if (!cardId) return;
    if (vd_legado_(cardId)) return;   // card antigo: segue o jeito antigo
    if (tocados.indexOf(cardId) < 0) tocados.push(cardId);
    if (ck_licenciada_(a, cache)) return;
    // 20/10/2026: licença feita antes do deploy do servidor se perde com a memória — ação anterior à subida não é julgada
    if (typeof SERVIDOR_INICIO_MS === 'number' && SERVIDOR_INICIO_MS > 0 && new Date(a.date).getTime() < SERVIDOR_INICIO_MS) return;
    // 10/10/2026 (revisão, 36 ✔ desfeitos em 5 dias): ✔ marcado direto no Trello num item PAGAS*/FORNECIMENTO* por quem pode
    // receber vale como recebimento de hoje (comentário, evento, coluna) em vez de ser desfeito — ck_aceitarManual_
    if (a.type === 'updateCheckItemStateOnCard' && a.data.checkItem && a.data.checkItem.state === 'complete' && /^(PAGAS|FORNECIMENTO)/i.test(String((a.data.checklist || {}).name || '').trim()) && vd_prop_('CK_ACEITA_OK', 'SIM') !== 'NAO') {
      var quemM = a.memberCreator ? a.memberCreator.username : '';
      if (quemM) { (manuais[cardId] = manuais[cardId] || { card: a.data.card, quem: quemM, nome: (a.memberCreator && a.memberCreator.fullName) || quemM, itens: [], acoes: [] }).itens.push(a.data.checkItem); manuais[cardId].acoes.push(a); return; }
    }
    var txt = '';
    try { txt = ck_desfazer_(a); } catch (e) { txt = /\b404\b/.test(String(e.message || e)) ? '' : 'não consegui desfazer (' + String(e.message || e).slice(0, 60) + ')'; }   // 404 = o item já sumiu (checklist apagado antes): nada a desfazer
    if (!txt) return;
    n++;
    var quem = a.memberCreator ? a.memberCreator.username : '';
    var av = avisos[cardId] || (avisos[cardId] = { card: a.data.card, quem: quem, itens: [] });
    av.itens.push(txt);
    try { ev_registrar_('CHECKLIST DESFEITO', { name: a.data.card.name, shortLink: a.data.card.shortLink, labels: [] }, quem || '?', null, { detalhe: txt }); } catch (e) {}
  });
  vd_marcaSet_('CK_DESDE', acts[0].id);
  // ✔ manual aceito como recebimento (quem não pode receber: desfeito como antes)
  Object.keys(manuais).forEach(function (id) {
    var m = manuais[id], aceitos = [];
    try { aceitos = ck_aceitarManual_(id, m); } catch (e) { console.log('✔ manual: ' + e); }
    m.acoes.forEach(function (a) {
      if (aceitos.indexOf(a.data.checkItem.id) >= 0) return;
      var txt = '';
      try { txt = ck_desfazer_(a); } catch (e) { txt = /\b404\b/.test(String(e.message || e)) ? '' : 'não consegui desfazer (' + String(e.message || e).slice(0, 60) + ')'; }
      if (!txt) return;
      n++;
      var av = avisos[id] || (avisos[id] = { card: a.data.card, quem: m.quem, itens: [] });
      av.itens.push(txt);
      try { ev_registrar_('CHECKLIST DESFEITO', { name: a.data.card.name, shortLink: a.data.card.shortLink, labels: [] }, m.quem || '?', null, { detalhe: txt }); } catch (e) {}
    });
  });
  Object.keys(avisos).forEach(function (id) {
    var av = avisos[id];
    try {
      var orig = ''; try { orig = es_autor_(id); } catch (e) {}
      vd_comentar_({ id: id }, (av.quem ? '@' + av.quem + ' ' : '') + '🔒 **ALTERAÇÃO NÃO PERMITIDA** — checklist só muda pelo formulário (✔ de chegada: aba 📦 Recebimento).' + orig + ' Desfeito:\n' +
        av.itens.map(function (t) { return '- ' + t; }).join('\n'));
    } catch (e) {}
  });
  // retrato atualizado dos cards que mexeram (depois de desfazer)
  ck_retratar_(tocados.slice(0, 30));
  if (n) console.log('trava de checklist: ' + n + ' alteração(ões) desfeita(s)');
  return n;
}

// TravaChecklist.gs:198
function lic_espelhar_(par, seg) {
  try {
    if (!vd_roboNoServidor_()) return;
    var p = PropertiesService.getScriptProperties(), agora = Date.now(), m = {};
    try { m = JSON.parse(p.getProperty('LIC_SRV') || '{}'); } catch (e) {}
    Object.keys(m).forEach(function (k) { if (!m[k] || m[k][1] < agora) delete m[k]; });
    Object.keys(par).forEach(function (k) { m[k] = [String(par[k]), agora + (seg || 600) * 1000]; });
    var js = JSON.stringify(m);
    if (js.length > 8000) return;   // nunca passa disso na prática (licença dura minutos); se passar, fica só no cache daqui
    p.setProperty('LIC_SRV', js);
  } catch (e) { console.log('licença/servidor: ' + e); }
}

// Treino.gs:20
function tr_pasta_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('TR_PASTA');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var p = DriveApp.createFolder(TRN.PASTA_NOME);
  TRN.COMPARTILHAR.forEach(function (em) { try { p.addViewer(em); } catch (e) { console.log('treino/compartilhar: ' + e); } });
  props.setProperty('TR_PASTA', p.getId());
  return p;
}

// Treino.gs:31
function tr_candidato_(a) {
  if (!a || !a.isUpload) return false;
  var nome = String(a.name || '') + ' ' + String(a.fileName || '');
  if (!/pdf/i.test(a.mimeType || '') && !/\.pdf$/i.test(nome)) return false;
  if ((a.bytes || 0) > TRN.MAX_BYTES || !(a.bytes || 0)) return false;
  if (/^(📦|📸|🛒|🚚)/.test(String(a.name || ''))) return false;
  if (/\b(NF|NFE|NF-E|NOTA|DANFE|BOLETO|CUPOM|RECIBO|COMPROVANTE|PIX|STATUS DO PEDIDO|PEDIDO DE COMPRA)\b/i.test(nome)) return false;
  return true;
}

// Treino.gs:42
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

// Treino.gs:63
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

// Treino.gs:119
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

// Treino.gs:131
function tr_estado_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('TR_ESTADO') || 'null'); } catch (e) { return null; } }

// Treino.gs:132
function tr_lista_(est) { return JSON.parse(DriveApp.getFileById(est.lista).getBlob().getDataAsString()); }

// Treino.gs:135
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

// Treino.gs:150
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

// Treino.gs:181
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

// Treino.gs:231
function vdf_treinoAssinatura(token, p) {
  var me = vdf_usuario_(token);
  if (!vdf_ehAutorizador_(me)) return { ok: false, faltas: ['Só a diretoria.'] };
  p = p || {}; var est = tr_estado_(); if (!est) return { ok: false, erro: 'sem lista' };
  var det = {}; (p.detalhe || []).forEach(function (k) { det[k] = 1; });
  var sig = {}, detalhe = {}, total = 0;
  est.lotes.forEach(function (id) {
    var lote; try { lote = JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString()); } catch (e) { return; }
    lote.forEach(function (reg, i) {
      if (!reg.texto) return;
      var k = (reg.anexo || reg.arquivo || reg.nome || '') + '#' + i;
      var r; try { r = vd_lerOrcamento_(reg.texto); } catch (e) { r = { origem: 'ERRO', oficina: [], fo: [] }; }
      var x = vd_extrair_(reg.texto);
      var s = JSON.stringify([r.origem, r.cor, r.seguradora, x.modelo, x.ano, (r.oficina || []).map(function (q) { return [q.codigo, q.descricao, q.qtd, q.valorOrc, q.medida || '', q.pneu ? 1 : 0]; }), (r.fo || []).map(function (q) { return [q.codigo, q.descricao, q.qtd, q.valorOrc]; })]);
      sig[k] = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s)).slice(0, 10);
      if (det[k]) detalhe[k] = { s: s, texto: String(reg.texto).slice(0, 80000) };
      total++;
    });
  });
  return { ok: true, total: total, sig: sig, detalhe: detalhe };
}

// Validacao.gs:42
function vd_cicloIniciar_(ms) { VD_CICLO_FIM = Date.now() + (ms || VD.CICLO_MS); }

// Validacao.gs:44
function vd_prazo_(ms, reserva) { var p = Date.now() + ms; return VD_CICLO_FIM ? Math.min(p, VD_CICLO_FIM - (reserva || 0)) : p; }

// Validacao.gs:45
function vd_restante_() { return VD_CICLO_FIM ? VD_CICLO_FIM - Date.now() : Infinity; }

// Validacao.gs:49
function vd_prop_(k, padrao) {
  var v = PropertiesService.getScriptProperties().getProperty(k);
  return (v === null || v === '') ? padrao : v;
}

// Validacao.gs:55
function vd_board_() { return VD_BOARD_FORCA || vd_prop_('VD_BOARD', VD.BOARD_PADRAO); }

// Validacao.gs:62
function vd_ajustes1910_() { try { return vd_board_() === VD.BOARD_PADRAO || vd_prop_('VD_AJUSTES_1910', 'SIM') === 'SIM'; } catch (e) { return false; } }

// Validacao.gs:63
function vd_v2_() { try { return vd_board_() === VD.BOARD_PADRAO || (VD_V2_PRINCIPAL && vd_prop_('VD_V2', 'SIM') !== 'NAO'); } catch (e) { return false; } }

// Validacao.gs:64
function vd_modo_() { return vd_prop_('VD_MODO', 'ATIVO'); }

// Validacao.gs:65
function vd_ligado_() { return vd_prop_('VD_LIGADO', 'SIM') !== 'NAO'; }

// Validacao.gs:74
function vd_cred_() {
  var p = PropertiesService.getScriptProperties();
  return { key: p.getProperty('TRELLO_KEY'), token: p.getProperty('TRELLO_TOKEN') };
}

// Validacao.gs:79
function vd_auth_(tokenUsuario) {
  var c = vd_cred_();
  return 'OAuth oauth_consumer_key="' + c.key + '", oauth_token="' + (tokenUsuario || c.token) + '"';
}

// Validacao.gs:91
function vd_apiLote_(itens, tokenUsuario) {
  var out = [], erro = null;
  for (var i0 = 0; i0 < itens.length; i0 += 10) {
    var parte = itens.slice(i0, i0 + 10);
    var reqs = parte.map(function (it) {
      var o = it.opts || {}, q = o.query || {};
      var url = 'https://api.trello.com/1' + it.caminho;
      var qs = Object.keys(q).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(q[k]); }).join('&');
      if (qs) url += (url.indexOf('?') < 0 ? '?' : '&') + qs;
      var r = { url: url, method: o.method || 'get', muteHttpExceptions: true, headers: { Authorization: vd_auth_(tokenUsuario) } };
      if (o.payload) { r.contentType = 'application/json'; r.payload = JSON.stringify(o.payload); }
      if (r.method !== 'get' && /checkItem|checklists/i.test(it.caminho)) { try { ck_licenca_(it.caminho.split('?')[0], o.payload); } catch (e) {} }
      return r;
    });
    var rs = qt_fetchAll_(reqs);
    rs.forEach(function (r, j) {
      var it = parte[j], code = r.getResponseCode();
      if (code >= 300) { if (!erro) { erro = new Error('Trello ' + code + ' em ' + it.caminho.split('?')[0] + ': ' + r.getContentText().slice(0, 200)); erro.codigo = code; } out.push(null); return; }
      if ((it.opts || {}).method && it.opts.method !== 'get' && /checkItem|checklists/i.test(it.caminho)) { try { ck_licenca_(it.caminho.split('?')[0], it.opts.payload); } catch (e) {} }
      var t = r.getContentText(); out.push(t ? JSON.parse(t) : null);
    });
  }
  if (erro) throw erro;
  return out;
}

// Validacao.gs:117
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
    if (params.method === 'post' && /\/actions\/comments/.test(caminho) && opts.payload.text) {
      try { if (typeof vdf_assinarComentario_ === 'function') opts.payload.text = vdf_assinarComentario_(opts.payload.text, tokenUsuario); } catch (e) {}   // "@fulano registrou compra" (26/10/2026)
      try { opts.payload.text = es_filtrarMencoes_(opts.payload.text); } catch (e) {}
      try { opts.payload.text = tst_filtrarMencoes_(caminho, opts.payload.text); } catch (e) {}   // card do teste completo: ninguém é notificado
      if (VD_SEM_MENCOES) opts.payload.text = String(opts.payload.text).replace(/(^|[^A-Za-z0-9_.])@([A-Za-z0-9_.\-]{3,})/g, '$1👤$2');   // teste (CiliaApi.gs): ninguém é notificado
    }
    params.contentType = 'application/json';
    params.payload = JSON.stringify(opts.payload);
    // 20/10/2026 (Weslley, UNI0001: FALTA DADOS 2x em 6 s): duas execuções (formulário + ciclo do robô) podiam comentar o mesmo
    // texto no mesmo card ao mesmo tempo. Antes de comentar, olha os últimos comentários do card: texto idêntico há menos de
    // 3 min = não comenta de novo (devolve o que já existe). Desligar: COMENT_DEDUPE = NAO.
    var mCm = params.method === 'post' && opts.payload.text && caminho.match(/^\/cards\/([^\/?]+)\/actions\/comments/);
    if (mCm && !opts.semDedupe && vd_prop_('COMENT_DEDUPE', 'SIM') !== 'NAO') {
      try {
        var ult = vd_api_('/cards/' + mCm[1] + '/actions', { cru: true, query: { filter: 'commentCard', limit: 5, fields: 'data,date' } }, tokenUsuario) || [];
        var txtNovo = String(opts.payload.text).trim(), igual = null;
        ult.forEach(function (a) {
          if (igual || !a || !a.data) return;
          if (String(a.data.text || '').trim() === txtNovo && Date.now() - new Date(a.date).getTime() < 3 * 60 * 1000) igual = a;
        });
        if (igual) { console.log('comentário repetido evitado em ' + mCm[1]); return igual; }
      } catch (eD) { console.log('dedupe comentário: ' + eD); }
    }
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

// Validacao.gs:177
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

// Validacao.gs:194
function vd_acoesQuadro_(board, q) {
  q = q || {};
  // 10/10/2026: com `since`, o Trello devolve as N mais NOVAS — com limit 100 e o quadro parado por horas, as ações mais antigas
  // da janela ficavam para trás e os marcadores (ST/FAT/CK) pulavam por cima delas. Direto no Trello o limite sobe para 1000.
  var direto = function () { var qq = {}; Object.keys(q).forEach(function (k) { qq[k] = q[k]; }); if (qq.since && qq.limit && qq.limit < 1000) qq.limit = 1000; return vd_api_('/boards/' + board + '/actions', { cru: true, query: qq }) || []; };
  try {
    if (vd_prop_('VD_ACOES_COMPARTILHADAS', 'SIM') === 'NAO') return direto();
    if (!VD_ACOES || VD_ACOES.board !== board) {
      // janela: 20 min, ou desde a marca mais antiga dos módulos (quadro parado à noite: as marcas ficam para trás), até 2 h
      var desdeMs = Date.now() - 20 * 60000, piso = Date.now() - 2 * 3600000;   // janela maior que 2 h pesa o ciclo (1,5–5 s medidos em 06/10): marca mais velha vai direto
      ['TR_ACT', 'ST_ULTIMA', 'EXC_ULTIMA', 'FAT_ULTIMA', 'CP_ACT', 'NU_ACT', 'CK_DESDE'].forEach(function (n) {
        var v = vd_marca_(n), t = Date.parse(v);
        if (isNaN(t) && /^[0-9a-f]{24}$/i.test(String(v || ''))) t = parseInt(String(v).slice(0, 8), 16) * 1000 - 1000;   // id de ação: data embutida
        if (!isNaN(t) && t < desdeMs) desdeMs = Math.max(t - 5000, piso);
      });
      var lista = vd_api_('/boards/' + board + '/actions', { cru: true, query: { since: new Date(desdeMs).toISOString(), limit: 1000, fields: 'data,date,type,idMemberCreator', memberCreator: 'true', memberCreator_fields: 'username,fullName' } }) || [];   // idMemberCreator: a proteção contra exclusão confere se foi administrador (faltou em 06/10 e recriou card do Weslley)
      VD_ACOES = { board: board, desde: desdeMs, lista: lista, cheio: lista.length >= 1000 };
    }
    if (VD_ACOES.cheio) return direto();
    var base = VD_ACOES.lista, sinceMs = Date.parse(q.since);
    if (q.since && isNaN(sinceMs)) {   // since por id de ação (trava de checklist): só o que veio depois dele
      var ix = -1; base.forEach(function (a, i) { if (ix < 0 && a.id === q.since) ix = i; });
      if (ix >= 0) { base = base.slice(0, ix); sinceMs = NaN; }
      else {
        // id fora da janela: se a data embutida no id é anterior ao início da janela, tudo o que está nela veio depois
        var tId = /^[0-9a-f]{24}$/i.test(String(q.since)) ? parseInt(String(q.since).slice(0, 8), 16) * 1000 : NaN;
        if (isNaN(tId) || tId + 1000 >= VD_ACOES.desde) return direto();
        sinceMs = NaN;
      }
    } else if (!isNaN(sinceMs) && sinceMs < VD_ACOES.desde) return direto();
    var tipos = String(q.filter || 'all').split(',').filter(String), beforeMs = q.before ? Date.parse(q.before) : NaN;
    var out = base.filter(function (a) {
      var t = Date.parse(a.date);
      if (!isNaN(sinceMs) && !(t > sinceMs)) return false;
      if (!isNaN(beforeMs) && !(t < beforeMs)) return false;
      return tipos[0] === 'all' || tipos.some(function (f) { return vd_acaoBate_(a, f); });
    });
    return (q.limit && !q.since) ? out.slice(0, q.limit) : out;   // com `since` vai tudo o que há na janela (ver `direto`)
  } catch (e) { console.log('ações compartilhadas: ' + e); return direto(); }
}

// Validacao.gs:235
function vd_acaoBate_(a, f) {
  var p = String(f).split(':'), d = a.data || {};
  if (a.type !== p[0]) return false;
  if (p.length < 2) return true;
  return !!(d.old && Object.prototype.hasOwnProperty.call(d.old, p[1]));
}

// Validacao.gs:242
function vd_nomeColuna_(n) {
  var s = String(n || '').trim().toUpperCase();
  if (/^FALTA DADOS PARA COTA/.test(s)) return 'FALTA DADOS PARA COTAR';
  return s;
}

// Validacao.gs:250
function vd_limpar_(s) {
  return String(s || '')
    .replace(/\\([\\\x60*_{}\[\]()#+\-.!|>~])/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/ /g, ' ')
    .split('\n').map(function (l) { return l.replace(/^[\s*_]+/, '').replace(/[\s*_]+$/, ''); }).join('\n');
}

// Validacao.gs:258
function vd_semAcento_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

// Validacao.gs:263
function vd_dividir_(desc) {
  var linhas = String(desc || '').split('\n');
  for (var i = 0; i < linhas.length; i++) {
    if (/^\s*[\\*_]*={2,}\s*COTA[ÇC][ÃA]O/i.test(vd_limpar_(linhas[i]))) {
      return { bloco: linhas.slice(0, i).join('\n'), resto: linhas.slice(i).join('\n'), temMarcador: true };
    }
  }
  return { bloco: String(desc || ''), resto: '', temMarcador: false };
}

// Validacao.gs:273
function vd_campo_(txt, rotulos) {
  var re = new RegExp('^\\s*(?:' + rotulos + ')\\s*[:\\-–]\\s*(.*)$', 'im');
  var m = vd_limpar_(txt).match(re);
  return m ? m[1].trim() : '';
}

// Validacao.gs:289
function vd_normPlaca_(p) {
  return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Validacao.gs:293
function vd_placaMercosul_(p) {
  p = vd_normPlaca_(p);
  if (/^[A-Z]{3}\d{4}$/.test(p)) return p.slice(0, 4) + 'ABCDEFGHIJ'.charAt(+p.charAt(4)) + p.slice(5);
  return p;
}

// Validacao.gs:298
function vd_mesmaPlaca_(a, b) {
  return !!a && !!b && vd_placaMercosul_(a) === vd_placaMercosul_(b);
}

// Validacao.gs:301
function vd_placaValida_(p) {
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(vd_normPlaca_(p));
}

// Validacao.gs:306
function vd_placaEstrangeira_(p) {
  p = vd_normPlaca_(p);
  if (/^[A-Z]{4}\d{3}$/.test(p)) return 'PY';
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(p)) return 'AR';
  return '';
}

// Validacao.gs:312
function vd_placaDoTexto_(s) {
  var m = String(s || '').toUpperCase().match(/\b([A-Z]{3})[\s\-]?(\d[A-Z0-9]\d{2})\b/);
  return m ? m[1] + m[2] : '';
}

// Validacao.gs:317
function vd_normChassi_(c) {
  return String(c || '').toUpperCase().replace(/[\s.\-]/g, '');
}

// Validacao.gs:320
function vd_chassiValido_(c) {
  c = vd_normChassi_(c);
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(c) && /[A-Z]/.test(c) && /\d{4}$/.test(c);
}

// Validacao.gs:325
function vd_anoValido_(a) {
  var anos = String(a || '').match(/(19[89]\d|20[0-4]\d)/g);
  return !!anos;
}

// Validacao.gs:330
function vd_tipoNorm_(t) {
  var s = vd_semAcento_(t).replace(/[^A-Z]/g, '');
  if (!s) return '';
  if (/^GENUIN/.test(s)) return 'GENUÍNO';
  if (/^ORIGINAL/.test(s)) return 'ORIGINAL';
  if (/^PARALEL/.test(s)) return 'PARALELO';
  if (/^USAD/.test(s)) return 'USADO';
  return '?' + String(t).trim();
}

// Validacao.gs:340
function vd_tipoNormPedido_(t) {
  var s = vd_semAcento_(t).replace(/[^A-Z]/g, '');
  if (/^PART/.test(s)) return 'PARTICULAR';
  if (/^RET/.test(s)) return 'RETORNO';   // 09/10/2026, Weslley: 3º tipo — retorno (oficina paga)
  if (/^SEG/.test(s)) return 'SEGURADORA';
  return '';
}

// Validacao.gs:348
function vd_semSeguradora_(t) { return t === 'PARTICULAR' || t === 'RETORNO'; }

// Validacao.gs:349
function vd_rotuloSeguradora_(tipo, seg) { return tipo === 'PARTICULAR' ? 'PARTICULAR' : tipo === 'RETORNO' ? 'RETORNO' : seg; }

// Validacao.gs:351
function vd_categPneu_(t) {
  var s = vd_semAcento_(t).replace(/\s+/g, ' ').trim();
  if (/^IMPORTAD/.test(s)) return 'IMPORTADO';
  if (/^1\s*[AªºO°]?\.?\s*LINHA|^PRIMEIRA LINHA/.test(s)) return '1ª LINHA';
  return '';
}

// Validacao.gs:358
function vd_medidaPneu_(m) {
  return /\d{3}\s*\/\s*\d{2}\s*Z?R?\s*\d{2}/i.test(String(m || ''));
}

// Validacao.gs:372
function vd_sigItem_(linha) {
  // "| ORÇ R$ x" (valor da peça no orçamento), "| OBS: texto" (observação do consultor) e "| FOTO" (22/10/2026) não entram na assinatura: informativos, não travam nem contam como peça nova
  return vd_semAcento_(vd_limpar_(linha)).replace(/\s*\|\s*ORC\.?\s*R?\$?\s*[\d.,]+/gi, '').replace(/\s*\|\s*OBS\.?\s*[:\-]\s*[^|]*/gi, '').replace(/\s*\|\s*FOTO\s*(?=\||$)/gi, '').replace(/^\s*(?:\d+\s*[.)\-]|[-•*])\s*/, '').replace(/\s*\|\s*/g, '|').replace(/\s+/g, ' ').trim();
}

// Validacao.gs:380
function vd_sigFormas_(sig) {
  var semStatus = String(sig || '').replace(/\|\s*COMPL(?:EMENTAR)?\s*[:\-–]\s*(?:AUTORIZADO|ANTECIPADO)[^|]*/gi, '');
  var semComp = semStatus.replace(/\|\s*COMPLEMENTO(?:\s+\d{1,2}\/\d{1,2})?\s*(?=\||$)/gi, '');
  var out = [sig];
  if (semStatus !== sig) out.push(semStatus);
  if (semComp !== semStatus) out.push(semComp);
  return out;
}

// Validacao.gs:391
function vd_pkH_(sig) {
  sig = String(sig || '');
  if (/^#[A-Za-z0-9+\/]{9}$/.test(sig)) return sig;
  return '#' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, sig, Utilities.Charset.UTF_8)).slice(0, 9);
}

// Validacao.gs:396
function vd_pkSet_(cardId, sigs) { PropertiesService.getScriptProperties().setProperty('VD_PK2_' + cardId, JSON.stringify((sigs || []).map(vd_pkH_))); }

// Validacao.gs:399
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

// Validacao.gs:414
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

// Validacao.gs:438
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
    pais: (vd_campo_(bloco, VD_ROT.placa).match(/\((PY|AR)\)/i) || [])[1] || '',
    tipo: vd_tipoNormPedido_(vd_campo_(bloco, VD_ROT_EXTRA.tipo)),
    cor: vd_campo_(bloco, VD_ROT_EXTRA.cor),
    seguradora: vd_campo_(bloco, VD_ROT_EXTRA.seguradora),
    sinistro: vd_campo_(bloco, VD_ROT_EXTRA.sinistro)
  };
  if (!d.placa) d.placa = vd_placaDoTexto_(nomeCard);
  d.pais = d.pais && vd_placaEstrangeira_(d.placa) === d.pais.toUpperCase() ? d.pais.toUpperCase() : '';
  if (!d.ano && d.modelo) {
    var anosM = d.modelo.match(/\b(19[89]\d|20[0-4]\d)\b/g);
    if (anosM) d.ano = anosM.slice(0, 2).join('/');
  }
  var doOrcamento = /OR[ÇC]AMENTO IMPORTADO/i.test(vd_limpar_(bloco));
  var modoNova = !!opts.base;
  // tipo do pedido: linha TIPO, título ou etiqueta (PARTICULAR) — padrão SEGURADORA
  if (!d.tipo) d.tipo = vd_tipoNormPedido_(opts.tipo || (/\bPARTICULAR\b/i.test(nomeCard || '') ? 'PARTICULAR' : /\bRETORNO\b/i.test(nomeCard || '') ? 'RETORNO' : ''));
  var particular = d.tipo === 'PARTICULAR', semSeg = vd_semSeguradora_(d.tipo);

  var faltas = [];
  if (!d.placa) faltas.push('placa');
  else if (!vd_placaValida_(d.placa) && !d.pais) faltas.push('placa inválida (' + d.placa + ')');
  if (!modoNova) {
    if (semSeg) {
      // particular (carro ainda não entrou) / retorno: placa, modelo e chassi obrigatórios; ano opcional
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
    var p = vd_analisarPeca_(l, pecas.length + 1, { codigoOpcional: semSeg });
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

// Validacao.gs:506
function vd_analisarPeca_(linha, n, opts) {
  opts = opts || {};
  var partes = linha.split('|').map(function (s) { return s.trim(); });
  var qtd = '', part = false, partPor = '', comp = false, compData = '', compStatus = '', compPor = '', nao = false, naoMotivo = '', valorOrc = '', obs = '', foto = false;
  partes = partes.filter(function (s) {
    // 22/10/2026 (Weslley): "| FOTO" = o consultor anexou foto da peça no pedido (peça particular/retorno sem código)
    if (/^FOTO$/i.test(s)) { foto = true; return false; }
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
    // 09/10/2026 (Weslley): situação do orçamento complementar na seguradora — "COMPL: AUTORIZADO" (seguradora autorizou e foi
    // importado no Databox) ou "COMPL: ANTECIPADO nome" (comprado antes da autorização, liberado pelo orçamentista)
    var ms = s.match(/^COMPL(?:EMENTAR)?\s*[:\-–]\s*(AUTORIZADO|ANTECIPADO)(?:\s+(.+))?$/i);
    if (ms) { compStatus = ms[1].toUpperCase(); compPor = (ms[2] || '').trim(); return false; }
    // peça particular dentro de pedido de seguradora (cliente paga): "PARTICULAR @consultor"
    var mp = s.match(/^PARTICULAR(?:\s*@\s*([\w.\-]+))?$/i);
    if (mp) { part = true; partPor = (mp[1] || '').toLowerCase(); return false; }
    return true;
  });
  // 13/10/2026 (Weslley): ADITIVO (de radiador / arrefecimento) que vem no orçamento é 🚫 não comprar por padrão — sai do
  // estoque da oficina. Só quando ninguém marcou tipo: com tipo marcado, alguém decidiu comprar e vale o que está escrito.
  if (!nao && !part && /^(?:OLEO\s+)?ADITIVO\b/.test(vd_semAcento_(partes[1] || '')) && !partes.slice(2).join('').trim()) { nao = true; naoMotivo = 'ESTOQUE DA OFICINA (PADRÃO)'; }
  // 21/10/2026 (TAW0B79, "KIT COLA BRR01" importado do orçamento): cola, adesivo, silicone e vedante são insumo da oficina, não peça
  if (!nao && !part && /^(?:KIT\s+)?(?:COLA|ADESIVO|SILICONE|VEDANTE|INSUMOS?)\b/.test(vd_semAcento_(partes[1] || '')) && !partes.slice(2).join('').trim()) { nao = true; naoMotivo = 'INSUMO DA OFICINA (PADRÃO)'; }
  if (part) opts = { codigoOpcional: true };
  if (nao) opts = { codigoOpcional: true };   // não vai ser comprada: não cobra código nem tipo
  // 17/10/2026 (teste das cópias): pneu que veio do orçamento como peça comum ("S/C | PNEU HIFLY 195/55R15 HF261 85V" ou
  // " | PNEU …") cobrava "falta o código". Pneu não tem código do Cilia: vira "PNEU | medida | marca/modelo".
  (function () {
    var i = /^PNEUS?\b/i.test(partes[0] || '') && !/^PNEUS?$/i.test(partes[0]) ? 0
      : (partes.length > 1 && !/\d{4}/.test((partes[0] || '').replace(/[^A-Z0-9]/gi, '')) && /^PNEUS?\b/i.test(partes[1] || '') ? 1 : -1);
    if (i < 0) return;
    var t = partes[i], mm = t.match(/\d{3}\s*\/\s*\d{2}\s*Z?R?\s*\d{2}/i);
    if (!mm) return;
    var resto = t.replace(/^PNEUS?\b/i, '').replace(mm[0], ' ').replace(/\s+/g, ' ').trim();
    var outros = partes.slice(i + 1);
    partes = ['PNEU', mm[0].replace(/\s+/g, '').toUpperCase()].concat(outros.length ? outros : (resto ? [resto] : []));
  })();
  var faltas = [];
  var rot;
  if (/^PNEUS?$/i.test(partes[0] || '')) {
    var medida = partes[1] || '', catMarca = partes[2] || '';
    rot = 'item ' + n + ' (PNEU ' + (medida || '?') + ')';
    if (!medida) faltas.push(rot + ': falta a medida');
    else if (!vd_medidaPneu_(medida)) faltas.push(rot + ': medida fora do padrão (ex.: 195/65R15)');
    if (!catMarca && !nao) faltas.push(rot + ': falta categoria (IMPORTADO / 1ª LINHA) ou marca');
    if (nao) faltas = [];
    return { pneu: true, medida: medida, categoria: vd_categPneu_(catMarca), marca: vd_categPneu_(catMarca) ? '' : catMarca, qtd: qtd, particular: part, partPor: partPor, complemento: comp, compData: compData, compStatus: compStatus, compPor: compPor, naoComprar: nao, naoMotivo: naoMotivo, valorOrc: valorOrc, obs: obs, foto: foto || undefined, faltas: faltas, texto: linha };
  }
  var codigo = partes[0] || '', descr = partes[1] || '', tiposTxt = partes.slice(2).join('/');
  rot = 'item ' + n + ' (' + (descr || codigo || linha).slice(0, 40) + ')';
  if (partes.length < 2) {
    faltas.push(rot + ': fora do padrão CÓDIGO | DESCRIÇÃO | TIPO');
    return { pneu: false, codigo: '', descricao: linha, tipos: [], qtd: qtd, particular: part, partPor: partPor, complemento: comp, compData: compData, compStatus: compStatus, compPor: compPor, naoComprar: nao, naoMotivo: naoMotivo, valorOrc: valorOrc, obs: obs, foto: foto || undefined, faltas: faltas, texto: linha };
  }
  // 13/10/2026 (Weslley): "ACESSORIO" no lugar do código = peça que nem o Cilia tem código — vale, não cobra; a peça fica
  // identificada pela descrição (vários acessórios no mesmo pedido não se confundem) e a linha continua "ACESSORIO | …"
  var acessorio = vd_ehAcessorio_(codigo);
  var semCodigo = !codigo || !/\d/.test(codigo) || codigo.replace(/[^A-Z0-9]/gi, '').length < 4 || /^S\s*\/?\s*C$/i.test(codigo);
  if (semCodigo && !opts.codigoOpcional && !acessorio) faltas.push(rot + ': falta o código da peça (buscar no Cilia)');
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
  return { pneu: false, codigo: codigo, acessorio: acessorio || undefined, descricao: descr, tipos: tipos, qtd: qtd, particular: part, partPor: partPor, complemento: comp, compData: compData, compStatus: compStatus, compPor: compPor, naoComprar: nao, naoMotivo: naoMotivo, valorOrc: valorOrc, obs: obs, foto: foto || undefined, faltas: faltas, texto: linha };
}

// Validacao.gs:591
function vd_complTxt_(p) {
  if (!p || !p.complemento || !p.compStatus) return '';
  if (p.compStatus === 'AUTORIZADO') return ' · ✅ complementar autorizado/importado';
  return ' · ⚠️ comprado antes da autorização' + (p.compPor ? ' (liberado por ' + vd_md_(p.compPor) + ')' : '');
}

// Validacao.gs:598
function vd_complPendentes_(an) {
  return (an && an.pecas || []).filter(function (p) { return p.complemento && !p.particular && p.compStatus === 'ANTECIPADO'; });
}

// Validacao.gs:601
function vd_complPendTxt_(pecas) {
  return pecas.map(function (p) { return vd_nomePeca_(p) + (p.compPor ? ' (liberado por ' + p.compPor + ')' : ''); }).join('; ');
}

// Validacao.gs:607
function vd_linhaPeca_(p, i) {
  var q = (p.qtd && +p.qtd > 1 ? ' | QTD ' + p.qtd : '') + (p.complemento && !p.particular ? ' | COMPLEMENTO' + (p.compData ? ' ' + p.compData : '') : '') + (p.complemento && !p.particular && p.compStatus ? ' | COMPL: ' + p.compStatus + (p.compPor ? ' ' + String(p.compPor).replace(/\|/g, '/').trim() : '') : '') + (p.particular ? ' | PARTICULAR' + (p.partPor ? ' @' + p.partPor : '') : '')
    + (p.naoComprar ? ' | NÃO COMPRAR' + (p.naoMotivo ? ': ' + String(p.naoMotivo).replace(/\|/g, '/').trim() : '') : '')
    + (vd_valorOrcTxt_(p.valorOrc) ? ' | ORÇ ' + vd_valorOrcTxt_(p.valorOrc) : '')
    + (p.obs ? ' | OBS: ' + String(p.obs).replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim() : '')
    + (p.foto && !p.pneu ? ' | FOTO' : '');
  if (p.pneu) return (i + 1) + '. PNEU | ' + p.medida + ' | ' + (p.categoria || p.marca) + q;
  return (i + 1) + '. ' + (p.codigo || (p.acessorio ? 'ACESSORIO' : '')) + ' | ' + p.descricao + ' | ' + (p.tipos || []).join('/') + q;
}

// Validacao.gs:618
function vd_ehAcessorio_(c) { return /^ACESSORIOS?$/.test(vd_semAcento_(String(c || '')).toUpperCase().replace(/[^A-Z]/g, '')); }

// Validacao.gs:621
function vd_valorOrcTxt_(v) {
  if (v == null || v === '') return '';
  var n = typeof v === 'number' ? v : vd_valorNum_(v);
  return isNaN(n) || n <= 0 ? '' : vd_valorBR_(n);
}

// Validacao.gs:628
function vd_economiaOrc_(valorOrc, valorCot) {
  var o = typeof valorOrc === 'number' ? valorOrc : vd_valorNum_(valorOrc), c = typeof valorCot === 'number' ? valorCot : vd_valorNum_(valorCot);
  if (isNaN(o) || isNaN(c) || o <= 0 || c < 0) return null;
  var pct = (o - c) / o * 100;
  return { pct: Math.round(pct * 10) / 10, nivel: pct < 20 ? 'ruim' : (pct <= 30 ? 'medio' : 'bom') };
}

// Validacao.gs:640
function vd_soMaoDeObra_(desc) {
  return /(^|\n)NENHUMA PE[ÇC]A[^\n]*M[ÃA]O DE OBRA/i.test(vd_limpar_(vd_dividir_(desc).bloco));
}

// Validacao.gs:645
function vd_montarBloco_(d, pecas, obs, rodape, extra) {
  extra = extra || {};
  var L = [];
  if (d.modelo) L.push('**MODELO:** ' + d.modelo);
  if (d.ano) L.push('**ANO:** ' + d.ano);
  if (d.motor) L.push('**MOTOR/VERSÃO:** ' + d.motor);
  if (d.chassi) L.push('**CHASSI:** ' + d.chassi);
  L.push('**PLACA:** ' + (d.placa || '') + (d.pais ? ' (' + d.pais + ')' : ''));
  if (vd_semSeguradora_(extra.tipo)) L.push('**TIPO:** ' + extra.tipo);
  if (extra.cor) L.push('**COR:** ' + extra.cor);
  if (extra.seguradora) L.push('**SEGURADORA:** ' + extra.seguradora);
  if (extra.sinistro) L.push('**SINISTRO:** ' + extra.sinistro);
  L.push('');
  L.push('**PEÇAS:**');
  if (pecas.length) pecas.forEach(function (p, i) { L.push(vd_linhaPeca_(p, i)); });
  else if (extra.soMaoDeObra && !(extra.fo || []).length && !(extra.foLinhas || []).length) L.push('_' + VD_SO_MO_LINHA + '_');   // 23/10/2026 (vd_soMaoDeObra_)
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

// Validacao.gs:678
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

// Validacao.gs:693
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

// Validacao.gs:731
function vd_motorDoModelo_(m) {
  var s = String(m || '');
  var d = s.match(/\b\d\.\d\b/);
  if (!d) return '';
  var resto = s.slice(d.index + d[0].length);
  var tk = resto.match(/\b(\d{1,2}V|TURBO|DIESEL|FLEX|ECONO\.?\s?FLEX|TSI|TFSI|THP|MPI|HIBRIDO|HYBRID)\b/g) || [];
  return [d[0]].concat(tk.filter(function (t, i) { return tk.indexOf(t) === i; })).join(' ');
}

// Validacao.gs:739
function vd_extrair_(texto) {
  var T = String(texto || '').replace(/\r/g, '');
  var U = vd_semAcento_(T).replace(/[\s\u00a0]+/g, ' ');
  var r = { chassis: [], placas: [], modelo: '', ano: '', motor: '', origem: '' };
  var m;
  var reRot = /CHASSI[S]?\s*(?:N[ºO°.]*)?\s*[:.\-]?\s*([A-HJ-NPR-Z0-9][A-HJ-NPR-Z0-9 .\-]{15,22})/g;
  while ((m = reRot.exec(U))) { var c = vd_normChassi_(m[1]).slice(0, 17); if (vd_chassiValido_(c) && r.chassis.indexOf(c) < 0) r.chassis.push(c); }
  if (!r.chassis.length) { var reSolto = /\b([A-HJ-NPR-Z0-9]{17})\b/g; while ((m = reSolto.exec(U))) { if (vd_chassiValido_(m[1]) && /^[1-9A-HJ-NPR-Z]/.test(m[1]) && r.chassis.indexOf(m[1]) < 0) r.chassis.push(m[1]); } }
  // 26/10/2026 (Weslley, APO0I47): o próprio orçamento traz o chassi com tamanho errado ("9BWB05W58P078022", 16) — não é
  // preenchido, mas o robô avisa para a equipe conferir no documento do carro (antes parecia falha de leitura)
  if (!r.chassis.length) { var mInv = U.match(/CHASSI[S]?\s*(?:N[ºO°.]*)?\s*[:.\-]?\s*([A-Z0-9]{10,20})\b/); if (mInv && mInv[1].length !== 17 && /\d{4}/.test(mInv[1]) && /[A-Z]/.test(mInv[1])) r.chassiInvalido = mInv[1]; }
  var reP = /\b([A-Z]{3})[\s\-]?(\d[A-Z0-9]\d{2})\b/g;
  // 16/10/2026: horário ("DAS 8H00 ÀS 20H00") e câmbio + ano ("FLEX AUT 2020") não são placa
  var naoPlaca = function (a, b) { return (/^(DAS|AS|ATE|DES)$/.test(a) && /^\dH[0-5]\d$/.test(b)) || (/^(AUT|MEC|MAN|ANO|MOD|CVT)$/.test(a) && /^(19|20)\d\d$/.test(b)); };
  while ((m = reP.exec(U))) { var p = m[1] + m[2]; if (!naoPlaca(m[1], m[2]) && r.placas.indexOf(p) < 0) r.placas.push(p); }
  // placa "com rótulo": logo depois de PLACA (Cilia/HDI/CRLV) ou logo depois do chassi (Websoma "Licença")
  r.placasRot = [];
  var reRotP = /(?:PLACA\s*(?:N[O.]*)?\s*[:.\-]?|\b[A-HJ-NPR-Z0-9]{17}) ?([A-Z]{3})[\s\-]?(\d[A-Z0-9]\d{2})\b/g;
  while ((m = reRotP.exec(U))) { var pr = m[1] + m[2]; if (r.placasRot.indexOf(pr) < 0) r.placasRot.push(pr); }
  var ANO = '(19[89]\\d|20[0-4]\\d)';
  // Cilia: "CASCO - CHEVROLET - CRUZE SEDAN (2017 A 2019) LT 1.4 16V TURBO 2017 Autorizado"
  // 23/10/2026 (TBP3J46, Allianz): a marca-d'água "NÃO AUTORIZADO" sai do PDF com as letras soltas ("2025 N AO AU TO R IZ PLACA…")
  // — depois do ano também valem pedaços de 1–3 letras (3 ou mais); no OCR do Google sai "2025 Não Autorizado Placa" (NAO )
  if ((m = U.match(new RegExp('(?:^|\\s)[A-Z]{3,12} - ([A-Z][A-Z .\\-]{1,20}?) - (.{3,100}?) ' + ANO + ' (?=AUTORIZ|CONSTAT|PLACA|NEGAD|EM |ORCAMENT|VISTORIA|CANCEL|PENDEN|NAO |[A-Z]{4,}|(?:[A-Z]{1,3} ){3,})')))) {
    r.modelo = (m[1] + ' ' + m[2]).replace(/\(\s*\d{4}\s*A\s*\d{4}\s*\)/, '').replace(/\s+/g, ' ').trim();
    r.ano = m[3]; r.origem = 'cilia';
  }
  // Cilia da própria oficina (orçamento particular, 21/10/2026, SES8I10): "CRETA (2020 A 2025) ACTION AUT 1.6 16V FLEX 2024 Placa SES8I10"
  // — sem marca e sem "CASCO -"; o modelo vem antes da faixa de anos e a versão depois
  else if ((m = U.match(new RegExp('(?:^|\\s)([A-Z][A-Z0-9][A-Z0-9 .\\-\\/]{0,30}?) \\(\\d{4} A \\d{4}\\) (.{2,80}?) ' + ANO + ' (?=PLACA\\b)')))) {
    r.modelo = (m[1] + ' ' + m[2]).replace(/\s+/g, ' ').trim(); r.ano = m[3]; r.origem = 'cilia';
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

// Validacao.gs:801
function vd_anexoLegivel_(a) {
  return !!a && a.isUpload && (a.bytes || 0) <= VD.MAX_BYTES_ANEXO &&
    (/pdf|image\/(jpe?g|png|webp|gif)/i.test(a.mimeType || '') || /\.(pdf|jpe?g|png)$/i.test(a.name || ''));
}

// Validacao.gs:812
function vd_anxAba_() {
  if (VD_ANXS.SH) return VD_ANXS.SH;
  var ss = vd_planilhaBackup_().getParent(), sh = ss.getSheetByName(VD_ANXS.ABA);
  if (!sh) { sh = ss.insertSheet(VD_ANXS.ABA); sh.appendRow(['Anexo id', 'Quando', 'Leitura (JSON)']); sh.setFrozenRows(1); }
  return (VD_ANXS.SH = sh);
}

// Validacao.gs:819
function vd_anxIdx_() {
  if (VD_ANXS.ROW) return VD_ANXS.ROW;
  var idx = {};
  try {
    var sh = vd_anxAba_(), n = sh.getLastRow();
    if (n > 1) sh.getRange(2, 1, n - 1, 1).getValues().forEach(function (r, i) { if (r[0]) idx[String(r[0])] = i + 2; });
  } catch (e) { console.log('anexos/índice: ' + e); }
  return (VD_ANXS.ROW = idx);
}

// Validacao.gs:829
function vd_anxGet_(id) {
  if (!id) return null;
  var c = null, k = 'vd_anx_' + id;
  try { c = CacheService.getScriptCache(); var v = c.get(k); if (v) return v; } catch (e) {}
  var js = null, lin = vd_anxIdx_()[id];
  // confere o id da linha (a limpeza diária reescreve a aba; o índice de outra execução pode estar velho)
  if (lin) { try { var lv = vd_anxAba_().getRange(lin, 1, 1, 3).getValues()[0]; if (String(lv[0]) === id) js = String(lv[2] || '') || null; } catch (e) { console.log('anexos/ler: ' + e); } }
  if (!js) { try { js = PropertiesService.getScriptProperties().getProperty('VD_ANX3_' + id); } catch (e) {} }
  if (js && c) { try { if (js.length < 90000) c.put(k, js, 21600); } catch (e) {} }
  return js;
}

// Validacao.gs:841
function vd_anxTem_(id) {
  if (!id) return false;
  if (vd_anxIdx_()[id]) return true;
  try { return !!PropertiesService.getScriptProperties().getProperty('VD_ANX3_' + id); } catch (e) { return false; }
}

// Validacao.gs:847
function vd_anxSet_(id, js) {
  var sh = vd_anxAba_(), idx = vd_anxIdx_(), lin = idx[id];
  if (lin && String(sh.getRange(lin, 1).getValue()) !== id) lin = 0;   // índice velho: não sobrescreve outro anexo
  if (lin) sh.getRange(lin, 2, 1, 2).setValues([[new Date(), js]]);
  else { sh.appendRow([id, new Date(), js]); idx[id] = sh.getLastRow(); }
  try { if (js.length < 90000) CacheService.getScriptCache().put('vd_anx_' + id, js, 21600); } catch (e) {}
  try { var pp = PropertiesService.getScriptProperties(); if (pp.getProperty('VD_ANX3_' + id) !== null) pp.deleteProperty('VD_ANX3_' + id); } catch (e) {}
}

// Validacao.gs:856
function vd_anxMigrar_() {
  var p = PropertiesService.getScriptProperties(), all = p.getProperties(), ks = Object.keys(all);
  var velhas = ks.filter(function (k) { return /^VD_ANX2?_[0-9a-f]{24}$/.test(k); });
  velhas.slice(0, 100).forEach(function (k) { p.deleteProperty(k); });
  var mig = ks.filter(function (k) { return /^VD_ANX3_[0-9a-f]{24}$/.test(k); }).slice(0, 80);
  if (!mig.length) return velhas.length;
  var sh = vd_anxAba_(), idx = vd_anxIdx_(), agora = new Date(), novas = [];
  mig.forEach(function (k) {
    var id = k.slice(8);
    novas.push([id, agora, all[k]]);   // linha repetida não atrapalha: o índice fica com a última
  });
  if (novas.length) {
    var ini = sh.getLastRow() + 1;
    sh.getRange(ini, 1, novas.length, 3).setValues(novas);
    novas.forEach(function (r, i) { idx[r[0]] = ini + i; });
  }
  SpreadsheetApp.flush();
  mig.forEach(function (k) { p.deleteProperty(k); });
  console.log('anexos → planilha: ' + mig.length + ' leitura(s)' + (velhas.length ? ' · ' + Math.min(velhas.length, 100) + ' cache(s) velho(s) apagado(s)' : ''));
  return mig.length;
}

// Validacao.gs:888
function vd_lerAnexoTrello_(a, opt) {
  opt = opt || {};
  var cache = vd_anxGet_(a.id);   // aba ANEXOS (16/10/2026; antes VD_ANX3_ nas propriedades)
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
    // leitor do Cilia corrigido (14/10/2026, JDC7H45: código com ponto no fim sumia): o formulário relê orçamento Cilia lido
    // pelo leitor antigo — só quando alguém pede no formulário, sem reler tudo de uma vez
    else if (r && opt.orcCompleto && r.orcamento === 'CILIA' && (r.rl || 0) < VD_LEITOR_V) r = null;
    // cache sem a placa "com rótulo" e com placas ambíguas: lê de novo uma vez
    else if (r && !r.placasRot && (r.placas || []).length > 1) r = null;
    if (r) r.doCache = true;
  }
  if (!r) {
    var orcFull = null;
    try {
      var resp = qt_fetch_(a.url, { headers: { Authorization: vd_auth_() }, muteHttpExceptions: true });
      if (resp.getResponseCode() >= 300) return null;
      // 15/10/2026: anexo que o robô trouxe da API do Cilia (CiliaApi.gs) — as peças são as oficiais da API; o PDF (OCR) só
      // completa chassi, cor e a dica de tipo pelo código. Sem OCR (Drive fora do ar), vale só a API.
      var api = (typeof cl_pecasDoAnexo_ === 'function') ? cl_pecasDoAnexo_(a.id) : null;
      var texto = '';
      try { texto = vd_ocr_(resp.getBlob(), a.name); } catch (eo) { if (!api) throw eo; }
      r = vd_extrair_(texto);
      var orc = vd_lerOrcamento_(texto);
      if (api) { orc = cl_juntarApi_(orc, api, r); r.api = api.nv; }
      r.cor = orc.cor; r.seguradora = orc.seguradora; r.sinistro = orc.sinistro; r.orcamento = orc.origem;
      if (!orc.origem) { try { var nfL = ax_dadosNf_(texto); if (nfL) r.nf = nfL; } catch (e) {} }   // nota fiscal: nome no padrão das rotinas (13/10/2026)
      // tipo do documento para o nome padronizado do anexo (05/10/2026): "Status do Pedido" do Cilia = fornecimento
      if (!orc.origem) {
        var nt = vd_normTexto_(texto);
        if (/STATUS DO PEDIDO|PREVISAO DE ENTREGA/.test(nt)) { r.doc = 'FO'; r.docNome = 'Status do Pedido Cilia'; }
        else if (/PECAS DO SINISTRO|PECAS DO LAUDO/.test(nt)) { r.doc = 'FO'; r.docNome = 'Peças HDI'; }   // portal HDI (07/10/2026)
        else if (/PECAS EM PROCESSO DE COTACAO/.test(nt)) { r.doc = 'LAUDO_HDI'; r.docNome = 'laudo HDI sem peças (em cotação na HDI)'; }   // 11/10/2026, BXZ4J84
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
    r.v = VD_ANX_V; r.rl = VD_LEITOR_V;
    var js = JSON.stringify(r);
    if (js.length > VD_ANXS.MAX && r.orc) { delete r.orc; r.orcGrande = true; js = JSON.stringify(r); }
    // falha ao guardar (planilha fora do ar) não pode derrubar a leitura: segue sem guardar (10/10/2026)
    try { vd_anxSet_(a.id, js.length > VD_ANXS.MAX ? JSON.stringify({ v: VD_ANX_V, chassis: r.chassis, chassiInvalido: r.chassiInvalido, placas: r.placas, placasRot: r.placasRot, modelo: r.modelo, ano: r.ano, motor: r.motor, orcamento: r.orcamento, orcGrande: !!r.orcamento, seguradora: r.seguradora, cor: r.cor, sinistro: r.sinistro, doc: r.doc, docNome: r.docNome, nf: r.nf }) : js); }
    catch (e) { console.log('cache do anexo ' + a.name + ': ' + e); }
    if (orcFull) r.orcFull = orcFull;
  }
  return r;
}

// Validacao.gs:955
function vd_placaDosAnexos_(card, prazo) {
  var anexos = (card.attachments || []).filter(function (x) { return vd_anexoLegivel_(x) && !ax_ehNota_(x.name); }).slice(0, VD.MAX_ANEXOS_CARD);   // nota fiscal não é orçamento (10/10/2026)
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

// Validacao.gs:976
function vd_lerAnexosCard_(card, placa, prazo, batizar) {
  var anexos = (card.attachments || []).filter(function (x) { return vd_anexoLegivel_(x) && !ax_ehNota_(x.name) && VD_PULAR_ANEXOS.indexOf(x.id) < 0; }).slice(0, VD.MAX_ANEXOS_CARD);   // nota fiscal não é orçamento (10/10/2026)

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
    chassiInvalido: chassis.length ? null : pega('chassiInvalido'),   // 26/10/2026 (APO0I47)
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

// Validacao.gs:1033
function vd_dicaNorm_(t) {
  var s = vd_semAcento_(t);
  if (/^GENU/.test(s)) return 'GENUÍNO';
  if (/^ORIGINAL/.test(s)) return 'ORIGINAL';
  if (/REPOSI|^PRO$|^PPG$|^PPC$|^PAR$|OUTRAS FONTES/.test(s)) return 'REPOSIÇÃO';
  if (/^PPO$/.test(s)) return 'ORIGINAL';
  if (/VERDE|USAD|RECOND/.test(s)) return 'USADO';
  return '';
}

// Validacao.gs:1044
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

// Validacao.gs:1069
function vd_orcCompacto_(lista) {
  return (lista || []).map(function (p) {
    return p.pneu ? ['P', p.medida || '', p.marca || '', p.qtd || '1'] : [p.codigo || '', String(p.descricao || '').slice(0, 60), p.qtd || '1', vd_dicaNorm_(p.dica), vd_valorOrcTxt_(p.valorOrc), p.codigoAntigo || ''];   // [4] = valor líquido no orçamento (06/10/2026) · [5] = código antigo riscado (27/10/2026)
  });
}

// Validacao.gs:1079
function vd_cardCss_(nomeCard) { return VD_CSS.test(String(nomeCard || '')); }

// Validacao.gs:1081
function vd_pecaParaFo_(x, forn) {
  return x.pneu ? { pneu: true, medida: x.medida || '', marca: x.marca || x.categoria || '', qtd: x.qtd || '', fornecedor: forn || '' }
    : { pneu: false, codigo: String(x.codigo || '').trim(), descricao: String(x.descricao || '').trim(), qtd: x.qtd || '', valorOrc: x.valorOrc || '', fornecedor: forn || '' };
}

// Validacao.gs:1086
function vd_orcCss_(orc, nomeCard) {
  if (!orc || !vd_cardCss_(nomeCard) || !(orc.oficina || []).length) return orc;
  return { origem: orc.origem, oficina: [], fo: (orc.fo || []).concat(orc.oficina.map(function (x) { return vd_pecaParaFo_(x, 'ZACARIAS'); })) };
}

// Validacao.gs:1091
function vd_orcExpandir_(lista) {
  return (lista || []).map(function (x) {
    return x[0] === 'P' && x.length === 4
      ? { pneu: true, medida: x[1], marca: x[2], categoria: '', qtd: x[3] }
      : { pneu: false, codigo: x[0], descricao: vd_limparDescricao_(x[1]), tipos: [], qtd: x[2], dica: x[3] || '', valorOrc: x[4] || '', codigoAntigo: x[5] || '' };
  });
}

// Validacao.gs:1107
function tr_hash_(desc) {
  var s = String(desc || '').replace(/\s+$/, '');
  var h = 0;
  for (var i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (h >>> 0) + ':' + s.length;
}

// Validacao.gs:1114
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

// Validacao.gs:1127
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
      try { if (it.completa.length < 90000) CacheService.getScriptCache().put('vd_cmp_' + it.id, '#' + h + '|' + it.completa, 21600); else CacheService.getScriptCache().remove('vd_cmp_' + it.id); } catch (e) {}
      if (VD_CMP_MEM) VD_CMP_MEM[it.id] = it.completa;
    }
  });
  // linha nova: a última linha é relida dentro do mutex — duas gravações de cards sem linha ao mesmo tempo não se sobrescrevem (10/10/2026)
  if (novos.length) sg_secao_('TRAVA_NOVA', function () { var n2 = sh.getLastRow(); sh.getRange(n2 + 1, 1, novos.length, 5).setValues(novos); });
  PropertiesService.getScriptProperties().setProperties(props);
  // últimas assinaturas GRAVADAS pelo robô/formulário (a linha de base não entra: ela só
  // fotografa o que já estava no card, que pode ser edição de pessoa)
  itens.forEach(function (it) { if (!it.base) tr_marcarRecente_(it.id, props[TR.PREFIXO + it.id]); });
}

// Validacao.gs:1157
function tr_marcarRecente_(cardId, h) {
  try {
    var cache = CacheService.getScriptCache(), k = 'tr_rec_' + cardId, lista = [];
    try { lista = JSON.parse(cache.get(k) || '[]'); } catch (e) {}
    lista = lista.filter(function (x) { return x !== h; }).concat([h]).slice(-12);
    cache.put(k, JSON.stringify(lista), 21600);
    var lp = {}; lp[k] = JSON.stringify(lista); lic_espelhar_(lp, 21600);
  } catch (e) { console.log('trava/recentes: ' + e); }
}

// Validacao.gs:1168
function tr_ehOficial_(cardId, desc) {
  try { return JSON.parse(CacheService.getScriptCache().get('tr_rec_' + cardId) || '[]').indexOf(tr_hash_(desc)) >= 0; } catch (e) { return false; }
}

// Validacao.gs:1172
function tr_guardar_(cardId, desc) { tr_guardarLote_([{ id: cardId, desc: desc }]); }

// Validacao.gs:1175
function tr_ler_(cardId) {
  var sh = tr_aba_();
  var n = sh.getLastRow();
  if (n < 2) return null;
  var ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === cardId) return String(sh.getRange(i + 2, 4).getValue());
  return null;
}

// Validacao.gs:1185
function vd_gravarDesc_(cardId, desc, token, extra) {
  var payload = extra || {};
  var vit = null, jaTinha = '';
  try {
    jaTinha = vd_completa_(cardId);
    var c = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'name,desc', checklists: 'all', checkItem_fields: 'name,state,due' } });
    var vitrineAntiga = c.desc || '';
    var itensPg = [];
    (c.checklists || []).filter(function (k) { return /^PAGAS/i.test((k.name || '').trim()); }).forEach(function (k) { itensPg = itensPg.concat(k.checkItems || []); });
    vit = vd_vitrine_(desc, payload.name || c.name, itensPg);
  } catch (e) { console.log('vitrine: ' + e); vit = null; }
  payload.desc = vit === null ? desc : vit;
  // 10/10/2026 (revisão): o Trello recusa descrição acima de 16.384 caracteres (erro 400 depois de os checklists já terem sido
  // gravados; toda ação seguinte no card falhava). Vitrine grande: primeiro saem os links de anúncio, depois corta com aviso.
  if (payload.desc.length > 16000) {
    payload.desc = payload.desc.replace(/\s*\[🔗[^\]]*\]\([^)]*\)/g, '');
    if (payload.desc.length > 16000) { var corte = payload.desc.lastIndexOf('\n', 15800); payload.desc = payload.desc.slice(0, corte > 12000 ? corte : 15800) + '\n\n_(descrição resumida: o card passou do limite do Trello — o histórico completo está nos comentários e no formulário)_'; }
  }
  // 10/10/2026 (revisão): a cópia oficial (TRAVA) ia DEPOIS do Trello e o erro era engolido — quando a planilha falhava, a vitrine
  // nova ficava no card sem a completa por trás: a cotação recém-lançada sumia do formulário e a trava desfazia a vitrine culpando
  // quem salvou ("🔒 ALTERAÇÃO NÃO PERMITIDA"). Agora a TRAVA é gravada ANTES; se falhar, nada muda no card e quem salvou vê o erro.
  // Se o Trello falhar depois, a cópia oficial volta ao que era (senão o reenvio leria a completa nova e duplicaria a cotação).
  if (desc.length > 45000) { try { vd_avisarDescGrande_(cardId, desc.length); } catch (e) {} }
  try { tr_guardarLote_([{ id: cardId, desc: payload.desc, completa: vit === null ? '' : desc }]); }
  catch (e) { console.log('trava: ' + e); throw new Error('Não consegui guardar a descrição na planilha de controle (' + String((e && e.message) || e).slice(0, 120) + '). Nada foi alterado no card — tente de novo em alguns segundos.'); }
  try { vd_api_('/cards/' + cardId, { method: 'put', payload: payload }, token); }
  catch (e) {
    try { if (typeof vitrineAntiga === 'string') tr_guardarLote_([{ id: cardId, desc: vitrineAntiga, completa: jaTinha || '' }]); } catch (e2) { console.log('trava/desfazer: ' + e2); }
    throw e;
  }
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

// Validacao.gs:1229
function vd_avisarDescGrande_(cardId, tam) {
  var cache = CacheService.getScriptCache(), k = 'vd_grande_' + cardId;
  if (cache.get(k)) return;
  cache.put(k, '1', 21600);
  var c = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'name,shortUrl' } });
  MailApp.sendEmail(SD.EMAIL, 'Trello: descrição do card ' + (c.name || cardId) + ' muito grande (' + tam + ' caracteres)',
    'A descrição completa do card ' + (c.name || '') + ' (' + (c.shortUrl || cardId) + ') tem ' + tam + ' caracteres — o limite da planilha de controle é 50.000.\n' +
    'Acima disso o salvamento passa a falhar. Caminho: arquivar o histórico antigo de cotações do card (ou abrir um card novo para o que falta).');
}

// Validacao.gs:1240
function vd_redesenhar_(cardId, token) {
  var desc = vd_completa_(cardId);
  if (!desc) desc = vd_api_('/cards/' + cardId, { cru: true, query: { fields: 'desc' } }).desc || '';
  vd_gravarDesc_(cardId, desc, token);
}

// Validacao.gs:1247
function tr_executar_() {
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO' || vd_prop_('VD_TRAVA_DESC', 'SIM') === 'NAO') return 0;
  var board = vd_board_();
  var props = PropertiesService.getScriptProperties();
  var todas = null;   // todas as propriedades: só lidas quando há card para conferir (10/10/2026 — era a cada minuto, ~400 KB)
  var agora = Date.now();
  // só os cards cuja descrição mudou (histórico do quadro), não o quadro inteiro: no principal são ~650 cards.
  // Edição dos últimos 40 s fica para o próximo ciclo (gravação do formulário em andamento).
  var ate = agora - TR.ESPERA_MS, desde = vd_marca_('TR_ACT');
  if (!desde) { vd_marcaSet_('TR_ACT', new Date(ate).toISOString()); return 0; }
  if (new Date(desde).getTime() >= ate) return 0;
  var acts = vd_acoesQuadro_(board, { filter: 'updateCard:desc', since: desde, before: new Date(ate).toISOString(), limit: 200, fields: 'data,date' });
  vd_marcaSet_('TR_ACT', new Date(ate).toISOString());
  var ids = [];
  acts.forEach(function (a) { var id = a.data && a.data.card && a.data.card.id; if (id && ids.indexOf(id) < 0) ids.push(id); });
  var cards = [];
  ids.forEach(function (id) {
    if (vd_legado_(id)) return;
    try { cards.push(vd_api_('/cards/' + id, { cru: true, query: { fields: 'name,desc,shortLink,shortUrl,dateLastActivity,closed' } })); } catch (e) {}
  });
  var baseline = [], restaurados = 0;
  if (!cards.length) return 0;
  todas = props.getProperties();
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

// Validacao.gs:1331
function du_pad_(n) { return (n < 10 ? '0' : '') + n; }

// Validacao.gs:1332
function du_chave_(d) { return d.getFullYear() + '-' + du_pad_(d.getMonth() + 1) + '-' + du_pad_(d.getDate()); }

// Validacao.gs:1335
function du_pascoa_(a) {
  var b = Math.floor(a / 100), c = a % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  var g = Math.floor((b - f + 1) / 3), h = (19 * (a % 19) + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor(((a % 19) + 11 * h + 22 * l) / 451);
  var mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(a, mes - 1, dia, 12);
}

// Validacao.gs:1343
function du_lerProp_(nome) {
  var out = [];
  String(vd_prop_(nome, '') || '').split(/[,;\s]+/).forEach(function (t) {
    var m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/) || t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return;
    out.push(m[1].length === 4 ? m[1] + '-' + m[2] + '-' + m[3] : m[3] + '-' + du_pad_(+m[2]) + '-' + du_pad_(+m[1]));
  });
  return out;
}

// Validacao.gs:1354
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

// Validacao.gs:1367
function du_ehUtil_(d) {
  var w = d.getDay();
  if (w === 0 || w === 6) return false;
  return !du_feriados_(d.getFullYear())[du_chave_(d)];
}

// Validacao.gs:1374
function du_somarUteis_(dias, base) {
  var n = parseInt(dias, 10) || 0, h = base ? new Date(base) : new Date();
  if (isNaN(h.getTime())) h = new Date();
  var d = new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12, 0, 0);
  if (vd_prop_('VD_DIAS_UTEIS', 'SIM') === 'NAO') { d.setDate(d.getDate() + n); return d.toISOString(); }
  var guarda = 0;
  while (n > 0 && guarda++ < 400) { d.setDate(d.getDate() + 1); if (du_ehUtil_(d)) n--; }
  return d.toISOString();
}

// Validacao.gs:1398
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

// Validacao.gs:1410
function vd_backup_(card, motivo) {
  vd_planilhaBackup_().appendRow([new Date(), vd_board_(), card.name, card.shortUrl || card.url, motivo, card.desc]);
}

// Validacao.gs:1435
function vd_criador_(cardId) {
  // quem criou o card não muda: cache de 6 h (06/10/2026 — era 1 chamada a cada abertura do formulário e a cada comentário do robô)
  var cache = null, k = 'vd_criador_' + cardId;
  try { cache = CacheService.getScriptCache(); var c = cache.get(k); if (c !== null) return c; } catch (e) {}
  var quem = '';
  try {
    // 1) campo "Consultor" do card
    try {
      var defC = (typeof cf_defs_ === 'function') ? cf_defs_()['Consultor'] : null;
      if (defC) {
        var itensC = vd_api_('/cards/' + cardId + '/customFieldItems', { cru: true }) || [];
        var itC = itensC.filter(function (i) { return i.idCustomField === defC.id; })[0];
        var tC = itC && itC.value && itC.value.text ? String(itC.value.text).replace(/^@/, '').trim().toLowerCase() : '';
        // valor gravado antes (pelo próprio robô) com a diretoria/robô não vale como fonte: segue para a criação / "Pedido enviado por"
        if (/^[\w.\-]{3,}$/.test(tC) && tC !== 'timweslley' && !vdf_ehAutorizador_({ username: tC })) quem = tC;
      }
    } catch (e0) {}
    // 2) ação de criação
    if (!quem) {
      var acts = vd_api_('/cards/' + cardId + '/actions', {
        query: { filter: 'createCard,copyCard,moveCardToBoard,emailCard,convertToCardFromCheckItem', limit: 50, memberCreator_fields: 'username,fullName' }
      });
      if (acts && acts.length) {
        var a = acts[acts.length - 1];
        if (a.memberCreator) quem = a.memberCreator.username;
      }
      // 3) criado pela diretoria/robô em nome de alguém: "_Pedido enviado por Fulano_" na descrição completa
      try {
        var ehDir = !quem || vdf_ehAutorizador_({ username: quem }) || quem === 'timweslley';
        if (ehDir) {
          var desc = vd_completa_(cardId) || '';
          var mP = desc.match(/Pedido enviado por\s+([^_\n]+?)\s+pelo formul/i);
          if (mP) { var u = vd_membroPorNome_(mP[1]); if (u) quem = u; }
        }
      } catch (e1) {}
    }
    try { if (cache && quem) cache.put(k, quem, 21600); } catch (e2) {}
  } catch (e) {}
  return quem;
}

// Validacao.gs:1476
function vd_membroPorNome_(nome) {
  var alvo = vd_semAcento_(nome).replace(/\s+/g, ' ').trim();
  if (!alvo) return '';
  var cache = CacheService.getScriptCache(), k = 'vd_membros_' + vd_board_(), lista = null;
  try { lista = JSON.parse(cache.get(k) || 'null'); } catch (e) {}
  if (!lista) {
    lista = (vd_api_('/boards/' + vd_board_() + '/members', { cru: true, query: { fields: 'username,fullName' } }) || []).map(function (m) { return [vd_semAcento_(m.fullName || '').replace(/\s+/g, ' ').trim(), String(m.username || '').toLowerCase()]; });
    try { cache.put(k, JSON.stringify(lista), 21600); } catch (e) {}
  }
  var m = lista.filter(function (x) { return x[0] === alvo; })[0];
  return m ? m[1] : '';
}

// Validacao.gs:1492
function vd_agruparTipo_(faltas) {
  var nums = [], outras = [];
  faltas.forEach(function (f) {
    var m = f.match(/^item (\d+) \(.*\): falta o tipo de peça/);
    if (m) nums.push(m[1]); else outras.push(f);
  });
  if (nums.length < 2) return faltas;
  return outras.concat(['falta marcar o tipo de peça (GENUÍNO, ORIGINAL, PARALELO ou USADO) nos itens ' + nums.join(', ')]);
}

// Validacao.gs:1502
function vd_anosSeCruzam_(a, b) {
  var x = String(a || '').match(/(19|20)\d\d/g) || [], y = String(b || '').match(/(19|20)\d\d/g) || [];
  if (!x.length || !y.length) return true;
  return x.some(function (v) { return y.indexOf(v) >= 0; });
}

// Validacao.gs:1508
function vd_comentar_(card, txt) {
  vd_api_('/cards/' + card.id + '/actions/comments', { method: 'post', payload: { text: txt } });
}

// Validacao.gs:1512
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

// Validacao.gs:1524
function vd_descMudou_(card) {
  try {
    var c = vd_api_('/cards/' + card.id, { query: { fields: 'desc' } });   // sem cru: compara completa com completa, como o ciclo leu
    return String(c.desc || '') !== String(card.desc || '');
  } catch (e) { console.log('descMudou: ' + e); return false; }
}

// Validacao.gs:1536
function vd_completaAtrasada_(card) {
  try {
    var t = Date.parse(card.dateLastActivity || '');
    if (!t || Date.now() - t > 5 * 60 * 1000) return false;   // card parado: segue a regra de sempre
    var c = vd_api_('/cards/' + card.id, { cru: true, query: { fields: 'desc' } });
    var sh = tr_aba_(), cel = sh.getRange('A:A').createTextFinder(card.id).matchEntireCell(true).findNext();
    if (!cel) return false;
    var lin = sh.getRange(cel.getRow(), 1, 1, 5).getValues()[0], cmp = String(lin[4] || '');
    if (!cmp) return false;   // card sem vitrine: a descrição do Trello é a própria
    if (String(lin[1] || '') !== tr_hash_(String(c.desc || ''))) return true;   // a vitrine no Trello é de outra gravação
    return cmp !== String(card.desc || '');   // a completa que o ciclo leu é velha
  } catch (e) { console.log('completaAtrasada: ' + e); return false; }
}

// Validacao.gs:1553
function vd_avisoDuplicado_(card, ctx, props) {
  var k = 'VD_DUP_' + card.id;
  if (props.getProperty(k)) return;
  // 27/10/2026 (BBI3942): card criado pelo formulário nasce com o marcador "=== COTAÇÃO ===" na descrição — o formulário já
  // perguntou sobre a placa repetida; o ciclo rápido do webhook chegava antes de a marca VD_DUP_ sair da gravação (corrida).
  try { if (vd_dividir_(card.desc).temMarcador) { props.setProperty(k, '1'); return; } } catch (e) {}
  props.setProperty(k, '1');
  var criadoEm = parseInt(String(card.id).slice(0, 8), 16) * 1000;   // card antigo (antes desta regra) não ganha aviso
  if (!criadoEm || Date.now() - criadoEm > 2 * 24 * 3600e3) return;
  var placa = vd_placaDoTexto_(card.name || '');
  if (!placa || !ctx.modoAtivo) return;
  var outros = (vd_api_('/boards/' + ctx.board + '/cards', { cru: true, query: { fields: 'name,idList,shortLink,shortUrl' } }) || []).filter(function (c) {
    return c.id !== card.id && !vdf_cardProtegido_(c.name) && !/^\s*AVISO\b/i.test(c.name || '') && vd_mesmaPlaca_(vd_placaDoTexto_(c.name || '') || '', placa);
  });
  if (!outros.length) return;
  var nomes = {}; Object.keys(ctx.listas || {}).forEach(function (n) { nomes[ctx.listas[n]] = n; });
  var quem = ''; try { quem = vd_criador_(card.id); } catch (e) {}
  vd_comentar_(card, (quem ? '@' + quem + ' ' : '') + '⚠️ **PLACA JÁ TEM CARD ABERTO** — ' + placa + ': ' +
    outros.slice(0, 3).map(function (c) { return '[' + c.name + '](' + c.shortUrl + ') (' + (nomes[c.idList] || '?') + ')'; }).join('; ') +
    '\nSe for o mesmo serviço, use o card que já existe (pedido duplicado atrapalha compras e faturamento). Se for outro serviço ou retorno, pode seguir neste.');
}

// Validacao.gs:1576
function vd_conferirCard_(card, ctx) {
  var props = PropertiesService.getScriptProperties();
  var nome = card.name || '';
  var res = { card: nome, url: card.shortUrl, acao: '', faltas: [], preenchido: [], avisos: [] };
  try { vd_avisoDuplicado_(card, ctx, props); } catch (e) { console.log('duplicado: ' + e); }

  if (/^\s*AVISO\b/i.test(nome) || /NOVO PEDIDO DE PE[ÇC]A/i.test(nome) || /sem\s+compra\s+de\s+pe[çc]a/i.test(vd_limpar_(String(card.desc || '').split(/=== COTA[ÇC][ÃA]O \(compras\) ===/)[0]))) {   // 13/10/2026: só o pedido conta — o texto antigo guardado abaixo da COTAÇÃO ("SEM COMPRA DE PEÇAS 18/09") fazia o robô ignorar o card inteiro (RAM9I31)
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
    if (pa.placa && ctx.modoAtivo && vd_descMudou_(card)) { res.acao = 'descrição mudou durante a leitura dos anexos (alguém salvou) — fica para o próximo ciclo'; return res; }
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
    // 21/10/2026 (SES8I10): ler anexo demora segundos; se alguém salvou pelo formulário nesse meio-tempo, a descrição que o robô
    // tem na mão é velha — gravar por cima apagava chassi/tipo recém-preenchidos e devolvia o card a FALTA DADOS. Fica para o
    // próximo ciclo (a leitura dos anexos já está em cache, então ele volta rápido e com a descrição nova).
    if (ctx.modoAtivo && vd_descMudou_(card)) { res.acao = 'descrição mudou durante a leitura dos anexos (alguém salvou) — fica para o próximo ciclo'; return res; }
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
    if (!d.chassi && lido.chassiInvalido) res.avisos.push('o anexo ' + lido.chassiInvalido.anexo + ' traz o chassi ' + lido.chassiInvalido.v + ' com ' + lido.chassiInvalido.v.length + ' caracteres (chassi tem 17) — confira no documento do carro e preencha pelo ✏️ EDITAR');
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
  if (!base && !vd_semSeguradora_(an.dados.tipo) && !temOrc) {
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
    if (ctx.modoAtivo && card.idList !== idFalta && vd_completaAtrasada_(card)) {
      res.acao = 'descrição ainda em gravação (cópia oficial ≠ Trello) — fica para o próximo ciclo'; res.pular = true; return res;
    }
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
      // 13/10/2026: antes de mandar para EM COTAÇÃO (ou já nela — AUX4331: peça marcada 🚫 pela edição), vê se ainda há o que cotar (tudo já comprado / 🚫 não comprar -> coluna certa)
      var mvJ = ''; if (card.idList === idFalta || card.idList === idCot) { try { mvJ = rc_reavaliarColuna_(card.id, null, 'robô'); } catch (e) { console.log('falta/coluna: ' + e); } }
      if (mvJ) { res.acao = '→ ' + mvJ; }
      else if (card.idList === idFalta) {
        vd_mover_(card, idCot, 'bottom');
        // 21/10/2026 (Weslley: "calar os avisos de dados — quando está ok o pedido já anda, basta"): sem "DADOS COMPLETOS";
        // só o que o robô importou do orçamento (peças novas que a equipe precisa ver) ou um aviso de divergência sai.
        if (res.importado || txtAviso) vd_comentar_(card, ((res.importado ? res.importado.texto : '') + txtAviso).replace(/^\n/, ''));
      } else if (res.importado) {
        vd_comentar_(card, res.importado.texto + txtAviso);
      } else if (sigAnterior !== sigAtual && res.avisos.length) {
        vd_comentar_(card, 'ℹ️ ' + res.avisos.join('; '));
      }
      props.setProperty(chaveSig, sigAtual);
      // pedido só com peças da seguradora (FO): não tem o que cotar -> FALTA CHEGAR
      if (!an.pecas.length) { try { var mv = rc_reavaliarColuna_(card.id, null, 'robô'); if (mv) res.acao = '→ ' + mv; } catch (e) { console.log('só FO: ' + e); } }
    }
  }
  return res;
}

// Validacao.gs:1764
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
  var partes = vdf_partesTitulo_(card.name, { modelo: d.modelo || (lido.modelo && lido.modelo.v) || '', cor: extra.cor, seguradora: vd_rotuloSeguradora_(d.tipo, extra.seguradora) });
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
  try { vdf_registrarTrocasFo_(card, null, 'orçamento ' + (o.origem || ''), 'robô'); } catch (e) {}   // 27/10/2026: código trocado no FO fica registrado
  return { texto: texto, titulo: titulo };
}

// Validacao.gs:1811
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
  linhas.forEach(function (l, i) {
    if (base.indexOf(sigsH[i]) >= 0) return;
    if (vd_sigFormas_(sigs[i]).some(function (f) { return base.indexOf(vd_pkH_(f)) >= 0; })) return;   // só mudou a marca do complementar
    novas.push(l);
  });
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
    // 26/10/2026 (AYT6699): card esperando autorização com "quem paga" trocado — COTAÇÃO FINALIZADA ↔ PENDENTE AUTORIZAR
    if (ctx.modoAtivo && (card.idList === ctx.listas[VDF_LISTA_FINALIZADA] || card.idList === ctx.listas[VDF_LISTA_PENDENTE])) {
      try { var mvQ = rc_reavaliarColuna_(card.id, null, 'robô'); if (mvQ) { res.acao = '→ ' + mvQ; return res; } } catch (e) { console.log('pós-cotação/quem paga: ' + e); }
    }
    res.acao = res.pagas ? 'pagas' : 'sem peça nova';
    return res;
  }

  // linha "NÃO COMPRAR" (registro, fora do fluxo) não é peça nova
  novas = novas.filter(function (l) { return !/\|\s*N[ÃA]O COMPRAR\b/i.test(l); });
  // 20/10/2026 (UBJ0D80 retorno): a observação geral do pedido ("OBS: …", editada pelo formulário) não é peça nova —
  // mudar o texto dela mandava o card de PENDENTE AUTORIZAR para FALTA DADOS como "linha nova fora do padrão"
  novas = novas.filter(function (l) { return !/^\s*OBS\.?\s*[:\-–]/i.test(l); });
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

// Validacao.gs:1914
function vd_contexto_() {
  var board = vd_board_();
  var url = vd_prop_('VD_URL_FORM', VD.URL_FORM);
  return {
    board: board,
    listas: vd_listas_(board),
    modoAtivo: vd_modo_() === 'ATIVO',
    prazo: vd_prazo_(VD.LIMITE_MS, 90 * 1000),   // deixa 90 s para complemento, prazos e SLA
    urlForm: url
  };
}

// Validacao.gs:1926
function vd_cardsDasListas_(ids, comAnexos) {
  var cards = [];
  ids.forEach(function (idL) {
    var q = { fields: 'name,desc,idList,shortLink,shortUrl,dateLastActivity,labels' };
    if (comAnexos) { q.attachments = 'true'; q.attachment_fields = 'name,mimeType,isUpload,bytes,url,date'; }
    cards = cards.concat(vd_api_('/lists/' + idL + '/cards', { query: q }));
  });
  return cards;
}

// Validacao.gs:1936
function vd_cardsParaConferir_(ctx) {
  var ids = [ctx.listas[VD.LISTA_COTACAO], ctx.listas[VD.LISTA_FALTA]].filter(String);
  if (ids.length < 2) throw new Error('Quadro ' + ctx.board + ' sem as colunas "' + VD.LISTA_COTACAO + '" e "' + VD.LISTA_FALTA + '".');
  return vd_cardsDasListas_(ids, true);
}

// Validacao.gs:1942
function vd_listasPosCotacao_(ctx) {
  return Object.keys(ctx.listas).filter(function (n) { return VD.LISTAS_FORA.indexOf(n) < 0; }).map(function (n) { return ctx.listas[n]; });
}

// Validacao.gs:1946
function vd_marcar_(card) {
  try { cf_sincronizar_(card.id); } catch (e) {}   // campos personalizados antes de marcar (a gravação mexe na atividade)
  try {
    var atual = vd_api_('/cards/' + card.id, { query: { fields: 'dateLastActivity,idList' } });
    PropertiesService.getScriptProperties().setProperty('VD_AT_' + card.id, atual.dateLastActivity + '|' + atual.idList);
  } catch (e) {}
}

// Validacao.gs:1966
function vd_garantirLinks_(forcar) {
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO') return 0;
  var props = PropertiesService.getScriptProperties();
  var ultimo = +(props.getProperty('VD_LINKS_EM') || 0);
  // 19/10/2026: uma passada já, fora da hora, para trocar os links do TESTE (servidor.html) que o robô no servidor pôs no principal
  var corrigir = props.getProperty('VD_LINKS_V') !== '2';
  if (!forcar && !corrigir && Date.now() - ultimo < 60 * 60 * 1000) return 0;   // o formulário já anexa os links ao criar o card
  if (corrigir) props.setProperty('VD_LINKS_V', '2');
  props.setProperty('VD_LINKS_EM', String(Date.now()));
  var urlForm = vd_prop_('VD_URL_FORM', VD.URL_FORM);
  if (!urlForm) return 0;
  var cards = vd_api_('/boards/' + vd_board_() + '/cards', { query: { fields: 'name,shortLink', attachments: 'true', attachment_fields: 'name,url' } });
  var n = 0;
  cards.forEach(function (c) {
    if (/^\s*AVISO\b/i.test(c.name || '') || /NOVO PEDIDO DE PE[ÇC]A/i.test(c.name || '')) return;
    // 12/10/2026 (Weslley): card antigo também ganha os links — no celular são a única porta para o formulário, e o card só
    // passa para o fluxo novo quando alguém salva por ele (regra da virada). Os links não mudam texto, coluna nem prazo.
    var ans = c.attachments || [];
    var temEditar = false, temCompra = false;
    try {
      ans.forEach(function (a) {
        var ed = VD_LINK.RX_EDITAR.test(a.name || ''), co = VD_LINK.RX_COMPRA.test(a.name || '');
        if (!ed && !co) return;
        // nome antigo ("Editar peças (formulário)" / "Cotação / Compra (formulário)"): troca pelo nome novo
        if ((ed && a.name !== VD_LINK.EDITAR) || (co && a.name !== VD_LINK.COMPRA)) { vd_api_('/cards/' + c.id + '/attachments/' + a.id, { method: 'delete' }); return; }
        // link apontando para outro formulário (ex.: o servidor.html do TESTE num card do principal): troca pelo deste quadro
        var base = String(urlForm).replace(/[?#].*$/, '');
        if (a.url && /\/servidor\.html\?/.test(String(a.url)) && !/\/servidor\.html$/.test(base)) { vd_api_('/cards/' + c.id + '/attachments/' + a.id, { method: 'delete' }); return; }
        if (ed) temEditar = true; else temCompra = true;
      });
      if (!temEditar) { vd_api_('/cards/' + c.id + '/attachments', { method: 'post', payload: { url: urlForm + '?card=' + c.shortLink, name: VD_LINK.EDITAR, setCover: false } }); n++; }
      if (!temCompra) { vd_api_('/cards/' + c.id + '/attachments', { method: 'post', payload: { url: urlForm + '?card=' + c.shortLink + '&modo=compras', name: VD_LINK.COMPRA, setCover: false } }); n++; }
    } catch (e) {}
  });
  console.log('links do formulário incluídos: ' + n);
  return n;
}

// Validacao.gs:2038
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

// Validacao.gs:2061
function vd_fixarCardNovo_(ctx, cards, completa) {
  if (!ctx.modoAtivo) return false;
  var props = PropertiesService.getScriptProperties();
  cards = cards || [];
  if (completa) {
    var fixo = cards.filter(function (c) { return /NOVO PEDIDO DE PE[ÇC]A/i.test(c.name || ''); })[0];
    if (fixo) props.setProperty('VD_FIXO', fixo.id + '|' + fixo.idList);
  }
  var g = String(props.getProperty('VD_FIXO') || '').split('|'), idFixo = g[0], idLista = g[1];
  if (!idFixo || !idLista) return false;
  var daColuna = cards.filter(function (c) { return c.idList === idLista; });
  if (!daColuna.length || !daColuna.some(function (c) { return c.id !== idFixo; })) return false;   // nada entrou na coluna dele
  // varredura completa já traz a coluna inteira em ordem; no ciclo incremental, lê a ordem atual
  var ordem = completa ? daColuna : (vd_api_('/lists/' + idLista + '/cards', { query: { fields: 'name,pos' } }) || []);
  if (!ordem.length || ordem[0].id === idFixo) return false;
  if (!ordem.some(function (c) { return c.id === idFixo; })) return false;   // o fixo não está mais nessa coluna: a próxima varredura reaprende
  vd_api_('/cards/' + idFixo, { method: 'put', payload: { pos: 'top' } });
  return true;
}

// Validacao.gs:2081
function vd_fixarTopo_(idLista, token) {
  try {
    var g = String(PropertiesService.getScriptProperties().getProperty('VD_FIXO') || '').split('|');
    if (g[0] && g[1] === idLista) vd_api_('/cards/' + g[0], { method: 'put', payload: { pos: 'top' } }, token);
  } catch (e) { console.log('fixar topo: ' + e); }
}

// Validacao.gs:2089
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
  // 10/10/2026 (revisão): a varredura completa dependia de o acionador cair num minuto múltiplo de 30 (nem sempre cai; o tryLock
  // pula o ciclo quando o anterior ainda roda) — agora é por tempo desde a última completa
  var ultimaCompleta = +(props.getProperty('NU_COMPLETA_EM') || 0);
  var completa = !marca || !ctx.modoAtivo || Date.now() - ultimaCompleta > 30 * 60000;
  if (completa) props.setProperty('NU_COMPLETA_EM', String(Date.now()));
  var listaPos = null, listaCot = null;
  if (!completa) {
    try {
      var acts = vd_acoesQuadro_(ctx.board, { since: new Date(new Date(marca).getTime() - 5000).toISOString(), limit: 1000, fields: 'data' });
      var ids = [];
      acts.forEach(function (a) { var id = a.data && a.data.card && a.data.card.id; if (id && ids.indexOf(id) < 0 && !vd_legado_(id)) ids.push(id); });
      listaPos = []; listaCot = [];
      ids.forEach(function (id) {
        if (Date.now() > ctx.prazo) return;
        var c;
        // SEM cru: a desc precisa ser a COMPLETA (a vitrine do Trello não tem o bloco PEÇAS). Com cru (02/10 a 05/10) o robô
        // comparava a vitrine com a base e acusava "PEÇA NOVA fora do padrão" em card que só ganhou cotação (RAM9I31, TST9Z99).
        try { c = vd_api_('/cards/' + id, { query: { fields: 'name,desc,idList,shortLink,shortUrl,dateLastActivity,labels,closed', attachments: 'true', attachment_fields: 'name,mimeType,isUpload,bytes,url,date' } }); } catch (e) { return; }
        if (!c || c.closed) return;
        if (posCot.indexOf(c.idList) >= 0) listaPos.push(c);
        else if (idCot.indexOf(c.idList) >= 0) listaCot.push(c);
      });
    } catch (e) { console.log('núcleo/histórico: ' + e); completa = true; listaPos = listaCot = null; }
  }
  if (completa) { listaPos = vd_cardsDasListas_(posCot, false); listaCot = vd_cardsParaConferir_(ctx); }
  vd_marcaSet_('NU_ACT', inicio);
  try { if (vd_fixarCardNovo_(ctx, listaPos.concat(listaCot), completa)) console.log('card fixo devolvido ao topo da coluna'); } catch (e) { console.log('card fixo: ' + e); }

  // 1) colunas depois de EM COTAÇÃO: só peça nova
  listaPos.forEach(function (c) {
    if (Date.now() > ctx.prazo || !mudou(c)) return;
    if (ctx.modoAtivo) ax_padronizarCard_(c, null);   // card que mexeu: anexos já lidos ganham o nome padronizado (05/10/2026)
    if (vd_legado_(c.id)) return;   // card antigo: segue o jeito antigo
    var r = vd_conferirPosCotacao_(c, ctx);
    if (r.acao !== 'base registrada' && r.acao !== 'sem peça nova' && r.acao !== 'ignorado') { out.push(r); vd_marcar_(c); }
    else props.setProperty('VD_AT_' + c.id, c.dateLastActivity + '|' + c.idList);
  });

  // 2) EM COTAÇÃO e FALTA DADOS: conferência completa (ou só da peça nova)
  listaCot.forEach(function (c) {
    if (Date.now() > ctx.prazo) return;
    if (!mudou(c) && ctx.modoAtivo) return;
    if (ctx.modoAtivo) ax_padronizarCard_(c, null);
    if (vd_legado_(c.id)) return;   // card antigo: segue o jeito antigo
    var rc = vd_conferirCard_(c, ctx);
    out.push(rc);
    if (ctx.modoAtivo && !rc.pular) vd_marcar_(c);   // pulado (descrição em gravação): o próximo ciclo olha de novo
  });
  return out;
}

// Validacao.gs:2154
function vd_roboNoServidor_() {
  try { return ScriptApp.getScriptId() !== 'servidor-compra-peca' && vd_prop_('VD_ROBO_SERVIDOR', 'NAO') === 'SIM'; } catch (e) { return false; }
}

// Validacao.gs:2158
function validarDadosPedido() {
  if (vd_roboNoServidor_()) { try { sd_vigiaServidor_(); } catch (e) {} return; }   // Google de reserva: só vigia o servidor (Saude.gs)
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
      vd_cicloIniciar_(VD.CICLO_MS);   // prazo único do ciclo (10/10/2026)
      var cabe = function (nome, fn) { if (vd_restante_() < 30 * 1000) { SD_TEMPOS.push(nome + ' pulado (ciclo cheio)'); return; } return sd_parte_(nome, fn); };
      sd_parte_('trava de descrição', tr_executar_);   // antes de tudo: desfaz edição manual
      sd_parte_('trava de colunas', st_executar_);     // e movimento manual fora do fluxo
      sd_parte_('trava de checklist', ck_executar_);   // e checklist mexido à mão
      sd_parte_('exclusão', exc_executar_);
      if (typeof cr_executar_ === 'function') sd_parte_('correção 11/10', cr_executar_);   // uma vez só (Corretivo.gs)
      sd_parte_('faturamento', fat_executar_);           // comentário "faturado" arquiva (substitui o Butler)            // card excluído por quem não é admin volta
      var t0n = Date.now(), out = [];
      qt_parte_('núcleo');
      try { out = vd_executarNucleo_(); } finally { qt_parte_(''); }
      if (Date.now() - t0n > 1500) SD_TEMPOS.push('núcleo ' + ((Date.now() - t0n) / 1000).toFixed(1) + 's');
      cabe('complemento', cp_executar_);          // orçamento complementar anexado no card
      if (typeof cl_executar_ === 'function') cabe('cilia (API)', cl_executar_);   // PDF e peças das bases de orçamento: Cilia (API; CL_LIGADO), HDI (CLH_LIGADO) e SOMA (CLS_LIGADO) — CiliaApi.gs
      cabe('antigo de volta à cotação', mg_voltaExecutar_);
      cabe('anexos → planilha', vd_anxMigrar_);   // tira o cache de leitura de anexos das propriedades (16/10/2026)
      cabe('observação da peça na vitrine', vd_obsVitrine_);   // uma vez só, aos poucos (15/10/2026)
      if (typeof mg_corrigirBDK2J49_ === 'function') sd_parte_('correção BDK2J49', mg_corrigirBDK2J49_);   // uma vez só (Migracao.gs)   // card antigo que volta para cotação vira fluxo novo (12/10/2026)
      if (new Date().getMinutes() % 5 === 0) cabe('prazos', pz_executar_);   // baixa todos os checklists: a cada 5 min basta
      cabe('prazos por etapa', sla_executar_);
      cabe('anexos antigos (madrugada)', ax_madrugada_);   // 3h–5h59: lê e batiza anexo antigo nunca lido (13/10/2026)
      if (typeof cl_agendarTeste_ === 'function') sd_parte_('cilia (teste no TESTE)', cl_agendarTeste_);   // uma vez por versão do teste
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

// Validacao.gs:2253
function vd_instalarAcionador() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'validarDadosPedido') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('validarDadosPedido').timeBased().everyMinutes(1).create();
}

// Validacao.gs:2286
function pz_entradaColuna_(c, props) {
  var k = 'PZ_COL_' + c.id, g = String(props.getProperty(k) || '').split('|');
  if (g[0] === c.idList && g[1]) return g[1];
  var quando = '';
  try {
    var acts = vd_api_('/cards/' + c.id + '/actions', { cru: true, query: { filter: 'updateCard:idList,createCard', limit: 5, fields: 'date,data,type' } }) || [];
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i], d = a.data || {};
      if (a.type === 'createCard' || (d.listAfter && d.listAfter.id === c.idList)) { quando = a.date; break; }
    }
  } catch (e) {}
  if (!quando) quando = new Date().toISOString();
  props.setProperty(k, c.idList + '|' + quando);
  return quando;
}

// Validacao.gs:2302
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

// Validacao.gs:2314
function pz_hoje_() {
  var d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Validacao.gs:2318
function pz_diaLocal_(iso) {
  var d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Validacao.gs:2322
function pz_fmt_(iso) { return Utilities.formatDate(new Date(iso), 'America/Sao_Paulo', 'dd/MM'); }

// Validacao.gs:2331
function pz_executar_() {
  if (!vd_ligado_() || vd_modo_() !== 'ATIVO') return;
  var board = vd_board_();
  var props = PropertiesService.getScriptProperties();
  var fim = vd_prazo_(PZ.LIMITE_MS);
  var listas = vd_listas_(board);
  var fora = PZ.LISTAS_FORA.map(function (n) { return listas[n]; }).filter(String);
  var concluidas = PZ.LISTAS_CONCLUIDAS.map(function (n) { return listas[vd_nomeColuna_(n)] || listas[n]; }).filter(String);
  var idChegar = listas['FALTA CHEGAR'] || '';
  var idAtrasado = null;
  var cards = vd_api_('/boards/' + board + '/cards', { query: {
    fields: 'name,idList,idLabels,due,dueComplete,dateLastActivity,shortLink',
    checklists: 'all', checklist_fields: 'name', checkItem_fields: 'state,due,name'
  } });
  var hoje = pz_hoje_();
  var n = 0;
  cards.forEach(function (c) {
    if (Date.now() > fim) return;
    if (fora.indexOf(c.idList) >= 0) return;
    if (vdf_cardProtegido_(c.name || '')) return;
    // card legado também ganha prazo pelas peças (07/10/2026, ESR9A30): a regra só olha os checklists
    var chave = 'PZ_AT_' + c.id;
    var marca = c.dateLastActivity + '|' + c.idList, antes = String(props.getProperty(chave) || '');
    if (antes === marca) return;
    var trocouColuna = !!antes && antes.split('|')[1] !== c.idList, concluida = concluidas.indexOf(c.idList) >= 0;   // 1ª passada não mexe em prazo já posto à mão

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
    // 09/10/2026 (TBU8D71): "todas recebidas -> a maior de todas" só vale em coluna concluída; card que voltou ao fluxo com peça
    // nova (sem item no checklist ainda) não pode herdar a previsão velha — cai na regra de entrada na coluna + N d.u.
    (pend.length ? pend : (concluida ? todos : [])).forEach(function (it) { var t = new Date(it.due).getTime(); if (melhor === null || t > melhor) melhor = t; });
    var mudou = false, atual = c.due ? new Date(c.due).getTime() : 0, upd = {};
    if (melhor !== null) {
      // prazo do card = maior previsão entre as peças pendentes (todas recebidas: a maior de todas)
      if (Math.abs(atual - melhor) > 43200000) upd.due = new Date(melhor).toISOString();
    } else if (!c.due || trocouColuna || !concluida) {
      // sem previsão de peça: N dias úteis a partir da entrada na coluna (07/10/2026)
      var entrada = pz_entradaColuna_(c, props), alvo = new Date(du_somarUteis_(PZ.DIAS_SEM_PREVISAO, entrada)).getTime();
      // sem troca de coluna, só mexe quando o prazo atual é anterior à entrada na coluna (prazo velho de card que voltou)
      var velho = !!c.due && atual < new Date(entrada).getTime();
      if ((!c.due || trocouColuna || velho) && Math.abs(atual - alvo) > 43200000) upd.due = new Date(alvo).toISOString();
    }
    // concluído = card em ENCERRADO/ENTREGUES/PENDÊNCIA; volta para trás = desconcluído
    if ((c.due || upd.due) && !!c.dueComplete !== concluida) upd.dueComplete = concluida;
    if (Object.keys(upd).length) {
      if (upd.due && upd.dueComplete === undefined) upd.dueComplete = concluida;
      vd_api_('/cards/' + c.id, { method: 'put', payload: upd });
      mudou = true;
    }
    // FALTA CHEGAR sem previsão de peça e prazo (entrada + 2 d.u.) vencido: avisa uma vez por prazo (07/10/2026)
    var dueAgora = upd.due || c.due || '';
    if (melhor === null && c.idList === idChegar && dueAgora && pz_diaLocal_(dueAgora) < hoje && !concluida) {
      var kAviso = 'PZ_SEMPREV_' + c.id;
      if (props.getProperty(kAviso) !== dueAgora) {
        var semDataFo = [], semDataPg = [];
        (c.checklists || []).forEach(function (ck) {
          var nomeCk = String(ck.name || '').trim();
          (ck.checkItems || []).forEach(function (it) { if (it.state === 'complete' || it.due) return; (/FORNECIMENTO/i.test(nomeCk) ? semDataFo : (/^PAGAS/i.test(nomeCk) ? semDataPg : [])).push(it.name.split(/\s+[-—]\s+/)[0]); });
        });
        if ((semDataFo.length || semDataPg.length) && !pz_jaAvisouHoje_(c.id)) {
          vd_comentar_(c, '⏰ Prazo do card vencido sem previsão de peça — ' + [semDataFo.length ? 'verificar prazo do item ' + semDataFo.join('; ') : '', semDataPg.length ? 'verificar compra do item ' + semDataPg.join('; ') : ''].filter(String).join(' · ') + '.');
          mudou = true;
        }
        props.setProperty(kAviso, dueAgora);
      }
    }
    // etiqueta ATRASADO
    if (vencidosFO.length || (c.idLabels || []).length) {
      if (idAtrasado === null) idAtrasado = pz_labelId_(board, PZ.LBL_ATRASADO, PZ.COR_ATRASADO);
      var tem = (c.idLabels || []).indexOf(idAtrasado) >= 0;
      if (vencidosFO.length && !tem) {
        vd_api_('/cards/' + c.id + '/idLabels', { method: 'post', payload: { value: idAtrasado } });
        // 10/10/2026: comenta só o item + previsão ainda não avisado (etiqueta tirada e posta de novo não repete o aviso)
        var kFo = 'PZ_FOAV_' + c.id, jaAv = []; try { jaAv = JSON.parse(props.getProperty(kFo) || '[]'); } catch (e) {}
        var novosFO = vencidosFO.filter(function (it) { return jaAv.indexOf(it.id + '|' + String(it.due).slice(0, 10)) < 0; });
        if (novosFO.length && !pz_jaAvisouHoje_(c.id)) {
          vd_comentar_(c, '⏰ Fornecimento atrasado — verificar prazo do item ' +
            novosFO.map(function (it) { return it.name + ' (previsão ' + pz_fmt_(it.due) + ')'; }).join(', ') + '.');
          try { props.setProperty(kFo, JSON.stringify(jaAv.concat(novosFO.map(function (it) { return it.id + '|' + String(it.due).slice(0, 10); })).slice(-40))); } catch (e) {}
        }
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

// Validacao.gs:2453
function rel_unidade_(card) {
  // 19/10/2026: card aberto pela Rotina tem o campo Unidade mas não a etiqueta — valia "SEM UNIDADE"
  try {
    var cf = card && card.customFieldItems ? cf_unidadeDoCard_(card) : '';
    var mapa = { TOLEDO: 'TOLEDO', RONDON: 'MARECHAL RONDON', CASCAVEL: 'CASCAVEL', 'MOURÃO': 'CAMPO MOURÃO' };
    if (cf && mapa[cf]) return mapa[cf];
  } catch (e) {}
  var nomes = (card.labels || []).map(function (l) { return l.name || ''; }).join(' ');
  for (var i = 0; i < REL.UNIDADES.length; i++) if (REL.UNIDADES[i][1].test(nomes)) return REL.UNIDADES[i][0];
  return 'SEM UNIDADE';
}

// Validacao.gs:2464
function rel_dias_(ms) { return Math.floor((Date.now() - ms) / 864e5); }

// Validacao.gs:2465
function rel_criacaoId_(id) { return 1000 * parseInt(String(id).substring(0, 8), 16); }

// Validacao.gs:2466
function rel_esc_(s) { return String(s || '').replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

// Validacao.gs:2469
function rel_coletar_() {
  var board = vd_prop_('REL_BOARD', vd_board_());
  var listas = vd_listas_(board);
  var nomeLista = {}; Object.keys(listas).forEach(function (n) { nomeLista[listas[n]] = n; });
  var cards = vd_api_('/boards/' + board + '/cards', { query: {
    fields: 'name,idList,labels,due,dateLastActivity,shortUrl', customFieldItems: 'true',
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
    if (lista === REL.LISTA_ENTREGUES && diasParado >= REL.DIAS_ENTREGUES && !fat_semCobranca_(c.labels)) add(c, 'entregues', 'há ' + diasParado + ' dia(s) sem faturar');
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

// Validacao.gs:2508
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

// Validacao.gs:2529
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

// Validacao.gs:2548
function relatorioDiario() {
  if (vd_roboNoServidor_()) return;
  if (typeof comAlarme_ === 'function') return comAlarme_('relatório diário', rel_enviar_);
  return rel_enviar_();
}

// Validacao.gs:2554
function rel_instalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'relatorioDiario') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('relatorioDiario').timeBased().everyDays(1).atHour(7).nearMinute(15).create();
}

// Validacao.gs:2560
function rel_instalarSeFaltar_() {
  var pp = PropertiesService.getScriptProperties();
  if (pp.getProperty('REL_INSTALADO') === 'SIM') return;
  rel_instalar();
  pp.setProperty('REL_INSTALADO', 'SIM');
  rel_enviar_();
}

// Validacao.gs:2583
function vd_vitrineLigada_() { return vd_prop_('VD_VITRINE', 'SIM') !== 'NAO'; }

// Validacao.gs:2587
function vd_ehVitrineSemCompleta_(desc) {
  var d = String(desc || '');
  return /(^|\n)\d+\.\s+\*\*[^*\n]+\*\*/.test(d) && !/(^|\n)\s*\**\s*PE[ÇC]AS\s*\**\s*:/i.test(d);
}

// Validacao.gs:2592
function vd_completa_(cardId, vitrine) {
  if (!cardId) return '';
  if (VD_CMP_MEM && Object.prototype.hasOwnProperty.call(VD_CMP_MEM, cardId)) return VD_CMP_MEM[cardId];
  // 09/10/2026 (TBU8D71): o cache guarda também o hash da vitrine a que a completa corresponde. Se a vitrine que veio do
  // Trello é outra (o card mudou depois — cotação lançada pelo Apps Script enquanto o servidor próprio guardava a cópia
  // antiga por até 6 h), o cache não vale e a completa é relida da planilha.
  var hv = vitrine != null ? tr_hash_(vitrine) : '';
  var cache = CacheService.getScriptCache(), k = 'vd_cmp_' + cardId, v = cache.get(k);
  if (v !== null) {
    var m = v.match(/^#([^|\n]*)\|([\s\S]*)$/);
    if (m && (!hv || m[1] === hv)) return m[2];
    if (!m && !hv) return v.slice(1);   // formato antigo (sem hash)
  }
  var txt = '', h = '';
  try {
    var sh = tr_aba_();
    // 17/10/2026 (teste das cópias): card com duas linhas na TRAVA (robô e formulário gravando ao mesmo tempo) — vale a linha
    // cuja assinatura é a da vitrine atual; senão a primeira com descrição completa (linha só de assinatura não tem)
    var cels = sh.getRange('A:A').createTextFinder(cardId).matchEntireCell(true).findAll() || [];
    for (var ic = 0; ic < cels.length; ic++) {
      var lin = sh.getRange(cels[ic].getRow(), 1, 1, 5).getValues()[0], h1 = String(lin[1] || ''), t1 = String(lin[4] || '');
      if (hv && h1 === hv && t1) { h = h1; txt = t1; break; }
      if (!txt && t1) { h = h1; txt = t1; }
    }
  } catch (e) { console.log('vitrine/ler: ' + e); }
  try { if (txt.length < 90000) cache.put(k, '#' + h + '|' + txt, 21600); } catch (e) {}
  return txt;
}

// Validacao.gs:2622
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

// Validacao.gs:2636
function vd_trocarPelaCompleta_(r) {
  if (!r) return r;
  if (Array.isArray(r)) {
    if (!r.some(function (c) { return c && typeof c.desc === 'string' && c.id; })) return r;
    var mapa = vd_completasTodas_();
    r.forEach(function (c) { if (c && c.id && typeof c.desc === 'string' && mapa[c.id]) c.desc = mapa[c.id]; });
    return r;
  }
  if (r.id && typeof r.desc === 'string') { var t = vd_completa_(r.id, r.desc); if (t) r.desc = t; }
  return r;
}

// Validacao.gs:2648
function vd_tit_(s) { s = String(s || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }

// Validacao.gs:2649
function vd_md_(s) { return String(s || '').replace(/([\\`*_\[\]#>|~])/g, '\\$1'); }

// Validacao.gs:2655
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
  l1.push(vd_rotuloSeguradora_(d.tipo, U(d.seguradora)));
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
  // link do anúncio informado na cotação (Mercado Livre etc.); antes dele, a obs. do comprador nesta cotação (26/10/2026)
  var linkTxt = function (q) { return (q && q.kit ? ' · 🧩 kit ' + vd_valorBR_(q.kit.total) + ' (' + q.kit.n + ' peças)' : '') + (q && q.nota ? ' · 📝 ' + vd_md_(q.nota) : '') + (q && q.link ? ' · [🔗 anúncio](' + q.link + ')' : ''); };
  var fornTxt = function (f) { return String(f || '').replace(/[\s\-–:]+$/, ''); };
  var tipoTxt = function (q) { return [q.tipo ? vd_tit_(q.tipo) : '', q.marca || ''].filter(String).join(' '); };
  // economia da cotação sobre o valor líquido do orçamento (faixas do Weslley, 05/10/2026): 🟢 > 30% · 🟡 20–30% · 🔴 < 20% ou mais caro
  var ecoTxt = function (p, q) {
    var e = q && q.valor != null ? vd_economiaOrc_(p.valorOrc, q.valor) : null;
    if (!e) return '';
    return ' · ' + (e.nivel === 'bom' ? '🟢' : (e.nivel === 'medio' ? '🟡' : '🔴')) + ' ' + (e.pct >= 0 ? '−' : '+') + Math.abs(e.pct).toFixed(0) + '%';
  };

  L.push('');
  // 23/10/2026: orçamento só de mão de obra — card só para registro e faturamento (nasce em ENCERRADO)
  if (!an.pecas.length && !(an.naoComprar || []).length && vd_soMaoDeObra_(desc)) L.push('🔧 **SÓ MÃO DE OBRA** — orçamento sem peça de troca nem fornecimento: card para registro e faturamento.');
  else if (!an.pecas.length) L.push((an.naoComprar || []).length ? '_Nenhuma peça para comprar pela oficina._' : '_Sem peças pela oficina._');
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
    var cab = (i + 1) + '. **' + vd_md_(titulo) + '**' + (!p.pneu && p.codigo ? ' · ' + vd_md_(p.codigo) : '') + (p.qtd && +p.qtd > 1 ? ' · QTD ' + p.qtd : '') + (p.particular && d.tipo !== 'PARTICULAR' && !misto ? ' · 👤 PARTICULAR' : '') + (p.complemento && !p.particular ? ' · ➕ complemento' + (p.compData ? ' ' + p.compData : '') + vd_complTxt_(p) : '')
      + (vd_valorOrcTxt_(p.valorOrc) ? ' · 📄 orç. ' + vd_valorOrcTxt_(p.valorOrc) : '') + (p.foto ? ' · 📷 foto' : '');
    var sub = [];
    // 15/10/2026 (Weslley, BET7D44): observação escrita na peça no pedido ("Separado do estoque") aparece na descrição —
    // antes ficava só na descrição completa guardada e não se via no card
    var obsPeca = String(p.obs || '').replace(/\s*\n\s*/g, ' ').trim();
    if (obsPeca) sub.push('📝 ' + vd_md_(obsPeca));
    // compra: checklist PAGAS ou linha COMPRADO
    var pg = (pagas || []).filter(function (it) { return k && vd_semAcento_(it.name).indexOf(k) >= 0; }).pop();
    var cp = pg ? null : compras.filter(function (c) {
      var ck = vd_semAcento_((c.codigo || '').replace(/\s+/g, '') || c.descricao);
      return ck && (ck === k || (p.codigo && vd_semAcento_(c.codigo) === vd_semAcento_(p.codigo)) || (!p.codigo && vd_semAcento_(c.descricao).indexOf(vd_semAcento_(p.descricao)) >= 0));
    }).pop();
    var aut = auts.filter(function (a) { return a.chave === k; })[0];
    var minhas = cot.cotacoes.filter(function (q) { return q.chave === k; }).sort(function (a, b) { return a.valor - b.valor; });
    if (pg) {
      var mk = rc_marcas_(pg.name), partes = mk.base.split(/\s+-\s+/);   // marcas 📍 local / ✋ retirada ficam fora das partes (10/10/2026)
      var forn = partes.length >= 3 ? partes[partes.length - 2] : (partes[1] || '');
      var fS = vd_semAcento_(forn);
      if (/R\$/.test(forn) || (k && fS.indexOf(k) >= 0) || (p.descricao && fS.indexOf(vd_semAcento_(p.descricao)) >= 0)) forn = '';
      var val = (partes[partes.length - 1] || '').match(/R\$\s*[\d.,]+/);
      sub.push('🛒 ' + vd_md_([forn, val ? val[0] : '', pg.due ? 'previsão ' + vd_dataCurta_(pg.due) : ''].filter(String).join(' · ')) + (pg.state === 'complete' ? ' ✔' : '')
        + (mk.local ? ' · 📍 ' + vd_md_(mk.local) : '') + (mk.retirada ? ' · ✋ ' + vd_md_(mk.retirada) : ''));
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
      if (obsPeca) vistos[obsPeca] = 1;
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
  // (10/10/2026: com grupos seguradora/particular, título próprio — antes pareciam peças particulares)
  if (misto && (an.naoComprar || []).length) L.push('\n**🚫 NÃO COMPRAR**');
  (an.naoComprar || []).forEach(function (p, j) {
    var tit = p.pneu ? 'PNEU ' + String(p.medida || '').replace(/\s+/g, '') + ((p.marca || p.categoria) ? ' ' + (p.marca || p.categoria) : '') : String(p.descricao || '').toUpperCase();
    L.push((an.pecas.length + j + 1) + '. ~~' + vd_md_(tit) + '~~' + (!p.pneu && p.codigo ? ' · ' + vd_md_(p.codigo) : '') + ' · 🚫 não comprar' + (p.naoMotivo ? ' — _' + vd_md_(p.naoMotivo) + '_' : ''));
    if (String(p.obs || '').trim()) L.push('    - 📝 ' + vd_md_(String(p.obs).replace(/\s*\n\s*/g, ' ').trim()));
  });

  var mFo = bloco.match(/FORNECIMENTO \(SEGURADORA\)\s*:?\s*(\d+)/i);
  if (mFo) L.push('', '📦 Fornecimento da seguradora: ' + mFo[1] + ' peça(s) — checklist FORNECIMENTO');
  var mFoC = bloco.match(/FORNECIMENTO COMPLEMENTO\s*:?\s*(\d+)/i);
  if (mFoC) { var lc = '📦➕ Complemento da seguradora: ' + mFoC[1] + ' peça(s) — checklist FORNECIMENTO COMPLEMENTO'; if (mFo) L.push(lc); else L.push('', lc); }

  // legenda: só dos ícones que aparecem neste card
  var txt = L.join('\n');
  var leg = [['👤', 'peça particular (cliente paga — autoriza o consultor)'], ['➕', 'peça de orçamento complementar'], ['✅', 'autorizada'], ['🛒', 'comprada (✔ marcada no PAGAS)'], ['⏳', 'aguardando cotação'], ['⛔', 'não cotada'], ['🚫', 'não comprar (decisão do consultor)'], ['📝', 'observação'], ['📷', 'foto da peça anexada no card'], ['↩️', 'devolvida para cotação'], ['📦', 'peças da seguradora'], ['📄', 'valor líquido da peça no orçamento da seguradora'], ['📍', 'onde a peça está guardada'], ['✋', 'quem retirou a peça e quando'], ['🟢', 'economia sobre o orçamento: 🟢 acima de 30% · 🟡 20–30% · 🔴 abaixo de 20% ou mais caro']]
    .filter(function (x) { return txt.indexOf(x[0]) >= 0 || (x[0] === '🟢' && /🟡|🔴/.test(txt)); }).map(function (x) { return x[0] + ' ' + x[1]; });
  if (an.pecas.length) leg.push('linhas sem ícone = cotações, da mais barata para a mais cara');
  if (leg.length) txt += '\n\n_' + leg.join(' · ') + ' · histórico nos comentários_';
  return txt;
}

// Validacao.gs:2791
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

// Validacao.gs:2809
function vd_obsVitrine_() {
  var props = PropertiesService.getScriptProperties(), st = props.getProperty('VD_OBSVIT') || '2';
  if (st === 'FEITO' || !vd_ligado_() || vd_modo_() !== 'ATIVO' || !vd_vitrineLigada_()) return 0;
  var sh = tr_aba_(), n = sh.getLastRow(), lin = Math.max(2, parseInt(st, 10) || 2), feitos = 0;
  if (lin > n) { props.setProperty('VD_OBSVIT', 'FEITO'); return 0; }
  var fim = Math.min(n, lin + 399), vals = sh.getRange(lin, 1, fim - lin + 1, 5).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (feitos >= 15 || vd_restante_() < 40 * 1000) { props.setProperty('VD_OBSVIT', String(lin + i)); return feitos; }
    var id = String(vals[i][0] || ''), cmp = String(vals[i][4] || '');
    if (!id || !/\|\s*OBS\s*:/i.test(cmp)) continue;
    var temObs = false;
    try { temObs = vd_linhasPecas_(vd_dividir_(cmp).bloco).linhas.some(function (l) { return /\|\s*OBS\s*:/i.test(l); }); } catch (e) {}
    if (!temObs) continue;
    try { vd_gravarDesc_(id, cmp); feitos++; } catch (e) { console.log('obsVitrine ' + id + ': ' + e); }
  }
  props.setProperty('VD_OBSVIT', fim >= n ? 'FEITO' : String(fim + 1));
  if (feitos) console.log('obsVitrine: ' + feitos + ' vitrine(s) regravada(s)');
  return feitos;
}
