# Versão 2.0 — pacote da virada (layout, formulário, servidor, manual)

**Início: 07/10/2026 · pedido do Weslley: "quando virarmos, já termos o pacote completo".**
Tudo é montado e testado no quadro **TESTE** (laboratório). O principal só muda no dia da virada (fase 5 do `PROJETO-SERVIDOR.md`).

## O que entra no pacote

| Parte | O que é | Onde está | Situação |
|---|---|---|---|
| **Layout** | visual do verso do card do Trello + revisão celular (texto 16 px, toque 48 px, botão principal fixo no rodapé) — proposta arquivada em 05–06/10 (artefato "Proposta visual do formulário") | tema `tt` em `apps-script/Formulario.html`; ligado para todos quando o formulário abre pelo servidor (`srv=1`, só TESTE) | 1ª etapa (CSS) pronta para publicar |
| **Formulário** | mesmas funções de hoje; no celular o pedido em 3 passos (Carro → Peças → Conferir), tipo da peça em chips grandes, quantidade com + e −, "Tirar foto" do orçamento como botão maior, tela de conferência antes de enviar, status do card no topo | `apps-script/Formulario.html` (fonte única) → `powerup/formulario.html` | a fazer (etapa 2 do layout) |
| **Servidor** | backend do formulário e do robô no Google Cloud (fases 3–4), login Google (3b), e-mail SMTP ligado só na virada | `servidor/` | fase 3a pronta no TESTE; 3b e 4 a fazer |
| **Velocidade** | maior problema do robô de hoje: medir cada ação (`/tarefas/execucoes`), escolher a região mais perto do Trello, guardar em memória o que não muda (quadro, listas, campos, etiquetas, usuário), chamadas em paralelo onde o robô espera à toa | `servidor/` | medição pronta; região e memória a decidir/fazer |
| **Manual** | os 4 guias por função (Consultor/Orçamentista, Comprador/Recebedor, Autorizador, Financeiro) refeitos com as telas novas, em linguagem simples, com foto de cada passo no celular | artefatos "Guia do …" (02/10) | a refazer quando as telas da etapa 2 fecharem |

## Ordem de trabalho

1. **Layout etapa 1 (CSS)** — visual novo + celular no TESTE. Equipe usa e aponta o que estranhar.
2. **Velocidade** — medir em São Paulo × EUA; mudar de região se ganhar; memória para o que não muda.
3. **Fase 3b** — login Google no formulário (precisa de cliques do Weslley no Google Cloud).
4. **Layout etapa 2** — pedido em 3 passos no celular, conferência, status no topo.
5. **Fase 4** — robô por webhook no TESTE, uma semana comparando com o Apps Script.
6. **Manual** — guias novos com as telas finais.
7. **Ensaio da virada** — lista de verificação, plano de volta (Apps Script em reserva), e-mail SMTP, token da conta do robô.

## Estrutura (08/10/2026 — aprovado pelo Weslley: "Sim")

Problema: os dados de um pedido moram em 4 lugares (texto da descrição, aba TRAVA, checklists, propriedades do robô), o
mesmo código existe em 3 cópias (robô no Google, cópia no servidor, formulário em 2 versões), o formulário conversa no
formato do Google ("função + dados") e duas sessões mexem no mesmo projeto ao mesmo tempo.

1. **O banco vira o dono dos dados; o Trello vira vitrine.** Tabelas de pedido, peça, cotação, autorização, compra,
   recebimento, fornecimento e histórico. Sem risco: (a) o servidor grava em paralelo (retrato a cada ação no card) e
   compara uma semana; (b) o formulário passa a LER do banco; (c) etapa por etapa passa a GRAVAR no banco, e o servidor
   escreve a descrição/checklists do Trello a partir dele. Fim da TRAVA, da vitrine × completa e da leitura do texto.
   → **(a) começou 08/10:** tabela `pedido_retrato` + `pedido_historico` (migração 007), retrato a cada ação no card do
   TESTE (webhook) e em lote por `/tarefas/retratar`; resumo em `/tarefas/pedidos`; peças em linhas na view `v_peca`.
2. **Regras escritas uma vez** (leitores, dias úteis, permissões, montagem da descrição) num núcleo com testes dos PDFs
   reais, usado pelo servidor e — enquanto existir — gerado para o Apps Script.
3. **Formulário servido pelo próprio servidor**, API com rotas claras (abrir card, lançar cotação…), **login Google** com
   papéis no banco (consultor, comprador, autorizador, financeiro, diretoria, por unidade), registro de quem fez o quê,
   conta própria do robô no Trello. Junta a fase 3b e as ideias "cara de aplicativo".
4. **Regras de trabalho:** uma sessão no sistema atual (Apps Script/principal), outra na 2.0 (servidor/TESTE);
   `docs/SESSOES.md` diz quem mexe em quê; principal só com testes passando e confirmação do Weslley.
5. **Segurança e acompanhamento:** painel de saúde (`/painel`, feito 08/10), cópia diária do banco (a fazer),
   documentação num lugar só (`docs/README.md`, feito 08/10).

Região (decidido na proposta de 08/10): fica **São Paulo** — com o banco dono dos dados, o que importa é servidor e banco
juntos; as gravações no Trello passam a ser em segundo plano. Sonda us-east4 pode ser apagada.

## Ideias guardadas para depois — "cara de aplicativo" (Weslley 07/10: boas, não perder)

1. **Ícone na tela inicial do celular** (app instalável, abre em tela cheia sem navegador e sem passar pelo Trello).
2. **Tela inicial = lista de cards** do nosso banco (placa grande, situação colorida, o que falta), filtros "Para cotar / Para autorizar / Para comprar / Chegando" e lupa por placa.
3. **Barra de botões fixa embaixo**: 🏠 Início · ➕ Pedido · 💰 Cotar · 📦 Chegou.
4. **Avisos no celular** ("peça do ARW5715 chegou", "3 cotações esperando você") que abrem direto no card (depende do item 1; no iPhone cada pessoa aceita).
5. **Ler pela câmera** o código de barras da nota/etiqueta na chegada para marcar o que chegou.

Feitas em 07/10 (celular, TESTE): teclado certo em cada campo, cotação nova num painel que sobe de baixo, faixa verde "Salvo ✓" com vibração, rascunho automático do pedido novo (oferece "Continuar de onde parou").

## Medição de velocidade (07/10/2026, sonda em us-east4)

| Daqui até… | São Paulo (hoje) | EUA, Virgínia (us-east4) |
|---|---|---|
| Trello (1 consulta) | ~190 ms | ~80 ms |
| Banco Neon (São Paulo) | ~5 ms | ~118 ms |

Uma ação típica do formulário faz ~17 consultas ao Trello e ~12 ao banco: São Paulo ≈ 3,3 s; EUA com banco em SP ≈ 2,8 s
(quase nada); **EUA com o banco também nos EUA ≈ 1,4 s (2,3× mais rápido)**. Junto vai a memória do que quase não muda
(publicada 07/10: tira ~4 das 17 consultas). Mudar exige banco novo no Neon nos EUA (cópia do atual) e trocar o segredo
DATABASE_URL — decisão do Weslley (dados passam a ficar nos EUA, como já ficam no Trello). **Adiada para 08/10/2026** (pedido dele); a sonda `compra-peca-sonda` (us-east4) fica parada até lá, sem custo.

## Decisões registradas

- 07/10/2026 — **direção do projeto (Weslley):** o Trello será aposentado; até lá vira só visualização do fluxo. Todo o trabalho da equipe passa a ser feito pelo nosso sistema (formulário/telas) e pelas automações — o servidor e o banco podem (e devem) concentrar cada vez mais coisa.
- 07/10/2026 — layout no celular (TESTE): aplicadas as 8 ideias — topo fixo com placa e etapa, pedido em 3 passos (Carro → Peças → Conferir), peça como cartão fechado, ajuda escondida em "❔ Ajuda", só a aba da etapa (outras em "⋯ Outras etapas"), botão grande de foto/PDF, quantidade com − e +, totais recolhidos, conferência antes de enviar e "👉 o que acontece agora" no fim. Só em tela até 640 px e só com `srv=1`.

- 09/10/2026 — **duas interfaces (Weslley):** celular (até 640 px) em 3 passos; computador no modelo R7 da proposta visual — página única com seções em cartões, coluna lateral com resumo do card, etapas, o que falta e Enviar; tela do comprador com todas as abas à vista. Só no TESTE (`srv=1`). Barra extra do Power-Up tirada no TESTE (um título e um Fechar).
- 07/10/2026 — falha achada no robô pode ser corrigida no robô principal e replicada no servidor (Weslley). Primeira: cor "CHASSI" (regra da cor).
- 07/10/2026 — e-mail pelo servidor só liga na virada.
- 07/10/2026 — velocidade é prioridade: otimizar no servidor assim que for viável.

## Auditoria das regras no TESTE 2.0 (09/10/2026)

Corrigido (3450318, ad304bd): avisos de regra voltaram a aparecer sempre (card já autorizado → peça nova volta para EM COTAÇÃO;
cotação devolvida e motivo; sem nº de ordem; obs. do pedido; peça já autorizada; quem autoriza; tipos pedidos); ajustes de layout
do computador valem só para as peças do pedido (Autorizar/Compra/Recebimento/Fornecimento voltaram a mostrar opções, rótulos e
botões de arquivo); Peça/Pneu de volta; "o que falta" (coluna lateral, cor da peça, passos do celular) vem da conferência do
próprio formulário (`coletar()`); mensagem final certa quando o card vai para FALTA DADOS; servidor com 1 instância.

Em aberto:
1. **Robô de ciclo não roda no TESTE** (fase 4): travas de descrição/checklist/coluna, prazos e etiquetas (ATRASADO, PARADO, SLA),
   arquivamento por "faturado", recriação de card excluído e leitura de anexo subido à mão — no TESTE nada disso acontece hoje.
2. Propriedades do script no servidor nascem vazias (compradores, autorizadores, financeiro, dias úteis extras usam o padrão do código) —
   copiar as reais do Apps Script.
3. Planilha (FORNECEDORES/TRAVA/EVENTOS) copiada uma vez; depois diverge do principal (aceitável no laboratório).
4. Rascunho do celular não guarda "não comprar"/motivo, complemento e valor do orçamento.
5. Dicas menores escondidas no 2.0 (erro de envio da capa, nomes dos arquivos enviados, explicação Salvar parcial/Enviar/Devolver).
