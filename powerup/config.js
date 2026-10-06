/* Configuração do Power-Up "Pedido de Peça Unity".
 * URL_APP  = web app do Apps Script (implantação atual) — servidor (doPost {fn,args}).
 * URL_FORM = formulário estático no GitHub Pages (abre em <1 s; chama URL_APP por fetch).
 * CHAVE    = chave de API do Trello usada pelo Apps Script (a mesma; o token
 *            gerado aqui precisa ser dessa chave para o robô aceitar).
 */
window.PU_CFG = {
  URL_APP: 'https://script.google.com/macros/s/AKfycbwkTI6PgPTe8OgIcyxzk5oysMvK2BvWwIQEdh5vhOY2n44KlVJvmeHdXTU1HQ3I5BoQew/exec',
  URL_FORM: 'https://timweslley.github.io/unity-trello-compra-peca/powerup/formulario.html',
  CHAVE: '0a1a64b229b408a84f2e1d673a3c1da5',
  NOME: 'Pedido de Peça Unity',
  /* true só depois que o Apps Script v23 (rid anti-duplicação no doPost) estiver implantado:
   * libera chamadas em paralelo também nas gravações. */
  SERVIDOR_RID: true,
  /* visual novo (tema "trello") em avaliação: só estes usuários veem; vazio = ninguém */
  TEMA_TRELLO_USUARIOS: []   // 05/10/2026: visual arquivado — ninguém vê o tema; para testar de novo, pôr o usuário aqui
};
