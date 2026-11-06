import { describe, it, expect } from 'vitest';
import { guardarAcaoChecklist, mesclarAcoesChecklist, corrigirSincePorId, acoesChecklistEntre } from '../src/trello/acoesChecklist.js';

const base = 'https://api.trello.com/1/boards/abc123/actions';
const agora = Date.now();
const del = { id: '6aedff01aaaaaaaaaaaaaaa1', type: 'deleteCheckItem', date: new Date(agora - 60_000).toISOString(), data: { card: { id: 'c1' }, checklist: { id: 'k1' }, checkItem: { id: 'i1', name: '74218 GRADE', state: 'incomplete' } } };
const ren = { id: '6aedff02aaaaaaaaaaaaaaa2', type: 'updateCheckItem', date: new Date(agora - 30_000).toISOString(), data: { card: { id: 'c1' }, old: { name: 'X' }, checkItem: { id: 'i2', name: 'Y' } } };
const ok = { id: '6aedff03aaaaaaaaaaaaaaa3', type: 'updateCheckItemStateOnCard', date: new Date(agora - 20_000).toISOString(), data: {} };

describe('ações de checklist só do webhook (06/11/2026, ATZ2D85)', () => {
  it('guarda só createCheckItem/deleteCheckItem/updateCheckItem, sem repetir', () => {
    expect(guardarAcaoChecklist(del as never)).toBe(true);
    expect(guardarAcaoChecklist(del as never)).toBe(false);
    expect(guardarAcaoChecklist(ren as never)).toBe(true);
    expect(guardarAcaoChecklist(ok as never)).toBe(false);
    expect(acoesChecklistEntre(0, agora).length).toBe(2);
  });
  it('mescla no histórico do quadro sem filtro, do mais novo para o mais velho', () => {
    const trello = JSON.stringify([ok]);
    const r = JSON.parse(mesclarAcoesChecklist(base + '?since=' + new Date(agora - 120_000).toISOString() + '&limit=1000', trello)!);
    expect(r.map((a: { type: string }) => a.type)).toEqual(['updateCheckItemStateOnCard', 'updateCheckItem', 'deleteCheckItem']);
  });
  it('respeita o filtro: só os tipos pedidos; filtro sem esses tipos não mexe', () => {
    const r = JSON.parse(mesclarAcoesChecklist(base + '?filter=deleteCheckItem,updateCheckItemStateOnCard', '[]')!);
    expect(r.map((a: { type: string }) => a.type)).toEqual(['deleteCheckItem']);
    expect(mesclarAcoesChecklist(base + '?filter=updateCard:idList', '[]')).toBeNull();
    expect(mesclarAcoesChecklist('https://api.trello.com/1/cards/c1/actions', '[]')).toBeNull();
  });
  it('since por id de ação do webhook vira data (+1 ms) e a própria ação não volta', () => {
    const u = corrigirSincePorId(base + '?since=' + del.id + '&limit=100');
    expect(u).toContain('since=' + encodeURIComponent(new Date(Date.parse(del.date) + 1).toISOString()));
    const r = JSON.parse(mesclarAcoesChecklist(base + '?since=' + del.id, '[]')!);
    expect(r.map((a: { id: string }) => a.id)).toEqual([ren.id]);
    expect(corrigirSincePorId(base + '?since=' + ok.id)).toBe(base + '?since=' + ok.id);   // id desconhecido: fica
  });
});
