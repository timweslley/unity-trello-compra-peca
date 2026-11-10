import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const src = readFileSync(path.resolve(__dirname, '..', 'recursos', 'formulario.gs.js'), 'utf8');
const fns = new Function('console', src + '\nreturn { vd_pagadorParticular_, vd_rotuloSeguradora_, vd_analisar_ };')(console) as Record<string, (...a: unknown[]) => any>;

describe('vidraçaria/rede no lugar da seguradora = PARTICULAR (10/11/2026, TBX4I16)', () => {
  it('reconhece PILKINGTON, CARGLASS, AUTOGLASS e MAXPAR; seguradora de verdade não', () => {
    for (const s of ['PILKINGTON', 'Carglass', 'AUTOGLASS', 'MAXPAR', 'TBX4I16 TCROSS BRANCO PILKINGTON']) expect(fns.vd_pagadorParticular_(s), s).toBeTruthy();
    for (const s of ['HDI', 'PORTO SEGURO', 'YELUM', 'PARTICULAR', '']) expect(fns.vd_pagadorParticular_(s), s).toBe('');
  });
  it('o rótulo do cabeçalho mantém o nome da empresa', () => {
    expect(fns.vd_rotuloSeguradora_('PARTICULAR', 'PILKINGTON')).toBe('PILKINGTON');
    expect(fns.vd_rotuloSeguradora_('PARTICULAR', '')).toBe('PARTICULAR');
    expect(fns.vd_rotuloSeguradora_('SEGURADORA', 'HDI')).toBe('HDI');
  });
  it('o pedido com PILKINGTON no título vira PARTICULAR: sem cobrar orçamento da seguradora nem nº da ordem', () => {
    const desc = '**T-CROSS HIGHLINE 250 TSI · 2025/2026 · BRANCO · PILKINGTON**\nTBX4I16 · 9BWBJ6BF4T4025884\n\nPEÇAS:\n2GP845011ACNVB | PARABRISA | GENUÍNO/ORIGINAL\n';
    const an = fns.vd_analisar_(desc, 'TBX4I16 TCROSS BRANCO PILKINGTON');
    expect(an.dados.tipo).toBe('PARTICULAR');
    expect(an.dados.pagador).toBe('PILKINGTON');
    expect(an.faltas.join(' | ')).not.toMatch(/orçamento autorizado da seguradora/);
  });
});
