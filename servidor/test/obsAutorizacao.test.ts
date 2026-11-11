import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const src = readFileSync(path.resolve(__dirname, '..', 'recursos', 'formulario.gs.js'), 'utf8');
const fns = new Function('console', src + '\nreturn { vd_obsAutorizacoes_ };')(console) as Record<string, (...a: unknown[]) => any>;

const CABECA = '**FORD F-350 CC XL 2011/2011 · PRATA · TOKIO**\nATV4G70 · 9BFJW3492BB085451\n\nPEÇAS:\n6C3Z8200BD | GRADE DO RADIADOR | PARALELO\n\n===== COTAÇÃO =====\nCOTAÇÃO 10/11/2026 21:27 - comprasunity\n**RUFATO**\n6C3Z8200BD GRADE DO RADIADOR - RFTW - R$ 1.248,00 - 10 dias úteis\n';

describe('observação geral de quem autorizou chega ao comprador (11/11/2026, ATV4G70)', () => {
  it('lê a OBS GERAL da autorização com quem e quando', () => {
    const desc = CABECA + 'AUTORIZAÇÃO 11/11/2026 10:34 - timweslley\nAUTORIZADO: RUFATO - GRADE DO RADIADOR - R$ 1.248,00\nOBS GERAL: (autorização) PEÇAS DEVEM SER COMPRADAS PELO CNPJ DA WEV PARA REFATURAMENTO, NÃO REFATURAR AUTOMATICAMENTE\n';
    const r = fns.vd_obsAutorizacoes_(desc);
    expect(r).toHaveLength(1);
    expect(r[0].texto).toMatch(/CNPJ DA WEV/);
    expect(r[0].quem).toBe('timweslley');
    expect(r[0].quando).toBe('11/11/2026 10:34');
  });
  it('devolução para cotação apaga a observação da autorização anterior; a de devolução não conta', () => {
    const desc = CABECA + 'AUTORIZAÇÃO 11/11/2026 10:34 - timweslley\nAUTORIZADO: RUFATO - GRADE DO RADIADOR - R$ 1.248,00\nOBS GERAL: (autorização) comprar pelo CNPJ da WEV\nDEVOLVIDA PARA COTAÇÃO 11/11/2026 11:00 - timweslley\nOBS GERAL: (devolução) cotar mais um fornecedor\n';
    expect(fns.vd_obsAutorizacoes_(desc)).toEqual([]);
  });
  it('sem observação geral devolve lista vazia; duas autorizações parciais somam sem repetir', () => {
    expect(fns.vd_obsAutorizacoes_(CABECA + 'AUTORIZAÇÃO 11/11/2026 10:34 - timweslley\nAUTORIZADO: RUFATO - GRADE DO RADIADOR - R$ 1.248,00\n')).toEqual([]);
    const desc = CABECA + 'AUTORIZAÇÃO 11/11/2026 10:34 - timweslley\nOBS GERAL: (autorização) comprar pelo CNPJ da WEV\nAUTORIZAÇÃO 11/11/2026 12:00 - timweslley\nOBS GERAL: (autorização) comprar pelo CNPJ da WEV\nAUTORIZAÇÃO 11/11/2026 13:00 - timweslley\nOBS GERAL: (autorização) frete por conta da oficina\n';
    expect(fns.vd_obsAutorizacoes_(desc).map((o: any) => o.texto)).toEqual(['comprar pelo CNPJ da WEV', 'frete por conta da oficina']);
  });
});
