import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { assinaturaValida } from '../src/trello/webhook.js';
import { criarApp } from '../src/index.js';

const SEG = 'segredo-de-teste';
const URL = 'https://exemplo.run.app/trello/webhook';

describe('assinatura do webhook', () => {
  it('aceita a assinatura certa e recusa a errada', () => {
    const corpo = JSON.stringify({ action: { id: 'a1', type: 'updateCard' } });
    const ass = createHmac('sha1', SEG).update(corpo + URL).digest('base64');
    expect(assinaturaValida(corpo, URL, ass, SEG)).toBe(true);
    expect(assinaturaValida(corpo + ' ', URL, ass, SEG)).toBe(false);
    expect(assinaturaValida(corpo, URL, undefined, SEG)).toBe(false);
  });
  it('sem segredo configurado, aceita (desenvolvimento)', () => {
    expect(assinaturaValida('{}', URL, undefined, '')).toBe(true);
  });
});

describe('rotas', () => {
  it('/saude responde sem banco', async () => {
    const app = criarApp();
    const r = await app.inject({ method: 'GET', url: '/saude' });
    expect(r.statusCode).toBe(200);
    expect(r.json().ok).toBe(true);
    await app.close();
  });
  it('HEAD /trello/webhook responde 200 (registro do webhook)', async () => {
    const app = criarApp();
    const r = await app.inject({ method: 'HEAD', url: '/trello/webhook' });
    expect(r.statusCode).toBe(200);
    await app.close();
  });
});
