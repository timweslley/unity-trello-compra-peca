/**
 * Compra de Peça — servidor próprio (fase 0).
 * Rotas: GET /saude · HEAD|POST /trello/webhook · (fase 3) POST /api · (fase 3) login Google.
 */
import Fastify from 'fastify';
import { CFG } from './config.js';
import { migrar, consulta } from './db.js';
import { assinaturaValida, guardarAcao, type AcaoTrello } from './trello/webhook.js';
import { garantirWebhook, chamadasTrello } from './trello/api.js';

const INICIO = Date.now();
const VERSAO = process.env.GIT_SHA || process.env.K_REVISION || 'dev';
/** o que aconteceu na subida (aparece no /saude) */
const ESTADO = { migracao: 'não rodou', webhook: 'não configurado' };

export function criarApp() {
  const app = Fastify({ logger: { level: process.env.LOG_NIVEL || 'info' } });

  // o webhook precisa do corpo cru (texto) para conferir a assinatura
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, corpo, done) => done(null, corpo));

  app.get('/saude', async () => {
    let banco = 'sem DATABASE_URL';
    let acoes: { recebidas: number; ultima: string | null; ultimoTipo: string | null } | null = null;
    if (CFG.bancoUrl) {
      try { await consulta('SELECT 1'); banco = 'ok'; } catch (e) { banco = 'erro: ' + (e as Error).message; }
      if (banco === 'ok') {
        try {
          const [r] = await consulta<{ total: string; ultima: string | null; ultimo_tipo: string | null }>(
            `SELECT count(*)::text AS total, max(recebida_em)::text AS ultima,
                    (SELECT tipo FROM trello_acao ORDER BY recebida_em DESC LIMIT 1) AS ultimo_tipo FROM trello_acao`);
          acoes = { recebidas: Number(r.total), ultima: r.ultima, ultimoTipo: r.ultimo_tipo };
        } catch { /* tabela ainda não existe */ }
      }
    }
    const falta = [
      !CFG.bancoUrl && 'DATABASE_URL',
      !CFG.trello.chave && 'TRELLO_KEY',
      !CFG.trello.token && 'TRELLO_TOKEN',
      !CFG.trello.segredo && 'TRELLO_SEGREDO',
      !CFG.urlPublica && 'URL_PUBLICA',
    ].filter(Boolean);
    return { ok: true, versao: VERSAO, modo: CFG.modo, quadro: CFG.trello.quadro, banco, migracao: ESTADO.migracao, webhook: ESTADO.webhook, acoes,
      falta, chamadasTrello: chamadasTrello(), ativoHaSeg: Math.round((Date.now() - INICIO) / 1000) };
  });

  app.head('/trello/webhook', async (_req, resp) => { resp.code(200).send(); });

  app.post('/trello/webhook', async (req, resp) => {
    const corpo = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const url = CFG.urlPublica.replace(/\/$/, '') + '/trello/webhook';
    if (!assinaturaValida(corpo, url, req.headers['x-trello-webhook'] as string | undefined, CFG.trello.segredo)) {
      req.log.warn('webhook com assinatura inválida');
      return resp.code(401).send({ ok: false });
    }
    let dados: { action?: AcaoTrello };
    try { dados = JSON.parse(corpo); } catch { return resp.code(400).send({ ok: false }); }
    if (dados.action?.id) {
      try {
        const nova = await guardarAcao(dados.action, 'webhook', CFG.trello.quadro);
        req.log.info({ acao: dados.action.type, card: dados.action.data?.card?.id, nova }, 'ação do Trello');
      } catch (e) {
        req.log.error(e, 'falha ao guardar ação');   // responde 200 mesmo assim: o Trello não deve desativar o webhook
      }
    }
    return { ok: true };
  });

  return app;
}

async function principal() {
  const app = criarApp();
  // escuta primeiro: o Cloud Run só considera a revisão no ar quando a porta responde
  await app.listen({ port: CFG.porta, host: '0.0.0.0' });
  if (!CFG.bancoUrl) {
    app.log.warn('sem DATABASE_URL: no ar só com /saude');
    return;
  }
  try {
    const feitas = await migrar();
    ESTADO.migracao = feitas.length ? 'aplicadas: ' + feitas.join(', ') : 'em dia';
  } catch (e) {
    ESTADO.migracao = 'erro: ' + (e as Error).message;
    app.log.error(e, 'migração falhou');
    return;
  }
  if (!CFG.trello.segredo) app.log.warn('TRELLO_SEGREDO vazio: webhook aceita chamadas sem assinatura');
  if (CFG.urlPublica && CFG.trello.chave && CFG.trello.token) {
    try {
      const w = await garantirWebhook(CFG.trello.quadro, CFG.urlPublica, CFG.permitirPrincipal);
      await consulta(`INSERT INTO trello_webhook (id, quadro, url) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`, [w.id, w.quadroId, CFG.urlPublica + '/trello/webhook']);
      ESTADO.webhook = (w.novo ? 'criado ' : 'ativo ') + w.id;
      app.log.info({ webhook: w.id, novo: w.novo }, 'webhook do Trello garantido');
    } catch (e) {
      ESTADO.webhook = 'erro: ' + (e as Error).message;
      app.log.error(e, 'não consegui garantir o webhook do Trello');
    }
  }
}

const ehPrincipal = process.argv[1] && /index\.(ts|js)$/.test(process.argv[1]);
if (ehPrincipal) principal().catch((e) => { console.error(e); process.exit(1); });
