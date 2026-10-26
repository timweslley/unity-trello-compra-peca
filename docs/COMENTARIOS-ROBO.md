# Comentários do robô e do formulário — inventário e proposta de revisão (21/10/2026)

Pedido do Weslley (21/10, 18h46): "revisar esses comentários todos que colocamos no robô — quando e o formato — e casar com o
fluxo do formulário **sem notificar a cada movimento**". Este arquivo é o inventário completo (onde cada comentário nasce,
quando sai, se menciona alguém) e a proposta. Depois de decidido, vira regra em `ESPECIFICACAO-SISTEMA.md` e código.

## Princípios propostos

1. **Andamento = registro, não notificação.** Cada ação da equipe pelo formulário gera UM comentário, sem @menção, no formato
   `EMOJI **AÇÃO** — Nome · resumo → **COLUNA NOVA**` (quem fez, o quê, para onde foi). Quem tem de agir é chamado pelo
   **lembrete de prazo** (⏰ SLA), não pelo andamento. (Já valendo desde 21/10 17h27: `MENCAO_FLUXO = NAO`.)
2. **O robô só fala quando acrescenta algo** que a pessoa não vê no formulário nem no comentário da equipe: leu/importou
   algo sozinho, desfez uma ação errada, achou divergência, venceu um prazo. Nunca repete o que o comentário da equipe já disse.
3. **@menção só em quatro casos:** prazo vencido (⏰), correção de erro de alguém (🔒 trava desfez / arquivo repetido), pergunta
   direta a uma pessoa (🏷️ ORDEM AUTORIZADA PENDENTE) e dado faltando que trava o card (⚠️ FALTA DADOS) — este último porque
   não tem prazo no SLA; alternativa: criar prazo (FALTA DADOS 1 d.u.) e tirar a menção.
4. **Nunca o mesmo aviso duas vezes** (assinatura por card + estado, como já fazem FALTA DADOS, SLA e autorização).
5. "Salvar parcial" de qualquer aba **não comenta** (cotação já é assim desde 21/10 17h22).

## Inventário

Legenda da coluna "Proposta": **M** manter como está · **S** silenciar · **J** juntar com outro · **F** mudar o formato · **?** decidir.

### 1. Pedido (consultor) — `FormularioServidor.gs` vdf_salvar

| Comentário | Quando sai | @ | Proposta |
|---|---|---|---|
| `✏️ PEDIDO EDITADO — Nome (usuário)` + ➕ incluiu / 🏷️ tipo definido / ➖ tirou / 🚫 não comprar | edição do pedido com alguma dessas mudanças (21/10) | não | **M** (novo). Acrescentar `→ COLUNA` quando o card andar (ver §2 PEÇA NOVA) |
| `🚫 NÃO COMPRAR — Nome marcou…` | pedido NOVO com peça 🚫 | não | **J** no comentário de pedido novo (abaixo) |
| `➕ COMPLEMENTO marcado por Nome — …` | consultor marcou ➕ complemento | não | **M** (Weslley quer essa informação) |
| `📝 COMPLEMENTAR — Nome` (aba Compra, status do complementar) | comprador marcou autorizado/comprado antes | não | **M** |
| `✏️ Peça alterada sem nova cotação — Nome respondeu…` | peça cotada editada sem exigir nova cotação | não | **J** no PEDIDO EDITADO (linha "✏️ alterada sem nova cotação: …") |
| `🗑️ Peça removida do pedido com compra registrada — Nome` | tirou peça já comprada (diretoria) | não | **J** no PEDIDO EDITADO (linha "➖ tirou (tinha compra): …") |
| `🔀 QUEM PAGA MUDOU — Nome` 👤/🛡️ | peça trocou seguradora↔particular (não em pedido PARTICULAR) | não (21/10) | **J** no PEDIDO EDITADO |
| `🤖 Card aberto pela Rotina Unity a partir de …` | rotina abriu card sem pedido da equipe | não | **M** |
| (pedido novo não comenta: só o robô "DADOS COMPLETOS/FALTA DADOS") | — | — | **?** criar `📋 PEDIDO — Nome (usuário) · Unidade · N peça(s) → EM COTAÇÃO` e o robô calar quando o pedido vier completo |

### 2. Dados do card (robô) — `Validacao.gs` vd_conferirCard_ / vd_conferirPosCotacao_

| Comentário | Quando sai | @ | Proposta |
|---|---|---|---|
| `⚠️ FALTA DADOS — corrigir para seguir: …` + link ✏️ | card em EM COTAÇÃO/FALTA DADOS com dado faltando (assinatura: só quando a lista muda) | **@criador** | **M** (ou prazo 1 d.u. e sem @ — decidir) |
| `✅ DADOS COMPLETOS → EM COTAÇÃO` (+ "🤖 lido dos anexos", "orçamento importado") | card saiu de FALTA DADOS | não | **F**: só quando o robô leu/importou algo; se foi a equipe que completou pelo formulário, o PEDIDO EDITADO já diz `→ EM COTAÇÃO` |
| `✅ DADOS COMPLETOS · 🤖 lido dos anexos: …` | card já em EM COTAÇÃO, robô preencheu campo pelo anexo | não | **M** |
| `🆕 PEÇA NOVA (estava em X) → FALTA DADOS / EM COTAÇÃO: …` | peça nova em card que já passou da cotação | **@criador** (FALTA DADOS) | **J**: a inclusão já sai no PEDIDO EDITADO; robô só diz `→ COLUNA` + o que falta (sem @ se foi pelo formulário) |
| `⚠️ PLACA JÁ TEM CARD ABERTO — PLACA: [card] (coluna)…` | card criado à mão com placa de outro card aberto (23/10), 1 vez | **@criador** | **M** (correção) |
| `🆕 PEÇA SEM COTAÇÃO (estava em X) → EM COTAÇÃO` | card devolvido com peça sem cotação | não | **M** |
| `✔ Card em X (movido por @user) — peça(s) aguardando cotação` | alguém arrastou o card à mão | @quem moveu | **M** (correção de ação manual) |
| `📄 ORÇAMENTO COMPLEMENTAR (CILIA) — robô · N já estavam · ➕ Oficina: … · 🔄 Atualizada: …` | anexo de orçamento lido pelo robô | @criador se houver peça de oficina | **F**: sem @ quando só atualizou valores; @ só quando entrou peça nova que exige tipo |
| `📄 «arquivo» é o laudo da HDI…` / `não reconheci um orçamento` / `é da placa X, não deste card` / `é o orçamento do Cilia; neste sinistro HDI…` / `Card de RETORNO: não importei` | anexo lido e não importado | não | **M** (1 vez por anexo) |
| `🔁 Passou para a oficina — …saiu do checklist FORNECIMENTO` | peça FO virou peça da oficina | não | **M** |
| `↩️ FO REVERTIDA …` | diretoria desfez conversão | não | **M** |
| `📄 Texto antigo do card (guardado aqui…)` | 1ª organização da descrição de card antigo | não | **M** |

### 3. Cotação (comprador) — vdf_salvarCotacao

| Comentário | Quando sai | @ | Proposta |
|---|---|---|---|
| `💰 COTAÇÃO — Nome · N cotação(ões) em N peça(s) → PENDENTE AUTORIZAR` (+ ⏳ PARCIAL / ⛔ NÃO COTADAS / 👤 particulares) | Enviar cotação | não (21/10) | **M** |
| `💾 COTAÇÃO PARCIAL salva` | Salvar parcial | — | **S** (feito 21/10 17h22) |
| `📝 COTAÇÃO DE REGISTRO — …peças já autorizadas` | cotação em peça já autorizada | não | **M** |
| `🔁 CÓDIGO CORRIGIDO NA COTAÇÃO — Nome` + `- PEÇA: antigo → novo` (26/10/2026) | comprador corrigiu o código da peça na aba Cotação | não | **M** |
| `⚠️ COTAÇÃO INDISPONÍVEL — Nome → COLUNA` | comprador marcou cotação autorizada como indisponível | não (21/10) | **M** |

### 4. Autorização (diretoria / consultor) — vdf_autorizar, vdf_devolverCotacao

| Comentário | Quando sai | @ | Proposta |
|---|---|---|---|
| `✅ AUTORIZADO — Nome · N peça(s) · R$ → AUTORIZADO COMPRA` (+ ⛔ sem autorização / ➕ complemento / 🚫 / ⏳ aguarda) | Enviar autorização | não (21/10) | **M** |
| `✏️ AUTORIZAÇÃO ALTERADA — Nome · N · R$` + 🔁 trocou / ➕ autorizou agora | reenvio com mudança (21/10) | não | **M** (novo) |
| `🔁 Autorização reenviada sem alteração` | reenvio igual (21/10) | não | **?** manter (registro) ou silenciar |
| `💾 AUTORIZAÇÃO PARCIAL salva — …` | Salvar parcial | não | **S** (mesma regra da cotação) |
| `✏️ Peças marcadas na autorização — Nome` (➕/🚫 sem autorizar) | só marcas | não | **M** |
| `↩️ COTAÇÃO DEVOLVIDA — Nome → EM COTAÇÃO` + obs | Devolver para cotação | não (21/10) | **M** |
| `🏷️ ORDEM AUTORIZADA marcada por Nome (conferido no Databox)` | comprador pôs a etiqueta pelo formulário | não | **M** |
| `🏷️ ORDEM AUTORIZADA PENDENTE — Nome conferiu no Databox…` | comprador avisa o consultor do que falta | **@criador** | **M** (pergunta direta) |

### 5. Compra (comprador) — vdf_salvarCompra

| Comentário | Quando sai | @ | Proposta |
|---|---|---|---|
| `🛒 COMPRA — Nome · N item(ns) → FALTA CHEGAR` (+ ⏳ falta comprar / ⚠️ FORA DA AUTORIZAÇÃO / anexos) | Enviar compra | **@diretoria** só se fora da autorização | **M** |
| `💾 COMPRA PARCIAL salva — …` | Salvar parcial | não | **S** (mesma regra) |
| `🛒 COMPRA ENVIADA — todas as peças já estavam registradas` | reenvio sem item novo | não | **F**: `🔁 Compra reenviada sem alteração` ou **S** |
| `📎 Negociação/pagamento anexado — Nome` | só anexos, sem item | não | **J** na COMPRA (linha 📎) ou **S** |
| `❌ COMPRA CANCELADA — Nome → COLUNA` | cancelou item do PAGAS | não | **M** |
| `🔄 Compras do card antigo no padrão novo — Nome` | diretoria renomeou PAGAS (21/10) | não | **M** |

### 6. Fornecimento / previsão (comprador, rotina) — Previsao.gs

| Comentário | Quando sai | @ | Proposta |
|---|---|---|---|
| `🚚 FORNECIMENTO — Nome (rotina)` + linhas por item | Status do Pedido / HDI lido e salvo | não | **M** |
| `📅 PREVISÃO ALTERADA — Nome` | mudou previsão de item | não | **M** |
| `📄 Orçamento X vN (…) anexado pelo robô.` (+ `Card em ESPERA: @criador verificar se a cotação deve seguir`) | rotina Cilia anexou versão nova | @criador só em ESPERA | **M** (decisão de 05/10) |

### 7. Recebimento / retirada / encerramento — Recebimento.gs

| Comentário | Quando sai | @ | Proposta |
|---|---|---|---|
| `📦 RECEBIMENTO — Nome → ENCERRADO` + itens / 📎 / ⏳ falta chegar / ✅ tudo recebido | aba Recebimento | não | **M** |
| `📦 PEÇAS — local / devolução — Nome` | só local/retirada/devolução | não | **M** |
| `📦 RECEBIMENTO — Nome (✔ marcado no Trello)` | ✔ direto no checklist (fora do formulário) | não | **M** |
| `✋ RETIRADA — Nome · por X em dd/mm → ENTREGUES` | aba Retirada | não | **M** |
| `↪️ Card → COLUNA (motivo)` | robô reavaliou a coluna (tudo comprado / só FO / sem compra) | não | **F**: só quando NÃO veio de uma ação pelo formulário (o comentário da ação já traz `→ COLUNA`) |
| `↩️ NF DE DEVOLUÇÃO — Nome` + linhas por peça (NF nº, anexo) | comprador informou a NF de devolução (21/10) | não | **M** (novo) |
| `⏰ NF de devolução pendente há mais de N d.u. — …` | SLA, 3 d.u. após a devolução, 1 vez por item | @compras | **M** (novo) |
| `🔒 Encerrado sem peças — Nome → ENCERRADO · 📝 motivo` | diretoria encerrou card sem peça (21/10) | não | **M** |
| `Movido automaticamente para FALTA CHEGAR: mais de N dias em ENCERRADO…` (Código.gs, rotina antiga) | card antigo | não | **?** conferir se ainda roda; se roda, formato `↪️ Card → FALTA CHEGAR (…)` |

### 8. Faturamento — Faturamento.gs, Fluxo.gs (SLA), Código.gs (rotina antiga)

| Comentário | Quando sai | @ | Proposta |
|---|---|---|---|
| `⏰ Card em ENTREGUES há N d.u. sem confirmação de faturamento` | 7 d.u. (só cards entrados desde 20/10 15h30), 1 vez | @financeiro | **M** |
| `🧾 Faturamento pendente — dd/MM` (resumo no card fixo, editado todo dia) | diário | @financeiro | **M** |
| `🔴 @financeiro card parado há mais de N dias nesta coluna — verificar faturamento` (Código.gs) | rotina antiga por etiqueta PARADO | @financeiro | **?** parece duplicar o ⏰ — conferir se ainda roda e desligar |
| `🧾 … O faturamento é confirmado por X — o card não foi arquivado` / `Card em COLUNA — só é arquivado em ENTREGUES…` / `Desarquivei / Não arquivei: motivo` / `Card já faturado — só o Weslley pode desarquivar` | alguém escreveu "faturado"/desarquivou fora da regra | @quem fez | **M** (correção de ação) |

### 9. Prazos de peça (robô) — Fluxo.gs (SLA) e Validacao.gs (prazo do card)

| Comentário | Quando sai | @ | Proposta |
|---|---|---|---|
| `⏰ Card em EM COTAÇÃO há N d.u. (prazo: 2). Lançar a cotação…` | SLA, 1 vez por entrada na coluna | @compras | **M** |
| `⏰ Cotação aguardando autorização há N d.u. (prazo: 2)…` | SLA | @diretoria / @consultor (particular) | **M** |
| `⏰ Peça sem recebimento informado depois da previsão — verificar compra do item X; verificar prazo do item Y` | SLA, por item+previsão | @compras | **J** com os dois abaixo: UM aviso de item atrasado por card/dia |
| `⏰ Prazo do card vencido sem previsão de peça — verificar prazo/compra do item …` | data do card venceu e item sem previsão | não | **J** (acima) |
| `⏰ Fornecimento atrasado — verificar prazo do item X (previsão dd/mm)` | item FO com previsão vencida (etiqueta) | não | **J** (acima) |
| (não existe) prazo para FALTA DADOS e para AUTORIZADO COMPRA sem compra | — | — | **?** criar (1 d.u. e 2 d.u.) e aí tirar o @ do FALTA DADOS |

### 10. Travas e correções (robô)

| Comentário | Quando sai | @ | Proposta |
|---|---|---|---|
| `🔒 ALTERAÇÃO NÃO PERMITIDA — a descrição só muda pelo formulário; o texto voltou ao original` | edição manual da descrição | @quem editou | **M** |
| `🔒 ALTERAÇÃO NÃO PERMITIDA — checklist só muda pelo formulário… Desfeito: …` | ✔/edição manual no checklist | @quem editou | **M** |
| `🔒 motivo — O card voltou para COLUNA` | card arrastado para coluna proibida | @quem moveu | **M** |
| `🗑️ Anexo repetido removido: «a» é o mesmo arquivo que «b»` | anexo idêntico | @quem anexou | **M** |
| `♻️ Card recuperado: ele foi excluído em …` | card excluído recriado | @quem excluiu | **M** |
| `🛠️ CORREÇÃO DO ROBÔ (data) — …` | correções pontuais (11/10, 12/10) | @criador | **M** (histórico; não sai mais) |
| `🔄 Card antigo voltou para cotação (veio de X): …` | card legado devolvido à cotação | não | **M** |
| `💬 Autor (principal): texto` (Espelho, só no TESTE) | espelho do principal | não | **M** (só TESTE) |

## Decisões do Weslley (21/10/2026 19h03) — aplicadas no mesmo dia

- [x] §1 pedido novo: **sem** comentário de pedido ("a existência do card basta"); "✅ DADOS COMPLETOS" **calado** — só sai o que o robô importou do orçamento ou um ℹ️ de divergência.
- [x] §2 FALTA DADOS: **mantido** como está (com @criador); ganhou prazo no SLA (1 d.u.).
- [x] §4 `🔁 reenviada sem alteração`: **silenciado**.
- [x] §5 AUTORIZAÇÃO PARCIAL e COMPRA PARCIAL: **silenciados** (só o comando "Enviar" comenta). "COMPRA ENVIADA — todas já estavam registradas" virou `🛒 COMPRA — Nome · enviada (salva antes aos poucos)`.
- [x] §5 `📎 Negociação/pagamento anexado`: **silenciado** (só anexa).
- [x] §8 `🔴 card parado … verificar faturamento`: **sem comentário** (a etiqueta PARADO continua).
- [x] §9 três avisos ⏰ de item atrasado: **um por card por dia** (`pz_jaAvisouHoje_`).
- [x] §9 prazos novos: **FALTA DADOS 1 d.u.** (`SLA_DIAS_DADOS`, menciona o criador) e **AUTORIZADO COMPRA sem compra 2 d.u.** (`SLA_DIAS_COMPRAR`, menciona compras).

## Próxima rodada (formato, ainda não feita)
- Juntar no `✏️ PEDIDO EDITADO`: "peça alterada sem nova cotação", "peça removida com compra", "QUEM PAGA MUDOU".
- `🆕 PEÇA NOVA` do robô: quando a inclusão veio pelo formulário, dizer só `→ coluna` + o que falta (sem @).
- `↪️ Card → coluna` do robô: só quando não veio de ação pelo formulário.
- `📄 ORÇAMENTO COMPLEMENTAR`: @ só quando entrou peça nova que exige tipo.
