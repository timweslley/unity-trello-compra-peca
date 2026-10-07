/**
 * Compra de Peça — servidor próprio.
 * Rotas: GET /saude · HEAD|POST /trello/webhook · POST /tarefas/sincronizar · (fase 3) POST /api + login Google.
 * O Cloud Run só dá CPU durante uma requisição: todo trabalho (atualizar card, sincronizar) é feito DENTRO dela.
 */
import Fastify from 'fastify';
import { CFG } from './config.js';
import { migrar, consulta } from './db.js';
import { assinaturaValida, guardarAcao, type AcaoTrello } from './trello/webhook.js';
import { garantirWebhook, chamadasTrello, trello } from './trello/api.js';
import { importarPlanilha } from './google/planilha.js';
import { conferirLeitores, lerAnexo, anexoLegivel, VERSAO_LEITOR, type AnexoCard } from './leitores/anexos.js';
import { classificar } from './leitores/leitura.js';
import { executarPost, ultimasExecucoes, usosDaMemoria, esquecerMemoria } from './gas/ponte.js';
import { atualizarCard, sincronizarQuadro, importarHistorico, lerMetaQuadro, mudaMetaQuadro, resumoEspelho } from './trello/espelho.js';

/** ações que não mudam o card (o texto fica em trello_acao / view comentario) */
const SO_COMENTARIO = /^(commentCard|updateComment|deleteComment|addMemberToCard|removeMemberFromCard)$/;
/** retrato completo do quadro a cada 30 min, no máximo, aproveitando a chegada de uma ação */
const INTERVALO_SINC_MS = 30 * 60_000;
let sincEmAndamento: Promise<unknown> | null = null;
let ultimaSinc = 0;

async function sincronizarTudo(log: { error: (e: unknown, m: string) => void }, comHistorico: boolean) {
  if (sincEmAndamento) return sincEmAndamento;
  sincEmAndamento = (async () => {
    const quadro = await sincronizarQuadro(CFG.trello.quadro, CFG.permitirPrincipal);
    let historico: unknown = null;
    if (comHistorico) historico = await importarHistorico(CFG.trello.quadro, CFG.permitirPrincipal);
    // planilha do robô (descrição completa + eventos): erro aqui não derruba o resto
    let planilha: unknown = null;
    if (CFG.planilhaId) {
      try { planilha = await importarPlanilha(CFG.planilhaId); } catch (e) { planilha = { erro: (e as Error).message }; }
    }
    ultimaSinc = Date.now();
    return { quadro, historico, planilha };
  })().catch((e) => { log.error(e, 'sincronização falhou'); throw e; }).finally(() => { sincEmAndamento = null; });
  return sincEmAndamento;
}

function trelloPronto(): boolean {
  return !!(CFG.bancoUrl && CFG.trello.chave && CFG.trello.token);
}

const INICIO = Date.now();
const VERSAO = process.env.GIT_SHA || process.env.K_REVISION || 'dev';
/** o que aconteceu na subida (aparece no /saude) */
const ESTADO = { migracao: 'não rodou', webhook: 'não configurado' };
/** resolve quando as migrações terminam (a /api espera: o trabalhador lê tabelas criadas por elas) */
let bancoPronto!: () => void;
const BANCO_PRONTO = new Promise<void>((ok) => { bancoPronto = ok; });

export function criarApp() {
  const app = Fastify({ logger: { level: process.env.LOG_NIVEL || 'info' } });

  // o webhook precisa do corpo cru (texto) para conferir a assinatura
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, corpo, done) => done(null, corpo));
  // o formulário manda text/plain (assim o navegador não faz a consulta prévia de CORS)
  app.addContentTypeParser('text/plain', { parseAs: 'string' }, (_req, corpo, done) => done(null, corpo));

  app.get('/saude', async () => {
    let banco = 'sem DATABASE_URL';
    let acoes: { recebidas: number; ultima: string | null; ultimoTipo: string | null } | null = null;
    let espelho: unknown = null;
    if (CFG.bancoUrl) {
      try { await consulta('SELECT 1'); banco = 'ok'; } catch (e) { banco = 'erro: ' + (e as Error).message; }
      if (banco === 'ok') {
        try {
          const [r] = await consulta<{ total: string; ultima: string | null; ultimo_tipo: string | null }>(
            `SELECT count(*)::text AS total, max(recebida_em)::text AS ultima,
                    (SELECT tipo FROM trello_acao ORDER BY recebida_em DESC LIMIT 1) AS ultimo_tipo FROM trello_acao`);
          acoes = { recebidas: Number(r.total), ultima: r.ultima, ultimoTipo: r.ultimo_tipo };
          espelho = await resumoEspelho();
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
    return { ok: true, versao: VERSAO, modo: CFG.modo, quadro: CFG.trello.quadro, banco, migracao: ESTADO.migracao, webhook: ESTADO.webhook, acoes, espelho,
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
    const a = dados.action;
    if (a?.id) {
      try {
        const nova = await guardarAcao(a, 'webhook', CFG.trello.quadro);
        req.log.info({ acao: a.type, card: a.data?.card?.id, nova }, 'ação do Trello');
        if (nova && trelloPronto()) {
          // espelho: relê o que a ação mudou (dentro da requisição — é quando o Cloud Run dá CPU)
          if (mudaMetaQuadro(a.type)) { esquecerMemoria(); await lerMetaQuadro(CFG.trello.quadro, CFG.permitirPrincipal, true); }
          const cardId = a.data?.card?.id;
          if (cardId && !SO_COMENTARIO.test(a.type)) await atualizarCard(cardId, CFG.trello.quadro, CFG.permitirPrincipal);
          if (Date.now() - ultimaSinc > INTERVALO_SINC_MS) await sincronizarTudo(req.log, false);
          await consulta(`UPDATE trello_acao SET processada_em = now() WHERE id = $1`, [a.id]);
        }
      } catch (e) {
        req.log.error(e, 'falha ao processar ação');   // responde 200 mesmo assim: o Trello não deve desativar o webhook
      }
    }
    return { ok: true };
  });

  /**
   * Retrato completo do quadro (+ histórico de ações com ?historico=1). Só LÊ o Trello e grava no banco;
   * no máximo uma vez a cada 2 minutos. Usado depois de publicar e por um agendador (fase 1, parte 2).
   */
  app.post('/tarefas/sincronizar', async (req, resp) => {
    if (!trelloPronto()) return resp.code(503).send({ ok: false, erro: 'falta configuração (ver /saude)' });
    if (!sincEmAndamento && Date.now() - ultimaSinc < 2 * 60_000) return resp.code(429).send({ ok: false, erro: 'sincronizado há menos de 2 minutos' });
    const historico = (req.query as Record<string, string>)?.historico === '1';
    try {
      const r = await sincronizarTudo(req.log, historico);
      return { ok: true, ...(r as object) };
    } catch (e) {
      return resp.code(500).send({ ok: false, erro: (e as Error).message });
    }
  });

  /**
   * Fase 3 — o formulário: mesmo pedido que ia ao Apps Script ({fn, args, rid}), mesma resposta ({ok, r} | {ok:false, erro}).
   * Quem responde é o próprio código do robô (recursos/formulario.gs.js) rodando com os serviços do Google imitados.
   */
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
  app.options('/api', async (_req, resp) => resp.headers(cors).code(204).send());
  app.post('/api', async (req, resp) => {
    resp.headers(cors).type('application/json; charset=utf-8');
    if (!trelloPronto()) return JSON.stringify({ ok: false, erro: 'Servidor sem configuração (ver /saude).' });
    try {
      await Promise.race([BANCO_PRONTO, new Promise((_, n) => setTimeout(() => n(new Error('banco ainda iniciando, tente de novo')), 20_000))]);
      return await executarPost(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));
    } catch (e) {
      req.log.error(e, 'api');
      return JSON.stringify({ ok: false, erro: 'Erro no servidor: ' + (e as Error).message });
    }
  });

  /**
   * Fase 2 — conferência dos leitores: lê os anexos dos cards do quadro e compara as peças lidas com o que o robô
   * gravou (descrição completa e checklist FORNECIMENTO). Resposta só com contagens e códigos de card.
   * Processa até ?segundos=N (padrão 200) e para; chamar de novo continua (o que já foi lido vem do banco).
   */
  let conferindo = false;
  app.post('/tarefas/conferir-leitores', async (req, resp) => {
    if (!trelloPronto()) return resp.code(503).send({ ok: false, erro: 'falta configuração (ver /saude)' });
    if (conferindo) return resp.code(429).send({ ok: false, erro: 'conferência em andamento' });
    const seg = Math.min(250, Math.max(10, Number((req.query as Record<string, string>)?.segundos) || 200));
    conferindo = true;
    try { return { ok: true, versaoLeitor: VERSAO_LEITOR, ...(await conferirLeitores(seg * 1000)) }; }
    catch (e) { return resp.code(500).send({ ok: false, erro: (e as Error).message }); }
    finally { conferindo = false; }
  });

  /** Tempo de ida e volta daqui até o Trello e até o banco (mediana de N chamadas seguidas) — para escolher a região. */
  app.get('/tarefas/latencia', async () => {
    const n = 8;
    const medir = async (f: () => Promise<unknown>) => {
      const t: number[] = [];
      for (let i = 0; i < n; i++) { const t0 = performance.now(); try { await f(); } catch { /* conta o tempo mesmo assim */ } t.push(Math.round(performance.now() - t0)); }
      const o = [...t].sort((a, b) => a - b);
      return { mediana: o[Math.floor(n / 2)], min: o[0], max: o[n - 1] };
    };
    const regiao = process.env.K_SERVICE ? (await fetch('http://metadata.google.internal/computeMetadata/v1/instance/region', { headers: { 'Metadata-Flavor': 'Google' } }).then((r) => r.text()).catch(() => '?')) : 'local';
    return {
      ok: true, regiao,
      trello: trelloPronto() ? await medir(() => trello(`/boards/${CFG.trello.quadro}`, { query: { fields: 'id' }, tentativas: 1 })) : null,
      banco: CFG.bancoUrl ? await medir(() => consulta('SELECT 1')) : null,
    };
  });

  /** Últimas execuções do código do formulário: função, espera na fila, duração e chamadas por destino (sem dados de card). */
  app.get('/tarefas/execucoes', async () => ({ ok: true, memoria: usosDaMemoria(), execucoes: ultimasExecucoes() }));

  /** Leitura dos anexos de UM card (pelo código do link): só dados de peças, sem placa/chassi/nomes. ?forcar=1 relê. */
  app.get('/tarefas/leitura/:card', async (req, resp) => {
    if (!trelloPronto()) return resp.code(503).send({ ok: false });
    const { card } = req.params as { card: string };
    const forcar = (req.query as Record<string, string>)?.forcar === '1';
    const [c] = await consulta<{ id: string; anexos: AnexoCard[]; checklists: Array<{ nome: string; itens: Array<{ nome: string; feito: boolean }> }> }>(
      `SELECT id, anexos, checklists FROM trello_card WHERE short_link = $1`, [card]);
    if (!c) return resp.code(404).send({ ok: false, erro: 'card não está no espelho' });
    const saida = [];
    for (const a of c.anexos.filter(anexoLegivel).slice(-6)) {
      const r = await lerAnexo(c.id, a, forcar);
      const l = r.leitura;
      const [info] = await consulta<{ metodo: string; versao_texto: string; tipo: string; ms: number; texto: string | null }>(
        `SELECT metodo, versao_texto, tipo, ms, texto FROM anexo_leitura WHERE anexo_id = $1`, [a.id]);
      const { texto, ...semTexto } = info || ({} as typeof info);
      saida.push({
        anexo: a.id, ...semTexto, classe: classificar(texto || '', l), doCache: r.doCache, erro: r.erro, pontos: r.pontos,
        orcamento: l?.orcamento || '', documento: l?.docNome || '', seguradora: l?.seguradora || '',
        oficina: (l?.oficina || []).map((i) => (i.pneu ? ['PNEU', i.medida, i.marca, i.qtd] : [i.codigo, i.descricao, i.qtd, i.valorOrc ?? null])),
        fo: (l?.fo || []).map((i) => [i.codigo, i.descricao, i.qtd, i.fornecedor || '', i.previsao || '']),
      });
    }
    return {
      ok: true, versaoLeitor: VERSAO_LEITOR, anexos: saida,
      checklistFornecimento: (c.checklists || []).filter((cl) => /FORNEC/i.test(cl.nome)).flatMap((cl) => cl.itens.map((i) => i.nome)),
    };
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
    bancoPronto();
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
