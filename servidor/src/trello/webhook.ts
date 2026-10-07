/**
 * Webhook do Trello.
 *  - HEAD /trello/webhook: o Trello faz isso ao criar o webhook; tem de responder 200.
 *  - POST /trello/webhook: uma ação por chamada. A assinatura é HMAC-SHA1 (base64) de (corpo + callbackURL)
 *    com o segredo da chave de API, no cabeçalho x-trello-webhook. Sem segredo configurado, aceita (só em desenvolvimento).
 *  Grava a ação crua em trello_acao e responde 200 na hora; o processamento é feito depois (fila), para o Trello
 *  nunca esperar e nunca desativar o webhook por demora.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { consulta } from '../db.js';

export function assinaturaValida(corpoCru: string, urlCallback: string, assinatura: string | undefined, segredo: string): boolean {
  if (!segredo) return true;
  if (!assinatura) return false;
  const esperada = createHmac('sha1', segredo).update(corpoCru + urlCallback).digest('base64');
  const a = Buffer.from(esperada), b = Buffer.from(assinatura);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface AcaoTrello {
  id: string;
  type: string;
  date: string;
  idMemberCreator?: string;
  memberCreator?: { id: string; username?: string; fullName?: string };
  data?: { board?: { id: string }; card?: { id: string; shortLink?: string; name?: string }; [k: string]: unknown };
}

/** Guarda a ação; devolve false se já existia (o Trello pode reenviar). */
export async function guardarAcao(a: AcaoTrello, origem: 'webhook' | 'varredura' | 'importacao', quadroPadrao: string): Promise<boolean> {
  const r = await consulta(
    `INSERT INTO trello_acao (id, quadro, tipo, card_id, membro_id, membro_user, data, origem, corpo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING RETURNING id`,
    [a.id, a.data?.board?.id || quadroPadrao, a.type, a.data?.card?.id || null, a.idMemberCreator || a.memberCreator?.id || null,
      a.memberCreator?.username || null, a.date, origem, JSON.stringify(a)],
  );
  return r.length > 0;
}
