# Compra de Peça — orientações para quem trabalha neste repositório (pessoas e agentes)

Idioma: **português do Brasil** em tudo (código comentado, commits, docs, respostas). Nunca trocar de idioma.

## O que é
Sistema de compra de peças do Grupo Unity (oficinas): hoje Trello + formulário web + robô (Apps Script, rodando no servidor
próprio em Cloud Run). Mapa e decisões: `docs/HANDOFF-UNITYOS.md` (comece por ele), regras: `docs/ESPECIFICACAO-SISTEMA.md`,
diário: `docs/SESSOES.md`.

## Regras fixas do Weslley (não negociáveis)
- **Quadro principal `oH4TbTqb` é produção**: nenhuma mudança de comportamento lá sem o OK dele; `ZX4gRmnX` (TESTE) é o laboratório — tudo entra primeiro lá, atrás de uma chave em `powerup/config.js` (`'teste'` → `'todos'` só com OK). Falha de leitura do robô pode ser corrigida direto no principal.
- Cards de teste no TESTE: título com "🧪 TESTE — pode excluir"; menções em teste não podem notificar ninguém.
- Nunca mover card do principal à mão (as travas desfazem): usar o caminho oficial (`vdf_*` com licença, `vdf_moverPara_`).
- Comentários no Trello: nunca "seguir com compra/fornecimento" nem "cotar/comprar"; peça de oficina = "verificar compra do item X"; FO = "verificar prazo do item X"; nunca escrever "faturado"; dúvida sempre com PLACA + nº da O.S.; evitar @menções.
- **Repositório público**: nunca gravar texto de orçamento, dado de cliente, token, chave ou URL de anexo. Dados exportados vão para o Drive do Weslley, não para cá.
- Nunca digitar senhas/tokens/chaves; não excluir dados permanentemente sem autorização (arquivar); não fazer OAuth/consentimento sem permissão; não sondar rotas não documentadas do Cilia.
- Não mexer no CSS/JS clássico de `Formulario.html` — mudanças de tela vão na **camada 2.0** (blocos no fim do arquivo).
- **Toda mudança de tela tem de bater com as diretrizes de design do projeto** (Weslley, 21/10/2026) — ver a seção abaixo e conferir antes de publicar.
- Comentários no card (robô e formulário): registro, não notificação — regras e inventário em `docs/COMENTARIOS-ROBO.md`.
- ERP unityOS: só leitura.

## Diretrizes de design (camada 2.0 — aprovadas em 08–15/10/2026; detalhes em `docs/VERSAO-2.0.md` e nos cabeçalhos dos blocos 2.0 de `Formulario.html`)
- **Público**: equipe de oficina, baixa escolaridade, acostumada a app de celular; visual familiar ao Trello (azul `#0c66e4`, texto `#172b4d`, cinzas `#44546f`/`#c1c7d0`, raio `var(--r-sm)`). Avisos curtos e diretos, em português simples, sempre dizendo **o que fazer**.
- **Duas interfaces, escolhidas pelo aparelho** (não pela largura): celular/tablet = `v2toque` (alvos de toque ≥ 44 px, painéis que sobem de baixo, faixa "Salvo ✓"); computador = `v2pc` (layout compacto, pouco espaçamento, funciona até 320 px / zoom 400 %). `&aparelho=celular|pc` força para conferir.
- **Estrutura de toda tela**: barra única no topo (placa, etapa com "?", situação do card) → abas segmentadas logo abaixo → conteúdo à esquerda + **coluna lateral** fixa com: resumo do card (quem paga, nº da ordem, unidade, pedido por, totais), "o que falta" clicável (leva ao campo), **botão principal que diz o que falta** e o "Salvar parcial". Peças em cartões com faixa de situação; cotações em tabela (menor preço / menor prazo sinalizados; cor vs orçamento 🟢🟡🔴).
- **Confirmações e perguntas em balão** (`balaoComp`/`abrirBalao`): `role=alertdialog`, foco no botão seguro, Esc e clique fora fecham e devolvem o foco, Tab preso dentro, botões só valem 400 ms depois de abrir; campo obrigatório dentro do balão fica vermelho e segura o envio. **Nunca `alert`/`confirm`/`prompt` do navegador.**
- **Resultado de envio em cartão** (TELAS_FINAIS): título, card, coluna atual, próximo passo, avisos, botões — nunca texto solto.
- **Só aparência na camada 2.0**: os envios são os mesmos da tela clássica (`?v2=0` serve para comparar); nada de duplicar regra de negócio no JS da tela.
- **Antes de publicar**: conferir no TESTE nos dois aparelhos (print), e em mudança grande rodar as avaliações independentes (design, acessibilidade, QA) como em 14–15/10.

## Como trabalhar
1. Mudou `apps-script/Formulario.html` → `python3 tools/gerar_formulario_estatico.py` (e `--conferir`).
2. Mudou `apps-script/*.gs` ou o formulário → `npm --prefix servidor run extrair-formulario` e `extrair-leitores`.
3. `cd servidor && npx tsc -p . && npm test` (tem de passar).
4. Commit em português dizendo o porquê (data e card de exemplo), push na `main` publica (Cloud Run + Apps Script + Pages); esperar `GET /saude` mostrar o SHA. Push fora da `main` não publica.
5. Toda mudança de regra atualiza `docs/ESPECIFICACAO-SISTEMA.md`, `docs/HANDOFF-UNITYOS.md` (se afetar §4/§5/§7) e uma linha em `docs/SESSOES.md`, no mesmo commit.
6. Depois de publicar, conferir no quadro (TESTE primeiro) sem gravar nada que não seja de teste.
