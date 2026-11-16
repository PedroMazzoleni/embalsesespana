// Inspects the MITECO historical reservoir database (BD-Embalses.zip -> .mdb)
// and prints every figure used in docs/contrato-datos.md.
//
// Usage:
//   node scripts/fase0/inspeccionar-bd-embalses.mjs [path/to/BD-Embalses.zip] [--json out.json]
//
// Read-only: never writes into data/raw/. The ZIP is untrusted input: we only
// unzip in memory and parse it with mdb-reader (pure JS, no code execution).

import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import MDBReader from 'mdb-reader';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const jsonIdx = args.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? args.splice(jsonIdx, 2)[1] : null;
const zipPath = resolve(args[0] ?? join(ROOT, 'data', 'raw', 'boletin-hidrologico', 'BD-Embalses.zip'));

const report = {};
const out = (...a) => console.log(...a);
const h = (t) => out(`\n## ${t}`);
const DAY = 86400000;
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const inc = (m, k, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
const sortedEntries = (m) => [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

// ---------------------------------------------------------------- file
h('Fichero');
const zipBuf = readFileSync(zipPath);
const zip = unzipSync(new Uint8Array(zipBuf));
const entries = Object.keys(zip);
report.file = {
  path: zipPath,
  zip_bytes: statSync(zipPath).size,
  zip_sha256: createHash('sha256').update(zipBuf).digest('hex'),
  entries: entries.map((e) => ({ name: e, bytes: zip[e].length })),
};
out(JSON.stringify(report.file, null, 2));
const mdbName = entries.find((e) => /\.(mdb|accdb)$/i.test(e));
if (!mdbName) throw new Error(`No .mdb/.accdb inside ${zipPath}; entries: ${entries.join(', ')}`);
const reader = new MDBReader(Buffer.from(zip[mdbName]));
// Byte 0x14 of the Jet header: 0 = Jet 3 (Access 97), 1 = Jet 4 (Access 2000-2003), >= 2 = ACE (2007+).
const jetByte = zip[mdbName][0x14];
report.jet_version = { 0: 'Jet 3 (Access 97)', 1: 'Jet 4 (Access 2000-2003)', 2: 'ACE 12 (Access 2007)', 3: 'ACE 14 (Access 2010)' }[jetByte] ?? `desconocido (${jetByte})`;
out('Formato de la base de datos:', report.jet_version);

// ---------------------------------------------------------------- tables
h('Tablas y columnas');
const tableNames = reader.getTableNames({ normalTables: true, systemTables: false, linkedTables: true });
report.created = reader.getCreationDate?.()?.toISOString() ?? null;
report.tables = tableNames.map((t) => {
  const tb = reader.getTable(t);
  return {
    name: t,
    rows: tb.rowCount,
    columns: tb.getColumns().map((c) => ({
      name: c.name,
      type: c.type,
      size: c.size,
      ...(c.precision ? { precision: c.precision, scale: c.scale } : {}),
      nullable: c.nullable,
    })),
  };
});
out('Fecha de creación de la BD (metadato Access):', report.created);
out(JSON.stringify(report.tables, null, 2));

const mainName = tableNames.find((t) => /^T_Datos Embalses/i.test(t));
if (!mainName) throw new Error(`Main table "T_Datos Embalses ..." not found. Tables: ${tableNames.join(', ')}`);
const rows = reader.getTable(mainName).getData();
report.main_table = mainName;
report.rows = rows.length;
out(`\nTabla principal: "${mainName}" — ${rows.length} filas`);

// ---------------------------------------------------------------- nulls & raw value formats
h('Nulos y formatos de valor');
const cols = Object.keys(rows[0]);
const nulls = Object.fromEntries(cols.map((c) => [c, 0]));
const emptyStr = Object.fromEntries(cols.map((c) => [c, 0]));
for (const r of rows) for (const c of cols) {
  if (r[c] === null || r[c] === undefined) nulls[c]++;
  else if (typeof r[c] === 'string' && r[c].trim() === '') emptyStr[c]++;
}
report.nulls = nulls;
report.empty_strings = emptyStr;
out('Nulos por columna:', nulls);
out('Cadenas vacías por columna:', emptyStr);

// Classify the text numeric fields by shape, and per year to detect format changes.
const shape = (s) => {
  if (s === null || s === undefined) return 'null';
  const t = String(s);
  if (t.trim() === '') return 'vacío';
  if (t !== t.trim()) return 'espacios';
  if (/^-?\d+,\d+$/.test(t)) return `coma decimal (${t.split(',')[1].length} dec)`;
  if (/^-?\d+\.\d+$/.test(t)) return `punto decimal (${t.split('.')[1].length} dec)`;
  if (/^-?\d+$/.test(t)) return 'entero';
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return 'miles con punto';
  return `otro`;
};
const parseNum = (s) => {
  if (s === null || s === undefined) return null;
  const t = String(s).trim();
  if (t === '') return null;
  if (/^-?\d+(,\d+)?$/.test(t)) return Number(t.replace(',', '.'));
  if (/^-?\d+\.\d+$/.test(t)) return Number(t);
  return NaN;
};
report.formats = {};
const otherSamples = {};
for (const c of ['AGUA_TOTAL', 'AGUA_ACTUAL']) {
  const all = new Map();
  const byYear = new Map();
  otherSamples[c] = new Set();
  for (const r of rows) {
    const s = shape(r[c]);
    inc(all, s);
    const y = r.FECHA ? r.FECHA.getUTCFullYear() : 'sin fecha';
    if (!byYear.has(y)) byYear.set(y, new Map());
    inc(byYear.get(y), s);
    if (s === 'otro' && otherSamples[c].size < 20) otherSamples[c].add(r[c]);
  }
  report.formats[c] = {
    global: Object.fromEntries(sortedEntries(all)),
    by_year: Object.fromEntries(sortedEntries(byYear).map(([y, m]) => [y, Object.fromEntries(sortedEntries(m))])),
    other_samples: [...otherSamples[c]],
  };
  out(`${c} formatos globales:`, report.formats[c].global);
  out(`${c} ejemplos "otro":`, report.formats[c].other_samples);
}
out('Formatos por año (AGUA_ACTUAL):');
for (const [y, m] of Object.entries(report.formats.AGUA_ACTUAL.by_year)) out(' ', y, JSON.stringify(m));
out('Formatos por año (AGUA_TOTAL):');
for (const [y, m] of Object.entries(report.formats.AGUA_TOTAL.by_year)) out(' ', y, JSON.stringify(m));

const flagVals = new Map();
for (const r of rows) inc(flagVals, String(r.ELECTRICO_FLAG));
report.electrico_flag_values = Object.fromEntries(flagVals);
out('Valores ELECTRICO_FLAG:', report.electrico_flag_values);

// ---------------------------------------------------------------- dates
h('Fechas');
const nonMidnight = rows.filter((r) => r.FECHA && r.FECHA.getTime() % DAY !== 0).length;
const dateCounts = new Map(); // ms -> rows
for (const r of rows) if (r.FECHA) inc(dateCounts, r.FECHA.getTime());
const dates = [...dateCounts.keys()].sort((a, b) => a - b);
const dowCount = new Map();
for (const d of dates) inc(dowCount, DOW[new Date(d).getUTCDay()]);
const gapHist = new Map();
const oddGaps = [];
for (let i = 1; i < dates.length; i++) {
  const g = Math.round((dates[i] - dates[i - 1]) / DAY);
  inc(gapHist, g);
  if (g !== 7) oddGaps.push({ from: iso(dates[i - 1]), to: iso(dates[i]), days: g });
}
const dowByYear = new Map();
for (const d of dates) {
  const y = new Date(d).getUTCFullYear();
  if (!dowByYear.has(y)) dowByYear.set(y, new Map());
  inc(dowByYear.get(y), DOW[new Date(d).getUTCDay()]);
}
report.dates = {
  min: iso(dates[0]),
  max: iso(dates.at(-1)),
  distinct: dates.length,
  non_midnight_values: nonMidnight,
  day_of_week: Object.fromEntries(dowCount),
  day_of_week_by_year: Object.fromEntries(sortedEntries(dowByYear).map(([y, m]) => [y, Object.fromEntries(m)])),
  gap_days_histogram: Object.fromEntries(sortedEntries(gapHist)),
  non_weekly_gaps: oddGaps,
};
out(`Rango: ${report.dates.min} → ${report.dates.max}; fechas distintas: ${dates.length}; valores con hora ≠ 00:00: ${nonMidnight}`);
out('Día de la semana de las fechas:', report.dates.day_of_week);
out('Día de la semana por año:');
for (const [y, m] of Object.entries(report.dates.day_of_week_by_year)) out(' ', y, JSON.stringify(m));
out('Histograma de días entre fechas consecutivas:', report.dates.gap_days_histogram);
out(`Saltos distintos de 7 días (${oddGaps.length}):`);
for (const g of oddGaps) out(`  ${g.from} → ${g.to}: ${g.days} días`);

const rowsPerYear = new Map();
for (const r of rows) if (r.FECHA) inc(rowsPerYear, r.FECHA.getUTCFullYear());
report.rows_per_year = Object.fromEntries(sortedEntries(rowsPerYear));
out('Filas por año:', report.rows_per_year);

// Reservoirs reported per date
const perDate = [...dateCounts.entries()].sort((a, b) => a[0] - b[0]);
const perDateVals = perDate.map(([, n]) => n);
report.rows_per_date = {
  min: Math.min(...perDateVals),
  max: Math.max(...perDateVals),
  first: { date: iso(perDate[0][0]), rows: perDate[0][1] },
  last: { date: iso(perDate.at(-1)[0]), rows: perDate.at(-1)[1] },
  lowest_10: [...perDate].sort((a, b) => a[1] - b[1]).slice(0, 10).map(([d, n]) => ({ date: iso(d), rows: n })),
};
out('Filas (embalses) por fecha:', JSON.stringify(report.rows_per_date, null, 1));

// ---------------------------------------------------------------- ambitos
h('Ámbitos (AMBITO_NOMBRE)');
const ambitos = new Map();
for (const r of rows) {
  const a = r.AMBITO_NOMBRE;
  if (!ambitos.has(a)) ambitos.set(a, { rows: 0, names: new Set(), first: Infinity, last: -Infinity });
  const o = ambitos.get(a);
  o.rows++;
  o.names.add(r.EMBALSE_NOMBRE);
  const t = r.FECHA?.getTime();
  if (t < o.first) o.first = t;
  if (t > o.last) o.last = t;
}
report.ambitos = sortedEntries(ambitos).map(([a, o]) => ({
  ambito: a, rows: o.rows, embalses: o.names.size, first: iso(o.first), last: iso(o.last),
}));
for (const a of report.ambitos) out(`  ${JSON.stringify(a.ambito)}: ${a.embalses} embalses, ${a.rows} filas, ${a.first} → ${a.last}`);
const islandRe = /balear|canari|mallorca|tenerife|gran canaria|ibiza|menorca|ceuta|melilla/i;
report.island_ambitos = report.ambitos.filter((a) => islandRe.test(a.ambito)).map((a) => a.ambito);
out('Ámbitos que parecen insulares/Ceuta/Melilla:', report.island_ambitos);

// ---------------------------------------------------------------- reservoir identity
h('Identificación de embalses');
const names = new Map(); // name -> {ambitos:Set, rows, first, last, dates:Set}
for (const r of rows) {
  const n = r.EMBALSE_NOMBRE;
  if (!names.has(n)) names.set(n, { ambitos: new Map(), rows: 0, first: Infinity, last: -Infinity, dates: new Map(), totals: new Map(), flags: new Set() });
  const o = names.get(n);
  o.rows++;
  inc(o.ambitos, r.AMBITO_NOMBRE);
  const t = r.FECHA?.getTime();
  if (t < o.first) o.first = t;
  if (t > o.last) o.last = t;
  inc(o.dates, t);
  inc(o.totals, r.AGUA_TOTAL);
  o.flags.add(String(r.ELECTRICO_FLAG));
}
const pairs = new Set(rows.map((r) => `${r.AMBITO_NOMBRE}\u0000${r.EMBALSE_NOMBRE}`));
report.distinct_names = names.size;
report.distinct_ambito_name_pairs = pairs.size;
out(`Nombres distintos: ${names.size}; pares (ámbito, nombre) distintos: ${pairs.size}`);

const multiAmbito = [...names.entries()].filter(([, o]) => o.ambitos.size > 1);
report.names_in_several_ambitos = multiAmbito.map(([n, o]) => ({ name: n, ambitos: Object.fromEntries(o.ambitos) }));
out(`Nombres que aparecen en más de un ámbito (${multiAmbito.length}):`);
for (const x of report.names_in_several_ambitos) out(`  ${JSON.stringify(x.name)} → ${JSON.stringify(x.ambitos)}`);

// Whitespace / encoding oddities
const ws = [...names.keys()].filter((n) => n !== n.trim() || /\s{2,}/.test(n));
const badChars = [...names.keys()].filter((n) => /�|Ã|Â|�/.test(n));
const nonAscii = new Map();
for (const n of [...names.keys(), ...ambitos.keys()]) for (const ch of n) if (ch.charCodeAt(0) > 127) inc(nonAscii, ch);
report.names_with_whitespace_issues = ws;
report.names_with_mojibake = badChars;
report.non_ascii_chars = Object.fromEntries(nonAscii);
out('Nombres con espacios sobrantes:', ws.map((n) => JSON.stringify(n)));
out('Nombres con posible mojibake:', badChars);
out('Caracteres no ASCII usados en nombres/ámbitos:', report.non_ascii_chars);

// Duplicated (name, date) and (ambito, name, date)
const dupNameDate = [];
for (const [n, o] of names) for (const [t, c] of o.dates) if (c > 1) dupNameDate.push({ name: n, date: iso(t), rows: c });
report.duplicate_name_date = { count: dupNameDate.length, samples: dupNameDate.slice(0, 30) };
const fullKey = new Map();
for (const r of rows) inc(fullKey, `${r.AMBITO_NOMBRE}|${r.EMBALSE_NOMBRE}|${r.FECHA?.getTime()}`);
report.duplicate_ambito_name_date = [...fullKey.values()].filter((c) => c > 1).length;
out(`Duplicados (nombre, fecha): ${dupNameDate.length}; duplicados (ámbito, nombre, fecha): ${report.duplicate_ambito_name_date}`);
for (const d of report.duplicate_name_date.samples) out('  ', JSON.stringify(d));

// Name variants: collapse case/accents/punctuation/articles
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9ñ ]/g, ' ').replace(/\b(el|la|los|las|de|del|embalse|presa)\b/g, ' ').replace(/\s+/g, ' ').trim();
const byNorm = new Map();
for (const n of names.keys()) {
  const k = norm(n);
  if (!byNorm.has(k)) byNorm.set(k, []);
  byNorm.get(k).push(n);
}
report.name_variant_groups = [...byNorm.values()].filter((v) => v.length > 1).map((v) => v.map((n) => ({
  name: n, first: iso(names.get(n).first), last: iso(names.get(n).last), rows: names.get(n).rows, ambitos: [...names.get(n).ambitos.keys()],
})));
out(`Grupos de variantes de nombre (normalizando mayúsculas/tildes/puntuación/artículos): ${report.name_variant_groups.length}`);
for (const g of report.name_variant_groups) out('  ', JSON.stringify(g));

// Near-duplicate names (Levenshtein <= 2 on normalized form) — candidates for manual review
const lev = (a, b) => {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
const normKeys = [...byNorm.keys()];
const near = [];
for (let i = 0; i < normKeys.length; i++) for (let j = i + 1; j < normKeys.length; j++) {
  const a = normKeys[i], b = normKeys[j];
  if (a.length >= 5 && lev(a, b) <= 2) {
    const na = byNorm.get(a)[0], nb = byNorm.get(b)[0];
    const A = names.get(na), B = names.get(nb);
    const overlap = A.first <= B.last && B.first <= A.last;
    near.push({ a: na, b: nb, a_range: `${iso(A.first)}→${iso(A.last)}`, b_range: `${iso(B.first)}→${iso(B.last)}`, overlap_in_time: overlap, same_ambito: [...A.ambitos.keys()].some((x) => B.ambitos.has(x)) });
  }
}
report.near_duplicate_names = near;
out(`Pares de nombres casi iguales (distancia ≤ 2), para revisión manual: ${near.length}`);
for (const p of near) out('  ', JSON.stringify(p));

// ---------------------------------------------------------------- appear / disappear / gaps
h('Continuidad temporal por embalse');
const dateIndex = new Map(dates.map((d, i) => [d, i]));
const globalLast = dates.at(-1);
// "Bulk" start: first date on which at least half of the max number of reservoirs
// report. Dates before it are stray rows (e.g. a couple of 1987 records).
const maxPerDate = Math.max(...dateCounts.values());
const bulkFirst = dates.find((d) => dateCounts.get(d) >= maxPerDate / 2);
const strayRows = rows.filter((r) => r.FECHA.getTime() < bulkFirst).map((r) => ({
  ambito: r.AMBITO_NOMBRE, embalse: r.EMBALSE_NOMBRE, fecha: iso(r.FECHA), total: r.AGUA_TOTAL, actual: r.AGUA_ACTUAL,
}));
report.bulk_first_date = iso(bulkFirst);
report.rows_before_bulk_first_date = strayRows;
out(`Primera fecha "completa" (≥ 50 % del máximo de embalses): ${iso(bulkFirst)}`);
out(`Filas anteriores a esa fecha (${strayRows.length}):`, strayRows);
const coverage = [...names.entries()].map(([n, o]) => {
  const first = Math.max(o.first, bulkFirst);
  const span = dateIndex.get(o.last) - dateIndex.get(first) + 1;
  const inSpan = [...o.dates.keys()].filter((t) => t >= first).length;
  return { name: n, ambito: [...o.ambitos.keys()].join(' / '), first: iso(first), last: iso(o.last), rows: o.rows, distinct_dates: inSpan, expected_in_span: span, missing_in_span: span - inSpan };
});
const globalFirst = bulkFirst;
const complete = coverage.filter((c) => c.first === iso(globalFirst) && c.last === iso(globalLast) && c.missing_in_span === 0);
const lateStart = coverage.filter((c) => c.first !== iso(globalFirst)).sort((a, b) => (a.first < b.first ? -1 : 1));
const startMonth = new Map();
for (const c of lateStart) inc(startMonth, c.first.slice(5, 7));
report.late_start_by_month = Object.fromEntries(sortedEntries(startMonth));
out('Mes de alta de los embalses añadidos tras el inicio:', report.late_start_by_month);

// Distinct reservoirs reported per date, summarised per year (min-max)
const perYear = new Map();
for (const [t, n] of dateCounts) {
  const y = new Date(t).getUTCFullYear();
  const o = perYear.get(y) ?? { min: Infinity, max: -Infinity };
  o.min = Math.min(o.min, n); o.max = Math.max(o.max, n);
  perYear.set(y, o);
}
report.reservoirs_per_date_by_year = Object.fromEntries(sortedEntries(perYear).map(([y, o]) => [y, `${o.min}-${o.max}`]));
out('Embalses por fecha (mín-máx) por año:', report.reservoirs_per_date_by_year);
const earlyEnd = coverage.filter((c) => c.last !== iso(globalLast)).sort((a, b) => (a.last < b.last ? -1 : 1));
const withHoles = coverage.filter((c) => c.missing_in_span > 0).sort((a, b) => b.missing_in_span - a.missing_in_span);
const activeLast = coverage.filter((c) => c.last === iso(globalLast));
report.coverage = {
  complete_full_series: complete.length,
  present_on_last_date: activeLast.length,
  start_after_first_date: lateStart.length,
  end_before_last_date: earlyEnd.length,
  with_internal_gaps: withHoles.length,
  total_missing_weeks_in_spans: withHoles.reduce((s, c) => s + c.missing_in_span, 0),
  late_start: lateStart,
  early_end: earlyEnd,
  with_holes_top: withHoles.slice(0, 40),
};
out(`Embalses con serie completa (primera a última fecha, sin huecos): ${complete.length}`);
out(`Embalses presentes en la última fecha (${iso(globalLast)}): ${activeLast.length}`);
out(`Embalses que empiezan después de ${iso(globalFirst)}: ${lateStart.length}`);
for (const c of lateStart) out(`  + ${c.first}  ${c.name} (${c.ambito}) hasta ${c.last}`);
out(`Embalses que dejan de aparecer antes de ${iso(globalLast)}: ${earlyEnd.length}`);
for (const c of earlyEnd) out(`  - ${c.last}  ${c.name} (${c.ambito}) desde ${c.first}`);
{ const m = new Map(); for (const c of earlyEnd) inc(m, c.last.slice(0, 7)); report.early_end_by_month = Object.fromEntries(sortedEntries(m)); out("Bajas por año-mes:", report.early_end_by_month); }
out(`Embalses con huecos internos: ${withHoles.length}; semanas ausentes totales: ${report.coverage.total_missing_weeks_in_spans}`);
for (const c of withHoles.slice(0, 40)) out(`  ${c.name} (${c.ambito}): faltan ${c.missing_in_span} de ${c.expected_in_span}`);

// ---------------------------------------------------------------- values
h('Valores');
let actNull = 0, actNaN = 0, totNaN = 0, neg = 0, zeroAct = 0, zeroTot = 0, over = 0, overBig = 0;
const overRows = [];
const negRows = [];
const zeroTotRows = [];
let maxPct = 0, maxPctRow = null;
for (const r of rows) {
  const a = parseNum(r.AGUA_ACTUAL), t = parseNum(r.AGUA_TOTAL);
  if (a === null) actNull++;
  if (Number.isNaN(a)) actNaN++;
  if (Number.isNaN(t)) totNaN++;
  if (a < 0 || t < 0) { neg++; if (negRows.length < 20) negRows.push(r); }
  if (a === 0) zeroAct++;
  if (t === 0) { zeroTot++; if (zeroTotRows.length < 20) zeroTotRows.push(r); }
  if (a !== null && t && a > t) {
    over++;
    if (a > t * 1.05) overBig++;
    if (a / t > maxPct) { maxPct = a / t; maxPctRow = r; }
    overRows.push(r);
  }
}
const fmtRow = (r) => ({ ambito: r.AMBITO_NOMBRE, embalse: r.EMBALSE_NOMBRE, fecha: iso(r.FECHA), total: r.AGUA_TOTAL, actual: r.AGUA_ACTUAL, flag: r.ELECTRICO_FLAG });

// Precision: are decimals ever used?
const nonZeroDec = { AGUA_TOTAL: 0, AGUA_ACTUAL: 0 };
for (const r of rows) for (const c of Object.keys(nonZeroDec)) if (r[c] && !/,00$/.test(r[c])) nonZeroDec[c]++;
report.values_with_nonzero_decimals = nonZeroDec;
out('Valores con decimales distintos de ",00":', nonZeroDec);

// Zero capacity: placeholder (0/0) vs. reserve reported without capacity
const zt = { total0_actual0: 0, total0_actual_pos: 0, by_year: new Map(), reservoirs: new Set() };
for (const r of rows) if (parseNum(r.AGUA_TOTAL) === 0) {
  parseNum(r.AGUA_ACTUAL) > 0 ? zt.total0_actual_pos++ : zt.total0_actual0++;
  inc(zt.by_year, r.FECHA.getUTCFullYear());
  zt.reservoirs.add(r.EMBALSE_NOMBRE);
}
const zeroTotalOnLast = rows.filter((r) => r.FECHA.getTime() === globalLast && parseNum(r.AGUA_TOTAL) === 0).length;
report.zero_capacity = {
  total0_actual0: zt.total0_actual0,
  total0_actual_positive: zt.total0_actual_pos,
  reservoirs_affected: zt.reservoirs.size,
  rows_by_year: Object.fromEntries(sortedEntries(zt.by_year)),
  on_last_date: zeroTotalOnLast,
};
out('Capacidad 0:', report.zero_capacity);
report.null_value_rows = rows.filter((r) => r.AGUA_TOTAL == null || r.AGUA_ACTUAL == null).map(fmtRow);
out('Filas con AGUA_TOTAL/AGUA_ACTUAL nulos:', report.null_value_rows);
const overByYear = new Map();
for (const r of overRows) inc(overByYear, r.FECHA.getUTCFullYear());
report.actual_gt_total_by_year = Object.fromEntries(sortedEntries(overByYear));
out('Filas con reserva > capacidad por año:', report.actual_gt_total_by_year);
const overLast = overRows.filter((r) => r.FECHA.getTime() === globalLast).map(fmtRow);
report.actual_gt_total_on_last_date = overLast;
out('Reserva > capacidad en la última fecha:', overLast);
const overByName = new Map();
for (const r of overRows) inc(overByName, r.EMBALSE_NOMBRE);
report.values = {
  actual_null_or_empty: actNull,
  actual_unparseable: actNaN,
  total_unparseable: totNaN,
  negative_rows: neg,
  negative_samples: negRows.map(fmtRow),
  zero_actual: zeroAct,
  zero_total: zeroTot,
  zero_total_samples: zeroTotRows.map(fmtRow),
  actual_gt_total: over,
  actual_gt_total_by_more_than_5pct: overBig,
  max_ratio: maxPct,
  max_ratio_row: maxPctRow && fmtRow(maxPctRow),
  actual_gt_total_by_reservoir: Object.fromEntries([...overByName.entries()].sort((a, b) => b[1] - a[1])),
};
out(JSON.stringify({ ...report.values }, null, 1));
out(`Embalses con alguna fila de reserva > capacidad: ${overByName.size}`);

// Capacity under 5 hm3 and capacity changes over time
const capChanges = [...names.entries()].filter(([, o]) => o.totals.size > 1)
  .map(([n, o]) => ({ name: n, values: Object.fromEntries(o.totals) }));
const flagChanges = [...names.entries()].filter(([, o]) => o.flags.size > 1).map(([n, o]) => ({ name: n, flags: [...o.flags] }));
const lastRows = rows.filter((r) => r.FECHA?.getTime() === globalLast);
const small = lastRows.filter((r) => parseNum(r.AGUA_TOTAL) < 5).map(fmtRow);
report.capacity = {
  reservoirs_with_capacity_changes: capChanges.length,
  capacity_changes: capChanges,
  reservoirs_with_flag_changes: flagChanges.length,
  flag_changes: flagChanges,
  last_date_capacity_below_5hm3: small,
};
out(`Embalses cuya capacidad (AGUA_TOTAL) cambia en el tiempo: ${capChanges.length}`);
for (const c of capChanges) out('  ', JSON.stringify(c));
out(`Embalses cuyo ELECTRICO_FLAG cambia: ${flagChanges.length}`, flagChanges);
out('Embalses con capacidad < 5 hm³ en la última fecha:', small);

// ---------------------------------------------------------------- last-week totals (cross-check vs. boletín)
h('Totales de la última fecha (contraste con el boletín)');
const sum = (arr, f) => arr.reduce((s, r) => s + (parseNum(r[f]) || 0), 0);
const tot = sum(lastRows, 'AGUA_TOTAL'), act = sum(lastRows, 'AGUA_ACTUAL');
const byFlag = {};
for (const f of ['0', '1']) {
  const rr = lastRows.filter((r) => String(r.ELECTRICO_FLAG) === f);
  byFlag[f] = { embalses: rr.length, capacidad_hm3: +sum(rr, 'AGUA_TOTAL').toFixed(2), reserva_hm3: +sum(rr, 'AGUA_ACTUAL').toFixed(2) };
}
report.last_date_totals = {
  date: iso(globalLast),
  embalses: lastRows.length,
  capacidad_hm3: +tot.toFixed(2),
  reserva_hm3: +act.toFixed(2),
  pct: +((100 * act) / tot).toFixed(2),
  by_electrico_flag: byFlag,
};
const prevDate = dates.at(-2);
const prevRows = rows.filter((r) => r.FECHA?.getTime() === prevDate);
const pTot = sum(prevRows, 'AGUA_TOTAL'), pAct = sum(prevRows, 'AGUA_ACTUAL');
report.previous_date_totals = {
  date: iso(prevDate), embalses: prevRows.length, capacidad_hm3: +pTot.toFixed(2), reserva_hm3: +pAct.toFixed(2), pct: +((100 * pAct) / pTot).toFixed(2),
};
out('Semana anterior:', report.previous_date_totals);
out(JSON.stringify(report.last_date_totals, null, 1));

if (jsonOut) {
  writeFileSync(resolve(jsonOut), JSON.stringify(report, null, 2));
  out(`\nInforme JSON escrito en ${resolve(jsonOut)}`);
}
