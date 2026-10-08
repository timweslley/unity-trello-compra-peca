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

- 07/10/2026 — falha achada no robô pode ser corrigida no robô principal e replicada no servidor (Weslley). Primeira: cor "CHASSI" (regra da cor).
- 07/10/2026 — e-mail pelo servidor só liga na virada.
- 07/10/2026 — velocidade é prioridade: otimizar no servidor assim que for viável.
