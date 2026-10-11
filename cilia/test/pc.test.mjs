import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { rodarPC } from '../pc/sincronizar-pc.mjs';

const item = (id, placa, ver) => ({ budget_id: id, vehicle: { license_plate: placa }, insurer: { trade: 'HDI' }, casualty_number: 'S' + id,
  budget_number: id, budget_version: ver, number_with_version: `${id}.${ver}`, budget_current_status: { current_status: 'analyzed', date: '2026-10-1' + ver } });
const fab = (lista) => () => { let n = 0; return { get chamadas() { return n; }, async listar() { n++; return lista(); },
  async detalhe({ versao }) { n++; return { report_pdf: Buffer.from('%PDF ' + versao).toString('base64'), budgetings: [{ code: 'A', name: 'B', supplier_type: 'workshop' }], conclusion: { conclusion_type_title: 'Autorizado' } }; } }; };

test('PC: grava PDF, estado e CILIA-HOJE; 2ª rodada sem mudança não baixa de novo', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cilia-'));
  let lista = [item(1, 'AAA1B11', 1)];
  const env = { CILIA_SAIDA: dir, CASAS: 'TOLEDO,CASCAVEL', CILIA_TOKEN_TOLEDO: 't' };
  const r1 = await rodarPC({ env, fabricaCliente: fab(() => lista) });
  assert.equal(r1.pdfs, 1);
  assert.equal(r1.casas.CASCAVEL.erro, 'token não cadastrado');
  assert.deepEqual(await readdir(path.join(dir, 'PDF', 'Toledo')), ['AAA1B11 - HDI - Cilia 1.1.pdf']);
  const hoje = JSON.parse(await readFile(path.join(dir, 'CILIA-HOJE.json'), 'utf8'));
  assert.equal(hoje.orcamentos.TOLEDO[0].pecas[0].fornece, 'OFICINA');
  assert.equal(hoje.orcamentos.TOLEDO[0].pdf, 'PDF/Toledo/AAA1B11 - HDI - Cilia 1.1.pdf');
  const r2 = await rodarPC({ env, fabricaCliente: fab(() => lista) });
  assert.equal(r2.detalhes, 0);
  lista = [item(1, 'AAA1B11', 2)];
  const r3 = await rodarPC({ env, fabricaCliente: fab(() => lista) });
  assert.equal(r3.detalhes, 1);
  assert.equal(r3.casas.TOLEDO.mudaram.length, 1);
});
