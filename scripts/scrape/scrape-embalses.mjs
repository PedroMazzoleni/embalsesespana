// Weekly git-scraping of the MITECO reservoir history (ADR 0003, ADR 0004).
//
// Downloads BD-Embalses.zip into a system temp dir (never into the repo), reads
// the Access table with mdb-reader and writes it untouched as one CSV per year:
//   data/raw/boletin-hidrologico/embalses-AAAA.csv
//   data/raw/boletin-hidrologico/BD-Embalses.meta.json
//
// Values are NOT cleaned (decimal commas, zero capacities, etc. stay as published).
// If the table structure is not the expected one the script exits != 0 and writes nothing.
// If no CSV changes, the meta file is not rewritten (no empty commits).
//
// Usage: node scripts/scrape/scrape-embalses.mjs
// Outputs to $GITHUB_OUTPUT (when set): changed=true|false, latest_date=YYYY-MM-DD

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import MDBReader from 'mdb-reader';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW_DIR = join(ROOT, 'data', 'raw', 'boletin-hidrologico');
const META_PATH = join(RAW_DIR, 'BD-Embalses.meta.json');
const ZIP_URL =
  'https://www.miteco.gob.es/content/dam/miteco/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico/Historico-de-embalses/BD-Embalses.zip';
const TABLE_PREFIX = 'T_Datos Embalses';
const COLUMNS = ['AMBITO_NOMBRE', 'EMBALSE_NOMBRE', 'FECHA', 'AGUA_TOTAL', 'AGUA_ACTUAL', 'ELECTRICO_FLAG'];
const MAX_ZIP_BYTES = 200 * 1024 * 1024;
const UA = 'embalses-data-pipeline/0.1 (+open data reuse)';

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

function setOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

async function fetchFull(url, attempts = 4) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const expected = Number(res.headers.get('content-length'));
      if (expected && buf.length !== expected) throw new Error(`truncated: ${buf.length}/${expected} bytes`);
      return buf;
    } catch (err) {
      lastErr = err;
      console.warn(`Attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  throw lastErr;
}

const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function fail(msg) {
  throw new Error(msg);
}

async function main() {
  const tmp = mkdtempSync(join(tmpdir(), 'embalses-scrape-'));
  try {
    // 1. Download to a temp dir (outside the repo) and validate it is a ZIP.
    const zipBuf = await fetchFull(ZIP_URL);
    if (zipBuf.length > MAX_ZIP_BYTES) fail(`ZIP is ${zipBuf.length} bytes, over the ${MAX_ZIP_BYTES} cap`);
    if (!(zipBuf[0] === 0x50 && zipBuf[1] === 0x4b && zipBuf[2] === 0x03 && zipBuf[3] === 0x04)) {
      fail(`Downloaded file is not a ZIP (signature ${zipBuf.subarray(0, 4).toString('hex')})`);
    }
    writeFileSync(join(tmp, 'BD-Embalses.zip'), zipBuf);
    const zipSha = sha256(zipBuf);

    // 2. Open the .mdb and locate the table by prefix.
    const files = unzipSync(new Uint8Array(zipBuf));
    const mdbName = Object.keys(files).find((n) => n.toLowerCase().endsWith('.mdb'));
    if (!mdbName) fail('No .mdb file inside the ZIP');
    const reader = new MDBReader(Buffer.from(files[mdbName]));
    const tableNames = reader.getTableNames().filter((n) => n.startsWith(TABLE_PREFIX));
    if (tableNames.length !== 1) {
      fail(`Expected exactly one table starting with "${TABLE_PREFIX}", found: ${JSON.stringify(tableNames)} (all: ${JSON.stringify(reader.getTableNames())})`);
    }
    const tableName = tableNames[0];
    const table = reader.getTable(tableName);

    // 3. Validate the exact structure.
    const cols = table.getColumnNames();
    if (cols.length !== COLUMNS.length || cols.some((c, i) => c !== COLUMNS[i])) {
      fail(`Unexpected columns in "${tableName}": ${JSON.stringify(cols)}; expected ${JSON.stringify(COLUMNS)}`);
    }
    const rows = table.getData();
    if (rows.length === 0) fail(`Table "${tableName}" is empty`);

    // 4. Serialise raw values, grouped by year.
    const byYear = new Map();
    let latest = '';
    rows.forEach((r, idx) => {
      const d = r.FECHA;
      if (!(d instanceof Date) || Number.isNaN(d.getTime())) fail(`Row ${idx}: FECHA is not a valid date: ${String(d)}`);
      const iso = d.toISOString().slice(0, 10);
      if (iso > latest) latest = iso;
      const line = [r.AMBITO_NOMBRE, r.EMBALSE_NOMBRE, iso, r.AGUA_TOTAL, r.AGUA_ACTUAL, r.ELECTRICO_FLAG].map(csvCell).join(',');
      const year = iso.slice(0, 4);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year).push({ iso, nombre: String(r.EMBALSE_NOMBRE ?? ''), ambito: String(r.AMBITO_NOMBRE ?? ''), line });
    });

    const csvs = new Map();
    for (const [year, list] of [...byYear].sort((a, b) => cmp(a[0], b[0]))) {
      list.sort((a, b) => cmp(a.iso, b.iso) || cmp(a.nombre, b.nombre) || cmp(a.ambito, b.ambito) || cmp(a.line, b.line));
      csvs.set(`embalses-${year}.csv`, Buffer.from(COLUMNS.join(',') + '\n' + list.map((x) => x.line).join('\n') + '\n', 'utf8'));
    }

    // 5. Compare with what is on disk.
    mkdirSync(RAW_DIR, { recursive: true });
    const changedFiles = [];
    for (const [name, buf] of csvs) {
      const p = join(RAW_DIR, name);
      if (!existsSync(p) || sha256(readFileSync(p)) !== sha256(buf)) changedFiles.push(name);
    }
    const metaMissing = !existsSync(META_PATH);

    if (changedFiles.length === 0 && !metaMissing) {
      console.log(`Sin cambios: ${csvs.size} CSV idénticos (${rows.length} filas, última fecha ${latest}).`);
      setOutput('changed', 'false');
      setOutput('latest_date', latest);
      return;
    }

    // 6. Atomic write: temp file + rename, CSVs first, meta last.
    const writeAtomic = (path, data) => {
      const part = `${path}.part`;
      writeFileSync(part, data);
      renameSync(part, path);
    };
    for (const name of changedFiles) writeAtomic(join(RAW_DIR, name), csvs.get(name));
    const meta = {
      source_url: ZIP_URL,
      downloaded_at: new Date().toISOString(),
      zip_bytes: zipBuf.length,
      zip_sha256: zipSha,
      table_name: tableName,
      columns: COLUMNS,
      rows: rows.length,
      latest_date: latest,
      csv_sha256: Object.fromEntries([...csvs].map(([n, b]) => [n, sha256(b)])),
    };
    writeAtomic(META_PATH, JSON.stringify(meta, null, 2) + '\n');
    console.log(`Cambios en ${changedFiles.length} CSV: ${changedFiles.join(', ')} (${rows.length} filas, última fecha ${latest}).`);
    setOutput('changed', 'true');
    setOutput('latest_date', latest);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
