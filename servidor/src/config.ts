/**
 * Configuração por variáveis de ambiente (no Cloud Run: Secret Manager → variáveis).
 * Nada de segredo em arquivo; em desenvolvimento, um `.env` local (ignorado pelo git).
 */
import 'dotenv/config';

function obrigatoria(nome: string): string {
  const v = process.env[nome];
  if (!v) throw new Error(`Falta a variável de ambiente ${nome}`);
  return v;
}

/**
 * Lê uma variável tratando como vazia o valor-semente "PREENCHER" (os segredos nascem assim no
 * Secret Manager): o servidor sobe só com /saude até cada valor real ser cadastrado.
 */
export function valor(nome: string): string {
  const v = (process.env[nome] || '').trim();
  return /^PREENCHER$/i.test(v) ? '' : v;
}

export const CFG = {
  /** Porta que o Cloud Run injeta (PORT); 8080 em desenvolvimento. */
  porta: Number(process.env.PORT || 8080),
  /** Endereço público do servidor — o Trello chama <URL_PUBLICA>/trello/webhook. */
  urlPublica: valor('URL_PUBLICA'),
  /** Postgres (Neon/Supabase): postgres://usuario:senha@host/banco?sslmode=require */
  bancoUrl: valor('DATABASE_URL'),
  trello: {
    chave: valor('TRELLO_KEY'),
    token: valor('TRELLO_TOKEN'),
    /** segredo da chave de API (Power-Up admin → "Secret"): assina os webhooks */
    segredo: valor('TRELLO_SEGREDO'),
    /** quadro em uso: ZX4gRmnX (TESTE) ou oH4TbTqb (principal) */
    quadro: process.env.TRELLO_QUADRO || 'ZX4gRmnX',
  },
  /** 'OBSERVAR' = só grava no banco, nunca mexe no Trello; 'ATIVO' = aplica as regras */
  modo: (process.env.MODO || 'OBSERVAR') as 'OBSERVAR' | 'ATIVO',
  obrigatoria,
};
