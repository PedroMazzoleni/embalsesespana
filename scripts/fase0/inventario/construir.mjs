#!/usr/bin/env node
// Paso 2: construye data/master/inventario.csv a partir de los ZIP oficiales
// del Inventario de Presas y Embalses, calcula las cifras de control y las
// escribe en data/master/inventario-stats.json y en el bloque generado de
// docs/inventario-presas.md (entre <!-- cifras:inicio --> y <!-- cifras:fin -->).
//
// Uso: node scripts/fase0/inventario/construir.mjs
//   [--raw data/raw/inventario] [--out data/master/inventario.csv]
//   [--stats data/master/inventario-stats.json] [--doc docs/inventario-presas.md]
//   [--mapeo scripts/fase0/inventario/mapeo-campos.json]
//
// Falla (exit 1) con mensaje claro si falta un campo obligatorio, si la
// capacidad no parece estar en hm³ o si el CRS no se reconoce.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, basename } from 'node:path';
import {
  ROOT, RAW_DIR_DEFAULT, parseArgs, listInventorySources as listInventoryZips, shapefilesFromSource as shapefilesInZip, readLayer,
  projectorFromPrj, representativePoint, interiorPoint, polygonsOf, pointInPolygons, distToPolygons, territorio, normField, normName, isEmpty,
} from './lib.mjs';

const args = parseArgs(process.argv.slice(2), {
  raw: RAW_DIR_DEFAULT,
  out: join(ROOT, 'data/master/inventario.csv'),
  stats: join(ROOT, 'data/master/inventario-stats.json'),
  doc: join(ROOT, 'docs/inventario-presas.md'),
  mapeo: join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'mapeo-campos.json'),
});

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

const mapeo = JSON.parse(readFileSync(args.mapeo, 'utf8'));
const zips = listInventoryZips(args.raw);
if (zips.length === 0) fail(`no hay ZIP del inventario en ${args.raw}. Ver docs/inventario-presas.md, apartado "Cómo reproducir".`);

// ---------- 1. Leer capas ----------
const presaLayers = [];
const embalseLayers = [];
const ficheros = [];
for (const zip of zips) {
  const paths = statSync(zip).isDirectory() ? readdirSync(zip).sort().map((f) => join(zip, f)) : [zip];
  for (const p of paths) {
    const buf = readFileSync(p);
    ficheros.push({ fichero: statSync(zip).isDirectory() ? basename(zip) + '/' + basename(p) : basename(p), bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
  }
  for (const raw of shapefilesInZip(zip)) {
    const layer = await readLayer(raw);
    layer.proj = projectorFromPrj(layer.prj);
    if (!layer.proj.project) fail(`${layer.zip} :: ${layer.name}: ${layer.proj.describe}. Añade el huso en lib.mjs.`);
    const g = layer.features.find((f) => f.geometry)?.geometry?.type ?? '';
    if (/Point/.test(g)) presaLayers.push(layer);
    else if (/Polygon/.test(g)) embalseLayers.push(layer);
    else console.warn(`AVISO: ${layer.zip} :: ${layer.name} con geometría "${g}" ignorada`);
  }
}
if (presaLayers.length === 0) fail('no se encontró ninguna capa de puntos (presas) en los ZIP.');

// ---------- 2. Resolver campos ----------
function resolveFields(layer, candidates, ctx) {
  const fields = Object.keys(layer.features[0]?.properties ?? {});
  const byNorm = new Map(fields.map((f) => [normField(f), f]));
  const out = {};
  for (const [col, cands] of Object.entries(candidates)) {
    out[col] = null;
    for (const c of cands) {
      const hit = byNorm.get(normField(c));
      if (hit) { out[col] = hit; break; }
    }
  }
  return { fields, map: out, ctx };
}

const presaMaps = presaLayers.map((l) => resolveFields(l, mapeo.presas, `${l.zip} :: ${l.name}`));
for (const m of presaMaps) {
  for (const req of ['codigo_presa', 'nombre_presa']) {
    if (!m.map[req]) fail(`${m.ctx}: no encuentro el campo para "${req}". Campos disponibles: ${m.fields.join(', ')}. Fíjalo en ${basename(args.mapeo)}.`);
  }
}

// ---------- 3. Utilidades de valores ----------
// Multi-line DBF values ("Abastecimiento\nHidroeléctrico", "FECSA\n-") become "a | b"; lone "-" parts are dropped.
const str = (v) => {
  if (isEmpty(v)) return '';
  const parts = String(v).split(/\r?\n/).map((x) => x.trim().replace(/\s+/g, ' ')).filter((x) => x && x !== '-');
  return parts.join(' | ');
};
function num(v) {
  if (isEmpty(v)) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function year(v) {
  if (isEmpty(v)) return null;
  if (v instanceof Date) return v.getUTCFullYear();
  const m = String(v).match(/(1[5-9]\d\d|20\d\d)/);
  return m ? Number(m[1]) : null;
}
const isUrl = (s) => /^https?:\/\//i.test(s);
const r6 = (x) => (x == null ? '' : x.toFixed(6));
const fmtCap = (x) => (x == null ? '' : String(Number(x.toFixed(3))));

// ---------- 4. Presas ----------
const presas = [];
for (let li = 0; li < presaLayers.length; li++) {
  const layer = presaLayers[li];
  const F = presaMaps[li].map;
  layer.features.forEach((f, idx) => {
    const p = f.properties;
    const get = (col) => (F[col] ? p[F[col]] : null);
    let lat = null, lon = null;
    const pt = representativePoint(f.geometry);
    if (pt && Number.isFinite(pt[0]) && Number.isFinite(pt[1]) && !(pt[0] === 0 && pt[1] === 0)) {
      [lon, lat] = layer.proj.project(pt[0], pt[1]);
    }
    presas.push({
      _fila: idx + 1, _capa: `${layer.zip} :: ${layer.name}`,
      codigo_presa: str(get('codigo_presa')),
      nombre_presa: str(get('nombre_presa')),
      nombre_embalse: str(get('nombre_embalse')),
      tipo: str(get('tipo')),
      rio: str(get('rio')),
      demarcacion: str(get('demarcacion')),
      cuenca: str(get('cuenca')),
      provincia: str(get('provincia')),
      municipio: str(get('municipio')),
      lat, lon,
      capacidad_raw: num(get('capacidad')),
      uso: str(get('uso')),
      titular: str(get('titular')),
      fase: str(get('fase')), categoria: str(get('categoria')), ccaa: str(get('ccaa')),
      _xy: f.geometry?.type === 'Point' ? f.geometry.coordinates : null,
      anio_raw: get('anio'),
      foto: str(get('foto')),
      ficha: str(get('ficha')),
    });
  });
}

// ---------- 5. Embalses (polígonos) y enlace ESPACIAL con presas ----------
// En este inventario los polígonos NO comparten código con las presas (ID_EMBALSE coincide numéricamente con
// ID_INFRAES de otra presa; el nombre no coincide en ningún caso). El enlace es espacial: la presa se asocia
// al polígono que la contiene o al más cercano a <= TOL_ENLACE_M metros del polígono (la presa suele estar en la orilla).
const TOL_ENLACE_M = 300;
const embalses = [];
const embalseJoin = [];
for (const layer of embalseLayers) {
  const R = resolveFields(layer, mapeo.embalses, `${layer.zip} :: ${layer.name}`);
  embalseJoin.push({ capa: R.ctx, campo_enlace: 'espacial (distancia <= ' + TOL_ENLACE_M + ' m)', solape: 1, campos: R.map });
  layer.features.forEach((f, idx) => {
    const p = f.properties;
    const polys = polygonsOf(f.geometry);
    const ip = interiorPoint(f.geometry);
    let lat = null, lon = null;
    if (ip.point && Number.isFinite(ip.point[0])) [lon, lat] = layer.proj.project(ip.point[0], ip.point[1]);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const rings of polys) for (const [x, y] of rings[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const g = (c) => (R.map[c] ? p[R.map[c]] : null);
    embalses.push({
      _fila: idx + 1, _capa: R.ctx, _polys: polys, _bbox: [x0, y0, x1, y1],
      codigo_presa: '', distancia_m: null,
      codigo_embalse: str(g('codigo_embalse')),
      nombre_embalse: str(g('nombre_embalse')),
      capacidad_raw: num(g('capacidad')),
      demarcacion: str(g('demarcacion')), provincia: str(g('provincia')), uso: str(g('uso')), tipo_embalse: str(g('tipo_embalse')),
      lat, lon, origen_punto: ip.method,
    });
  });
}
// Each dam goes to ONE polygon (containing, else nearest within tolerance; ties by capacity closeness).
for (const pr of presas) {
  if (!pr._xy) continue;
  const [x, y] = pr._xy;
  let best = null;
  for (const e of embalses) {
    const [bx0, by0, bx1, by1] = e._bbox;
    if (x < bx0 - TOL_ENLACE_M || x > bx1 + TOL_ENLACE_M || y < by0 - TOL_ENLACE_M || y > by1 + TOL_ENLACE_M) continue;
    const d = pointInPolygons(x, y, e._polys) ? 0 : distToPolygons(x, y, e._polys);
    if (d > TOL_ENLACE_M) continue;
    const capDiff = pr.capacidad_raw != null && e.capacidad_raw != null ? Math.abs(pr.capacidad_raw - e.capacidad_raw) : 1e9;
    if (!best || d < best.d - 1e-6 || (Math.abs(d - best.d) <= 1e-6 && capDiff < best.capDiff)) best = { e, d, capDiff };
  }
  if (best) { pr._emb = best.e; pr._embDist = best.d; }
}
// A polygon is "owned" by the dam closest to it; polygons nobody chose are kept as rows without dam.
for (const e of embalses) e._duenos = [];
for (const pr of presas) if (pr._emb) pr._emb._duenos.push(pr);
for (const e of embalses) {
  if (!e._duenos.length) continue;
  e._duenos.sort((a, b) => a._embDist - b._embDist);
  e.codigo_presa = e._duenos[0].codigo_presa;
  e.distancia_m = e._duenos[0]._embDist;
}
const presaCodes = new Set(presas.map((p) => p.codigo_presa).filter(Boolean));

// ---------- 6. Unidades de capacidad ----------
// NMN_CAPAC viene en hm3 (verificado: Terradets, Iznajar... con valores plausibles), pero unas pocas filas llevan
// valores absurdos (p. ej. 33191000000 para Terradets, que son ~33 hm3 con tres ceros de más y un factor 1e6).
// Un valor por encima de MAX_CAP_HM3 se descarta (capacidad vacía) y se lista como rareza; no se "corrige" por inferencia.
const factor = mapeo.capacidad_factor_a_hm3;
const MAX_CAP_HM3 = 5000; // el mayor embalse de España ronda 3.200 hm3
const capAnomalas = [];
const allCaps = [...presas, ...embalses].map((x) => x.capacidad_raw).filter((x) => x != null && x > 0);
const nBig = allCaps.filter((x) => x * (factor ?? 1) > MAX_CAP_HM3).length;
if (nBig > 0.02 * allCaps.length) {
  fail(`${nBig} de ${allCaps.length} capacidades superan ${MAX_CAP_HM3}: el campo no parece estar en hm3. Fija "capacidad_factor_a_hm3" en ${basename(args.mapeo)} (p. ej. 0.001 si viene en dam3).`);
}
const toHm3 = (x) => {
  if (x == null) return null;
  const v = x * (factor ?? 1);
  return v > MAX_CAP_HM3 ? null : v;
};
for (const p of presas) if (p.capacidad_raw != null && toHm3(p.capacidad_raw) == null) capAnomalas.push(`${p.codigo_presa} ${p.nombre_presa}: ${p.capacidad_raw}`);

// ---------- 7. Tabla maestra ----------
const embByPresa = new Map();
for (const e of embalses) {
  if (!e.codigo_presa || !presaCodes.has(e.codigo_presa)) continue;
  if (!embByPresa.has(e.codigo_presa)) embByPresa.set(e.codigo_presa, []);
  embByPresa.get(e.codigo_presa).push(e);
}

const rows = [];
for (const p of presas) {
  const embs = embByPresa.get(p.codigo_presa) ?? [];
  const emb1 = p._emb ?? null; // polygon chosen by this dam (even if shared with another dam)
  const notas = [];
  if (p.capacidad_raw != null && toHm3(p.capacidad_raw) == null) notas.push(`capacidad de origen descartada por absurda (${p.capacidad_raw})`);
  if (emb1 && emb1.codigo_presa !== p.codigo_presa) notas.push(`comparte polígono de embalse con la presa ${emb1.codigo_presa}`);
  let capacidad = toHm3(p.capacidad_raw);
  let origenCap = capacidad != null ? 'presa' : '';
  if (capacidad == null && emb1?.capacidad_raw != null && !embs.length) {
    capacidad = toHm3(emb1.capacidad_raw);
    origenCap = 'embalse_compartido';
  }
  if (capacidad == null) {
    const caps = embs.map((e) => toHm3(e.capacidad_raw)).filter((x) => x != null);
    if (caps.length) {
      capacidad = caps.reduce((a, b) => a + b, 0);
      origenCap = caps.length > 1 ? 'suma_embalses' : 'embalse';
      if (caps.length > 1) notas.push(`capacidad sumada de ${caps.length} embalses`);
    }
  }
  let { lat, lon } = p;
  let origenCoord = lat != null ? 'presa' : '';
  if (lat == null && embs.length && embs[0].lat != null) {
    ({ lat, lon } = embs[0]);
    origenCoord = 'centroide_embalse';
  }
  const nombreEmbalse = p.nombre_embalse || [...new Set(embs.map((e) => e.nombre_embalse).filter(Boolean))].join(' | ');
  const anio = year(p.anio_raw);
  rows.push({
    codigo_presa: p.codigo_presa,
    codigo_embalse: [...new Set(embs.map((e) => e.codigo_embalse).filter(Boolean))].join(' | '),
    nombre_presa: p.nombre_presa,
    nombre_embalse: nombreEmbalse,
    tipo: p.tipo,
    rio: p.rio,
    demarcacion: p.demarcacion || emb1?.demarcacion || '',
    cuenca: p.cuenca,
    provincia: p.provincia || emb1?.provincia || '',
    municipio: p.municipio,
    lat: r6(lat),
    lon: r6(lon),
    origen_coord: origenCoord,
    territorio: territorio(lat, lon),
    capacidad_hm3: capacidad == null ? '' : String(Number(capacidad.toFixed(3))),
    origen_capacidad: origenCap,
    uso: p.uso || emb1?.uso || '',
    titular: p.titular,
    fase: p.fase, categoria: p.categoria, ccaa: p.ccaa,
    lat_embalse: r6(emb1?.lat), lon_embalse: r6(emb1?.lon),
    punto_embalse: emb1?.origen_punto ?? '',
    nombre_poligono: emb1?.nombre_embalse ?? '',
    capacidad_poligono_hm3: emb1 ? fmtCap(toHm3(emb1.capacidad_raw)) : '',
    dist_presa_poligono_m: p._embDist == null ? '' : Math.round(p._embDist),
    anio: anio ?? '',
    foto: p.foto,
    ficha_url: p.ficha,
    n_embalses: embs.length,
    capa_origen: p._capa,
    notas: notas.join('; '),
    _anio_raw: p.anio_raw,
  });
}
// Polygons with no matching dam: kept as rows so nothing is lost.
const embSinPresa = embalses.filter((e) => !e.codigo_presa || !presaCodes.has(e.codigo_presa));
for (const e of embSinPresa) {
  rows.push({
    codigo_presa: '', codigo_embalse: e.codigo_embalse, nombre_presa: '', nombre_embalse: e.nombre_embalse,
    tipo: e.tipo_embalse, rio: '', demarcacion: e.demarcacion, cuenca: '', provincia: e.provincia, municipio: '',
    fase: '', categoria: '', ccaa: '',
    lat_embalse: r6(e.lat), lon_embalse: r6(e.lon), punto_embalse: e.origen_punto, nombre_poligono: e.nombre_embalse,
    capacidad_poligono_hm3: e.capacidad_raw == null ? '' : fmtCap(toHm3(e.capacidad_raw)), dist_presa_poligono_m: '',
    lat: r6(e.lat), lon: r6(e.lon), origen_coord: e.lat != null ? 'centroide_embalse' : '',
    territorio: territorio(e.lat, e.lon),
    capacidad_hm3: e.capacidad_raw == null ? '' : fmtCap(toHm3(e.capacidad_raw)),
    origen_capacidad: toHm3(e.capacidad_raw) == null ? '' : 'embalse',
    uso: e.uso, titular: '', anio: '', foto: '', ficha_url: '', n_embalses: 1,
    capa_origen: e._capa, notas: 'embalse sin presa enlazada', _anio_raw: null,
  });
}

// ---------- 8. CSV ----------
const COLS = ['codigo_presa', 'codigo_embalse', 'nombre_presa', 'nombre_embalse', 'tipo', 'rio', 'demarcacion', 'cuenca',
  'provincia', 'municipio', 'lat', 'lon', 'origen_coord', 'territorio', 'capacidad_hm3', 'origen_capacidad', 'uso',
  'titular', 'fase', 'categoria', 'ccaa', 'anio', 'foto', 'ficha_url', 'lat_embalse', 'lon_embalse', 'punto_embalse', 'nombre_poligono',
  'capacidad_poligono_hm3', 'dist_presa_poligono_m', 'n_embalses', 'capa_origen', 'notas'];
const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
rows.sort((a, b) => (a.codigo_presa || '~' + a.codigo_embalse).localeCompare(b.codigo_presa || '~' + b.codigo_embalse, 'es', { numeric: true }));
const csv = [COLS.join(','), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(args.out, csv, 'utf8');

// ---------- 9. Cifras de control ----------
const count = (arr, pred) => arr.filter(pred).length;
const tally = (arr, key) => {
  const t = {};
  for (const r of arr) { const k = r[key] === '' ? '(vacío)' : r[key]; t[k] = (t[k] || 0) + 1; }
  return Object.fromEntries(Object.entries(t).sort((a, b) => b[1] - a[1]));
};
const presaRows = rows.filter((r) => r.codigo_presa);
const codeCount = tally(presas.filter((p) => p.codigo_presa), 'codigo_presa');
const dupCodes = Object.entries(codeCount).filter(([, n]) => n > 1);
// Token based so that "Las Palmas", "Palmas, Las", "Illes Balears" and "Balears, Illes" all match.
const PROV_ISLAS = {
  baleares: ['balears', 'baleares', 'mallorca', 'menorca', 'ibiza', 'eivissa', 'formentera'],
  canarias: ['palmas', 'tenerife', 'canarias'],
};
const provTerr = (prov) => {
  const tokens = normName(prov).split(' ').filter(Boolean);
  if (!tokens.length) return null;
  for (const [t, list] of Object.entries(PROV_ISLAS)) if (tokens.some((x) => list.includes(x))) return t;
  return 'peninsula';
};
const terrMismatch = presaRows.filter((r) => {
  const pt = provTerr(r.provincia);
  return pt && ['peninsula', 'baleares', 'canarias'].includes(r.territorio) && pt !== r.territorio;
});
const byName = new Map();
for (const r of presaRows) {
  const k = normName(r.nombre_presa);
  if (!k) continue;
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push(r.codigo_presa);
}
const repeatedNames = [...byName.entries()].filter(([, c]) => c.length > 1);
const capVals = presaRows.map((r) => Number(r.capacidad_hm3)).filter((x) => x > 0).sort((a, b) => a - b);
const median = capVals.length ? capVals[Math.floor(capVals.length / 2)] : null;
const tipoTally = tally(presaRows, 'tipo');
const usoTally = tally(presaRows, 'uso');

const stats = {
  generado: new Date().toISOString(),
  ficheros,
  capas: [...presaLayers, ...embalseLayers].map((l) => ({
    capa: `${l.zip} :: ${l.name}`, registros: l.features.length, crs: l.proj.describe, codificacion: l.encoding,
  })),
  campos_presas: presaMaps.map((m) => ({ capa: m.ctx, ...m.map })),
  enlace_embalses: embalseJoin,
  capacidad_factor_a_hm3: factor ?? 1,
  totales: {
    filas_csv: rows.length,
    presas: presas.length,
    poligonos_embalse: embalses.length,
    presas_con_coordenadas: count(presaRows, (r) => r.lat !== ''),
    presas_con_coordenadas_de_presa: count(presaRows, (r) => r.origen_coord === 'presa'),
    presas_con_capacidad: count(presaRows, (r) => r.capacidad_hm3 !== '' && Number(r.capacidad_hm3) > 0),
    presas_con_capacidad_mayor_5hm3: count(presaRows, (r) => Number(r.capacidad_hm3) > 5),
    presas_con_foto: count(presaRows, (r) => r.foto !== ''),
    presas_con_foto_url: count(presaRows, (r) => isUrl(r.foto)),
    presas_con_ficha: count(presaRows, (r) => r.ficha_url !== ''),
    presas_con_poligono: count(presaRows, (r) => r.lat_embalse !== ''),
    presas_con_poligono_propio: count(presaRows, (r) => r.n_embalses > 0),
    presas_con_nombre_embalse: count(presaRows, (r) => r.nombre_embalse !== ''),
    presas_con_uso: count(presaRows, (r) => r.uso !== ''),
    presas_con_titular: count(presaRows, (r) => r.titular !== ''),
    presas_con_anio: count(presaRows, (r) => r.anio !== ''),
    presas_con_anio_no_interpretable: count(presaRows, (r) => r.anio === '' && !isEmpty(r._anio_raw)),
  },
  capacidad_hm3: { min: capVals[0] ?? null, mediana: median, max: capVals.at(-1) ?? null },
  por_territorio: tally(presaRows, 'territorio'),
  por_territorio_capacidad_mayor_5hm3: tally(presaRows.filter((r) => Number(r.capacidad_hm3) > 5), 'territorio'),
  por_tipo: tipoTally,
  por_demarcacion: tally(presaRows, 'demarcacion'),
  por_demarcacion_capacidad_mayor_5hm3: tally(presaRows.filter((r) => Number(r.capacidad_hm3) > 5), 'demarcacion'),
  por_fase: tally(presaRows, 'fase'),
  por_ccaa: tally(presaRows, 'ccaa'),
  puntos_de_embalse: tally(rows.filter((r) => r.punto_embalse), 'punto_embalse'),
  usos_top20: Object.fromEntries(Object.entries(usoTally).slice(0, 20)),
  rarezas: {
    capacidades_descartadas_por_absurdas: capAnomalas.length,
    capacidades_descartadas_ejemplos: capAnomalas.slice(0, 25),
    codigos_presa_vacios: count(presas, (p) => !p.codigo_presa),
    codigos_presa_duplicados: dupCodes.length,
    codigos_presa_duplicados_ejemplos: dupCodes.slice(0, 15).map(([c, n]) => `${c} (${n})`),
    presas_sin_poligono_embalse: count(presaRows, (r) => r.n_embalses === 0),
    presas_con_varios_poligonos: count(presaRows, (r) => r.n_embalses > 1),
    presas_con_varios_poligonos_ejemplos: presaRows.filter((r) => r.n_embalses > 1).slice(0, 15).map((r) => `${r.codigo_presa} ${r.nombre_presa} (${r.n_embalses})`),
    poligonos_embalse_sin_presa: embSinPresa.length,
    nombre_presa_distinto_de_embalse: count(presaRows, (r) => r.nombre_embalse && normName(r.nombre_embalse) !== normName(r.nombre_presa)),
    nombres_presa_repetidos: repeatedNames.length,
    nombres_presa_repetidos_ejemplos: repeatedNames.slice(0, 15).map(([n, c]) => `${n}: ${c.join(', ')}`),
    nombres_con_variantes_entre_parentesis_o_barra: count(presaRows, (r) => /[(/]/.test(r.nombre_presa + r.nombre_embalse)),
    coordenadas_fuera_de_espana: presaRows.filter((r) => r.territorio === 'fuera_de_espana').map((r) => `${r.codigo_presa} ${r.nombre_presa} (${r.lat}, ${r.lon})`),
    territorio_no_cuadra_con_provincia: terrMismatch.map((r) => `${r.codigo_presa} ${r.nombre_presa}: ${r.provincia} vs ${r.territorio}`),
  },
};
mkdirSync(dirname(args.stats), { recursive: true });
writeFileSync(args.stats, JSON.stringify(stats, null, 2) + '\n', 'utf8');

// ---------- 10. Bloque generado del documento ----------
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)} %` : '—');
const T = stats.totales;
const tbl = (obj) => ['| Valor | Nº |', '|---|---:|', ...Object.entries(obj).map(([k, v]) => `| ${String(k).replace(/\|/g, '/')} | ${v} |`)].join('\n');
const list = (arr) => (arr.length ? arr.map((x) => `  - ${x}`).join('\n') : '  - (ninguno)');
const md = `
_Bloque generado por \`scripts/fase0/inventario/construir.mjs\` el ${stats.generado.slice(0, 10)}. No editar a mano._

**Ficheros procesados**

${ficheros.map((f) => `- \`${f.fichero}\` — ${f.bytes} bytes — sha256 \`${f.sha256.slice(0, 16)}…\``).join('\n')}

**Capas**

${stats.capas.map((c) => `- ${c.capa}: ${c.registros} registros; CRS ${c.crs}; DBF ${c.codificacion}`).join('\n')}

Campos usados (presas): ${stats.campos_presas.map((c) => Object.entries(c).map(([k, v]) => `${k}=${v ?? '—'}`).join(', ')).join(' / ')}

Enlace polígono de embalse → presa: ${embalseJoin.map((e) => `${e.capa}: ${e.campo_enlace}`).join('; ') || 'no hay capa de embalses'}

**Totales**

| Indicador | Nº | % de presas |
|---|---:|---:|
| Presas (puntos) | ${T.presas} | |
| Polígonos de embalse | ${T.poligonos_embalse} | |
| Filas en inventario.csv | ${T.filas_csv} | |
| Presas con coordenadas | ${T.presas_con_coordenadas} | ${pct(T.presas_con_coordenadas, T.presas)} |
| Presas con capacidad > 0 | ${T.presas_con_capacidad} | ${pct(T.presas_con_capacidad, T.presas)} |
| Presas con capacidad > 5 hm³ | ${T.presas_con_capacidad_mayor_5hm3} | ${pct(T.presas_con_capacidad_mayor_5hm3, T.presas)} |
| Presas enlazadas a un polígono de embalse | ${T.presas_con_poligono} | ${pct(T.presas_con_poligono, T.presas)} |
| Presas con nombre de embalse | ${T.presas_con_nombre_embalse} | ${pct(T.presas_con_nombre_embalse, T.presas)} |
| Presas con uso | ${T.presas_con_uso} | ${pct(T.presas_con_uso, T.presas)} |
| Presas con titular | ${T.presas_con_titular} | ${pct(T.presas_con_titular, T.presas)} |
| Presas con año | ${T.presas_con_anio} | ${pct(T.presas_con_anio, T.presas)} |
| Presas con foto (cualquier valor) | ${T.presas_con_foto} | ${pct(T.presas_con_foto, T.presas)} |
| Presas con foto como URL | ${T.presas_con_foto_url} | ${pct(T.presas_con_foto_url, T.presas)} |
| Presas con enlace a ficha | ${T.presas_con_ficha} | ${pct(T.presas_con_ficha, T.presas)} |

Capacidad (hm³): mínima ${stats.capacidad_hm3.min ?? '—'}, mediana ${stats.capacidad_hm3.mediana ?? '—'}, máxima ${stats.capacidad_hm3.max ?? '—'} (factor aplicado: ${stats.capacidad_factor_a_hm3}).

**Cobertura por territorio (todas las presas)**

${tbl(stats.por_territorio)}

**Cobertura por territorio (presas con capacidad > 5 hm³, el umbral del boletín)**

${tbl(stats.por_territorio_capacidad_mayor_5hm3)}

**Por ámbito del inventario (campo DEMARC, todas las presas; incluye islas)**

${tbl(stats.por_demarcacion)}

**Por ámbito (presas con capacidad > 5 hm³)**

${tbl(stats.por_demarcacion_capacidad_mayor_5hm3)}

**Fase de la infraestructura**

${tbl(stats.por_fase)}

**Punto representativo del polígono de embalse**

${tbl(stats.puntos_de_embalse)}

**Tipos de infraestructura**

${tbl(stats.por_tipo)}

**Rarezas**

- Capacidades de presa descartadas por valor absurdo (> 5.000 hm³; errores de unidad en origen): ${stats.rarezas.capacidades_descartadas_por_absurdas}
${list(stats.rarezas.capacidades_descartadas_ejemplos)}
- Códigos de presa vacíos: ${stats.rarezas.codigos_presa_vacios}
- Códigos de presa duplicados: ${stats.rarezas.codigos_presa_duplicados}
${list(stats.rarezas.codigos_presa_duplicados_ejemplos)}
- Presas sin polígono de embalse: ${stats.rarezas.presas_sin_poligono_embalse}
- Presas con varios polígonos de embalse: ${stats.rarezas.presas_con_varios_poligonos}
${list(stats.rarezas.presas_con_varios_poligonos_ejemplos)}
- Polígonos de embalse sin presa enlazada: ${stats.rarezas.poligonos_embalse_sin_presa}
- Presas cuyo nombre de embalse difiere del de la presa: ${stats.rarezas.nombre_presa_distinto_de_embalse}
- Nombres de presa repetidos (con códigos distintos): ${stats.rarezas.nombres_presa_repetidos}
${list(stats.rarezas.nombres_presa_repetidos_ejemplos)}
- Nombres con variantes entre paréntesis o con barra: ${stats.rarezas.nombres_con_variantes_entre_parentesis_o_barra}
- Años presentes pero no interpretables: ${T.presas_con_anio_no_interpretable}
- Coordenadas fuera de España: ${stats.rarezas.coordenadas_fuera_de_espana.length}
${list(stats.rarezas.coordenadas_fuera_de_espana.slice(0, 20))}
- Territorio por coordenadas que no cuadra con la provincia: ${stats.rarezas.territorio_no_cuadra_con_provincia.length}
${list(stats.rarezas.territorio_no_cuadra_con_provincia.slice(0, 20))}
`;

if (existsSync(args.doc)) {
  const doc = readFileSync(args.doc, 'utf8');
  const re = /(<!-- cifras:inicio -->)[\s\S]*?(<!-- cifras:fin -->)/;
  if (!re.test(doc)) fail(`${args.doc} no tiene los marcadores <!-- cifras:inicio --> / <!-- cifras:fin -->`);
  writeFileSync(args.doc, doc.replace(re, `$1\n${md}\n$2`), 'utf8');
}

console.log(`OK: ${rows.length} filas → ${args.out}`);
console.log(`presas ${T.presas}, con coordenadas ${T.presas_con_coordenadas}, con capacidad ${T.presas_con_capacidad}, con foto ${T.presas_con_foto}`);
console.log(`territorio: ${JSON.stringify(stats.por_territorio)}`);
