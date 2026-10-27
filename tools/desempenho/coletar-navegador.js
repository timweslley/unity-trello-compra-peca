/* Desempenho do comprador e dos autorizadores (26/10/2026, Weslley) — roda NO NAVEGADOR, na página do formulário
 * (https://timweslley.github.io/unity-trello-compra-peca/powerup/formulario.html), com o login do Trello já feito.
 * Só LÊ o quadro principal (oH4TbTqb): histórico de colunas + comentários do formulário. Não grava nada.
 *
 * Uso (javascript_tool): cole este arquivo inteiro e depois rode
 *     await desempenhoColetar('2026-10-05')          // -> {linhas, fora, periodo}
 *     window.__CSV.slice(0, 100)                     // as linhas em blocos de 100 (a ferramenta corta textos longos)
 * Cabeçalho do CSV: etapa,quem_paga,pessoa,placa,data_hora,horas_uteis,horas_corridas
 *
 * Regras (as mesmas do painel "Desempenho Compra de Peça"):
 *  - cotação = tempo somado em EM COTAÇÃO até ir para PENDENTE AUTORIZAR / COTAÇÃO FINALIZADA (quem: comentário 💰 COTAÇÃO)
 *  - autorização = tempo em PENDENTE AUTORIZAR (seguradora) ou COTAÇÃO FINALIZADA (particular) até AUTORIZADO COMPRA
 *    (quem: ✅ AUTORIZADO / AUTORIZAÇÃO ALTERADA); devolução = mesma espera até voltar para EM COTAÇÃO (↩️ COTAÇÃO DEVOLVIDA)
 *  - compra = tempo em AUTORIZADO COMPRA até FALTA CHEGAR / ENCERRADO (quem: 🛒 COMPRA)
 *  - horas úteis: seg–sex, 8h–18h (America/Sao_Paulo), sem feriados
 *  - fora: cards de teste, virada 2.0 (17/10 08–10h UTC), movimentos desfeitos pela trava (< 10 min), movimento sem
 *    comentário do formulário feito pela conta timweslley (robô), autorização/devolução < 15 min depois da própria cotação. */
async function desempenhoColetar(desde) {
  const k = PU_CFG.CHAVE, t = localStorage.vd_token;
  if (!t) throw new Error('Sem login do Trello nesta página.');
  const baixar = async (filtro, extra) => {
    let all = [], before = '';
    for (let i = 0; i < 30; i++) {
      const a = await fetch(`https://api.trello.com/1/boards/oH4TbTqb/actions?filter=${filtro}&limit=1000&fields=date,data,type&memberCreator=true&memberCreator_fields=username${before ? '&before=' + before : ''}&key=${k}&token=${t}`).then((r) => r.json());
      if (!a.length) break;
      all = all.concat(a); before = a[a.length - 1].id;
      if (new Date(a[a.length - 1].date) < new Date(extra)) break;
    }
    return all;
  };
  const inicioBusca = new Date(new Date(desde).getTime() - 21 * 864e5).toISOString();   // 3 semanas antes: pega quando o card entrou na coluna
  const acts = (await baixar('updateCard:idList,createCard', inicioBusca)).map((x) => ({ d: x.date, ty: x.type, c: x.data.card && x.data.card.id, n: x.data.card && x.data.card.name,
    de: x.data.listBefore && x.data.listBefore.name, pa: (x.data.listAfter && x.data.listAfter.name) || (x.data.list && x.data.list.name), u: x.memberCreator && x.memberCreator.username }));
  const tipo = (s) => { const m = String(s).match(/\*\*([^*]+)\*\*/), T = m ? m[1] : '';
    if (/^COTAÇÃO$/.test(T)) return 'cotacao'; if (/^AUTORIZADO$|AUTORIZAÇÃO ALTERADA/.test(T)) return 'autorizacao';
    if (/COTAÇÃO DEVOLVIDA/.test(T)) return 'devolucao'; if (/^COMPRA$|COMPRA PARCIAL/.test(T)) return 'compra'; return ''; };
  const coms = (await baixar('commentCard', inicioBusca)).map((x) => ({ d: x.date, c: x.data.card && x.data.card.id, u: x.memberCreator && x.memberCreator.username, tp: tipo(x.data.text) })).filter((x) => x.tp);
  const tz = (d) => new Date(new Date(d).toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const hu = (a, b) => { const s = tz(a), e = tz(b); let h = 0; if (e <= s) return 0; let cur = new Date(s);
    while (cur < e) { const dw = cur.getDay(), ini = new Date(cur), fim = new Date(cur); ini.setHours(8, 0, 0, 0); fim.setHours(18, 0, 0, 0);
      if (dw > 0 && dw < 6) { const x = Math.max(cur, ini), y = Math.min(e, fim); if (y > x) h += (y - x) / 36e5; }
      cur = new Date(cur); cur.setDate(cur.getDate() + 1); cur.setHours(0, 0, 0, 0); }
    return h; };
  const ESPERA = ['PENDENTE AUTORIZAR', 'COTAÇÃO FINALIZADA'];
  const porCard = {}; acts.slice().sort((a, b) => (a.d < b.d ? -1 : 1)).forEach((a) => { (porCard[a.c] = porCard[a.c] || []).push(a); });
  const comPorCard = {}; coms.forEach((c) => { (comPorCard[c.c] = comPorCard[c.c] || []).push(c); });
  const out = [];
  Object.keys(porCard).forEach((cid) => {
    let ev = porCard[cid]; const del = new Set();
    for (let i = 0; i < ev.length - 1; i++) { const a = ev[i], b = ev[i + 1];
      if (a.ty === 'updateCard' && b.ty === 'updateCard' && a.de === b.pa && a.pa === b.de && new Date(b.d) - new Date(a.d) < 10 * 60e3) { del.add(i); del.add(i + 1); i++; } }
    ev = ev.filter((x, i) => !del.has(i));
    let lista = null, desdeCol = null, acumQ = 0, iniQ = null, nome = '';
    ev.forEach((a) => {
      nome = a.n || nome;
      if (a.ty === 'createCard') { lista = a.pa; desdeCol = a.d; if (lista === 'EM COTAÇÃO' && !iniQ) iniQ = a.d; return; }
      const de = a.de, pa = a.pa, t2 = a.d;
      if (lista === null) { lista = de; desdeCol = null; }
      if (de === 'EM COTAÇÃO' && desdeCol) acumQ += hu(desdeCol, t2);
      if (de === 'EM COTAÇÃO' && ESPERA.includes(pa) && (desdeCol || iniQ)) { out.push({ et: 'cotacao', card: nome, cid, u: a.u, fim: t2, h: acumQ, hc: (new Date(t2) - new Date(iniQ || desdeCol)) / 36e5 }); acumQ = 0; iniQ = null; }
      if (ESPERA.includes(de) && desdeCol && (pa === 'AUTORIZADO COMPRA' || pa === 'EM COTAÇÃO')) out.push({ et: pa === 'EM COTAÇÃO' ? 'devolucao' : 'autorizacao', col: de, card: nome, cid, u: a.u, fim: t2, h: hu(desdeCol, t2), hc: (new Date(t2) - new Date(desdeCol)) / 36e5 });
      if (de === 'AUTORIZADO COMPRA' && desdeCol && (pa === 'FALTA CHEGAR' || pa === 'ENCERRADO COMPRAS/FORNEC.')) out.push({ et: 'compra', card: nome, cid, u: a.u, fim: t2, h: hu(desdeCol, t2), hc: (new Date(t2) - new Date(desdeCol)) / 36e5 });
      if (pa === 'EM COTAÇÃO' && !iniQ) iniQ = t2;
      lista = pa; desdeCol = t2;
    });
  });
  out.forEach((o) => {
    const lst = (comPorCard[o.cid] || []).filter((c) => c.tp === o.et), tf = new Date(o.fim).getTime();
    let m = lst.find((c) => Math.abs(new Date(c.d) - tf) < 5 * 60e3);
    if (!m && o.et === 'compra') m = lst.filter((c) => new Date(c.d) <= tf && tf - new Date(c.d) < 3 * 864e5).pop();
    o.quem = m ? m.u : null;
  });
  const loc = (d) => new Date(d).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16);
  const ult = {}, rows = [], fora = { teste: 0, virada: 0, semquem: 0, proprio: 0 };
  out.filter((o) => o.fim >= desde).sort((a, b) => (a.fim < b.fim ? -1 : 1)).forEach((o) => {
    const nm = o.card || '';
    if (/🧪|ZZT\d|TESTE/i.test(nm)) { fora.teste++; return; }
    if (o.fim >= '2026-10-17T08:00' && o.fim < '2026-10-17T10:00') { fora.virada++; return; }
    const q = o.quem || (o.u !== 'timweslley' ? o.u : ''); if (!q) { fora.semquem++; return; }
    if (o.et === 'autorizacao' || o.et === 'devolucao') { const c = ult[o.cid]; if (c && c.q === q && new Date(o.fim) - new Date(c.fim) < 15 * 60e3) { fora.proprio++; return; } }
    if (o.et === 'cotacao') ult[o.cid] = { q, fim: o.fim };
    const placa = (nm.match(/[A-Z]{3}\d[A-Z0-9]\d{2}/) || [nm.split(' ')[0]])[0];
    rows.push([o.et, o.et === 'autorizacao' || o.et === 'devolucao' ? (o.col === 'COTAÇÃO FINALIZADA' ? 'particular' : 'seguradora') : '', q, placa, loc(o.fim), +o.h.toFixed(1), +o.hc.toFixed(1)].join(','));
  });
  window.__CSV = rows;
  return { linhas: rows.length, fora, periodo: [desde, loc(new Date().toISOString())] };
}
