import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rodar } from '../src/sincronizar.mjs';
import { criarCliente, query } from '../src/cilia.mjs';

function bancoFalso() {
  const orc = new Map(), ver = [], exec = [];
  return {
    orc, ver, exec,
    async preparar() {},
    async lerOrcamentos(casa) { return new Map([...orc].filter(([k]) => k.startsWith(casa + ':')).map(([k, v]) => [k.split(':')[1], v])); },
    async gravarOrcamento(casa, r, sig) { const k = `${casa}:${r.budget_id}`; orc.set(k, { ...(orc.get(k) || {}), ...r, assinatura: sig }); },
    async gravarVersao(casa, r, d, x) { ver.push({ casa, id: r.budget_id, v: r.numero_versao, temPdf: 'report_pdf' in (d || {}), ...x }); },
    async marcarDetalhe(casa, id, sig) { orc.get(`${casa}:${id}`).assinatura_detalhe = sig; },
    async retrato(casa) { return [...orc].filter(([k]) => k.startsWith(casa + ':')).map(([, v]) => v); },
    async sql(t, p) { exec.push(p); return []; },
  };
}
function driveFalso() {
  const arquivos = [];
  return { arquivos, async garantirPasta(p, n) { return p + '/' + n; }, async gravar(p, n, c) { arquivos.push({ p, n, tam: c.length }); return 'id-' + n; } };
}
const item = (id, placa, ver, status = 'analyzed', concl = 'authorized') => ({
  budget_id: id, vehicle: { license_plate: placa }, insurer: { trade: 'HDI' }, casualty_number: 'S' + id, budget_number: id,
  budget_version: ver, number_with_version: `${id}.${ver}`, budget_current_status: { current_status: status, date: '2026-10-1' + ver },
  conclusion_key: concl,
});
function clienteFalso(lista) {
  return () => {
    let n = 0;
    return {
      get chamadas() { return n; },
      async listar() { n++; return lista(); },
      async detalhe({ orcamento, versao }) { n++; return { budget_id: orcamento, report_pdf: Buffer.from('%PDF ' + versao).toString('base64'), budgetings: [{ code: 'X1', name: 'PARACHOQUE', supplier_type: 'insurer', quantity: 1 }] }; },
    };
  };
}

test('1ª rodada baixa tudo; 2ª sem mudança não chama detalhe; mudança de versão baixa só o que mudou', async () => {
  const banco = bancoFalso(), gdrive = driveFalso();
  let lista = [item(1, 'AAA1B11', 1), item(2, 'BBB2C22', 1)];
  const env = { CASAS: 'TOLEDO', CILIA_TOKEN_TOLEDO: 'tok', DRIVE_PASTA_ID: 'raiz' };
  const r1 = await rodar({ cliente: clienteFalso(() => lista), banco, gdrive, env });
  assert.equal(r1.detalhes, 2);
  assert.equal(r1.pdfs, 2);
  assert.equal(r1.casas.TOLEDO.novos.length, 2);
  assert.ok(banco.ver.every((v) => v.temPdf === false), 'PDF em base64 não vai para o banco');
  assert.equal(banco.ver[0].pecas[0].fornece, 'SEGURADORA');

  const r2 = await rodar({ cliente: clienteFalso(() => lista), banco, gdrive, env });
  assert.equal(r2.detalhes, 0);
  assert.equal(r2.chamadas, 1, 'só a listagem');

  lista = [item(1, 'AAA1B11', 2), item(2, 'BBB2C22', 1)];
  const r3 = await rodar({ cliente: clienteFalso(() => lista), banco, gdrive, env });
  assert.equal(r3.detalhes, 1);
  assert.equal(r3.casas.TOLEDO.mudaram.length, 1);
  assert.ok(gdrive.arquivos.some((a) => a.n === 'AAA1B11 - HDI - Cilia 1.2.pdf'));
  assert.ok(gdrive.arquivos.some((a) => a.n === 'CILIA-HOJE.json'));
});

test('limite de detalhes deixa o resto pendente para o dia seguinte', async () => {
  const banco = bancoFalso(), gdrive = driveFalso();
  const lista = [1, 2, 3, 4, 5].map((i) => item(i, 'PLC' + i, 1));
  const env = { CASAS: 'TOLEDO', CILIA_TOKEN_TOLEDO: 'tok', DRIVE_PASTA_ID: 'raiz', MAX_DETALHES: '2' };
  const r = await rodar({ cliente: clienteFalso(() => lista), banco, gdrive, env });
  assert.equal(r.detalhes, 2);
  assert.equal(r.casas.TOLEDO.pendentes, 3);
  const r2 = await rodar({ cliente: clienteFalso(() => lista), banco, gdrive, env });
  assert.equal(r2.detalhes, 2);
});

test('casa sem token é pulada sem derrubar as outras; token recusado vira aviso', async () => {
  const banco = bancoFalso(), gdrive = driveFalso();
  const env = { CASAS: 'TOLEDO,CASCAVEL', CILIA_TOKEN_TOLEDO: 'PREENCHER', CILIA_TOKEN_CASCAVEL: 'tok' };
  const falha = () => ({ chamadas: 1, async listar() { const { ErroCilia } = await import('../src/cilia.mjs'); throw new ErroCilia(401, 'x'); } });
  const r = await rodar({ cliente: falha, banco, gdrive, env });
  assert.equal(r.casas.TOLEDO.erro, 'token não cadastrado');
  assert.match(r.casas.CASCAVEL.erro, /token recusado/);
});

test('cliente: header auth_token, colchetes do date_range e paginação por cursor', async () => {
  const urls = [];
  const fetchFn = async (url, op) => {
    urls.push(url); assert.equal(op.headers.auth_token, 'T');
    const pag = urls.length === 1 ? { next_cursor: 'c2' } : { next_cursor: null };
    return { ok: true, status: 200, text: async () => JSON.stringify({ budgets: [{ budget_id: urls.length }], pagination_info: pag }) };
  };
  const c = criarCliente('T', { fetchFn, pausaMs: 0 });
  const l = await c.listar({ inicio: '2026-06-01', fim: '2026-10-11' });
  assert.equal(l.length, 2);
  assert.match(urls[0], /date_range%5Bstart_date%5D=2026-06-01/);
  assert.match(urls[0], /page=1/);
  assert.match(urls[1], /cursor=c2/);
  assert.equal(query({ a: 1, b: '', c: null }), 'a=1');
});
