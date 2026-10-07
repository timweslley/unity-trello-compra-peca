/**
 * Espelho do quadro contra um Postgres de verdade e um Trello simulado.
 * Roda só com TEST_DATABASE_URL (banco descartável); sem ela, os testes de banco são pulados.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { camposLegiveis, dataDoId, linhaDoCard, type MetaQuadro } from '../src/trello/espelho.js';

const BANCO = process.env.TEST_DATABASE_URL;

describe('mapeamento (sem banco)', () => {
  const meta: MetaQuadro = {
    id: 'B1', shortLink: 'ZX4gRmnX', nome: 'Compra de Peça – TESTE',
    listas: new Map([['L1', 'EM COTAÇÃO']]),
    campos: new Map([
      ['CF1', { nome: 'Unidade', tipo: 'list', opcoes: new Map([['OP1', 'TOLEDO']]) }],
      ['CF2', { nome: 'Nº Ordem', tipo: 'number', opcoes: new Map() }],
      ['CF3', { nome: 'Placa', tipo: 'text', opcoes: new Map() }],
    ]),
  };
  it('campos personalizados ficam com nome e valor legíveis', () => {
    expect(camposLegiveis([
      { idCustomField: 'CF1', idValue: 'OP1' },
      { idCustomField: 'CF2', value: { number: '1724' } },
      { idCustomField: 'CF3', value: { text: 'ABC1D23' } },
    ], meta)).toEqual({ Unidade: 'TOLEDO', 'Nº Ordem': 1724, Placa: 'ABC1D23' });
  });
  it('data de criação sai do id do Trello', () => {
    expect(dataDoId('6ac65d6fa935f74eb9dcf496')?.getUTCFullYear()).toBe(2026);
  });
  it('checklists e itens em ordem, item marcado vira feito=true', () => {
    const l = linhaDoCard({
      id: '6ac65d6fa935f74eb9dcf001', shortLink: 'abc', name: 'ABC1D23 ONIX PRATA HDI', desc: 'd', idList: 'L1', idBoard: 'B1',
      due: null, closed: false, dateLastActivity: '2026-10-07T12:00:00Z',
      checklists: [{ id: 'C2', name: 'PAGAS', pos: 2, checkItems: [] },
        { id: 'C1', name: 'FORNECIMENTO', pos: 1, checkItems: [{ id: 'i2', name: 'B', state: 'incomplete', pos: 2 }, { id: 'i1', name: 'A', state: 'complete', pos: 1 }] }],
    }, meta);
    expect(l.lista_nome).toBe('EM COTAÇÃO');
    expect(l.checklists.map((c) => c.nome)).toEqual(['FORNECIMENTO', 'PAGAS']);
    expect(l.checklists[0].itens).toEqual([{ id: 'i1', nome: 'A', feito: true, due: null }, { id: 'i2', nome: 'B', feito: false, due: null }]);
  });
});

describe.skipIf(!BANCO)('espelho com banco e Trello simulado', () => {
  // --- Trello simulado ---
  const quadro = { id: '6ac0000000000000000000b1', shortLink: 'ZX4gRmnX', name: 'Compra de Peça – TESTE' };
  const listas = [{ id: 'L1', name: 'EM COTAÇÃO', pos: 1, closed: false }, { id: 'L2', name: 'FALTA CHEGAR', pos: 2, closed: false }];
  const card = (id: string, nome: string, lista: string, extra: Record<string, unknown> = {}) => ({
    id, shortLink: 's' + id.slice(-4), name: nome, desc: 'desc ' + nome, idList: lista, idBoard: quadro.id, due: null, closed: false,
    dateLastActivity: '2026-10-07T12:00:00.000Z', labels: [], checklists: [], attachments: [], customFieldItems: [], ...extra,
  });
  let cards = [card('6ac0000000000000000000c1', 'AAA1A11 ONIX PRATA HDI', 'L1'), card('6ac0000000000000000000c2', 'BBB2B22 HB20 BRANCO PORTO', 'L2')];
  const acoes = [
    { id: 'a3', type: 'commentCard', date: '2026-10-07T11:00:00Z', idMemberCreator: 'm1', memberCreator: { id: 'm1', username: 'weslley' }, data: { board: { id: quadro.id }, card: { id: cards[0].id }, text: 'primeiro' } },
    { id: 'a2', type: 'createCard', date: '2026-10-07T10:00:00Z', idMemberCreator: 'm2', memberCreator: { id: 'm2', username: 'sidy' }, data: { board: { id: quadro.id }, card: { id: cards[0].id } } },
    { id: 'a1', type: 'createCard', date: '2026-10-07T09:00:00Z', idMemberCreator: 'm1', memberCreator: { id: 'm1', username: 'weslley' }, data: { board: { id: quadro.id }, card: { id: cards[1].id } } },
  ];
  const respostas = (url: URL): unknown => {
    const p = url.pathname.replace(/^\/1/, '');
    if (p === '/boards/ZX4gRmnX' || p === `/boards/${quadro.id}`) return quadro;
    if (p === '/boards/oH4TbTqb') return { id: '6ac00000000000000000ffff', shortLink: 'oH4TbTqb', name: 'Compra de Peça' };
    if (p.endsWith('/lists')) return listas;
    if (p.endsWith('/labels')) return [];
    if (p.endsWith('/customFields')) return [];
    if (p.endsWith('/members')) return [{ id: 'm1', username: 'weslley', fullName: 'Weslley' }];
    if (p.endsWith('/cards/all')) return cards;
    if (p.endsWith('/actions')) return url.searchParams.get('before') ? [] : acoes;
    const m = p.match(/^\/cards\/(\w+)$/);
    if (m) { const c = cards.find((x) => x.id === m[1]); if (c) return c; throw Object.assign(new Error('404'), { status: 404 }); }
    throw new Error('rota não simulada: ' + p);
  };

  let mod: typeof import('../src/trello/espelho.js');
  let db: typeof import('../src/db.js');

  beforeAll(async () => {
    process.env.DATABASE_URL = BANCO;
    process.env.TRELLO_KEY = 'k'; process.env.TRELLO_TOKEN = 't';
    vi.stubGlobal('fetch', async (u: string | URL) => {
      const url = new URL(String(u));
      try { return new Response(JSON.stringify(respostas(url)), { status: 200 }); }
      catch (e) { return new Response('not found', { status: (e as { status?: number }).status || 500 }); }
    });
    vi.resetModules();
    db = await import('../src/db.js');
    // banco limpo a cada execução
    await db.consulta(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
    await db.migrar();
    mod = await import('../src/trello/espelho.js');
  });
  afterAll(async () => { vi.unstubAllGlobals(); await db?.fecharBanco(); });

  it('sincronização completa grava quadro, listas e cards', async () => {
    const r = await mod.sincronizarQuadro('ZX4gRmnX', false);
    expect(r).toMatchObject({ cards: 2, abertos: 2, listas: 2, sumidos: 0 });
    const linhas = await db.consulta<{ nome: string; lista_nome: string }>(`SELECT nome, lista_nome FROM trello_card ORDER BY nome`);
    expect(linhas).toEqual([{ nome: 'AAA1A11 ONIX PRATA HDI', lista_nome: 'EM COTAÇÃO' }, { nome: 'BBB2B22 HB20 BRANCO PORTO', lista_nome: 'FALTA CHEGAR' }]);
  });

  it('ação do webhook relê só o card mexido (mudou de coluna)', async () => {
    cards[0] = { ...cards[0], idList: 'L2' };
    expect(await mod.atualizarCard(cards[0].id, 'ZX4gRmnX', false)).toBe('ok');
    const [l] = await db.consulta<{ lista_nome: string }>(`SELECT lista_nome FROM trello_card WHERE id=$1`, [cards[0].id]);
    expect(l.lista_nome).toBe('FALTA CHEGAR');
  });

  it('card excluído no Trello fica marcado com a data, não some do banco', async () => {
    const excluido = cards[1].id;
    cards = cards.filter((c) => c.id !== excluido);
    expect(await mod.atualizarCard(excluido, 'ZX4gRmnX', false)).toBe('excluido');
    const [l] = await db.consulta<{ excluido_em: string | null }>(`SELECT excluido_em::text FROM trello_card WHERE id=$1`, [excluido]);
    expect(l.excluido_em).not.toBeNull();
  });

  it('histórico importa sem duplicar e descobre quem criou cada card', async () => {
    const r1 = await mod.importarHistorico('ZX4gRmnX', false);
    const r2 = await mod.importarHistorico('ZX4gRmnX', false);
    expect(r1).toMatchObject({ lidas: 3, novas: 3 });
    expect(r2).toMatchObject({ lidas: 3, novas: 0 });
    const [c] = await db.consulta<{ criado_por: string }>(`SELECT criado_por FROM trello_card WHERE id=$1`, [cards[0].id]);
    expect(c.criado_por).toBe('sidy');
    const com = await db.consulta<{ texto: string }>(`SELECT texto FROM comentario`);
    expect(com).toEqual([{ texto: 'primeiro' }]);
  });

  it('o quadro principal é recusado mesmo na sincronização', async () => {
    await expect(mod.sincronizarQuadro('oH4TbTqb', false)).rejects.toThrow(/bloqueado/);
  });

  it('resumo para o /saude', async () => {
    const r = await mod.resumoEspelho();
    expect(r).toMatchObject({ cards: 2, abertos: 1, excluidos: 1 });
    expect(Object.keys(r.ultimas).sort()).toEqual(['historico', 'quadro']);
  });
});
