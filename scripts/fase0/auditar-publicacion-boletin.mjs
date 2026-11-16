// Reproduces every figure cited in docs/publicacion-boletin.md.
//
// Usage:
//   node scripts/fase0/auditar-publicacion-boletin.mjs [path/to/BD-Embalses.zip]
//
// Without an argument the ZIP is downloaded from MITECO into a fresh directory
// under the OS temp dir, which is deleted at the end (nothing is written inside
// the repo). Read-only with respect to data/raw/.
//
// Prints:
//  1. Calendar audit of FECHA: distinct dates, weekday distribution, non-midnight
//     timestamps, gaps != 7 days, expected vs. actual number of Tuesdays.
//  2. Reservoirs per date for the last weeks (and when the count last changed).
//  3. A content hash of the normalised table (sorted CSV), the value the weekly
//     scraper should compare to decide whether to commit.
//  4. Probes of the BoleHWeb PDF URL scheme around year boundaries (week 00/53).
//  5. HEAD vs GET status for a press-release PDF (the server answers HEAD wrongly).

import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { unzipSync } from 'fflate';
import MDBReader from 'mdb-reader';

const ZIP_URL =
  'https://www.miteco.gob.es/content/dam/miteco/es/agua/temas/evaluacion-de-los-recursos-hidricos/boletin-hidrologico/Historico-de-embalses/BD-Embalses.zip';
const PDF_URL = (ss, nn) =>
  `https://sede.miteco.gob.es/BoleHWeb/accion/cargador_archivo.htm?file=cache/pdf/${ss}/${ss}${nn}_es.pdf&mimetype=application/pdf`;
const UA = 'embalses-data-pipeline/0.1 (+open data reuse)';
const DAY = 86400000;
const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const iso = (t) => new Date(t).toISOString().slice(0, 10);

let tmp = null;
try {
  // ------------------------------------------------------------ load ZIP
  let zipPath = process.argv[2] ? resolve(process.argv[2]) : null;
  if (!zipPath) {
    tmp = mkdtempSync(join(tmpdir(), 'embalses-audit-'));
    zipPath = join(tmp, 'BD-Embalses.zip');
    const res = await fetch(ZIP_URL, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`ZIP HTTP ${res.status}`);
    writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
    console.log(`ZIP descargado: Last-Modified=${res.headers.get('last-modified')} ETag=${res.headers.get('etag')}`);
  }
  const zip = unzipSync(new Uint8Array(readFileSync(zipPath)));
  const mdbName = Object.keys(zip).find((n) => n.toLowerCase().endsWith('.mdb'));
  if (!mdbName) throw new Error('No .mdb inside ZIP');
  const reader = new MDBReader(Buffer.from(zip[mdbName]));
  const tableName = reader.getTableNames()[0];
  const rows = reader.getTable(tableName).getData();
  console.log(`Tabla: ${tableName} · filas: ${rows.length}`);

  // ------------------------------------------------------------ 1. calendar
  console.log('\n## 1. Calendario de FECHA');
  const nullDates = rows.filter((r) => !r.FECHA).length;
  const nonMidnight = rows.filter((r) => r.FECHA && r.FECHA.getTime() % DAY !== 0).length;
  const perDate = new Map();
  for (const r of rows) if (r.FECHA) perDate.set(r.FECHA.getTime(), (perDate.get(r.FECHA.getTime()) ?? 0) + 1);
  const dates = [...perDate.keys()].sort((a, b) => a - b);
  const byDow = {};
  for (const t of dates) byDow[DOW[new Date(t).getUTCDay()]] = (byDow[DOW[new Date(t).getUTCDay()]] ?? 0) + 1;
  console.log(`Filas sin FECHA: ${nullDates} · con hora != 00:00: ${nonMidnight}`);
  console.log(`Fechas distintas: ${dates.length} (de ${iso(dates[0])} a ${iso(dates.at(-1))})`);
  console.log('Por día de la semana:', byDow);
  const gaps = [];
  for (let i = 1; i < dates.length; i++) {
    const d = (dates[i] - dates[i - 1]) / DAY;
    if (d !== 7) gaps.push(`${iso(dates[i - 1])} -> ${iso(dates[i])} (${d} d)`);
  }
  console.log(`Saltos != 7 días: ${gaps.length}`, gaps);
  // Main series = dates from the first one after the largest gap.
  const firstMain = dates.find((t, i) => i > 0 && (t - dates[i - 1]) / DAY > 7) ?? dates[0];
  const main = dates.filter((t) => t >= firstMain);
  const expectedTuesdays = Math.round((main.at(-1) - firstMain) / DAY / 7) + 1;
  console.log(
    `Serie principal ${iso(firstMain)}..${iso(main.at(-1))}: ${main.length} fechas; ` +
      `martes esperados en ese intervalo: ${expectedTuesdays}; fechas sueltas antes: ${dates.length - main.length}`,
  );

  // ------------------------------------------------------------ 2. reservoirs per date
  console.log('\n## 2. Embalses por fecha (últimas 12)');
  for (const t of dates.slice(-12).reverse()) console.log(`${iso(t)}  ${perDate.get(t)}`);
  let changes = [];
  for (let i = dates.length - 1; i > 0 && changes.length < 3; i--) {
    if (perDate.get(dates[i]) !== perDate.get(dates[i - 1]))
      changes.push(`${iso(dates[i - 1])}=${perDate.get(dates[i - 1])} -> ${iso(dates[i])}=${perDate.get(dates[i])}`);
  }
  console.log('Últimos cambios en el nº de embalses:', changes);

  // ------------------------------------------------------------ 3. content hash
  console.log('\n## 3. Hash de contenido (CSV normalizado y ordenado)');
  const cols = Object.keys(rows[0]).sort();
  const norm = (v) => (v instanceof Date ? iso(v.getTime()) : v === null || v === undefined ? '' : String(v).trim());
  const lines = rows.map((r) => cols.map((c) => norm(r[c])).join('\t')).sort();
  const hash = createHash('sha256').update(cols.join('\t') + '\n' + lines.join('\n')).digest('hex');
  console.log(`columnas: ${cols.join(', ')}`);
  console.log(`sha256: ${hash}`);

  // ------------------------------------------------------------ 4. PDF week scheme
  console.log('\n## 4. Esquema de URL del PDF (resumen, NN=40) en bordes de año');
  const probes = ['201900', '201901', '201902', '202453', '202500', '202501', '202552', '202600', '202601'];
  for (const ss of probes) {
    const res = await fetch(PDF_URL(ss, '40'), { headers: { 'User-Agent': UA } });
    const buf = Buffer.from(await res.arrayBuffer());
    const isPdf = buf.subarray(0, 4).toString() === '%PDF';
    // The cover carries "FECHA: dd-mm-aaaa" in an uncompressed text object only sometimes;
    // report size and signature, the date is checked separately with pdftotext.
    console.log(`${ss}: HTTP ${res.status} · ${buf.length} bytes · ${isPdf ? 'PDF' : 'vacío/no PDF'}`);
  }

  // ------------------------------------------------------------ 5. HEAD vs GET
  console.log('\n## 5. HEAD vs GET en nota de prensa');
  const ndp =
    'https://www.miteco.gob.es/content/dam/miteco/es/prensa/26.11.10_Ndp_La%20reserva%20h%C3%ADdrica%20espa%C3%B1ola%20se%20encuentra%20al%2055,3%20de%20su%20capacidad.pdf';
  for (const method of ['HEAD', 'GET']) {
    const res = await fetch(ndp, { method, headers: { 'User-Agent': UA } });
    if (method === 'GET') await res.arrayBuffer();
    console.log(`${method}: HTTP ${res.status} · Last-Modified=${res.headers.get('last-modified')}`);
  }
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
