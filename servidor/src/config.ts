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

export const CFG = {
  /** Porta que o Cloud Run injeta (PORT); 8080 em desenvolvimento. */
  porta: Number(process.env.PORT || 8080),
  /** Endereço público do servidor — o Trello chama <URL_PUBLICA>/trello/webhook. */
  urlPublica: process.env.URL_PUBLICA || '',
  /** Postgres (Neon/Supabase): postgres://usuario:senha@host/banco?sslmode=require */
  bancoUrl: process.env.DATABASE_URL || '',
  trello: {
    chave: process.env.TRELLO_KEY || '',
    token: process.env.TRELLO_TOKEN || '',
    /** segredo da chave de API (Power-Up admin → "Secret"): assina os webhooks */
    segredo: process.env.TRELLO_SEGREDO || '',
    /** quadro em uso: ZX4gRmnX (TESTE) ou oH4TbTqb (principal) */
    quadro: process.env.TRELLO_QUADRO || 'ZX4gRmnX',
  },
  /** 'OBSERVAR' = só grava no banco, nunca mexe no Trello; 'ATIVO' = aplica as regras */
  modo: (process.env.MODO || 'OBSERVAR') as 'OBSERVAR' | 'ATIVO',
  obrigatoria,
};
