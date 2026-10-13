/**
 * Cliente da API oficial do Cilia (Integração Oficina — documentação de 25/09/2026).
 * Autenticação: header `auth_token` com o token da unidade. Sem login, sem navegador.
 * Volume baixo de propósito (orientação da Cilia): pausa entre chamadas e limite por rodada.
 */
export const BASE = process.env.CILIA_BASE || 'https://gateway-oficinas.cilia.com.br';
const PAUSA_MS = Number(process.env.CILIA_PAUSA_MS || 1200);

export class ErroCilia extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Monta a query string. Os colchetes do Cilia (date_range[start_date]) vão CODIFICADOS (%5B %5D): o gateway (Tomcat)
 *  devolve 400 "Bad Request" para colchete cru no endereço (13/10/2026, teste no PC do Weslley). */
export function query(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

export function criarCliente(token, { fetchFn = fetch, pausaMs = PAUSA_MS } = {}) {
  token = String(token || '').replace(/\s+/g, '');   // espaço/quebra de linha que vem junto ao colar
  let chamadas = 0;
  async function get(caminho, params) {
    if (chamadas > 0 && pausaMs) await dormir(pausaMs);
    chamadas++;
    const url = `${BASE}${caminho}?${query(params)}`;
    const r = await fetchFn(url, { headers: { auth_token: token, accept: 'application/json' } });
    const texto = await r.text();
    if (!r.ok) throw new ErroCilia(r.status, `Cilia ${r.status} em ${caminho}: ${texto.slice(0, 200)}`);
    try { return JSON.parse(texto); } catch { throw new ErroCilia(r.status, `Cilia devolveu algo que não é JSON em ${caminho}`); }
  }

  return {
    get chamadas() { return chamadas; },

    /** Lista orçamentos de seguradora criados no intervalo, com paginação por cursor. */
    async listar({ inicio, fim, porPagina = 50, maxPaginas = 20 }) {
      const todos = [];
      let cursor = null;
      for (let p = 1; p <= maxPaginas; p++) {
        const params = cursor
          ? { budget_types: 'InsurerBudget', date_type: 'creation', 'date_range[start_date]': inicio, 'date_range[end_date]': fim, per_page: porPagina, cursor }
          : { budget_types: 'InsurerBudget', date_type: 'creation', 'date_range[start_date]': inicio, 'date_range[end_date]': fim, page: 1, per_page: porPagina };
        const j = await get('/external/budgets/external-partners/budgets', params);
        const lista = Array.isArray(j?.budgets) ? j.budgets : [];
        todos.push(...lista);
        cursor = j?.pagination_info?.next_cursor || null;
        if (!cursor || lista.length === 0) break;
      }
      return todos;
    },

    /** Detalhe de um orçamento de seguradora (peças, totais, conclusão e o PDF oficial em base64). */
    async detalhe({ sinistro, orcamento, versao }) {
      return get('/external/budgets/external-partners/insurer-budgets',
        { casualty_number: sinistro, budget_number: orcamento, version_number: versao });
    },
  };
}

/** Resumo compacto de um item da lista — o que a rotina precisa ler todo dia. */
export function resumoLista(b) {
  return {
    budget_id: b.budget_id,
    placa: (b.vehicle?.license_plate || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
    veiculo: b.vehicle?.vehicle_name || null,
    seguradora: b.insurer?.trade || null,
    sinistro: b.casualty_number || null,
    orcamento: b.budget_number ?? null,
    versao: b.budget_version ?? null,
    numero_versao: b.number_with_version || null,
    tipo_versao: b.budget_version_name || null,
    status: b.budget_current_status?.current_status || null,
    status_texto: b.budget_current_status?.current_i18n_status || null,
    status_data: b.budget_current_status?.date || null,
    conclusao: b.conclusion_title || null,
    conclusao_chave: b.conclusion_key || null,
    criado_em: b.budget_created_at || null,
    oficina: b.workshop?.trade || null,
    responsavel: b.responsible_user_name || null,
  };
}

/** Assinatura do que aparece na listagem (versão, status, conclusão) — mostra no resumo o que mudou. */
export function assinatura(r) {
  return [r.numero_versao, r.status, r.conclusao_chave].map((x) => x ?? '').join('|');
}

/** Assinatura que dispara baixar o detalhe/PDF de novo: só versão nova (complemento/supervisão) ou conclusão nova.
 *  Mudança de status no caminho (em análise, analisado…) não baixa de novo (13/10/2026). */
export function assinaturaDetalhe(r) {
  return [r.numero_versao, r.conclusao_chave].map((x) => x ?? '').join('|');
}

/** Só vale baixar o detalhe quando o orçamento dispara compra/serviço (Weslley, 13/10/2026): autorizado pela seguradora
 *  (conclusão "authorized" — inclui "VIDE PORTAL DA CIA" e "Reparo(s) Autorizado(s)" — ou título "Autorizado…", ex.:
 *  "Autorizado Acordo") ou em supervisão (versão "Supervisão" ou conclusão "supervision"). Não autorizado, indenização
 *  integral, cancelado, vistoria não realizada e sem conclusão ficam só na listagem. */
export function disparaCompra(r) {
  const chave = String(r.conclusao_chave || '').toLowerCase();
  if (chave === 'authorized' || chave === 'supervision') return true;
  if (/^supervis/i.test(String(r.tipo_versao || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) return true;
  return !chave && /^autorizad/i.test(String(r.conclusao || '').trim());
}

/** Detalhe sem os arquivos pesados (PDF/HTML em base64), para guardar no banco. */
export function detalheSemArquivos(d) {
  if (!d || typeof d !== 'object') return d;
  const { report_pdf, report_html, albums, ...resto } = d;
  return { ...resto, albuns: Array.isArray(albums) ? albums.length : 0 };
}

/** Peças do detalhe num formato curto (código, nome, quem fornece, quantidade, valor). */
export function pecas(d) {
  const lista = Array.isArray(d?.budget_version_budgetings) && d.budget_version_budgetings.length
    ? d.budget_version_budgetings : (Array.isArray(d?.budgetings) ? d.budgetings : []);
  return lista.filter((x) => x && (x.code || x.name)).map((x) => ({
    codigo: x.code || null,
    nome: x.name || null,
    fornece: x.supplier_type === 'insurer' ? 'SEGURADORA' : x.supplier_type === 'workshop' ? 'OFICINA' : (x.supplier_type || null),
    troca: !!x.exchange_used,
    cobertura: x.budgeting_type || null,
    qtd: x.quantity ?? null,
    valor_unit: x.selling_cost ?? null,
  }));
}
