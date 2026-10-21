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
- ERP unityOS: só leitura.

## Como trabalhar
1. Mudou `apps-script/Formulario.html` → `python3 tools/gerar_formulario_estatico.py` (e `--conferir`).
2. Mudou `apps-script/*.gs` ou o formulário → `npm --prefix servidor run extrair-formulario` e `extrair-leitores`.
3. `cd servidor && npx tsc -p . && npm test` (tem de passar).
4. Commit em português dizendo o porquê (data e card de exemplo), push na `main` publica (Cloud Run + Apps Script + Pages); esperar `GET /saude` mostrar o SHA. Push fora da `main` não publica.
5. Toda mudança de regra atualiza `docs/ESPECIFICACAO-SISTEMA.md`, `docs/HANDOFF-UNITYOS.md` (se afetar §4/§5/§7) e uma linha em `docs/SESSOES.md`, no mesmo commit.
6. Depois de publicar, conferir no quadro (TESTE primeiro) sem gravar nada que não seja de teste.
