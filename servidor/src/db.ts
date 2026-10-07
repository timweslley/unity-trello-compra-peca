/**
 * Conexão com o Postgres e migrações simples: cada arquivo em migrations/NNN_nome.sql roda uma vez,
 * em ordem, e fica registrado na tabela `migracao`.
 */
import { Pool, type QueryResultRow } from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CFG } from './config.js';

let pool: Pool | null = null;

export function banco(): Pool {
  if (!pool) {
    if (!CFG.bancoUrl) throw new Error('DATABASE_URL não configurada');
    pool = new Pool({ connectionString: CFG.bancoUrl, max: 5, ssl: /sslmode=require/.test(CFG.bancoUrl) ? { rejectUnauthorized: false } : undefined });
  }
  return pool;
}

export async function consulta<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await banco().query<T>(sql, params);
  return r.rows;
}

/** Aplica as migrações pendentes. Idempotente: pode rodar a cada subida do servidor. */
export async function migrar(): Promise<string[]> {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
  await consulta(`CREATE TABLE IF NOT EXISTS migracao (nome text PRIMARY KEY, aplicada_em timestamptz NOT NULL DEFAULT now())`);
  const feitas = new Set((await consulta<{ nome: string }>(`SELECT nome FROM migracao`)).map((r) => r.nome));
  const arquivos = (await readdir(dir)).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();
  const aplicadas: string[] = [];
  for (const f of arquivos) {
    if (feitas.has(f)) continue;
    const sql = await readFile(path.join(dir, f), 'utf8');
    const cli = await banco().connect();
    try {
      await cli.query('BEGIN');
      await cli.query(sql);
      await cli.query(`INSERT INTO migracao (nome) VALUES ($1)`, [f]);
      await cli.query('COMMIT');
      aplicadas.push(f);
    } catch (e) {
      await cli.query('ROLLBACK');
      throw new Error(`migração ${f} falhou: ${(e as Error).message}`);
    } finally {
      cli.release();
    }
  }
  return aplicadas;
}

export async function fecharBanco(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}
