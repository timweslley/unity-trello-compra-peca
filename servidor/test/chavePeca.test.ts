import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Funções do robô (Apps Script) carregadas do bundle extraído, sem serviços do Google.
const src = readFileSync(path.resolve(__dirname, '..', 'recursos', 'formulario.gs.js'), 'utf8');
const fns = new Function('console', src + '\nreturn { vd_chavePeca_, vd_codigoVazio_, vd_codigoDeEnchimento_, vd_codigoUtil_, vd_nomePeca_ };')(console) as Record<string, (...a: unknown[]) => unknown>;

describe('código de enchimento não identifica a peça (09/11/2026, ICT9375 Fusca: três peças com 0000)', () => {
  it('0000 / 000 / XXXX / ---- / N/A são enchimento; códigos reais não', () => {
    for (const c of ['0000', '000', '00000000', 'XXXX', '----', 'N/A', '0.000', '????']) expect(fns.vd_codigoDeEnchimento_(c), c).toBe(true);
    for (const c of ['5NN857537GRU', '0001', '00000014', 'A0000', 'ACESSORIO', '']) expect(fns.vd_codigoDeEnchimento_(c), c).toBe(false);
  });
  it('a chave passa a ser a descrição — três peças com 0000 viram três chaves', () => {
    const ks = [['0000', 'FAROL DIREITO'], ['0000', 'PARALAMA DIANTEIRO DIREITO'], ['0000', 'MOLDURA DO FAROL DIREITO (CROMADA)']]
      .map(([codigo, descricao]) => fns.vd_chavePeca_({ codigo, descricao }));
    expect(new Set(ks).size).toBe(3);
    expect(ks[0]).toBe('FAROL DIREITO');
    expect(fns.vd_chavePeca_({ codigo: '5NN857537GRU', descricao: 'COBERTURA' })).toBe('5NN857537GRU');
  });
  it('o nome do item de checklist não leva o 0000', () => {
    expect(fns.vd_nomePeca_({ codigo: '0000', descricao: 'Paralama Diant Dir' })).toBe('PARALAMA DIANT DIR');
    expect(fns.vd_nomePeca_({ codigo: 'J7BZ16005D', descricao: 'Paralama' })).toBe('J7BZ16005D PARALAMA');
    expect(fns.vd_codigoVazio_('0000')).toBe(true);
    expect(fns.vd_codigoVazio_('S/C')).toBe(true);
    expect(fns.vd_codigoVazio_('J7BZ16005D')).toBe(false);
  });
});
