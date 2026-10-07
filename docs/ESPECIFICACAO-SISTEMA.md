# Compra de Peça — Especificação do sistema (para reimplementação em servidor próprio)

**Grupo Unity · versão deste documento: 07/10/2026**

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

E duas origens de pedido: **SEGURADORA** (precisa do orçamento aprovado em anexo) e **PARTICULAR** (cliente paga;
pode ter peça particular dentro de um pedido de seguradora = pedido **MISTO**).

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
**Cards ignorados**: título contém "NOVO PEDIDO DE PEÇA" ou começa com "AVISO"; cards legados (anteriores à virada,
sem descrição completa).

### 2.2 Transições

| De → Para | Disparo | Condição | Efeito |
|---|---|---|---|
| (novo) → EM COTAÇÃO | formulário `vdf_salvar` | card novo normal | card criado no nome do consultor; links ✏️/💰 anexados; validação imediata |
| (novo) → FALTA DADOS | formulário, modo "rotina" (só diretoria) | tem peça da oficina sem dados | comentário "🤖 Card aberto pela Rotina Unity" |
| EM COTAÇÃO → FALTA DADOS | robô (`vd_conferirCard_`) | alguma **falta** (2.3) | "@criador ⚠️ **FALTA DADOS** — corrigir para seguir: …" (só quando o conjunto de faltas muda) |
| FALTA DADOS → EM COTAÇÃO | robô | tudo completo | "✅ **DADOS COMPLETOS** → **EM COTAÇÃO**" + o que leu dos anexos |
| EM COTAÇÃO → EM COTAÇÃO (fica) | comprador `vdf_salvarCotacao` com `parcial=true` (botão **💾 Salvar parcial**, 07/10/2026) | grava o que já tem, sem exigir cobertura | etiqueta laranja `COTAÇÃO PARCIAL`; comentário "💾 COTAÇÃO PARCIAL salva" sem menções; o card não anda |
| EM COTAÇÃO → COTAÇÃO FINALIZADA | comprador `vdf_salvarCotacao` | todas as peças são particulares | comentário "💰 **COTAÇÃO**" |
| EM COTAÇÃO → PENDENTE AUTORIZAR | comprador `vdf_salvarCotacao` (botão **✅ Enviar cotação**) | toda peça com cotação ou "SEM COTAÇÃO: motivo" (somando o que foi salvo parcialmente; enviar sem novidade vale) — se faltar, recusa e sugere Salvar parcial | idem; menciona o comprador/consultor |
| PENDENTE/FINALIZADA → AUTORIZADO COMPRA | autorizador `vdf_autorizar` | pedido misto só move quando seguradora **e** particular têm ≥ 1 autorização | linhas `AUTORIZADO:` na descrição; "✅ **AUTORIZADO**" mencionando o comprador |
| qualquer → EM COTAÇÃO | `vdf_devolverCotacao` | motivo obrigatório; bloqueado se já há compra (PAGAS) | bloco `DEVOLVIDA PARA COTAÇÃO` anula autorizações; "↩️ **COTAÇÃO DEVOLVIDA**" |
| AUTORIZADO → EM COTAÇÃO / PENDENTE / FINALIZADA | comprador `vdf_cotacaoIndisponivel` | sem cotação nova → EM COTAÇÃO; com nova → PENDENTE (ou FINALIZADA se só particular) | linha `INDISPONÍVEL:`; "⚠️ **COTAÇÃO INDISPONÍVEL**" |
| AUTORIZADO → FALTA CHEGAR | comprador `vdf_salvarCompra` | exige etiqueta `ORDEM AUTORIZADA`; toda peça autorizada já em PAGAS | itens no checklist PAGAS*; "🛒 **COMPRA**"; compra fora da autorização exige justificativa e menciona a diretoria |
| FALTA CHEGAR → ENCERRADO | `vdf_salvarRecebimento` → `rc_reavaliarColuna_` | todos os itens PAGAS* e FORNECIMENTO* com ✔ | "📦 **RECEBIMENTO**" com atraso por peça |
| 2–6 → FALTA CHEGAR ou ENCERRADO | `rc_reavaliarColuna_` | card **sem peça da oficina** (só FO ou tudo 🚫 não comprar) | FALTA CHEGAR se há FO pendente, senão ENCERRADO; "↪️ Card → X" |
| ENCERRADO/ENTREGUES → FALTA CHEGAR | `rc_reavaliarColuna_` (complemento, fornecimento, edição) | apareceu item a receber | "↪️" |
| pós-cotação → FALTA DADOS / EM COTAÇÃO | robô `vd_conferirPosCotacao_` | **peça nova** na descrição (incompleta → FALTA DADOS; completa → EM COTAÇÃO) | "🆕 **PEÇA NOVA** (estava em X) → …" |
| pós-cotação → EM COTAÇÃO | robô | card já tinha cotação/compra e tem peça da oficina sem cotação/autorização/compra | "🆕 **PEÇA SEM COTAÇÃO** (estava em X) → **EM COTAÇÃO**" |
| ENCERRADO → ENTREGUES | rotina diária 7 h | > 15 dias em ENCERRADO, checklists completos | sem comentário |
| ENCERRADO → FALTA CHEGAR | rotina diária | > 15 dias e item pendente | "Movido automaticamente…" |
| ENCERRADO/ENTREGUES → **arquivado** | robô `fat_executar_` | comentário afirmativo com "faturado" (sem "?", sem NÃO/FALTA/PENDENTE) por usuário de `FAT_USUARIOS`, checklists completos | evento FATURADO; se falha a condição responde "🧾 …" |
| card excluído → recriado | robô `exc_executar_` | quem excluiu não é admin do quadro nem está em `EXC_LIVRES` | recria na mesma coluna com título + descrição completa; "♻️ Card recuperado"; e-mail |

### 2.3 Validação do pedido ("faltas")

Verificadas pelo robô a cada ciclo nos cards com atividade (varredura completa a cada 30 min):
placa válida; modelo, ano e chassi (17 caracteres válidos) — dispensados quando o orçamento foi importado;
lista de peças no padrão; tipo da peça (GENUÍNO/ORIGINAL/PARALELO/USADO, máx. 2); código da peça (exceto
particular e "não comprar"); orçamento da seguradora anexado (exceto PARTICULAR); carro no título; chassi do anexo
igual ao da descrição. O robô também **lê os anexos por OCR** e completa placa/chassi/ano/modelo/cor/seguradora/
sinistro e importa as peças do orçamento (seção 6).

### 2.4 Travas (integridade)

- **Colunas** (`st_executar_`): movimento manual para coluna travada, ou de travada para EM COTAÇÃO/FALTA DADOS,
  é desfeito (card volta ao topo da origem) com "@quem 🔒 … O card voltou para X". Exceções aceitas: licença dada
  pelo formulário/robô (240 s, consumida no 1º uso); ida para ESPERA e volta para a mesma coluna; FALTA CHEGAR →
  ENCERRADO à mão quando tudo tem ✔; volta à mão para EM COTAÇÃO/FALTA DADOS quando há peça sem cotação
  (robô confirma com "✔ Card em X (movido por @u) — peça(s) aguardando cotação").
- **Descrição** (`tr_executar_`): edição manual é restaurada da cópia oficial; aviso no máximo 1×/h por card.
- **Checklist** (`ck_executar_`): ✔, nome, data, item ou checklist alterado à mão é desfeito. O ✔ de chegada só
  pela aba Recebimento.
- **Exclusão**: ver 2.2. Para tirar um card do quadro, **arquivar**.

### 2.5 Prazos, etiquetas e avisos automáticos

| O quê | Regra |
|---|---|
| `due` do card | maior previsão entre os itens de checklist pendentes (`pz_executar_` a cada 5 min; `pv_dueCard_` após mudanças) |
| Etiqueta `ATRASADO` (laranja) | item FORNECIMENTO com previsão vencida sem ✔; comentário "⏰ Fornecimento atrasado — verificar prazo do item X (previsão dd/MM)"; sai sozinha |
| Etiqueta `COTAÇÃO PARCIAL` (laranja) | há peça sem cotação nem justificativa |
| Etiqueta `ORDEM AUTORIZADA` | marcada pelo comprador (`vdf_marcarOrdemAutorizada`); obrigatória para registrar compra; remove `ORDEM NAO AUTORIZADA` |
| Etiqueta `PARADO` (vermelha) | card nas colunas de PENDÊNCIA há > 7 dias sem atividade (rotina 7 h) |
| Etiqueta `CONFERIR FATURAMENTO` (amarela) | ENTREGUES há > 5 dias |
| **SLA** (de hora em hora, dia útil 8–18 h, repete a cada 2 d.u.) | EM COTAÇÃO > 2 d.u. → avisa `SLA_COTAR`; PENDENTE/FINALIZADA > 2 d.u. → `SLA_AUTORIZAR` (ou o consultor, se particular); ENTREGUES > 7 d.u. → `FAT_USUARIOS`; item PAGAS/FO sem ✔ 1 d.u. após a previsão → `SLA_RECEBER` ("verificar compra do item X" / "verificar prazo do item X") |
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

- Título: `PLACA CARRO COR SEGURADORA` (ex.: `RHV1E04 CRUZE PRATA SURA`); pedido particular → `… PARTICULAR`.
  Carro = nome curto digitado. Placa: `^[A-Z]{3}\d[A-Z0-9]\d{2}$` (antiga e Mercosul equivalentes).
- Seguradoras conhecidas: HDI, PORTO, AZUL, ITAU, YELUM, SANCOR, BRADESCO, ALLIANZ, TOKIO, MAPFRE, SURA, ZURICH,
  SUHAI, MITSUI, EZZE, DARWIN, AMERICAS, SOMPO, GENERALI, ALFA, JUSTOS.
- Unidade: campo personalizado `Unidade` (TOLEDO, RONDON, CASCAVEL, MOURÃO); cards antigos, por etiqueta.

### 4.2 Descrição (formato "completa")

Separador: linha `=== COTAÇÃO (compras) ===`. Acima, o **bloco do consultor**; abaixo, o **log de cotação/
autorização** (só cresce).

```
**MODELO:** …            **ANO:** …          **MOTOR/VERSÃO:** …
**CHASSI:** …            **PLACA:** …        **TIPO:** PARTICULAR   (só se particular)
**COR:** …               **SEGURADORA:** …   **SINISTRO:** …

**PEÇAS:**
1. CÓDIGO | DESCRIÇÃO | TIPO[/TIPO2][ | QTD n][ | COMPLEMENTO dd/mm][ | PARTICULAR @user][ | NÃO COMPRAR: motivo][ | ORÇ R$ 1.234,56][ | OBS: texto]
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
conta como peça nova. Assinatura de trava (peça autorizada/comprada não pode mudar): `P|CÓD|DESC|TIPOS|QTD`.

**Chave da peça**: código sem espaços; sem código → descrição sem acento; pneu → `PNEU <medida>`. Item de
checklist casa pelo prefixo `chave + ' '` (código/pneu) ou `chave + ' - '` (descrição).

### 4.3 Cotação / autorização / compra

- Cotação: fornecedor (normalizado pelo cadastro), tipo+marca, valor, **prazo em dias úteis**, link opcional,
  OBS por peça, `SEM COTAÇÃO <peça>: motivo`, `NT` por fornecedor, `REMOVIDA:` tira a cotação igual mais recente.
  Toda peça precisa de cotação **ou** justificativa para o card seguir.
- Autorização: vale a mais recente por peça; `DEVOLVIDA PARA COTAÇÃO` anula todas; `INDISPONÍVEL` do mesmo
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
| `FORNECIMENTO` / `FORNECIMENTO COMPLEMENTO` | peças FO | `CÓDIGO DESCRIÇÃO[ (xN)][ - FORNECEDOR][ - EM COTAÇÃO, AINDA SEM PRAZO | — B.O. NO PORTAL (dd/MM)]`, due = previsão, ✔ = entregue |

Regra do fornecimento (06/10/2026): item já recebido com data **não muda a previsão** (fornecedor/código/descrição
ainda atualizam; avisa); sem data anterior → grava sem motivo; **motivo obrigatório só quando a nova previsão
é posterior** à antiga. Rotina (diretoria) usa motivo automático "portal da seguradora".

### 4.5 Anexos

Nomes padronizados: `📄 ORÇ · PLACA · SEGURADORA · Sistema · dd/MM`, `📄 ORÇ+` (complementar),
`🚚 FO · PLACA · Status do Pedido Cilia · dd/MM`, `📦 NF nº · PLACA · FORN · dd/MM`, `📸 PLACA · capa|recebimento · dd/MM`;
repetição do tipo ganha ` v1`, ` v2`…; cópia idêntica (MD5) é apagada; máx. 6 anexos legíveis por card, 15 MB.
Links anexados ao card: `✏️ EDITAR/INCLUIR PEÇA` (`?card=<shortLink>`) e `💰 COTAÇÃO/COMPRA/RECEBIMENTO`
(`&modo=compras`).

### 4.6 Campos personalizados

`Unidade` (lista), `Seguradora` (lista, aprende), `Tipo` (SEGURADORA/PARTICULAR/MISTO), `Placa`, `Consultor`
(@criador), `Total seguradora`, `Total particular`, `Total seg+part` (por peça: valor comprado, senão autorizado),
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

---

## 5. Formulário (telas e ações)

Uma página, aberta com `?card=<shortLink>` (modo consultor) ou `&modo=compras` (modo compras). Login = token do
Trello do usuário (guardado no navegador).

| Tela / aba | Ação no servidor | Conteúdo |
|---|---|---|
| Pedido novo / ✏️ Editar | `vdf_salvar` | tipo (seguradora/particular), unidade, carro, placa, modelo, ano, motor, chassi, cor, seguradora, sinistro, nº ordem; anexos (orçamento → importa peças e FO por OCR; foto de capa); peças (código, qtd, valor no orçamento, descrição, tipo 1–2, ➕ complemento, 🚫 não comprar + motivo, **observação da peça**); pneus; obs geral. Duplicidade de placa aberta pede confirmação |
| 💰 Cotação | `vdf_salvarCotacao` (`parcial` true/false) | por peça: fornecedor (autocompleta do cadastro), tipo/marca, valor, prazo d.u., link, obs, "sem cotação: motivo"; NT por fornecedor; remover cotação. Dois botões: **Salvar parcial** (guarda aos poucos, card fica em EM COTAÇÃO) e **Enviar cotação** (exige cobertura total; card anda) |
| ✅ Autorizar | `vdf_autorizar`, `vdf_devolverCotacao` | por peça: escolher cotação (menor preço pré-marcada; selos 💲 menor preço / ⏱ menor prazo; valor do orçamento e economia), não autorizar, obs; obs geral; devolver com motivo |
| 🛒 Compra | `vdf_salvarCompra`, `vdf_cotacaoIndisponivel`, `vdf_marcarOrdemAutorizada`, `vdf_avisarSolicitante`, `vdf_alterarPrevisao` | marcar peças compradas (previsão por data ou d.u.), justificar fora da autorização, cotação indisponível + nova cotação, ordem autorizada, aviso ao solicitante (Databox), alterar prazo autorizado com motivo |
| 📦 Recebimento | `vdf_salvarRecebimento` | ✔ por item com data, obs, foto/NF da peça; obs geral |
| 🚚 Fornecimento | `vdf_atualizarFornecimento`, `vdf_lerFornecimento`, `vdf_lerFornecimentoAnexo` | por item FO: fornecedor, previsão, situação (em cotação / B.O.), motivo (só se adiar); leitura de "Status do Pedido" (Cilia/HDI/Soma) por upload ou de anexo já no card; peças FO novas do documento |
| Todas as abas | — | links 📎 dos anexos originais; atalho de upload do fornecimento |

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
| Orçamento **Cilia** | `FORNECIMENTO` + coluna T; `CASCO - MARCA - MODELO (..) ANO` | idem; `OFICINA`/`SEGURADORA` separa oficina/FO; siglas de tipo (GENUINA, ORIGINAL, PRO, PPO, PPG, PPC, PAR…) |
| **Status do Pedido** (Cilia) | `STATUS DAS PEÇAS|PREVISÃO DE ENTREGA|STATUS DO PEDIDO` | por peça: código (`^[A-Z0-9]{6,20}$`, ≥4 dígitos), descrição, fornecedor (linha com " / " ou após "FORNECEDOR"; palavras de STATUS nunca viram fornecedor), previsão (só datas sem hora), entregue/data |
| O.S. Databox / CRLV | `MARCA: MODELO: ANO:` | placa, chassi, ano, modelo |
| NF/DANFE/XML | `<nNF>` ou OCR | número da NF para o nome do anexo |

Serviços e códigos internos (`^0{2,}\d+$`, `^SOMA\d+$`) ficam fora. Valor líquido unitário entra como `ORÇ R$`.
Orçamento complementar (ORÇ+): compara com as peças existentes → ➕ oficina nova, 📦 FO nova, 🔁 já pedida,
🔁 passou de FO para oficina (sai do checklist), 🔄 atualizada (código/descrição/valor).

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
- **Totais do card**: por peça, valor comprado (se comprada) senão autorizado; separados seguradora/particular.
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
