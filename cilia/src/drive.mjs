/**
 * Google Drive com a conta de serviço do Cloud Run (compra-peca-run), sem senha: o token vem do servidor de metadados.
 * A pasta de destino fica num DRIVE COMPARTILHADO (conta de serviço não tem cota no "Meu Drive") e precisa ter a
 * conta compra-peca-run@unity-compra-peca.iam.gserviceaccount.com como "Gerente de conteúdo".
 */
const ESCOPO = 'https://www.googleapis.com/auth/drive';
let cache = null;

async function token() {
  if (process.env.GOOGLE_TOKEN) return process.env.GOOGLE_TOKEN;
  if (cache && cache.expira > Date.now() + 60_000) return cache.valor;
  const r = await fetch(`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=${encodeURIComponent(ESCOPO)}`,
    { headers: { 'Metadata-Flavor': 'Google' } });
  if (!r.ok) throw new Error(`metadados do Google ${r.status}`);
  const j = await r.json();
  cache = { valor: j.access_token, expira: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

async function api(url, opcoes = {}) {
  const r = await fetch(url, { ...opcoes, headers: { ...(opcoes.headers || {}), Authorization: 'Bearer ' + await token() } });
  const texto = await r.text();
  if (!r.ok) {
    const dica = r.status === 403 || r.status === 404
      ? ' (a pasta está num Drive compartilhado com compra-peca-run@… como Gerente de conteúdo? a API do Drive está ativada?)' : '';
    throw new Error(`Drive ${r.status}${dica}: ${texto.slice(0, 200)}`);
  }
  return texto ? JSON.parse(texto) : {};
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/** Procura um arquivo/pasta pelo nome dentro de uma pasta. */
export async function acharNaPasta(pastaId, nome, { pasta = false } = {}) {
  const q = `'${pastaId}' in parents and name = '${esc(nome)}' and trashed = false` +
    (pasta ? ` and mimeType = 'application/vnd.google-apps.folder'` : '');
  const j = await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)` +
    `&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives`);
  return j.files?.[0]?.id || null;
}

export async function garantirPasta(paiId, nome) {
  const id = await acharNaPasta(paiId, nome, { pasta: true });
  if (id) return id;
  const j = await api('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nome, mimeType: 'application/vnd.google-apps.folder', parents: [paiId] }),
  });
  return j.id;
}

/** Lê um arquivo de texto da pasta (null se não existe). */
export async function lerTexto(pastaId, nome) {
  const id = await acharNaPasta(pastaId, nome);
  if (!id) return null;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: 'Bearer ' + await token() } });
  if (!r.ok) throw new Error(`Drive ${r.status} ao ler ${nome}`);
  return r.text();
}

/** Cria ou substitui (mesmo nome na mesma pasta) um arquivo. `conteudo` = string ou Buffer. */
export async function gravar(pastaId, nome, conteudo, tipo) {
  const existente = await acharNaPasta(pastaId, nome);
  const limite = 'cilia' + Date.now();
  const meta = existente ? { name: nome } : { name: nome, parents: [pastaId] };
  const corpo = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
      `--${limite}\r\nContent-Type: ${tipo}\r\n\r\n`),
    Buffer.isBuffer(conteudo) ? conteudo : Buffer.from(conteudo, 'utf8'),
    Buffer.from(`\r\n--${limite}--`),
  ]);
  const url = existente
    ? `https://www.googleapis.com/upload/drive/v3/files/${existente}?uploadType=multipart&supportsAllDrives=true&fields=id`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id`;
  const j = await api(url, { method: existente ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${limite}` }, body: corpo });
  return j.id;
}
