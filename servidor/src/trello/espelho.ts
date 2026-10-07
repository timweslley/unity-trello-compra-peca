/**
 * Espelho do quadro no banco (fase 1). Só LÊ o Trello e grava no banco.
 *  - sincronizarQuadro: retrato completo (listas, etiquetas, campos, membros e todos os cards) — 5 chamadas.
 *  - atualizarCard: relê um card depois de cada ação que o webhook recebe (1 chamada).
 *  - importarHistorico: ações antigas do quadro, paginadas, sem duplicar o que já veio pelo webhook.
 */
import { trello, conferirQuadroPermitido } from './api.js';
import { consulta } from '../db.js';
import { guardarAcao, type AcaoTrello } from './webhook.js';

// ---------- tipos do Trello (só o que usamos) ----------
interface TLista { id: string; name: string; pos: number; closed: boolean }
interface TEtiqueta { id: string; name: string; color: string | null }
interface TCampoDef { id: string; name: string; type: string; options?: Array<{ id: string; value: { text: string } }> }
interface TMembro { id: string; username: string; fullName: string }
interface TCampoItem { idCustomField: string; idValue?: string | null; value?: { text?: string; number?: string; date?: string; checked?: string } | null }
export interface TCard {
  id: string; shortLink: string; name: string; desc: string; idList: string; idBoard: string;
  due: string | null; closed: boolean; dateLastActivity: string;
  labels?: TEtiqueta[]; checklists?: Array<{ id: string; name: string; pos: number; checkItems: Array<{ id: string; name: string; state: string; pos: number; due?: string | null }> }>;
  attachments?: Array<{ id: string; name: string; url: string; bytes: number | null; date: string; mimeType: string | null; idMember: string | null; isUpload: boolean }>;
  customFieldItems?: TCampoItem[]; idAttachmentCover?: string | null; cover?: unknown;
}

export interface MetaQuadro {
  id: string; shortLink: string; nome: string;
  listas: Map<string, string>;                      // id → nome
  campos: Map<string, { nome: string; tipo: string; opcoes: Map<string, string> }>;
}

const CAMPOS_CARD = 'id,shortLink,name,desc,idList,idBoard,due,closed,dateLastActivity,labels,idAttachmentCover,cover';
const PARAMS_CARD = {
  fields: CAMPOS_CARD, checklists: 'all', checklist_fields: 'name,pos', attachments: 'true',
  attachment_fields: 'name,url,bytes,date,mimeType,idMember,isUpload', customFieldItems: 'true',
} as const;

/** Data de criação embutida no id do Trello (os 8 primeiros hex = segundos desde 1970). */
export function dataDoId(id: string): Date | null {
  const s = parseInt(id.slice(0, 8), 16);
  return Number.isFinite(s) && s > 0 ? new Date(s * 1000) : null;
}

/** Converte os campos personalizados do card em { "Nome do campo": valor legível }. */
export function camposLegiveis(itens: TCampoItem[] | undefined, meta: MetaQuadro): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const it of itens || []) {
    const def = meta.campos.get(it.idCustomField);
    const nome = def?.nome || it.idCustomField;
    if (it.idValue) out[nome] = def?.opcoes.get(it.idValue) ?? it.idValue;
    else if (it.value?.number !== undefined) out[nome] = Number(it.value.number);
    else if (it.value?.checked !== undefined) out[nome] = it.value.checked === 'true';
    else if (it.value?.date !== undefined) out[nome] = it.value.date;
    else if (it.value?.text !== undefined) out[nome] = it.value.text;
    else out[nome] = null;
  }
  return out;
}

/** Linha da tabela trello_card a partir do card do Trello. */
export function linhaDoCard(c: TCard, meta: MetaQuadro) {
  return {
    id: c.id,
    quadro: c.idBoard,
    short_link: c.shortLink,
    nome: c.name,
    lista_id: c.idList,
    lista_nome: meta.listas.get(c.idList) ?? null,
    desc_trello: c.desc ?? '',
    due: c.due,
    fechado: !!c.closed,
    etiquetas: (c.labels || []).map((l) => ({ id: l.id, nome: l.name, cor: l.color })),
    checklists: (c.checklists || []).sort((a, b) => a.pos - b.pos).map((cl) => ({
      id: cl.id, nome: cl.name,
      itens: (cl.checkItems || []).sort((a, b) => a.pos - b.pos).map((i) => ({ id: i.id, nome: i.name, feito: i.state === 'complete', due: i.due ?? null })),
    })),
    anexos: (c.attachments || []).map((a) => ({ id: a.id, nome: a.name, url: a.url, bytes: a.bytes, data: a.date, tipo: a.mimeType, membro: a.idMember, upload: a.isUpload })),
    campos: camposLegiveis(c.customFieldItems, meta),
    ultima_atividade: c.dateLastActivity,
    criado_em: dataDoId(c.id)?.toISOString() ?? null,
    capa: c.idAttachmentCover ? { anexo: c.idAttachmentCover } : null,
  };
}

async function gravarCard(c: TCard, meta: MetaQuadro): Promise<void> {
  const l = linhaDoCard(c, meta);
  await consulta(
    `INSERT INTO trello_card (id, quadro, short_link, nome, lista_id, lista_nome, desc_trello, due, fechado, etiquetas, checklists, anexos, campos,
                              ultima_atividade, criado_em, capa, cru, atualizado_em, excluido_em)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now(), NULL)
     ON CONFLICT (id) DO UPDATE SET quadro=EXCLUDED.quadro, short_link=EXCLUDED.short_link, nome=EXCLUDED.nome, lista_id=EXCLUDED.lista_id,
       lista_nome=EXCLUDED.lista_nome, desc_trello=EXCLUDED.desc_trello, due=EXCLUDED.due, fechado=EXCLUDED.fechado, etiquetas=EXCLUDED.etiquetas,
       checklists=EXCLUDED.checklists, anexos=EXCLUDED.anexos, campos=EXCLUDED.campos, ultima_atividade=EXCLUDED.ultima_atividade,
       criado_em=COALESCE(trello_card.criado_em, EXCLUDED.criado_em), capa=EXCLUDED.capa, cru=EXCLUDED.cru, atualizado_em=now(), excluido_em=NULL`,
    [l.id, l.quadro, l.short_link, l.nome, l.lista_id, l.lista_nome, l.desc_trello, l.due, l.fechado, JSON.stringify(l.etiquetas),
      JSON.stringify(l.checklists), JSON.stringify(l.anexos), JSON.stringify(l.campos), l.ultima_atividade, l.criado_em,
      l.capa ? JSON.stringify(l.capa) : null, JSON.stringify(c)],
  );
}

// ---------- metadados do quadro (com cache curto em memória) ----------
let metaCache: { meta: MetaQuadro; em: number } | null = null;

export async function lerMetaQuadro(quadro: string, permitirPrincipal: boolean, forcar = false): Promise<MetaQuadro> {
  if (!forcar && metaCache && Date.now() - metaCache.em < 10 * 60_000 && (metaCache.meta.shortLink === quadro || metaCache.meta.id === quadro)) return metaCache.meta;
  const b = await trello<{ id: string; shortLink: string; name: string }>('/boards/' + encodeURIComponent(quadro), { query: { fields: 'id,shortLink,name' } });
  conferirQuadroPermitido(b, permitirPrincipal);
  const [listas, etiquetas, campos, membros] = await Promise.all([
    trello<TLista[]>(`/boards/${b.id}/lists`, { query: { filter: 'all', fields: 'name,pos,closed' } }),
    trello<TEtiqueta[]>(`/boards/${b.id}/labels`, { query: { fields: 'name,color', limit: 1000 } }),
    trello<TCampoDef[]>(`/boards/${b.id}/customFields`),
    trello<TMembro[]>(`/boards/${b.id}/members`, { query: { fields: 'username,fullName' } }),
  ]);
  const meta: MetaQuadro = {
    id: b.id, shortLink: b.shortLink, nome: b.name,
    listas: new Map(listas.map((l) => [l.id, l.name])),
    campos: new Map(campos.map((c) => [c.id, { nome: c.name, tipo: c.type, opcoes: new Map((c.options || []).map((o) => [o.id, o.value.text])) }])),
  };
  await consulta(
    `INSERT INTO trello_quadro (id, short_link, nome, listas, etiquetas, campos_def, membros, sincronizado_em) VALUES ($1,$2,$3,$4,$5,$6,$7, now())
     ON CONFLICT (id) DO UPDATE SET short_link=EXCLUDED.short_link, nome=EXCLUDED.nome, listas=EXCLUDED.listas, etiquetas=EXCLUDED.etiquetas,
       campos_def=EXCLUDED.campos_def, membros=EXCLUDED.membros, sincronizado_em=now()`,
    [b.id, b.shortLink, b.name,
      JSON.stringify(listas.sort((x, y) => x.pos - y.pos).map((l) => ({ id: l.id, nome: l.name, pos: l.pos, fechada: l.closed }))),
      JSON.stringify(etiquetas.map((e) => ({ id: e.id, nome: e.name, cor: e.color }))),
      JSON.stringify(campos.map((c) => ({ id: c.id, nome: c.name, tipo: c.type, opcoes: Object.fromEntries((c.options || []).map((o) => [o.id, o.value.text])) }))),
      JSON.stringify(membros.map((m) => ({ id: m.id, username: m.username, nome: m.fullName })))],
  );
  metaCache = { meta, em: Date.now() };
  return meta;
}

export function esquecerMeta(): void { metaCache = null; }

// ---------- sincronização completa ----------
async function registrar<T>(tipo: string, quadro: string, fn: () => Promise<T>): Promise<T> {
  const [s] = await consulta<{ id: string }>(`INSERT INTO sincronizacao (tipo, quadro) VALUES ($1,$2) RETURNING id`, [tipo, quadro]);
  try {
    const r = await fn();
    await consulta(`UPDATE sincronizacao SET fim=now(), ok=true, resumo=$2 WHERE id=$1`, [s.id, JSON.stringify(r)]);
    return r;
  } catch (e) {
    await consulta(`UPDATE sincronizacao SET fim=now(), ok=false, erro=$2 WHERE id=$1`, [s.id, (e as Error).message]);
    throw e;
  }
}

export async function sincronizarQuadro(quadro: string, permitirPrincipal: boolean) {
  return registrar('quadro', quadro, async () => {
    const meta = await lerMetaQuadro(quadro, permitirPrincipal, true);
    const cards = await trello<TCard[]>(`/boards/${meta.id}/cards/all`, { query: { ...PARAMS_CARD } });
    for (const c of cards) await gravarCard(c, meta);
    // card que está no banco mas sumiu do Trello (excluído sem a ação ter chegado)
    const ids = cards.map((c) => c.id);
    const sumidos = await consulta<{ id: string }>(
      `UPDATE trello_card SET excluido_em = now() WHERE quadro = $1 AND excluido_em IS NULL AND NOT (id = ANY($2::text[])) RETURNING id`, [meta.id, ids]);
    return { cards: cards.length, abertos: cards.filter((c) => !c.closed).length, listas: meta.listas.size, sumidos: sumidos.length };
  });
}

/** Relê um card depois de uma ação do webhook. Card excluído → marca a data. */
export async function atualizarCard(cardId: string, quadro: string, permitirPrincipal: boolean): Promise<'ok' | 'excluido'> {
  const meta = await lerMetaQuadro(quadro, permitirPrincipal);
  try {
    const c = await trello<TCard>(`/cards/${cardId}`, { query: { ...PARAMS_CARD } });
    if (c.idBoard !== meta.id) {                      // card saiu deste quadro (movido para outro)
      await consulta(`UPDATE trello_card SET excluido_em = now() WHERE id = $1`, [cardId]);
      return 'excluido';
    }
    if (!meta.listas.has(c.idList)) await lerMetaQuadro(quadro, permitirPrincipal, true); // lista nova
    await gravarCard(c, metaCache?.meta ?? meta);
    return 'ok';
  } catch (e) {
    if ((e as { status?: number }).status === 404) {
      await consulta(`UPDATE trello_card SET excluido_em = now() WHERE id = $1`, [cardId]);
      return 'excluido';
    }
    throw e;
  }
}

/** Ações que mudam a estrutura do quadro (listas, etiquetas, campos): reler os metadados. */
export function mudaMetaQuadro(tipo: string): boolean {
  return /^(createList|updateList|moveListToBoard|moveListFromBoard|createLabel|updateLabel|deleteLabel|createCustomField|updateCustomField|deleteCustomField|addMemberToBoard|removeMemberFromBoard|makeNormalMemberOfBoard|makeAdminOfBoard)$/.test(tipo);
}

// ---------- histórico ----------
export async function importarHistorico(quadro: string, permitirPrincipal: boolean, maxPaginas = 50) {
  return registrar('historico', quadro, async () => {
    const meta = await lerMetaQuadro(quadro, permitirPrincipal);
    let antes: string | undefined;
    let lidas = 0, novas = 0, paginas = 0;
    while (paginas < maxPaginas) {
      const pag = await trello<AcaoTrello[]>(`/boards/${meta.id}/actions`, {
        query: { filter: 'all', limit: 1000, before: antes, memberCreator_fields: 'username,fullName' },
      });
      paginas++;
      if (!pag.length) break;
      for (const a of pag) {
        lidas++;
        if (await guardarAcao(a, 'importacao', meta.id)) novas++;
      }
      antes = pag[pag.length - 1].id;
      if (pag.length < 1000) break;
    }
    // quem criou cada card (primeira ação de criação/cópia)
    await consulta(`
      UPDATE trello_card c SET criado_por = x.membro_user
      FROM (SELECT DISTINCT ON (card_id) card_id, membro_user FROM trello_acao
            WHERE tipo IN ('createCard','copyCard','convertToCardFromCheckItem','moveCardToBoard') AND card_id IS NOT NULL
            ORDER BY card_id, data ASC) x
      WHERE c.id = x.card_id AND c.criado_por IS NULL AND x.membro_user IS NOT NULL`);
    return { paginas, lidas, novas, completo: paginas < maxPaginas };
  });
}

/** Resumo para o /saude. */
export async function resumoEspelho() {
  const [c] = await consulta<{ cards: string; abertos: string; excluidos: string }>(
    `SELECT count(*)::text AS cards, count(*) FILTER (WHERE NOT fechado AND excluido_em IS NULL)::text AS abertos,
            count(*) FILTER (WHERE excluido_em IS NOT NULL)::text AS excluidos FROM trello_card`);
  const ult = await consulta<{ tipo: string; inicio: string; ok: boolean | null; resumo: unknown; erro: string | null }>(
    `SELECT DISTINCT ON (tipo) tipo, inicio::text, ok, resumo, erro FROM sincronizacao ORDER BY tipo, inicio DESC`);
  return {
    cards: Number(c.cards), abertos: Number(c.abertos), excluidos: Number(c.excluidos),
    ultimas: Object.fromEntries(ult.map((u) => [u.tipo, { quando: u.inicio, ok: u.ok, resumo: u.resumo, erro: u.erro }])),
  };
}
