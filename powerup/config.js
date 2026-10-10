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
  LEITURA_GUARDADA: { usuarios: ['timweslley', 'christianfarias23'] },
  CHAVE: '0a1a64b229b408a84f2e1d673a3c1da5',
  NOME: 'Pedido de Peça Unity',
  /* true só depois que o Apps Script v23 (rid anti-duplicação no doPost) estiver implantado:
   * libera chamadas em paralelo também nas gravações. */
  SERVIDOR_RID: true,
  /* visual novo (tema "trello") em avaliação: só estes usuários veem; vazio = ninguém */
  TEMA_TRELLO_USUARIOS: []   // 05/10/2026: visual arquivado — ninguém vê o tema; para testar de novo, pôr o usuário aqui
};
