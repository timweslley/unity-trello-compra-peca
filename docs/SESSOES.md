# Quem está mexendo em quê (sessões do Claude)

Duas sessões trabalham neste repositório. **Ler no começo e atualizar no fim de cada sessão.** Antes de mexer em área
da outra, deixar um recado aqui e no commit.

| Área | Dona | Arquivos | Observação |
|---|---|---|---|
| Sistema atual (quadro principal, robô Apps Script, formulário do principal) | sessão "principal" (`session_01Ai6vA1XhngqNJoRAtdQEHG`) | `apps-script/**`, `powerup/config.js`, `tools/**` | publicar no principal só com testes passando e confirmação do Weslley |
| Versão 2.0 (servidor, banco, quadro TESTE, visual do celular `srv=1`) | sessão "servidor" (`session_01Y4tyLcET1od5jWa86cF21v`) | `servidor/**`, `.github/workflows/servidor.yml`, `docs/PROJETO-SERVIDOR.md`, `docs/VERSAO-2.0.md`, bloco "VERSÃO 2.0 — CELULAR" no fim de `apps-script/Formulario.html` | o servidor recopia `apps-script/` sozinho a cada publicação |
| Leitura do principal pelo servidor | combinada | `tools/estatico_chamar.js` (cliente) × `servidor/src/index.ts` `/api?quadro=principal` | ver `docs/LEITURA-PELO-SERVIDOR.md` |

## Em andamento
- 08/10 23:20 — servidor (a pedido do Weslley): `powerup/config.js` LEITURA_SERVIDOR = 'todos' (leitura do principal pelo servidor para a equipe toda; interface sem mudança). Acompanhar 09/10 no /painel.
- 08/10 — servidor: versão 2.0 passo 1 (retrato dos pedidos do TESTE no banco), painel `/painel`, mapa `docs/README.md`.
