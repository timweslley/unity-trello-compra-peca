#!/usr/bin/env python3
"""Gera powerup/formulario.html (GitHub Pages) a partir de apps-script/Formulario.html.

O formulário é um só: toda mudança vai em apps-script/Formulario.html e este script produz a
versão estática, trocando só o que é diferente fora do Apps Script:
  - viewport/título, config.js e CFG fixo (sem o template <?!= ?>);
  - chamar() por fetch ao doPost (com paralelo/rid) + lerLocal() no lugar de google.script.*;
  - abertura por vdf_abrir (dados do usuário + card numa chamada só).
Uso: python3 tools/gerar_formulario_estatico.py   (o workflow do GitHub também roda e confere)
"""
import pathlib, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / 'apps-script' / 'Formulario.html'
DESTINO = RAIZ / 'powerup' / 'formulario.html'
BLOCO_CHAMAR = (RAIZ / 'tools' / 'estatico_chamar.js').read_text(encoding='utf-8')


def trocar(s, velho, novo, n=1):
    if s.count(velho) != n:
        sys.exit('gerar_formulario_estatico: trecho esperado %dx, achado %dx:\n%s' % (n, s.count(velho), velho[:200]))
    return s.replace(velho, novo)


def gerar(s):
    s = trocar(s, '<meta charset="utf-8">\n',
               '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Pedido de Peça — Unity</title>\n')
    s = trocar(s, '<script>\nvar CFG = <?!= JSON.stringify(cfg) ?>;',
               '<script src="./config.js"></script>\n<script>\n'
               '/* Versão estática do formulário (GitHub Pages). O servidor continua sendo o Apps Script,\n'
               ' * chamado por fetch (doPost {fn,args}). Gerada a partir de apps-script/Formulario.html. */\n'
               "var CFG = { chave: PU_CFG.CHAVE, urlApp: PU_CFG.URL_FORM, teste: true, tipos: ['GENUÍNO', 'ORIGINAL', 'PARALELO', 'USADO'], categPneu: ['IMPORTADO', '1ª LINHA'] };")
    i = s.index('/* Leituras: se o Google prender')
    j = s.index('function telaLogin() {')
    s = s[:i] + BLOCO_CHAMAR + s[j:]
    s = trocar(s, '  google.script.url.getLocation(function (loc) {', '  (function (loc) {')
    s = trocar(s, "    if (m) guardar('vd_token', m[1]);",
               "    if (m) { guardar('vd_token', m[1]); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }")
    s = trocar(s, "    chamar('vdf_iniciar', TOKEN).then(function (info) {\n",
               "    chamar('vdf_abrir', TOKEN, CARD_EDICAO || '').then(function (ab) {\n"
               "      var info = ab.info;\n"
               "      if (info.cfg) { CFG.teste = !!info.cfg.teste; CFG.tipos = info.cfg.tipos || CFG.tipos; CFG.categPneu = info.cfg.categPneu || CFG.categPneu; mostrar('seloTeste', CFG.teste); }\n")
    s = trocar(s, '      if (CARD_EDICAO) return carregarCard(CARD_EDICAO);', '      if (CARD_EDICAO) return carregarCard(CARD_EDICAO, ab.card);')
    s = trocar(s, "  });\n}\n\nfunction sair()", "  })(lerLocal());\n}\n\nfunction sair()")
    s = trocar(s, "function carregarCard(sl) {\n  chamar('vdf_carregarCard', TOKEN, sl).then(function (c) {",
               "function carregarCard(sl, pronto) {\n  (pronto ? Promise.resolve(pronto) : chamar('vdf_carregarCard', TOKEN, sl)).then(function (c) {")
    if 'google.script' in s or '<?' in s:
        sys.exit('gerar_formulario_estatico: sobrou google.script ou <? no resultado')
    return s


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    origem = pathlib.Path(args[0]) if args else ORIGEM
    saida = gerar(origem.read_text(encoding='utf-8'))
    if '--conferir' in sys.argv:
        sys.exit(0 if DESTINO.read_text(encoding='utf-8') == saida else 'powerup/formulario.html está desatualizado — rode tools/gerar_formulario_estatico.py')
    DESTINO.write_text(saida, encoding='utf-8')
    print('gerado:', DESTINO)
