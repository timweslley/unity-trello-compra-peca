/**
 * Imitação dos serviços do Google (src/gas): o código no formato do robô roda no trabalhador, síncrono,
 * com banco de verdade e HTTP local. Precisa do build (o trabalhador é dist/gas/trabalhador.js) e de TEST_DATABASE_URL.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BANCO = process.env.TEST_DATABASE_URL;
const DIST = path.resolve(__dirname, '..', 'dist', 'gas', 'ponte.js');

describe.skipIf(!BANCO || !existsSync(DIST))('serviços do Google imitados', () => {
  let ponte: typeof import('../src/gas/ponte.js');
  let db: typeof import('../src/db.js');
  let http: Server; let porta = 0;
  const post = async (fn: string, ...args: unknown[]) => JSON.parse(await ponte.executarPost(JSON.stringify({ fn, args })));

  beforeAll(async () => {
    process.env.DATABASE_URL = BANCO; process.env.TRELLO_KEY = 'k'; process.env.TRELLO_TOKEN = 't'; process.env.TRELLO_QUADRO = 'ZX4gRmnX'; process.env.URL_APP = '';
    process.env.GAS_ARQUIVO = path.resolve(__dirname, 'gas', 'robo-teste.gs.js');
    db = await import('../dist/db.js' as string);
    await db.consulta(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
    await db.migrar();
    await db.consulta(`INSERT INTO trello_quadro (id, short_link, nome) VALUES ('6ac0000000000000000000b1', 'ZX4gRmnX', 'TESTE')`);
    await db.consulta(`INSERT INTO trello_card (id, quadro, short_link, nome) VALUES ('6ac0000000000000000000c1', '6ac0000000000000000000b1', 'sAAAAAAA', 'X')`);
    http = createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/plain' }); r.end('olá do servidor local'); });
    await new Promise<void>((ok) => http.listen(0, () => ok()));
    porta = (http.address() as { port: number }).port;
    ponte = await import(DIST);
  });
  afterAll(async () => { http?.close(); await db?.fecharBanco(); });

  it('propriedades: grava, lê e a fixa do servidor (VD_BOARD) vem da configuração', async () => {
    expect(await post('teste_props')).toEqual({ ok: true, r: '1|ZX4gRmnX|true' });
    const [p] = await db.consulta<{ valor: string }>(`SELECT valor FROM gas_propriedade WHERE chave = 'A'`);
    expect(p.valor).toBe('1');
  });
  it('planilha: aba nova, appendRow com data, setValues, busca por texto', async () => {
    const r = JSON.parse((await post('teste_planilha')).r);
    expect(r.v).toEqual([['a', 'DATA 2026-10-07T15:00:00.000Z'], ['b', 2]]);
    expect(r.linhaB).toBe(2);
    expect(r.ultima).toBe(2);
  });
  it('HTTP de verdade pelo trabalhador', async () => {
    expect((await post('teste_fetch', `http://127.0.0.1:${porta}/x`)).r).toBe('200:olá do servidor local');
  });
  it('proteção: gravação em card de fora do quadro é recusada sem sair para a rede', async () => {
    expect((await post('teste_escrita', 'cardDoPrincipal')).r).toMatch(/^403:servidor: card cardDoPrincipal não é do quadro ZX4gRmnX/);
  });
  it('cache, MD5 em base64 e formatDate com literal', async () => {
    expect((await post('teste_cache')).r).toBe('v');
    expect((await post('teste_digest')).r).toBe('kAFQmDzST7DWlj99KOF/cg==');
    expect((await post('teste_data')).r).toBe('07/10/2026 às 12:04:05');
  });
  it('principal (só leitura): VD_BOARD do principal, nada gravado no banco, gravação no Trello recusada', async () => {
    const lp = async (fn: string, ...args: unknown[]) => JSON.parse(await ponte.executarLeituraPrincipal(JSON.stringify({ fn, args })));
    await db.consulta(`DELETE FROM gas_propriedade WHERE chave = 'A'`);
    expect((await lp('teste_props')).r).toMatch(/^1\|oH4TbTqb\|/);
    expect(await db.consulta(`SELECT 1 FROM gas_propriedade WHERE chave = 'A'`)).toHaveLength(0);
    expect((await lp('teste_escrita', 'sAAAAAAA')).r).toMatch(/^403:servidor: no quadro principal o servidor só lê/);
    expect(ponte.LEITURAS_PRINCIPAL).toEqual(['vdf_iniciar', 'vdf_abrir', 'vdf_buscarPlaca', 'vdf_carregarCard']);
  });
  it('variável global do robô nasce de novo a cada execução (como no Apps Script)', async () => {
    expect((await post('teste_global')).r).toBe('vazio');
    expect((await post('teste_global')).r).toBe('vazio');
    const lp = async (fn: string) => JSON.parse(await ponte.executarLeituraPrincipal(JSON.stringify({ fn, args: [] })));
    expect((await lp('teste_global')).r).toBe('vazio');
    expect((await lp('teste_global')).r).toBe('vazio');
  });
  it('erro do código do robô volta como {ok:false, erro}', async () => {
    expect(await post('teste_erro')).toEqual({ ok: false, erro: 'falhou de propósito' });
  });
});
