/* ======================= BASE DA API DO CILIA → ROBÔ DO TRELLO (15/10/2026) =======================
 * Weslley (13/10/2026, "pode montar quando der"): a base diária da API oficial do Cilia alimenta o robô e anexa nos cards
 * o PDF da versão atual; o portal do Cilia fica só para o Status do Pedido (fornecedor/previsão das peças FO).
 *
 * De onde vem: o PC do Weslley roda todo dia às 00:15 a rodada da API (cilia/pc, uma listagem por casa + detalhe só do que
 * mudou, só autorizado/supervisão) e grava na pasta do Drive dele "Rotina Unity/Orçamentos/Cilia" (desde 15/10/2026; a pasta
 * Orçamentos é a antiga "Rotina Unity/Cilia" renomeada, compartilhada com sistema@):
 *   CILIA-HOJE.json   — retrato de todos os orçamentos das 4 casas, com as PEÇAS oficiais da versão baixada
 *                       (código, nome, quem fornece, troca, quantidade, valor unitário líquido);
 *   PDF/<casa>/<PLACA> - <SEGURADORA> - Cilia <nº.versão>.pdf — o PDF oficial dessa versão.
 *
 * O que este módulo faz, para cada versão autorizada/supervisão baixada (uma vez por versão):
 *  1) acha o card aberto da placa (título começa com a placa; card de RETORNO, AVISO e o card fixo ficam de fora; mais de um
 *     card = decide pelo nº do sinistro na descrição e, depois, pela seguradora no fim do título (16/10/2026); sem como
 *     decidir = não anexa, registra e tenta de novo por até 3 dias);
 *  2) anexa o PDF oficial ("Cilia - Orçamento <nº.versão> - <PLACA>.pdf") — sem repetir: não anexa se o card já tem esse
 *     nº de versão no nome de um anexo, nem se já tem orçamento anexado depois da autorização dessa versão (a rotina antiga);
 *  3) as peças do anexo vêm da API, não do OCR do PDF: ficam em CL_PEC_<anexo> e a leitura do anexo (vd_lerAnexoTrello_)
 *     usa essas peças (o OCR só completa chassi, cor e a dica de tipo pelo código);
 *  4) card que já tem a lista de peças: complemento pelo caminho de sempre (cp_doAnexo_ — mesmas regras: sinistro HDI e
 *     card de RETORNO não importam; peça nova da oficina com "| COMPLEMENTO dd/mm", FO nova no FORNECIMENTO COMPLEMENTO);
 *     card sem lista (esperando o orçamento): o ciclo normal importa ao ler o anexo (com as peças da API);
 *  5) card em ESPERA/NÃO AUTORIZADO: anexa e comenta para quem criou o card verificar se a cotação deve seguir — o robô
 *     não move (regra de 05/10/2026); card antigo (de antes da virada): só anexa.
 * Registro de tudo na aba "CILIA API" da planilha do robô.
 *
 * Liga no quadro do robô com a propriedade CL_LIGADO=SIM (padrão: NAO). Teste no quadro TESTE: cl_testeTESTE roda uma vez
 * a cada CL.TESTE_V novo (gatilho único criado pelo ciclo), sempre no TESTE e sem notificar ninguém.
 *
 * HDI e SOMA (15/10/2026 — Weslley: "a rotina de orçamentos também contempla orçamentos fora do Cilia, que são HDI e SOMA,
 * pra fazermos daí em uma etapa apenas os anexos e lançamentos"): sem API oficial, a rotina da madrugada lê o orçamento no
 * portal (HDI Prestador / Websoma) e grava no Drive, NO MESMO FORMATO do CILIA-HOJE.json. Pastas (Weslley 15/10: "colocar
 * Cilia dentro da mesma pasta, vamos organizar melhor"): Rotina Unity/Orçamentos (a antiga "Cilia" renomeada, compartilhada
 * com sistema@) com as subpastas
 *   Cilia/ CILIA-HOJE.json + PDF/<casa>/…                            (rodada da API às 00:15)
 *   HDI/   HDI-HOJE.json  + PDF/<casa>/<PLACA> - HDI - laudo <v>.pdf  (portais/pc/hdi-base.mjs traduz o HTML do portal)
 *   SOMA/  SOMA-HOJE.json + PDF/<casa>/…                             (em preparação)
 * Este módulo trata as três bases do mesmo jeito (CL_BASES): mesma fila, mesmas regras, mesmo registro. Cada base liga
 * sozinha: CL_LIGADO (Cilia), CLH_LIGADO (HDI), CLS_LIGADO (SOMA) — Cilia e HDI ligadas no principal (HDI desde 15/10/2026 17h57,
 * OK do Weslley; vale o laudo que mudar dali em diante); SOMA desligada.
 */
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
/** Bases de orçamento que o robô lê — mesmo formato (CILIA-HOJE.json); pref = prefixo das propriedades de cada uma. */
var CL_BASES = [
  { id: 'CILIA', rot: 'Cilia', arquivo: 'CILIA-HOJE.json', pasta: 'Cilia', pref: 'CL_', padrao: CL.LIGADO_PADRAO, org: 'CILIA', fonte: 'pela API do Cilia', obrigatoria: true },
  { id: 'HDI', rot: 'HDI', arquivo: 'HDI-HOJE.json', pasta: 'HDI', pref: 'CLH_', padrao: 'SIM', org: 'HDI', fonte: 'pelo portal HDI' },   // LIGADA no principal: OK do Weslley 15/10 17h57 ("1 liga"); CLH_LIGADO=NAO desliga
  { id: 'SOMA', rot: 'SOMA', arquivo: 'SOMA-HOJE.json', pasta: 'SOMA', pref: 'CLS_', padrao: 'NAO', org: 'WEBSOMA', fonte: 'pelo Websoma' }
];
var CL_MEM = { pastas: {}, cards: null, json: {}, arq: {}, ctx: null };

function cl_base_(id) { for (var i = 0; i < CL_BASES.length; i++) if (CL_BASES[i].id === id) return CL_BASES[i]; return CL_BASES[0]; }
function cl_ligado_() { return vd_prop_('CL_LIGADO', CL.LIGADO_PADRAO) === 'SIM'; }
function cl_ligadoBase_(B) { B = typeof B === 'string' ? cl_base_(B) : (B || CL_BASES[0]); return vd_prop_(B.pref + 'LIGADO', B.padrao) === 'SIM'; }
/** Chave de uma versão tratada. Cilia: casa|orçamento|versão; HDI: a chave_versao muda também quando a HDI fecha as peças. */
function cl_chave_(casa, o) { return casa + '|' + o.budget_id + '|' + (o.chave_versao || o.versao_baixada || o.numero_versao || ''); }
/** Versão como aparece no nome e no registro: Cilia "1993730.2"; HDI "laudo 1.0"; SOMA o nº do orçamento. */
function cl_rotVersao_(B, nv) { return B.id === 'HDI' ? 'laudo ' + nv : String(nv); }
function cl_nomeAnexo_(B, nv, placa) {
  if (B.id === 'HDI') return 'HDI - Orçamento laudo ' + nv + ' - ' + placa + '.pdf';
  if (B.id === 'SOMA') return 'SOMA - Orçamento ' + nv + ' - ' + placa + '.pdf';
  return 'Cilia - Orçamento ' + nv + ' - ' + placa + '.pdf';
}
/** Anexo que já é esta versão: Cilia pelo nº (como antes); HDI por "laudo 1.0"/"laudo1.0" (nome da rotina e do robô). */
function cl_ehEstaVersao_(B, nv, nome) {
  var e = String(nv).replace(/\./g, '\\.');
  if (B.id === 'HDI') return new RegExp('laudo\\s*_?' + e + '(?![0-9])', 'i').test(nome);
  var re = new RegExp('(^|[^0-9.])' + e + '($|[^0-9])');
  return B.id === 'SOMA' ? /SOMA/i.test(nome) && re.test(nome) : re.test(nome);
}
function cl_quadroRot_(board) { return board === CL.QUADRO_TESTE ? 'TESTE' : 'principal'; }

/* ---------- arquivo do Drive (um por base) ---------- */
/** Arquivo da base. Cilia: obrigatório (erro se sumir). HDI/SOMA: null enquanto a base não existe ou a pasta não está
 *  compartilhada com a conta do robô — procura de novo no máximo a cada 6 h (forcar = procura já). */
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
function cl_json_(B) {
  B = B || CL_BASES[0];
  if (CL_MEM.json[B.id]) return CL_MEM.json[B.id];
  return (CL_MEM.json[B.id] = JSON.parse(cl_arquivo_(B).getBlob().getDataAsString('UTF-8')));
}
/** PDF da versão: caminho relativo à pasta da base ("PDF/Toledo/RHR9A41 - … - Cilia 1993730.2.pdf", "PDF/HDI/Cascavel/…"). */
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

/* ---------- peças da API no formato do leitor de orçamento (vd_lerOrcamento_) ---------- */
/** pecas = [{codigo, nome, fornece: OFICINA|SEGURADORA, troca, cobertura, qtd, valor_unit}] -> {oficina, fo}.
 *  Só peça de TROCA (reparo, pintura e R&I não se compram); serviço e código interno do Cilia (000000x) como no PDF. */
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
/** Seguradora no rótulo do robô ("Bradesco Seguros" -> BRADESCO); '' se não é uma das conhecidas. */
function cl_seguradora_(nome) {
  var U = vd_normTexto_(nome);
  for (var s = 0; s < VD_SEGURADORAS.length; s++) { if (new RegExp('\\b' + VD_SEGURADORAS[s][0] + '\\b').test(U) || VD_SEGURADORAS[s][1].test(U)) return VD_SEGURADORAS[s][0]; }
  return '';
}

/* ---------- peças da API guardadas por anexo (lidas por vd_lerAnexoTrello_) ---------- */
function cl_guardarPecas_(idAnexo, o, B) {
  B = B || CL_BASES[0];
  var orc = cl_pecasParaOrc_(o.pecas);
  var js = JSON.stringify({ v: 1, nv: cl_rotVersao_(B, o.versao_baixada || o.numero_versao || ''), org: B.org, placa: o.placa || '', seg: cl_seguradora_(o.seguradora), si: o.sinistro || '',
    o: vd_orcCompacto_(orc.oficina), f: vd_orcCompacto_(orc.fo), em: Date.now() });
  if (js.length > 8500) return false;   // orçamento enorme: fica a leitura do PDF (OCR), como antes
  PropertiesService.getScriptProperties().setProperty('CL_PEC_' + idAnexo, js);
  return true;
}
function cl_pecasDoAnexo_(idAnexo) {
  try { var v = PropertiesService.getScriptProperties().getProperty('CL_PEC_' + idAnexo); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
/** Junta a leitura do PDF (OCR) com as peças oficiais da API: as peças são as da API; do OCR fica a dica de tipo (pelo código),
 *  e seguradora/sinistro/placa quando o OCR não achou. r = retorno de vd_extrair_ (placas etc.), orc = vd_lerOrcamento_. */
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

/* ---------- cards do quadro ---------- */
function cl_cards_(board) {
  if (CL_MEM.cards && CL_MEM.cards.board === board) return CL_MEM.cards.lista;
  var lista = vd_api_('/boards/' + board + '/cards/open', { query: { fields: 'name,idList,shortLink,shortUrl,desc' } }) || [];
  CL_MEM.cards = { board: board, lista: lista };
  return lista;
}
function cl_ehRetorno_(c) { return /\bRETORNO\b/i.test(c.name || '') || /\bRETORNO\b/.test(vd_semAcento_(String(c.desc || '').slice(0, 600))); }
/** Card aberto da placa: {card} | {nenhum:true} | {varios:[nomes]}. Entre vários decide o sinistro na descrição e, depois,
 *  a seguradora no fim do título — só quando um único card bate. */
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

/* ---------- registro ---------- */
function cl_log_(linhas) {
  if (!linhas.length) return;
  try {
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('VD_PLANILHA_BACKUP') || vd_planilhaBackup_().getParent().getId());
    var sh = ss.getSheetByName(CL.ABA_LOG);
    if (!sh) { sh = ss.insertSheet(CL.ABA_LOG); sh.appendRow(['Quando', 'Quadro', 'Casa', 'Placa', 'Versão', 'Conclusão', 'Card', 'O que o robô fez', 'Detalhe']); sh.setFrozenRows(1); }
    sh.getRange(sh.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
  } catch (e) { console.log('cilia/log: ' + e); }
}
function cl_dataBr_(iso) { var d = new Date(iso || ''); return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM'); }

/* ---------- ciclo ---------- */
/**
 * opt.quadro: quadro alvo (padrão: o do robô); opt.teste: escolhe sozinho até CL.MAX_TESTE placas que têm card no quadro;
 * opt.bases: só estas bases (ids). Cada base ligada é tratada na sua vez, com o mesmo prazo do ciclo.
 * Devolve quantas versões foram anexadas.
 */
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

/** Uma versão no card: anexa (se ainda não tem) e leva as peças ao card. Devolve {acao, det, anexou}. */
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
  try { var pp = PropertiesService.getScriptProperties(); if (pp.getProperty('VD_ANX3_' + at.id)) pp.deleteProperty('CL_PEC_' + at.id); } catch (e) {}
  if (res === true) return { acao: 'anexei e importei o complemento', det: lista, anexou: true, card: card };
  if (res === 'erro') return { acao: 'anexei; leitura falhou (o ciclo tenta de novo)', det: lista, anexou: true, card: card };
  // nada novo: avisa que a versão chegou (PDF do Cilia em sinistro HDI e card de RETORNO o próprio cp_doAnexo_ já comentou)
  var seg = vd_semAcento_(((an.dados && an.dados.seguradora) || '') + ' ' + (card.name || ''));
  var hdiNoCilia = B.id === 'CILIA' && /\bHDI\b/.test(seg);
  if (!hdiNoCilia && !silencio) vd_comentar_(card, cabeca + ' Nenhuma peça nova em relação ao que o card já tem.');
  return { acao: hdiNoCilia ? 'anexei; sinistro HDI: peças pelo laudo da HDI' : 'anexei; sem peça nova', det: lista, anexou: true, card: card };
}

/** CL_PEC_ com mais de 3 dias (card antigo, em ESPERA ou sem lista que ninguém leu): sai das propriedades (limite de 500 KB). */
function cl_limparPecas_() {
  try {
    var props = PropertiesService.getScriptProperties(), tudo = props.getProperties(), lim = Date.now() - 3 * 864e5;
    Object.keys(tudo).forEach(function (k) {
      if (k.indexOf('CL_PEC_') !== 0) return;
      try { if ((JSON.parse(tudo[k]).em || 0) < lim) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
    });
  } catch (e) {}
}

/* ---------- teste no quadro TESTE (uma vez por CL.TESTE_V) ---------- */
/** Agenda o teste da versão nova quando as bases dele estão acessíveis (pasta compartilhada com a conta do robô);
 *  senão tenta de novo a cada hora. */
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
/** Roda no quadro TESTE (nunca no principal), com as menções desligadas; resultado na aba "CILIA API".
 *  Não segura a trava do robô (o ciclo do principal segue rodando a cada minuto); no máximo 3 min e CL.MAX_TESTE versões. */
function cl_testeTESTE() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'cl_testeTESTE') { try { ScriptApp.deleteTrigger(t); } catch (e) {} } });
  if (typeof qt_pausada_ === 'function' && qt_pausada_()) { ScriptApp.newTrigger('cl_testeTESTE').timeBased().after(30 * 60 * 1000).create(); return; }
  VD_BOARD_FORCA = CL.QUADRO_TESTE; VD_SEM_MENCOES = true;
  try {
    vd_cicloIniciar_(3 * 60 * 1000 + 15 * 1000);
    var n = cl_executar_({ quadro: CL.QUADRO_TESTE, teste: true, bases: CL.TESTE_BASES });
    console.log('cilia/teste: ' + n + ' anexo(s) no TESTE');
    // 15/10: o fim do teste também vai para a aba (sem placa da base com card aberto no TESTE, antes não ficava nada registrado)
    cl_log_([[new Date(), 'TESTE', '', '', '', '', '', 'fim do teste ' + (CL.TESTE_BASES || []).join('/') + ' (versão ' + CL.TESTE_V + ')', n + ' anexo(s) no TESTE' + (n ? '' : ' — nenhuma versão nova com card aberto da placa no TESTE')]]);
  } catch (e) {
    cl_log_([[new Date(), 'TESTE', '', '', '', '', '', 'erro no teste', String(e.message || e).slice(0, 300)]]);
  } finally { VD_BOARD_FORCA = ''; VD_SEM_MENCOES = false; }
}
