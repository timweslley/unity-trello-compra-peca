/**
 * Rodada diária do Cilia NO PC DO WESLLEY (Windows, tarefa agendada 00:15).
 * Por quê no PC: o firewall do Cilia devolve 403 para endereços de data center (Google Cloud); do PC a API responde.
 * Mesma lógica do job da nuvem, com arquivos no lugar do banco:
 *  - estado em <SAIDA>/estado.json (assinatura de cada orçamento + última versão baixada, peças e PDF);
 *  - PDF oficial em <SAIDA>/PDF/<casa>/<PLACA> - <SEGURADORA> - Cilia <nº.versão>.pdf (uma vez por versão);
 *  - <SAIDA>/CILIA-HOJE.json (retrato completo para a rotina) e <SAIDA>/Diario/CILIA-AAAA-MM-DD.json (o que mudou).
 * SAIDA = pasta do Google Drive sincronizada (G:\Meu Drive\Arquivos de IA\Claude\Rotina Unity\Cilia).
 * Tokens: variáveis CILIA_TOKEN_<CASA>, preenchidas pelo rodar.ps1 a partir do cofre criptografado do Windows (DPAPI).
 */
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { criarCliente, resumoLista, assinatura, pecas as extrairPecas, ErroCilia } from '../src/cilia.mjs';

const TODAS = ['TOLEDO', 'CASCAVEL', 'RONDON', 'MOURAO'];
const NOME_CASA = { TOLEDO: 'Toledo', CASCAVEL: 'Cascavel', RONDON: 'Rondon', MOURAO: 'Campo Mourão' };
const limpo = (v) => { const s = (v || '').trim(); return /^PREENCHER$/i.test(s) ? '' : s; };
const fmt = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const nomeArquivo = (s) => String(s).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();

async function lerJson(arq, padrao) { try { return JSON.parse(await readFile(arq, 'utf8')); } catch { return padrao; } }
async function gravarJson(arq, obj) {
  await mkdir(path.dirname(arq), { recursive: true });
  const tmp = arq + '.tmp';
  await writeFile(tmp, JSON.stringify(obj, null, 1), 'utf8');
  await rename(tmp, arq);
}

export async function rodarPC({ env = process.env, fabricaCliente = criarCliente, fs = { writeFile, mkdir } } = {}) {
  const SAIDA = env.CILIA_SAIDA;
  if (!SAIDA) throw new Error('CILIA_SAIDA não definida');
  const casas = (env.CASAS ? env.CASAS.split(',').map((s) => s.trim().toUpperCase()) : TODAS).filter((c) => TODAS.includes(c));
  const DIAS = Number(env.DIAS || 120);
  let restante = Number(env.MAX_DETALHES || 60);
  const hoje = fmt(new Date());
  const arqEstado = path.join(SAIDA, 'estado.json');
  const estado = await lerJson(arqEstado, {});
  const resumo = { gerado_em: new Date().toISOString(), data: hoje, origem: 'PC Weslley', casas: {}, chamadas: 0, detalhes: 0, pdfs: 0, pendentes: 0 };

  for (const casa of casas) {
    const out = { casa: NOME_CASA[casa], orcamentos: 0, novos: [], mudaram: [], pdfs: [], pendentes: 0, erro: null };
    resumo.casas[casa] = out;
    estado[casa] ||= {};
    const token = limpo(env['CILIA_TOKEN_' + casa]);
    if (!token) { out.erro = 'token não cadastrado'; continue; }
    const cli = fabricaCliente(token);
    try {
      const lista = await cli.listar({ inicio: diasAtras(DIAS), fim: hoje });
      const candidatos = [];
      for (const b of lista) {
        const r = resumoLista(b);
        if (!r.budget_id) continue;
        const sig = assinatura(r);
        const ant = estado[casa][r.budget_id];
        if (!ant) out.novos.push(`${r.placa} ${r.numero_versao || ''}`.trim());
        else if (ant.assinatura !== sig) out.mudaram.push(`${r.placa} ${ant.numero_versao || ''} → ${r.numero_versao || ''} (${r.status_texto || r.status || ''}${r.conclusao ? ' · ' + r.conclusao : ''})`);
        estado[casa][r.budget_id] = {
          ...(ant || {}), ...r, assinatura: sig, visto_em: resumo.gerado_em,
          atualizado_em: !ant || ant.assinatura !== sig ? resumo.gerado_em : ant.atualizado_em,
        };
        out.orcamentos++;
        if (!ant || ant.assinatura_detalhe !== sig) candidatos.push({ r, sig });
      }
      candidatos.sort((a, b) => String(b.r.status_data || '').localeCompare(String(a.r.status_data || '')));
      for (const { r, sig } of candidatos) {
        const reg = estado[casa][r.budget_id];
        if (restante <= 0) { out.pendentes++; continue; }
        if (!r.sinistro || r.orcamento == null) { reg.assinatura_detalhe = sig; continue; }
        restante--;
        const d = await cli.detalhe({ sinistro: r.sinistro, orcamento: r.orcamento, versao: r.versao });
        resumo.detalhes++;
        reg.pecas = extrairPecas(d);
        reg.totais = d?.totals_version ?? d?.totals ?? null;
        reg.conclusao_detalhe = d?.conclusion ? {
          titulo: d.conclusion.conclusion_type_title, motivo: d.conclusion.reason_title, data: d.conclusion.created_at,
          autor: d.conclusion.author_name, texto: d.conclusion.description,
        } : null;
        reg.versao_baixada = r.numero_versao;
        if (d?.report_pdf) {
          const pasta = path.join(SAIDA, 'PDF', NOME_CASA[casa]);
          await fs.mkdir(pasta, { recursive: true });
          const nome = nomeArquivo(`${r.placa} - ${r.seguradora || 'SEGURADORA'} - Cilia ${r.numero_versao || r.orcamento}.pdf`);
          await fs.writeFile(path.join(pasta, nome), Buffer.from(d.report_pdf, 'base64'));
          reg.pdf = `PDF/${NOME_CASA[casa]}/${nome}`;
          out.pdfs.push(nome); resumo.pdfs++;
        }
        reg.assinatura_detalhe = sig;
        reg.detalhe_em = resumo.gerado_em;
      }
    } catch (e) {
      out.erro = e instanceof ErroCilia
        ? (e.status === 401 || e.status === 403 ? `token recusado pelo Cilia (${e.status})` : e.status === 429 ? 'Cilia pediu para diminuir o ritmo (429) — parado nesta casa' : e.message)
        : String(e.message || e);
    }
    resumo.chamadas += cli.chamadas;
    resumo.pendentes += out.pendentes;
  }

  await gravarJson(arqEstado, estado);
  const retrato = {};
  for (const casa of Object.keys(estado)) {
    retrato[casa] = Object.values(estado[casa])
      .sort((a, b) => String(b.atualizado_em || '').localeCompare(String(a.atualizado_em || '')))
      .map(({ assinatura: _a, assinatura_detalhe: _b, ...resto }) => resto);
  }
  await gravarJson(path.join(SAIDA, 'CILIA-HOJE.json'), { ...resumo, orcamentos: retrato });
  await gravarJson(path.join(SAIDA, 'Diario', `CILIA-${hoje}.json`), resumo);
  return resumo;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || import.meta.url === `file://${process.argv[1]}`) {
  rodarPC().then((r) => {
    const linhas = Object.entries(r.casas).map(([casa, c]) => `${casa}: ${c.erro ? 'ERRO ' + c.erro : `${c.orcamentos} orçamentos, ${c.novos.length} novos, ${c.mudaram.length} mudaram, ${c.pdfs.length} PDFs, ${c.pendentes} pendentes`}`);
    console.log([...linhas, `total: ${r.chamadas} chamadas ao Cilia, ${r.detalhes} detalhes, ${r.pdfs} PDFs`].join('\n'));
    process.exit(Object.values(r.casas).every((c) => c.erro) ? 1 : 0);
  }).catch((e) => { console.error('falhou:', e.message || e); process.exit(1); });
}
