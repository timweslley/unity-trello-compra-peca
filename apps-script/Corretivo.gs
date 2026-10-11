/* ============================ CORREÇÃO ÚNICA — 11/10/2026 ============================
 * Weslley (11/10/2026, "corrigir tudo"): na rotina de 11/10 a Rotina anexou PDFs do Cilia em cards e o robô leu como
 * orçamento complementar onde não devia:
 *  - BXZ4J84 e SDX5I55 (sinistros HDI): o Cilia traz tudo como peça da oficina; quem diz o que a HDI fornece é o laudo HDI.
 *    No BXZ4J84 as 4 FO da CAR HOUSE saíram do checklist FORNECIMENTO e 9 peças entraram como compra da oficina.
 *  - BBV0H58 e BAT9F19 (cards de RETORNO): o Cilia traz as peças do sinistro todo, já compradas no card original.
 *  - FOB8723: a linha "I REFATURAMENTO VALOR DA LANTERNA TRAS DIR" (ajuste de valor do laudo HDI) virou peça.
 * Esta correção roda UMA vez no ciclo do robô (marca CR_20261011 = FEITO): volta a descrição de antes do complemento
 * (cópia da planilha de backup, tirada pelo próprio robô), refaz o certo pelo laudo HDI, devolve a coluna e comenta.
 * As regras novas em Complemento.gs evitam que aconteça de novo. Depois de rodar, este arquivo pode ser apagado.
 */
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

/** Primeira cópia de 11/10 tirada pelo robô antes de um "orçamento complementar", por shortLink: {sl: desc}. */
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

/* 2ª parte (11/10/2026, 15h40): no SDX5I55 o complemento errado também tinha tirado do checklist FORNECIMENTO o item
 * 52245037 DEFLETOR DO RADIADOR (FO da HDI, FLORENCA, prev. 19/10, ainda não entregue) — a 1ª correção não devolveu. */
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
