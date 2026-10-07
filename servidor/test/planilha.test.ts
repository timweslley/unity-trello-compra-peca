/** Leitura da planilha do robô (TRAVA + EVENTOS) com a API do Sheets simulada. */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { dataDoSerial, linhasEventos, linhasTrava, shortLinkDoLink } from '../src/google/planilha.js';

const BANCO = process.env.TEST_DATABASE_URL;
const CARD = '6ac0000000000000000000c1';

// 07/10/2026 12:00 em São Paulo = 15:00 UTC; serial da planilha = dias desde 30/12/1899 (horário local)
const SERIAL_0710_12H = 46302.5;

const TRAVA = [
  ['Card id', 'Assinatura', 'Quando', 'Descrição oficial', ''],
  [CARD, '123:45', SERIAL_0710_12H, 'vitrine curta', 'COMPLETA com peças'],
  ['6ac0000000000000000000c9', '9:1', SERIAL_0710_12H, 'card antigo só com vitrine', ''],
  ['lixo', '', '', '', ''],
];
const EVENTOS = [
  ['Data/hora', 'Evento', 'Card', 'Link', 'Placa', 'Unidade', 'Tipo do pedido', 'Peça', 'Particular', 'Fornecedor', 'Valor', 'Prazo (dias úteis)', 'Previsão', 'Usuário', 'Detalhe', 'Quadro'],
  [SERIAL_0710_12H, 'COTAÇÃO', 'AAA1A11 ONIX PRATA HDI', 'https://trello.com/c/sAAAAAAA', 'AAA1A11', 'TOLEDO', 'SEGURADORA', '123 PARACHOQUE', '', 'METROSUL', 850.5, 3, 46305, 'compras', '', 'ZX4gRmnX'],
  [SERIAL_0710_12H, 'COMPRA', 'AAA1A11 ONIX PRATA HDI', 'https://trello.com/c/sAAAAAAA', 'AAA1A11', 'TOLEDO', 'SEGURADORA', '123 PARACHOQUE', 'SIM', 'METROSUL', '', '', '', 'compras', 'obs', 'ZX4gRmnX'],
];

describe('planilha (sem banco)', () => {
  it('serial da planilha vira a hora certa de São Paulo', () => {
    expect(dataDoSerial(SERIAL_0710_12H)?.toISOString()).toBe('2026-10-07T15:00:00.000Z');
    expect(dataDoSerial('07/10/2026 12:00')?.toISOString()).toBe('2026-10-07T15:00:00.000Z');
    expect(dataDoSerial('')).toBeNull();
  });
  it('TRAVA ignora cabeçalho e linhas sem id de card', () => {
    const l = linhasTrava(TRAVA);
    expect(l.map((x) => x.card_id)).toEqual([CARD, '6ac0000000000000000000c9']);
    expect(l[0].completa).toBe('COMPLETA com peças');
  });
  it('EVENTOS: link vira código do card, valor/prazo numéricos, particular SIM', () => {
    const e = linhasEventos(EVENTOS);
    expect(shortLinkDoLink('https://trello.com/c/sAAAAAAA')).toBe('sAAAAAAA');
    expect(e[0]).toMatchObject({ evento: 'COTAÇÃO', short_link: 'sAAAAAAA', valor: 850.5, prazo_du: 3, particular: false, quadro: 'ZX4gRmnX' });
    expect(e[1]).toMatchObject({ evento: 'COMPRA', valor: null, particular: true, previsao: null });
    expect(e[0].chave).not.toBe(e[1].chave);
  });
});

describe.skipIf(!BANCO)('planilha com banco e Sheets simulado', () => {
  let db: typeof import('../src/db.js');
  let mod: typeof import('../src/google/planilha.js');

  beforeAll(async () => {
    process.env.DATABASE_URL = BANCO;
    process.env.GOOGLE_TOKEN = 'token-de-teste';
    vi.stubGlobal('fetch', async (u: string | URL) => {
      const url = decodeURIComponent(String(u));
      if (url.includes('TRAVA!')) return new Response(JSON.stringify({ values: TRAVA }));
      if (url.includes('EVENTOS!')) return new Response(JSON.stringify({ values: EVENTOS }));
      return new Response('?', { status: 404 });
    });
    vi.resetModules();
    db = await import('../src/db.js');
    await db.consulta(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
    await db.migrar();
    // um card do espelho que bate com a TRAVA e com o link dos eventos
    await db.consulta(`INSERT INTO trello_card (id, quadro, short_link, nome) VALUES ($1, 'B1', 'sAAAAAAA', 'AAA1A11 ONIX PRATA HDI')`, [CARD]);
    mod = await import('../src/google/planilha.js');
  });
  afterAll(async () => { vi.unstubAllGlobals(); delete process.env.GOOGLE_TOKEN; await db?.fecharBanco(); });

  it('importa TRAVA e EVENTOS e liga ao card do espelho', async () => {
    const r = await mod.importarPlanilha('PLANILHA');
    expect(r.trava).toEqual({ linhas: 2, novas_ou_mudadas: 2, cards_espelho: 1 });
    expect(r.eventos).toEqual({ linhas: 2, novas: 2 });
    const [c] = await db.consulta<{ desc_completa: string }>(`SELECT desc_completa FROM trello_card WHERE id=$1`, [CARD]);
    expect(c.desc_completa).toBe('COMPLETA com peças');
    const ev = await db.consulta<{ card_id: string; previsao: string | null }>(`SELECT card_id, previsao::text FROM evento ORDER BY id`);
    expect(ev.map((e) => e.card_id)).toEqual([CARD, CARD]);
    expect(ev[0].previsao).toBe('2026-10-10');
  });

  it('rodar de novo não duplica nada', async () => {
    const r = await mod.importarPlanilha('PLANILHA');
    expect(r.trava.novas_ou_mudadas).toBe(0);
    expect(r.eventos.novas).toBe(0);
    const [n] = await db.consulta<{ n: string }>(`SELECT count(*)::text n FROM evento`);
    expect(n.n).toBe('2');
  });
});
