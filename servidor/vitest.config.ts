import { defineConfig } from 'vitest/config';
// os testes de banco usam o mesmo banco descartável: um arquivo de cada vez.
// TZ igual ao servidor: os leitores do robô montam datas no horário de São Paulo.
export default defineConfig({ test: { fileParallelism: false, env: { TZ: 'America/Sao_Paulo' } } });
