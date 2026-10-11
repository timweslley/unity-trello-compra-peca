/**
 * Rodada diária do Cilia (Cloud Run Job "cilia-sync"): uma passada por casa, volume baixo.
 *  1. lista os orçamentos de seguradora criados nos últimos DIAS dias (paginação por cursor);
 *  2. grava/atualiza cada um no banco (schema cilia);
 *  3. só para o que é NOVO ou MUDOU (versão, status ou conclusão) baixa o detalhe — peças, totais e o PDF oficial;
 *  4. salva o PDF no Drive compartilhado (uma vez por versão) e deixa o resumo do dia para a rotina.
 *
 * Variáveis: CILIA_TOKEN_TOLEDO / _CASCAVEL / _RONDON / _MOURAO (Secret Manager), DATABASE_URL, DRIVE_PASTA_ID,
 * CASAS (opcional, ex. "TOLEDO" para testar uma casa), DIAS (120), MAX_DETALHES (60), CILIA_PAUSA_MS (1200).
 */
import { criarCliente, resumoLista, assinatura, detalheSemArquivos, pecas as extrairPecas, ErroCilia } from './cilia.mjs';
import * as db from './banco.mjs';
import * as drive from './drive.mjs';

const TODAS = ['TOLEDO', 'CASCAVEL', 'RONDON', 'MOURAO'];
const NOME_CASA = { TOLEDO: 'Toledo', CASCAVEL: 'Cascavel', RONDON: 'Rondon', MOURAO: 'Campo Mourão' };

const limpo = (v) => { const s = (v || '').trim(); return /^PREENCHER$/i.test(s) ? '' : s; };
const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d); };
const nomeArquivo = (s) => String(s).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();

export async function rodar({ cliente: fabricaCliente = criarCliente, banco = db, gdrive = drive, env = process.env } = {}) {
  const casas = (env.CASAS ? env.CASAS.split(',').map((s) => s.trim().toUpperCase()) : TODAS).filter((c) => TODAS.includes(c));
  const DIAS = Number(env.DIAS || 120);
  let restante = Number(env.MAX_DETALHES || 60);
  const pastaRaiz = limpo(env.DRIVE_PASTA_ID);
  const hoje = hojeSP();
  const resumo = { gerado_em: new Date().toISOString(), data: hoje, casas: {}, chamadas: 0, detalhes: 0, pdfs: 0, pendentes: 0 };

  await banco.preparar();
  const pastaPdf = pastaRaiz ? await gdrive.garantirPasta(pastaRaiz, 'PDF') : null;

  for (const casa of casas) {
    const out = { casa: NOME_CASA[casa], orcamentos: 0, novos: [], mudaram: [], pdfs: [], pendentes: 0, erro: null };
    resumo.casas[casa] = out;
    const token = limpo(env['CILIA_TOKEN_' + casa]);
    if (!token) { out.erro = 'token não cadastrado'; continue; }
    const cli = fabricaCliente(token);
    try {
      const lista = await cli.listar({ inicio: diasAtras(DIAS), fim: hoje });
      const antes = await banco.lerOrcamentos(casa);
      const candidatos = [];
      for (const b of lista) {
        const r = resumoLista(b);
        if (!r.budget_id) continue;
        const sig = assinatura(r);
        const ant = antes.get(String(r.budget_id));
        await banco.gravarOrcamento(casa, r, sig);
        out.orcamentos++;
        if (!ant) out.novos.push(`${r.placa} ${r.numero_versao || ''}`.trim());
        else if (ant.assinatura !== sig) out.mudaram.push(`${r.placa} ${ant.numero_versao || ''} → ${r.numero_versao || ''} (${r.status_texto || r.status || ''}${r.conclusao ? ' · ' + r.conclusao : ''})`);
        if (!ant || ant.assinatura_detalhe !== sig) candidatos.push({ r, sig });
      }
      // o que mexeu por último vem primeiro; o resto fica para a próxima rodada
      candidatos.sort((a, b) => String(b.r.status_data || '').localeCompare(String(a.r.status_data || '')));
      for (const { r, sig } of candidatos) {
        if (restante <= 0) { out.pendentes++; continue; }
        if (!r.sinistro || r.orcamento == null) { await banco.marcarDetalhe(casa, r.budget_id, sig); continue; }
        restante--;
        const d = await cli.detalhe({ sinistro: r.sinistro, orcamento: r.orcamento, versao: r.versao });
        resumo.detalhes++;
        let pdfId = null, pdfNome = null;
        if (pastaPdf && d?.report_pdf) {
          const pastaCasa = await gdrive.garantirPasta(pastaPdf, NOME_CASA[casa]);
          pdfNome = nomeArquivo(`${r.placa} - ${r.seguradora || 'SEGURADORA'} - Cilia ${r.numero_versao || r.orcamento}.pdf`);
          pdfId = await gdrive.gravar(pastaCasa, pdfNome, Buffer.from(d.report_pdf, 'base64'), 'application/pdf');
          out.pdfs.push(pdfNome);
          resumo.pdfs++;
        }
        await banco.gravarVersao(casa, r, detalheSemArquivos(d), { pecas: extrairPecas(d), pdfId, pdfNome });
        await banco.marcarDetalhe(casa, r.budget_id, sig);
      }
    } catch (e) {
      out.erro = e instanceof ErroCilia
        ? (e.status === 401 || e.status === 403 ? `token recusado pelo Cilia (${e.status}): ${String(e.message).replace(/^Cilia \d+ em [^:]+: /,'').slice(0,160)}` : e.status === 429 ? 'Cilia pediu para diminuir o ritmo (429) — parado nesta casa' : e.message)
        : String(e.message || e);
    }
    resumo.chamadas += cli.chamadas;
    resumo.pendentes += out.pendentes;
  }

  // resumo do dia para a rotina (o banco é a fonte; o arquivo é a porta de leitura enquanto o sistema interno não opera)
  if (pastaRaiz) {
    const retrato = {};
    for (const casa of casas) retrato[casa] = (await banco.retrato(casa)).map((l) => ({
      placa: l.placa, veiculo: l.veiculo, seguradora: l.seguradora, sinistro: l.sinistro, orcamento: l.orcamento,
      numero_versao: l.numero_versao, tipo_versao: l.tipo_versao, status: l.status_texto || l.status, status_data: l.status_data,
      conclusao: l.conclusao, criado_em: l.criado_em, atualizado_em: l.atualizado_em,
      versao_baixada: l.versao_baixada, pdf: l.pdf_drive_id ? { nome: l.pdf_nome, id: l.pdf_drive_id } : null,
      pecas: l.pecas || [],
    }));
    const conteudo = JSON.stringify({ ...resumo, orcamentos: retrato }, null, 1);
    await gdrive.gravar(pastaRaiz, 'CILIA-HOJE.json', conteudo, 'application/json');
    const pastaDia = await gdrive.garantirPasta(pastaRaiz, 'Diario');
    await gdrive.gravar(pastaDia, `CILIA-${hoje}.json`, JSON.stringify(resumo, null, 1), 'application/json');
  }
  await banco.sql(`INSERT INTO cilia.execucao (fim, chamadas, detalhes, pdfs, resumo) VALUES (now(), $1, $2, $3, $4)`,
    [resumo.chamadas, resumo.detalhes, resumo.pdfs, JSON.stringify(resumo)]);
  return resumo;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rodar().then(async (r) => {
    for (const [casa, c] of Object.entries(r.casas)) {
      console.log(`${casa}: ${c.erro ? 'ERRO ' + c.erro : `${c.orcamentos} orçamentos, ${c.novos.length} novos, ${c.mudaram.length} mudaram, ${c.pdfs.length} PDFs, ${c.pendentes} pendentes`}`);
    }
    console.log(`total: ${r.chamadas} chamadas ao Cilia, ${r.detalhes} detalhes, ${r.pdfs} PDFs`);
    await db.fechar();
    const todasFalharam = Object.values(r.casas).length > 0 && Object.values(r.casas).every((c) => c.erro);
    process.exit(todasFalharam ? 1 : 0);
  }).catch(async (e) => { console.error('falhou:', e.message || e); await db.fechar(); process.exit(1); });
}
