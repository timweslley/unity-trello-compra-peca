import { defineConfig } from 'vitest/config';
// os testes de banco usam o mesmo banco descartável: um arquivo de cada vez
export default defineConfig({ test: { fileParallelism: false } });
