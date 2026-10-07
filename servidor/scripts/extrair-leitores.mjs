// Gera servidor/src/leitores/robo.js: as funções do Apps Script de que os leitores de documentos dependem
// (fecho transitivo a partir das raízes), copiadas sem alteração, mais adaptadores para o que é do Apps Script.
// Uso: cd servidor && npm run extrair-leitores
import { parse } from 'acorn';
import { simple, ancestor } from 'acorn-walk';
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = path.join(RAIZ, 'apps-script');
const saida = process.argv[2] === 'formulario' ? path.join(RAIZ, 'servidor', 'recursos', 'formulario.gs.js') : path.join(RAIZ, 'servidor', 'src', 'leitores', 'robo.js');
const MODO = process.argv[2] || 'leitores';
const raizesLeitores = ['vd_lerOrcamento_', 'vd_extrair_', 'pv_lerFornecimento_', 'pv_lerStatusCilia_', 'pv_lerHdiPecas_', 'pv_lerPareceresCilia_',
  'pv_ultimaAtualizacaoCilia_', 'pv_aplicarPareceres_', 'vd_orcCompacto_', 'vd_orcExpandir_', 'vd_dicaNorm_', 'vd_placaDoTexto_', 'vd_mesmaPlaca_',
  'cp_similar_', 'cp_norm_', 'fo_resolver_', 'pv_enriquecerFo_'];
const raizesFormulario = () => ['doPost', 'vdf_usuario_', ...fs.readdirSync(dir).filter((f) => f.endsWith('.gs'))
  .flatMap((f) => [...fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/^function (vdf_[A-Za-z0-9]+[A-Za-z0-9])\(/gm)].map((m) => m[1]))];
// leem planilha/cache do Apps Script: viram adaptadores (ver ADAPTADORES abaixo)
const ADAPTADO = MODO === 'leitores' ? new Set(['fo_lista_', 'fo_aba_', 'vd_planilhaBackup_']) : new Set();
const topo = new Map(); // nome -> {arquivo, inicio, fim, codigo, node}
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.gs')).sort()) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const ast = parse(src, { ecmaVersion: 2022, sourceType: 'script', allowHashBang: true });
  for (const n of ast.body) {
    const reg = (nome, node) => {
      if (topo.has(nome)) console.error('DUPLICADO', nome, f, topo.get(nome).arquivo);
      topo.set(nome, { arquivo: f, codigo: src.slice(node.start, node.end), node, linha: src.slice(0, node.start).split('\n').length });
    };
    if (n.type === 'FunctionDeclaration') reg(n.id.name, n);
    else if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id.type === 'Identifier') reg(d.id.name, n);
  }
}
const usados = (node) => {
  const s = new Set();
  simple(node, { Identifier(i) { s.add(i.name); } });
  return s;
};
const incluir = new Set();
const raizes = MODO === 'leitores' ? raizesLeitores : raizesFormulario();
const fila = [...raizes];
const globaisExternos = new Set();
const NATIVOS = new Set(['Math', 'Date', 'JSON', 'String', 'Number', 'Array', 'Object', 'RegExp', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Infinity', 'NaN', 'undefined', 'Error', 'Boolean', 'encodeURIComponent', 'decodeURIComponent', 'Set', 'Map', 'arguments']);
while (fila.length) {
  const n = fila.shift();
  if (incluir.has(n) || ADAPTADO.has(n)) continue;
  const t = topo.get(n);
  if (!t) { console.error('NÃO ACHADO', n); continue; }
  incluir.add(n);
  for (const u of usados(t.node)) {
    if (topo.has(u) && !incluir.has(u) && !ADAPTADO.has(u)) fila.push(u);
    else if (!topo.has(u) && /^[A-Z][A-Za-z]+App$|^Utilities$|^PropertiesService$|^CacheService$|^Drive$|^Logger$|^console$|^Session$|^LockService$/.test(u)) globaisExternos.add(u);
  }
}
// ordena: variáveis primeiro (na ordem dos arquivos), depois funções
const lista = [...incluir].map((n) => ({ n, ...topo.get(n) }));
const vistos = new Set();
const blocos = [];
for (const x of lista.sort((a, b) => (a.node.type === b.node.type ? 0 : a.node.type === 'VariableDeclaration' ? -1 : 1) || a.arquivo.localeCompare(b.arquivo) || a.linha - b.linha)) {
  if (vistos.has(x.codigo)) continue;
  vistos.add(x.codigo);
  blocos.push(`// ${x.arquivo}:${x.linha}\n${x.codigo}`);
}
const ADAPTADORES = `/* eslint-disable */
// @ts-nocheck
// GERADO AUTOMATICAMENTE por servidor/scripts/extrair-leitores.mjs a partir de apps-script/ — NÃO EDITAR À MÃO.
// Leitores de documentos do robô (Apps Script), copiados sem alteração para o servidor ler exatamente igual.
// Para mudar um leitor: mude no Apps Script e rode o extrator de novo.

// ---------- adaptadores do Apps Script ----------
const Utilities = {
  /** Utilities.formatDate(data, fuso, padrão) — padrões yyyy, yy, MM, dd, HH, mm, ss */
  formatDate(d, fuso, padrao) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: fuso || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(d)).map((x) => [x.type, x.value]));
    return String(padrao).replace(/yyyy|yy|MM|dd|HH|mm|ss/g, (t) => ({ yyyy: p.year, yy: p.year.slice(2), MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, ss: p.second })[t]);
  },
};
let FO_LISTA_ATUAL = null;
/** Lista de fornecedores no formato do robô: [{nome, apelidos[], cod, usos, linha}] (o servidor injeta a do banco). */
export function definirFornecedores(lista) { FO_LISTA_ATUAL = lista; }
function fo_lista_() {
  if (FO_LISTA_ATUAL) return FO_LISTA_ATUAL;
  return FO_SEMENTE.map(function (x, i) { return { nome: String(x[0]).toUpperCase(), apelidos: String(x[1] || '').split('|').map(function (s) { return s.trim().toUpperCase(); }).filter(String), cod: String(x[2] || ''), usos: 0, linha: i + 2 }; });
}

// ---------- código do robô ----------
`;
// FO_SEMENTE é usado pelo adaptador mesmo que nenhuma raiz o peça
if (!incluir.has('FO_SEMENTE') && topo.has('FO_SEMENTE')) blocos.unshift(`// ${topo.get('FO_SEMENTE').arquivo}:${topo.get('FO_SEMENTE').linha}\n${topo.get('FO_SEMENTE').codigo}`);
const exportar = [...incluir].filter((n) => topo.get(n).node.type === 'FunctionDeclaration' || /^[A-Z_]+$/.test(n)).sort();
fs.mkdirSync(path.dirname(saida), { recursive: true });
if (MODO === 'formulario') {
  const cab = `// GERADO AUTOMATICAMENTE por servidor/scripts/extrair-leitores.mjs formulario — NÃO EDITAR À MÃO.\n` +
    `// Código do robô (Apps Script) usado pelo formulário: roda no servidor dentro de um contexto vm com os\n` +
    `// serviços do Google imitados (src/gas/servicos.ts). Raízes: doPost + vdf_*.\n\n`;
  const todos = [...vistos].length;
  fs.writeFileSync(saida, cab + blocos.join('\n\n') + '\n');
  console.log('formulário:', incluir.size, 'símbolos ->', saida);
  process.exit(0);
}
fs.writeFileSync(saida, ADAPTADORES + blocos.join('\n\n') + '\n\nexport { ' + exportar.join(', ') + ' };\n');
console.log('incluídos', incluir.size, '| externos:', [...globaisExternos].join(', '));
console.log([...incluir].sort().join(' '));
