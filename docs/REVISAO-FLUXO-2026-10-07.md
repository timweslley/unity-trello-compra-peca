# Revisão geral do fluxo — 07/10/2026 (noite)

Depois das mudanças de 05–07/10 (cotação/autorização/compra parciais, cotação de registro, chips de autorização,
pareceres do Cilia, leitor HDI, FO → oficina, card fixo, prazos), passei o fluxo inteiro de ponta a ponta procurando
regras que passaram a se contradizer. Abaixo: o fluxo como está, o que encontrei e corrigi, e o que fica para decisão.

## 1. O fluxo, como ficou

```
➕ NOVO PEDIDO (card fixo, sempre em 1º)
   │ formulário do consultor (orçamento lido por OCR → peças + FO)
   ▼
FALTA DADOS ⇄ EM COTAÇÃO ──────────── comprador: 💾 Salvar parcial (fica) / ✅ Enviar cotação (exige cobertura)
   │                                   robô: faltas; peça nova → volta; SLA 2 d.u.
   ▼
PENDENTE AUTORIZAR / COTAÇÃO FINALIZADA (só particular)
   │ diretoria: 💾 Salvar parcial (fica, sem avisar) / ✅ Enviar autorização (move; pode ser só para fechar)
   │            chips ➕ complemento / 🚫 não comprar · ↩️ devolver para cotação
   ▼
AUTORIZADO COMPRA ─────────────────── comprador: etiqueta ORDEM AUTORIZADA · 💾 Salvar parcial (fica) /
   │                                   ✅ Enviar compra (exige toda peça autorizada comprada) · ⚠️ cotação indisponível
   ▼                                   (cotação nova com link → volta para autorização)
FALTA CHEGAR ──────────────────────── 📦 recebimento (✔ + data) · 🚚 fornecimento (Status Cilia + pareceres / Peças HDI)
   │                                   prazo do card = maior previsão pendente · ATRASADO (FO vencida)
   ▼
ENCERRADO → ENTREGUES → PENDÊNCIA(S) · prazo marcado concluído · "faturado" arquiva
```

Regras transversais: peça 🚫 não comprar fica fora de tudo; FO com o mesmo código (ou mesma descrição ➕ complemento)
de peça da oficina sai do FORNECIMENTO; cotação lançada em peça já autorizada é só de registro; card sem previsão de
peça ganha prazo = entrada na coluna + 2 d.u.; ESPERA não ganha prazo nem é movido pelo robô.

## 2. O que a revisão encontrou — corrigido agora (commit desta revisão)

| # | Onde | Problema | Correção |
|---|---|---|---|
| 1 | Aba ✅ Autorizar | Toda peça vem com uma cotação pré-marcada. Depois de um **Salvar parcial**, o "Enviar" reenviava as peças já autorizadas (linhas `AUTORIZADO:` repetidas, total somado duas vezes). | Peça já autorizada com a mesma cotação **não é reenviada**; o painel mostra "N nova(s) · K já autorizada(s) antes · total". |
| 2 | 💰 Cotação | **Salvar parcial** com cotação só em peça já autorizada (registro) movia o card **de volta para EM COTAÇÃO** e punha etiqueta COTAÇÃO PARCIAL. | Cotação de registro vale com os dois botões: não move, não etiqueta. |
| 3 | 🛒 Enviar compra | Peça 🚫 **não comprar** contava como "falta comprar" quando o card não tinha nenhuma autorização → o envio era recusado sem motivo. | Não comprar nunca é pendência de compra. |
| 4 | 🚚 Fornecimento | FO marcada **B.O.** ou **em cotação** mantinha a data antiga no item → ficava "atrasada" para sempre (etiqueta ATRASADO sem sair). | Situação B.O./em cotação = sem previsão: a data do item é tirada. |
| 5 | Prazo do card | O formulário (`pv_dueCard_`) ajustava a data do card sem desmarcar "concluído": card que volta de ENCERRADO com item novo ficava com prazo verde (concluído) até a próxima passada do robô. | Ao voltar a ter item pendente, desconclui na hora. |

## 3. Conferido e coerente (sem mudança)

- **Autorização parcial** não dispara nada no robô: a regra "peça sem cotação → EM COTAÇÃO" só olha peça **sem cotação**;
  peça cotada e ainda não autorizada fica quieta em PENDENTE AUTORIZAR (SLA de 2 d.u. continua avisando a diretoria — ok).
- **Compra parcial** deixa o card em AUTORIZADO COMPRA; o prazo do card passa a ser a maior previsão das PAGAS pendentes
  (antes a coluna estava fora do módulo de prazos; agora entra — coerente com o SLA).
- **Pedido misto** (seguradora + particular): "Enviar autorização" só move quando os dois grupos têm autorização — igual
  antes, inclusive no "fechar" sem escolha nova.
- **Cotação indisponível** com cotação nova → anula a autorização daquela peça e volta para autorização; o link da
  cotação nova aparece na autorização e na compra como qualquer outro.
- **Pareceres do Cilia** só mudam previsão/motivo/B.O.; nunca movem card. Parecer com texto fora das frases conhecidas é
  ignorado (sem regra automática) — decisão de deixar o Gemini de fora mantida.
- **FO → oficina por descrição** usa a mesma similaridade do complemento (posição ESQ/DIR separa; "DE/DA" não pesa).
  Exige que a peça da oficina seja ➕ complemento — não mexe em FO de card cujo orçamento não mudou.
- **Card fixo** no topo: formulário, trava e robô reposicionam; se alguém mover o fixo de coluna, a varredura de 30 min
  reaprende onde ele está.
- **Prazo em EM COTAÇÃO / PENDENTE / FALTA DADOS**: entrada + 2 d.u. — bate com o SLA de 2 d.u. das mesmas colunas.
  FO vencida nessas colunas agora também ganha ATRASADO (antes só a partir de AUTORIZADO) — é o comportamento esperado.

## 4. Pontos que ficam para sua decisão

1. **Comprar antes de autorizar tudo**: com a autorização parcial, o comprador já pode registrar compra das peças
   autorizadas enquanto o card ainda está em PENDENTE AUTORIZAR (só precisa da etiqueta ORDEM AUTORIZADA). "Enviar compra"
   então leva o card de PENDENTE direto para FALTA CHEGAR. Funciona, mas pula a coluna AUTORIZADO COMPRA. Se preferir,
   bloqueio a compra enquanto a autorização não for enviada.
2. **"📅 alterar previsão" da aba Recebimento** ainda exige motivo sempre; o fornecimento só exige quando adia. Alinhar?
3. **Prazo "entrada + 2 d.u." em FALTA CHEGAR sem previsão de peça**: hoje vale para qualquer coluna fora de ESPERA. Em
   FALTA CHEGAR sem data nas peças (ex.: ESR9A30), o card vai ficar "vencido" 2 dias depois de entrar lá. Se isso gerar
   ruído, limito a regra às colunas de cotação/autorização/compra.
4. **FO vencida em EM COTAÇÃO** passa a comentar "⏰ Fornecimento atrasado — verificar prazo do item X" — uma vez por
   card. Se for cedo demais para a equipe, volto a ignorar essas colunas no módulo de prazos.
5. **Gemini**: fora por hora (decisão de hoje). O leitor de pareceres cobre as frases padrão da Prismatec; parecer livre
   fica para a pessoa ler.

## 5. Como foi testado

Parsers (Status Cilia + pareceres, HDI em 4 formatos, orçamentos) com os PDFs/prints reais; autorização/compra parciais
com Trello simulado (parcial → enviar → fechar, recusa com pendência, não comprar); sintaxe de todos os `.gs` e do
formulário estático. No quadro real: ATX2884 (pareceres), BXZ4J84 (HDI, Power-Up), QPG1B84 (FO → oficina), ESR9A30
(prazo). Os itens 1–5 da seção 2 foram testados de novo com os mesmos mocks depois da correção.
