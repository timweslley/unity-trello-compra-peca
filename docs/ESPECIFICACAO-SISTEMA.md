# Compra de Peça — Especificação do sistema (para reimplementação em servidor próprio)

**Grupo Unity · versão deste documento: 20/10/2026** · mapa de entrega para o unityOS em `HANDOFF-UNITYOS.md`

Este documento descreve **o que o sistema faz hoje** — fluxo, regras de negócio, modelo de dados, integrações e
cálculos — de forma independente da tecnologia atual (Google Apps Script + Trello). Ele foi levantado diretamente
do código e é mantido junto com ele: **toda mudança de regra deve atualizar este arquivo no mesmo commit.**
A seção 12 explica como mantê-lo e a seção 11 propõe a arquitetura para o servidor próprio.

Onde aparece `(Arquivo.gs:função)` é a referência ao código atual, para quem precisar conferir o detalhe.

---

## 1. Visão geral

O sistema controla a **compra de peças da oficina** (funilaria/pintura de sinistros) do Grupo Unity, em 4 unidades
(Toledo, Marechal C. Rondon, Cascavel, Campo Mourão). Cada **carro em reparo = um card** no quadro Trello
"Compra de Peça". O card nasce pelo formulário do consultor e percorre colunas até as peças chegarem e o serviço
ser faturado.

Três grupos de pessoas:

| Papel | Quem | O que faz |
|---|---|---|
| **Consultor** (qualquer membro do quadro) | consultores das unidades | abre o pedido, anexa o orçamento da seguradora, inclui/edita peças, autoriza só as peças *particulares* que ele mesmo lançou, confirma recebimento fora de Toledo |
| **Comprador** (setor de compras) | `VD_COMPRADORES` (padrão `comprasunity, timweslley, christianfarias23`) | cota, registra compra, atualiza fornecimento da seguradora, recebe peças |
| **Diretoria / autorizador** | `VD_AUTORIZADORES` (padrão `timweslley, comercialunity, christianfarias23`) | autoriza/devolve cotações, tem todos os poderes, funções administrativas |
| **Financeiro** | `FAT_USUARIOS` (padrão `financeirounity, christianfarias23`) | confirma faturamento ("faturado") |

Dois tipos de peça em cada card:
- **Peça da oficina** — a oficina compra (cota → autoriza → compra → recebe).
- **Peça FO (fornecida pela seguradora)** — a seguradora manda; só se acompanha fornecedor, previsão e chegada.

E três origens de pedido: **SEGURADORA** (precisa do orçamento aprovado em anexo), **PARTICULAR** (cliente paga;
pode ter peça particular dentro de um pedido de seguradora = pedido **MISTO**) e **RETORNO** (09/10/2026: retrabalho/garantia —
a **oficina paga**; sem seguradora e sem orçamento obrigatório, código opcional como no particular; peças vão no checklist `PAGAS`
comum e **quem autoriza é a diretoria**, como na seguradora; título `PLACA CARRO COR RETORNO`; `**TIPO:** RETORNO` na descrição;
campo `Seguradora` = RETORNO, `Tipo` = RETORNO, total em `Total retorno`). O botão "🔁 card novo com os dados deste carro" já
marca o pedido como RETORNO.

### 1.1 Componentes atuais

| Componente | Tecnologia hoje | Papel |
|---|---|---|
| Robô (ciclo de 1 min + rotinas diárias) | Google Apps Script, gatilhos de tempo | lê o quadro, valida, move cards, trava alterações, lê anexos (OCR), avisa |
| Servidor do formulário | Apps Script web app (`doPost`, JSON) | todas as gravações feitas pelas pessoas |
| Formulário | HTML/JS estático no GitHub Pages (`powerup/formulario.html`), aberto pelo Power-Up do Trello ou por link no card | pedido, cotação, autorização, compra, recebimento, fornecimento |
| Banco | **o próprio Trello** (descrição, checklists, anexos, etiquetas, campos personalizados) + planilha Google (backup, eventos, fornecedores) + Propriedades do Script (estado/caches) | ver seção 4 |
| Identidade | token Trello do usuário (precisa ser membro do quadro) | quem gravou cada coisa |

### 1.2 Glossário

- **Vitrine**: descrição resumida que o Trello mostra. **Completa**: descrição oficial em formato estruturado,
  guardada na planilha (aba TRAVA). O robô converte uma na outra.
- **Peça nova**: linha de peça que não existia (detectada por assinatura — seção 4.2.4).
- **Chave da peça**: código (ou descrição, sem código) que liga peça ↔ cotação ↔ autorização ↔ item do checklist.
- **PAGAS / FORNECIMENTO**: checklists do card com as peças compradas pela oficina / fornecidas pela seguradora.
- **Complemento**: orçamento complementar da seguradora (peças a mais que o orçamento original).
  **Aditivo** (de radiador / arrefecimento) que vem no orçamento entra **🚫 não comprar por padrão** — motivo "ESTOQUE DA OFICINA
  (PADRÃO)" — no robô e no formulário; só vale enquanto ninguém marcou tipo (com tipo marcado, alguém decidiu comprar). 13/10/2026, Weslley.
  **Ler de novo** no formulário um orçamento que **já está no card e já foi processado** (batizado `📄 ORÇ`/`📄 ORÇ+` ou já visto
  pelo robô) não traz peça nenhuma de volta — as peças dele contam como conhecidas (compradas no fluxo antigo, tiradas de
  propósito). Só anexo novo, ainda não processado, é comparado como complemento (13/10/2026, BDK2J49).
  **Situação do complementar na seguradora** (09/10/2026, Weslley): peça ➕ complemento de pedido de **seguradora** só é
  comprada com uma das duas situações informadas — `COMPL: AUTORIZADO` (seguradora autorizou o complementar e ele foi
  importado na ordem do Databox) ou `COMPL: ANTECIPADO NOME` (compra antes da autorização, liberada pelo orçamentista — diz
  quem). Compras marca na aba Compra (obrigatório ao escolher fornecedor; `vdf_salvarCompra` recusa sem isso); a diretoria
  pode marcar AUTORIZADO antes, na aba Autorizar (`marcas[].complStatus`). Peça comprada antecipada fica com
  "⚠️ comprado antes da autorização (liberado por NOME)" na vitrine até alguém marcar que a seguradora autorizou/importou
  (aba Compra, caixa "✔ seguradora autorizou…", enviada com `complementos[]`). Vale na linha da peça (`| COMPL: …`), não se
  perde ao reenviar o pedido, e cada marcação gera comentário. Particular e retorno não têm isso (e nesses cards o bloco "Fornecimento da seguradora" e a aba FO ficam escondidos no formulário, salvo se já houver item FO). **Robô**: o lembrete de
  faturamento em ENTREGUES lista os complementares comprados antecipados ainda sem confirmação, e o comentário "faturado" **não
  arquiva** o card enquanto houver um ("Não arquivei: … verificar autorização e importação no Databox do item X").
- **NT**: fornecedor consultado que "não tem" a peça.
- **d.u.**: dias úteis.

---

## 2. Fluxo (máquina de estados)

### 2.1 Colunas, em ordem

1. `ESPERA/NÃO AUTORIZADO` — estacionamento; o robô nunca tira card daqui (só comenta)
2. `FALTA DADOS PARA COTAR` (no quadro principal chama-se "FALTA DADOS PARA COTAÇÃO"; o sistema normaliza)
3. `EM COTAÇÃO`
4. `COTAÇÃO FINALIZADA` — só pedidos 100 % particulares (o consultor autoriza)
5. `PENDENTE AUTORIZAR`
6. `AUTORIZADO COMPRA`
7. `FALTA CHEGAR`
8. `ENCERRADO COMPRAS/FORNEC.`
9. `ENTREGUES`
10. `PENDÊNCIA DE FATURAMENTO` e `PENDÊNCIA TRATADA - FATURAR` — financeiro (só monitoradas: etiqueta PARADO)

**Colunas travadas** (só se entra pela ação certa): 4, 5, 6, 7, 8. Movimento manual para elas é desfeito.
**Colunas livres**: 1, 9, 10 e qualquer outra.
**Cards ignorados**: título contém "NOVO PEDIDO DE PEÇA" ou começa com "AVISO"; "sem compra de peça" na parte do pedido (o texto antigo guardado abaixo de `=== COTAÇÃO (compras) ===` não conta — 13/10/2026, RAM9I31); cards legados (anteriores à virada,
sem descrição completa). O card fixo "➕ NOVO PEDIDO DE PEÇA" fica **sempre em primeiro** na coluna dele: o robô guarda
onde ele está (`VD_FIXO`, varredura completa) e o devolve ao topo quando um card entra na coluna; o formulário (card novo,
mover) e a trava de colunas também o reposicionam na hora (07/10/2026).

### 2.2 Transições

| De → Para | Disparo | Condição | Efeito |
|---|---|---|---|
| (novo) → EM COTAÇÃO | formulário `vdf_salvar` | card novo normal | card criado no nome do consultor; links ✏️/💰 anexados; validação imediata |
| (novo) → FALTA DADOS | formulário, modo "rotina" (só diretoria) | tem peça da oficina sem dados | comentário "🤖 Card aberto pela Rotina Unity" |
| (novo) → ENCERRADO | formulário, modo "rotina" + `soMaoDeObra:true` (só diretoria, card novo; 23/10/2026 — chave `vdf_soMaoDeObraLigada_`: TESTE sempre, principal com `VD_SO_MO=SIM`) | orçamento autorizado **só de mão de obra**: nenhuma peça de TROCA nem FO (nem na base de orçamentos da placa) e `orcamento.origem` informado | bloco PEÇAS com a linha "_nenhuma peça pela oficina — orçamento só de mão de obra…_"; vitrine "🔧 SÓ MÃO DE OBRA"; comentário "🤖 Card aberto pela Rotina Unity — orçamento só de mão de obra… vai direto para ENCERRADO para registro e faturamento." Daí segue o fluxo normal: 15 dias em ENCERRADO sem item pendente → ENTREGUES (`moverEncerrados_`), cobrança de ENTREGUES e «faturado» como qualquer card |
| (novo ou edição) → FALTA DADOS | formulário, botão **💾 Salvar parcial** no pedido (13/10/2026, qualquer usuário) | grava mesmo com tudo faltando (23/10/2026: só a placa num card novo, para o título; unidade, carro e peças podem ficar para depois) | o robô deixa/leva o card em FALTA DADOS e comenta o que falta |
| EM COTAÇÃO → FALTA DADOS | robô (`vd_conferirCard_`) | alguma **falta** (2.3) | "@criador ⚠️ **FALTA DADOS** — corrigir para seguir: …" (só quando o conjunto de faltas muda) |
| FALTA DADOS → EM COTAÇÃO | robô | tudo completo | "✅ **DADOS COMPLETOS** → **EM COTAÇÃO**" + o que leu dos anexos |
| EM COTAÇÃO → EM COTAÇÃO (fica) | comprador `vdf_salvarCotacao` com `parcial=true` (botão **💾 Salvar parcial**, 07/10/2026) | grava o que já tem, sem exigir cobertura | etiqueta laranja `COTAÇÃO PARCIAL`; comentário "💾 COTAÇÃO PARCIAL salva" sem menções; o card não anda |
| EM COTAÇÃO → COTAÇÃO FINALIZADA | comprador `vdf_salvarCotacao` | todas as peças são particulares | comentário "💰 **COTAÇÃO**" |
| EM COTAÇÃO → PENDENTE AUTORIZAR | comprador `vdf_salvarCotacao` (botão **✅ Enviar cotação**) | toda peça com cotação ou "SEM COTAÇÃO: motivo" (somando o que foi salvo parcialmente; enviar sem novidade vale) — se faltar, recusa e sugere Salvar parcial | idem; menciona o comprador/consultor |
| PENDENTE/FINALIZADA (fica) | autorizador `vdf_autorizar` com `parcial=true` (botão **💾 Salvar parcial**, 07/10/2026) | grava as autorizações escolhidas | linhas `AUTORIZADO:`; comentário "💾 AUTORIZAÇÃO PARCIAL salva" sem menções; o card não anda |
| PENDENTE/FINALIZADA → AUTORIZADO COMPRA | autorizador `vdf_autorizar` (botão **✅ Enviar autorização**; pode vir sem escolha nova, só para fechar o que foi salvo) | pedido misto só move quando seguradora **e** particular têm ≥ 1 autorização | linhas `AUTORIZADO:` na descrição; "✅ **AUTORIZADO**" mencionando o comprador |
| (não move) | comprador `vdf_salvarCotacao` em peça **já autorizada/comprada** (07/10/2026; vale com os dois botões) | toda cotação do envio é de peça autorizada, sem remoção nem "sem cotação" junto | **cotação de registro**: vai para a descrição e para a vitrine ("📝 também cotado"); autorização, coluna e etiqueta não mudam; comentário "📝 COTAÇÃO DE REGISTRO" sem menções. Trocar fornecedor autorizado continua pela "cotação indisponível" |
| qualquer → EM COTAÇÃO | `vdf_devolverCotacao` | motivo obrigatório; com peça já comprada devolve só as sem compra (14/10/2026, BBM4739) — bloqueado só se **todas** já foram compradas | bloco `DEVOLVIDA PARA COTAÇÃO` anula autorizações (menos as das compradas, `MANTIDA (comprada)`); "↩️ **COTAÇÃO DEVOLVIDA**" |
| AUTORIZADO → EM COTAÇÃO / PENDENTE / FINALIZADA | comprador `vdf_cotacaoIndisponivel` | sem cotação nova → EM COTAÇÃO; com nova → PENDENTE (ou FINALIZADA se só particular) | linha `INDISPONÍVEL:`; "⚠️ **COTAÇÃO INDISPONÍVEL**" |
| AUTORIZADO (fica) | comprador `vdf_salvarCompra` com `parcial=true` (botão **💾 Salvar parcial**, 07/10/2026) | exige etiqueta `ORDEM AUTORIZADA` e card **em AUTORIZADO COMPRA ou adiante** (autorização parcial é rascunho: antes de a diretoria enviar, a compra é recusada — revisão 07/10/2026) | itens no checklist PAGAS*; "💾 COMPRA PARCIAL salva · falta comprar N"; fora da autorização idem abaixo |
| AUTORIZADO → FALTA CHEGAR (ou direto ENCERRADO se tudo já foi recebido — 13/10/2026) | comprador `vdf_salvarCompra` (botão **✅ Enviar compra**; pode vir sem compra nova) | exige etiqueta `ORDEM AUTORIZADA`; **toda peça autorizada comprada** (senão recusa e sugere Salvar parcial; 🚫 não comprar e "sem cotação" nunca são pendência) | itens no checklist PAGAS*; "🛒 **COMPRA**"; compra fora da autorização exige justificativa e menciona a diretoria |
| FALTA CHEGAR → ENCERRADO | `vdf_salvarRecebimento` → `rc_reavaliarColuna_` | todos os itens PAGAS* e FORNECIMENTO* com ✔ | "📦 **RECEBIMENTO**" com atraso por peça |
| 2–6 → FALTA CHEGAR ou ENCERRADO | `rc_reavaliarColuna_` | card **sem peça da oficina** (só FO ou tudo 🚫 não comprar; PAGAS antigo já ✔ não impede — 13/10/2026, BBG3844) | FALTA CHEGAR se há FO pendente, senão ENCERRADO; "↪️ Card → X" |
| ENCERRADO/ENTREGUES → FALTA CHEGAR | `rc_reavaliarColuna_` (complemento, fornecimento, edição) | apareceu item a receber | "↪️" |
| 2–6 → FALTA CHEGAR ou ENCERRADO | `rc_reavaliarColuna_` (também chamado pelo robô antes de mandar FALTA DADOS → EM COTAÇÃO) | **toda peça da oficina já está no PAGAS** e o resto é 🚫 não comprar (ex.: complementar trouxe peça nova que a diretoria marcou não comprar — RAM9I31, 13/10/2026; vale também para card que já está em EM COTAÇÃO quando a peça é marcada 🚫 pela edição — AUX4331) | FALTA CHEGAR se falta receber, senão ENCERRADO; "↪️ Card → X (toda peça da oficina já comprada…)" |
| pós-cotação → FALTA DADOS / EM COTAÇÃO | robô `vd_conferirPosCotacao_` | **peça nova** na descrição (incompleta → FALTA DADOS; completa → EM COTAÇÃO) | "🆕 **PEÇA NOVA** (estava em X) → …" |
| pós-cotação → EM COTAÇÃO | robô | card já tinha cotação/compra e tem peça da oficina sem cotação/autorização/compra | "🆕 **PEÇA SEM COTAÇÃO** (estava em X) → **EM COTAÇÃO**" |
| ENCERRADO → ENTREGUES | rotina diária 7 h | > 15 dias em ENCERRADO, checklists completos | sem comentário |
| ENCERRADO → FALTA CHEGAR | rotina diária | > 15 dias e item pendente | "Movido automaticamente…" |
| ENCERRADO/ENTREGUES/PENDÊNCIA DE FATURAMENTO/PENDÊNCIA TRATADA → **arquivado** | robô `fat_executar_` | comentário afirmativo com "faturado" (sem "?"; negação só conta a até 2 palavras antes — "não faturado", "ainda não foi faturado" — ou "faturado não"; "faturado, sem desconto" vale) **ou "fechado/fechada" junto de OK / O.S. / ordem** ("OK fechada", "O.S. fechada", "fechado" sozinho; "porta fechada" não) sem nenhuma negação, por usuário de `FAT_USUARIOS`, checklists completos, sem complementar antecipado pendente | evento FATURADO; se falha a condição responde "🧾 Não arquivei: …" |
| idem, **arquivado à mão** por usuário de `FAT_USUARIOS` (10/10/2026) | robô `fat_executar_` (ação `updateCard:closed`) | arquivar = "faturado": mesmas condições; **card antigo** (anterior à virada) só ganha o evento, sem conferir ✔ | evento FATURADO ("arquivado à mão"); se falta ✔ ou há complementar antecipado pendente, o card é **desarquivado** com "🧾 Desarquivei o card: …" |
| card excluído → recriado | robô `exc_executar_` | quem excluiu não é admin do quadro nem está em `EXC_LIVRES` | recria na mesma coluna com título + descrição completa; "♻️ Card recuperado"; e-mail |

### 2.3 Validação do pedido ("faltas")

Verificadas pelo robô a cada ciclo nos cards com atividade (varredura completa a cada 30 min):
placa válida; modelo, ano e chassi (17 caracteres válidos) — dispensados quando o orçamento foi importado;
lista de peças no padrão; tipo da peça (GENUÍNO/ORIGINAL/PARALELO/USADO, máx. 2); código da peça (exceto
particular e "não comprar"); orçamento da seguradora anexado (exceto PARTICULAR; vale também o `📄 ORÇ`/`📄 ORÇ+` já anexado ao card — card migrado do fluxo antigo não tem a marca na descrição, 13/10/2026); carro no título; chassi do anexo
igual ao da descrição. O robô também **lê os anexos por OCR** e completa placa/chassi/ano/modelo/cor/seguradora/
sinistro e importa as peças do orçamento (seção 6).

### 2.4 Travas (integridade)

- **Colunas** (`st_executar_`): movimento manual para coluna travada, ou de travada para EM COTAÇÃO/FALTA DADOS,
  é desfeito (card volta ao topo da origem) com "@quem 🔒 … O card voltou para X". Exceções aceitas: licença dada
  pelo formulário/robô (240 s, consumida no 1º uso); ida para ESPERA e volta para a mesma coluna; FALTA CHEGAR →
  ENCERRADO à mão quando tudo tem ✔; volta à mão para EM COTAÇÃO/FALTA DADOS quando há peça sem cotação
  (robô confirma com "✔ Card em X (movido por @u) — peça(s) aguardando cotação"). A marca "veio de X para a ESPERA"
  (`ST_ESP_`) é apagada sempre que o card sai da ESPERA por caminho aceito (volta para X, licença, coluna livre) e quando
  entra na ESPERA vindo de coluna livre (10/10/2026 — antes ficava para sempre e devolvia o card indevidamente numa
  passagem seguinte).
- **Descrição** (`tr_executar_`): edição manual é restaurada da cópia oficial; aviso no máximo 1×/h por card.
- **Checklist** (`ck_executar_`): nome, data, item ou checklist alterado à mão é desfeito. **✔ marcado à mão** num item
  PAGAS*/FORNECIMENTO* por quem pode receber naquele card vale como **recebimento de hoje** (10/10/2026, 36 ✔ desfeitos em
  5 dias): comentário "📦 RECEBIMENTO — Fulano (✔ marcado no Trello)" com atraso x previsão e a dica da aba, evento
  RECEBIMENTO, coluna reavaliada (`ck_aceitarManual_`; `CK_ACEITA_OK = NAO` volta a desfazer). Quem não pode receber (ex.:
  consultor em Toledo) continua tendo o ✔ desfeito. Desmarcar ✔ à mão continua sendo desfeito.
- **Exclusão**: ver 2.2. Para tirar um card do quadro, **arquivar**.

### 2.5 Prazos, etiquetas e avisos automáticos

| O quê | Regra |
|---|---|
| `due` do card | maior previsão entre os itens de checklist pendentes (`pz_executar_` a cada 5 min, também em card legado; `pv_dueCard_` após mudanças). Sem previsão de peça: **entrada na coluna + 2 dias úteis** (`PZ.DIAS_SEM_PREVISAO`; recalculado a cada troca de coluna; prazo posto à mão só é trocado quando a coluna muda ou quando é anterior à entrada na coluna). "Todas recebidas → a maior previsão de todas" só vale em coluna concluída: card que **volta ao fluxo com peça nova** (TBU8D71, 09/10/2026) não herda a previsão velha e cai na regra de entrada na coluna + 2 d.u. Em ENCERRADO/ENTREGUES/PENDÊNCIA (de faturamento, tratada, **ordem de serviço/comercial e fiscal** — 08/10/2026) o prazo fica **concluído** (`dueComplete`); se o card volta, desconclui. ESPERA não ganha prazo. Em FALTA CHEGAR, quando esse prazo sem previsão vence, o robô comenta uma vez por prazo "⏰ Prazo do card vencido sem previsão de peça — verificar prazo do item X · verificar compra do item Y" (`PZ_SEMPREV_`) (07/10/2026) |
| Etiqueta `ATRASADO` (laranja) | item FORNECIMENTO com previsão vencida sem ✔; comentário "⏰ Fornecimento atrasado — verificar prazo do item X (previsão dd/MM)" **uma vez por item + previsão** (`PZ_FOAV_<card>`; etiqueta tirada e posta de novo não repete); sai sozinha |
| Etiqueta `COTAÇÃO PARCIAL` (laranja) | há peça sem cotação nem justificativa |
| Etiqueta `ORDEM AUTORIZADA` | marcada pelo comprador (`vdf_marcarOrdemAutorizada`); obrigatória para registrar compra; remove `ORDEM NAO AUTORIZADA` |
| Etiqueta `PARADO` (vermelha) | card nas colunas de PENDÊNCIA há > 7 dias sem atividade (rotina 7 h) |
| Etiqueta `CONFERIR FATURAMENTO` (amarela) | ENTREGUES há > 5 dias |
| Etiqueta `SEM COBRANÇA FATURAMENTO` | posta pelas **rotinas de NF** nos cards que abrem em ENTREGUES só para guardar uma nota **sem carro a faturar** (insumo, estoque, material da casa — 10/10/2026, Weslley; **carro de frota/revisão NÃO leva a etiqueta: é conferido pelo faturamento normalmente**, 11/10/2026): o card fica **fora de toda cobrança de faturamento** — sem lembrete no card, fora do resumo diário, sem `CONFERIR FATURAMENTO` (tirada se já tiver) e fora do relatório diário (`fat_semCobranca_`). Arquivar/«faturado» continua funcionando normalmente |
| **SLA** (de hora em hora, dia útil 8–18 h; **cada pendência é avisada uma vez só** desde 10/10/2026 — nova entrada na etapa ou nova previsão é pendência nova; `SLA_REPETIR_DU` = N volta a repetir) | EM COTAÇÃO > 2 d.u. → avisa `SLA_COTAR`; PENDENTE/FINALIZADA > 2 d.u. → `SLA_AUTORIZAR` (ou o consultor, se particular); ENTREGUES > 7 d.u. → `FAT_USUARIOS` no card **uma vez** + **resumo** no card fixo do quadro com todos os cards vencidos por idade, num **único comentário atualizado no lugar** a cada dia útil (editar não notifica de novo; `FAT_RESUMO_ID`; comentário apagado → cria outro; `sla_resumoFaturamento_`; `FAT_RESUMO = NAO` desliga; só atualiza quando a coluna inteira foi varrida) — 10/10/2026, antes saía um lembrete por card por dia; item **PAGAS** sem ✔ 1 d.u. após a previsão → `SLA_RECEBER` (FO atrasada fica só com o aviso "⏰ Fornecimento atrasado" — antes saíam os dois) ("verificar compra do item X" / "verificar prazo do item X"). A entrada na coluna vem do cache `PZ_COL_` (1 chamada ao histórico só na 1ª vez por coluna) |
| Rotina diária 7 h (`rotinaDiariaNucleo_`) | etiquetas `PARADO` e `CONFERIR FATURAMENTO` como acima; o comentário de cobrança em ENTREGUES e o cálculo de prazo antigo (`atualizarPrazos_`) foram desligados em 10/10/2026 (duplicavam o SLA e o `pz_executar_`; `ROT_PRAZOS_ANTIGOS = SIM` religa o segundo); a menção vem de `FAT_USUARIOS` |
| Relatório diário (e-mail 7h15, `REL_EMAILS`) | HTML por unidade: FO vencida; PAGAS sem ✔ > 10 dias; FALTA DADOS parado ≥ 1 dia; ENTREGUES > 5 dias |

### 2.6 Regras de texto nos comentários (definidas por Weslley)

Nunca escrever "seguir com compra/fornecimento", "cotar/comprar" nem "faturado" (essa palavra dispara o
arquivamento). Peça da oficina → "verificar compra do item X"; peça FO → "verificar prazo do item X".

---

## 3. Permissões

| Ação | Quem pode |
|---|---|
| Abrir/editar pedido | qualquer membro do quadro |
| Alterar/remover peça já AUTORIZADA ou COMPRADA; mudar tipo do pedido; passar peça seguradora ↔ particular | só diretoria |
| Modo "rotina" (peça sem tipo/código) | só diretoria |
| Cotação, compra, cotação indisponível, ordem autorizada, alterar previsão, fornecimento | comprador ou diretoria |
| Autorizar peça da seguradora | diretoria |
| Autorizar peça particular | diretoria, quem lançou a peça (`partPor`) ou o criador do card |
| Devolver cotação | diretoria; consultor quando todas as peças são particulares e dele |
| Receber | comprador/diretoria; **qualquer membro** se a unidade do card não é TOLEDO |
| Confirmar faturamento | `FAT_USUARIOS` |
| Excluir card sem recriação | admin do quadro ou `EXC_LIVRES` |
| Padronizar anexos, remover repetidos, ver consumo | diretoria |

Gravações: uma por vez por usuário (lock 25 s); `rid` por requisição torna o reenvio idempotente (o formulário
repete chamadas lentas em paralelo).

---

## 4. Modelo de dados (como vive no Trello hoje)

> Para o servidor próprio, isto vira tabelas (seção 11.3). Aqui está o formato atual, necessário para **migrar**
> os cards existentes e para o período de convivência.

### 4.1 Título e etiquetas

- Título: `PLACA CARRO COR SEGURADORA` (ex.: `RHV1E04 CRUZE PRATA SURA`); pedido particular → `… PARTICULAR`; retorno → `… RETORNO`.
  Carro = nome curto digitado. Placa: `^[A-Z]{3}\d[A-Z0-9]\d{2}$` (antiga e Mercosul equivalentes).
- Seguradoras conhecidas: HDI, PORTO, AZUL, ITAU, YELUM, SANCOR, BRADESCO, ALLIANZ, TOKIO, MAPFRE, SURA, ZURICH,
  SUHAI, MITSUI, EZZE, DARWIN, AMERICAS, SOMPO, GENERALI, ALFA, JUSTOS. No orçamento, vale primeiro o nome colado em
  "Seguradora/Seguros" (cabeçalho), depois qualquer menção solta (e-mail `@hdi-yelum` não faz a Yelum virar HDI).
- Unidade: campo personalizado `Unidade` (TOLEDO, RONDON, CASCAVEL, MOURÃO); cards antigos, por etiqueta.

### 4.2 Descrição (formato "completa")

Separador: linha `=== COTAÇÃO (compras) ===`. Acima, o **bloco do consultor**; abaixo, o **log de cotação/
autorização** (só cresce).

A completa fica na aba `TRAVA` da planilha (coluna E); no Trello aparece a **vitrine**. Toda leitura troca a vitrine
pela completa (`vd_trocarPelaCompleta_`), com cache de 6 h **validado pelo hash da vitrine** (09/10/2026, TBU8D71): se a
vitrine que veio do Trello mudou, o cache não vale e a completa é relida — sem isso o servidor próprio, que mantém o
cache na memória dele, devolvia cotações velhas ao formulário por até 6 h. Na aba Autorizar, peça que já está no checklist
`PAGAS` (card antigo migrado com a compra feita) aparece como "✔ já comprado" e fica fora da autorização.

```
**MODELO:** …            **ANO:** …          **MOTOR/VERSÃO:** …
**CHASSI:** …            **PLACA:** …        **TIPO:** PARTICULAR|RETORNO   (só nesses tipos)
**COR:** …               **SEGURADORA:** …   **SINISTRO:** …

**PEÇAS:**
1. CÓDIGO | DESCRIÇÃO | TIPO[/TIPO2][ | QTD n][ | COMPLEMENTO dd/mm][ | COMPL: AUTORIZADO|ANTECIPADO nome][ | PARTICULAR @user][ | NÃO COMPRAR: motivo][ | ORÇ R$ 1.234,56][ | OBS: texto][ | FOTO]
2. PNEU | 195/65R15 | IMPORTADO|1ª LINHA|<marca>[ mesmos sufixos]
   (ou "_nenhuma peça pela oficina — somente fornecimento da seguradora_")

**FORNECIMENTO (seguradora):** N peça(s) — ver checklist FORNECIMENTO
**FORNECIMENTO COMPLEMENTO:** N peça(s) — ver checklist FORNECIMENTO COMPLEMENTO
**OBS:** observação geral
_Pedido enviado por Nome pelo formulário em dd/MM/yyyy HH:mm_
_Orçamento importado (CILIA|HDI|WEBSOMA)_

=== COTAÇÃO (compras) ===
**COTAÇÃO dd/MM/yyyy - Nome**
REMOVIDA: FORN - NOME PEÇA - R$ 140,00
**FORNECEDOR**
NOME PEÇA - TIPO MARCA - R$ 1.234,56 - 3 dias úteis - [🔗 link](https://…)
**FORNECEDOR - NT**
OBS NOME PEÇA: texto
SEM COTAÇÃO NOME PEÇA: motivo
**AUTORIZAÇÃO dd/MM/yyyy HH:mm - Nome**
AUTORIZADO: FORN - NOME PEÇA - R$ 95,50
OBS GERAL: (autorização) texto
**DEVOLVIDA PARA COTAÇÃO dd/MM/yyyy HH:mm - Nome**
MANTIDA (comprada): CHAVE DA PEÇA
**RECOTAÇÃO dd/MM/yyyy - Nome**
INDISPONÍVEL: FORN - NOME PEÇA - R$ 140,00 - motivo
```

Atributos da peça: `pneu, codigo, descricao, tipos[], medida, categoria, marca, qtd, particular, partPor,
complemento, compData, naoComprar, naoMotivo, valorOrc (líquido unitário no orçamento), obs`.
Regras: `QTD` só quando > 1; `|` dentro de texto vira `/`; peça "NÃO COMPRAR" fica fora de cotação, autorização,
compra, totais e coluna (só registro); `COMPLEMENTO` e `NÃO COMPRAR` não convivem; marcar complemento tira o
não comprar.

**Vitrine** (o que o Trello exibe): cabeçalho em 2 linhas, lista de peças com estado por peça
(🛒 comprada · ✅ autorizada com economia 🟢/🟡/🔴 · cotações · ⛔ não cotada · ⏳ aguardando), peças não
comprar riscadas, grupos 🛡️ seguradora / 👤 particulares, resumo do fornecimento.

**Assinatura de peça** (detecção de peça nova / trava): texto da linha sem numeração, sem `| ORÇ` e sem `| OBS`,
sem acentos, maiúsculas → hash curto guardado por card (`VD_PK2_`). Editar observação ou valor do orçamento não
conta como peça nova; marcar/desmarcar `| COMPLEMENTO` numa peça existente também não (07/10/2026) — o card não volta
para cotação. Mudar descrição, quantidade ou tipo conta como peça nova, **mas o formulário pergunta a quem editou** se a mudança exige nova cotação; respondendo "só acerto", a peça vai em `manterCotacao`, não é tratada como nova, o card fica onde está, cotações/autorizações seguem o código/descrição novos e o card recebe "✏️ Peça alterada sem nova cotação" (07/10/2026).

**Complemento automático**: peça incluída à mão num pedido que tem orçamento da seguradora (importado agora ou já no card) nasce marcada como ➕ complemento (não está no orçamento); quem inclui pode desmarcar (07/10/2026).

**FO que também está na oficina**: item FORNECIMENTO pendente com o mesmo código de uma peça da lista PEÇAS — ou com a mesma descrição (`cp_similar_`) de uma peça ➕ complemento da oficina, caso do orçamento complementar que troca a peça de FO para oficina com código novo (QPG1B84, 07/10/2026) — sai do checklist (a oficina venceu), com comentário "🔁 Passou para a oficina"; roda ao reavaliar a coluna (formulário) e no robô (07/10/2026, RHM1J09). Assinatura de trava (peça autorizada/comprada não pode mudar): `P|CÓD|DESC|TIPOS|QTD`.
**Equipe de consultores por unidade (14/10/2026, Weslley)**: Rondon = @jeziel + @edilsontibes1; Cascavel = @laisalmeida9 (Natan/Laís) + @lucasmoreira50 (`VDF_EQUIPES_PADRAO`; muda pela propriedade `VD_EQUIPES`, formato `RONDON: a, b; CASCAVEL: c`). Qualquer consultor da equipe da unidade do card (campo Unidade) autoriza as peças particulares e devolve cotação como o consultor — também em pedidos antigos abertos por outra conta (ex.: @unitycarservicemarechal) — e é quem o sistema menciona (cotação, autorização aguardando, SLA de autorização, peça nova, quem paga mudou). Unidade sem equipe (Toledo, Mourão): vale quem lançou a peça / criou o card. Membros do card por unidade continuam nas regras do Butler.
**Seguradora × particular por peça (14/10/2026, Weslley, NPG5429)**: peça incluída à mão (✏️ EDITAR) em card de seguradora pergunta **quem paga** — ➕ Seguradora (complemento) ou 👤 Cliente (particular) — e o envio não sai sem a resposta (antes virava complemento sozinha). A **diretoria** tem em cada peça o botão **👤 p/ particular** / **🛡️ p/ seguradora** (move entre as listas sem perder o que foi digitado; a particular fica para o consultor do pedido autorizar); peça já comprada não muda (cancelar a compra antes). O servidor já recusava essa troca de quem não é diretoria. Na edição só uma lista aparece por vez (seguradora ou particular): um aviso mostra quantas peças a outra lista tem, com o botão **Ver peças particulares / da seguradora**. Ao gravar, a troca de quem paga vira comentário no card: "🔀 **QUEM PAGA MUDOU** — nome" com as peças que passaram para particular (menciona o consultor que autoriza) e as que voltaram para a seguradora.
**FO revertida para a oficina no orçamento novo (14/10/2026, JDC7H45)**: peça do orçamento importado que vem como da OFICINA e casa **pelo código** com item do FORNECIMENTO — mesmo já ✔ (usaram peça do estoque) — entra na lista PEÇAS como ➕ complemento e o item sai do FORNECIMENTO ("🔁 Passou de fornecida para oficina"); vale também para orçamento **já processado** relido pelo formulário (só pelo código). Pela descrição parecida, só item ainda não entregue. Leitor Cilia: código com ponto no fim (`1312791700. BRAÇO OSCILANTE`) é lido (antes a peça sumia). Orçamento Cilia guardado pelo leitor antigo é relido quando alguém o lê pelo formulário (`VD_LEITOR_V` = 2; o robô continua usando o guardado).
**Peça revertida que a seguradora entrega mesmo assim (14/10/2026, Weslley: recusar/devolver)**: cada reversão fica registrada no card (propriedade `FO_REV_<id>`, também recuperada dos comentários "🔁 Passou para a oficina"); o comentário da reversão avisa "recusar na entrega"; a aba 📦 Recebimento mostra o quadro **🔁 Passaram para a oficina** com os botões **🚫 Recusei na entrega** / **↩️ Chegou e devolvi** (`vdf_foRevertidas` / `vdf_foRevertidaDevolvida`, quem pode receber) → comentário "↩️ **FO REVERTIDA RECUSADA|DEVOLVIDA** — peça" e evento DEVOLUÇÃO FO. A peça não volta para o FORNECIMENTO. Peça tirada do estoque: sem controle de reposição por enquanto (Weslley, 14/10).
**Placa puxada do orçamento (15/10/2026, Weslley, RHR9A41)**: ao ler um documento no pedido, o formulário preenche a placa vazia com a `placaSug` do servidor (`vdf_respostaLeitura_`): a placa "com rótulo" (logo depois de PLACA, no Cilia) se for única; senão a única placa achada; senão a única que não tem cara de ano (ex.: "4X4 AUT 2022" no modelo virava a placa falsa AUT2022 e, com duas placas, nada era preenchido).
**Card com 📄 ORÇ anexado e sem peças (15/10/2026, Weslley, RHR9A41)**: o orçamento anexado pelo robô (API do Cilia) só conta como "já importado" se o card tem peças (ou itens de fornecimento). Sem peças, o ✏️ EDITAR lê sozinho o 📄 ORÇ mais novo e importa as peças como pedido novo (antes ficava "importado", o PDF não era lido nem pelo "ler" e a peça digitada virava ➕ complemento); a exigência de orçamento anexado continua satisfeita por esse anexo.
**Observação da peça na descrição (15/10/2026, Weslley, BET7D44)**: a observação escrita na peça no pedido (campo Observação, gravada como `| OBS:` na descrição completa) aparece na vitrine do card como "📝 texto" logo abaixo da peça — inclusive nas 🚫 não comprar. Os cards que já tinham observação são regravados uma vez só, aos poucos, pelo ciclo do robô (`vd_obsVitrine_`, propriedade `VD_OBSVIT`; a descrição completa não muda).
**Código ou foto na peça particular/retorno (22/10/2026, Weslley)**: onde o código é opcional — pedido PARTICULAR, peça 👤 particular em card de seguradora e pedido de RETORNO — a peça nova (ou com descrição mudada) precisa do **código** ou de uma **foto da peça**. Cada peça ganha "📷 Foto da peça" no pedido (camada 2.0); a foto sobe com o pedido, vai para o card como "📸 PLACA · peça DESCRIÇÃO · dd/mm" e a linha ganha `| FOTO` (fora da assinatura: não é peça nova; a vitrine mostra "📷 foto"). Peça que já estava no card fica como está; pneu, 🚫 não comprar e card aberto pela Rotina não entram. Regra no servidor (`vdf_salvar`, `vdf_fotoPecaLigada_`): sempre no TESTE; no principal com a propriedade `VD_FOTO_PECA=SIM` + `FOTO_PECA: 'todos'` no `powerup/config.js` (hoje `'teste'`).

**Orçamento só de mão de obra (23/10/2026, Weslley: "orçamentos só de mão de obra também devem ter card aberto e o robô deve encaminhá-los para ENCERRADO automaticamente"; DTA9330, GHH1I54, FYS4A72)**: a Rotina Unity abre o card pela API (`vdf_salvar` com `rotina:true` + `soMaoDeObra:true`, diretoria, card novo). Sem peça nenhuma: não exige peça nem PDF anexado, mas exige `orcamento.origem` (vira a linha "_Orçamento importado (…)_", que dispensa modelo/ano/chassi como em todo orçamento importado). Recusa (com o motivo) se a placa tem orçamento na base do robô com peça de TROCA ou FO, ou se veio peça/FO no pedido. O bloco PEÇAS leva `_nenhuma peça pela oficina — orçamento só de mão de obra (sem peça de troca nem fornecimento)_` (`VD_SO_MO_LINHA`, lida por `vd_soMaoDeObra_`): por começar com "nenhuma peça" o robô não acusa "lista de peças no padrão" e a linha não é peça nova nas colunas depois da cotação. A base de peças (`VD_PK2_`) é registrada na criação. Editar o card sem peça (unidade, ordem, OBS) pela API mantém a marca; incluir peça tira a marca e o card volta a EM COTAÇÃO pela regra de peça nova. A tela do formulário ainda pede "Adicione pelo menos uma peça" ao editar esse card (validação da tela clássica, não mexida). Chave: `vdf_soMaoDeObraLigada_` — sempre no TESTE; no principal com a propriedade `VD_SO_MO=SIM`; sem ela `soMaoDeObra` é ignorado e vale a recusa de sempre. (Card já aberto sem peça continua indo para ENCERRADO por `vdf_encerrarSemPecas`, 20/10.)
**Ler o orçamento num card com peças lançadas à mão (22/10/2026, Weslley, AYT6699)**: no ✏️ EDITAR, ler (ou "Importar de novo") o orçamento compara com as peças do card também quando o anexo já foi processado: a peça que o orçamento traz (casada pelo código ou pela descrição, `cp_comparar_` → `casadas`) passa a aparecer como **do orçamento** (faixa verde) e, se foi lançada **sem código**, recebe o código e o valor do orçamento (antes só a peça que já tinha código era atualizada, e reler um orçamento já processado não atualizava nada). Só grava no Enviar. Ao abrir o card, peça com valor do orçamento em card com orçamento aparece como do orçamento (antes complemento e peça de card particular eram sempre "incluída à mão").
**Robô não devolve para FALTA DADOS com descrição velha (22/10/2026, Weslley, AYT6699)**: o formulário salvou e levou o card para EM COTAÇÃO; 3 s depois o ciclo do robô, com a descrição completa anterior na mão, devolveu o card para FALTA DADOS sem comentário (o aviso era o mesmo) — foi preciso enviar 2 vezes. Antes de devolver para FALTA DADOS um card mexido nos últimos 5 min, o robô confere (`vd_completaAtrasada_`) se a cópia oficial (aba TRAVA) bate com a vitrine do Trello e com a descrição que ele leu; se não bate, não mexe e não marca o card como visto — o próximo ciclo olha de novo.
**Ciclo do robô pelo aviso do Trello (22/10/2026, Weslley: "altera e monitora", direto no principal)**: card que mudou → ciclo em segundos pelo webhook (como antes) e um **seguimento 100 s depois** (as travas de coluna/checklist julgam movimento com mais de 90 s; licença vale 4 min). O despertador de 1 min do servidor continua (chave do Google, rotinas diárias), mas a **varredura do quadro** roda só a cada 10 min (minuto múltiplo de 10, para os prazos de 5 em 5 continuarem), de madrugada (3h–5h59, anexos antigos) a cada minuto, e sempre que passar de 10,5 min sem ciclo. Aviso de "robô parado" passou de 10 para 25 min. Voltar ao jeito antigo: `ROBO_VARREDURA_MIN = 1` em `servidor/src/gas/ponte.ts`. Contadores em `GET /tarefas/robo/rapido` (seguimentos, varreduras, pulados).
**Print "Peças do sinistro" da HDI lido em colunas (23/10/2026, Weslley, FUR0C92)**: (1) cabeçalho com dados na mesma linha ("Prev.Entrega 20/10/26", "Entrega Fornecedor 20/10/26 …") não vira mais peça; (2) duas peças na mesma linha (a 1ª palavra se repete: "MOLDURA … DIR … MOLDURA … ESQ …") viram duas; (3) nas linhas das colunas Entrega/Fornecedor/Tel/E-mail, cada data seguida de nome é o fornecedor da próxima peça, na ordem do portal (uma linha com um fornecedor logo depois da peça é dessa peça); a data dessas células não marca entrega; (4) concessionária "MARCA cidade UF" sozinha na linha ("Servopa VW Curitiba PR") não é peça; (5) código Mitsubishi "62022W730P" não é mais partido em "62022 W730P" (a separação de código grudado só vale quando vem palavra depois dos dígitos).
**"QTD 1" não é fornecedor (23/10/2026, Weslley, SFL9F03)**: no Status das Peças do Cilia lido por OCR, a linha depois de "FORNECEDOR" podia ser a quantidade ("QTD 1") e o item FO ficava "LANTERNA TRASEIRA ESQ - QTD 1". Agora o leitor pula a quantidade, `vdf_atualizarFornecimento` ignora fornecedor "QTD n" e o sufixo " - QTD n" que já estava em item sai do nome base (`pv_baseFo_`).
**Chassi do orçamento com tamanho errado (26/10/2026, Weslley, APO0I47)**: quando o documento traz o chassi com tamanho diferente de 17 (ex.: "9BWB05W58P078022", 16 — erro do próprio orçamento), ele continua não sendo preenchido, mas o robô avisa no comentário do card ("ℹ️ o anexo … traz o chassi … com 16 caracteres (chassi tem 17) — confira no documento do carro e preencha pelo ✏️ EDITAR") e a leitura no formulário mostra o mesmo aviso (`vd_extrair_` → `chassiInvalido`). Vale para leituras novas; anexo já lido antes fica com a leitura guardada.
**Autorizar com peça ainda sem cotação (16/10/2026, Weslley, NPG5429)**: peça do card sem cotação, sem justificativa "sem cotação", sem autorização e fora dos checklists PAGAS (ex.: complemento novo que acabou de entrar em EM COTAÇÃO) segura o card: "Enviar autorização" sem escolha nova é recusado com o aviso da peça pendente; autorização com escolha nova é gravada, mas o card não vai para AUTORIZADO COMPRA ("⏳ Aguarda: cotação do comprador: …"). Antes o fechamento das autorizações antigas levava o card para AUTORIZADO COMPRA com a peça sem cotar.
**Cache de leitura de anexos na planilha (16/10/2026, alerta "Propriedades do script em 386 KB")**: a leitura guardada de cada anexo (antes `VD_ANX3_<anexo>` nas Propriedades do script — 181 KB de 445 KB, limite ~500 KB) fica na aba **ANEXOS** da planilha de controle (`vd_anxGet_` / `vd_anxSet_` / `vd_anxTem_`, com memória da execução e CacheService na frente; até 45 KB por leitura, então orçamento grande também guarda as peças). As `VD_ANX3_` antigas são lidas normalmente e migram aos poucos no ciclo (`vd_anxMigrar_`, 80 por volta; `VD_ANX_`/`VD_ANX2_` de versões velhas são apagadas). A limpeza diária tira da aba as leituras de anexo que não está mais em card aberto. O "Consumo" da diretoria (`vdf_consumo`) mostra o uso das propriedades por prefixo.

**Chave da peça**: código sem espaços; sem código → descrição sem acento; pneu → `PNEU <medida>`. Item de
checklist casa pelo prefixo `chave + ' '` (código/pneu) ou `chave + ' - '` (descrição).

### 4.3 Cotação / autorização / compra

- Cotação: fornecedor (normalizado pelo cadastro), tipo+marca, valor, **prazo em dias úteis**, link opcional (guardado sem
  o rastreio — AliExpress só `/item/<id>.html`, Mercado Livre/Shopee/Amazon só o caminho, demais sem `utm_`/`spm` etc.; parênteses
  viram `%28 %29`; até 1 500 caracteres — 07/10/2026; a cotação nova da "cotação indisponível" também aceita link),
  OBS por peça, `SEM COTAÇÃO <peça>: motivo`, `NT` por fornecedor, `REMOVIDA:` tira a cotação igual mais recente.
  **Obs. da cotação** (26/10/2026): `… - prazo - 📝 texto - [🔗 link](url)` — a obs. do comprador naquela cotação fica entre o
  prazo e o link (uma linha, sem link nem marcação, até 200 caracteres; `vdf_notaCot_`); aparece na vitrine, na Cotação, na
  Autorização e na Compra. **Código corrigido pelo comprador** (26/10/2026): `p.codigos=[{chave, codigo}]` no `vdf_salvarCotacao`
  (sozinho ou com a cotação) troca o código da peça na linha do pedido e em toda linha do card que é dessa peça (cotações, OBS,
  SEM COTAÇÃO, autorização; peça sem código ganha o código antes da descrição); a base de peça nova (`VD_PK2_`) troca a
  assinatura antiga pela nova (não é peça nova); evento `CÓDIGO CORRIGIDO` e comentário `🔁 CÓDIGO CORRIGIDO NA COTAÇÃO`.
  Recusa: pneu, peça já comprada (PAGAS/COMPRADO), código inválido (4–40, com número) ou de outra peça do card.
  Toda peça precisa de cotação **ou** justificativa para o card seguir.
- Autorização: vale a mais recente por peça; `DEVOLVIDA PARA COTAÇÃO` anula todas, menos as listadas logo abaixo em `MANTIDA (comprada): <chave>` (peças já no PAGAS); `INDISPONÍVEL` do mesmo
  fornecedor anula a daquela peça. A cotação autorizada tem de existir no card (mesmo fornecedor e valor).
- Compra: **não vai para a descrição** — vira item no checklist `PAGAS` (`PAGAS PARTICULAR`, `PAGAS COMPLEMENTO`)
  com nome `CÓDIGO DESCRIÇÃO - FORNECEDOR - R$ x` e `due` = previsão (data ou hoje + dias úteis).
  "Fora da autorização" (sem autorização, fornecedor/valor/prazo diferente) exige justificativa, vai no comentário
  e no evento. Linha legada `COMPRADO:` só é lida.
- Recebimento: `state = complete` no item + data; atraso em d.u. (negativo = antes); foto/NF anexada.

### 4.4 Checklists

| Nome | Conteúdo | Item |
|---|---|---|
| `PAGAS` / `PAGAS PARTICULAR` / `PAGAS COMPLEMENTO` | compras da oficina | `CÓDIGO DESCRIÇÃO - FORN - R$ x`, due = previsão, ✔ = recebida |
| `FORNECIMENTO` / `FORNECIMENTO COMPLEMENTO` | peças FO | `CÓDIGO DESCRIÇÃO[ (xN)][ - FORNECEDOR][ - EM COTAÇÃO, AINDA SEM PRAZO | — B.O. NO PORTAL (dd/MM)]`, due = previsão (situação B.O./em cotação **tira a data**, 07/10/2026), ✔ = entregue |

Regra do fornecimento (06/10/2026): item já recebido com data **não muda a previsão** (fornecedor/código/descrição
ainda atualizam; avisa); sem data anterior → grava sem motivo; **motivo obrigatório só quando a nova previsão
é posterior** à antiga. Rotina (diretoria) usa motivo automático "portal da seguradora".

**CSS — Zacarias (regra fixa, 08/10/2026, Weslley):** nos carros que a oficina faz para a **ZACARIAS** (concessionária CSS), as
peças são **sempre fornecidas (FO)**, seja qual for a seguradora. Reconhecimento: `ZACARIAS` no título do card ou no nome do
carro do pedido (`VD_CSS`, `vd_cardCss_`). Efeito: toda peça de orçamento (lida pelo robô — `cp_doAnexo_` — ou enviada pelo
formulário — `vdf_salvar`, inclusive complemento) vai para o checklist `FORNECIMENTO` com fornecedor `ZACARIAS`
(`vd_orcCss_`, `vd_pecaParaFo_`); nada entra na lista da oficina, exceto peça **particular** ou 🚫 não comprar. No formulário,
peça de card CSS não exige código/tipo nem orçamento anexado (vira FO). Caso-base: SEZ6D14 (Youse).

### 4.5 Anexos

Anexo lido pelo botão do formulário é renomeado na hora; o cache curto de orçamento grande guarda que é orçamento (antes não guardava e o anexo nunca era renomeado — 13/10/2026, UIC5G94).
**Nome das notas (13/10/2026, Weslley):** o mesmo padrão das rotinas de NF — `NF <EMITENTE 20> - <nº sem zeros> - <dd-mm da emissão>.pdf` e `NF FORNECIMENTO - <EMITENTE 20> - <nº> - <dd-mm>.pdf` (nota de peça fornecida pela seguradora: fornecedor só nos itens FORNECIMENTO). Vale para a nota subida no 📦 Recebimento (lê XML ou DANFE; sem leitura fica o `📦 NF · …` antigo) e para nota anexada à mão, renomeada na madrugada (`ax_dadosNf_`: XML nNF/xNome/dhEmi; DANFE "RECEBEMOS DE … OS PRODUTOS", Nº 000.000.000, DATA DA EMISSÃO). Os `📦 NF · …` antigos também passam ao padrão.
**Madrugada (3h–5h59 — depois da Rotina Unity das 1h59 —, dentro do ciclo de 1 min — `ax_madrugada_`, 13/10/2026, Weslley; até 150 leituras por noite, o resto na noite seguinte; cada renomeação fica em `AX_MAD_REN` (card, anexo, de, para) para desfazer):** cards abertos fora de ENCERRADO/ENTREGUES; lê (OCR) os PDFs sem nome padrão e nunca lidos e batiza pelo que são; orçamento mais velho que outro 📄 ORÇ do card vira `📄 ORÇ · … (antigo)`; o não reconhecido fica como está e não é relido (a leitura fica guardada). Resumo de cada noite em `AX_MAD_LOG`. Teste num card: `vdf_anexosAntigosCard` (diretoria).
Nomes padronizados: `📄 ORÇ · PLACA · SEGURADORA · Sistema · dd/MM`, `📄 ORÇ+` (complementar),
`🚚 FO · PLACA · Status do Pedido Cilia · dd/MM`, `📦 NF nº · PLACA · FORN · dd/MM`, `📸 PLACA · capa|recebimento · dd/MM`,
`🛒 COMPRA · PLACA · FORN · PEÇA · dd/MM` (print/arquivo da negociação e pagamento, aba Compra, 08/10/2026; sem versão);
repetição do tipo ganha ` v1`, ` v2`…; cópia idêntica (MD5) é apagada; máx. 6 anexos legíveis por card, 15 MB.
**Regra 08/10/2026 (Weslley): tudo o que for colado/anexado no formulário vai para o card, exceto cópia idêntica** — na aba
Compra a conferência de MD5 é feita antes de anexar (o repetido é descartado e citado no comentário). Anexo que o próprio
sistema batizou como `📦 NF`, `📸` ou `🛒 COMPRA` não passa pelo OCR do robô (não é orçamento). O mesmo vale para as **notas que as rotinas de NF anexam em lote** (`NF <EMITENTE> - <nº> - dd-mm.pdf`,
`NF FORNECIMENTO - …`, `NF ML + resumo - …`, `NFS-e <nº> - …`; `ax_ehNota_`, 10/10/2026): nem o ciclo do complementar nem a
validação do card leem esses PDFs, e card em FALTA DADOS não ganha "📄 Li o anexo mas não reconheci" por causa de uma nota.
Quem batiza: o robô ao ler anexo novo subido à mão (módulo complemento; leitura que falhou é tentada de novo em até
3 ciclos, `CP_RETRY`), o formulário ao anexar, e **o "📎 Ler" da aba Fornecimento** quando reconhece o documento
(Status do Pedido Cilia / Peças HDI) e acha peças do card (07/10/2026, ATX2884).
Links anexados ao card: `✏️ EDITAR/INCLUIR PEÇA` (`?card=<shortLink>`) e `💰 COTAÇÃO/COMPRA/RECEBIMENTO`
(`&modo=compras`).

**Power-Up** (`powerup/`): o Trello reaproveita o iframe da seção do card ao trocar de card, mudando só o `#contexto`
do endereço (sem recarregar) — a biblioteca guarda o contexto lido na abertura. A seção e o popup recarregam no
`hashchange` e conferem o card do hash contra o da biblioteca antes de abrir o formulário (07/10/2026, BXZ4J84 abria AUX4331).

### 4.6 Campos personalizados

`Unidade` (lista), `Seguradora` (lista, aprende), `Tipo` (SEGURADORA/PARTICULAR/RETORNO/MISTO), `Placa`, `Consultor`
(@criador), `Total seguradora`, `Total particular`, `Total retorno`, `Total seg+part` (soma dos três; por peça: valor comprado, senão autorizado),
`Nº Ordem` (só pelo formulário, dígitos).

### 4.7 Planilha (hoje) → tabelas (futuro)

| Aba | Colunas | Uso |
|---|---|---|
| backup | Data, Quadro, Card, Link, Motivo, Descrição original | antes de o robô reescrever |
| `TRAVA` | Card id, Assinatura, Quando, Vitrine (D), **Completa (E)** | fonte de verdade da descrição |
| `EVENTOS` | Data/hora, Evento, Card, Link, Placa, Unidade, Tipo do pedido, Peça, Particular, Fornecedor, Valor, Prazo d.u., Previsão, Usuário, Detalhe, Quadro | **histórico analítico** (uma linha por peça) |
| `FORNECEDORES` | Nome, Apelidos (`\|`), Código Databox, CNPJ, Cadastro, Usos, Último uso, Origem | cadastro com normalização de nome |
| `CHECKLISTS` | Card, JSON, Atualizado | retrato para a trava |
| `PAINEL` | indicadores (seção 8) | |

Tipos de evento: PEDIDO, PEDIDO EDITADO, PEÇA NOVA, COTAÇÃO, AUTORIZAÇÃO, DEVOLUÇÃO, COMPRA, RECEBIMENTO, COLUNA,
MOVIMENTO DESFEITO, CHECKLIST DESFEITO, ALERTA PRAZO, COMPLEMENTO, COTAÇÃO INDISPONÍVEL, PREVISÃO, FORNECIMENTO,
FATURADO, CARD EXCLUÍDO E RECRIADO.

### 4.8 Estado interno (Propriedades do Script hoje)

Por card: `VD_PK2_` (assinaturas), `VD_NOVAS_`, `VD_SIG_` (faltas já avisadas), `VD_AT_` (última atividade|coluna),
`VD_DESC_` (hash da descrição), `PZ_AT_`, `ST_ESP_` (origem antes de ESPERA), `SLA_*`. Por anexo: `VD_ANX3_<id>`
(cache de leitura, v3). Marcas de histórico por módulo: `TR_ACT, ST_ULTIMA, CK_DESDE, EXC_ULTIMA, FAT_ULTIMA,
CP_ACT, NU_ACT`. Cota: `QT_DIA_<data>`. Falhas: `FALHAS_<rotina>`, `FALHAS_T_<rotina>`.

Limpeza diária (`sd_limparPropriedades_`, dentro da conferência das 7h50): tudo o que é por card de card fechado/arquivado/legado
(`VD_PK2_, VD_AT_, VD_SIG_, VD_NOVAS_, VD_DESC_AV_, PZ_AT_, PZ_COL_, PZ_SEMPREV_, ST_ESP_, SLA_<card>_` — em card **antigo
aberto** ficam `SLA_` e `PZ_COL_`, que o SLA de faturamento usa), o cache de anexo (`VD_ANX3_`) de anexo que não está em card
aberto (e com mais de 48 h) e os avisos por item (`SLA_I_<item>_…`) cujo item não existe mais em card aberto (10/10/2026 —
antes o cache de anexos e os avisos por item nunca saíam; o limite de 500 KB das propriedades derrubava o núcleo). Gravar o
cache de anexo nunca derruba a leitura (erro engolido).

**Prazo do ciclo** (10/10/2026): o acionador de 1 min abre um prazo único de 5 min (`VD.CICLO_MS`, `vd_cicloIniciar_`); o núcleo
tem até 3 min deixando 90 s de reserva, e complemento (60 s), prazos (40 s) e SLA (40 s) recebem o menor entre o seu limite e o
que resta (`vd_prazo_`); parte com menos de 30 s restantes é pulada ("pulado (ciclo cheio)" no log de tempos). O Google mata a
execução aos 6 min sem `finally` nem alarme — antes o pior caso passava disso.

**Cópia oficial antes do Trello** (10/10/2026): `vd_gravarDesc_` grava a completa na TRAVA **antes** do PUT no Trello; se a
planilha falhar, nada muda no card e quem salvou vê "Não consegui guardar a descrição na planilha de controle…"; se o Trello
falhar depois, a TRAVA volta ao que era (senão o reenvio leria a completa nova e duplicaria a cotação). Completa acima de
45.000 caracteres (limite da célula: 50.000) gera e-mail à diretoria uma vez por dia por card. Trechos ler-modificar-gravar
compartilhados entre formulários (`CP_VISTOS`, `RC_LOCAIS`, linha nova na TRAVA) rodam num mutex curto de cache (`sg_secao_`).

Histórico com `since` (`vd_acoesQuadro_`): direto no Trello o limite sobe para 1000 (o Trello devolve as N mais novas; com 100,
depois de horas parado, as ações mais antigas da janela ficavam para trás e os marcadores pulavam por cima delas).

Correções menores de 10/10/2026 (revisão): a varredura completa do núcleo é por tempo (`NU_COMPLETA_EM`, a cada 30 min),
não mais pelo minuto do relógio; vitrine acima de 16.000 caracteres perde os links de anúncio e, se ainda passar, é cortada
com aviso (o Trello recusa > 16.384); "Enviar cotação" é recusado em card em FALTA DADOS (salvar parcial continua);
"SEM COTAÇÃO" de bloco anterior cai quando a peça ganha cotação depois; compra exige prazo em dias úteis (cotação sem prazo
pede o prazo na hora); card com toda peça "sem cotação" em PENDENTE AUTORIZAR explica a saída (🚫 não comprar por peça ou
devolver); diretoria que tira do pedido peça já comprada tira também o item PAGAS (comentário 🗑️ + evento COMPRA
CANCELADA); data de chegada no futuro é erro; o "criador" do card vem do campo personalizado **Consultor** quando
preenchido (`@usuario` — a diretoria pode corrigir no card), senão da criação, e se quem criou é da diretoria usa
"_Pedido enviado por Fulano_" procurando o nome entre os membros do quadro (`vd_membroPorNome_`); trava do formulário é
**por card** (cache, até 2 min, solta no fim da chamada — `sg_travarCard_`), só card novo usa a trava geral; id do quadro
em cache (menos 1 chamada por gravação); a trava de descrição só lê todas as propriedades quando há card a conferir;
`vd_legado_` fora do ciclo lê só a completa daquele card.

---

## 5. Formulário (telas e ações)

Uma página, aberta com `?card=<shortLink>` (modo consultor) ou `&modo=compras` (modo compras). Login = token do
Trello do usuário (guardado no navegador).

| Tela / aba | Ação no servidor | Conteúdo |
|---|---|---|
| Pedido novo / ✏️ Editar | `vdf_salvar` | tipo (seguradora/particular), unidade, carro, placa, modelo, ano, motor, chassi, cor, seguradora, sinistro, nº ordem; anexos (orçamento → importa peças e FO por OCR; foto de capa); peças (código, qtd, valor no orçamento, descrição, tipo 1–2, ➕ complemento, 🚫 não comprar + motivo, **observação da peça**); pneus; obs geral. Duplicidade de placa aberta pede confirmação: **atualizar** o card existente, **🔁 card novo com os dados deste carro (retorno interno)** — copia carro, cor, modelo, ano, motor, chassi, seguradora, sinistro e unidade; nº da ordem e peças ficam em branco; a observação ganha "RETORNO INTERNO — card anterior: … (link)" (09/10/2026) — ou card novo em branco. Card criado à mão sem dados do carro (ex.: "PLACA CARRO RETORNO INTERNO") aberto pelo Power-Up: o formulário puxa modelo, ano, motor, chassi, cor e unidade de outro card aberto da mesma placa, só nos campos vazios (09/10/2026) |
| 💰 Cotação | `vdf_salvarCotacao` (`parcial` true/false) | por peça: fornecedor (autocompleta do cadastro), tipo/marca, valor, prazo d.u., link, **obs. da cotação** (26/10), obs da peça, "sem cotação: motivo", **✏️ Código** (comprador corrige o código da peça — balão, vai com o salvar; `p.codigos`, 26/10); NT por fornecedor; remover cotação. Dois botões: **Salvar parcial** (guarda aos poucos, card fica em EM COTAÇÃO) e **Enviar cotação** (exige cobertura total; card anda) |
| ✅ Autorizar | `vdf_autorizar` (`escolhas`, `marcas`, `parcial`), `vdf_devolverCotacao` | por peça: escolher cotação (menor preço pré-marcada; selos 💲 menor preço / ⏱ menor prazo; valor do orçamento e economia), não autorizar, obs; obs geral; devolver com motivo. **Diretoria** também marca ➕ complemento / 🚫 não comprar (com motivo) direto na aba (07/10/2026): troca só a linha da peça na descrição, atualiza a base de peça nova, comenta; só marcas sem autorização reavalia a coluna. Peça já autorizada com a mesma cotação marcada **não é reenviada** (revisão 07/10/2026) |
| 🛒 Compra | `vdf_salvarCompra` (`parcial`, `compras[].anexos`, `anexosExtra`), `vdf_cotacaoIndisponivel`, `vdf_marcarOrdemAutorizada`, `vdf_avisarSolicitante`, `vdf_alterarPrevisao` | marcar peças compradas (previsão por data ou d.u.), links 🔗 dos anúncios informados na cotação (na linha da autorizada e abaixo da lista, 07/10/2026), **print/arquivo da negociação e pagamento por peça** (escolher arquivo ou Ctrl+V na peça; sobe na hora, vai para o card no Salvar parcial/Enviar como `🛒 COMPRA · …`, mesmo em peça ainda sem compra escolhida; 08/10/2026), justificar fora da autorização, cotação indisponível + nova cotação, ordem autorizada, aviso ao solicitante (Databox), alterar prazo autorizado com motivo |
| 📦 Recebimento | `vdf_salvarRecebimento` | ✔ por item com data (data futura é erro), **📍 onde guardou** (prateleira; sugere os locais já usados — `RC_LOCAIS`), obs, foto/NF da peça; obs geral. Bloco **Peças já recebidas** (10/10/2026): por peça, **📍 local**, **✋ retirada** (quem levou — funileiro, unidade, montagem — e quando) ou **↩️ devolvida ao fornecedor** (motivo): peça PAGAS devolvida tem a **compra cancelada** (item sai do checklist, evento COMPRA CANCELADA, card volta para AUTORIZADO COMPRA, precisa de compra nova); peça FO devolvida volta a pendente com a marca "↩️ DEVOLVIDA dd/MM" (evento DEVOLUÇÃO FO). Local e retirada ficam no fim do nome do item (`· 📍 D3 · ✋ LEOMAR 10/10`), aparecem na vitrine ao lado do 🛒 e geram evento RETIRADA |
| ✋ Retirada | `vdf_salvarRetirada` (10/10/2026, Weslley) | peças já recebidas e ainda no estoque (com 📍 local); marca várias, **quem retirou** (sugere os nomes já usados — `RC_QUEM`) e data (futuro é erro); grava `· ✋ QUEM dd/MM` no item, evento RETIRADA, comentário "✋ RETIRADA" com o que ainda está no estoque; **desfazer** retirada com motivo. Mesma permissão do recebimento (Toledo: compras/diretoria; filiais: também o consultor). Card em **ENCERRADO** com todas as peças recebidas e retiradas vai sozinho para **ENTREGUES**. A aba só aparece com peça recebida; a retirada saiu do bloco "Peças já recebidas" do Recebimento (lá ficam local e devolução) |
| 🛒 Compra — **❌ compra cancelada** | `vdf_cancelarCompra` (10/10/2026) | peça comprada ainda não recebida: motivo obrigatório; item PAGAS sai, evento COMPRA CANCELADA, comentário "❌ COMPRA CANCELADA … verificar compra do item", card em FALTA CHEGAR volta para AUTORIZADO COMPRA (`rc_reavaliarColuna_` com `semCompra`) |
| 🚚 Fornecimento | `vdf_atualizarFornecimento`, `vdf_lerFornecimento`, `vdf_lerFornecimentoAnexo` | por item FO: fornecedor, previsão, situação (em cotação / B.O.), motivo (só se adiar); leitura de "Status do Pedido" (Cilia/HDI/Soma) por upload ou de anexo já no card; peças FO novas do documento |
| Todas as abas | — | links 📎 dos anexos originais; atalho de upload do fornecimento; **colar com Ctrl+V** (print, foto, PDF ou arquivo copiado) vai para o campo de anexo mais próximo do último clique, senão para o da aba aberta (07/10/2026) |

Funções de leitura: `vdf_abrir`, `vdf_iniciar`, `vdf_buscarPlaca`, `vdf_carregarCard`, `vdf_lerDocumento`,
`vdf_lerAnexoCard`, `vdf_valoresOrcamento`. Administrativas (diretoria): `vdf_padronizarAnexos`,
`vdf_padronizarQuadro`, `vdf_removerRepetidos`, `vdf_textoAnexo`, `vdf_consumo`.

---

## 6. Leitura de documentos (OCR) — o que se extrai

Hoje: PDF/imagem → Google Drive → Google Docs OCR (pt). No servidor próprio: `pdftotext` para PDF com texto,
Tesseract/serviço de OCR para imagem e PDF escaneado.

| Documento | Como reconhece | O que extrai |
|---|---|---|
| Orçamento **HDI** | seções `PEÇAS FORNECIDAS PELA OFICINA` / `PELA HDI`; `VEICULO: … ANO PLACA:` | código, descrição, qtd, unitário, desconto % → líquido; placa, chassi, ano, modelo, cor, sinistro; FO |
| Orçamento **Websoma/Soma/Porto** | `PEÇAS - TROCA (…)`, `LISTA DAS PEÇAS FORNECIDAS PELA SEGURADORA`, `LICENCA:` | código, descrição, tipo (REPOSIÇÃO/GENUÍNO…), qtd, bruto, desconto, líquido; FO com fornecedor/prazo da tabela STATUS DE ENTREGA |
| Orçamento **Websoma/Porto detalhado** (08/10/2026, ATP5105) | mesma seção (ou só `LISTA DAS PEÇAS FORNECIDAS PELA SEGURADORA`, quando o PDF é só a lista de FO), códigos VW espaçados (`5U4/ 831055/D /CTR`) | leitor próprio `vd_websomaDetalhado_`: compacta o código (`5U4/831055/D/CTR`), descrição entre parênteses ou não, ignora `- Val. aaaa/aaaa` e `*` antes do tipo, junta complemento sem número (cor: "PRETO SATIN"), e quando vários códigos vêm seguidos antes das descrições casa-os em fila (código solto na linha também vale). O texto é cortado em blocos entre os preços (`TIPO QDE VLR DESC% VLR`): cada bloco vira um ou mais itens (começam num código — inclusive `93286309//`, Toyota `64780 0A120 C0`, `SOMA009` — ou em `NOME (DESCRIÇÃO` depois de um `- VAL.`) e cada preço sai para o item mais antigo da fila, porque o OCR às vezes traz 2–3 itens seguidos e só depois os preços. Linha de ajuste de desconto (`DEVOLUÇÃO DESC. PEÇAS DE 24% PARA 15%`) consome o preço e some. O mesmo relatório pode vir com número em formato inglês (`1 1,528.39 14.00 1,314.42 0.50 4.00`, "PAGE 1 OF 3"), sem coluna TIPO e com sub-itens de R&I embaixo da peça (`37417 FORRO DA PORTA DT LE 0.50 0.00 … TOTAL: 0.50 0.00`) — os sub-itens são descartados e os números convertidos (treino 2025, 08/10/2026). Palavra repetida ("PORTA PORTA PORTA DIANTEIRA") vira uma e descrição impressa em duas colunas ("PORTA DIANTEIRA LE PORTA DIANT", "LAT. EXT. COMPLETO LE LAT. EXT. COMPLETO LE") fica só a primeira. Nome curto do carro pula NOVO/NOVA ("NOVO GOL" → GOL) |
| Orçamento **Tokio/Cilia layout DESCRICAO/CODIGO** (08/10/2026) | `DESCRICAO/CODIGO FORNECIMENTO` + `COD:` | linhas `T … qtd descrição COD: código OFICINA/SEGURADORA/CLIENTE R$ bruto % desc R$ líquido`; CLIENTE fica fora; valor = líquido |
| Orçamento **Cilia** em fila (08/10/2026) | idem Cilia | quando o OCR imprime dois itens e depois os dois preços, cada preço (`OFICINA`/`SEGURADORA`) casa com o item mais antigo da fila; tipo colado no código e 2º código colado na descrição são separados |
| Orçamento **HDI** (08/10/2026) | idem HDI | aceita código Ford com espaços, página cortada (sem total), cabeçalho até `DESCONTO (%)`; OCR que cola palavras ("PARALAMADIANT") é separado. PDF "Exibir Sinistro" salvo do navegador vem com texto ilegível (fonte quebrada) → **não lê**; a equipe deve anexar o print |
| **Pneu** | só quando a descrição começa com `PNEU(S)`/`JOGO DE PNEUS`/`KIT PNEUS` ou traz medida (`185/65R15`) | medida, marca, categoria — "CALOTA DA RODA" ou "RODA DE AÇO" não viram pneu (08/10/2026) |
| Orçamento **Cilia** | `FORNECIMENTO` + coluna T; `CASCO - MARCA - MODELO (..) ANO`. Se o PDF tem o cabeçalho `TITULO FORNECIMENTO PRECO` é Cilia mesmo que o resumo cite "PEÇAS FORNECIDAS PELA OFICINA" (08/10/2026) | idem; `OFICINA`/`SEGURADORA` separa oficina/FO; siglas de tipo (GENUINA, ORIGINAL, PRO, PPO, PPG, PPC, PAR, GE = genuína, OR = original, PG, PO…); valor líquido = preço × (1 − desconto %) (número seguido de % é desconto, 07/10/2026) |
| **Peças do sinistro** (portal HDI, PDF ou print) | `PEÇAS DO SINISTRO` / `Peças do Laudo` | tabela sem código: descrição, Prev.Entrega, Entrega, Fornecedor (tel./e-mail); linhas "Fornecido pela Oficina" ignoradas; casa com os itens FO do card **pela descrição** (`cp_similar_`); aceita texto em linha ou em colunas; ícones de ordenação do portal (☐ □ ▸) e rodapé (SAIR/FECHAR/INTRANET) ignorados; vários fornecedores numa linha só são separados por contato; data na linha de baixo é da peça de cima (07/10/2026, BXZ4J84 print); PDF lido pelo Google com a tabela inteira numa linha só (cabeçalho na frente) é quebrado em uma peça por linha depois de cada e-mail; o casamento usa a melhor nota entre todas as combinações (não a ordem do card) e prefere o fornecedor que o item já traz ("… - LUSON") (13/10/2026, UIC5G94) |
| Itens FO com **código grudado na descrição** ("5Q0919275CGRUSENSOR DE …") | qualquer documento de fornecimento | separa pelo código que o documento traz (maior começo da palavra que aparece no texto, com 4+ dígitos) antes de casar (13/10/2026, STG3I57). Na aba 🚚 Fornecimento, o item colado vem como **código novo** (código + descrição separados) e o Salvar fornecimento reescreve o nome. Orçamento lido/importado com esse código **reescreve o item** como `CÓDIGO DESCRIÇÃO` (não duplica; dois itens com o mesmo código ficam com a descrição mais parecida — `vdf_foColado_`, `cp_itemColado_`) |
| **Status do Pedido** (Cilia) | `STATUS DAS PEÇAS|PREVISÃO DE ENTREGA|STATUS DO PEDIDO` | por peça: código (`^[A-Z0-9]{6,20}$`, ≥4 dígitos), descrição, fornecedor (linha com " / " ou após "FORNECEDOR"; palavras de STATUS nunca viram fornecedor), previsão (só datas sem hora), entregue/data |
| **Pareceres** do Status do Pedido (Cilia) | cabeçalho `Fluxo: N \| Criado por: … \| Data de Criação: dd/mm/aaaa - hh:mm` | a tabela pode ficar parada enquanto a mediadora registra o prazo novo nos pareceres (ATX2884, 07/10/2026). Só frases conhecidas viram dado: "prazo … do(s) item(ns) A; B foi alterado para dd/mm/aaaa pelo motivo M", "Novo Prazo: dd/mm" + "Motivo do atraso: M", "alterado para sem previsão", "Registrado B.O para o(s) item(ns) … Laudo: L", "Os Itens A,B … previsão de entrega para o dia dd/mm/aaaa". Regra: vale o parecer **mais novo que a "Última Atualização" da tabela** (sem essa data: só parecer que adia); por peça (código ou descrição similar) → previsão = prazo do parecer, **motivo já preenchido** ("M (parecer Cilia de dd/MM)"); "sem previsão"/B.O. → situação **B.O.**; peça do card que sumiu da tabela e tem parecer de B.O. entra só com a situação. Peça já entregue não muda. Texto livre fora dessas frases é ignorado (não dispara regra) |
| O.S. Databox / CRLV | `MARCA: MODELO: ANO:` | placa, chassi, ano, modelo |
| NF/DANFE/XML | `<nNF>` ou OCR | número da NF para o nome do anexo |

Serviços e códigos internos (`^0{2,}\d+$`, `^SOMA\d+$`) ficam fora. Valor líquido unitário entra como `ORÇ R$`.
Orçamento importado na edição de um card que já tem peças **ou só itens de FORNECIMENTO/PAGAS** é tratado como complementar
(antes, card só com fornecimento caía na importação de pedido novo e o orçamento era lido como se fosse do zero — 13/10/2026, UIC5G94).
Item em branco na tela (o formulário abre um vazio) não conta como peça nem trava o envio; card que já tem fornecimento pode ser reenviado sem peça da oficina (13/10/2026, UIC5G94).
Reler um orçamento **já processado** do card não traz peça da oficina, mas traz peça **fornecida** pela seguradora que não está em nenhum checklist FORNECIMENTO (13/10/2026, UIC5G94 — VENTOINHA).
Reler pelo formulário um orçamento **antigo** do card (existe outro PDF de orçamento/laudo anexado depois dele — notas, fotos e documentos 🚚 não contam) não traz nada: ele foi substituído pelo mais novo (13/10/2026, UIC5G94: o Cilia de 11/09 tinha tudo pela oficina e o laudo HDI 2.1 passou tudo para fornecimento).
Orçamento complementar (ORÇ+): compara com as peças existentes → ➕ oficina nova, 📦 FO nova, 🔁 já pedida,
🔁 passou de FO para oficina (sai do checklist), 🔄 atualizada (código/descrição/valor). Peça da oficina marcada
🚫 **não comprar** (mesmo código ou mesma descrição) conta como já conhecida e **não volta** como complemento — o
consultor já decidiu por ela (09/10/2026, STG3I57: o robô repetiu dois alojamentos "não comprar"). Também conta como já
comprada a peça que está no checklist **COMPLEMENTO** do jeito antigo (peça do complementar comprada ANTES de a seguradora
autorizar, liberada pela diretoria/orçamentista) — antes só PAGAS e FORNECIMENTO contavam; e código que já está num checklist
de compra (PAGAS, PAGAS COMPLEMENTO, COMPLEMENTO) conta como comprado **antes** de casar pela descrição com outra peça do card
(16/10/2026, NPG5429 — Weslley: "o robô precisa entender isso e não duplicar peça já comprada": o reservatório comprado em
setembro voltou como peça nova e a grade ESQ comprada em setembro casou com a "GRADE DO PARACHOQUE DIANT"). O PDF de orçamento
que o **formulário** leu e importou (`orc`/`orc+`) é marcado como já visto (`CP_VISTOS`) em todo salvamento, não só no
complementar: antes, orçamento subido pelo formulário mais de 30 min depois do card criado era relido pelo robô como
complementar. Leitura que não serve não fica em silêncio (10/10/2026): PDF anexado em card em FALTA DADOS que não é
reconhecido como orçamento → "📄 Li o anexo «x» mas não reconheci um orçamento…"; orçamento de **outra placa** → "📄 O anexo
«x» é um orçamento da placa Y, não deste card" (uma vez por anexo).

**Peças pela API oficial do Cilia (15/10/2026, `CiliaApi.gs` — LIGADO no principal com o OK do Weslley; `CL_LIGADO=NAO` desliga; testado antes no TESTE)**: a rodada
diária da API (00h15, no PC do Weslley, `cilia/pc`) grava `CILIA-HOJE.json` e os PDFs oficiais na pasta `Rotina Unity/Orçamentos/Cilia` do Drive
dele (compartilhada com sistema@). Para cada versão autorizada/supervisão baixada, o robô acha o card aberto da placa (RETORNO, AVISO e
card fixo fora; vários cards → pelo nº do sinistro na descrição e, depois, pela seguradora no fim do título — só quando um
único card bate, a cor no meio do título não conta (16/10/2026, AYK0H85: "… PARTICULAR" e "… BRADESCO" abertos); sem como decidir →
não anexa, registra e tenta de novo a cada 15 min por até 3 dias, para a equipe arquivar o card que sobrou — versão antiga, de mais de
20 dias, desiste na hora; até 16/10 desistia sempre na hora e essas marcas antigas ganham mais uma chance na próxima leitura) e anexa
`Cilia - Orçamento <nº.versão> - <PLACA>.pdf`, sem repetir (nº da versão no nome de um anexo, ou orçamento anexado depois da autorização
dessa versão). As peças do anexo são as da API (só **troca**; serviço e código interno 000000x como no PDF; `fornece` SEGURADORA = FO;
valor unitário líquido) guardadas em `CL_PEC_<anexo>` e usadas por `vd_lerAnexoTrello_` — o OCR do PDF só completa chassi, cor e a
dica de tipo pelo código. Card com lista → complemento por `cp_doAnexo_` (mesmas regras: sinistro HDI e card de RETORNO não importam);
card sem lista → o ciclo importa ao ler o anexo; ESPERA/NÃO AUTORIZADO → anexa e comenta para quem criou o card verificar (não move);
card antigo → só anexa; card em ENTREGUES/ENCERRADO/PENDÊNCIA → anexa sem comentário; **sinistro HDI → não anexa** (vale o PDF do portal HDI). Todo arquivo novo lido gera a linha "li a base do Cilia" no registro (a rotina da madrugada usa para saber que o robô está ligado). Batizado do anexo guarda o nº da versão (`📄 ORÇ+ · PLACA · SEG · Cilia 1993730.2 · dd/MM`). Registro na aba
"CILIA API" da planilha do robô. Com as peças da API, item FO que o orçamento novo **ainda traz como FO** não entra na regra da "FO
revertida para a oficina" (BCB8218, 15/10/2026: "FAIXA SUP DA PORTA" casava pela descrição com "FAIXA DA COLUNA DA PORTA").

**Orçamentos HDI e SOMA na mesma etapa (15/10/2026 — Weslley: "a rotina de orçamentos também contempla orçamentos fora do Cilia, que
são HDI e SOMA, pra fazermos daí em uma etapa apenas os anexos e lançamentos")**: HDI e SOMA não têm API oficial; a rotina da madrugada
lê o orçamento no portal (HDI Prestador por fetch na aba logada; Websoma) e grava na pasta `Rotina Unity/Orçamentos` do Drive (a antiga
`Rotina Unity/Cilia` renomeada, já compartilhada com sistema@, com as subpastas `Cilia`, `HDI` e `SOMA` — Weslley 15/10: "colocar Cilia
dentro da mesma pasta, vamos organizar melhor nossas pastas"), **no mesmo
formato do `CILIA-HOJE.json`**: `HDI/HDI-HOJE.json` + `HDI/PDF/<casa>/<PLACA> - HDI - laudo <v>.pdf` (o tradutor `portais/pc/hdi-base.mjs`
transforma o HTML salvo do portal em dados — casa pelo CNPJ do login, versão do laudo, status, peças "Fornecidas pela HDI" = FO e
"pela Oficina", valor unitário líquido; laudo com as peças "em processo de cotação" na HDI não dispara) e
`SOMA/SOMA-HOJE.json` + `SOMA/PDF/<casa>/<PLACA> - <Marca> - SOMA <nº.versão>.pdf` (16/10/2026: o tradutor `portais/pc/soma-base.mjs`
lê o texto do "ORÇAMENTO DETALHADO" que a rotina guarda do iframe do Websoma — `Websoma_<PLACA>.txt`, um pedaço por linha — mais o
`relatorio<nº>.pdf` do "Imprimir": sinistro, placa, casa pelo CNPJ da oficina, nº do orçamento e versão (`versao_baixada` =
`<nº>.<versão>`, como no Cilia), status (`LIBERADO` dispara) com a data de "REPARO LIBERADO … Por: … - dd/mm/aaaa hh:mm", peças de
"PEÇAS - TROCA (COMPRA PELA OFICINA)" = OFICINA e "LISTA DAS PEÇAS FORNECIDAS PELA SEGURADORA" = FO, cada uma com o unitário líquido
(o 2º "Vlr" do relatório é o TOTAL líquido da linha: confere com unitário × qtd), código Ford compactado como o leitor do PDF faz
(`JB3Z/8311/D`); "STATUS DE ENTREGA", "RECUPERAR", "MONTAGEM", serviços e resumo não são peça; rodapé de página no meio da lista é
pulado; marca pelo texto — Azul e Itaú faturam pelo CNPJ da Porto (REY5B95: faturamento "PORTO SEGURO CIA…", "Fale com: ChatAzul",
card "… AZUL"), o nome do faturamento fica em `seguradora_faturamento`; sem nome, telefone, endereço, e-mail ou regulador na base.
Conferido com o relatório real de 16/10 — 3 peças da oficina e 7 FO, totais iguais aos do relatório). O `CiliaApi.gs` trata as três bases do mesmo jeito (`CL_BASES`: mesma fila, mesmas regras, mesmo registro na aba
"CILIA API", com a versão "HDI laudo 1.0"); cada base liga sozinha — `CL_LIGADO` (Cilia), `CLH_LIGADO` (HDI), `CLS_LIGADO` (SOMA) — **HDI
ligada no principal desde 15/10 17h57; SOMA desligada** até a base juntar alguns orçamentos reais e o OK do Weslley. Anexo `HDI - Orçamento laudo <v> - <PLACA>.pdf`, sem repetir (o "…_laudo1.0.pdf"
anexado pela rotina conta), peças com origem HDI (vale a regra do laudo HDI no complemento). Base que ainda não existe ou pasta não
compartilhada com sistema@: o robô procura de novo a cada 6 h, sem erro. Versão esperando o card nascer: nova tentativa a cada 15 min
(antes era a cada ciclo de 1 min). Teste no TESTE (`CL.TESTE_V = '3'` e `'4'`, só HDI): rodou em 15/10 às 15h29 e 16h28 — PDF
"HDI - Orçamento laudo <v> - <PLACA>.pdf" anexado em 10 cards do TESTE (cards antigos: só o anexo; card em ESPERA: comentário sem
notificar); o teste registra na aba quando espera a base e quando termina. **Ao ligar uma base de portal** (HDI, SOMA), a 1ª leitura
marca o início (`CLH_DESDE_`/`CLS_DESDE_` = agora): vale só o laudo que mudar daqui para frente — os que já estavam na base a rotina já
anexou (no Cilia continua valendo a rodada do dia). **HDI LIGADA no principal em 15/10/2026 às 17h57** (OK do Weslley: "1 liga";
`CLH_LIGADO=NAO` desliga): a 1ª leitura registra "li a base do HDI" e, a partir daí, a rotina da madrugada só alimenta a base e não
anexa mais o PDF da HDI (o robô anexa e lança).

Tipos de evento novos (10/10/2026): RETIRADA, COMPRA CANCELADA, DEVOLUÇÃO FO.

**Treino do leitor** (`Treino.gs`, 08/10/2026): o robô percorre os cards (quadro principal + sistema antigo + arquivados),
pega os PDFs de orçamento anexados (ignora NF, 📸, 🛒, 🚚 e nomes de nota/boleto/comprovante), faz OCR e guarda o texto em
lotes JSON na pasta `Treino do leitor de orçamento` do Drive do robô (compartilhada só com a diretoria — nunca no
repositório, que é público). Funções: `vdf_treinoLeitor` (coleta por rodadas de 4 min, retoma de onde parou),
`vdf_treinoResumo` (quantos por tipo e ano), `vdf_treinoAmostrar` (amostra estratificada por tipo × ano),
`vdf_treinoAvaliar` (roda o leitor atual sobre os textos e aponta os suspeitos: sem peça, sem código, valor zero,
descrição curta; filtros por classe e por ano — Weslley, 08/10/2026: **só os orçamentos de 2026 bastam** para o treino). Serve para testar o leitor em todos os layouts antes de publicar uma mudança.

---

## 7. Cadastro de fornecedores

Nome canônico + apelidos + código Databox + CNPJ + contagem de uso. Ao digitar, o sistema resolve pelo nome ou
apelido normalizado (sem acento, só A–Z0–9); nome novo é cadastrado com origem "formulário (usuário)".
Sufixos de fornecedor nos itens FO ("- MEDIADORA - PRISMATEC / MARAJO") são reconhecidos e encurtados.

---

## 8. Cálculos e indicadores

- **Dias úteis**: pula sáb/dom e feriados nacionais (01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 20/11,
  25/12), municipais (19/03 e 10/10 Campo Mourão; 25/07 e 31/10 M. C. Rondon; 14/11 Cascavel; 14/12 Toledo),
  móveis (Carnaval −48/−47, Sexta Santa −2, Corpus Christi +60 da Páscoa) e extras configuráveis.
- **Atraso de recebimento** = d.u. entre previsão e chegada (negativo = antes).
- **Economia sobre o orçamento** = (orç − cot)/orç: < 20 % ruim 🔴, 20–30 % médio 🟡, > 30 % bom 🟢.
- **Totais do card**: por peça, valor comprado (se comprada) senão autorizado; separados seguradora/particular. **Vezes a quantidade da
  peça** (15/10/2026, OK do Weslley às 17h57: o valor da cotação é da unidade — "digita o da unidade"): menor cotação, autorizado e
  comprado multiplicam pela QTD (`vd_totaisPorQtd_`; `VD_TOTAIS_QTD=NAO` desliga no principal); a tela clássica soma igual (`textoTotais`,
  `CARD.totaisQtd`) e o campo da cotação diz "Valor unitário (R$) · orç. unit." quando a peça tem mais de 1 unidade.
- **Painel** (30 dias): pedidos, cotados, autorizados, devoluções, peças e valor comprado, compras fora da
  autorização, % recebidas no prazo, travas desfeitas; por fornecedor: peças, valor, atraso médio, % no prazo;
  tempo mediano por etapa (pedido→cotação→autorização→compra→recebimento); últimas compras fora da autorização;
  movimentos desfeitos por usuário.

---

## 9. Comunicação

- **Comentários no card** (com o token de quem agiu, ou do robô): catálogo em 2.2/2.4/2.5. Menções: criador do
  card (faltas, peça nova), 1º comprador (cotação/autorização), diretoria (compra fora da autorização),
  `SLA_*`, quem fez a ação (travas).
- **E-mails**: card excluído e recriado; relatório diário de exceções (7h15); alertas de falha do robô (2ª falha
  seguida; conferência diária 7h50); cota do Google estourada.
- **Log de descrição** (quadro principal): "✏️ Autor alterou a descrição … ❌ Removido / ✅ Adicionado".

---

## 10. Configuração (parâmetros)

| Parâmetro | Padrão | Significado |
|---|---|---|
| `VD_BOARD` | `ZX4gRmnX` (teste) / `oH4TbTqb` (principal) | quadro em uso |
| `VD_MODO` / `VD_LIGADO` | ATIVO / SIM | OBSERVAR = só relata, não grava |
| `VD_URL_FORM` | GitHub Pages | URL do formulário |
| `VD_COMPRADORES`, `VD_AUTORIZADORES`, `FAT_USUARIOS`, `EXC_LIVRES` | ver seção 1 | papéis |
| `SLA_LIGADO`, `SLA_DIAS_COTAR` 2, `SLA_DIAS_AUTORIZAR` 2, `SLA_DIAS_FATURAR` 7, `SLA_DIAS_RECEBER` 1, `SLA_COTAR`, `SLA_AUTORIZAR`, `SLA_RECEBER` | | prazos e destinatários |
| `ST_TRAVA`, `CK_TRAVA`, `VD_TRAVA_DESC`, `EXC_PROTEGER`, `FAT_LIGADO`, `CP_LIGADO`, `CF_LIGADO`, `EV_LIGADO` | SIM | liga/desliga módulos |
| `VD_VITRINE`, `VD_DIAS_UTEIS`, `VD_ACOES_COMPARTILHADAS` | SIM | |
| `VD_FOTO_PECA` | NAO (no TESTE vale sempre) | código/foto na peça particular (22/10) |
| `VD_SO_MO` | SIM (ligado no principal em 23/10 10h40) | card da Rotina para orçamento só de mão de obra (23/10) |
| `EXC_EMAIL`, `REL_EMAILS` | weslley.santos@…; + christian.farias@… | destinos |
| `DU_EXTRAS`, `DU_REMOVER` | | feriados |

---

## 11. Proposta para o servidor próprio

### 11.1 Por que sair do Apps Script

Hoje o robô **consulta o Trello a cada minuto** (polling) e cada chamada do formulário passa por um "web app" do
Google que às vezes demora 1–2 min para acordar (medido: 10–17 % das chamadas em 29/09/2026). O formulário
compensa repetindo chamadas em paralelo, mas a experiência fica irregular e há cota diária de chamadas.

### 11.2 Arquitetura sugerida

```
Trello ──webhooks (eventos em tempo real)──▶  API própria (Node.js/TypeScript ou Python)  ◀── Formulário (mesmo HTML, só troca a URL)
                                                     │
                                       PostgreSQL (fonte de verdade) ── fila de tarefas (OCR, leitura de anexos)
                                                     │
                                       Trello continua como "tela" da equipe (cards, colunas, comentários)
```

- **Webhooks do Trello** no lugar do ciclo de 1 min: cada ação (mover card, editar descrição, checklist, anexo,
  comentário) chega em milissegundos. Mantém-se uma varredura de segurança a cada 30 min.
- **Banco próprio** como fonte de verdade (hoje é a planilha TRAVA + descrição). O Trello passa a ser visualização
  e caixa de comentários; a descrição vira só a vitrine (gerada pelo servidor).
- **Mesmo formulário**: o `powerup/formulario.html` fala JSON com `fn` + `args`; basta apontar para a nova URL e
  manter os mesmos nomes de função (`vdf_*`) e respostas. Isso permite migrar sem reensinar a equipe.
- **Autenticação**: continuar com o token do Trello do usuário (o servidor valida contra o quadro) ou login
  Google Workspace (unitycs.com.br) — mais simples para a equipe.
- **OCR**: `pdftotext` + Tesseract (ou Google Vision/Document AI por chamada) numa fila, com cache por hash do
  arquivo.
- **Hospedagem**: VPS pequena (2 vCPU/4 GB) ou Cloud Run; Postgres gerenciado; backup diário.
- **E-mail**: SMTP do Workspace.

### 11.3 Tabelas mínimas

`card` (id_trello, placa, carro, cor, seguradora, unidade, tipo, modelo, ano, motor, chassi, sinistro, n_ordem,
coluna, criador, obs, criado_em) · `peca` (card_id, ordem, pneu, codigo, descricao, tipos, medida, categoria,
marca, qtd, particular, part_por, complemento, comp_data, nao_comprar, nao_motivo, valor_orc, obs, assinatura,
trava) · `cotacao` (peca_id, fornecedor_id, tipo, marca, valor, dias_uteis, link, obs, usuario, data, removida_em)
· `sem_cotacao` (peca_id, motivo, usuario, data) · `nt` (card_id, fornecedor_id, data) · `autorizacao` (peca_id,
cotacao_id, usuario, data, anulada_em) · `devolucao` (card_id, usuario, data, motivo, obs por peça) ·
`compra` (peca_id, fornecedor_id, valor, previsao, fora_autorizacao, justificativa, usuario, data, recebida_em,
atraso_du, obs) · `fornecimento` (card_id, complemento, codigo, descricao, qtd, fornecedor, previsao, situacao,
entregue_em, historico de previsões com motivo) · `anexo` (card_id, id_trello, tipo, nome, hash, leitura JSON) ·
`fornecedor` (nome, apelidos, cod_databox, cnpj, usos) · `evento` (= aba EVENTOS) · `config` (parâmetros da
seção 10) · `usuario` (username trello, nome, papéis, unidade).

### 11.4 Ordem de migração sugerida

1. Servidor novo recebe os webhooks e **só observa** (grava banco, não move nada) — compara com o robô atual.
2. Formulário aponta para o servidor novo; o Apps Script continua só com as travas.
3. Servidor assume travas e movimentos; Apps Script desligado (`VD_LIGADO=NAO`).
4. Importação dos cards antigos: descrição completa (aba TRAVA) + checklists + eventos → tabelas.

---

## 12. Como manter este documento

- Toda mudança de **regra** (fluxo, permissão, formato de linha, cálculo, parâmetro) atualiza a seção
  correspondente **no mesmo commit** do código, com a data.
- O histórico de decisões fica no `git log` (mensagens em português descrevem o porquê); este arquivo descreve o
  estado atual, não a história.
- Uma cópia é mantida no Drive em `Claude/Sistema Trello Compra de Peça/` junto com o `ESTADO-SISTEMA-TRELLO.md`
  (estado operacional/pendências). Para entregar ao desenvolvedor: este arquivo + acesso ao repositório.

## 13. Mudanças de regra desde 16/10/2026 (resumo; o detalhe está nas seções e no `git log`)

- **17/10** — Versão 2.0 ligada no quadro principal; gravações do formulário pelo servidor; itens "SEM COBERTURA" do orçamento Cilia não entram para compra; card PARTICULAR continua exigindo ORDEM AUTORIZADA; dois pneus da mesma medida no card são a mesma peça; "ÓLEO ADITIVO…" é 🚫 não comprar padrão.
- **19/10** — Robô do principal roda no servidor (Google em reserva). Rotina abre cards só com peças de TROCA da base do Cilia/HDI. Lista de cotação para WhatsApp por tipo de fornecedor (CSS/concessionária, lataria, mecânica, pneu) e pedidos de compra por fornecedor. Print HDI: fornecedor só por palavras de empresa; linha de fornecedor e REFATURAMENTO não são peça.
- **20/10** — Marcas do complementar (`COMPL:`/`COMPLEMENTO dd/mm`) e a observação geral (`OBS:`) não contam como peça nova. Comentário repetido no mesmo card em < 3 min não é postado. Lembrete de faturamento no card só para cards entrados em ENTREGUES a partir de 20/10 15:30. Card arquivado por faturamento: só o Weslley desarquiva (o robô arquiva de novo e avisa). Retorno pode nascer de card **arquivado** da mesma placa e puxa a foto de capa. Comprador pode cotar **tipo diferente do pedido** (aviso "fora do pedido" para quem autoriza). Diretoria pode renomear itens de compra de card antigo para o padrão novo e encerrar card sem peça nenhuma (orçamento só de mão de obra). Leitor do **relatório de peças novo do Cilia** (fornecedor = bloco FORNECIMENTO + "nome - CNPJ"; previsão e entrega pelos pareceres). Na aba Cotação, peça já comprada (item no PAGAS) aparece fechada "✔ Já comprada".
- **21/10** — Leitor reconhece o cabeçalho do orçamento particular do Cilia ("MODELO (2020 A 2025) versão ANO"). Robô não grava descrição montada a partir de leitura velha: se alguém salvou pelo formulário enquanto ele lia os anexos, deixa o card para o próximo ciclo (SES8I10: a gravação do consultor era apagada e o card voltava a FALTA DADOS). Em pedido PARTICULAR não sai o comentário "QUEM PAGA MUDOU" (toda peça é do cliente). "Salvar parcial" da cotação **não comenta** no card (17h22: "tá tumultuando"); o aviso sai só no "Enviar cotação". **Autorização reenviada** em card já autorizado (marca `VDF_AUT_ENV_` ou card em AUTORIZADO COMPRA): compara escolha por escolha — só o que mudou entra na descrição e sai em "✏️ AUTORIZAÇÃO ALTERADA" (🔁 trocou fornecedor/valor, ➕ autorizou agora, obs, marcas) com o total do card; reenvio idêntico = "🔁 Autorização reenviada sem alteração", sem menção. Devolver para cotação apaga a marca. Edição do pedido gera "✏️ PEDIDO EDITADO — Nome (usuário)" com o que mudou: ➕ incluiu (peça · tipo), 🏷️ tipo definido/trocado, ➖ tirou do pedido, 🚫 não comprar (motivo) — só o que mudou nesta gravação; pedido novo com 🚫 gera "🚫 NÃO COMPRAR — Nome marcou…". Painel lateral 2.0 mostra **Unidade** e **Pedido por** (quem criou o card). **19h03 (revisão dos comentários, `docs/COMENTARIOS-ROBO.md`)**: "✅ DADOS COMPLETOS" não sai mais (só importação do orçamento / ℹ️ divergência); autorização reenviada igual, AUTORIZAÇÃO PARCIAL, COMPRA PARCIAL e "negociação anexada" não comentam; rotina antiga de card PARADO só põe a etiqueta; os três ⏰ de item atrasado viram um por card por dia; prazos novos no SLA: FALTA DADOS 1 d.u. (@criador) e AUTORIZADO COMPRA sem compra 2 d.u. (@compras). **Comentários de fluxo do formulário não mencionam ninguém** (COTAÇÃO, AUTORIZADO/ALTERADA, DEVOLVIDA, INDISPONÍVEL, QUEM PAGA MUDOU, NÃO COMPRAR): quem tem de agir é avisado só pelo lembrete de prazo do robô (⏰ SLA: cotar 2 d.u., autorizar 2 d.u., faturar 7 d.u., previsão de item). Voltar: `MENCAO_FLUXO = SIM`. Continuam mencionando: FALTA DADOS / PEÇA NOVA (robô → consultor), travas, faturamento, ORDEM AUTORIZADA PENDENTE e compra fora da autorização.
- **23/10** — Orçamento autorizado **só de mão de obra** ganha card: a Rotina abre com `soMaoDeObra:true` direto em ENCERRADO (vitrine "🔧 SÓ MÃO DE OBRA"); recusa se a base da placa tem peça de troca/FO. TESTE sempre; principal ligado em 23/10 10h40 (desligar: `VD_SO_MO=NAO`).
- **23/10 (10h44)** — Aba Cotação aceita **arquivos da cotação** (print, foto, PDF) com botão 📎 **por peça**, **por cotação** (salva ou em edição) e geral no fim da aba: sobem na hora e vão com o Salvar parcial ou o Enviar cotação (`vdf_salvarCotacao`, `p.anexos` com chave da peça e fornecedor) para o card como `💬 COTAÇÃO · PLACA · FORN · PEÇA · dd/MM` (repetido não sobe; salvar só com arquivo não mexe na coluna). O que já está no card aparece como link **📎 ver** na peça / na cotação (casado pelo nome). O comentário COTAÇÃO lista os anexos (📎 Cotação: …).
- **23/10 (15h56)** — Leitor Cilia: a marca-d'água "NÃO AUTORIZADO" sai do PDF com letras soltas logo depois do ano ("2025 N AO AU TO R IZ Placa…") e modelo/ano não eram lidos (TBP3J46, Allianz); regra aceita pedaços de 1–3 letras depois do ano. `VD_LEITOR_V = 4` (orçamentos Cilia são relidos quando o card abre).
- **23/10 (15h57)** — **Salvar parcial do pedido não exige mais nada** (Weslley: "é só pra salvar e depois terminar"): só a placa num card novo (título); sem carro o título nasce `PLACA COR SEGURADORA`; sem peça o card fica em FALTA DADOS com o robô pedindo a lista. Antes exigia placa, unidade, carro e uma peça.
- **23/10 (16h06)** — **Card novo de placa que já tem card aberto**: o formulário já avisa ao digitar a placa e ao enviar ("Já existe card…"); agora o robô também avisa, uma vez, no card criado **fora do formulário** (à mão no Trello) com placa de outro card aberto: "@criador ⚠️ PLACA JÁ TEM CARD ABERTO — PLACA: [card](link) (coluna) …". Só cards criados nos últimos 2 dias; cards abertos pelo formulário/Rotina são marcados como já conferidos (`VD_DUP_<id>`).
- **23/10 (17h53, MVU1552)** — **Cotação nova em peça já autorizada**: no Enviar cotação a tela pergunta, por peça, se é **só registro** (como antes: autorização e coluna não mudam) ou se **precisa de nova autorização**; neste caso (`p.reautorizar`) a cotação autorizada vira linha `INDISPONÍVEL: FORN - PEÇA - valor - nova cotação pelo comprador…` num bloco RECOTAÇÃO (mesmo mecanismo da "cotação indisponível"), o card volta para PENDENTE AUTORIZAR / COTAÇÃO FINALIZADA e o comentário COTAÇÃO traz "🔁 Nova autorização necessária". Peça já comprada não entra (cancelar a compra antes). Caso típico: compra cancelada → comprador recota.
- **26/10 (11h)** — Aba Cotação (2.0, chave `COT_CODIGO_OBS`, ligada no principal às 11h09 com OK do Weslley): o comprador **corrige o código da peça** (botão ✏️ Código → balão; vai com o Salvar parcial / Enviar cotação; peça comprada não troca) e põe **obs. em cada cotação** (`- 📝 texto` na linha da cotação). Ver §4.3. **MVU1552**: a pergunta "só registro × nova autorização" (cotação nova em peça já autorizada) vale também no **Salvar parcial** (antes o parcial virava registro sem perguntar) e, em peça com compra cancelada/devolvida, já vem marcada **nova autorização**; escolhida no parcial, a cotação é enviada.
- **26/10 (11h40)** — **Quem paga trocado com o card esperando autorização** (AYT6699): COTAÇÃO FINALIZADA ↔ PENDENTE AUTORIZAR seguem a regra do Enviar cotação (só peça particular → COTAÇÃO FINALIZADA; tem peça da seguradora → PENDENTE AUTORIZAR) quando ninguém autorizou ainda e toda peça está cotada; vale no salvar do pedido (`rc_reavaliarColuna_`) e na conferência do robô (`vd_conferirPosCotacao_`), com comentário de registro. **Converter card de seguradora em particular** (PYU9B65): card de seguradora sem peça da seguradora + diretoria — marcar Particular converte o card inteiro (cabeçalho aparece, seguradora/sinistro saem, título … PARTICULAR); a marca `| PARTICULAR @quem` sair da linha não é peça nova. Com peça da seguradora continua o pedido particular separado.
- **26/10 (15h20)** — Comentários do formulário assinados com `@usuario <o que fez>` (ex.: "@comprasunity registrou compra", "@fulano alterou o prazo de X de 22/10 para 03/11 pelo motivo: …"); EVENTOS ganha a coluna 17 **Registro** com a frase. Ver `docs/COMENTARIOS-ROBO.md`.
