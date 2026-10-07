/**
 * Cliente da API do Trello (REST), com a chave/token do robô (conta sistema@).
 * Todas as chamadas passam por aqui para contar, registrar e repetir em caso de 429/5xx.
 */
import { CFG } from '../config.js';

const BASE = 'https://api.trello.com/1';

export interface OpcoesTrello {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** token de outro usuário (gravar em nome da pessoa) — senão o do robô */
  token?: string;
  tentativas?: number;
}

export class ErroTrello extends Error {
  constructor(public status: number, public caminho: string, corpo: string) {
    super(`Trello ${status} em ${caminho}: ${corpo.slice(0, 300)}`);
  }
}

let chamadas = 0;
export function chamadasTrello(): number { return chamadas; }

export async function trello<T = unknown>(caminho: string, o: OpcoesTrello = {}): Promise<T> {
  const url = new URL(BASE + caminho);
  url.searchParams.set('key', CFG.trello.chave);
  url.searchParams.set('token', o.token || CFG.trello.token);
  for (const [k, v] of Object.entries(o.query || {})) if (v !== undefined) url.searchParams.set(k, String(v));
  const max = o.tentativas ?? 3;
  let ultimo: Error | null = null;
  for (let i = 1; i <= max; i++) {
    chamadas++;
    const r = await fetch(url, {
      method: o.method || 'GET',
      headers: o.body ? { 'content-type': 'application/json' } : undefined,
      body: o.body ? JSON.stringify(o.body) : undefined,
    });
    if (r.ok) {
      const t = await r.text();
      return (t ? JSON.parse(t) : null) as T;
    }
    const corpo = await r.text();
    ultimo = new ErroTrello(r.status, caminho, corpo);
    // 429 (limite) e 5xx: espera e repete; 4xx: devolve na hora
    if (r.status !== 429 && r.status < 500) throw ultimo;
    await new Promise((ok) => setTimeout(ok, 500 * i * i));
  }
  throw ultimo;
}

/** Webhooks do Trello: cria um para o quadro apontando para <urlPublica>/trello/webhook, se ainda não existir. */
/** Quadro principal (produção). O servidor só liga nele com PERMITIR_PRINCIPAL=SIM (fase 5, virada). */
export const QUADRO_PRINCIPAL = { shortLink: 'oH4TbTqb', nome: 'Compra de Peça (principal)' };

/** Recusa o quadro principal sem liberação explícita — proteção contra configuração errada. */
export function conferirQuadroPermitido(quadro: { id?: string; shortLink?: string }, permitirPrincipal: boolean): void {
  if (quadro.shortLink === QUADRO_PRINCIPAL.shortLink && !permitirPrincipal) {
    throw new Error('quadro principal (oH4TbTqb) bloqueado: só com PERMITIR_PRINCIPAL=SIM, na virada (fase 5)');
  }
}

/**
 * Webhooks do Trello: cria um para o quadro apontando para <urlPublica>/trello/webhook, se ainda não existir.
 * `quadro` pode ser o código curto do link (ZX4gRmnX) ou o id longo: o Trello só aceita o id longo no webhook.
 */
export async function garantirWebhook(quadro: string, urlPublica: string, permitirPrincipal = false): Promise<{ id: string; novo: boolean; quadroId: string }> {
  const b = await trello<{ id: string; shortLink: string; name: string }>('/boards/' + encodeURIComponent(quadro), { query: { fields: 'id,shortLink,name' } });
  conferirQuadroPermitido(b, permitirPrincipal);
  const quadroId = b.id;
  const url = urlPublica.replace(/\/$/, '') + '/trello/webhook';
  const existentes = await trello<Array<{ id: string; idModel: string; callbackURL: string; active: boolean }>>('/tokens/' + CFG.trello.token + '/webhooks');
  const ja = existentes.find((w) => w.callbackURL === url && w.idModel === quadroId);
  if (ja) return { id: ja.id, novo: false, quadroId };
  const novo = await trello<{ id: string }>('/webhooks', { method: 'POST', body: { idModel: quadroId, callbackURL: url, description: 'Compra de Peça — servidor próprio (' + b.name + ')' } });
  return { id: novo.id, novo: true, quadroId };
}
