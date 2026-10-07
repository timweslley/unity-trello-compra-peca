/**
 * Leitura de um documento já em texto — os MESMOS passos de vd_lerAnexoTrello_ (Validacao.gs) do robô,
 * sem o cache e o download (que ficam em anexos.ts). As regras de leitura vêm sem alteração de robo.js.
 */
import * as R from './robo.js';

export interface ItemOrc {
  pneu: boolean; codigo?: string; descricao?: string; qtd?: string; dica?: string; valorOrc?: number;
  medida?: string; marca?: string; categoria?: string; fornecedor?: string; previsao?: string;
}
export interface Leitura {
  chassis: string[]; placas: string[]; placasRot?: string[]; modelo?: string; ano?: string; motor?: string; origem?: string;
  cor?: string; seguradora?: string; sinistro?: string;
  /** 'HDI' | 'WEBSOMA' | 'CILIA' | '' */
  orcamento: string;
  doc?: 'FO'; docNome?: string;
  /** [codigo, fornecedor, previsao] das FO que o orçamento já traz (grupo Porto) */
  foi?: string[][];
  /** peças completas do orçamento (oficina e fornecidas pela seguradora) */
  oficina?: ItemOrc[]; fo?: ItemOrc[];
}

/** Lê um texto como o robô lê. */
export function lerTexto(texto: string): Leitura {
  const r = R.vd_extrair_(texto) as unknown as Leitura;
  const orc = R.vd_lerOrcamento_(texto) as { origem: string; oficina: ItemOrc[]; fo: ItemOrc[]; cor: string; seguradora: string; sinistro: string };
  r.cor = orc.cor; r.seguradora = orc.seguradora; r.sinistro = orc.sinistro; r.orcamento = orc.origem;
  if (!orc.origem) {
    const nt = R.vd_normTexto_(texto) as string;
    if (/STATUS DO PEDIDO|PREVISAO DE ENTREGA/.test(nt)) { r.doc = 'FO'; r.docNome = 'Status do Pedido Cilia'; }
    else if (/PECAS DO SINISTRO|PECAS DO LAUDO/.test(nt)) { r.doc = 'FO'; r.docNome = 'Peças HDI'; }
  }
  if (orc.origem) {
    try {
      if (R.pv_enriquecerFo_(texto, orc.fo)) r.foi = orc.fo.filter((x) => x.fornecedor || x.previsao).map((x) => [x.codigo || '', x.fornecedor || '', x.previsao || '']);
    } catch { /* igual ao robô: falha no enriquecimento não derruba a leitura */ }
    r.oficina = orc.oficina; r.fo = orc.fo;
  }
  return r;
}

/** Quanto uma leitura "rendeu" — para escolher entre as versões do texto (layout × simples). */
export function rendimento(l: Leitura): number {
  return (l.oficina?.length || 0) * 10 + (l.fo?.length || 0) * 10 + (l.foi?.length || 0) * 3 + (l.orcamento ? 50 : 0) + (l.doc ? 20 : 0) +
    (l.chassis?.length ? 5 : 0) + (l.placas?.length ? 5 : 0) + (l.modelo ? 2 : 0) - (corEhRotulo(l.cor) ? 3 : 0);
}

/**
 * Na versão 'layout' os cabeçalhos de uma tabela ficam lado a lado ("Placa  Cor  Chassi") e o robô lia a cor como
 * "CHASSI" (07/10/2026, TAJ0E65). O texto do Google não tinha esse vício; aqui a versão que dá cor = nome de campo
 * perde pontos, e a outra ('simples', cabeçalho e valor em linhas próprias) ganha.
 */
export function corEhRotulo(cor?: string): boolean {
  return /^(CHASSI|PLACA|KM|QUILOMETRAGEM|COMBUSTIVEL|MODELO|MARCA|ANO|FABRICACAO|MOTOR|RENAVAM|CLIENTE|OFICINA|VERSAO)$/.test(String(cor || ''));
}

/** Lê todas as versões do texto e fica com a que rende mais (empate: a primeira, 'layout'). */
export function melhorLeitura(versoes: Record<string, string>): { versao: string; leitura: Leitura } | null {
  let melhor: { versao: string; leitura: Leitura; n: number } | null = null;
  for (const [versao, texto] of Object.entries(versoes)) {
    if (!texto?.trim()) continue;
    const leitura = lerTexto(texto);
    const n = rendimento(leitura);
    if (!melhor || n > melhor.n) melhor = { versao, leitura, n };
  }
  return melhor && { versao: melhor.versao, leitura: melhor.leitura };
}

/** Classe de um documento que não é orçamento nem fornecimento (só para conferência): nunca devolve o texto. */
export function classificar(texto: string, l: Leitura | null): string {
  if (l?.orcamento) return 'orçamento ' + l.orcamento;
  if (l?.docNome) return l.docNome;
  const U = R.vd_normTexto_(texto || '') as string;
  if (!U.trim()) return 'sem texto';
  if (/NFS-?E|NOTA FISCAL DE SERVICO|PRESTADOR DE SERVICO/.test(U)) return 'nota de serviço';
  if (/DANFE|NOTA FISCAL ELETRONICA|CHAVE DE ACESSO/.test(U)) return 'nota fiscal';
  if (/CERTIFICADO DE REGISTRO|CRLV|DOCUMENTO DE LICENCIAMENTO/.test(U)) return 'documento do veículo';
  if (/ORDEM DE SERVICO|O\.S\. N/.test(U)) return 'O.S.';
  if (/MERCADO ?LIVRE|MERCADO PAGO/.test(U)) return 'compra Mercado Livre';
  if (/ORCAMENTO|SINISTRO|SEGURADORA|CILIA|WEBSOMA/.test(U)) return 'ORÇAMENTO/SINISTRO NÃO RECONHECIDO';
  return 'outro';
}
