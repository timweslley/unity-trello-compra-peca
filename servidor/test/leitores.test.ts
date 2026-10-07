/**
 * Leitores de documentos portados do robô (robo.js é cópia fiel do Apps Script).
 * Textos no formato de cada orçamento + trechos reais citados nos comentários do robô.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { lerTexto, melhorLeitura } from '../src/leitores/leitura.js';
import { extrairTexto, tipoArquivo } from '../src/leitores/texto.js';
import * as R from '../src/leitores/robo.js';

describe('orçamentos', () => {
  it('HDI: oficina × fornecidas pela HDI, valor líquido com desconto', () => {
    const t = `HDI SEGUROS Sinistro: 1234567-8 Cor: PRATA
      PEÇAS FORNECIDAS PELA OFICINA Código Descrição Qtd Unit Total Desconto (%)
      5U0807221 PARACHOQUE DIANTEIRO 1 1.000,00 1.000,00 10,00
      PEÇAS FORNECIDAS PELA HDI Código Descrição Qtd Unit Total Desconto (%)
      5U0941005 FAROL ESQUERDO 1 2.000,00 2.000,00 0,00
      OPERAÇÕES`;
    const l = lerTexto(t);
    expect(l.orcamento).toBe('HDI');
    expect(l.seguradora).toBe('HDI');
    expect(l.cor).toBe('PRATA');
    expect(l.oficina?.map((i) => [i.codigo, i.descricao, i.qtd, i.valorOrc])).toEqual([['5U0807221', 'PARACHOQUE DIANTEIRO', '1', 900]]);
    expect(l.fo?.map((i) => i.codigo)).toEqual(['5U0941005']);
  });

  it('Cilia: T/P, tipo GENUINA, oficina × seguradora, número com % é desconto', () => {
    const t = `Yelum Seguradora Fornecimento
      T 1,00 P 2,00 1 5U0807221 GENUINA PARACHOQUE DIANTEIRO OFICINA R$ 1.000,00 R$ 1.000,00 10,00 %
      T - 2 5U0941005 FAROL ESQUERDO SEGURADORA -`;
    const l = lerTexto(t);
    expect(l.orcamento).toBe('CILIA');
    expect(l.oficina?.[0]).toMatchObject({ codigo: '5U0807221', qtd: '1', valorOrc: 900 });
    expect(l.fo?.[0]).toMatchObject({ codigo: '5U0941005', qtd: '2' });
  });

  it('Cilia: código grudado na descrição é separado (caso real RHV1E04)', () => {
    const l = lerTexto(`Fornecimento T - 1 0000001 100260230EMBLEMA DA GRADE OFICINA R$ 50,00`);
    expect(l.oficina?.[0]).toMatchObject({ codigo: '100260230', descricao: 'EMBLEMA DA GRADE' });
  });

  it('Websoma/Soma: compra pela oficina × lista das fornecidas pela seguradora', () => {
    const t = `PEÇAS - TROCA (COMPRA PELA OFICINA) Código Descrição Tipo Qde Vlr Desc Vlr PINTURA
      5U0807221 PARACHOQUE DIANT GENUINO 1 1.000,00 10,00 900,00
      LISTA DAS PEÇAS FORNECIDAS PELA SEGURADORA Código Descrição Qde Vlr Desc Vlr PINTURA
      5U0941005 FAROL ESQ 1 2.000,00 0,00 2.000,00
      RESUMO`;
    const l = lerTexto(t);
    expect(l.orcamento).toBe('WEBSOMA');
    expect(l.oficina?.[0]).toMatchObject({ codigo: '5U0807221', valorOrc: 900, dica: 'GENUÍNA' });
    expect(l.fo?.[0]).toMatchObject({ codigo: '5U0941005' });
  });

  it('pneu vira medida/marca (trecho real "PNEU LANVIGATOR 195/ 55 R15")', () => {
    const l = lerTexto(`Fornecimento T - 2 0000002 PNEU LANVIGATOR 195/ 55 R15 OFICINA R$ 400,00`);
    expect(l.oficina?.[0]).toMatchObject({ pneu: true, medida: '195/55R15' });
  });
});

describe('dados do veículo (trechos reais)', () => {
  it('Cilia: marca/modelo/ano', () => {
    const l = lerTexto('CASCO - CHEVROLET - CRUZE SEDAN (2017 A 2019) LT 1.4 16V TURBO 2017 Autorizado');
    expect(l.origem).toBe('cilia');
    expect(l.ano).toBe('2017');
    expect(l.modelo).toMatch(/CRUZE/);
  });
  it('HDI: Veiculo: código - modelo ano Placa:', () => {
    const l = lerTexto('Veiculo: 0016595 - CHEVROLET COBALT LTZ 1.8 8V ECONO.FLEX 4P AUT. 2015 Placa: ABC1D23');
    expect(l.origem).toBe('hdi');
    expect(l.ano).toBe('2015');
    expect(l.placas).toContain('ABC1D23');
  });
  it('chassi rotulado e placa', () => {
    const l = lerTexto('PLACA ABC1D23 CHASSI 9BWZZZ377VT004251 teste OCR');
    expect(l.chassis).toEqual(['9BWZZZ377VT004251']);
    expect(l.placas).toContain('ABC1D23');
  });
});

describe('documentos de fornecimento', () => {
  it('Status do Pedido do Cilia é reconhecido como FO', () => {
    expect(lerTexto('STATUS DO PEDIDO Peça Fornecedor Previsão de entrega').docNome).toBe('Status do Pedido Cilia');
  });
  it('Peças do sinistro do portal HDI é reconhecido como FO', () => {
    expect(lerTexto('Peças do Sinistro PEÇA Prev.Entrega Entrega Fornecedor').docNome).toBe('Peças HDI');
  });
  it('pareceres do Cilia: última atualização', () => {
    const d = R.pv_ultimaAtualizacaoCilia_('Última Atualização (17/09/26 - 15:22:11)') as Date;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
  });
});

describe('extração de texto', () => {
  it('tipo pelo conteúdo, mime ou nome', () => {
    expect(tipoArquivo('x.bin', null, Buffer.from('%PDF-1.4'))).toBe('pdf');
    expect(tipoArquivo('foto.JPG', null)).toBe('imagem');
    expect(tipoArquivo('nota.xml', 'text/xml')).toBe('outro');
  });

  const temPdftotext = (() => { try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; } })();
  it.skipIf(!temPdftotext)('PDF com texto: pdftotext gera as versões layout e simples, e a leitura escolhe a melhor', async () => {
    const pdf = pdfMinimo(['PECAS FORNECIDAS PELA OFICINA Codigo Descricao Qtd Unit Total Desconto (%)',
      '5U0807221 PARACHOQUE DIANTEIRO 1 1.000,00 1.000,00 10,00', 'OPERACOES']);
    const tx = await extrairTexto(pdf, 'orc.pdf', 'application/pdf');
    expect(tx.metodo).toBe('pdftotext');
    expect(Object.keys(tx.versoes).sort()).toEqual(['layout', 'simples']);
    const m = melhorLeitura(tx.versoes);
    expect(m?.leitura.orcamento).toBe('HDI');
    expect(m?.leitura.oficina?.[0]?.codigo).toBe('5U0807221');
  });
});

/** PDF de uma página com linhas de texto (Helvetica), montado à mão — só para o teste. */
function pdfMinimo(linhas: string[]): Buffer {
  const conteudo = 'BT /F1 9 Tf 20 800 Td 12 TL ' + linhas.map((l) => `(${l.replace(/[()\\]/g, '\\$&')}) '`).join(' ') + ' ET';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let s = '%PDF-1.4\n';
  const pos: number[] = [];
  objs.forEach((o, i) => { pos.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = s.length;
  s += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + pos.map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('');
  s += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(s, 'latin1');
}

describe('gabarito da conferência', () => {
  it('códigos importados do orçamento: só cards com a marca, sem pneu e sem complemento', async () => {
    const { codigosImportados } = await import('../src/leitores/anexos.js');
    const desc = ['**MODELO:** X', '', '**PEÇAS:**', '1. 5U0807221 | PARACHOQUE | GENUÍNA | ORÇ R$ 900,00',
      '2. PNEU | 195/55R15 | IMPORTADO', '3. 5U0941005 | FAROL | ORIGINAL | COMPLEMENTO 07/10', '4. 5U0-853-601 | GRADE | GENUÍNA', '',
      '**FORNECIMENTO (seguradora):** 2 peça(s)', '_Orçamento importado (CILIA)_'].join('\n');
    expect(codigosImportados(desc)).toEqual(['5U0807221', '5U0853601']);
    expect(codigosImportados(desc.replace('_Orçamento importado (CILIA)_', ''))).toEqual([]);
  });
});

describe('cor lida como nome de campo (TAJ0E65, 07/10/2026)', () => {
  const layout = 'DOLPHIN MINI GS EV ELÉTRICO 2025\n\nPlaca     Cor               Chassi         Quilometragem   Combustível\nTAJ0E65   -                 -              0               0/8\n';
  const simples = 'DOLPHIN MINI GS EV ELÉTRICO 2025\nPlaca\nTAJ0E65\n\nCor\n-\n\nChassi\n-\n\nQuilometragem\n0\n';
  it('a versão layout dá cor CHASSI (vício do texto lado a lado)', () => {
    expect(lerTexto(layout).cor).toBe('CHASSI');
  });
  it('a escolha fica com a versão sem esse vício', () => {
    const m = melhorLeitura({ layout, simples });
    expect(m?.versao).toBe('simples');
    expect(m?.leitura.cor || '').toBe('');
  });
});
