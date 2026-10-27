/* Configuração do Power-Up "Pedido de Peça Unity".
 * URL_APP  = web app do Apps Script (implantação atual) — servidor (doPost {fn,args}).
 * URL_FORM = formulário estático no GitHub Pages (abre em <1 s; chama URL_APP por fetch).
 * CHAVE    = chave de API do Trello usada pelo Apps Script (a mesma; o token
 *            gerado aqui precisa ser dessa chave para o robô aceitar).
 */
window.PU_CFG = {
  URL_APP: 'https://script.google.com/macros/s/AKfycbwkTI6PgPTe8OgIcyxzk5oysMvK2BvWwIQEdh5vhOY2n44KlVJvmeHdXTU1HQ3I5BoQew/exec',
  URL_FORM: 'https://timweslley.github.io/unity-trello-compra-peca/powerup/formulario.html',
  /* 07/10/2026: servidor próprio (Google Cloud Run). Só os quadros listados em QUADROS_SERVIDOR usam ele;
   * os demais (o principal) continuam no Apps Script (URL_APP). */
  URL_SERVIDOR: 'https://compra-peca-858550421734.southamerica-east1.run.app/api',
  QUADROS_SERVIDOR: ['ZX4gRmnX'],
  /* 16/10/2026: quadros que abrem o formulário 2.0 (visual e telas novas) sem passar pelo servidor (gravações no Apps Script).
   * VIRADA DO PRINCIPAL: acrescentar 'oH4TbTqb' aqui E ligar a propriedade VD_V2=SIM no Apps Script. Voltar: tirar os dois. */
  QUADROS_V2: ['oH4TbTqb'],   // 17/10/2026 03h57 — virada do principal (Weslley: "faça já")
  /* 07/10/2026: no quadro PRINCIPAL, leituras de navegação (abrir, carregar card, buscar placa) pelo servidor próprio,
   * com volta automática ao Apps Script se ele não responder. Por usuário; 'todos' libera a equipe inteira. */
  /* 09/10/2026 16:10 — DESLIGADO até o servidor corrigir: o trabalhador do servidor guarda a aba TRAVA (descrição
   * completa dos cards) em memória e nunca relê — devolvia cotações/autorizações velhas ao formulário (TBU8D71, BAT9F19:
   * "sem cotação lançada" na aba Autorizar com a cotação já no card). Ver docs/LEITURA-PELO-SERVIDOR.md.
   * Antes: 'todos' (08/10/2026 23:20). Para religar: 'todos' ou { usuarios: ['timweslley'] }.
   * 09/10/2026 16:30 — RELIGADO para todos: causa achada e corrigida no servidor (f72afe5 — variáveis globais do robô,
   * como VD_CMP_MEM, agora nascem de novo a cada chamada); 10 cards do principal conferidos, cotações iguais ao Google.
   * Para desligar de novo: { usuarios: [] }. */
  LEITURA_SERVIDOR: 'todos',
  /* 10/10/2026 (pedido do Weslley: abrir card < 1 s): no principal, o servidor guarda o card/a TRAVA e só confere com uma consulta
   * leve se mudou (resposta igual à do Google; 50 cards conferidos). Primeiro só estes usuários; depois 'todos'.
   * Para desligar: { usuarios: [] }. */
  LEITURA_GUARDADA: 'todos',   // 10/10/2026 17:12 — Weslley liberou para a equipe toda (antes: timweslley, christianfarias23)
  /* 17/10/2026 (Weslley 03h57: "fazer imediatamente"): gravações do principal pelo servidor, com as propriedades e a planilha
   * do robô do Google (passo 2 da virada). Primeiro só quem está na lista; depois 'todos'. Desligar: { usuarios: [] }. */
  GRAVACAO_SERVIDOR: 'todos',   // 17/10 08h35 — RELIGADO (Weslley: "fazer já") com as licenças das travas indo ao Apps Script (3bafc2b)
  /* 19/10/2026: botões "📋 Copiar lista para WhatsApp" (Cotação) e "Pedidos por fornecedor" (Compra) — só leitura.
   * 'teste' = só no quadro TESTE; 'todos' = liga no principal (com OK do Weslley); qualquer outro valor desliga. */
  COPIAR_WHATS: 'todos',   // 20/10/2026 00h10 — Weslley: "colocar no principal" (voltar: 'teste')
  /* 19/10/2026: telas que faltavam no padrão 2.0 — resultado do envio, carregando, erro ao abrir e login.
   * 'teste' = só no quadro TESTE; 'todos' = liga no principal (com OK do Weslley); qualquer outro valor desliga. */
  TELAS_FINAIS: 'todos',   // 20/10/2026 00h10 — Weslley: "colocar no principal" (voltar: 'teste')
  /* 20/10/2026: visual 2.0 da seção e da janela do Power-Up: 'todos' liga no principal (sem a chave: só no TESTE). */
  SECAO_V2: 'todos',
  /* 20/10/2026: ajustes visuais do celular (topo sem corte, previsão como selo + "Chegou tudo" no recebimento, botão do rodapé
   * sem corte, barra do WhatsApp sem subtítulo). 'teste' = só no TESTE; 'todos' = principal (com OK do Weslley). */
  VISUAL_CEL: 'todos',   // 20/10/2026 23h20 — Weslley: "se tiver ok dá pra por no principal" (conferido no TESTE nas 4 telas; voltar: 'teste')
  /* 22/10/2026 (Weslley): peça particular/retorno sem código precisa de foto da peça (📷 em cada peça do pedido).
   * 'teste' = só no TESTE; 'todos' = principal (com OK do Weslley + propriedade VD_FOTO_PECA=SIM no robô); outro valor desliga. */
  FOTO_PECA: 'teste',
  /* 26/10/2026 (Weslley): aba Cotação — comprador corrige o código da peça (botão "Código") e põe obs. em cada cotação.
   * 'teste' = só no TESTE; 'todos' = principal (com OK do Weslley); outro valor desliga (a obs. já gravada continua aparecendo). */
  COT_CODIGO_OBS: 'todos',   // 26/10/2026 11h09 — Weslley: "pode publicar no principal" (voltar: 'teste')
  /* 27/10/2026 (Weslley): cotação de KIT — um preço para várias peças, valor dividido entre elas; na autorização, kit × avulsas.
   * 'teste' = só no TESTE; 'todos' = principal (com OK do Weslley); outro valor desliga (o selo 🧩 das linhas já gravadas continua). */
  COT_KIT: 'teste',
  CHAVE: '0a1a64b229b408a84f2e1d673a3c1da5',
  NOME: 'Pedido de Peça Unity',
  /* true só depois que o Apps Script v23 (rid anti-duplicação no doPost) estiver implantado:
   * libera chamadas em paralelo também nas gravações. */
  SERVIDOR_RID: true,
  /* visual novo (tema "trello") em avaliação: só estes usuários veem; vazio = ninguém */
  TEMA_TRELLO_USUARIOS: []   // 05/10/2026: visual arquivado — ninguém vê o tema; para testar de novo, pôr o usuário aqui
};
